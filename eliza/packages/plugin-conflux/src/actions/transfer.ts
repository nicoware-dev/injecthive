import type { Action, ActionExample, Memory } from "@elizaos/core";
import { createPublicClient, createWalletClient, http, parseCFX } from "cive";
import { privateKeyToAccount } from "cive/accounts";
import { mainnet, testnet } from "cive/chains";

interface TransferEntities {
    amount?: string | number;
    to?: string;
}

export const transfer: Action = {
    name: "SEND_CFX_CORE",
    description: "Send CFX on Conflux Core network",
    examples: [
        [
            {
                user: "user1",
                content: {
                    text: "Send 0.1 CFX to cfx:aap... on Core",
                    entities: {
                        amount: "0.1",
                        to: "cfx:aap61confz1f3hvvz0642yjj8rauc9pg0r663850f9",
                    },
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The transaction has been initiated. You will receive a confirmation once the transaction is complete.",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "0.1 CFX sent to cfx:aap61confz1f3hvvz0642yjj8rauc9pg0r663850f9: {hash}",
                },
            },
        ],
    ],
    handler: async (runtime, message: Memory, state, options, callback) => {
        // Extract entities from the message
        const content = message.content?.text?.match(
            /Send ([\d.]+) CFX to (cfx:[a-z0-9]+) on Core/i
        );
        if (!content) {
            callback?.({
                text: "Could not parse transfer details. Please use format: Send <amount> CFX to <address> on Core",
            });
            return false;
        }

        const amount = content[1];
        const to = content[2];

        // Validate address - must be a cfx: prefixed address
        if (!to.startsWith("cfx:")) {
            callback?.({
                text: `Invalid Core address format. Address must start with 'cfx:'.`,
            });
            return false;
        }

        try {
            const settings = Object.fromEntries(
                Object.entries(process.env).filter(([key]) =>
                    key.startsWith("CONFLUX_")
                )
            );

            const privateKey = settings.CONFLUX_CORE_PRIVATE_KEY;
            if (!privateKey) {
                callback?.({
                    text: "Core wallet not configured. Please set CONFLUX_CORE_PRIVATE_KEY.",
                });
                return false;
            }

            // Send initial confirmation without hash
            callback?.({
                text: `The transaction of ${amount} CFX to the address ${to} on the Conflux Core network has been initiated. You will receive a confirmation once the transaction is complete.`,
            });

            const rpcUrl =
                settings.CONFLUX_CORE_SPACE_RPC_URL ||
                "https://main.confluxrpc.com";

            // Determine network from RPC URL or address prefix
            const isTestnet =
                rpcUrl.includes("test") || to.startsWith("cfxtest:");
            const chain = isTestnet ? testnet : mainnet;
            const networkId = isTestnet ? 1 : 1029;

            const account = privateKeyToAccount(privateKey as `0x${string}`, {
                networkId,
            });

            const client = createWalletClient({
                account,
                chain,
                transport: http(rpcUrl),
            });

            const hash = await client.sendTransaction({
                account,
                to,
                value: parseCFX(amount),
                chain,
            });

            // Send only the actual transaction hash
            callback?.({
                text: `${amount} CFX sent to ${to}: ${hash}`,
                content: { hash },
            });
            return true;
        } catch (error) {
            console.error("Failed to send CFX on Core network:", error);
            callback?.({
                text: `Failed to send ${amount} CFX to ${to} on Core network: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    validate: async () => true,
    similes: [
        "like sending a digital letter through the Core network",
        "like making an instant transfer in the Core space",
        "like beaming CFX through the Core network",
    ],
};
