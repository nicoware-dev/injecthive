import type { InjectiveGrpcBase } from "../grpc/grpc-base";
import { MsgSend, MsgMultiSend } from "@injectivelabs/sdk-ts";
import type * as BankTypes from "../types/bank";
import {
    type StandardResponse,
    createSuccessResponse,
    createErrorResponse,
} from "../types/index";

// Bank Module Chain GRPC Async Functions with Error Handling

/**
 * Fetches the bank module parameters.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>} The standard response containing module parameters or an error.
 */
export async function getBankModuleParams(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchModuleParams();

        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getBankModuleParamsError", err);
    }
}

/**
 * Fetches the balance of a specific account.
 *
 * @this InjectiveGrpcBase
 * @param {BankTypes.GetBankBalanceParams} params - Parameters including account address.
 * @returns {Promise<StandardResponse>} The standard response containing the balance or an error.
 */
export async function getBankBalance(
    this: InjectiveGrpcBase,
    params: BankTypes.GetBankBalanceParams
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchBalance({
            ...params,
            accountAddress: this.injAddress,
        });

        // Convert balance from smallest unit to standard unit if it's INJ
        if (result && result.amount && result.denom === 'inj') {
            // INJ has 18 decimals, so divide by 10^18
            const amountInInj = parseFloat(result.amount) / Math.pow(10, 18);
            result.amount = amountInInj.toString();
        }

        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getBankBalanceError", err);
    }
}

/**
 * Fetches all balances for the current account.
 *
 * @this InjectiveGrpcBase
 * @param {BankTypes.GetBankBalancesParams} params - Parameters including account identifier.
 * @returns {Promise<StandardResponse>} The standard response containing all balances or an error.
 */
export async function getBankBalances(
    this: InjectiveGrpcBase,
    params: BankTypes.GetBankBalancesParams
): Promise<StandardResponse> {
    try {
        // Fetch all balances for the account
        const result = await this.chainGrpcBankApi.fetchBalances(
            this.injAddress
        );
        
        // Fetch token metadata for proper formatting
        const metadataResponse = await this.chainGrpcBankApi.fetchDenomsMetadata();
        const tokenMetadata = metadataResponse.metadatas || [];
        
        // Create a map of denom to metadata for quick lookup
        const metadataMap = tokenMetadata.reduce((acc, metadata) => {
            acc[metadata.base] = metadata;
            return acc;
        }, {} as Record<string, any>);
        
        // Known token decimals for common tokens
        const knownDecimals: Record<string, number> = {
            'inj': 18,
            'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7': 6, // USDT
            'peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 6, // USDC
            'factory/inj14ejqjyq8um4p3xfqj74yld5waqljf88f9eneuk/inj': 6, // INJ on Injective
            'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9qm5x/usdt': 6, // USDT on Injective
        };
        
        // Convert balances from smallest unit to standard unit with proper decimals
        if (result && result.balances && result.balances.length > 0) {
            result.balances = result.balances.map(balance => {
                const metadata = metadataMap[balance.denom];
                
                // Determine display denomination
                let displayDenom = balance.denom;
                let name = balance.denom;
                
                if (metadata) {
                    displayDenom = metadata.display || balance.denom;
                    name = metadata.name || displayDenom;
                } else {
                    // Handle common peggy tokens without metadata
                    if (balance.denom.startsWith('peggy0x')) {
                        const symbol = balance.denom.substring(6, 14) + '...';
                        displayDenom = symbol;
                        name = `Peggy Token (${symbol})`;
                    } else if (balance.denom.startsWith('factory/')) {
                        const parts = balance.denom.split('/');
                        displayDenom = parts[parts.length - 1].toUpperCase();
                        name = `Factory Token (${displayDenom})`;
                    }
                }
                
                // Find the display unit with the highest exponent
                let decimals = 0;
                if (metadata?.denom_units) {
                    const displayUnit = metadata.denom_units.reduce((highest: { exponent: number }, unit: { exponent: number }) => {
                        return (unit.exponent > highest.exponent) ? unit : highest;
                    }, { exponent: 0 });
                    decimals = displayUnit.exponent;
                } else {
                    // Use known decimals or default to 6
                    decimals = knownDecimals[balance.denom] || 6;
                }
                
                // Convert amount based on decimals
                const amountInStandardUnit = parseFloat(balance.amount) / Math.pow(10, decimals);
                
                return {
                    denom: balance.denom,
                    rawAmount: balance.amount,
                    amount: amountInStandardUnit.toString(),
                    displayDenom: displayDenom.toUpperCase(),
                    name,
                    decimals
                };
            });
        }
        
        return createSuccessResponse({
            address: this.injAddress,
            balances: result.balances || [],
            pagination: result.pagination
        });
    } catch (err) {
        return createErrorResponse("getBankBalancesError", err);
    }
}

