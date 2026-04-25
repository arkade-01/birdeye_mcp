# Birdeye MCP Server

A plug-and-play [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives AI agents instant access to real-time onchain data from [Birdeye](https://birdeye.so) — no custom API calls needed.

Built for agents that need token prices, market data, security checks, trade history, and more across 11 blockchains.

🌐 **Live server:** `https://birdeye-mcp.onrender.com`

---

## What It Does

Instead of writing Birdeye API calls from scratch every time, your agent connects once and gets 22 ready-to-use tools covering:

- Token prices, overviews, and metadata
- Security and rug checks
- OHLCV candlestick data
- Trade history by token or pair
- Trending tokens and new listings
- Top traders
- Token search
- Market and pair data

All tools work across **Solana, Ethereum, Arbitrum, Avalanche, BSC, Optimism, Polygon, Base, zkSync, SUI, and Monad**.

---

## Prerequisites

- Node.js 18+
- A [Birdeye API key](https://bds.birdeye.so)

---

## Running Locally

**1. Clone the repo**
```bash
git clone https://github.com/arkade-01/birdeye_mcp.git
cd birdeye_mcp
```

**2. Install dependencies**
```bash
npm install
```

**3. Build**
```bash
npm run build
```

**4. Run**
```bash
npm start
```

The server starts on port `3000` by default. Set `PORT` in your environment to change it.

**5. Test it's running**
```bash
curl http://localhost:3000/health
# returns: {"status":"ok"}
```

**6. Test a tool call**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "x-birdeye-api-key: your_key_here" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_token_price",
      "arguments": {
        "address": "So11111111111111111111111111111111111111112",
        "chain": "solana"
      }
    },
    "id": 1
  }'
```

**7. Test with MCP Inspector**
```bash
npm run inspect
```
Then in the browser UI:
- Transport: **Streamable HTTP**
- URL: `http://localhost:3000/mcp`
- Headers: `x-birdeye-api-key: your_key_here`

---

## Authentication

Every request requires your Birdeye API key passed once as a header — not per tool call:

```
x-birdeye-api-key: your_key_here
```

---

## Connecting Your Agent

### Using the Hosted Server

Skip the local setup entirely and point your agent at the live server:
```
https://birdeye-mcp.onrender.com/mcp
```

---

### VS Code (GitHub Copilot Agent Mode)

Add this to your `.vscode/mcp.json` or VS Code MCP settings:

```jsonc
{
  "servers": {
    "Birdeye": {
      "url": "https://birdeye-mcp.onrender.com/mcp",
      "type": "http",
      "headers": {
        "x-birdeye-api-key": "${input:birdeyeApiKey}"
      }
    }
  },
  "inputs": [
    {
      "id": "birdeyeApiKey",
      "type": "promptString",
      "description": "Your Birdeye API key",
      "password": true
    }
  ]
}
```

Then:
1. Open command palette — `Ctrl+Shift+P`
2. Run **MCP: List Servers** → connect Birdeye
3. Enter your API key when prompted
4. Open Copilot chat in **Agent mode** and start asking questions

---

### Cursor

Add this to your Cursor MCP settings:

```jsonc
{
  "servers": {
    "Birdeye": {
      "url": "https://birdeye-mcp.onrender.com/mcp",
      "type": "http",
      "headers": {
        "x-birdeye-api-key": "your_key_here"
      }
    }
  }
}
```

---

### Windsurf

Add this to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "birdeye": {
      "serverUrl": "https://birdeye-mcp.onrender.com/mcp",
      "headers": {
        "x-birdeye-api-key": "your_key_here"
      }
    }
  }
}
```

---

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "birdeye": {
      "url": "https://birdeye-mcp.onrender.com/mcp",
      "headers": {
        "x-birdeye-api-key": "your_key_here"
      }
    }
  }
}
```

---

### Custom TypeScript / JavaScript Agent

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-agent", version: "1.0.0" });

await client.connect(
  new StreamableHTTPClientTransport(
    new URL("https://birdeye-mcp.onrender.com/mcp"),
    {
      headers: { "x-birdeye-api-key": "your_key_here" }
    }
  )
);

// Get token price
const price = await client.callTool({
  name: "get_token_price",
  arguments: {
    address: "So11111111111111111111111111111111111111112",
    chain: "solana"
  }
});

// Search for a token by name
const search = await client.callTool({
  name: "search_tokens",
  arguments: { query: "BONK", chain: "solana" }
});

// Get trending tokens
const trending = await client.callTool({
  name: "get_trending_tokens",
  arguments: { chain: "solana", limit: 10 }
});
```

---

### LangChain (Python)

```bash
pip install langchain-mcp-adapters langgraph langchain-openai
```

```python
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

