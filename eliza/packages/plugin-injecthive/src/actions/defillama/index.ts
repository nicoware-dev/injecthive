import { Action, ActionExample, Memory, State, IAgentRuntime, HandlerCallback } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { 
  getInjectiveTVL, 
  getProtocolByName, 
  getTopInjectiveProtocols 
} from './module';

// Create a simple example
const exampleUser: ActionExample = {
  user: "user",
  content: {
    text: "What is the TVL on Injective?",
  }
};

// Helper function to extract protocol name from message
function extractProtocolName(messageText: string): string {
  const lowerText = messageText.toLowerCase();
  
  // Common protocol names to check for - expanded list
  const commonProtocols = [
    "helix", "astroport", "hydro", "gate.io", "portal", 
    "axelar", "trustake", "stride", "wormhole", "neutron",
    "kado money", "kado", "white whale", "whitewhale", "levana",
    "sei", "osmosis", "cosmos", "injective", "inj"
  ];
  
  // First check for exact matches of common protocols
  for (const protocol of commonProtocols) {
    if (lowerText.includes(protocol)) {
      return protocol;
    }
  }
  
  // Try different regex patterns to extract protocol names
  
  // Pattern 1: "of X protocol" or "of the X protocol"
  const ofPattern = /(?:of|about|for)\s+(?:the\s+)?([a-z0-9\s.]+?)(?:\s+protocol|\s+on\s+injective|\s+in\s+injective|\s*\?|$)/i;
  const ofMatch = lowerText.match(ofPattern);
  if (ofMatch && ofMatch[1]) {
    return ofMatch[1].trim();
  }
  
  // Pattern 2: "X protocol TVL" or "X's TVL"
  const protocolTvlPattern = /([a-z0-9\s.]+?)(?:'s|\s+protocol)?\s+(?:tvl|total value locked)/i;
  const protocolTvlMatch = lowerText.match(protocolTvlPattern);
  if (protocolTvlMatch && protocolTvlMatch[1]) {
    return protocolTvlMatch[1].trim();
  }
  
  // Pattern 3: "what is X" where X might be a protocol
  const whatIsPattern = /what(?:'s| is) (?:the )?([a-z0-9\s.]+?)(?:\?|$)/i;
  const whatIsMatch = lowerText.match(whatIsPattern);
  if (whatIsMatch && whatIsMatch[1] && !whatIsMatch[1].includes("tvl")) {
    return whatIsMatch[1].trim();
  }
  
  // Pattern 4: "show me X" or "tell me about X"
  const showMePattern = /(?:show|tell) (?:me|us) (?:about )?(?:the )?([a-z0-9\s.]+?)(?:\?|$)/i;
  const showMeMatch = lowerText.match(showMePattern);
  if (showMeMatch && showMeMatch[1] && !showMeMatch[1].includes("tvl")) {
    return showMeMatch[1].trim();
  }
  
  return "";
}

// Define actions with improved implementation
export const GetInjectiveTVLAction: Action = {
  name: "GET_INJECTIVE_TVL",
  description: "Get the total value locked (TVL) for the Injective ecosystem",
  similes: [
    "GET_INJECTIVE_TVL", 
    "SHOW_INJECTIVE_TVL", 
    "DISPLAY_INJECTIVE_TVL", 
    "CHECK_INJECTIVE_TVL", 
    "FETCH_INJECTIVE_TVL",
    "GET_TVL",
    "SHOW_TVL",
    "CHECK_TVL",
    "FETCH_TVL",
    "TVL_CHECK",
    "INJECTIVE_TVL",
    "TOTAL_VALUE_LOCKED",
    "ECOSYSTEM_TVL",
    "CHAIN_TVL"
  ],
  examples: [[exampleUser]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info(`DefiLlama action: GET_INJECTIVE_TVL triggered`);
    
    try {
      // First message to indicate we're looking up the data
      if (callback) {
        callback({
          text: `I'll check the current Total Value Locked (TVL) in the Injective ecosystem for you. Just a moment while I fetch the latest data...`
        });
      }
      
      // Call the module function
      const response = await getInjectiveTVL();
      
      if (!response.success) {
        elizaLogger.error(`DefiLlama TVL error: ${response.error?.message}`);
        if (callback) {
          callback({
            text: `I couldn't retrieve the TVL data for Injective. There was an error: ${response.error?.message}`
          });
        }
        return true;
      }
      
      // Format the response for the user
      const totalTVL = response.result.totalTVL || 0;
      const protocolCount = response.result.protocols?.length || 0;
      
      const formattedTVL = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(totalTVL);
      
      let responseText = `The total value locked (TVL) in the Injective ecosystem is currently ${formattedTVL} across ${protocolCount} protocols.`;
      
      // Add note if using default data
      if (response.result.isDefaultData) {
        responseText += `\n\n*Note: This data is estimated and may not reflect real-time values as I'm currently unable to connect to the DefiLlama API.*`;
      }
      
      if (callback) {
        callback({
          text: responseText,
          content: response.result
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error(`Error in GET_INJECTIVE_TVL handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving the TVL data for Injective."
        });
      }
      return true;
    }
  }
};

export const GetProtocolByNameAction: Action = {
  name: "GET_PROTOCOL_BY_NAME",
  description: "Get information about a specific protocol by name",
  similes: [
    "GET_PROTOCOL_BY_NAME", 
    "SHOW_PROTOCOL_BY_NAME", 
    "DISPLAY_PROTOCOL_BY_NAME", 
    "CHECK_PROTOCOL_BY_NAME", 
    "FETCH_PROTOCOL_BY_NAME",
    "GET_PROTOCOL_INFO",
    "SHOW_PROTOCOL_INFO",
    "CHECK_PROTOCOL_INFO",
    "FETCH_PROTOCOL_INFO",
    "PROTOCOL_INFO",
    "PROTOCOL_DATA",
    "PROTOCOL_DETAILS",
    "PROTOCOL_TVL",
    "SPECIFIC_PROTOCOL_TVL"
  ],
  examples: [[{
    user: "user",
    content: {
      text: "What's the TVL of Helix protocol?",
    }
  }]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info(`DefiLlama action: GET_PROTOCOL_BY_NAME triggered`);
    
    try {
      // Extract protocol name from message
      const messageText = message.content.text;
      const protocolName = extractProtocolName(messageText);
      
      if (!protocolName) {
        if (callback) {
          callback({
            text: "I'd be happy to provide information about a specific protocol. Could you please specify which protocol you're interested in?"
          });
        }
        return true;
      }
      
      elizaLogger.info(`Looking up protocol: ${protocolName}`);
      
      // First message to indicate we're looking up the data
      if (callback) {
        callback({
          text: `I'll look up the information for ${protocolName.charAt(0).toUpperCase() + protocolName.slice(1)}. One moment while I fetch the latest data...`
        });
      }
      
      // Call the module function
      const response = await getProtocolByName({ name: protocolName });
      
      if (!response.success || !response.result.protocol) {
        elizaLogger.warn(`Protocol not found: ${protocolName}`);
        if (callback) {
          callback({
            text: `I couldn't find information about ${protocolName}. It might not be tracked by DefiLlama or might be spelled differently. Would you like to see the top protocols on Injective instead?`
          });
        }
        return true;
      }
      
      const protocol = response.result.protocol;
      
      // Format TVL with commas
      const formattedTVL = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(protocol.tvl || 0);
      
      // Construct response in a more conversational way
      let responseText = `Here's what I found about **${protocol.name}**:\n\n`;
      responseText += `The current Total Value Locked (TVL) is ${formattedTVL}. `;
      
      if (protocol.category) {
        responseText += `It's categorized as a ${protocol.category} protocol. `;
      }
      
      if (protocol.chains && Array.isArray(protocol.chains)) {
        if (protocol.chains.length === 1) {
          responseText += `It operates on the ${protocol.chains[0]} blockchain. `;
        } else {
          responseText += `It operates across multiple blockchains including ${protocol.chains.join(', ')}. `;
        }
      }
      
      if (protocol.symbol) {
        responseText += `The protocol's token symbol is ${protocol.symbol}. `;
      }
      
      if (protocol.url) {
        responseText += `\n\nYou can learn more at their website: ${protocol.url}`;
      }
      
      if (protocol.isCustomData) {
        responseText += `\n\n*Note: This data is estimated and may not reflect real-time values.*`;
      }
      
      if (callback) {
        callback({
          text: responseText,
          content: response.result
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error(`Error in GET_PROTOCOL_BY_NAME handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving protocol information. Would you like to try again or check the overall Injective TVL instead?"
        });
      }
      return true;
    }
  }
};

export const GetTopProtocolsAction: Action = {
  name: "GET_TOP_PROTOCOLS",
  description: "Get the top protocols on Injective by TVL",
  similes: [
    "GET_TOP_PROTOCOLS", 
    "SHOW_TOP_PROTOCOLS", 
    "DISPLAY_TOP_PROTOCOLS", 
    "CHECK_TOP_PROTOCOLS", 
    "FETCH_TOP_PROTOCOLS",
    "TOP_PROTOCOLS",
    "LARGEST_PROTOCOLS",
    "BIGGEST_PROTOCOLS",
    "HIGHEST_TVL_PROTOCOLS",
    "PROTOCOL_RANKING",
    "PROTOCOL_LEADERBOARD",
    "TVL_RANKING",
    "TVL_LEADERBOARD"
  ],
  examples: [[{
    user: "user",
    content: {
      text: "What are the top 5 protocols on Injective by TVL?",
    }
  }]],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info(`DefiLlama action: GET_TOP_PROTOCOLS triggered`);
    
    try {
      // Extract limit from message if present
      const messageText = message.content.text.toLowerCase();
      let limit = 5; // Default limit
      
      // Try to extract a number from the message
      const numberMatch = messageText.match(/\b(\d+)\b/);
      if (numberMatch && numberMatch[1]) {
        const extractedNumber = parseInt(numberMatch[1], 10);
        if (!isNaN(extractedNumber) && extractedNumber > 0 && extractedNumber <= 20) {
          limit = extractedNumber;
        }
      }
      
      // First message to indicate we're looking up the data
      if (callback) {
        callback({
          text: `I'll find the top ${limit} protocols on Injective by Total Value Locked (TVL). One moment while I gather that information...`
        });
      }
      
      // Call the module function
      const response = await getTopInjectiveProtocols({ limit });
      
      if (!response.success) {
        elizaLogger.error(`DefiLlama top protocols error: ${response.error?.message}`);
        if (callback) {
          callback({
            text: `I couldn't retrieve the top protocols on Injective. There was an error: ${response.error?.message}`
          });
        }
        return true;
      }
      
      const { protocols, totalCount } = response.result;
      
      if (protocols.length === 0) {
        if (callback) {
          callback({
            text: "I couldn't find any protocols on Injective tracked by DefiLlama."
          });
        }
        return true;
      }
      
      // Construct response in a more conversational way
      let responseText = `Here are the top ${protocols.length} protocols on Injective by TVL:\n\n`;
      
      protocols.forEach((protocol: any, index: number) => {
        const formattedTVL = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(protocol.tvl || 0);
        
        responseText += `${index + 1}. **${protocol.name}**: ${formattedTVL}\n`;
      });
      
      if (totalCount > protocols.length) {
        responseText += `\nThese are ${protocols.length} out of ${totalCount} protocols currently on Injective. Would you like information about a specific protocol?`;
      }
      
      // Add note if using default data
      if (protocols.some((p: any) => p.isDefaultData)) {
        responseText += `\n\n*Note: Some of this data is estimated and may not reflect real-time values.*`;
      }
      
      if (callback) {
        callback({
          text: responseText,
          content: response.result
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error(`Error in GET_TOP_PROTOCOLS handler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (callback) {
        callback({
          text: "I'm sorry, I encountered an error while retrieving the top protocols on Injective. Would you like to try again or check the overall Injective TVL instead?"
        });
      }
      return true;
    }
  }
};

// Export all actions
export const DefiLlamaActions: Action[] = [
  GetInjectiveTVLAction,
  GetProtocolByNameAction,
  GetTopProtocolsAction
]; 