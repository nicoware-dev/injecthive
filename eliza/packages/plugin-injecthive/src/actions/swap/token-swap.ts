import { Action, ActionExample, Memory, State, HandlerCallback, IAgentRuntime } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { InjectiveSDKClient } from "../../client";
import axios from 'axios';

// Example for swapping tokens
const swapTokenExample: ActionExample = {
  user: "user",
  content: {
    text: "Swap 0.01 INJ for USDT",
  }
};

// Define known tokens with their configurations
const KNOWN_TOKENS: Record<string, { denom: string, displayName: string, decimals: number, coinGeckoId?: string }> = {
  "inj": { denom: "inj", displayName: "INJ", decimals: 18, coinGeckoId: "injective-protocol" },
  "usdt": { denom: "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7", displayName: "USDT", decimals: 6, coinGeckoId: "tether" },
  "usdc": { denom: "peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", displayName: "USDC", decimals: 6, coinGeckoId: "usd-coin" },
  "wbtc": { denom: "peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", displayName: "WBTC", decimals: 8, coinGeckoId: "wrapped-bitcoin" },
  "weth": { denom: "peggy0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", displayName: "WETH", decimals: 18, coinGeckoId: "ethereum" },
  "atom": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/atom", displayName: "ATOM", decimals: 6, coinGeckoId: "cosmos" },
  "osmo": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/osmo", displayName: "OSMO", decimals: 6, coinGeckoId: "osmosis" },
  "sei": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/sei", displayName: "SEI", decimals: 6, coinGeckoId: "sei-network" },
  "astro": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/astro", displayName: "ASTRO", decimals: 6, coinGeckoId: "astroport" },
};

// Define common trading pairs on Helix
const HELIX_TRADING_PAIRS: Record<string, { marketId: string, baseToken: string, quoteToken: string }> = {
  "INJ/USDT": { 
    marketId: "0xa508cb32923323679f29a032c70342c147c17d0145625922b0ef22e955c844c0", 
    baseToken: "inj", 
    quoteToken: "usdt" 
  },
  "WETH/USDT": { 
    marketId: "0x64ee22a39a8d333d1a9b0c8c28c9635a2cac37cd73ed99c0b8bfe7630a24a8f2", 
    baseToken: "weth", 
    quoteToken: "usdt" 
  },
  "WBTC/USDT": { 
    marketId: "0x979731deaaf17d26b2e256ad18fecd0f7fd45d4b1c8c5f6b4dfc07d4a23faefd", 
    baseToken: "wbtc", 
    quoteToken: "usdt" 
  },
  "ATOM/USDT": { 
    marketId: "0x0f1f224b911da353807af9a3812c9af9adcbc3f63b0847d6a69e2b01aca3d9c1", 
    baseToken: "atom", 
    quoteToken: "usdt" 
  },
  "USDT/USDC": { 
    marketId: "0x8b1a4d3e8f6b559e30e40922ee3662dd78edf7042330d4d620d188699d1a9715", 
    baseToken: "usdt", 
    quoteToken: "usdc" 
  }
};

// Add the formatSuccessMessage function before the handler
const formatSuccessMessage = ({
  sourceToken,
  destToken,
  sourceAmount,
  estimatedReceiveAmount,
  txHash,
  walletAddress,
  marketId
}: {
  sourceToken: string;
  destToken: string;
  sourceAmount: number;
  estimatedReceiveAmount: number;
  txHash: string;
  walletAddress: string;
  marketId: string;
}) => {
  const explorerUrl = `https://explorer.injective.network/transaction/${txHash}`;
  const mintscanUrl = `https://www.mintscan.io/injective/tx/${txHash}`;

  return `✅ Successfully swapped ${sourceAmount} ${sourceToken.toUpperCase()} for approximately ${estimatedReceiveAmount} ${destToken.toUpperCase()} on Helix DEX!

Market ID: ${marketId}
Wallet Address: ${walletAddress}
Transaction Hash: ${txHash}

View transaction:
- [Injective Explorer](${explorerUrl})
- [Mintscan](${mintscanUrl})`;
};

/**
 * Helper function to extract source and destination tokens and amount from user message
 */
