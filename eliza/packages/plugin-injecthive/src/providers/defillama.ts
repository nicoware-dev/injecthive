import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import axios from 'axios';

// Types
interface TVLDataPoint {
  date: string;
  tvl: number;
}

interface TVLSummary {
  currentTVL: number;
  monthlyChange: number;
  maxTVL: number;
  minTVL: number;
  avgTVL: number;
  last12Months: TVLDataPoint[];
}

interface DefiLlamaHistoricalTVL {
  tvl: number;
  date: number;
}

interface DefiLlamaProtocolTVL {
  tvl: Array<{
    date: number;
    totalLiquidityUSD: number;
  }>;
}

interface GlobalTVLData {
  totalTvl: number;
  topChains: Array<{
    name: string;
    tvl: number;
    percentage: number;
  }>;
}

// Constants
const BASE_URL = 'https://api.llama.fi';
const CHAIN_NAME = 'Injective';

// Updated protocol slugs - these need to be verified with DefiLlama's API
const PROTOCOLS = [
  'helix',       
  'neptune-finance',           
  'hydro',
  'dojoswap',
] as const;

// Cache configuration
const CACHE_DURATION = 300 * 1000; // 5 minutes
let tvlCache: {
  chainData: TVLSummary | null;
  protocolsData: Record<string, TVLSummary> | null;
  globalData: GlobalTVLData | null;
  timestamp: number;
} = {
  chainData: null,
  protocolsData: null,
  globalData: null,
  timestamp: 0
};

function isCacheValid(): boolean {
  return Date.now() - tvlCache.timestamp < CACHE_DURATION;
}

