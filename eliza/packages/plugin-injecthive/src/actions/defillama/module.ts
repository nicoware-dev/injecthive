import axios from 'axios';
import { StandardResponse, createSuccessResponse, createErrorResponse } from '../utils/response';
import { elizaLogger } from "@elizaos/core";

// Cache for storing protocol data to avoid rate limits
interface ProtocolCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

// Global protocol cache
const protocolCache: ProtocolCache = {};
const cacheExpiryMs: number = 15 * 60 * 1000; // 15 minutes

// Create axios instance with timeout
const api = axios.create({
  timeout: 10000, // 10 seconds
});

// Common Injective protocols with fallback data in case API fails
const COMMON_INJECTIVE_PROTOCOLS: Record<string, any> = {
  'helix': {
    name: 'Helix',
    tvl: 22242391.77046,
    symbol: 'HLX',
    category: 'DEX',
    chains: ['Injective'],
    url: 'https://helixapp.com/'
  },
  'hydro': {
    name: 'Hydro',
    tvl: 20082605.006,
    symbol: 'HYDRO',
    category: 'Derivatives',
    chains: ['Injective'],
    url: 'https://hydroprotocol.io/'
  },
  'astroport': {
    name: 'Astroport',
    tvl: 30000000,
    symbol: 'ASTRO',
    category: 'DEX',
    chains: ['Injective', 'Terra', 'Neutron'],
    url: 'https://astroport.fi/'
  },
  'gateio': {
    name: 'Gate.io',
    tvl: 6659226856.414,
    symbol: 'GT',
    category: 'CEX',
    chains: ['Injective'],
    url: 'https://gate.io/'
  },
  'portal': {
    name: 'Portal',
    tvl: 2849880591.915,
    symbol: 'PORTAL',
    category: 'Bridge',
    chains: ['Injective'],
    url: 'https://www.portalbridge.com/'
  },
  'axelar': {
    name: 'Axelar',
    tvl: 178131282.627,
    symbol: 'AXL',
    category: 'Bridge',
    chains: ['Injective'],
    url: 'https://axelar.network/'
  },
  'trustake': {
    name: 'TruStake',
    tvl: 141328600.229,
    symbol: 'TRUS',
    category: 'Staking',
    chains: ['Injective'],
    url: 'https://trustake.io/'
  },
  'stride': {
    name: 'Stride',
    tvl: 90011232.219,
    symbol: 'STRD',
    category: 'Liquid Staking',
    chains: ['Injective'],
    url: 'https://stride.zone/'
  }
};

// Format currency for display
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(value);
}

// Normalize protocol name for comparison
function normalizeProtocolName(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/\./g, '') // Remove dots
    .replace(/-/g, '') // Remove hyphens
    .replace(/protocol$/i, ''); // Remove "protocol" suffix
}

/**
 * Get TVL data for Injective protocols
 */
