import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import axios from 'axios';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Predefined list of tokens to track with correct CoinGecko IDs
const TRACKED_TOKENS = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
  { id: 'tether', symbol: 'usdt', name: 'Tether' },
  { id: 'injective-protocol', symbol: 'inj', name: 'Injective' }
];

type TokenInfo = typeof TRACKED_TOKENS[number];

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
  last_updated_at?: number;
}

interface CoinGeckoPriceResponse {
  [key: string]: CoinGeckoPrice;
}

// Cache configuration
const CACHE_DURATION = 300 * 1000; // 300 seconds to avoid rate limits
let marketDataCache: {
  data: CoinGeckoPriceResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Helper function to check if cache is valid
function isCacheValid(): boolean {
  return Date.now() - marketDataCache.timestamp < CACHE_DURATION;
}

// Format currency with appropriate decimal places
function formatCurrency(value: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1000 ? 2 : 4,
    maximumFractionDigits: value >= 1000 ? 2 : 6
  }).format(value);
}

function getColoredPriceChange(change: number | undefined): string {
  if (typeof change !== 'number' || Number.isNaN(change)) {
    return '±0.00%';
  }
  const sign = change >= 0 ? '▲' : '▼';
  const changeText = `${sign} ${Math.abs(change).toFixed(2)}%`;
  return change >= 0 ? `**${changeText}**` : `*${changeText}*`;
}

async function fetchMarketData(tokens: TokenInfo[]): Promise<CoinGeckoPriceResponse> {
  if (isCacheValid() && marketDataCache.data) {
    return marketDataCache.data;
  }

  try {
    const ids = tokens.map(t => t.id).join(',');
    const response = await axios.get<CoinGeckoPriceResponse>(`${BASE_URL}/simple/price`, {
      params: {
        ids,
        vs_currencies: 'usd',
        include_24h_change: true,
        include_market_cap: true,
        include_last_updated_at: true
      },
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response format from CoinGecko API');
    }

    // Update cache
    marketDataCache = {
      data: response.data,
      timestamp: Date.now()
    };

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      elizaLogger.warn('Rate limited by CoinGecko API');
      if (marketDataCache.data) {
        return marketDataCache.data;
      }
      throw new Error('Rate limited by CoinGecko API and no cached data available');
    }

    elizaLogger.error('Error fetching market data:', error);
    throw error;
  }
}

// Cache for storing price data to avoid rate limits
interface PriceCache {
  [key: string]: {
    price: number;
    timestamp: number;
  };
}

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
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/luna': 'terra-luna-2',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/sei': 'sei-network',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/sol': 'solana',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/dot': 'polkadot',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/bnb': 'binancecoin',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/matic': 'matic-network',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/avax': 'avalanche-2',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/link': 'chainlink',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/aave': 'aave',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/uni': 'uniswap',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/sushi': 'sushi',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/cake': 'pancakeswap-token',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/crv': 'curve-dao-token',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/comp': 'compound-governance-token',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/mkr': 'maker',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/snx': 'havven',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/yfi': 'yearn-finance',
  'factory/inj1hdvy6tl89llr69r9pecgz2nkthyregm3u9leh5/1inch': '1inch',
};

