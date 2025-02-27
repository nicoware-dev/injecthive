# 🏠 Self-Hosting

InjectHive is built to be fully self-hosted, giving you complete control over your data and operations. Follow this guide to set up and run your own instance of InjectHive on your server or local machine. For a quick overview of what you'll be running, check out our [System Overview](./system-overview.md) or see our [Features](./features.md) list.

## Prerequisites

- **Server/Cloud Instance or Local Machine:** (e.g., AWS, DigitalOcean, or your own PC)
- **Node.js:** Version 23+ installed
- **Git:** To clone the repository
- **pnpm:** Install globally with `npm install -g pnpm`
- **Basic Knowledge:** Familiarity with TypeScript/Node.js is recommended
- **API Keys:** For Injective operations (e.g., EVM_PRIVATE_KEY, OPENAI_API_KEY, etc.)

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/PLACEHOLDER/injecthive
cd injecthive/eliza
```

### 2. Install Dependencies
```bash
pnpm install --no-frozen-lockfile
```

### 3. Set Up Environment Variables
Copy the example file:
```bash
cp .env.example .env
```

Edit the `.env` file and fill in your credentials:
```env
# Required for Injective operations
EVM_PRIVATE_KEY=your_private_key
EVM_PROVIDER_URL=https://injective.drpc.org

# Choose an API provider and add the API_KEY
OPENAI_API_KEY=your_openai_api_key

# Optional: Enhanced Features
ANTHROPIC_API_KEY=your_anthropic_api_key    # Optional
```

## Running Your Instance

### 1. Build the Project
```bash
pnpm build
```

### 2. Start the Agent(s)

#### For Testing (Single Agent)
```bash
pnpm start --characters="characters/demo-agent.character.json"
```

#### For Full Swarm Deployment
```bash
pnpm start --characters="characters/coordinator.character.json,characters/metrics-agent.character.json,characters/sales-agent.character.json,characters/meme-agent.character.json,characters/nfts-agent.character.json,characters/alpha-agent.character.json,characters/analyst-agent.character.json,characters/trading-agent.character.json,characters/wallet-agent.character.json,characters/dao-agent.character.json,characters/defi-agent.character.json,characters/demo-agent.character.json,characters/kol-agent.character.json,characters/token-deployer-agent.character.json,characters/nft-deployer-agent.character.json,characters/injective-expert-agent.character.json,characters/predictions-agent.character.json,characters/advisor-agent.character.json"
```

### 3. Run the Web Client
Open a new terminal window:
```bash
cd client
pnpm run dev
```

Your web client will be available at a local URL (usually `http://localhost:3000`) or your server's address.

## Support & Maintenance

### Community Support
Need help? Join our [Discord](https://discord.gg/xv7bcRpgUw) for real-time assistance and community discussions.

### Regular Updates
Keep your instance up to date:
- Regularly pull updates from the repository
- Check for new features and improvements
- Apply security updates when available

### Documentation
For troubleshooting and advanced configuration:
- Review our technical documentation
- Check the [plugin documentation](plugin.md)
- Explore our [development guides](./quick-start.md)

Enjoy full control over your InjectHive instance and make the most of a self-hosted, AI-powered DeFi experience on Injective! 🚀