export async function getInjectiveTVL(): Promise<StandardResponse> {
  try {
    const cacheKey = 'injective-tvl';
    const cachedData = protocolCache[cacheKey];
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < cacheExpiryMs) {
      elizaLogger.info('Using cached Injective TVL data');
      return createSuccessResponse({
        protocols: cachedData.data,
        totalTVL: cachedData.data.reduce((sum: number, p: any) => sum + (p.tvl || 0), 0),
        timestamp: cachedData.timestamp,
        count: cachedData.data.length
      });
    }

    // Fetch all protocols from DefiLlama
    elizaLogger.info('Fetching protocols from DefiLlama API');
    const response = await api.get('https://api.llama.fi/protocols');
    
    if (response.data && Array.isArray(response.data)) {
      // Filter for Injective protocols and extract chain-specific TVL
      const injectiveProtocols = response.data
        .filter((protocol: any) => 
          protocol.chains && protocol.chains.includes('Injective')
        )
        .map((protocol: any) => {
          // Extract Injective-specific TVL if available
          let tvl = 0;
          if (protocol.chainTvls && protocol.chainTvls.Injective) {
            tvl = protocol.chainTvls.Injective;
          } else if (protocol.currentChainTvls && protocol.currentChainTvls.Injective) {
            tvl = protocol.currentChainTvls.Injective;
          } else {
            // If chain-specific TVL is not available, try to estimate from total TVL
            // This is a fallback and may not be accurate
            tvl = protocol.tvl || 0;
          }

          return {
            name: protocol.name,
            tvl: tvl,
            symbol: protocol.symbol || '',
            category: protocol.category || '',
            chains: protocol.chains || [],
            url: protocol.url || '',
            change_1d: protocol.change_1d || 0,
            change_7d: protocol.change_7d || 0,
            slug: protocol.slug || null
          };
        });

      // Sort by TVL descending
      injectiveProtocols.sort((a: any, b: any) => b.tvl - a.tvl);
      
      // Cache the data
      protocolCache[cacheKey] = {
        data: injectiveProtocols,
        timestamp: now
      };
      
      const totalTVL = injectiveProtocols.reduce((sum: number, p: any) => sum + (p.tvl || 0), 0);
      
      elizaLogger.info(`Found ${injectiveProtocols.length} Injective protocols with total TVL: ${formatCurrency(totalTVL)}`);
      
      return createSuccessResponse({
        protocols: injectiveProtocols,
        totalTVL,
        timestamp: now,
        count: injectiveProtocols.length
      });
    }
    
    // If API fails, return default data
    elizaLogger.warn('Failed to fetch protocols from DefiLlama API, using default data');
    const defaultProtocols = [
      {
        name: 'Gate.io',
        tvl: 6659226856.414,
        category: 'CEX',
        chains: ['Injective'],
        url: 'https://gate.io/'
      },
      {
        name: 'Portal',
        tvl: 2849880591.915,
        category: 'Bridge',
        chains: ['Injective'],
        url: 'https://www.portalbridge.com/'
      },
      {
        name: 'Axelar',
        tvl: 178131282.627,
        category: 'Bridge',
        chains: ['Injective'],
        url: 'https://axelar.network/'
      },
      {
        name: 'TruStake',
        tvl: 141328600.229,
        category: 'Staking',
        chains: ['Injective'],
        url: 'https://trustake.io/'
      },
      {
        name: 'Stride',
        tvl: 90011232.219,
        category: 'Liquid Staking',
        chains: ['Injective'],
        url: 'https://stride.zone/'
      },
      {
        name: 'Helix',
        tvl: 22242391.77046,
        category: 'DEX',
        chains: ['Injective'],
        url: 'https://helixapp.com/'
      },
      {
        name: 'Hydro',
        tvl: 20082605.006,
        category: 'Derivatives',
        chains: ['Injective'],
        url: 'https://hydroprotocol.io/'
      },
      {
        name: 'Astroport',
        tvl: 30000000,
        category: 'DEX',
        chains: ['Injective', 'Terra', 'Neutron'],
        url: 'https://astroport.fi/'
      }
    ];
    
    const totalTVL = defaultProtocols.reduce((sum: number, p: any) => sum + (p.tvl || 0), 0);
    
    // Cache the default data
    protocolCache[cacheKey] = {
      data: defaultProtocols,
      timestamp: now
    };
    
    return createSuccessResponse({
      protocols: defaultProtocols,
      totalTVL,
      timestamp: now,
      count: defaultProtocols.length,
      note: "Using estimated data due to API unavailability"
    });
  } catch (error) {
    elizaLogger.error('Error fetching Injective TVL:', error);
    
    // Return default data on error
    const defaultProtocols = Object.values(COMMON_INJECTIVE_PROTOCOLS);
    const totalTVL = defaultProtocols.reduce((sum: number, p: any) => sum + (p.tvl || 0), 0);
    
    return createSuccessResponse({
      protocols: defaultProtocols,
      totalTVL,
      timestamp: Date.now(),
      count: defaultProtocols.length,
      note: "Using estimated data due to API error",
      error: (error as Error).message
    });
  }
}

/**
 * Get protocol data by name
 */
