# System Overview

Ready to peek under the hood of InjectHive? Let's explore the tech that makes our platform tick. We'll walk you through our key design choices and the architecture that powers our AI-driven DeFi automation on Injective. For a deeper understanding, check out our [Multi-Agent System](./multi-agent-system.md) architecture or see our agents in action in the [User Guide](./user-guide.md).

## Core Design Principles

We built InjectHive with four key principles in mind:

- **Modularity** 🧩  
  Everything's built in neat, swappable pieces. Need to add or update something? No problem - just plug it in!

- **Scalability** 📈  
  Thanks to Injective's Layer 1 capabilities and EVM compatibility, we can handle growing demands and high transaction volumes without breaking a sweat.

- **Efficiency & Security** 🔒  
  Every transaction is optimized for speed and safety, with real-time data feeds and robust error handling built right in.

- **Smart Automation** 🤖  
  Our multi-agent system splits tasks among specialized helpers, making sure everything runs smoothly in parallel.

## Tech Stack

Here's what powers InjectHive:

- **Core Tech:**  
  - Node.js (v23+) for the runtime
  - TypeScript (with strict mode) for type safety

- **Key Frameworks:**  
  - ElizaOS running the core operations
  - Next.js for our web framework
  - Shadcn UI & TailwindCSS making everything look good
  - Vite speeding up development

- **Blockchain & Data:**  
  - Ethers.js/Web3.js talking to Injective's blockchain
  - CoinGecko & DefiLlama feeding us real-time data

- **Workflow Magic:**  
  - n8n orchestrating our multi-agent system

## How It All Fits Together

### Action Framework
Think of this as InjectHive's brain - it coordinates every task, whether you're swapping tokens or checking market stats. Everything happens efficiently and in the right order.

### Provider System
This is how we connect to essential services:
- **Wallet Provider:** Handles your transactions safely
- **Token Provider:** Keeps track of token data and transfers
- **Data Providers:**  
  - CoinGecko for price info
  - DefiLlama for TVL metrics and analytics

## Built for Flexibility

InjectHive is designed to grow with you:
- **18 Specialized Agents:** Each one's an expert at specific DeFi tasks
- **Easy to Extend:** Add new features without breaking what's already working
- **Your Control:** Run your own instance and keep full control of your setup

## What's Next?

Want to see how our agents work together in real life? Check out our [Multi-Agent System](./multi-agent-system.md) for the nitty-gritty details.

Ready to dive deeper? Explore our [Integrations](./integrations.md) to see how we connect with the Injective ecosystem!
