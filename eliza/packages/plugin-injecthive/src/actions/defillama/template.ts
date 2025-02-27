import { 
  getInjectiveTVL, 
  getProtocolByName, 
  getInjectiveYieldPools, 
  getTopInjectiveProtocols 
} from './module';

export const getInjectiveTVLTemplate = `
Get the total value locked (TVL) for the Injective ecosystem.
`;

export const getProtocolByNameTemplate = `
Get detailed information about a specific DeFi protocol.

Required parameters:
- name: The name of the protocol (e.g., "helix", "astroport")
`;

export const getInjectiveYieldPoolsTemplate = `
Get information about yield pools on Injective.
`;

export const getTopInjectiveProtocolsTemplate = `
Get information about the top protocols on Injective by TVL.

Optional parameters:
- limit: The number of protocols to return (default: 10)
`; 