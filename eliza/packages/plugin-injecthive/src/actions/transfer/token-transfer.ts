import { Action, ActionExample, Memory, State, HandlerCallback, IAgentRuntime } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { InjectiveSDKClient } from "../../client";

// Example for transferring tokens
const transferTokenExample: ActionExample = {
  user: "user",
  content: {
    text: "Send 0.01 USDT to inj1nh9v5a5p524yy29dn0xgav5jm52dye28arfmz9",
  }
};

// Define known tokens with their configurations
const KNOWN_TOKENS: Record<string, { denom: string, displayName: string, decimals: number }> = {
  "usdt": { denom: "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7", displayName: "USDT", decimals: 6 },
  "usdc": { denom: "peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", displayName: "USDC", decimals: 6 },
  "wbtc": { denom: "peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", displayName: "WBTC", decimals: 8 },
  "weth": { denom: "peggy0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", displayName: "WETH", decimals: 18 },
  "atom": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/atom", displayName: "ATOM", decimals: 6 },
  "osmo": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/osmo", displayName: "OSMO", decimals: 6 },
  "sei": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/sei", displayName: "SEI", decimals: 6 },
  "astro": { denom: "factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/astro", displayName: "ASTRO", decimals: 6 },
};

/**
 * Helper function to extract wallet address from user message
 */
function extractWalletAddress(message: string): string | null {
  // Match Injective address pattern (inj1...)
  const match = message.match(/inj1[a-zA-Z0-9]{38,}/);
  return match ? match[0] : null;
}

/**
 * Helper function to extract token and amount from user message
 */