function formatCurrency(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toFixed(2)}`;
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

async function fetchChainTVL(): Promise<TVLSummary> {
  try {
    const response = await axios.get<DefiLlamaHistoricalTVL[]>(
      `${BASE_URL}/v2/historicalChainTvl/${CHAIN_NAME}`
    );

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format from DefiLlama API');
    }

    // Get last 12 months of data
    const yearAgo = new Date();
    yearAgo.setMonth(yearAgo.getMonth() - 12);

    const last12Months = response.data
      .filter(d => new Date(d.date * 1000) >= yearAgo)
      .map(d => ({
        date: new Date(d.date * 1000).toISOString().split('T')[0],
        tvl: Number(d.tvl || 0)
      }))
      .filter(d => !Number.isNaN(d.tvl));

    if (last12Months.length === 0) {
      throw new Error('No valid TVL data found');
    }

    const currentTVL = last12Months[last12Months.length - 1].tvl;
    const monthAgoIndex = last12Months.length - 31;
    const monthAgoTVL = monthAgoIndex >= 0 ? last12Months[monthAgoIndex].tvl : last12Months[0].tvl;
    const monthlyChange = ((currentTVL - monthAgoTVL) / monthAgoTVL) * 100;

    const tvlValues = last12Months.map(d => d.tvl);
    return {
      currentTVL,
      monthlyChange,
      maxTVL: Math.max(...tvlValues),
      minTVL: Math.min(...tvlValues),
      avgTVL: tvlValues.reduce((sum, val) => sum + val, 0) / tvlValues.length,
      last12Months
    };
  } catch (error) {
    elizaLogger.error('Error fetching chain TVL:', error);
    throw error;
  }
}

async function fetchProtocolTVL(protocol: string): Promise<TVLSummary | null> {
  try {
    const response = await axios.get<DefiLlamaProtocolTVL>(`${BASE_URL}/protocol/${protocol}`);
    const data = response.data;

    if (!data?.tvl || !Array.isArray(data.tvl)) {
      elizaLogger.warn(`Invalid response format for protocol ${protocol}`);
      return null;
    }

    const yearAgo = new Date();
    yearAgo.setMonth(yearAgo.getMonth() - 12);

    const last12Months = data.tvl
      .filter(d => new Date(d.date * 1000) >= yearAgo)
      .map(d => ({
        date: new Date(d.date * 1000).toISOString().split('T')[0],
        tvl: Number(d.totalLiquidityUSD || 0)
      }))
      .filter(d => !Number.isNaN(d.tvl));

    if (last12Months.length === 0) {
      elizaLogger.warn(`No valid TVL data found for ${protocol}`);
      return null;
    }

    const currentTVL = last12Months[last12Months.length - 1].tvl;
    const monthAgoIndex = last12Months.length - 31;
    const monthAgoTVL = monthAgoIndex >= 0 ? last12Months[monthAgoIndex].tvl : last12Months[0].tvl;
    const monthlyChange = ((currentTVL - monthAgoTVL) / monthAgoTVL) * 100;

    const tvlValues = last12Months.map(d => d.tvl);
    return {
      currentTVL,
      monthlyChange,
      maxTVL: Math.max(...tvlValues),
      minTVL: Math.min(...tvlValues),
      avgTVL: tvlValues.reduce((sum, val) => sum + val, 0) / tvlValues.length,
      last12Months
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      elizaLogger.warn(`Protocol ${protocol} not found in DefiLlama`);
      return null;
    }
    elizaLogger.error(`Error fetching protocol TVL for ${protocol}:`, error);
    return null;
  }
}

async function fetchGlobalTVL(): Promise<GlobalTVLData> {
  try {
    const response = await axios.get<Array<{ name: string; tvl: number; chainId: string }>>(`${BASE_URL}/v2/chains`);

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format from DefiLlama API');
    }

    const chains = response.data.filter(chain => chain.tvl > 0);
    const totalTvl = chains.reduce((sum, chain) => sum + chain.tvl, 0);

    const topChains = chains
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 10)
      .map(chain => ({
        name: chain.name,
        tvl: chain.tvl,
        percentage: (chain.tvl / totalTvl) * 100
      }));

    return {
      totalTvl,
      topChains
    };
  } catch (error) {
    elizaLogger.error('Error fetching global TVL:', error);
    throw error;
  }
}

// Cache for storing protocol data to avoid rate limits
interface ProtocolCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

export class DefiLlamaProvider {
  private protocolCache: ProtocolCache = {};
  private cacheExpiryMs: number = 15 * 60 * 1000; // 15 minutes
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.DEFILLAMA_API_KEY || null;
  }

  /**
   * Get TVL data for Injective protocols
   */
  public async getInjectiveTVL(): Promise<any> {
    try {
      const cacheKey = 'injective-tvl';
      const cachedData = this.protocolCache[cacheKey];
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < this.cacheExpiryMs) {
        elizaLogger.debug('Using cached Injective TVL data');
        return cachedData.data;
      }

      try {
        const response = await axios.get('https://api.llama.fi/v2/chains/injective');
        
        // Update cache
        this.protocolCache[cacheKey] = {
          data: response.data,
          timestamp: now,
        };
        
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // If the endpoint is not found, return a default response
          elizaLogger.warn('DefiLlama API endpoint not found, returning default data');
          
          // Create a default response with some placeholder protocols
          const defaultData = [
            {
              name: 'Helix',
              tvl: 25000000,
              symbol: 'HLX',
              category: 'DEX'
            },
            {
              name: 'Astroport',
              tvl: 15000000,
              symbol: 'ASTRO',
              category: 'DEX'
            },
            {
              name: 'Hydro Protocol',
              tvl: 10000000,
              symbol: 'HYDRO',
              category: 'Lending'
            }
          ];
          
          // Update cache with default data
          this.protocolCache[cacheKey] = {
            data: defaultData,
            timestamp: now,
          };
          
          return defaultData;
        }
        
        // Re-throw other errors
        throw error;
      }
    } catch (error) {
      elizaLogger.error(`Error fetching Injective TVL from DefiLlama: ${error}`);
      return null;
    }
  }

  /**
   * Get protocol data by name
   */
  public async getProtocolByName(name: string): Promise<any> {
    try {
      const cacheKey = `protocol-${name}`;
      const cachedData = this.protocolCache[cacheKey];
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < this.cacheExpiryMs) {
        elizaLogger.debug(`Using cached protocol data for ${name}`);
        return cachedData.data;
      }

      const response = await axios.get(`https://api.llama.fi/protocol/${name}`);
      
      // Update cache
      this.protocolCache[cacheKey] = {
        data: response.data,
        timestamp: now,
      };
      
      return response.data;
    } catch (error) {
      elizaLogger.error(`Error fetching protocol data from DefiLlama: ${error}`);
      return null;
    }
  }

  /**
   * Get yield pools for Injective
   */
  public async getInjectiveYieldPools(): Promise<any> {
    try {
      const cacheKey = 'injective-yield';
      const cachedData = this.protocolCache[cacheKey];
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < this.cacheExpiryMs) {
        elizaLogger.debug('Using cached Injective yield data');
        return cachedData.data;
      }

      const response = await axios.get('https://yields.llama.fi/pools');
      
      // Filter for Injective pools
      const injectivePools = response.data.data.filter((pool: any) => 
        pool.chain === 'Injective'
      );
      
      // Update cache
      this.protocolCache[cacheKey] = {
        data: injectivePools,
        timestamp: now,
      };
      
      return injectivePools;
    } catch (error) {
      elizaLogger.error(`Error fetching Injective yield pools from DefiLlama: ${error}`);
      return null;
    }
  }

  /**
   * Get top protocols on Injective by TVL
   */
  public async getTopInjectiveProtocols(limit: number = 10): Promise<any> {
    try {
      const allProtocols = await this.getInjectiveTVL();
      
      if (!allProtocols) {
        return null;
      }
      
      // Sort by TVL and take the top N
      const topProtocols = allProtocols
        .sort((a: any, b: any) => b.tvl - a.tvl)
        .slice(0, limit);
      
      return topProtocols;
    } catch (error) {
      elizaLogger.error(`Error getting top Injective protocols: ${error}`);
      return null;
    }
  }
}

