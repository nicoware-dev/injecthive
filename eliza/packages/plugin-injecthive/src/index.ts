import InjectiveActions from "./action";
import { CoinGeckoActions } from "./actions/coingecko";
import { DefiLlamaActions } from "./actions/defillama";
import { PortfolioActions } from "./actions/portfolio";
import { ExplorerActions } from "./actions/explorer";
import { TransferActions } from "./actions/transfer";
import { SwapActions } from "./actions/swap";
import type { Plugin } from "@elizaos/core";

// Log the available actions for debugging
import { elizaLogger } from "@elizaos/core";
elizaLogger.info(`InjectiveActions: ${InjectiveActions.map(a => a.name).join(', ')}`);
elizaLogger.info(`CoinGeckoActions: ${CoinGeckoActions.map(a => a.name).join(', ')}`);
elizaLogger.info(`DefiLlamaActions: ${DefiLlamaActions.map(a => a.name).join(', ')}`);
elizaLogger.info(`PortfolioActions: ${PortfolioActions.map(a => a.name).join(', ')}`);
elizaLogger.info(`ExplorerActions: ${ExplorerActions.map(a => a.name).join(', ')}`);
elizaLogger.info(`TransferActions: ${TransferActions.map(a => a.name).join(', ')}`);
elizaLogger.info(`SwapActions: ${SwapActions.map(a => a.name).join(', ')}`);

// Temporarily removing InjectiveActions to avoid conflicts with our new portfolio actions
export const injecthivePlugin: Plugin = {
    name: "injecthive",
    description: "A plugin for interacting with the Injective blockchain and its ecosystem",
    actions: [...CoinGeckoActions, ...DefiLlamaActions, ...PortfolioActions, ...ExplorerActions, ...TransferActions, ...SwapActions],
    evaluators: [],
    providers: [],
};

export default injecthivePlugin;