function extractTokenAndAmount(message: string): { token: string, amount: number } | null {
  // Match number followed by token symbol
  const match = message.match(/(\d+(\.\d+)?)\s*([A-Za-z]+)/i);
  if (match && match[1] && match[3]) {
    const amount = parseFloat(match[1]);
    const token = match[3].toLowerCase();
    
    if (isNaN(amount) || !KNOWN_TOKENS[token]) {
      return null;
    }
    
    return { token, amount };
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
 * Action to transfer tokens
 */
export const TransferTokenAction: Action = {
  name: "TRANSFER_TOKEN",
  description: "Transfer tokens to another wallet",
  similes: [
    "TRANSFER_TOKEN",
    "SEND_TOKEN",
    "TRANSFER_TOKENS",
    "SEND_TOKENS",
    "TRANSFER_USDT",
    "SEND_USDT",
    "TRANSFER_USDC",
    "SEND_USDC",
    "TRANSFER_WBTC",
    "SEND_WBTC",
    "TRANSFER_WETH",
    "SEND_WETH",
    "TRANSFER_ATOM",
    "SEND_ATOM",
    "TRANSFER_OSMO",
    "SEND_OSMO",
    "TRANSFER_SEI",
    "SEND_SEI",
    "TRANSFER_ASTRO",
    "SEND_ASTRO"
  ],
  examples: [[transferTokenExample]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info(`Transfer action: TRANSFER_TOKEN triggered`);
      
      // First message to indicate we're processing the transfer
      if (callback) {
        callback({
          text: `Processing your token transfer request. One moment please...`
        });
      }
      
      // Extract destination wallet address from message
      const destinationAddress = extractWalletAddress(message.content.text);
      
      if (!destinationAddress) {
        if (callback) {
          callback({
            text: "I couldn't find a valid Injective wallet address in your message. Please provide a destination address in the format 'inj1...'."
          });
        }
        return false;
      }
      
      // Extract token and amount from message
      const tokenInfo = extractTokenAndAmount(message.content.text);
      
      if (!tokenInfo) {
        if (callback) {
          callback({
            text: "I couldn't determine the token and amount to send. Please specify the amount and token in the format '0.01 USDT'. Supported tokens: " + Object.keys(KNOWN_TOKENS).map(t => t.toUpperCase()).join(", ")
          });
        }
        return false;
      }
      
      const { token, amount } = tokenInfo;
      const tokenConfig = KNOWN_TOKENS[token];
      
      // Validate amount is positive
      if (amount <= 0) {
        if (callback) {
          callback({
            text: "The amount to transfer must be greater than zero."
          });
        }
        return false;
      }
      
      elizaLogger.info(`Transferring ${amount} ${tokenConfig.displayName} to ${destinationAddress}`);
      
      // Initialize the Injective client
      const rawNetwork = runtime.getSetting("INJECTIVE_NETWORK");
      const injectivePrivateKey = runtime.getSetting("INJECTIVE_PRIVATE_KEY");
      const ethPublicKey = runtime.getSetting("EVM_PUBLIC_KEY");
      const injPublicKey = runtime.getSetting("INJECTIVE_PUBLIC_KEY");
      
      if (!injectivePrivateKey) {
        if (callback) {
          callback({
            text: "I couldn't process your transfer because the Injective private key is missing. Please make sure it's properly configured in your environment variables."
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
            text: "I couldn't process your transfer because the Injective network setting is missing. Please make sure it's properly configured in your environment variables."
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
      
      const sourceAddress = accountDetailsResponse.result?.account?.address || injPublicKey;
      
      if (!sourceAddress) {
        if (callback) {
          callback({
            text: "I couldn't retrieve your wallet address. Please make sure your Injective configuration is correct."
          });
        }
        return false;
      }
      
      // Check if source and destination addresses are the same
      if (sourceAddress === destinationAddress) {
        if (callback) {
          callback({
            text: `You're trying to send ${tokenConfig.displayName} to your own wallet. Please specify a different destination address.`
          });
        }
        return false;
      }
      
      // Get token balance to ensure sufficient funds
      elizaLogger.info(`Checking ${tokenConfig.displayName} balance for address: ${sourceAddress}`);
      const balanceResponse = await client.getBankBalance({ 
        denom: tokenConfig.denom,
        address: sourceAddress
      });
      
      if (!balanceResponse.success) {
        elizaLogger.error(`Error fetching ${tokenConfig.displayName} balance: ${balanceResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while checking your ${tokenConfig.displayName} balance: ${balanceResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      elizaLogger.info(`${tokenConfig.displayName} balance response: ${JSON.stringify(balanceResponse.result)}`);
      const rawTokenBalance = balanceResponse.result?.amount || "0";
      
      // Check if the amount is already in human-readable format
      const isHumanReadable = rawTokenBalance.includes('.');
      
      // Convert balance to human-readable format
      let tokenBalance = 0;
      if (isHumanReadable) {
        tokenBalance = parseFloat(rawTokenBalance);
      } else {
        // Divide by 10^decimals
        tokenBalance = parseFloat(rawTokenBalance) / Math.pow(10, tokenConfig.decimals);
      }
      
      elizaLogger.info(`Current ${tokenConfig.displayName} balance: ${tokenBalance}`);
      
      // Check if there are sufficient funds
      if (tokenBalance < amount) {
        if (callback) {
          callback({
            text: `You don't have enough ${tokenConfig.displayName} to complete this transfer. Your current balance is ${tokenBalance.toFixed(6)} ${tokenConfig.displayName}, and you're trying to send ${amount} ${tokenConfig.displayName}.`
          });
        }
        return false;
      }
      
      // Also check if there's enough INJ for gas
      const injBalanceResponse = await client.getBankBalance({ 
        denom: "inj",
        address: sourceAddress
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
        
        const minGasRequired = 0.001; // Minimum INJ required for gas
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
      
      // Convert amount to raw amount
      const rawAmount = convertToRawAmount(amount, tokenConfig.decimals);
      elizaLogger.info(`Converted amount: ${amount} ${tokenConfig.displayName} to raw amount: ${rawAmount}`);
      
      // Prepare and send the transaction
      const transferResponse = await client.msgSend({
        amount: {
          denom: tokenConfig.denom,
          amount: rawAmount
        },
        srcInjectiveAddress: sourceAddress,
        dstInjectiveAddress: destinationAddress
      });
      
      if (!transferResponse.success) {
        elizaLogger.error(`Error sending ${tokenConfig.displayName}: ${transferResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while sending ${tokenConfig.displayName}: ${transferResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      // Transaction was successful
      const txHash = transferResponse.result?.txHash || "unknown";
      elizaLogger.info(`${tokenConfig.displayName} transfer successful. Transaction hash: ${txHash}`);
      
      // Format the response
      let responseText = `## ${tokenConfig.displayName} Transfer Successful\n\n`;
      responseText += `I've successfully sent **${amount} ${tokenConfig.displayName}** from your wallet to \`${destinationAddress}\`.\n\n`;
      responseText += `**Transaction Details:**\n`;
      responseText += `- **Amount:** ${amount} ${tokenConfig.displayName}\n`;
      responseText += `- **From:** \`${sourceAddress}\`\n`;
      responseText += `- **To:** \`${destinationAddress}\`\n`;
      responseText += `- **Transaction Hash:** \`${txHash}\`\n\n`;
      
      // Add explorer links
      responseText += `### Explorer Links\n\n`;
      responseText += `- [View Transaction on Injective Explorer](https://explorer.injective.network/transaction/${txHash})\n`;
      responseText += `- [View Transaction on Mintscan](https://www.mintscan.io/injective/txs/${txHash})\n`;
      
      if (callback) {
        callback({
          text: responseText,
          content: {
            token: tokenConfig.displayName,
            amount: amount,
            sourceAddress: sourceAddress,
            destinationAddress: destinationAddress,
            txHash: txHash
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in TRANSFER_TOKEN handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while processing your token transfer. Please try again later."
        });
      }
      return false;
    }
  }
}; 