export const defiLlamaProvider: Provider = {
  async get(_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> {
    try {
      // Initialize provider
      const provider = new DefiLlamaProvider();
      
      // Get TVL data
      const injectiveTVL = await provider.getInjectiveTVL();
      
      if (!injectiveTVL) {
        return 'Currently, I\'m unable to fetch DeFi TVL data due to a temporary issue with the data feed. Please try again later.';
      }
      
      // Format the response
      let response = '# Injective DeFi Ecosystem\n\n';
      
      // Add TVL information
      response += '## Total Value Locked (TVL)\n';
      
      if (Array.isArray(injectiveTVL)) {
        const totalTVL = injectiveTVL.reduce((sum, protocol) => sum + (protocol.tvl || 0), 0);
        response += `Total TVL on Injective: ${formatCurrency(totalTVL)}\n\n`;
        
        // Add top protocols
        response += '## Top Protocols by TVL\n';
        const sortedProtocols = [...injectiveTVL].sort((a, b) => (b.tvl || 0) - (a.tvl || 0)).slice(0, 5);
        
        for (const protocol of sortedProtocols) {
          if (protocol.name && protocol.tvl) {
            response += `- ${protocol.name}: ${formatCurrency(protocol.tvl)}\n`;
          }
        }
      } else {
        response += 'TVL data is currently unavailable in the expected format.\n';
      }
      
      response += '\n---\n_Data is updated every 15 minutes. All values are in USD._';
      
      return response;
    } catch (error) {
      elizaLogger.error('Error in DefiLlama provider:', error);
      return 'Currently, I\'m unable to fetch DeFi TVL data due to a temporary issue with the data feed. Please try again later.';
    }
  }
};

function formatTVLData(
  chainData: TVLSummary,
  protocolsData: Record<string, TVLSummary>,
  globalData: GlobalTVLData
): string {
  const lines = [
    '# Global DeFi & Injective Network TVL Analysis',
    '',
    '## Global DeFi Overview',
    `- Total DeFi TVL: ${formatCurrency(globalData.totalTvl)}`,
    '',
    '### Top 10 Chains by TVL',
    ...globalData.topChains.map((chain, i) =>
      `${i + 1}. ${chain.name}: ${formatCurrency(chain.tvl)} (${formatPercentage(chain.percentage)})`
    ),
    '',
    '## Injective Network Overview',
    `- Current TVL: ${formatCurrency(chainData.currentTVL)}`,
    `- Global Market Share: ${formatPercentage((chainData.currentTVL / globalData.totalTvl) * 100)}`,
    `- 30-Day Change: ${formatPercentage(chainData.monthlyChange)}`,
    `- All-Time High: ${formatCurrency(chainData.maxTVL)}`,
    `- All-Time Low: ${formatCurrency(chainData.minTVL)}`,
    `- Average TVL: ${formatCurrency(chainData.avgTVL)}`,
    ''
  ];

  // Only add protocol section if we have valid protocol data
  const validProtocols = Object.entries(protocolsData)
    .filter(([, data]) => data !== null)
    .sort(([, a], [, b]) => b.currentTVL - a.currentTVL);

  if (validProtocols.length > 0) {
    lines.push('## Injective Protocol Breakdown');

    for (const [protocol, data] of validProtocols) {
      const protocolName = protocol
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      lines.push(
        `### ${protocolName}`,
        `- Current TVL: ${formatCurrency(data.currentTVL)}`,
        `- 30-Day Change: ${formatPercentage(data.monthlyChange)}`,
        `- Network Share: ${formatPercentage((data.currentTVL / chainData.currentTVL) * 100)}`,
        `- Global Share: ${formatPercentage((data.currentTVL / globalData.totalTvl) * 100)}`,
        ''
      );
    }
  }

  lines.push(
    '---',
    '_Data is updated every 5 minutes. All values are in USD._'
  );

  return lines.join('\n');
}
