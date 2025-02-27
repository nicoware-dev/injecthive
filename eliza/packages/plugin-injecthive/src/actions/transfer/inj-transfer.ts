import { Action, ActionExample, Memory, State, HandlerCallback, IAgentRuntime } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { InjectiveSDKClient } from "../../client";

// Example for transferring INJ
const transferInjExample: ActionExample = {
  user: "user",
  content: {
    text: "Send 0.01 INJ to inj1nh9v5a5p524yy29dn0xgav5jm52dye28arfmz9",
  }
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
 * Helper function to extract amount from user message
 */
function extractAmount(message: string): number | null {
  // Match number followed by INJ
  const match = message.match(/(\d+(\.\d+)?)\s*INJ/i);
  if (match && match[1]) {
    const amount = parseFloat(match[1]);
    return isNaN(amount) ? null : amount;
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
  // For INJ, decimals is 18
  const multiplier = Math.pow(10, decimals);
  const rawAmount = amount * multiplier;
  
  // Convert to string without scientific notation
  return rawAmount.toLocaleString('fullwide', { useGrouping: false });
}

/**
 * Action to transfer INJ tokens
 */
export const TransferInjAction: Action = {
  name: "TRANSFER_INJ",
  description: "Transfer INJ tokens to another wallet",
  similes: [
    "TRANSFER_INJ",
    "SEND_INJ",
    "TRANSFER_INJECTIVE",
    "SEND_INJECTIVE",
    "SEND_INJ_TOKENS",
    "TRANSFER_INJ_TOKENS",
    "SEND_INJECTIVE_TOKENS",
    "TRANSFER_INJECTIVE_TOKENS"
  ],
  examples: [[transferInjExample]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info(`Transfer action: TRANSFER_INJ triggered`);
      
      // First message to indicate we're processing the transfer
      if (callback) {
        callback({
          text: `Processing your INJ transfer request. One moment please...`
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
      
      // Extract amount from message
      const amount = extractAmount(message.content.text);
      
      if (!amount) {
        if (callback) {
          callback({
            text: "I couldn't determine the amount of INJ to send. Please specify the amount in the format '0.01 INJ'."
          });
        }
        return false;
      }
      
      // Validate amount is positive
      if (amount <= 0) {
        if (callback) {
          callback({
            text: "The amount to transfer must be greater than zero."
          });
        }
        return false;
      }
      
      elizaLogger.info(`Transferring ${amount} INJ to ${destinationAddress}`);
      
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
            text: "You're trying to send INJ to your own wallet. Please specify a different destination address."
          });
        }
        return false;
      }
      
      // Get INJ balance to ensure sufficient funds
      elizaLogger.info(`Checking INJ balance for address: ${sourceAddress}`);
      const balanceResponse = await client.getBankBalance({ 
        denom: "inj",
        address: sourceAddress
      });
      
      if (!balanceResponse.success) {
        elizaLogger.error(`Error fetching INJ balance: ${balanceResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while checking your INJ balance: ${balanceResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      elizaLogger.info(`INJ balance response: ${JSON.stringify(balanceResponse.result)}`);
      const rawInjBalance = balanceResponse.result?.amount || "0";
      
      // Check if the amount is already in human-readable format
      const isHumanReadable = rawInjBalance.includes('.');
      
      // Convert balance to human-readable format
      let injBalance = 0;
      if (isHumanReadable) {
        injBalance = parseFloat(rawInjBalance);
      } else {
        // For INJ, divide by 10^18
        injBalance = parseFloat(rawInjBalance) / 1e18;
      }
      
      elizaLogger.info(`Current INJ balance: ${injBalance}`);
      
      // Check if there are sufficient funds (including a buffer for gas)
      const gasBuffer = 0.001; // Buffer for gas fees
      if (injBalance < amount + gasBuffer) {
        if (callback) {
          callback({
            text: `You don't have enough INJ to complete this transfer. Your current balance is ${injBalance.toFixed(6)} INJ, and you need at least ${(amount + gasBuffer).toFixed(6)} INJ (including gas fees).`
          });
        }
        return false;
      }
      
      // Convert amount to raw amount (multiply by 10^18 for INJ)
      const rawAmount = convertToRawAmount(amount, 18);
      elizaLogger.info(`Converted amount: ${amount} INJ to raw amount: ${rawAmount}`);
      
      // Prepare and send the transaction
      const transferResponse = await client.msgSend({
        amount: {
          denom: "inj",
          amount: rawAmount
        },
        srcInjectiveAddress: sourceAddress,
        dstInjectiveAddress: destinationAddress
      });
      
      if (!transferResponse.success) {
        elizaLogger.error(`Error sending INJ: ${transferResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while sending INJ: ${transferResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      // Transaction was successful
      const txHash = transferResponse.result?.txHash || "unknown";
      elizaLogger.info(`INJ transfer successful. Transaction hash: ${txHash}`);
      
      // Format the response
      let responseText = `## INJ Transfer Successful\n\n`;
      responseText += `I've successfully sent **${amount} INJ** from your wallet to \`${destinationAddress}\`.\n\n`;
      responseText += `**Transaction Details:**\n`;
      responseText += `- **Amount:** ${amount} INJ\n`;
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
            amount: amount,
            sourceAddress: sourceAddress,
            destinationAddress: destinationAddress,
            txHash: txHash
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in TRANSFER_INJ handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while processing your INJ transfer. Please try again later."
        });
      }
      return false;
    }
  }
}; 