export async function getProtocolByName(params: { name: string }): Promise<StandardResponse> {
  try {
    if (!params.name) {
      return createErrorResponse("MissingParameter", "Protocol name is required");
    }
    
    const normalizedSearchName = normalizeProtocolName(params.name);
    elizaLogger.info(`Looking up protocol with normalized name: ${normalizedSearchName}`);
    elizaLogger.info(`Looking up protocol: ${params.name}`);
    
    // Try to get specific protocol data directly from DefiLlama
    try {
      // First check if we have a slug for this protocol
      let slug = '';
      
      // Check common protocols for a match
      const commonProtocolKey = Object.keys(COMMON_INJECTIVE_PROTOCOLS).find(key => 
        normalizeProtocolName(key) === normalizedSearchName || 
        normalizeProtocolName(COMMON_INJECTIVE_PROTOCOLS[key].name) === normalizedSearchName
      );
      
      if (commonProtocolKey) {
        // For known protocols, use their name as slug
        slug = normalizedSearchName;
      }
      
      // For specific protocols with known slugs
      if (normalizedSearchName === 'helix') {
        slug = 'helix';
      } else if (normalizedSearchName === 'hydro') {
        slug = 'hydro-protocol';
      }
      
      if (slug) {
        // Try to get protocol-specific data
        const protocolResponse = await api.get(`https://api.llama.fi/protocol/${slug}`);
        
        if (protocolResponse.data) {
          const protocolData = protocolResponse.data;
          
          // Extract Injective-specific TVL
          let tvl = 0;
          if (protocolData.currentChainTvls && protocolData.currentChainTvls.Injective) {
            tvl = protocolData.currentChainTvls.Injective;
          } else if (protocolData.chainTvls && protocolData.chainTvls.Injective) {
            tvl = protocolData.chainTvls.Injective;
          } else {
            // Fallback to total TVL if chain-specific not available
            tvl = protocolData.tvl || 0;
          }
          
          return createSuccessResponse({
            protocol: {
              name: protocolData.name,
              tvl: tvl,
              formattedTVL: formatCurrency(tvl),
              symbol: protocolData.symbol || '',
              category: protocolData.category || '',
              chains: protocolData.chains || ['Injective'],
              url: protocolData.url || '',
              description: protocolData.description || '',
              twitter: protocolData.twitter || '',
              logo: protocolData.logo || ''
            },
            timestamp: Date.now()
          });
        }
      }
    } catch (err) {
      elizaLogger.warn(`Failed to fetch specific protocol data for ${params.name}`, err);
      // Continue with fallback methods
    }
    
    // Check cache for all protocols
    const cacheKey = 'injective-tvl';
    const cachedData = protocolCache[cacheKey];
    const now = Date.now();
    
    let injectiveProtocols: any[] = [];
    
    if (cachedData && now - cachedData.timestamp < cacheExpiryMs) {
      elizaLogger.info('Using cached protocol data');
      injectiveProtocols = cachedData.data;
    } else {
      // Fetch all protocols from DefiLlama
      elizaLogger.info('Fetching protocols from DefiLlama API');
      const response = await api.get('https://api.llama.fi/protocols');
      
      if (response.data && Array.isArray(response.data)) {
        // Filter for Injective protocols
        injectiveProtocols = response.data.filter((protocol: any) => 
          protocol.chains && protocol.chains.includes('Injective')
        );
        
        // Cache the data
        protocolCache[cacheKey] = {
          data: injectiveProtocols,
          timestamp: now
        };
      } else {
        // Use default data if API fails
        injectiveProtocols = Object.values(COMMON_INJECTIVE_PROTOCOLS);
      }
    }
    
    // Try to find an exact match first
    let protocol = injectiveProtocols.find((p: any) => 
      normalizeProtocolName(p.name) === normalizedSearchName
    );
    
    // If no exact match, try partial match
    if (!protocol) {
      protocol = injectiveProtocols.find((p: any) => 
        normalizeProtocolName(p.name).includes(normalizedSearchName) || 
        (normalizedSearchName.length > 3 && normalizeProtocolName(p.name).includes(normalizedSearchName))
      );
    }
    
    // Check common protocols if still not found
    if (!protocol) {
      const commonProtocolKey = Object.keys(COMMON_INJECTIVE_PROTOCOLS).find(key => 
        normalizeProtocolName(key) === normalizedSearchName || 
        normalizeProtocolName(COMMON_INJECTIVE_PROTOCOLS[key].name) === normalizedSearchName
      );
      
      if (commonProtocolKey) {
        protocol = COMMON_INJECTIVE_PROTOCOLS[commonProtocolKey];
      }
    }
    
    if (protocol) {
      elizaLogger.info(`Found protocol: ${protocol.name}`);
      
      // Extract Injective-specific TVL if available
      let tvl = protocol.tvl || 0;
      if (protocol.chainTvls && protocol.chainTvls.Injective) {
        tvl = protocol.chainTvls.Injective;
      } else if (protocol.currentChainTvls && protocol.currentChainTvls.Injective) {
        tvl = protocol.currentChainTvls.Injective;
      }
      
      return createSuccessResponse({
        protocol: {
          name: protocol.name,
          tvl: tvl,
          formattedTVL: formatCurrency(tvl),
          symbol: protocol.symbol || '',
          category: protocol.category || '',
          chains: protocol.chains || ['Injective'],
          url: protocol.url || '',
          change_1d: protocol.change_1d || 0,
          change_7d: protocol.change_7d || 0
        },
        timestamp: now
      });
    }
    
    return createErrorResponse("ProtocolNotFound", `Protocol '${params.name}' not found on Injective`);
  } catch (error) {
    elizaLogger.error('Error fetching protocol by name:', error);
    
    // Check if we have this in our common protocols as fallback
    const normalizedSearchName = normalizeProtocolName(params.name);
    const commonProtocolKey = Object.keys(COMMON_INJECTIVE_PROTOCOLS).find(key => 
      normalizeProtocolName(key) === normalizedSearchName || 
      normalizeProtocolName(COMMON_INJECTIVE_PROTOCOLS[key].name) === normalizedSearchName
    );
    
    if (commonProtocolKey) {
      const protocol = COMMON_INJECTIVE_PROTOCOLS[commonProtocolKey];
      return createSuccessResponse({
        protocol: {
          name: protocol.name,
          tvl: protocol.tvl || 0,
          formattedTVL: formatCurrency(protocol.tvl || 0),
          symbol: protocol.symbol || '',
          category: protocol.category || '',
          chains: protocol.chains || ['Injective'],
          url: protocol.url || '',
          note: "Using estimated data due to API error"
        },
        timestamp: Date.now()
      });
    }
    
    return createErrorResponse("ApiError", `Error fetching protocol data: ${(error as Error).message}`);
  }
}

