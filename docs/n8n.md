# n8n Workflows

Let's explore how we use n8n to make our AI agents work together like a well-oiled machine. These workflows are like the conductors of an orchestra, making sure every agent plays their part perfectly! Want to understand the bigger picture? Check out our [Multi-Agent System](./multi-agent-system.md) architecture or see our [System Overview](./system-overview.md).

## What's an n8n Workflow? 🤔

Think of these workflows as smart traffic controllers that:
- Catch and understand incoming requests
- Send tasks to the right AI agent for the job
- Package up the responses nicely
- Keep everything connected

## Our Key Workflows 🔑

We've got some super helpful workflow files ready for you:

- **coordinator-agent.json** 🎯  
  The maestro of our system! This workflow keeps all our agents working in harmony.
  
- **eliza-agent-tool.json** 🛠️  
  Connects our eliza agents to n8n through HTTP using the REST API.

## Setting Things Up 🚀

1. **Import Your Workflow** 📥  
   - Grab the JSON workflow file you want to use
   - Head to your n8n setup
   - Pop that file into your workflows section

2. **Set Up Your Credentials** 🔐  
   - Add your agent's API endpoint to the HTTP Request node
   - Put in your credentials (like blockchain access, OpenAI API key)
   - Make sure everything's properly configured

3. **Connect to the Coordinator** 🔌  
   - Add your workflow as a tool in the main coordinator
   - Double-check all your agent connections
   - Make sure everything can talk to each other

4. **Test and Watch** 👀  
   - Run some test requests
   - Keep an eye on those execution logs
   - Fine-tune things if needed

## Best Practices 💡

- **Endpoint Updates** 🎯  
  Remember to update those API endpoint URLs in your HTTP Request nodes to match your setup.

- **Error Handling** 🛡️  
  We've built in error handling to catch any hiccups and give clear feedback.

- **Room to Grow** 📈  
  Add or tweak workflows without breaking the whole system - it's all modular!

## Why This Matters 🌟

By using n8n workflows, InjectHive makes sure every request gets handled by exactly the right agent at the right time. It's like having a super-smart assistant making sure everything runs smoothly!

Ready to start building your workflows? Let's make some automation magic happen! ✨