function extractSwapDetails(message: string): { sourceToken: string, destToken: string, amount: number } | null {
  // Match pattern like "Swap 0.01 INJ for USDT"
  const match = message.match(/swap\s+(\d+(\.\d+)?)\s+([a-zA-Z]+)\s+(?:for|to)\s+([a-zA-Z]+)/i);
  
  if (match && match[1] && match[3] && match[4]) {
    const amount = parseFloat(match[1]);
    const sourceToken = match[3].toLowerCase();
    const destToken = match[4].toLowerCase();
    
    if (isNaN(amount) || !KNOWN_TOKENS[sourceToken] || !KNOWN_TOKENS[destToken]) {
      return null;
    }
    
    return { sourceToken, destToken, amount };
  }
  return null;
}

/**
 * Helper function to convert human-readable amount to raw amount
 * @param amount Human-readable amount
 * @param decimals Number of decimals for the token
 * @returns Raw amount as string
 */
function convertToRawAmount(amount: number, decimals: number): string {
  const multiplier = Math.pow(10, decimals);
  const rawAmount = amount * multiplier;
  
  // Convert to string without scientific notation
  return rawAmount.toLocaleString('fullwide', { useGrouping: false });
}

/**
 * Helper function to find the best trading pair for a swap
 * @param sourceToken Source token symbol
 * @param destToken Destination token symbol
 * @returns Trading pair information or null if not found
 */
function findTradingPair(sourceToken: string, destToken: string): { marketId: string, baseToken: string, quoteToken: string } | null {
  // Check direct pair
  const directPairKey = `${sourceToken.toUpperCase()}/${destToken.toUpperCase()}`;
  if (HELIX_TRADING_PAIRS[directPairKey]) {
    elizaLogger.info(`Using market ID for ${directPairKey}: ${HELIX_TRADING_PAIRS[directPairKey].marketId}`);
    return HELIX_TRADING_PAIRS[directPairKey];
  }
  
  // Check reverse pair
  const reversePairKey = `${destToken.toUpperCase()}/${sourceToken.toUpperCase()}`;
  if (HELIX_TRADING_PAIRS[reversePairKey]) {
    elizaLogger.info(`Using reverse market ID for ${directPairKey}: ${HELIX_TRADING_PAIRS[reversePairKey].marketId}`);
    return HELIX_TRADING_PAIRS[reversePairKey];
  }
  
  // If no direct pair, try to find a path through USDT
  if (sourceToken !== 'usdt' && destToken !== 'usdt') {
    const sourcePairKey = `${sourceToken.toUpperCase()}/USDT`;
    const destPairKey = `${destToken.toUpperCase()}/USDT`;
    
    if (HELIX_TRADING_PAIRS[sourcePairKey]) {
      // Return the first pair, we'll handle the second step separately
      return HELIX_TRADING_PAIRS[sourcePairKey];
    }
    
    // Try reverse pairs
    const reverseSourcePairKey = `USDT/${sourceToken.toUpperCase()}`;
    
    if (HELIX_TRADING_PAIRS[reverseSourcePairKey]) {
      return HELIX_TRADING_PAIRS[reverseSourcePairKey];
    }
  }
  
  return null;
}

/**
 * Helper function to estimate the amount of destination tokens received from a swap
 * @param sourceToken Source token symbol
 * @param destToken Destination token symbol
 * @param amount Amount of source tokens
 * @returns Estimated amount of destination tokens
 */
