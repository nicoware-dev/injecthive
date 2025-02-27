import axios from 'axios';
import { StandardResponse, createSuccessResponse, createErrorResponse } from '../utils/response';
import { elizaLogger } from "@elizaos/core";

// Map of Injective denoms to CoinGecko IDs
const DENOM_TO_COINGECKO_ID: Record<string, string> = {
  'inj': 'injective-protocol',
  'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7': 'tether',
  'peggy0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'usd-coin',
  'factory/inj14ejqjyq8um4p3xfqj74yld5waqljf88f9eneuk/inj': 'injective-protocol',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/astro': 'astroport',
  'peggy0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'wrapped-bitcoin',
  'peggy0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'ethereum',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/atom': 'cosmos',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/osmo': 'osmosis',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/sei': 'sei-network',
  // Add common token names for easier lookup
  'usdt': 'tether',
  'usdc': 'usd-coin',
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'atom': 'cosmos',
  'osmo': 'osmosis',
  'sei': 'sei-network',
  'astro': 'astroport',
  'sol': 'solana',
  'dot': 'polkadot',
  'ada': 'cardano',
  'avax': 'avalanche-2',
  'matic': 'matic-network',
  'link': 'chainlink',
  'uni': 'uniswap',
  'doge': 'dogecoin',
  'shib': 'shiba-inu',
  'xrp': 'ripple',
  'bnb': 'binancecoin',
  'luna': 'terra-luna-2',
  'near': 'near',
};

// Common token data for fallback when API fails
const COMMON_TOKEN_PRICES: Record<string, any> = {
  'injective-protocol': {
    name: 'Injective',
    symbol: 'INJ',
    price: 13.16,
    lastUpdated: Date.now()
  },
  'bitcoin': {
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 62500.00,
    lastUpdated: Date.now()
  },
  'ethereum': {
    name: 'Ethereum',
    symbol: 'ETH',
    price: 3200.00,
    lastUpdated: Date.now()
  },
  'tether': {
    name: 'Tether',
    symbol: 'USDT',
    price: 1.00,
    lastUpdated: Date.now()
  },
  'usd-coin': {
    name: 'USD Coin',
    symbol: 'USDC',
    price: 1.00,
    lastUpdated: Date.now()
  },
  'cosmos': {
    name: 'Cosmos',
    symbol: 'ATOM',
    price: 8.50,
    lastUpdated: Date.now()
  },
  'osmosis': {
    name: 'Osmosis',
    symbol: 'OSMO',
    price: 0.65,
    lastUpdated: Date.now()
  },
  'sei-network': {
    name: 'Sei',
    symbol: 'SEI',
    price: 0.55,
    lastUpdated: Date.now()
  },
  'astroport': {
    name: 'Astroport',
    symbol: 'ASTRO',
    price: 0.12,
    lastUpdated: Date.now()
  }
};

// Cache for storing price data to avoid rate limits
interface PriceCache {
  [key: string]: {
    price: number;
    timestamp: number;
    name?: string;
    symbol?: string;
  };
}

// Global price cache
const priceCache: PriceCache = {};
const cacheExpiryMs: number = 5 * 60 * 1000; // 5 minutes

// Create axios instance with timeout
const api = axios.create({
  timeout: 10000, // 10 seconds
});

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value);
}

/**
 * Get the CoinGecko ID for a given denom
 */
function getDenomCoinGeckoId(denom: string): string | null {
  // Normalize the denom to lowercase
  const normalizedDenom = denom.toLowerCase();
  return DENOM_TO_COINGECKO_ID[normalizedDenom] || null;
}

/**
 * Get the USD price for a specific token
 */