export class CoinGeckoProvider {
  private priceCache: PriceCache = {};
  private cacheExpiryMs: number = 5 * 60 * 1000; // 5 minutes
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.COINGECKO_API_KEY || null;
  }

  /**
   * Get the CoinGecko ID for a given denom
   */
  public getDenomCoinGeckoId(denom: string): string | null {
    return DENOM_TO_COINGECKO_ID[denom] || null;
  }

  /**
   * Get the USD price for a given denom
   */
  public async getTokenPrice(denom: string): Promise<number | null> {
    try {
      const coinId = this.getDenomCoinGeckoId(denom);
      if (!coinId) {
        elizaLogger.debug(`No CoinGecko ID found for denom: ${denom}`);
        return null;
      }

      // Check cache first
      const cacheKey = coinId;
      const cachedData = this.priceCache[cacheKey];
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < this.cacheExpiryMs) {
        elizaLogger.debug(`Using cached price for ${coinId}: $${cachedData.price}`);
        return cachedData.price;
      }

      // Fetch fresh data
      const endpoint = this.apiKey 
        ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&x_cg_pro_api_key=${this.apiKey}`
        : `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;

      const response = await axios.get(endpoint);
      
      if (response.data && response.data[coinId] && response.data[coinId].usd) {
        const price = response.data[coinId].usd;
        
        // Update cache
        this.priceCache[cacheKey] = {
          price,
          timestamp: now,
        };
        
        elizaLogger.debug(`Fetched price for ${coinId}: $${price}`);
        return price;
      }
      
      return null;
    } catch (error) {
      elizaLogger.error(`Error fetching price from CoinGecko: ${error}`);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens at once
   */
  public async getMultipleTokenPrices(denoms: string[]): Promise<Record<string, number | null>> {
    try {
      const result: Record<string, number | null> = {};
      const coinIdsToFetch: string[] = [];
      const denomToCoinIdMap: Record<string, string> = {};
      const now = Date.now();

      // First check cache and build list of IDs to fetch
      for (const denom of denoms) {
        const coinId = this.getDenomCoinGeckoId(denom);
        if (!coinId) {
          result[denom] = null;
          continue;
        }

        denomToCoinIdMap[denom] = coinId;
        
        // Check if we have a valid cache entry
        const cachedData = this.priceCache[coinId];
        if (cachedData && now - cachedData.timestamp < this.cacheExpiryMs) {
          result[denom] = cachedData.price;
        } else {
          coinIdsToFetch.push(coinId);
        }
      }

      // If we have IDs to fetch, make the API call
      if (coinIdsToFetch.length > 0) {
        const coinIdsParam = coinIdsToFetch.join(',');
        const endpoint = this.apiKey 
          ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinIdsParam}&vs_currencies=usd&x_cg_pro_api_key=${this.apiKey}`
          : `https://api.coingecko.com/api/v3/simple/price?ids=${coinIdsParam}&vs_currencies=usd`;

        const response = await axios.get(endpoint);
        
        // Process the response and update cache
        for (const denom of denoms) {
          const coinId = denomToCoinIdMap[denom];
          if (!coinId || result[denom] !== undefined) continue;
          
          if (response.data && response.data[coinId] && response.data[coinId].usd) {
            const price = response.data[coinId].usd;
            
            // Update cache
            this.priceCache[coinId] = {
              price,
              timestamp: now,
            };
            
            result[denom] = price;
          } else {
            result[denom] = null;
          }
        }
      }

      return result;
    } catch (error) {
      elizaLogger.error(`Error fetching multiple prices from CoinGecko: ${error}`);
      // Return whatever we have from cache
      const result: Record<string, number | null> = {};
      for (const denom of denoms) {
        const coinId = this.getDenomCoinGeckoId(denom);
        if (!coinId) {
          result[denom] = null;
          continue;
        }
        
        const cachedData = this.priceCache[coinId];
        result[denom] = cachedData ? cachedData.price : null;
      }
      return result;
    }
  }
}

export const coinGeckoProvider: Provider = {
  async get(_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> {
    try {
      let selectedTokens = TRACKED_TOKENS;
      const requestedTokens = message.content?.text?.toLowerCase().match(/\b(btc|eth|usdt|s|shadow|swpx|beets|usdc|eurc)\b/g);

      if (requestedTokens?.length) {
        selectedTokens = requestedTokens
          .map(symbol => TRACKED_TOKENS.find(t => t.symbol.toLowerCase() === symbol))
          .filter((t): t is TokenInfo => t !== undefined);
      }

      if (!selectedTokens.length) {
        selectedTokens = TRACKED_TOKENS;
      }

      const priceData = await fetchMarketData(selectedTokens);

      if (!priceData || Object.keys(priceData).length === 0) {
        return 'Currently, I\'m unable to fetch the latest prices due to a temporary issue with the market data feed. Please try again later.';
      }

      const priceLines = selectedTokens
        .map(token => {
          const data = priceData[token.id];
          if (!data?.usd) return null;

          return [
            `### ${token.name} (${token.symbol.toUpperCase()})`,
            `- Current Price: ${formatCurrency(data.usd)}`,
            `- 24h Change: ${getColoredPriceChange(data.usd_24h_change)}`
          ].join('\n');
        })
        .filter(Boolean);

      if (!priceLines.length) {
        return 'Currently, I\'m unable to fetch the latest prices due to a temporary issue with the market data feed. Please try again later.';
      }

      return [
        '# Current Cryptocurrency Prices',
        '',
        ...priceLines,
        '',
        '---',
        '_Prices are updated every 5 minutes. Bold numbers indicate price increase, italic numbers indicate decrease._',
        '',
        'Let me know if you need specific tokens or more detailed market analysis!'
      ].join('\n');
    } catch (error) {
      elizaLogger.error('Error in CoinGecko provider:', error);
      return 'Currently, I\'m unable to fetch the latest prices due to a temporary issue with the market data feed. This may be due to a high number of requests or connectivity issues. However, typically, ETH, BTC, and INJ prices are reflective of broader market trends. Once the connection is re-established, I can provide the most up-to-date pricing information.';
    }
  }
};
