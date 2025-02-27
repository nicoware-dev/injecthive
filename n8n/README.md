# N8N Workflows for Eliza Agents

This directory contains N8N workflow configurations for all Eliza agents coordination using an n8n based coordinator agent. Each workflow is designed to be imported into N8N and connected to the Coordinator Agent.

## Available Workflows

- `coordinator-agent.json` - Main coordinator workflow
- `eliza-agent-tool.json` - Eliza agent tool workflow

## Usage

1. Import the desired workflow JSON file into your N8N instance
2. Configure the required credentials (OpenAI API key, etc.)
3. Update the HTTP Request node with your Eliza agent's API endpoint
4. Add the workflow as a tool in the coordinator workflow

## Configuration

Each workflow follows the same basic structure as the Injective Expert Agent workflow:

- HTTP Endpoint for receiving requests
- Message processing logic
- Response formatting
- Error handling

The only configuration needed is updating the API endpoint URL in the HTTP Request node to point to your specific agent's API endpoint. 
