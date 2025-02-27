# InjectHive Plugin

A comprehensive plugin for interacting with the Injective blockchain ecosystem, providing essential DeFi functionality and data integration. This plugin enables seamless interaction with Injective's blockchain features, including wallet operations, staking, governance, and exchange functionality.

## Features

### Core Actions

1. **Wallet Operations**
   - Native INJ token balance checking
   - Wallet address retrieval
   - Token supply information
   - Portfolio tracking

2. **Staking Operations**
   - List validators
   - View staking information
   - Delegations management
   - Staking rewards tracking

3. **Governance**
   - View proposals
   - Check voting power
   - Vote on proposals
   - Governance parameters

4. **Exchange and Trading**
   - Market information
   - Order book display
   - Trading statistics
   - Fee discount information

5. **Blockchain Explorer**
   - Network statistics
   - Recent blocks
   - Transaction lookup
   - Account information

6. **DeFi Metrics**
   - TVL information
   - Protocol comparison
   - Price information
   - Market trends analysis

7. **Advanced Operations**
   - Fee discount information
   - Trading rewards
   - Module parameters
   - Network upgrades

### Providers

1. **Wallet Provider**
   - Injective network configuration
   - Transaction management
   - Balance tracking
   - Token support

2. **CoinGecko Provider**
   - Real-time cryptocurrency prices
   - Token metadata and information
   - Market metrics
   - Historical price data

3. **DefiLlama Provider**
   - Protocol TVL tracking
   - DeFi protocol analytics
   - Chain-specific metrics
   - Ecosystem performance

4. **Explorer Provider**
   - Block information
   - Transaction details
   - Network statistics
   - Chain activity monitoring

## Project Structure

```
injective-sdk-client-ts/
├── src/
│   ├── grpc/                  # GRPC client base
│   ├── modules/               # Module-specific functionality
│   │   ├── auction.ts         # Auction module actions
│   │   ├── auth.ts            # Auth module actions
│   │   ├── bank.ts            # Bank module actions
│   │   ├── distribution.ts    # Distribution module actions
│   │   ├── exchange.ts        # Exchange module actions
│   │   ├── explorer.ts        # Explorer module actions
│   │   ├── gov.ts             # Governance module actions
│   │   ├── staking.ts         # Staking module actions
│   │   └── ...                # Other module files
│   ├── types/                 # Type definitions
│   └── utils/                 # Utility functions
├── actions/                   # Plugin actions
│   ├── erc20Transfer/         # ERC20 token transfer
│   ├── transfer-inj/          # INJ transfer
│   ├── portfolio/             # Portfolio management
│   └── ...                    # Other actions
├── providers/                 # Data providers
│   ├── coingecko/             # CoinGecko price data
│   ├── defillama/             # DefiLlama TVL data
│   ├── wallet/                # Injective wallet
│   └── ...                    # Other providers
└── templates/                 # Response templates
```

## Example Prompts

Here are some example prompts you can use to interact with the InjectHive plugin:

### Basic Prompts

```
Show my INJ balance
Show my Injective wallet address
Get the total supply of INJ tokens
List top 5 validators on Injective by voting power
Display Injective network statistics
Show 5 most recent blocks on Injective
Look up transaction 988B8BD0D199C9B1E5FFE16AE0B5F1BAFAF041365E2C2740AE85D7BE25F0ABC1
Display fee discounts on Injective Exchange
Show current trading rewards campaign on Injective
Show exchange module parameters on Injective
Tell me about Injective
Search for latest news on Injective ecosystem
```

### Advanced Prompts

```
Display all my token balances on Injective
Display current staking pool information on Injective
Display my current staking delegations on Injective
Show active governance proposals on Injective
Display details for proposal #123
Show price and trading volume for INJ/USDT
Display order book for BTC/USDT market
Show Total Value Locked in Injective ecosystem
Stake 10 INJ with validator 'Neptune Foundation'
Send 5 INJ to inj1abc...xyz
Get current prices for BTC, ETH, and INJ
Analyze my portfolio performance on Injective
```

## Environment Variables

To use this plugin, you need to add the following environment variables to your `.env` file:

```
# Required for Injective operations
INJECTIVE_PRIVATE_KEY=your_private_key_with_0x_prefix
INJECTIVE_NETWORK=Mainnet  # or Testnet

# Optional - for enhanced functionality
COINGECKO_API_KEY=your_coingecko_api_key
DEFILLAMA_API_KEY=your_defillama_api_key
```

Note: The private key must include the "0x" prefix.

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues to improve the plugin's functionality.

## License

MIT
