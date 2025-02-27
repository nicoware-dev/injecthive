import type { Action, Memory } from "@elizaos/core";
import {
    createWalletClient,
    http,
    parseEther,
    type SendTransactionParameters,
    encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { confluxESpace } from "viem/chains";

const SHUI_CONTRACT_ADDRESS = "0x1858a8d367e69cd9E23d0Da4169885a47F05f1bE";

// Minimal ABI for Shui functions
const SHUI_ABI = [
    {
        "inputs": [],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "shares",
                "type": "uint256"
            }
        ],
        "name": "redeem",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

interface StakeEntities {
    amount?: string | number;
}

export const shuiStake: Action = {
    name: "SHUI_STAKE_CFX",
    description: "Stake/Deposit CFX into Shui liquid staking protocol to receive sCFX tokens",
    examples: [
        [
            {
                user: "user1",
                content: {
                    text: "Stake 100 CFX on Shui",
                    entities: {
                        amount: "100",
                    },
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The staking transaction has been initiated. You will receive sCFX tokens once complete.",
                },
            },
        ],
    ],
    handler: async (runtime, message: Memory, state, options, callback) => {
        // Extract entities from the message - only match stake/deposit keywords
        const content = message.content?.text?.match(
            /(?:stake|deposit) ([\d.]+) CFX (?:on|in|into) Shui/i
        );
        if (!content) {
            callback?.({
                text: "Could not parse stake details. Please use format: Stake <amount> CFX on Shui",
            });
            return false;
        }

        const amount = content[1];

        try {
            const settings = Object.fromEntries(
                Object.entries(process.env).filter(([key]) =>
                    key.startsWith("CONFLUX_")
                )
            );

            const privateKey = settings.CONFLUX_ESPACE_PRIVATE_KEY;
            if (!privateKey) {
                callback?.({
                    text: "eSpace wallet not configured. Please set CONFLUX_ESPACE_PRIVATE_KEY.",
                });
                return false;
            }

            // Send initial confirmation without hash
            callback?.({
                text: `The staking transaction of ${amount} CFX on Shui protocol has been initiated. You will receive a confirmation once the transaction is complete.`,
            });

            const rpcUrl =
                settings.CONFLUX_ESPACE_RPC_URL || "https://evm.confluxrpc.com";
            const account = privateKeyToAccount(privateKey as `0x${string}`);

            const client = createWalletClient({
                account,
                chain: confluxESpace,
                transport: http(rpcUrl),
            });

            // Encode deposit function call
            const data = encodeFunctionData({
                abi: SHUI_ABI,
                functionName: "deposit",
            });

            // Cast transaction parameters to unknown first to bypass type checking
            const txParams = {
                to: SHUI_CONTRACT_ADDRESS as `0x${string}`,
                value: parseEther(amount),
                data,
                type: "legacy" as const,
                gasLimit: 300000n,
            } as unknown as SendTransactionParameters<typeof confluxESpace>;

            const hash = await client.sendTransaction(txParams);

            // Send only the actual transaction hash
            callback?.({
                text: `${amount} CFX staked on Shui: ${hash}`,
                content: { hash },
            });
            return true;
        } catch (error) {
            console.error("Failed to stake CFX on Shui:", error);
            callback?.({
                text: `Failed to stake ${amount} CFX on Shui: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    validate: async () => true,
    similes: [
        "like depositing CFX into a liquid staking pool",
        "like converting CFX into liquid staking tokens",
        "like participating in Shui's liquid staking protocol",
    ],
};

export const shuiUnstake: Action = {
    name: "SHUI_UNSTAKE_SCFX",
    description: "Unstake/Redeem sCFX tokens from Shui liquid staking protocol to start the withdrawal process",
    examples: [
        [
            {
                user: "user1",
                content: {
                    text: "Unstake 100 CFX from Shui",
                    entities: {
                        amount: "100",
                    },
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The unstaking transaction has been initiated. After completion, you can claim your CFX.",
                },
            },
        ],
    ],
    handler: async (runtime, message: Memory, state, options, callback) => {
        // Extract entities from the message - match both CFX and sCFX for better UX
        const content = message.content?.text?.match(
            /(?:unstake|redeem) ([\d.]+) (?:CFX|sCFX|staked CFX) (?:from|on) Shui/i
        );
        if (!content) {
            callback?.({
                text: "Could not parse unstake details. Please use format: Unstake <amount> CFX from Shui",
            });
            return false;
        }

        const amount = content[1];

        try {
            const settings = Object.fromEntries(
                Object.entries(process.env).filter(([key]) =>
                    key.startsWith("CONFLUX_")
                )
            );

            const privateKey = settings.CONFLUX_ESPACE_PRIVATE_KEY;
            if (!privateKey) {
                callback?.({
                    text: "eSpace wallet not configured. Please set CONFLUX_ESPACE_PRIVATE_KEY.",
                });
                return false;
            }

            // Send initial confirmation without hash
            callback?.({
                text: `The unstaking transaction of ${amount} CFX from Shui protocol has been initiated. You will receive a confirmation once the transaction is complete.`,
            });

            const rpcUrl =
                settings.CONFLUX_ESPACE_RPC_URL || "https://evm.confluxrpc.com";
            const account = privateKeyToAccount(privateKey as `0x${string}`);

            const client = createWalletClient({
                account,
                chain: confluxESpace,
                transport: http(rpcUrl),
            });

            // Encode redeem function call
            const data = encodeFunctionData({
                abi: SHUI_ABI,
                functionName: "redeem",
                args: [parseEther(amount)],
            });

            // Cast transaction parameters to unknown first to bypass type checking
            const txParams = {
                to: SHUI_CONTRACT_ADDRESS as `0x${string}`,
                data,
                type: "legacy" as const,
            } as unknown as SendTransactionParameters<typeof confluxESpace>;

            const hash = await client.sendTransaction(txParams);

            // Send only the actual transaction hash
            callback?.({
                text: `${amount} CFX unstaked from Shui: ${hash}`,
                content: { hash },
            });
            return true;
        } catch (error) {
            console.error("Failed to unstake from Shui:", error);
            callback?.({
                text: `Failed to unstake ${amount} CFX from Shui: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    validate: async () => true,
    similes: [
        "like withdrawing CFX from a liquid staking pool",
        "like converting sCFX back to CFX",
        "like exiting from Shui's liquid staking protocol",
    ],
};

export const shuiClaim: Action = {
    name: "SHUI_CLAIM_UNSTAKED_CFX",
    description: "Claim/Withdraw previously unstaked CFX from Shui liquid staking protocol",
    examples: [
        [
            {
                user: "user1",
                content: {
                    text: "Claim 100 CFX from Shui",
                    entities: {
                        amount: "100",
                    },
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The claim transaction has been initiated. You will receive your unstaked CFX once complete.",
                },
            },
        ],
    ],
    handler: async (runtime, message: Memory, state, options, callback) => {
        // Extract entities from the message - only match claim/withdraw keywords
        const content = message.content?.text?.match(
            /(?:claim|withdraw) ([\d.]+) (?:CFX|unstaked CFX) from Shui/i
        );
        if (!content) {
            callback?.({
                text: "Could not parse claim details. Please use format: Claim <amount> CFX from Shui",
            });
            return false;
        }

        const amount = content[1];

        try {
            const settings = Object.fromEntries(
                Object.entries(process.env).filter(([key]) =>
                    key.startsWith("CONFLUX_")
                )
            );

            const privateKey = settings.CONFLUX_ESPACE_PRIVATE_KEY;
            if (!privateKey) {
                callback?.({
                    text: "eSpace wallet not configured. Please set CONFLUX_ESPACE_PRIVATE_KEY.",
                });
                return false;
            }

            // Send initial confirmation without hash
            callback?.({
                text: `The claim transaction of ${amount} CFX from Shui protocol has been initiated. You will receive a confirmation once the transaction is complete.`,
            });

            const rpcUrl =
                settings.CONFLUX_ESPACE_RPC_URL || "https://evm.confluxrpc.com";
            const account = privateKeyToAccount(privateKey as `0x${string}`);

            const client = createWalletClient({
                account,
                chain: confluxESpace,
                transport: http(rpcUrl),
            });

            // Encode withdraw function call
            const data = encodeFunctionData({
                abi: SHUI_ABI,
                functionName: "withdraw",
                args: [parseEther(amount)],
            });

            // Cast transaction parameters to unknown first to bypass type checking
            const txParams = {
                to: SHUI_CONTRACT_ADDRESS as `0x${string}`,
                data,
                type: "legacy" as const,
            } as unknown as SendTransactionParameters<typeof confluxESpace>;

            const hash = await client.sendTransaction(txParams);

            // Send only the actual transaction hash
            callback?.({
                text: `${amount} CFX claimed from Shui: ${hash}`,
                content: { hash },
            });
            return true;
        } catch (error) {
            console.error("Failed to claim from Shui:", error);
            callback?.({
                text: `Failed to claim ${amount} CFX from Shui: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    validate: async () => true,
    similes: [
        "like collecting unstaked CFX from Shui",
        "like finalizing a withdrawal from Shui",
        "like completing the unstaking process on Shui",
    ],
};