export async function getTokenPrice(params: { denom: string }): Promise<StandardResponse> {
  try {
    const { denom } = params;
    
    if (!denom) {
      return createErrorResponse("MissingParameter", "Token denomination is required");
    }
    
    const coinId = getDenomCoinGeckoId(denom);
    
    if (!coinId) {
      return createErrorResponse("InvalidParameter", `No CoinGecko ID found for denom: ${denom}`);
    }

    // Check cache first
    const cacheKey = coinId;
    const cachedData = priceCache[cacheKey];
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < cacheExpiryMs) {
      elizaLogger.info(`Using cached price for ${coinId}: $${cachedData.price}`);
      return createSuccessResponse({
        denom,
        coinId,
        price: cachedData.price,
        formattedPrice: formatCurrency(cachedData.price),
        name: cachedData.name,
        symbol: cachedData.symbol,
        currency: 'USD',
        timestamp: cachedData.timestamp
      });
    }

    // Fetch fresh data
    elizaLogger.info(`Fetching price for ${coinId} from CoinGecko API`);
    const apiKey = process.env.COINGECKO_API_KEY;
    const endpoint = apiKey 
      ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_last_updated_at=true&x_cg_pro_api_key=${apiKey}`
      : `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_last_updated_at=true`;

    const response = await api.get(endpoint);
    
    if (response.data && response.data[coinId] && response.data[coinId].usd) {
      const price = response.data[coinId].usd;
      const lastUpdatedAt = response.data[coinId].last_updated_at || now;
      
      // Get additional token info if available
      let name = denom.toUpperCase();
      let symbol = denom.toUpperCase();
      
      // Try to get token info from common data
      if (COMMON_TOKEN_PRICES[coinId]) {
        name = COMMON_TOKEN_PRICES[coinId].name;
        symbol = COMMON_TOKEN_PRICES[coinId].symbol;
      }
      
      // Update cache
      priceCache[cacheKey] = {
        price,
        timestamp: now,
        name,
        symbol
      };
      
      elizaLogger.info(`Fetched price for ${coinId}: $${price}`);
      return createSuccessResponse({
        denom,
        coinId,
        price,
        formattedPrice: formatCurrency(price),
        name,
        symbol,
        currency: 'USD',
        timestamp: lastUpdatedAt
      });
    }
    
    // If API fails, try to use fallback data
    if (COMMON_TOKEN_PRICES[coinId]) {
      const fallbackData = COMMON_TOKEN_PRICES[coinId];
      elizaLogger.warn(`Using fallback data for ${coinId}`);
      
      // Update cache with fallback data
      priceCache[cacheKey] = {
        price: fallbackData.price,
        timestamp: now,
        name: fallbackData.name,
        symbol: fallbackData.symbol
      };
      
      return createSuccessResponse({
        denom,
        coinId,
        price: fallbackData.price,
        formattedPrice: formatCurrency(fallbackData.price),
        name: fallbackData.name,
        symbol: fallbackData.symbol,
        currency: 'USD',
        timestamp: now,
        isEstimated: true
      });
    }
    
    return createErrorResponse("DataNotAvailable", `Failed to fetch price for ${denom}`);
  } catch (error) {
    elizaLogger.error('Error fetching token price:', error);
    
    // Try to use fallback data if available
    const coinId = getDenomCoinGeckoId(params.denom);
    if (coinId && COMMON_TOKEN_PRICES[coinId]) {
      const fallbackData = COMMON_TOKEN_PRICES[coinId];
      elizaLogger.warn(`Using fallback data for ${coinId} due to API error`);
      
      return createSuccessResponse({
        denom: params.denom,
        coinId,
        price: fallbackData.price,
        formattedPrice: formatCurrency(fallbackData.price),
        name: fallbackData.name,
        symbol: fallbackData.symbol,
        currency: 'USD',
        timestamp: Date.now(),
        isEstimated: true
      });
    }
    
    return createErrorResponse("ApiError", `Error fetching price: ${(error as Error).message}`);
  }
}

/**
 * Get prices for multiple tokens at once
 */
export async function getMultipleTokenPrices(params: { denoms: string[] }): Promise<StandardResponse> {
  try {
    const { denoms } = params;
    
    if (!denoms || !Array.isArray(denoms) || denoms.length === 0) {
      return createErrorResponse("MissingParameter", "Token denominations array is required");
    }
    
    const result: Record<string, any> = {};
    const coinIdsToFetch: string[] = [];
    const denomToCoinIdMap: Record<string, string> = {};
    const now = Date.now();

    // First check cache and build list of IDs to fetch
    for (const denom of denoms) {
      const coinId = getDenomCoinGeckoId(denom);
      if (!coinId) {
        result[denom] = { 
          error: `No CoinGecko ID found for denom: ${denom}`,
          denom
        };
        continue;
      }

      denomToCoinIdMap[denom] = coinId;
      
      // Check if we have a valid cache entry
      const cachedData = priceCache[coinId];
      if (cachedData && now - cachedData.timestamp < cacheExpiryMs) {
        elizaLogger.info(`Using cached price for ${coinId}: $${cachedData.price}`);
        result[denom] = {
          denom,
          coinId,
          price: cachedData.price,
          formattedPrice: formatCurrency(cachedData.price),
          name: cachedData.name,
          symbol: cachedData.symbol,
          currency: 'USD',
          timestamp: cachedData.timestamp
        };
      } else {
        coinIdsToFetch.push(coinId);
      }
    }

    // If we have IDs to fetch, make the API call
    if (coinIdsToFetch.length > 0) {
      const coinIdsParam = coinIdsToFetch.join(',');
      elizaLogger.info(`Fetching prices for ${coinIdsToFetch.length} tokens from CoinGecko API`);
      
      const apiKey = process.env.COINGECKO_API_KEY;
      const endpoint = apiKey 
        ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinIdsParam}&vs_currencies=usd&include_last_updated_at=true&x_cg_pro_api_key=${apiKey}`
        : `https://api.coingecko.com/api/v3/simple/price?ids=${coinIdsParam}&vs_currencies=usd&include_last_updated_at=true`;

      const response = await api.get(endpoint);
      
      // Process the response and update cache
      for (const denom of denoms) {
        const coinId = denomToCoinIdMap[denom];
        if (!coinId || result[denom]) continue;
        
        if (response.data && response.data[coinId] && response.data[coinId].usd) {
          const price = response.data[coinId].usd;
          const lastUpdatedAt = response.data[coinId].last_updated_at || now;
          
          // Get additional token info if available
          let name = denom.toUpperCase();
          let symbol = denom.toUpperCase();
          
          // Try to get token info from common data
          if (COMMON_TOKEN_PRICES[coinId]) {
            name = COMMON_TOKEN_PRICES[coinId].name;
            symbol = COMMON_TOKEN_PRICES[coinId].symbol;
          }
          
          // Update cache
          priceCache[coinId] = {
            price,
            timestamp: now,
            name,
            symbol
          };
          
          result[denom] = {
            denom,
            coinId,
            price,
            formattedPrice: formatCurrency(price),
            name,
            symbol,
            currency: 'USD',
            timestamp: lastUpdatedAt
          };
        } else {
          // If API doesn't have data for this coin, try fallback
          if (COMMON_TOKEN_PRICES[coinId]) {
            const fallbackData = COMMON_TOKEN_PRICES[coinId];
            elizaLogger.warn(`Using fallback data for ${coinId}`);
            
            // Update cache with fallback data
            priceCache[coinId] = {
              price: fallbackData.price,
              timestamp: now,
              name: fallbackData.name,
              symbol: fallbackData.symbol
            };
            
            result[denom] = {
              denom,
              coinId,
              price: fallbackData.price,
              formattedPrice: formatCurrency(fallbackData.price),
              name: fallbackData.name,
              symbol: fallbackData.symbol,
              currency: 'USD',
              timestamp: now,
              isEstimated: true
            };
          } else {
            result[denom] = { 
              error: `Failed to fetch price for ${denom}`,
              denom
            };
          }
        }
      }
    }

    // Check if we have any results
    const successfulResults = Object.values(result).filter((r: any) => !r.error);
    if (successfulResults.length === 0) {
      // If all API calls failed, try to use fallback data
      for (const denom of denoms) {
        const coinId = denomToCoinIdMap[denom];
        if (!coinId) continue;
        
        if (COMMON_TOKEN_PRICES[coinId]) {
          const fallbackData = COMMON_TOKEN_PRICES[coinId];
          elizaLogger.warn(`Using fallback data for ${coinId} due to API failure`);
          
          result[denom] = {
            denom,
            coinId,
            price: fallbackData.price,
            formattedPrice: formatCurrency(fallbackData.price),
            name: fallbackData.name,
            symbol: fallbackData.symbol,
            currency: 'USD',
            timestamp: now,
            isEstimated: true
          };
        }
      }
    }

    return createSuccessResponse({
      prices: result,
      timestamp: now,
      count: Object.keys(result).length
    });
  } catch (error) {
    elizaLogger.error('Error fetching multiple token prices:', error);
    
    // Try to use fallback data for all requested tokens
    const result: Record<string, any> = {};
    const now = Date.now();
    
    for (const denom of params.denoms) {
      const coinId = getDenomCoinGeckoId(denom);
      if (!coinId) continue;
      
      if (COMMON_TOKEN_PRICES[coinId]) {
        const fallbackData = COMMON_TOKEN_PRICES[coinId];
        
        result[denom] = {
          denom,
          coinId,
          price: fallbackData.price,
          formattedPrice: formatCurrency(fallbackData.price),
          name: fallbackData.name,
          symbol: fallbackData.symbol,
          currency: 'USD',
          timestamp: now,
          isEstimated: true
        };
      }
    }
    
    if (Object.keys(result).length > 0) {
      elizaLogger.warn(`Using fallback data for ${Object.keys(result).length} tokens due to API error`);
      return createSuccessResponse({
        prices: result,
        timestamp: now,
        count: Object.keys(result).length,
        isEstimated: true
      });
    }
    
    return createErrorResponse("ApiError", `Error fetching prices: ${(error as Error).message}`);
  }
} 