async function estimateSwapAmount(sourceToken: string, destToken: string, amount: number): Promise<number> {
  try {
    // For now, we'll use a simple price ratio estimation
    // In a real implementation, you would query the DEX for a price quote
    
    // Get prices from CoinGecko
    const sourceTokenId = KNOWN_TOKENS[sourceToken].coinGeckoId;
    const destTokenId = KNOWN_TOKENS[destToken].coinGeckoId;
    
    if (!sourceTokenId || !destTokenId) {
      // Fallback to fixed rates if CoinGecko IDs are not available
      const fallbackRates: Record<string, number> = {
        "inj": 13.20,
        "usdt": 1.00,
        "usdc": 1.00,
        "wbtc": 62500.00,
        "weth": 3200.00,
        "atom": 8.50,
        "osmo": 0.65,
        "sei": 0.55,
        "astro": 0.12,
      };
      
      const sourceRate = fallbackRates[sourceToken] || 1;
      const destRate = fallbackRates[destToken] || 1;
      
      return (amount * sourceRate) / destRate;
    }
    
    // Try to get prices from CoinGecko
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${sourceTokenId},${destTokenId}&vs_currencies=usd`);
    
    if (response.data && response.data[sourceTokenId]?.usd && response.data[destTokenId]?.usd) {
      const sourcePrice = response.data[sourceTokenId].usd;
      const destPrice = response.data[destTokenId].usd;
      
      // Calculate the estimated amount
      return (amount * sourcePrice) / destPrice;
    } else {
      // Fallback to fixed rates if CoinGecko API fails
      const fallbackRates: Record<string, number> = {
        "inj": 13.20,
        "usdt": 1.00,
        "usdc": 1.00,
        "wbtc": 62500.00,
        "weth": 3200.00,
        "atom": 8.50,
        "osmo": 0.65,
        "sei": 0.55,
        "astro": 0.12,
      };
      
      const sourceRate = fallbackRates[sourceToken] || 1;
      const destRate = fallbackRates[destToken] || 1;
      
      return (amount * sourceRate) / destRate;
    }
  } catch (error) {
    elizaLogger.error(`Error estimating swap amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Fallback to fixed rates if there's an error
    const fallbackRates: Record<string, number> = {
      "inj": 13.20,
      "usdt": 1.00,
      "usdc": 1.00,
      "wbtc": 62500.00,
      "weth": 3200.00,
      "atom": 8.50,
      "osmo": 0.65,
      "sei": 0.55,
      "astro": 0.12,
    };
    
    const sourceRate = fallbackRates[sourceToken] || 1;
    const destRate = fallbackRates[destToken] || 1;
    
    return (amount * sourceRate) / destRate;
  }
}

/**
 * Helper function to get the subaccount ID for a wallet address
 */
