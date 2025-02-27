import { createGenericAction } from "./base";
import * as BankTemplates from "../../injective-sdk-client-ts/src/template/bank";
import { InjectiveGrpcClient as InjectiveSDKClient } from '../../injective-sdk-client-ts/src/modules';
import * as BankModule from '../../injective-sdk-client-ts/src/modules/bank';
import type { Action, ActionExample, Memory, State, HandlerCallback, IAgentRuntime } from "@elizaos/core";
import { elizaLogger, composeContext, generateObjectDeprecated, ModelClass, generateText } from "@elizaos/core";

// Empty examples and similes arrays since we're simplifying
const emptyExamples: any[] = [];
const emptySimiles: string[] = [];

// Query Actions
export const GetBankModuleParamsAction = createGenericAction({
    name: "GetBankModuleParams",
    description: "Get bank module parameters",
    template: BankTemplates.getBankModuleParamsTemplate,
    examples: emptyExamples,
    similes: ["GET_BANK_MODULE_PARAMS"],
    functionName: "getBankModuleParams",
    validateContent: () => true,
});

export const GetBankBalanceAction = createGenericAction({
    name: "GetBankBalance",
    description: "Get bank balance for a specific token",
    template: BankTemplates.getBankBalanceTemplate,
    examples: emptyExamples,
    similes: ["GET_BANK_BALANCE", "SHOW_BALANCE", "CHECK_BALANCE", "FETCH_BALANCE"],
    functionName: "getBankBalance",
    validateContent: () => true,
});

// Custom handler for GetBankBalancesAction
export const GetBankBalancesAction: Action = {
    name: "GetBankBalances",
    description: "Get all bank balances for the current wallet",
    examples: [emptyExamples as ActionExample[]],
    similes: [
        "GET_BANK_BALANCES", 
        "SHOW_ALL_BALANCES", 
        "DISPLAY_ALL_BALANCES", 
        "LIST_ALL_BALANCES", 
        "FETCH_ALL_BALANCES", 
        "VIEW_ALL_BALANCES", 
        "CHECK_ALL_BALANCES", 
        "SHOW_ALL_TOKENS", 
        "DISPLAY_ALL_TOKENS", 
        "LIST_ALL_TOKENS",
        "SHOW_MY_TOKENS",
        "DISPLAY_MY_TOKENS",
        "LIST_MY_TOKENS",
        "SHOW_MY_BALANCES",
        "DISPLAY_MY_BALANCES",
        "LIST_MY_BALANCES",
        "WHAT_TOKENS_DO_I_HAVE",
        "WHAT_BALANCES_DO_I_HAVE",
        "SHOW_WALLET_CONTENTS",
        "DISPLAY_WALLET_CONTENTS"
    ],
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.debug(`Bank action: GetBankBalances`);
        
        // Compose or update the state
        let currentState = state;
        if (!currentState) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(currentState);
        }
        
        // Compose a context from the given template
        const context = composeContext({
            state: currentState,
            template: BankTemplates.getBankBalancesTemplate,
        });

        try {
            // Initialize the Injective client
            const rawNetwork = runtime.getSetting("INJECTIVE_NETWORK");
            const injectivePrivateKey = runtime.getSetting("INJECTIVE_PRIVATE_KEY");
            const ethPublicKey = runtime.getSetting("EVM_PUBLIC_KEY");
            const injPublicKey = runtime.getSetting("INJECTIVE_PUBLIC_KEY");
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
            
            if (!injectivePrivateKey || (!ethPublicKey && !injPublicKey) || !network) {
                throw new Error("Incorrect configuration");
            }

            const client = new InjectiveSDKClient(
                network,
                injectivePrivateKey,
                ethPublicKey,
                injPublicKey
            );

            // Call getBankBalances directly from the BankModule
            elizaLogger.info(`Calling getBankBalances`);
            const response = await BankModule.getBankBalances.call(client, {});
            elizaLogger.info(`Bank balances response: ${JSON.stringify(response)}`);

            if (response.success) {
                // Format the response for the user
                const additionalTemplate = 'Extract the response from the following data, also make sure that you format the response into human readable format, make it the prettiest thing anyone can read basically a very nice comprehensive summary in a string format. Make sure to list ALL tokens in the wallet, not just INJ.';
                const responseResult = JSON.stringify(response.result);
                const newContext = `${additionalTemplate}\n${responseResult}`;
                const totalContext = `Previous chat context:${context} \n New information : ${newContext}`;
                
                const responseContent = await generateText({
                    runtime,
                    context: totalContext,
                    modelClass: ModelClass.SMALL,
                });

                if (callback) {
                    callback({
                        text: responseContent,
                        content: response.result,
                    });
                }
                return true;
            } else {
                // Handle error response
                if (callback) {
                    callback({
                        text: `Failed to get bank balances: ${response.error?.message || 'Unknown error'}`,
                        content: response.error,
                    });
                }
                return false;
            }
        } catch (error) {
            // Handle exceptions
            elizaLogger.error(`Error in Bank action GetBankBalances:`, error);
            if (callback) {
                callback({
                    text: `Error getting bank balances: ${(error as Error).message}`,
                    content: { error: (error as Error).message },
                });
            }
            return false;
        }
    }
};

