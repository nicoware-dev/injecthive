export const getBankModuleParamsTemplate = `
Extract the bank module parameters.
`;

export const getBankBalanceTemplate = `
Extract the balance for a specific token.

Required parameters:
- denom: The token denomination to query (e.g., "inj")
`;

export const getBankBalancesTemplate = `
Extract all token balances for the current wallet, including INJ and any other tokens like USDT, USDC, etc.
Make sure to return a complete list of all tokens in the wallet, not just INJ.
`;

export const getTotalSupplyTemplate = `
Extract the total supply of all tokens.
`;

export const getAllTotalSupplyTemplate = `
Extract the complete total supply for all denominations.
`;

export const getSupplyOfTemplate = `
Extract the supply of a specific token.

Required parameters:
- denom: The token denomination to query (e.g., "inj")
`;

export const getDenomsMetadataTemplate = `
Extract metadata for all token denominations.
`;

export const getDenomMetadataTemplate = `
Extract metadata for a specific token denomination.

Required parameters:
- denom: The token denomination to query (e.g., "inj")
`;

export const getDenomOwnersTemplate = `
Extract the owners of a specific token denomination.

Required parameters:
- denom: The token denomination to query (e.g., "inj")
`;

export const msgSendTemplate = `
Send tokens from one account to another.

Required parameters:
- dstInjectiveAddress: The destination Injective address
- amount: The amount to send, including:
  - denom: Token denomination (e.g., "inj")
  - amount: Amount in smallest unit (will be converted automatically)
`;

export const msgMultiSendTemplate = `
Send tokens from multiple senders to multiple receivers.

Required parameters:
- inputs: Array of sender addresses and amounts
- outputs: Array of receiver addresses and amounts
`;

export const getPortfolioTemplate = `
Get a complete portfolio view with token balances and USD values.
`;