/**
 * Get yield pools on Injective
 */
export async function getInjectiveYieldPools(): Promise<StandardResponse> {
  try {
    const cacheKey = 'injective-yield-pools';
    const cachedData = protocolCache[cacheKey];
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < cacheExpiryMs) {
      elizaLogger.info('Using cached yield pool data');
      return createSuccessResponse({
        pools: cachedData.data,
        timestamp: cachedData.timestamp
      });
    }

    // Fetch yield pools from DefiLlama
    elizaLogger.info('Fetching yield pools from DefiLlama API');
    const response = await api.get('https://yields.llama.fi/pools');
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // Filter for Injective pools
      const injectivePools = response.data.data.filter((pool: any) => 
        pool.chain === 'Injective'
      ).map((pool: any) => ({
        pool: pool.pool,
        symbol: pool.symbol,
        tvlUsd: pool.tvlUsd,
        apy: pool.apy,
        project: pool.project,
        apyBase: pool.apyBase,
        apyReward: pool.apyReward,
        rewardTokens: pool.rewardTokens
      }));
      
      // Sort by APY descending
      injectivePools.sort((a: any, b: any) => b.apy - a.apy);
      
      // Cache the data
      protocolCache[cacheKey] = {
        data: injectivePools,
        timestamp: now
      };
      
      elizaLogger.info(`Found ${injectivePools.length} yield pools on Injective`);
      
      return createSuccessResponse({
        pools: injectivePools,
        count: injectivePools.length,
        timestamp: now
      });
    }
    
    // Return empty array if no pools found
    return createSuccessResponse({
      pools: [],
      count: 0,
      timestamp: now,
      note: "No yield pools found or API unavailable"
    });
  } catch (error) {
    elizaLogger.error('Error fetching yield pools:', error);
    return createErrorResponse("ApiError", `Error fetching yield pools: ${(error as Error).message}`);
  }
}

/**
 * Get top protocols on Injective by TVL
 */
export async function getTopInjectiveProtocols(params: { limit?: number }): Promise<StandardResponse> {
  try {
    const limit = params.limit || 10;
    
    // Get all protocols first
    const response = await getInjectiveTVL();
    
    if (response.success && response.result && response.result.protocols) {
      // Sort by TVL and limit
      const topProtocols = response.result.protocols
        .sort((a: any, b: any) => b.tvl - a.tvl)
        .slice(0, limit)
        .map((protocol: any) => ({
          name: protocol.name,
          tvl: protocol.tvl,
          formattedTVL: formatCurrency(protocol.tvl),
          category: protocol.category || '',
          url: protocol.url || ''
        }));
      
      elizaLogger.info(`Returning top ${topProtocols.length} protocols out of ${response.result.protocols.length}`);
      
      return createSuccessResponse({
        protocols: topProtocols,
        totalProtocols: response.result.protocols.length,
        totalTVL: response.result.totalTVL,
        formattedTotalTVL: formatCurrency(response.result.totalTVL),
        timestamp: response.result.timestamp
      });
    }
    
    // If the main call failed, use default data
    const defaultProtocols = Object.values(COMMON_INJECTIVE_PROTOCOLS)
      .sort((a: any, b: any) => b.tvl - a.tvl)
      .slice(0, limit)
      .map((protocol: any) => ({
        name: protocol.name,
        tvl: protocol.tvl,
        formattedTVL: formatCurrency(protocol.tvl),
        category: protocol.category || '',
        url: protocol.url || ''
      }));
    
    const totalTVL = defaultProtocols.reduce((sum: number, p: any) => sum + (p.tvl || 0), 0);
    
    return createSuccessResponse({
      protocols: defaultProtocols,
      totalProtocols: Object.keys(COMMON_INJECTIVE_PROTOCOLS).length,
      totalTVL,
      formattedTotalTVL: formatCurrency(totalTVL),
      timestamp: Date.now(),
      note: "Using estimated data due to API unavailability"
    });
  } catch (error) {
    elizaLogger.error('Error fetching top protocols:', error);
    return createErrorResponse("ApiError", `Error fetching top protocols: ${(error as Error).message}`);
  }
} 