/**
 * Fetches the total supply of all denominations.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>} The standard response containing total supply or an error.
 */
export async function getTotalSupply(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchTotalSupply();

        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getTotalSupplyError", err);
    }
}

/**
 * Fetches the total supply for all denominations.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>} The standard response containing all total supplies or an error.
 */
export async function getAllTotalSupply(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchAllTotalSupply();
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getAllTotalSupplyError", err);
    }
}

/**
 * Fetches the supply of a specific denomination.
 *
 * @this InjectiveGrpcBase
 * @param {BankTypes.GetSupplyOfParams} params - Parameters including denomination.
 * @returns {Promise<StandardResponse>} The standard response containing the supply or an error.
 */
export async function getSupplyOf(
    this: InjectiveGrpcBase,
    params: BankTypes.GetSupplyOfParams
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchSupplyOf(params.denom);
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getSupplyOfError", err);
    }
}

/**
 * Fetches metadata for all denominations.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>} The standard response containing denomination metadata or an error.
 */
export async function getDenomsMetadata(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchDenomsMetadata();
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getDenomsMetadataError", err);
    }
}

/**
 * Fetches metadata for a specific denomination.
 *
 * @this InjectiveGrpcBase
 * @param {BankTypes.GetDenomMetadataParams} params - Parameters including denomination.
 * @returns {Promise<StandardResponse>} The standard response containing denomination metadata or an error.
 */
export async function getDenomMetadata(
    this: InjectiveGrpcBase,
    params: BankTypes.GetDenomMetadataParams
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchDenomMetadata(
            params.denom
        );
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getDenomMetadataError", err);
    }
}

/**
 * Fetches the owners of a specific denomination.
 *
 * @this InjectiveGrpcBase
 * @param {BankTypes.GetDenomOwnersParams} params - Parameters including denomination.
 * @returns {Promise<StandardResponse>} The standard response containing denomination owners or an error.
 */
export async function getDenomOwners(
    this: InjectiveGrpcBase,
    params: BankTypes.GetDenomOwnersParams
): Promise<StandardResponse> {
    try {
        const result = await this.chainGrpcBankApi.fetchDenomOwners(
            params.denom
        );
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("getDenomOwnersError", err);
    }
}

/**
 * Sends tokens from one account to another.
 *
 * @this InjectiveGrpcBase
 * @param {BankTypes.MsgSendParams} params - Parameters including sender, receiver, and amount.
 * @returns {Promise<StandardResponse>} The standard response containing the transaction result or an error.
 */
export async function msgSend(
    this: InjectiveGrpcBase,
    params: BankTypes.MsgSendParams
): Promise<StandardResponse> {
    try {
        const msg = MsgSend.fromJSON({
            amount: params.amount,
            srcInjectiveAddress: params.srcInjectiveAddress,
            dstInjectiveAddress: params.dstInjectiveAddress,
        });
        const result = await this.msgBroadcaster.broadcast({ msgs: msg });
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("msgSendError", err);
    }
}

/**
 * Sends tokens from multiple senders to multiple receivers.
 *
 * @this InjectiveGrpcBase
 * @param {BankTypes.MsgMultiSendParams} params - Parameters including inputs and outputs.
 * @returns {Promise<StandardResponse>} The standard response containing the transaction result or an error.
 */
export async function msgMultiSend(
    this: InjectiveGrpcBase,
    params: BankTypes.MsgMultiSendParams
): Promise<StandardResponse> {
    try {
        const msg = MsgMultiSend.fromJSON({
            inputs: params.inputs,
            outputs: params.outputs,
        });
        const result = await this.msgBroadcaster.broadcast({ msgs: msg });
        return createSuccessResponse(result);
    } catch (err) {
        return createErrorResponse("msgMultiSendError", err);
    }
}

/**
 * Creates a portfolio view with token balances and price data.
 *
 * @this InjectiveGrpcBase
 * @returns {Promise<StandardResponse>} The standard response containing portfolio data or an error.
 */
export async function getPortfolio(
    this: InjectiveGrpcBase
): Promise<StandardResponse> {
    try {
        // Get all balances
        const balancesResponse = await getBankBalances.call(this, {});
        
        if (!balancesResponse.success) {
            return balancesResponse;
        }
        
        const portfolio = {
            address: this.injAddress,
            balances: (balancesResponse.success && balancesResponse.result?.balances) || [],
            totalValueUsd: 0
        };
        
        return createSuccessResponse(portfolio);
    } catch (err) {
        return createErrorResponse("getPortfolioError", err);
    }
}
