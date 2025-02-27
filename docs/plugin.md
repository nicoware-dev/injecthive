# ElizaOS Plugin for InjectHive

The ElizaOS Plugin for Injective is the bridge that connects your InjectHive agents to the Injective blockchain ecosystem. It provides a comprehensive set of tools and integrations that enable your agents to interact with Injective's DeFi features, access market data, and execute blockchain operations.

## Capabilities

### Core Actions
- **Wallet Operations:**
  - Manage INJ and ERC20 tokens
  - View wallet balances and addresses
  - Check token supply information
  - Track portfolio performance

- **Blockchain Interactions:**
  - Staking and validator management
  - Governance participation
  - Exchange and trading operations
  - Transaction tracking and verification

- **Explorer Functions:**
  - Network statistics monitoring
  - Block and transaction lookup
  - Chain activity analysis

### Data Providers
- **Wallet Provider:**
  - Injective network configuration
  - Transaction management
  - Balance tracking
  - Secure key management

- **Market Data:**
  - **CoinGecko:** Real-time price data, token information, and market metrics
  - **DefiLlama:** Protocol TVL tracking, DeFi analytics, and ecosystem metrics
  - **Explorer:** Block information, transaction details, and network statistics

## Key Benefits

The ElizaOS Plugin for Injective streamlines your DeFi experience by:
- Abstracting complex blockchain interactions into simple commands
- Providing real-time, accurate market and blockchain data
- Enabling secure transaction execution and wallet management
- Supporting multiple protocols and data sources in one unified interface

## Getting Started

1. **Setup**  
   Add the following to your `.env` file:
   ```
   # Required for Injective operations
   INJECTIVE_PRIVATE_KEY=your_private_key_with_0x_prefix
   INJECTIVE_NETWORK=Mainnet  # or Testnet

   # Optional - for enhanced functionality
   COINGECKO_API_KEY=your_coingecko_api_key
   DEFILLAMA_API_KEY=your_defillama_api_key
   ```

2. **Using the Plugin**  
   The plugin works seamlessly with your agents. Here are some example commands you can use:
   ```
   Show my INJ balance
   Display Injective network statistics
   List top 5 validators on Injective by voting power
   Show 5 most recent blocks on Injective
   Look up transaction 988B8BD0D199C9B1E5FFE16AE0B5F1BAFAF041365E2C2740AE85D7BE25F0ABC1
   ```

3. **Advanced Usage**  
   The plugin supports more complex operations like:
   ```
   Display fee discounts on Injective Exchange
   Show current trading rewards campaign on Injective
   Show exchange module parameters on Injective
   ```

## Architecture

The plugin is built with a modular architecture that separates concerns into:
- **GRPC Client Base:** Handles communication with Injective's blockchain nodes
- **Module-specific Functionality:** Organized by blockchain module (bank, staking, governance, etc.)
- **Actions:** High-level operations that agents can perform
- **Providers:** Data sources and service integrations
- **Templates:** Response formatting for consistent user experience

## Extending the Plugin

The plugin's modular design makes it easy to extend with new features:
1. Add new module functionality in the appropriate module file
2. Create new actions that leverage the module functionality
3. Update or create templates for formatting responses
4. Register new actions in the plugin's main export

For more detailed information about our agents and their capabilities, check out our [Agents Directory](./agents.md) or see our [Integrations](./integrations.md) with various protocols.

Happy automating! 🚀