async def main():
    client = MultiServerMCPClient(
        {
            "birdeye": {
                "url": "https://birdeye-mcp.onrender.com/mcp",
                "transport": "streamable_http",
                "headers": {
                    "x-birdeye-api-key": "your_key_here"
                }
            }
        }
    )

    tools = await client.get_tools()
    agent = create_react_agent(ChatOpenAI(model="gpt-4o"), tools)

    response = await agent.ainvoke({
        "messages": "What are the top trending tokens on Solana right now?"
    })
    print(response)

asyncio.run(main())
```

---

### CrewAI (Python)

```bash
pip install crewai crewai-tools
```

```python
from crewai import Agent, Task, Crew
from crewai_tools import MCPTool

birdeye_tool = MCPTool(
    server_url="https://birdeye-mcp.onrender.com/mcp",
    headers={"x-birdeye-api-key": "your_key_here"}
)

researcher = Agent(
    role="Onchain Research Analyst",
    goal="Analyze token data and market trends using real-time onchain data",
    backstory="""You are an expert crypto analyst with access to real-time 
    onchain data. You use Birdeye data to analyze tokens, check security, 
    track trends, and provide actionable insights.""",
    tools=[birdeye_tool],
    verbose=True
)

task = Task(
    description="""
    Research the top 5 trending tokens on Solana:
    1. Get the trending token list
    2. For each token check its security profile
    3. Get the current price and 24h volume
    4. Summarize which ones look most promising and flag any red flags
    """,
    agent=researcher,
    expected_output="A ranked list of the top 5 trending Solana tokens with security scores and market data"
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()
print(result)
```

---

### OpenAI Agents SDK (Python)

```bash
pip install openai-agents
```

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp

async def main():
    birdeye_server = MCPServerStreamableHttp(
        url="https://birdeye-mcp.onrender.com/mcp",
        headers={"x-birdeye-api-key": "your_key_here"}
    )

    agent = Agent(
        name="Onchain Analyst",
        instructions="""You are an onchain data analyst. Use the Birdeye tools to 
        answer questions about token prices, security, market trends, and trading activity.""",
        mcp_servers=[birdeye_server]
    )

    async with birdeye_server:
        result = await Runner.run(agent, "Is BONK a safe token to hold?")
        print(result.final_output)

asyncio.run(main())
```

---

### Python MCP Client (direct)

```bash
pip install mcp
```

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client(
        url="https://birdeye-mcp.onrender.com/mcp",
        headers={"x-birdeye-api-key": "your_key_here"}
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # List all tools
            tools = await session.list_tools()
            for tool in tools.tools:
                print(tool.name)

            # Call a tool
            result = await session.call_tool(
                "get_token_price",
                arguments={
                    "address": "So11111111111111111111111111111111111111112",
                    "chain": "solana"
                }
            )
            print(result.content[0].text)

asyncio.run(main())
```

---

## Available Tools

### Token
| Tool | Description |
|------|-------------|
| `get_token_overview` | Full token stats: price, volume, market cap, liquidity, holders |
| `get_token_price` | Current real-time price |
| `get_token_security` | Mint authority, freeze authority, holder concentration |
| `get_token_metadata` | Name, symbol, decimals, logo |
| `get_token_market_data` | Price, volume, market cap, price change |
| `get_token_trade_data` | Buy/sell counts, volume, unique wallets |
| `get_token_creation_info` | Creator address, creation time, initial liquidity |
| `get_token_holders` | Holder list in descending order |

### Price & OHLCV
| Tool | Description |
|------|-------------|
| `get_price_history` | Historical price over a time range |
| `get_ohlcv_token` | Candlestick data for a token |
| `get_ohlcv_pair` | Candlestick data for a trading pair |
| `get_price_volume` | Price and volume over a period |
| `get_historical_price_at_time` | Price at a specific Unix timestamp |

### Trades
| Tool | Description |
|------|-------------|
| `get_trades_by_token` | Recent trade history for a token |
| `get_trades_by_pair` | Recent trade history for a pair |

### Discovery
| Tool | Description |
|------|-------------|
| `get_trending_tokens` | Trending tokens by rank, volume, or liquidity |
| `get_new_listings` | Newly listed tokens |
| `get_top_traders` | Top traders for a token in a time window |
| `search_tokens` | Search by name, symbol, or address |

### Pairs
| Tool | Description |
|------|-------------|
| `get_pair_overview` | Price, volume, liquidity, reserves for a pair |
| `get_token_markets` | All markets a token trades on |

### Utility
| Tool | Description |
|------|-------------|
| `get_supported_networks` | List all supported blockchains |

---

## Supported Chains

`solana` `ethereum` `arbitrum` `avalanche` `bsc` `optimism` `polygon` `base` `zksync` `sui` `monad`

Chain defaults to `solana` if not specified.

---

## Built With

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Birdeye Data API](https://bds.birdeye.so)
- TypeScript + Express

---

## License

MIT