async function getSubaccountId(client: any, walletAddress: string, ethAddress?: string): Promise<string> {
  try {
    elizaLogger.info(`Fetching subaccounts for wallet address: ${walletAddress}`);
    
    // Get the list of subaccounts for the wallet address
    const subaccountsResponse = await client.getSubaccountsList({
      address: walletAddress
    });
    
    if (!subaccountsResponse.success) {
      elizaLogger.error(`Error fetching subaccounts: ${subaccountsResponse.error?.message}`);
      throw new Error(`Failed to fetch subaccounts: ${subaccountsResponse.error?.message || 'Unknown error'}`);
    }
    
    // Get the subaccounts from the response
    const subaccounts = subaccountsResponse.result?.subaccounts || [];
    elizaLogger.info(`Found ${subaccounts.length} subaccounts for wallet ${walletAddress}`);
    
    // If subaccounts exist, return the first one
    if (subaccounts.length > 0) {
      const subaccountId = subaccounts[0].subaccountId;
      elizaLogger.info(`Using existing subaccount ID: ${subaccountId}`);
      return subaccountId;
    }
    
    // If no subaccounts exist, generate a default subaccount ID (nonce 0)
    elizaLogger.info(`No subaccounts found. Generating default subaccount ID (nonce 0)`);
    
    // If we have an Ethereum address, use it to generate the subaccount ID
    if (ethAddress) {
      // Remove '0x' prefix if present and convert to lowercase
      const ethAddressHex = ethAddress.toLowerCase().replace('0x', '');
      
      // Pad with zeros to create the default subaccount ID (nonce 0)
      // Format: ethAddressHex + 24 zeros (representing nonce 0)
      const defaultSubaccountId = `${ethAddressHex}${'0'.repeat(24)}`;
      
      elizaLogger.info(`Generated default subaccount ID from Ethereum address: ${defaultSubaccountId}`);
      return defaultSubaccountId;
    }
    
    // Fallback to all zeros if no Ethereum address is available
    const fallbackSubaccountId = '0'.repeat(64);
    elizaLogger.info(`No Ethereum address provided. Using fallback subaccount ID: ${fallbackSubaccountId}`);
    return fallbackSubaccountId;
  } catch (error) {
    elizaLogger.error(`Error getting subaccount ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Failed to get subaccount ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to prepare spot market order parameters
 */
async function prepareSpotMarketOrderParams(
  client: any,
  marketId: string,
  walletAddress: string,
  quantity: string,
  isBuyingBase: boolean,
  sourceToken: string,
  sourceTokenConfig: { denom: string, displayName: string, decimals: number },
  ethAddress?: string,
  existingSubaccountId?: string
) {
  try {
    // Use the provided subaccount ID if available, otherwise get it from the API
    let subaccountId = existingSubaccountId;
    
    if (!subaccountId) {
      subaccountId = await getSubaccountId(client, walletAddress, ethAddress);
    }
    
    elizaLogger.info(`Using subaccount ID for market order: ${subaccountId}`);
    
    return {
      sender: walletAddress,
      order: {
        marketId: marketId,
        subaccountId: subaccountId,
        feeRecipient: walletAddress,
        price: "0", // Market orders use 0 as price
        quantity: quantity,
        orderType: 1, // MARKET = 1, LIMIT = 2
        orderSide: isBuyingBase ? 1 : 2, // BUY = 1, SELL = 2
      }
    };
  } catch (error) {
    elizaLogger.error(`Error preparing market order parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Failed to prepare market order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to prepare spot limit order parameters
 */
async function prepareSpotLimitOrderParams(
  client: any,
  marketId: string,
  walletAddress: string,
  quantity: string,
  price: string,
  isBuyingBase: boolean,
  ethAddress?: string
) {
  try {
    // Get the subaccount ID from the API
    const subaccountId = await getSubaccountId(client, walletAddress, ethAddress);
    
    elizaLogger.info(`Using subaccount ID for limit order: ${subaccountId}`);
    
    return {
      sender: walletAddress,
      order: {
        marketId: marketId,
        subaccountId: subaccountId,
        feeRecipient: walletAddress,
        price: price,
        quantity: quantity,
        orderType: 2, // MARKET = 1, LIMIT = 2
        orderSide: isBuyingBase ? 1 : 2, // BUY = 1, SELL = 2
      }
    };
  } catch (error) {
    elizaLogger.error(`Error preparing limit order parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Failed to prepare limit order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Action to swap tokens on Helix DEX
 */
export const SwapTokenAction: Action = {
  name: "SWAP_TOKEN",
  description: "Swap tokens on Helix DEX",
  similes: [
    "SWAP_TOKEN",
    "SWAP_TOKENS",
    "EXCHANGE_TOKEN",
    "EXCHANGE_TOKENS",
    "TRADE_TOKEN",
    "TRADE_TOKENS",
    "CONVERT_TOKEN",
    "CONVERT_TOKENS",
    "SWAP_INJ",
    "SWAP_USDT",
    "SWAP_USDC",
    "SWAP_WBTC",
    "SWAP_WETH",
    "SWAP_ATOM",
    "SWAP_OSMO",
    "SWAP_SEI",
    "SWAP_ASTRO",
    "HELIX_SWAP",
    "DEX_SWAP"
  ],
  examples: [[swapTokenExample]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info(`Swap action: SWAP_TOKEN triggered`);
      
      // Check if this is a simulation
      const isSimulation = message.content.text.toLowerCase().includes('simulate') || 
                          message.content.text.toLowerCase().includes('test') ||
                          message.content.text.toLowerCase().includes('dry run');
      
      if (isSimulation) {
        elizaLogger.info(`Running in simulation mode - no actual swap will be executed`);
      }
      
      // First message to indicate we're processing the swap
      if (callback) {
        callback({
          text: `${isSimulation ? '[SIMULATION MODE] ' : ''}Processing your token swap request. One moment please...`
        });
      }
      
      // Extract swap details from message
      const swapDetails = extractSwapDetails(message.content.text);
      
      if (!swapDetails) {
        if (callback) {
          callback({
            text: "I couldn't understand your swap request. Please use the format 'Swap [amount] [source token] for [destination token]'. For example: 'Swap 0.01 INJ for USDT'.\n\nSupported tokens: " + Object.keys(KNOWN_TOKENS).map(t => t.toUpperCase()).join(", ")
          });
        }
        return false;
      }
      
      const { sourceToken, destToken, amount } = swapDetails;
      const sourceTokenConfig = KNOWN_TOKENS[sourceToken];
      const destTokenConfig = KNOWN_TOKENS[destToken];
      
      // Validate amount is positive
      if (amount <= 0) {
        if (callback) {
          callback({
            text: "The amount to swap must be greater than zero."
          });
        }
        return false;
      }
      
      elizaLogger.info(`Swapping ${amount} ${sourceTokenConfig.displayName} for ${destTokenConfig.displayName}`);
      
      // Find the trading pair
      const tradingPair = findTradingPair(sourceToken, destToken);
      
      if (!tradingPair) {
        if (callback) {
          callback({
            text: `I couldn't find a trading pair for ${sourceTokenConfig.displayName}/${destTokenConfig.displayName} on Helix DEX. Please try a different token pair.`
          });
        }
        return false;
      }
      
      // Initialize the Injective client
      const rawNetwork = runtime.getSetting("INJECTIVE_NETWORK");
      const injectivePrivateKey = runtime.getSetting("INJECTIVE_PRIVATE_KEY");
      const ethPublicKey = runtime.getSetting("EVM_PUBLIC_KEY");
      const injPublicKey = runtime.getSetting("INJECTIVE_PUBLIC_KEY");
      
      if (!injectivePrivateKey) {
        if (callback) {
          callback({
            text: "I couldn't process your swap because the Injective private key is missing. Please make sure it's properly configured in your environment variables."
          });
        }
        return false;
      }
      
      const network = rawNetwork as
        | "MainnetK8s"
        | "MainnetLB"
        | "Mainnet"
        | "MainnetSentry"
        | "MainnetOld"
        | "Staging"
        | "Internal"
        | "TestnetK8s"
        | "TestnetOld"
        | "TestnetSentry"
        | "Testnet"
        | "Devnet1"
        | "Devnet2"
        | "Devnet"
        | "Local";
      
      if (!network) {
        if (callback) {
          callback({
            text: "I couldn't process your swap because the Injective network setting is missing. Please make sure it's properly configured in your environment variables."
          });
        }
        return false;
      }
      
      const client = new InjectiveSDKClient(
        network,
        injectivePrivateKey,
        ethPublicKey,
        injPublicKey
      );
      
      // Get account details to get the wallet address
      const accountDetailsResponse = await client.getAccountDetails({
        address: injPublicKey || ""
      });
      
      if (!accountDetailsResponse.success) {
        elizaLogger.error(`Error fetching account details: ${accountDetailsResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while retrieving your account details: ${accountDetailsResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      const walletAddress = accountDetailsResponse.result?.account?.address || injPublicKey;
      
      if (!walletAddress) {
        if (callback) {
          callback({
            text: "I couldn't retrieve your wallet address. Please make sure your Injective configuration is correct."
          });
        }
        return false;
      }
      
      // Get source token balance to ensure sufficient funds
      elizaLogger.info(`Checking ${sourceTokenConfig.displayName} balance for address: ${walletAddress}`);
      const balanceResponse = await client.getBankBalance({ 
        denom: sourceTokenConfig.denom,
        address: walletAddress
      });
      
      if (!balanceResponse.success) {
        elizaLogger.error(`Error fetching ${sourceTokenConfig.displayName} balance: ${balanceResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while checking your ${sourceTokenConfig.displayName} balance: ${balanceResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      elizaLogger.info(`${sourceTokenConfig.displayName} balance response: ${JSON.stringify(balanceResponse.result)}`);
      const rawTokenBalance = balanceResponse.result?.amount || "0";
      
      // Check if the amount is already in human-readable format
      const isHumanReadable = rawTokenBalance.includes('.');
      
      // Convert balance to human-readable format
      let tokenBalance = 0;
      if (isHumanReadable) {
        tokenBalance = parseFloat(rawTokenBalance);
      } else {
        // Divide by 10^decimals
        tokenBalance = parseFloat(rawTokenBalance) / Math.pow(10, sourceTokenConfig.decimals);
      }
      
      elizaLogger.info(`Current ${sourceTokenConfig.displayName} balance: ${tokenBalance}`);
      
      // Check if there are sufficient funds
      if (tokenBalance < amount) {
        if (callback) {
          callback({
            text: `You don't have enough ${sourceTokenConfig.displayName} to complete this swap. Your current balance is ${tokenBalance.toFixed(6)} ${sourceTokenConfig.displayName}, and you're trying to swap ${amount} ${sourceTokenConfig.displayName}.`
          });
        }
        return false;
      }
      
      // Also check if there's enough INJ for gas
      if (sourceToken !== 'inj') {
        const injBalanceResponse = await client.getBankBalance({ 
          denom: "inj",
          address: walletAddress
        });
        
        let hasEnoughGas = false;
        if (injBalanceResponse.success) {
          const rawInjBalance = injBalanceResponse.result?.amount || "0";
          const isInjHumanReadable = rawInjBalance.includes('.');
          let injBalance = 0;
          
          if (isInjHumanReadable) {
            injBalance = parseFloat(rawInjBalance);
          } else {
            injBalance = parseFloat(rawInjBalance) / 1e18;
          }
          
          const minGasRequired = 0.002; // Minimum INJ required for gas (higher for swaps)
          hasEnoughGas = injBalance >= minGasRequired;
          
          if (!hasEnoughGas) {
            if (callback) {
              callback({
                text: `You don't have enough INJ to pay for gas fees. You need at least ${minGasRequired} INJ for gas, but your current INJ balance is ${injBalance.toFixed(6)} INJ.`
              });
            }
            return false;
          }
        }
      }
      
      // Check if the user has a subaccount
      const subaccounts = await client.getSubaccountsList(walletAddress);
      elizaLogger.info(`Found ${subaccounts.length} subaccounts for wallet ${walletAddress}`);
      
      let subaccountId = null;
      
      // If no subaccounts exist, create one by depositing a small amount of INJ
      if (subaccounts.length === 0) {
        elizaLogger.info(`No subaccounts found for wallet ${walletAddress}. Creating a new subaccount...`);
        
        // Generate a subaccount ID for the new subaccount (using index 0)
        subaccountId = await getSubaccountId(client, walletAddress, ethPublicKey);
        
        // Define deposit parameters
        const depositParams = {
          sender: walletAddress,
          subaccountId: subaccountId,
          amount: {
            amount: "1000000000000000", // 0.001 INJ in base denomination (18 decimals)
            denom: "inj"
          }
        };
        
        elizaLogger.info(`Depositing 0.001 INJ to create subaccount with ID: ${subaccountId}`);
        
        if (callback) {
          callback({
            text: `I need to create a subaccount for you before executing the swap. This is a one-time setup required by Injective. Creating subaccount now...`
          });
        }
        
        try {
          // Execute the deposit to create the subaccount
          const depositResponse = await client.msgDeposit(depositParams);
          
          if (!depositResponse.success) {
            elizaLogger.error(`Failed to create subaccount: ${depositResponse.error?.message}`);
            if (callback) {
              callback({
                text: `I couldn't create a subaccount for trading. You need to have a subaccount with funds to execute swaps on Injective. Error: ${depositResponse.error?.message || "Unknown error"}`
              });
            }
            return false;
          }
          
          elizaLogger.info(`Subaccount created successfully. Deposit response: ${JSON.stringify(depositResponse)}`);
          
          // Wait a moment for the subaccount to be properly registered
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          if (callback) {
            callback({
              text: `Successfully created a subaccount for you. Now proceeding with the swap...`
            });
          }
        } catch (depositError) {
          elizaLogger.error(`Failed to create subaccount: ${depositError instanceof Error ? depositError.message : 'Unknown error'}`);
          elizaLogger.error(`Deposit error details: ${JSON.stringify(depositError)}`);
          if (callback) {
            callback({
              text: `I couldn't create a subaccount for trading. You need to have a subaccount with funds to execute swaps on Injective. Error: ${depositError instanceof Error ? depositError.message : 'Unknown error'}`
            });
          }
          return false;
        }
      } else {
        // Use the first existing subaccount
        subaccountId = subaccounts[0].subaccountId;
        elizaLogger.info(`Using existing subaccount with ID: ${subaccountId}`);
      }
      
      // Simulation mode check
      if (isSimulation) {
        // Convert amount to raw amount for simulation
        const rawAmount = convertToRawAmount(amount, sourceTokenConfig.decimals);
        
        // Estimate the amount of destination tokens to be received
        const estimatedReceiveAmount = await estimateSwapAmount(sourceToken, destToken, amount);
        elizaLogger.info(`Estimated receive amount: ${estimatedReceiveAmount} ${destTokenConfig.displayName}`);
        
        elizaLogger.info(`Simulation completed. Estimated swap: ${amount} ${sourceToken} for approximately ${estimatedReceiveAmount.toFixed(6)} ${destToken}`);
        
        // Get a subaccount ID for simulation
        const simulationSubaccountId = subaccountId || "No subaccount found";
        
        // Prepare market order parameters for simulation
        const simulationMarketOrderParams = await prepareSpotMarketOrderParams(
          client,
          tradingPair.marketId,
          walletAddress,
          rawAmount,
          destToken === tradingPair.baseToken,
          sourceToken,
          sourceTokenConfig,
          ethPublicKey,
          simulationSubaccountId
        );
        
        // Check if this is a debug simulation
        const isDebug = message.content.text.toLowerCase().includes('debug');
        
        // Construct debug information if requested
        let debugInfo = '';
        if (isDebug) {
          debugInfo = `\n\nDebug Information:
- Ethereum Address: ${ethPublicKey || 'Not provided'}
- Raw Amount: ${rawAmount}
- Market Order Parameters: ${JSON.stringify(simulationMarketOrderParams, null, 2)}`;
        }
        
        if (callback) {
          callback({
            text: `This is a simulation of the swap. No actual swap was executed.

I would swap ${amount} ${sourceTokenConfig.displayName} for approximately ${estimatedReceiveAmount.toFixed(6)} ${destTokenConfig.displayName} on market ${tradingPair.marketId}.

Wallet Address: ${walletAddress}
Subaccount ID: ${simulationSubaccountId}${debugInfo}`
          });
        }
        
        return true;
      }
      
      // Execute the market order
      elizaLogger.info(`Executing market order to swap ${amount} ${sourceToken} for ${destToken}`);
      
      // Convert amount to raw amount based on token decimals
      const rawAmount = convertToRawAmount(amount, sourceTokenConfig.decimals);
      elizaLogger.info(`Converted amount: ${amount} ${sourceTokenConfig.displayName} to raw amount: ${rawAmount}`);
      
      // Prepare market order parameters
      const marketOrderParams = await prepareSpotMarketOrderParams(
        client,
        tradingPair.marketId,
        walletAddress,
        rawAmount,
        destToken === tradingPair.baseToken,
        sourceToken,
        sourceTokenConfig,
        ethPublicKey,
        subaccountId
      );
      
      elizaLogger.info(`Market order parameters: ${JSON.stringify(marketOrderParams)}`);
      
      // Execute the market order with retry mechanism
      let txHash = '';
      let success = false;
      let lastError = null;
      
      // Estimate the amount of destination tokens to be received
      const estimatedReceiveAmount = await estimateSwapAmount(sourceToken, destToken, amount);
      elizaLogger.info(`Estimated receive amount: ${estimatedReceiveAmount} ${destTokenConfig.displayName}`);
      
      // Try up to 3 times with the same subaccount ID
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          elizaLogger.info(`Attempt ${attempt} to execute market order with subaccount ID: ${subaccountId}`);
          
          const response = await client.msgCreateSpotMarketOrder(marketOrderParams);
          elizaLogger.info(`Market order response: ${JSON.stringify(response)}`);
          
          if (response.txHash) {
            txHash = response.txHash;
            success = true;
            elizaLogger.info(`Market order executed successfully. Transaction hash: ${txHash}`);
            break;
          } else {
            lastError = new Error(`Market order execution failed: ${JSON.stringify(response)}`);
            elizaLogger.error(`Attempt ${attempt} failed: ${lastError.message}`);
          }
        } catch (error) {
          lastError = error;
          elizaLogger.error(`Error executing market order (attempt ${attempt}): ${error instanceof Error ? error.message : 'Unknown error'}`);
          elizaLogger.error(`Error details: ${JSON.stringify(error)}`);
          
          // Wait a short time before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!success) {
        elizaLogger.error(`All attempts to execute market order failed`);
        if (callback) {
          callback({
            text: `I couldn't execute the swap after multiple attempts. The most recent error was: ${lastError instanceof Error ? lastError.message : 'Unknown error'}. Please make sure your subaccount has sufficient funds and try again.`
          });
        }
        return false;
      }
      
      elizaLogger.info(`Swap executed successfully. Transaction hash: ${txHash}`);
      
      if (callback) {
        callback({
          text: `I've successfully swapped ${amount} ${sourceTokenConfig.displayName} for approximately ${estimatedReceiveAmount.toFixed(6)} ${destTokenConfig.displayName}. Transaction hash: ${txHash}`,
          content: {
            sourceToken: sourceTokenConfig.displayName,
            sourceAmount: amount,
            destToken: destTokenConfig.displayName,
            estimatedReceiveAmount: estimatedReceiveAmount,
            txHash: txHash,
            walletAddress: walletAddress
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in SWAP_TOKEN handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while processing your token swap. Please try again later."
        });
      }
      return false;
    }
  }
};