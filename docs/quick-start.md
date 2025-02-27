# Quick Start Guide

Ready to dive into InjectHive? Awesome! Whether you're here to tinker with the code, build something cool, or just explore what our AI-powered DeFi platform can do, we'll get you up and running in no time.

## Before We Start

You'll need a few things installed:
- **Node.js** (version 23 or newer)
- **pnpm** (our package manager of choice)
  ```bash
  npm install -g pnpm
  ```
- **Git** (for grabbing the code)
- **Some coding know-how** (mainly TypeScript/Node.js basics)

## Let's Get Started!

### 1. Grab the Code
First, let's clone the repo and hop into the right folder:
```bash
git clone https://github.com/nicoware-dev/injecthive
cd injecthive/eliza
```

### 2. Install the Good Stuff
```bash
pnpm install --no-frozen-lockfile
```

### 3. Set Up Your Secret Sauce
Copy our example config file:
```bash
cp .env.example .env
```

Now, add your credentials to the `.env` file:
```env
# Your Injective essentials
EVM_PRIVATE_KEY=your_private_key
EVM_PROVIDER_URL=https://injective.drpc.org

# Pick your AI brain
OPENAI_API_KEY=your_openai_api_key
```

### 4. Build It
```bash
pnpm build
```

### 5. Fire It Up!

#### Want to test just one agent?
```bash
pnpm start --characters="characters/demo-agent.character.json"
```

#### Ready for the whole crew?
```bash
pnpm start --characters="characters/demo-agent.character.json,characters/metrics-agent.character.json,characters/sales-agent.character.json,characters/meme-agent.character.json,characters/injective-expert-agent.character.json"
```

### 6. Launch the Web Interface
Open a new terminal and run:
```bash
cd client
pnpm run dev
```

You'll find your shiny new web interface at `http://localhost:3000` (unless your computer says otherwise).

## What's Next?

### Explore the Code
Take a peek around the `eliza` directory – that's where all the magic happens. Check out our [System Overview](./system-overview.md) to understand the architecture, or dive into our [Multi-Agent System](./multi-agent-system.md) to see how it all works together.

### Check Out the Docs
Got questions? Our docs folder is packed with helpful info and tips.

### Join the Fun
Need a hand or want to chat? Jump into our [Discord](https://discord.gg/xv7bcRpgUw) – we're a friendly bunch!

That's it! You're all set to start your InjectHive journey. Happy building! 🚀
