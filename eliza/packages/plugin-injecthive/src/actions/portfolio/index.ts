import { Action, ActionExample, Memory, State, HandlerCallback, IAgentRuntime } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { InjectiveSDKClient } from "../../client";

// Simple example for portfolio action
const exampleUser: ActionExample = {
  user: "user",
  content: {
    text: "Show me my portfolio",
  }
};

// Token configuration with decimals and CoinGecko IDs
interface TokenConfig {
  denom: string;
  displayName: string;
  decimals: number;
  coinGeckoId?: string;
}

// Define known tokens with their configurations
const KNOWN_TOKENS: TokenConfig[] = [
  { denom: "inj", displayName: "INJ", decimals: 18, coinGeckoId: "injective-protocol" },
  { denom: "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7", displayName: "USDT", decimals: 6, coinGeckoId: "tether" },
  { denom: "peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", displayName: "USDC", decimals: 6, coinGeckoId: "usd-coin" },
  { denom: "peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", displayName: "WBTC", decimals: 8, coinGeckoId: "wrapped-bitcoin" },
  { denom: "peggy0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", displayName: "WETH", decimals: 18, coinGeckoId: "ethereum" },
  { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/atom", displayName: "ATOM", decimals: 6, coinGeckoId: "cosmos" },
  { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/osmo", displayName: "OSMO", decimals: 6, coinGeckoId: "osmosis" },
  { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/sei", displayName: "SEI", decimals: 6, coinGeckoId: "sei-network" },
  { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/astro", displayName: "ASTRO", decimals: 6, coinGeckoId: "astroport" },
];

// Hardcoded token prices for fallback
const FALLBACK_PRICES: Record<string, number> = {
  "injective-protocol": 13.20,
  "tether": 1.00,
  "usd-coin": 1.00,
  "wrapped-bitcoin": 62500.00,
  "ethereum": 3200.00,
  "cosmos": 8.50,
  "osmosis": 0.65,
  "sei-network": 0.55,
  "astroport": 0.12,
};

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Helper function to convert raw amount to human-readable amount based on decimals
function convertRawAmount(rawAmount: string, decimals: number): number {
  // Check if the amount already has a decimal point, which indicates it's already in human-readable format
  if (rawAmount.includes('.')) {
    return parseFloat(rawAmount);
  }
  return parseFloat(rawAmount) / Math.pow(10, decimals);
}

// Helper function to determine if a balance is already in human-readable format
function isHumanReadableFormat(amount: string): boolean {
  return amount.includes('.');
}

/**
 * Action to display the user's portfolio
 */
export const ShowPortfolioAction: Action = {
  name: "SHOW_PORTFOLIO",
  description: "Display the user's Injective portfolio including wallet address and token balances",
  similes: [
    "SHOW_PORTFOLIO", 
    "DISPLAY_PORTFOLIO", 
    "VIEW_PORTFOLIO", 
    "CHECK_PORTFOLIO", 
    "GET_PORTFOLIO",
    "MY_PORTFOLIO",
    "SHOW_MY_PORTFOLIO",
    "DISPLAY_MY_PORTFOLIO",
    "VIEW_MY_PORTFOLIO",
    "CHECK_MY_PORTFOLIO",
    "SHOW_WALLET",
    "DISPLAY_WALLET",
    "VIEW_WALLET",
    "CHECK_WALLET",
    "SHOW_MY_WALLET",
    "DISPLAY_MY_WALLET",
    "VIEW_MY_WALLET",
    "CHECK_MY_WALLET",
    "SHOW_BALANCE",
    "DISPLAY_BALANCE",
    "VIEW_BALANCE",
    "CHECK_BALANCE",
    "SHOW_MY_BALANCE",
    "DISPLAY_MY_BALANCE",
    "VIEW_MY_BALANCE",
    "CHECK_MY_BALANCE"
  ],
  examples: [[exampleUser]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info(`Portfolio action: SHOW_PORTFOLIO triggered`);
    
    try {
      // First message to indicate we're looking up the data
      if (callback) {
        callback({
          text: `Let me retrieve your Injective portfolio information. One moment please...`
        });
      }
      
      // Initialize the Injective client
      const rawNetwork = runtime.getSetting("INJECTIVE_NETWORK");
      const injectivePrivateKey = runtime.getSetting("INJECTIVE_PRIVATE_KEY");
      const ethPublicKey = runtime.getSetting("EVM_PUBLIC_KEY");
      const injPublicKey = runtime.getSetting("INJECTIVE_PUBLIC_KEY");
      
      if (!injectivePrivateKey) {
        if (callback) {
          callback({
            text: "I couldn't retrieve your portfolio because the Injective private key is missing. Please make sure it's properly configured in your environment variables."
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
            text: "I couldn't retrieve your portfolio because the Injective network setting is missing. Please make sure it's properly configured in your environment variables."
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
      
      // Create an array to store token balances
      interface TokenBalance {
        token: TokenConfig;
        rawAmount: string;
        amount: number;
        usdPrice?: number;
        usdValue?: number;
      }
      
      const tokenBalances: TokenBalance[] = [];
      let totalPortfolioValue = 0;
      
      // Fetch balances for all known tokens
      for (const token of KNOWN_TOKENS) {
        try {
          elizaLogger.info(`Fetching balance for ${token.displayName} (${token.denom})`);
          const balanceResponse = await client.getBankBalance({ denom: token.denom });
          
          if (balanceResponse.success) {
            elizaLogger.info(`Balance response for ${token.displayName}: ${JSON.stringify(balanceResponse.result)}`);
            
            // Check if the token has a non-zero balance
            const rawAmount = balanceResponse.result?.amount || "0";
            if (rawAmount !== "0") {
              // Determine if the amount is already in human-readable format
              const isHumanReadable = isHumanReadableFormat(rawAmount);
              elizaLogger.info(`Amount for ${token.displayName} is in human-readable format: ${isHumanReadable}`);
              
              // Convert amount based on whether it's already in human-readable format
              const amount = isHumanReadable ? 
                parseFloat(rawAmount) : 
                convertRawAmount(rawAmount, token.decimals);
              
              elizaLogger.info(`Converted ${token.displayName} amount: ${amount} (raw: ${rawAmount}, decimals: ${token.decimals})`);
              
              // Get token price if CoinGecko ID is available
              let usdPrice: number | undefined;
              let usdValue: number | undefined;
              
              if (token.coinGeckoId) {
                try {
                  elizaLogger.info(`Fetching price for ${token.displayName} (${token.coinGeckoId})`);
                  const priceResponse = await client.getTokenPrice({ denom: token.coinGeckoId });
                  
                  if (priceResponse.success && priceResponse.result?.price) {
                    usdPrice = priceResponse.result.price;
                    elizaLogger.info(`Price for ${token.displayName}: $${usdPrice}`);
                  } else {
                    // Use fallback price if API call fails
                    usdPrice = FALLBACK_PRICES[token.coinGeckoId];
                    elizaLogger.info(`Using fallback price for ${token.displayName}: $${usdPrice}`);
                  }
                  
                  if (usdPrice) {
                    usdValue = amount * usdPrice;
                    totalPortfolioValue += usdValue;
                    elizaLogger.info(`USD value for ${token.displayName}: $${usdValue}`);
                  }
                } catch (error) {
                  // Use fallback price if there's an error
                  usdPrice = FALLBACK_PRICES[token.coinGeckoId];
                  if (usdPrice) {
                    usdValue = amount * usdPrice;
                    totalPortfolioValue += usdValue;
                    elizaLogger.info(`Using fallback price for ${token.displayName}: $${usdPrice}, value: $${usdValue}`);
                  }
                  elizaLogger.warn(`Error fetching price for ${token.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
              
              tokenBalances.push({
                token,
                rawAmount,
                amount,
                usdPrice,
                usdValue
              });
            }
          } else {
            elizaLogger.warn(`Failed to fetch balance for ${token.displayName}: ${balanceResponse.error?.message}`);
          }
        } catch (error) {
          elizaLogger.warn(`Error fetching balance for ${token.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Format the response
      let responseText = `## Your Injective Portfolio\n\n`;
      responseText += `**Wallet Address:** \`${walletAddress}\`\n\n`;
      
      if (tokenBalances.length === 0) {
        responseText += "No token balances found in your wallet.\n";
      } else {
        responseText += `### Token Balances\n\n`;
        
        // Sort tokens by USD value (highest first)
        tokenBalances.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
        
        for (const balance of tokenBalances) {
          responseText += `- **${balance.token.displayName}**: ${balance.amount.toLocaleString()} ${balance.token.displayName}`;
          
          if (balance.usdPrice && balance.usdValue) {
            responseText += ` (${formatCurrency(balance.usdValue)} @ ${formatCurrency(balance.usdPrice)} per token)\n`;
          } else {
            responseText += `\n`;
          }
        }
        
        // Add total portfolio value
        if (totalPortfolioValue > 0) {
          responseText += `\n**Total Portfolio Value:** ${formatCurrency(totalPortfolioValue)}\n`;
        }
      }
      
      // Try to get subaccount balances if available
      try {
        const subaccountResponse = await client.getSubaccountBalancesList({
          accountAddress: walletAddress
        });
        
        if (subaccountResponse.success && subaccountResponse.result?.balances?.length > 0) {
          responseText += "\n### Subaccount Balances\n\n";
          
          for (const balance of subaccountResponse.result.balances) {
            const denom = balance.denom || "Unknown";
            const totalBalance = balance.deposit?.totalBalance || "0";
            const availableBalance = balance.deposit?.availableBalance || "0";
            
            responseText += `- **${denom}**:\n`;
            responseText += `  - Total: ${totalBalance}\n`;
            responseText += `  - Available: ${availableBalance}\n`;
          }
        }
      } catch (error) {
        elizaLogger.warn(`Error fetching subaccount balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue without subaccount balances
      }
      
      // Add a note about checking the explorer for more details
      responseText += "\n\nFor a more detailed view of your portfolio, you can check the [Injective Explorer](https://explorer.injective.network/) or [Mintscan](https://www.mintscan.io/injective/).";
      
      // Simplified response for UI display
      let simplifiedResponse = `Your Injective Portfolio\n\nWallet Address:\n${walletAddress}\n\nToken Balances\n\n`;
      
      for (const balance of tokenBalances) {
        simplifiedResponse += `• ${balance.token.displayName}: ${balance.amount.toLocaleString()} ${balance.token.displayName}\n`;
      }
      
      simplifiedResponse += `\nFor a more detailed view of your portfolio, you can check the Injective Explorer or Mintscan.`;
      
      if (callback) {
        callback({
          text: responseText,
          content: {
            address: walletAddress,
            tokenBalances,
            totalPortfolioValue
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in SHOW_PORTFOLIO handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving your portfolio information. Please try again later."
        });
      }
      return false;
    }
  }
};

/**
 * Action to display the user's wallet address and INJ balance
 */
export const ShowWalletAddressAction: Action = {
  name: "SHOW_WALLET_ADDRESS",
  description: "Display the user's Injective wallet address and INJ balance",
  similes: [
    "SHOW_WALLET_ADDRESS", 
    "DISPLAY_WALLET_ADDRESS", 
    "VIEW_WALLET_ADDRESS", 
    "CHECK_WALLET_ADDRESS", 
    "GET_WALLET_ADDRESS",
    "MY_WALLET_ADDRESS",
    "SHOW_MY_WALLET_ADDRESS",
    "DISPLAY_MY_WALLET_ADDRESS",
    "VIEW_MY_WALLET_ADDRESS",
    "CHECK_MY_WALLET_ADDRESS",
    "SHOW_ADDRESS",
    "DISPLAY_ADDRESS",
    "VIEW_ADDRESS",
    "CHECK_ADDRESS",
    "SHOW_MY_ADDRESS",
    "DISPLAY_MY_ADDRESS",
    "VIEW_MY_ADDRESS",
    "CHECK_MY_ADDRESS",
    "SHOW_INJ_BALANCE",
    "DISPLAY_INJ_BALANCE",
    "VIEW_INJ_BALANCE",
    "CHECK_INJ_BALANCE",
    "SHOW_MY_INJ_BALANCE",
    "DISPLAY_MY_INJ_BALANCE",
    "VIEW_MY_INJ_BALANCE",
    "CHECK_MY_INJ_BALANCE"
  ],
  examples: [[{
    user: "user",
    content: {
      text: "Show me my Injective wallet address and INJ balance",
    }
  }]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info(`Portfolio action: SHOW_WALLET_ADDRESS triggered`);
    
    try {
      // First message to indicate we're looking up the data
      if (callback) {
        callback({
          text: `Let me retrieve your Injective wallet address and INJ balance. One moment please...`
        });
      }
      
      // Initialize the Injective client
      const rawNetwork = runtime.getSetting("INJECTIVE_NETWORK");
      const injectivePrivateKey = runtime.getSetting("INJECTIVE_PRIVATE_KEY");
      const ethPublicKey = runtime.getSetting("EVM_PUBLIC_KEY");
      const injPublicKey = runtime.getSetting("INJECTIVE_PUBLIC_KEY");
      
      if (!injectivePrivateKey) {
        if (callback) {
          callback({
            text: "I couldn't retrieve your wallet information because the Injective private key is missing. Please make sure it's properly configured in your environment variables."
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
            text: "I couldn't retrieve your wallet information because the Injective network setting is missing. Please make sure it's properly configured in your environment variables."
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
      
      // Get INJ balance
      elizaLogger.info(`Fetching INJ balance for address: ${walletAddress}`);
      const balanceResponse = await client.getBankBalance({ denom: "inj" });
      
      if (!balanceResponse.success) {
        elizaLogger.error(`Error fetching INJ balance: ${balanceResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while retrieving your INJ balance: ${balanceResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      elizaLogger.info(`INJ balance response: ${JSON.stringify(balanceResponse.result)}`);
      const rawInjBalance = balanceResponse.result?.amount || "0";
      
      // Check if the amount is already in human-readable format
      const isHumanReadable = isHumanReadableFormat(rawInjBalance);
      elizaLogger.info(`INJ amount is in human-readable format: ${isHumanReadable}`);
      
      // Convert amount based on whether it's already in human-readable format
      const injBalance = isHumanReadable ? 
        parseFloat(rawInjBalance) : 
        convertRawAmount(rawInjBalance, 18);
      
      elizaLogger.info(`Converted INJ balance: ${injBalance} (raw: ${rawInjBalance})`);
      
      // Get INJ price
      let injUsdValue = 0;
      try {
        const priceResponse = await client.getTokenPrice({ denom: "injective-protocol" });
        if (priceResponse.success && priceResponse.result?.price) {
          const injPrice = priceResponse.result.price;
          injUsdValue = injBalance * injPrice;
          elizaLogger.info(`INJ price: $${injPrice}, value: $${injUsdValue}`);
        } else {
          // Use fallback price
          const fallbackPrice = FALLBACK_PRICES["injective-protocol"];
          injUsdValue = injBalance * fallbackPrice;
          elizaLogger.info(`Using fallback INJ price: $${fallbackPrice}, value: $${injUsdValue}`);
        }
      } catch (error) {
        // Use fallback price
        const fallbackPrice = FALLBACK_PRICES["injective-protocol"];
        injUsdValue = injBalance * fallbackPrice;
        elizaLogger.info(`Using fallback INJ price due to error: $${fallbackPrice}, value: $${injUsdValue}`);
        elizaLogger.warn(`Error fetching INJ price: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Format the response
      let responseText = `## Your Injective Wallet\n\n`;
      responseText += `**Wallet Address:** \`${walletAddress}\`\n\n`;
      responseText += `**INJ Balance:** ${injBalance.toLocaleString()} INJ`;
      
      if (injUsdValue > 0) {
        responseText += ` (${formatCurrency(injUsdValue)})`;
      }
      
      // Simplified response for UI display
      let simplifiedResponse = `Your Injective Wallet\n\nWallet Address:\n${walletAddress}\n\nINJ Balance: ${injBalance.toLocaleString()} INJ`;
      
      if (injUsdValue > 0) {
        simplifiedResponse += ` (${formatCurrency(injUsdValue)})`;
      }
      
      if (callback) {
        callback({
          text: responseText,
          content: {
            address: walletAddress,
            injBalance,
            injUsdValue
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in SHOW_WALLET_ADDRESS handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving your wallet information. Please try again later."
        });
      }
      return false;
    }
  }
};

export const PortfolioActions = [
  ShowPortfolioAction,
  ShowWalletAddressAction
]; 