export const GetPortfolioAction = createGenericAction({
    name: "GetPortfolio",
    description: "Get portfolio with token balances and USD values",
    template: BankTemplates.getPortfolioTemplate,
    examples: emptyExamples,
    similes: ["GET_PORTFOLIO", "SHOW_PORTFOLIO", "DISPLAY_PORTFOLIO", "VIEW_PORTFOLIO"],
    functionName: "getPortfolio",
    validateContent: () => true,
});

export const GetTotalSupplyAction = createGenericAction({
    name: "GetTotalSupply",
    description: "Get total supply of all tokens",
    template: BankTemplates.getTotalSupplyTemplate,
    examples: emptyExamples,
    similes: ["GET_TOTAL_SUPPLY"],
    functionName: "getTotalSupply",
    validateContent: () => true,
});

export const GetSupplyOfAction = createGenericAction({
    name: "GetSupplyOf",
    description: "Get supply of a specific token",
    template: BankTemplates.getSupplyOfTemplate,
    examples: emptyExamples,
    similes: ["GET_SUPPLY_OF"],
    functionName: "getSupplyOf",
    validateContent: () => true,
});

export const GetDenomsMetadataAction = createGenericAction({
    name: "GetDenomsMetadata",
    description: "Get metadata for all token denominations",
    template: BankTemplates.getDenomsMetadataTemplate,
    examples: emptyExamples,
    similes: ["GET_DENOMS_METADATA"],
    functionName: "getDenomsMetadata",
    validateContent: () => true,
});

export const GetDenomMetadataAction = createGenericAction({
    name: "GetDenomMetadata",
    description: "Get metadata for a specific token denomination",
    template: BankTemplates.getDenomMetadataTemplate,
    examples: emptyExamples,
    similes: ["GET_DENOM_METADATA"],
    functionName: "getDenomMetadata",
    validateContent: () => true,
});

export const GetDenomOwnersAction = createGenericAction({
    name: "GetDenomOwners",
    description: "Get owners of a specific token denomination",
    template: BankTemplates.getDenomOwnersTemplate,
    examples: emptyExamples,
    similes: ["GET_DENOM_OWNERS"],
    functionName: "getDenomOwners",
    validateContent: () => true,
});

// Transaction Actions
export const MsgSendAction = createGenericAction({
    name: "MsgSend",
    description: "Send tokens from one account to another",
    template: BankTemplates.msgSendTemplate,
    examples: emptyExamples,
    similes: ["MSG_SEND"],
    functionName: "msgSend",
    validateContent: () => true,
});

export const MsgMultiSendAction = createGenericAction({
    name: "MsgMultiSend",
    description: "Send tokens from multiple senders to multiple receivers",
    template: BankTemplates.msgMultiSendTemplate,
    examples: emptyExamples,
    similes: ["MSG_MULTI_SEND"],
    functionName: "msgMultiSend",
    validateContent: () => true,
});

export const BankActions = [
    GetBankModuleParamsAction,
    GetBankBalanceAction,
    GetBankBalancesAction,
    GetPortfolioAction,
    GetTotalSupplyAction,
    GetSupplyOfAction,
    GetDenomsMetadataAction,
    GetDenomMetadataAction,
    GetDenomOwnersAction,
    MsgSendAction,
    MsgMultiSendAction,
];
