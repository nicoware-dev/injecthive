import { Action, ActionExample, Memory, State, HandlerCallback, IAgentRuntime } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { InjectiveSDKClient } from "../../client";

// Example for getting wallet info
const walletInfoExample: ActionExample = {
  user: "user",
  content: {
    text: "Get info for wallet inj1caugpcrnxvh8k8us32294lsd3498x5qjwfg8rs",
  }
};

// Example for getting network stats
const networkStatsExample: ActionExample = {
  user: "user",
  content: {
    text: "Show me network stats",
  }
};

// Example for getting latest blocks
const latestBlocksExample: ActionExample = {
  user: "user",
  content: {
    text: "Show me the latest blocks",
  }
};

// Example for getting latest transactions
const latestTransactionsExample: ActionExample = {
  user: "user",
  content: {
    text: "Show me the latest transactions",
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
 * Helper function to format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Fallback data for when API calls fail
const FALLBACK_BLOCKS = [
  {
    height: "10728942",
    time: new Date().toISOString(),
    hash: "0x3a2f1c8b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
    proposer: "injvaloper1...",
    txCount: 15
  },
  {
    height: "10728941",
    time: new Date(Date.now() - 5000).toISOString(),
    hash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
    proposer: "injvaloper2...",
    txCount: 8
  },
  {
    height: "10728940",
    time: new Date(Date.now() - 10000).toISOString(),
    hash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
    proposer: "injvaloper3...",
    txCount: 12
  }
];

const FALLBACK_TRANSACTIONS = [
  {
    txType: "MsgSend",
    blockTimestamp: new Date().toISOString(),
    hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    blockNumber: "10728942",
    messages: [
      { key: "sender", value: "inj1..." },
      { key: "recipient", value: "inj2..." },
      { key: "amount", value: "1.5 INJ" }
    ]
  },
  {
    txType: "MsgDelegate",
    blockTimestamp: new Date(Date.now() - 60000).toISOString(),
    hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    blockNumber: "10728941",
    messages: [
      { key: "delegator", value: "inj3..." },
      { key: "validator", value: "injvaloper1..." },
      { key: "amount", value: "10 INJ" }
    ]
  }
];

/**
 * Action to get wallet information
 */
export const GetWalletInfoAction: Action = {
  name: "GET_WALLET_INFO",
  description: "Get information about a specific Injective wallet address",
  similes: [
    "GET_WALLET_INFO",
    "SHOW_WALLET_INFO",
    "DISPLAY_WALLET_INFO",
    "VIEW_WALLET_INFO",
    "CHECK_WALLET_INFO",
    "FETCH_WALLET_INFO",
    "GET_ACCOUNT_INFO",
    "SHOW_ACCOUNT_INFO",
    "DISPLAY_ACCOUNT_INFO",
    "VIEW_ACCOUNT_INFO",
    "CHECK_ACCOUNT_INFO",
    "FETCH_ACCOUNT_INFO",
    "GET_ADDRESS_INFO",
    "SHOW_ADDRESS_INFO",
    "DISPLAY_ADDRESS_INFO",
    "VIEW_ADDRESS_INFO",
    "CHECK_ADDRESS_INFO",
    "FETCH_ADDRESS_INFO"
  ],
  examples: [[walletInfoExample]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info(`Explorer action: GET_WALLET_INFO triggered`);
      
      // Extract wallet address from message
      const walletAddress = extractWalletAddress(message.content.text);
      
      if (!walletAddress) {
        if (callback) {
          callback({
            text: "I couldn't find a valid Injective wallet address in your message. Please provide an address in the format 'inj1...'."
          });
        }
        return false;
      }
      
      elizaLogger.info(`Getting info for wallet address: ${walletAddress}`);
      
      // Initialize the client
      const client = new InjectiveSDKClient(
        process.env.INJECTIVE_NETWORK as "Mainnet" | "Testnet" | "Devnet1" | "Devnet2" | "Devnet" | "Local" || "Mainnet",
        process.env.INJECTIVE_PRIVATE_KEY || "",
        undefined,
        process.env.INJECTIVE_PUBLIC_KEY
      );
      
      // Get account details
      const accountResponse = await client.getAccountDetails({ address: walletAddress });
      
      // Log account details response status
      elizaLogger.info(`Account details response status: ${accountResponse.success ? 'Success' : 'Failed'}`);
      if (!accountResponse.success) {
        elizaLogger.error(`Error fetching account details: ${accountResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while retrieving information for wallet ${walletAddress}: ${accountResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      // Get account transactions
      const txResponse = await client.getAccountTx({ 
        address: walletAddress,
        limit: 5,
        skip: 0
      });
      
      // Log transaction response status
      elizaLogger.info(`Transaction response status: ${txResponse.success ? 'Success' : 'Failed'}`);
      if (txResponse.success && txResponse.result?.txs) {
        elizaLogger.info(`Retrieved ${txResponse.result.txs.length} transactions`);
      }
      
      // Get INJ balance using getBankBalance
      const balanceResponse = await client.getBankBalance({ 
        denom: "inj",
        address: walletAddress
      });
      
      // Log balance response details for debugging
      elizaLogger.info(`Balance response status: ${balanceResponse.success ? 'Success' : 'Failed'}`);
      if (balanceResponse.success) {
        elizaLogger.info(`Raw balance data from getBankBalance: ${JSON.stringify(balanceResponse.result || {})}`);
      } else if (balanceResponse.error) {
        elizaLogger.error(`Error fetching balance: ${balanceResponse.error.message}`);
      }
      
      // VERIFICATION STEP: Get balance using a different method (getAccountPortfolio)
      // This helps us verify if the first method is returning correct data
      let verificationBalance = null;
      try {
        const portfolioResponse = await client.getAccountPortfolio({ 
          address: walletAddress
        });
        
        elizaLogger.info(`Portfolio response status: ${portfolioResponse.success ? 'Success' : 'Failed'}`);
        if (portfolioResponse.success && portfolioResponse.result) {
          elizaLogger.info(`Raw portfolio data: ${JSON.stringify(portfolioResponse.result)}`);
          
          // Try to extract INJ balance from portfolio
          if (portfolioResponse.result.bankBalancesList && portfolioResponse.result.bankBalancesList.length > 0) {
            const injBalance = portfolioResponse.result.bankBalancesList.find(
              (balance: any) => balance.denom === "inj"
            );
            
            if (injBalance) {
              verificationBalance = injBalance.amount;
              elizaLogger.info(`Verification balance from portfolio: ${verificationBalance}`);
            } else {
              elizaLogger.info(`No INJ balance found in portfolio data`);
            }
          } else {
            elizaLogger.info(`No bank balances found in portfolio data`);
          }
        }
      } catch (error) {
        elizaLogger.error(`Error fetching portfolio for verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Format the response
      let responseText = `## Wallet Information for \`${walletAddress}\`\n\n`;
      
      // Account details
      if (accountResponse.result?.account) {
        const account = accountResponse.result.account;
        responseText += `**Account Type:** ${account.type || "Standard"}\n`;
        responseText += `**Account Number:** ${account.accountNumber || "N/A"}\n`;
        responseText += `**Sequence:** ${account.sequence || "N/A"}\n\n`;
      }
      
      // Balance information
      let balance = 0;
      let balanceSource = "primary";
      
      if (balanceResponse.success && balanceResponse.result) {
        const amount = balanceResponse.result.amount || "0";
        const denom = balanceResponse.result.denom || "inj";
        
        elizaLogger.info(`Processing balance amount: ${amount}, denom: ${denom}`);
        
        // Check if amount has decimal point (human readable)
        const isHumanReadable = amount.includes('.');
        
        try {
          if (isHumanReadable) {
            balance = parseFloat(amount);
            elizaLogger.info(`Parsed human readable amount: ${balance}`);
          } else {
            // For raw amounts, divide by the appropriate power based on the denomination
            const divisor = denom === "inj" ? 1e18 : 1e6; // Most tokens use 6 decimals, INJ uses 18
            balance = parseFloat(amount) / divisor;
            elizaLogger.info(`Converted raw amount: ${amount} / ${divisor} = ${balance}`);
          }
          
          // Verify the balance is a valid number
          if (isNaN(balance)) {
            elizaLogger.warn(`Balance calculation resulted in NaN, defaulting to 0`);
            balance = 0;
          }
          
          // Double-check if balance is extremely small (could be a conversion error)
          if (balance > 0 && balance < 1e-10) {
            elizaLogger.warn(`Balance is suspiciously small (${balance}), might be a conversion error`);
          }
          
          // VERIFICATION CHECK: Compare with verification balance if available
          if (verificationBalance !== null) {
            const verificationAmount = parseFloat(verificationBalance);
            if (!isNaN(verificationAmount)) {
              // If verification balance is significantly different, use it instead
              if (Math.abs(balance - verificationAmount) > 0.0001) {
                elizaLogger.warn(`Balance discrepancy detected! Primary: ${balance}, Verification: ${verificationAmount}`);
                
                // Check if the verification balance is from portfolio and in raw format
                if (verificationBalance.length > 10) {
                  // This is likely a raw amount (e.g. 674663867000000000)
                  const rawVerificationAmount = parseFloat(verificationBalance) / 1e18;
                  elizaLogger.info(`Converting raw verification amount: ${verificationBalance} to ${rawVerificationAmount}`);
                  balance = rawVerificationAmount;
                } else {
                  balance = verificationAmount;
                }
                
                balanceSource = "verification";
              } else {
                elizaLogger.info(`Balance verified: Primary and verification balances match`);
              }
            }
          }
          
          // ADDITIONAL VERIFICATION: Check if account is new/empty
          if (accountResponse.result?.account?.accountNumber === "0" || 
              !accountResponse.result?.account?.accountNumber) {
            elizaLogger.info(`Account appears to be new or empty, but will still check balance data`);
            // Don't force balance to 0 here, just log it as a hint
          }
          
          // FINAL VERIFICATION: Check transaction history
          if (txResponse.success && (!txResponse.result?.txs || txResponse.result.txs.length === 0)) {
            elizaLogger.info(`No transaction history found, this might indicate a zero balance`);
            // We don't force balance to 0 here, just log it as a hint
          }
          
        } catch (error) {
          elizaLogger.error(`Error parsing balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
          balance = 0;
        }
      } else {
        elizaLogger.info(`No balance data available, defaulting to 0`);
      }
      
      // Log final balance decision
      elizaLogger.info(`Final balance decision: ${balance} INJ (source: ${balanceSource})`);
      
      // Format the balance with appropriate precision
      responseText += `**INJ Balance:** ${balance.toLocaleString(undefined, {maximumFractionDigits: 6})} INJ\n\n`;
      
      // Check for other token balances in portfolio data
      try {
        const portfolioResponse = await client.getAccountPortfolio({ 
          address: walletAddress
        });
        
        if (portfolioResponse && portfolioResponse.success && portfolioResponse.result && 
            portfolioResponse.result.bankBalancesList && portfolioResponse.result.bankBalancesList.length > 0) {
          
          // Look for common tokens like USDT
          const usdtDenom = "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7";
          const usdtBalance = portfolioResponse.result.bankBalancesList.find(
            (balance: any) => balance.denom === usdtDenom
          );
          
          if (usdtBalance) {
            // USDT has 6 decimals
            const rawUsdtAmount = usdtBalance.amount;
            const usdtAmount = parseFloat(rawUsdtAmount) / 1e6;
            
            if (usdtAmount > 0) {
              responseText += `**USDT Balance:** ${usdtAmount.toLocaleString(undefined, {maximumFractionDigits: 6})} USDT\n\n`;
            }
          }
          
          // Add other token balances here if needed
        }
      } catch (error) {
        elizaLogger.error(`Error fetching additional token balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue without additional token balances
      }
      
      // Recent transactions
      if (txResponse.success && txResponse.result?.txs) {
        responseText += `### Recent Transactions\n\n`;
        
        if (txResponse.result.txs.length === 0) {
          responseText += "No recent transactions found.\n";
        } else {
          for (const tx of txResponse.result.txs.slice(0, 5)) {
            const date = tx.blockTimestamp ? new Date(tx.blockTimestamp).toLocaleString() : "Unknown";
            responseText += `- **${tx.txType || "Transaction"}** (${date})\n`;
            responseText += `  Hash: \`${tx.hash || "Unknown"}\`\n`;
            responseText += `  Block: ${tx.blockNumber || "Unknown"}\n\n`;
          }
        }
      }
      
      // Add explorer links
      responseText += `### Explorer Links\n\n`;
      responseText += `- [View on Injective Explorer](https://explorer.injective.network/account/${walletAddress})\n`;
      responseText += `- [View on Mintscan](https://www.mintscan.io/injective/address/${walletAddress})\n`;
      
      if (callback) {
        callback({
          text: responseText,
          content: {
            address: walletAddress,
            accountDetails: accountResponse.result?.account,
            balance: balance,
            recentTransactions: txResponse.result?.txs
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in GET_WALLET_INFO handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving wallet information. Please try again later."
        });
      }
      return false;
    }
  }
};

/**
 * Action to get network statistics
 */
export const GetNetworkStatsAction: Action = {
  name: "GET_NETWORK_STATS",
  description: "Get statistics about the Injective network",
  similes: [
    "GET_NETWORK_STATS",
    "SHOW_NETWORK_STATS",
    "DISPLAY_NETWORK_STATS",
    "VIEW_NETWORK_STATS",
    "CHECK_NETWORK_STATS",
    "FETCH_NETWORK_STATS",
    "GET_CHAIN_STATS",
    "SHOW_CHAIN_STATS",
    "DISPLAY_CHAIN_STATS",
    "VIEW_CHAIN_STATS",
    "CHECK_CHAIN_STATS",
    "FETCH_CHAIN_STATS",
    "GET_BLOCKCHAIN_STATS",
    "SHOW_BLOCKCHAIN_STATS",
    "DISPLAY_BLOCKCHAIN_STATS",
    "VIEW_BLOCKCHAIN_STATS",
    "CHECK_BLOCKCHAIN_STATS",
    "FETCH_BLOCKCHAIN_STATS"
  ],
  examples: [[networkStatsExample]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info(`Explorer action: GET_NETWORK_STATS triggered`);
      
      // Initialize the client
      const client = new InjectiveSDKClient(
        process.env.INJECTIVE_NETWORK as "Mainnet" | "Testnet" | "Devnet1" | "Devnet2" | "Devnet" | "Local" || "Mainnet",
        process.env.INJECTIVE_PRIVATE_KEY || "",
        undefined,
        process.env.INJECTIVE_PUBLIC_KEY
      );
      
      // Get explorer stats - this method doesn't take parameters
      const statsResponse = await client.getExplorerStats();
      
      if (!statsResponse.success) {
        elizaLogger.error(`Error fetching explorer stats: ${statsResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while retrieving network statistics: ${statsResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      const stats = statsResponse.result;
      
      // Format the response
      let responseText = `## Injective Network Statistics\n\n`;
      
      if (stats) {
        // General stats
        responseText += `### General Statistics\n\n`;
        responseText += `- **Total Assets:** ${parseInt(stats.assets || "0").toLocaleString()}\n`;
        responseText += `- **Total Addresses:** ${parseInt(stats.addresses || "0").toLocaleString()}\n`;
        responseText += `- **Total Transactions:** ${parseInt(stats.txsTotal || "0").toLocaleString()}\n`;
        responseText += `- **INJ Supply:** ${(parseInt(stats.injSupply || "0") / 1e18).toLocaleString()} INJ\n\n`;
        
        // Recent activity
        responseText += `### Recent Activity\n\n`;
        responseText += `- **Transactions (30 days):** ${parseInt(stats.txsInPast30Days || "0").toLocaleString()}\n`;
        responseText += `- **Transactions (24 hours):** ${parseInt(stats.txsInPast24Hours || "0").toLocaleString()}\n`;
        responseText += `- **Blocks (24 hours):** ${parseInt(stats.blockCountInPast24Hours || "0").toLocaleString()}\n`;
        responseText += `- **TPS (24 hours):** ${parseFloat(stats.txsPerSecondInPast24Hours || "0").toFixed(2)}\n`;
        responseText += `- **TPS (last 100 blocks):** ${parseFloat(stats.txsPerSecondInPast100Blocks || "0").toFixed(2)}\n\n`;
      } else {
        responseText += "No network statistics available at this time.\n\n";
      }
      
      // Add explorer links
      responseText += `### Explorer Links\n\n`;
      responseText += `- [Injective Explorer](https://explorer.injective.network/)\n`;
      responseText += `- [Mintscan](https://www.mintscan.io/injective)\n`;
      
      if (callback) {
        callback({
          text: responseText,
          content: stats
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in GET_NETWORK_STATS handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving network statistics. Please try again later."
        });
      }
      return false;
    }
  }
};

/**
 * Action to get latest blocks
 */
export const GetLatestBlocksAction: Action = {
  name: "GET_LATEST_BLOCKS",
  description: "Get the latest blocks on the Injective network",
  similes: [
    "GET_LATEST_BLOCKS",
    "SHOW_LATEST_BLOCKS",
    "DISPLAY_LATEST_BLOCKS",
    "VIEW_LATEST_BLOCKS",
    "CHECK_LATEST_BLOCKS",
    "FETCH_LATEST_BLOCKS",
    "GET_RECENT_BLOCKS",
    "SHOW_RECENT_BLOCKS",
    "DISPLAY_RECENT_BLOCKS",
    "VIEW_RECENT_BLOCKS",
    "CHECK_RECENT_BLOCKS",
    "FETCH_RECENT_BLOCKS"
  ],
  examples: [[latestBlocksExample]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info(`Explorer action: GET_LATEST_BLOCKS triggered`);
      
      // Initialize the client
      const client = new InjectiveSDKClient(
        process.env.INJECTIVE_NETWORK as "Mainnet" | "Testnet" | "Devnet1" | "Devnet2" | "Devnet" | "Local" || "Mainnet",
        process.env.INJECTIVE_PRIVATE_KEY || "",
        undefined,
        process.env.INJECTIVE_PUBLIC_KEY
      );
      
      // Get latest blocks
      elizaLogger.info(`Fetching latest blocks with limit: 10, skip: 0`);
      const blocksResponse = await client.getBlocks({
        limit: 10,
        skip: 0
      });

      // Log only essential information, not the entire response
      elizaLogger.info(`Blocks response status: ${blocksResponse.success ? 'Success' : 'Failed'}`);
      if (blocksResponse.success && blocksResponse.result?.blocks) {
        elizaLogger.info(`Retrieved ${blocksResponse.result.blocks.length} blocks`);
      } else if (blocksResponse.error) {
        elizaLogger.error(`Error fetching blocks: ${blocksResponse.error.message}`);
      }
      
      if (!blocksResponse.success) {
        elizaLogger.error(`Error fetching blocks: ${blocksResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while retrieving the latest blocks: ${blocksResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      const blocks = blocksResponse.result?.blocks || [];
      
      // Format the response
      let responseText = `## Latest Blocks on Injective\n\n`;
      
      if (!blocks || blocks.length === 0) {
        responseText += "No blocks available from the API at this time. This could be due to an API limitation or temporary network issue.\n\n";
        responseText += "Here are some sample blocks for reference:\n\n";
        
        // Use fallback data
        for (const block of FALLBACK_BLOCKS) {
          const date = block.time ? new Date(block.time).toLocaleString() : "Unknown";
          responseText += `### Block ${block.height || "Unknown"}\n\n`;
          responseText += `- **Time:** ${date}\n`;
          responseText += `- **Hash:** \`${block.hash || "Unknown"}\`\n`;
          responseText += `- **Proposer:** ${block.proposer || "Unknown"}\n`;
          responseText += `- **Transactions:** ${block.txCount || 0}\n\n`;
        }
        
        responseText += "*Note: These are sample blocks for demonstration purposes.*\n\n";
      } else {
        for (const block of blocks) {
          const date = block.time ? new Date(block.time).toLocaleString() : "Unknown";
          responseText += `### Block ${block.height || "Unknown"}\n\n`;
          responseText += `- **Time:** ${date}\n`;
          responseText += `- **Hash:** \`${block.hash || "Unknown"}\`\n`;
          responseText += `- **Proposer:** ${block.proposer || "Unknown"}\n`;
          responseText += `- **Transactions:** ${block.numTxs || 0}\n\n`;
        }
      }
      
      // Add explorer links
      responseText += `### Explorer Links\n\n`;
      responseText += `- [View Blocks on Injective Explorer](https://explorer.injective.network/blocks)\n`;
      responseText += `- [View Blocks on Mintscan](https://www.mintscan.io/injective/blocks)\n`;
      
      if (callback) {
        callback({
          text: responseText,
          content: {
            blocks: blocks
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in GET_LATEST_BLOCKS handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving the latest blocks. Please try again later."
        });
      }
      return false;
    }
  }
};

/**
 * Action to get latest transactions
 */
export const GetLatestTransactionsAction: Action = {
  name: "GET_LATEST_TRANSACTIONS",
  description: "Get the latest transactions on the Injective network",
  similes: [
    "GET_LATEST_TRANSACTIONS",
    "SHOW_LATEST_TRANSACTIONS",
    "DISPLAY_LATEST_TRANSACTIONS",
    "VIEW_LATEST_TRANSACTIONS",
    "CHECK_LATEST_TRANSACTIONS",
    "FETCH_LATEST_TRANSACTIONS",
    "GET_RECENT_TRANSACTIONS",
    "SHOW_RECENT_TRANSACTIONS",
    "DISPLAY_RECENT_TRANSACTIONS",
    "VIEW_RECENT_TRANSACTIONS",
    "CHECK_RECENT_TRANSACTIONS",
    "FETCH_RECENT_TRANSACTIONS"
  ],
  examples: [[latestTransactionsExample]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info(`Explorer action: GET_LATEST_TRANSACTIONS triggered`);
      
      // Initialize the client
      const client = new InjectiveSDKClient(
        process.env.INJECTIVE_NETWORK as "Mainnet" | "Testnet" | "Devnet1" | "Devnet2" | "Devnet" | "Local" || "Mainnet",
        process.env.INJECTIVE_PRIVATE_KEY || "",
        undefined,
        process.env.INJECTIVE_PUBLIC_KEY
      );
      
      // Get latest transactions
      elizaLogger.info(`Fetching latest transactions with limit: 10, skip: 0`);
      const txsResponse = await client.getTxs({
        limit: 10,
        skip: 0
      });

      // Log only essential information, not the entire response
      elizaLogger.info(`Transactions response status: ${txsResponse.success ? 'Success' : 'Failed'}`);
      if (txsResponse.success && txsResponse.result?.txs) {
        elizaLogger.info(`Retrieved ${txsResponse.result.txs.length} transactions`);
      } else if (txsResponse.error) {
        elizaLogger.error(`Error fetching transactions: ${txsResponse.error.message}`);
      }
      
      if (!txsResponse.success) {
        elizaLogger.error(`Error fetching transactions: ${txsResponse.error?.message}`);
        if (callback) {
          callback({
            text: `I encountered an error while retrieving the latest transactions: ${txsResponse.error?.message || "Unknown error"}`
          });
        }
        return false;
      }
      
      const transactions = txsResponse.result?.txs || [];
      
      // Format the response
      let responseText = `## Latest Transactions on Injective\n\n`;
      
      if (!transactions || transactions.length === 0) {
        responseText += "No transactions available from the API at this time. This could be due to an API limitation or temporary network issue.\n\n";
        responseText += "Here are some sample transactions for reference:\n\n";
        
        // Use fallback data
        for (const tx of FALLBACK_TRANSACTIONS) {
          const date = tx.blockTimestamp ? new Date(tx.blockTimestamp).toLocaleString() : "Unknown";
          responseText += `### ${tx.txType || "Transaction"}\n\n`;
          responseText += `- **Time:** ${date}\n`;
          responseText += `- **Hash:** \`${tx.hash || "Unknown"}\`\n`;
          responseText += `- **Block:** ${tx.blockNumber || "Unknown"}\n`;
          if (tx.messages && tx.messages.length > 0) {
            responseText += `- **Details:**\n`;
            for (const msg of tx.messages) {
              if (msg.key && msg.value) {
                responseText += `  - ${msg.key}: ${msg.value}\n`;
              }
            }
          }
          responseText += `\n`;
        }
        
        responseText += "*Note: These are sample transactions for demonstration purposes.*\n\n";
      } else {
        for (const tx of transactions) {
          const date = tx.blockTimestamp ? new Date(tx.blockTimestamp).toLocaleString() : "Unknown";
          responseText += `### ${tx.txType || "Transaction"}\n\n`;
          responseText += `- **Time:** ${date}\n`;
          responseText += `- **Hash:** \`${tx.hash || "Unknown"}\`\n`;
          responseText += `- **Block:** ${tx.blockNumber || "Unknown"}\n`;
          
          // Only include a limited subset of message details to avoid verbose output
          if (tx.messages && tx.messages.length > 0) {
            responseText += `- **Details:**\n`;
            // Only show the first 3 messages to avoid overwhelming the user
            const messagesToShow = tx.messages.slice(0, 3);
            for (const msg of messagesToShow) {
              if (msg.key && msg.value) {
                // Truncate very long values
                const value = typeof msg.value === 'string' && msg.value.length > 50 
                  ? `${msg.value.substring(0, 50)}...` 
                  : msg.value;
                responseText += `  - ${msg.key}: ${value}\n`;
              }
            }
            if (tx.messages.length > 3) {
              responseText += `  - *and ${tx.messages.length - 3} more message fields...*\n`;
            }
          }
          responseText += `\n`;
        }
      }
      
      // Add explorer links
      responseText += `### Explorer Links\n\n`;
      responseText += `- [View Transactions on Injective Explorer](https://explorer.injective.network/txs)\n`;
      responseText += `- [View Transactions on Mintscan](https://www.mintscan.io/injective/transactions)\n`;
      
      if (callback) {
        callback({
          text: responseText,
          content: {
            transactions: transactions
          }
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error(`Error in GET_LATEST_TRANSACTIONS handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving the latest transactions. Please try again later."
        });
      }
      return false;
    }
  }
};

// Export all explorer actions
export const ExplorerActions = [
  GetWalletInfoAction,
  GetNetworkStatsAction,
  GetLatestBlocksAction,
  GetLatestTransactionsAction
]; 