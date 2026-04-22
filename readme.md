# Birdeye MCP Server

A plug-and-play [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives AI agents instant access to real-time onchain data from [Birdeye](https://birdeye.so) — no custom API calls needed.

Built for agents that need token prices, market data, security checks, trade history, and more across 11 blockchains.

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

## Getting Started

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

---

## Connecting Your Agent

Every request requires your Birdeye API key passed as a header:

```
x-birdeye-api-key: your_key_here
```

**MCP endpoint:**
```
POST http://localhost:3000/mcp
```

**Health check:**
```
GET http://localhost:3000/health
```

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "birdeye": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "x-birdeye-api-key": "your_key_here"
      }
    }
  }
}
```

### Custom Agent (TypeScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-agent", version: "1.0.0" });

await client.connect(
  new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"), {
    headers: { "x-birdeye-api-key": "your_key_here" }
  })
);

const result = await client.callTool({
  name: "get_token_price",
  arguments: {
    address: "So11111111111111111111111111111111111111112",
    chain: "solana"
  }
});
```

### curl

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
| `get_token_price` | Real-time price |
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

## Testing with MCP Inspector

```bash
npm run inspect
```

Then in the UI:
- Transport: **Streamable HTTP**
- URL: `http://localhost:3000/mcp`
- Headers: `x-birdeye-api-key: your_key_here`

---

## Built With

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Birdeye Data API](https://bds.birdeye.so)
- TypeScript + Express

---

## License

MIT