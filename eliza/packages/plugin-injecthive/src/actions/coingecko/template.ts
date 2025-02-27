import { getTokenPrice, getMultipleTokenPrices } from './module';

export const getTokenPriceTemplate = `
Get the price of a specific token.

Required parameters:
- denom: The token denomination to query (e.g., "inj")
`;

export const getMultipleTokenPricesTemplate = `
Get prices for multiple tokens at once.

Required parameters:
- denoms: Array of token denominations to query (e.g., ["inj", "atom", "osmo"])
`; 