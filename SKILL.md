# Birdeye Data — Agent Skill

## Overview
You have access to a Birdeye MCP server that gives you real-time onchain data across 
11 blockchains. Use these tools whenever a user asks about token prices, market data, 
security checks, trade history, trending tokens, or anything related to onchain activity.

## Connection
- **MCP Endpoint:** `https://birdeye-mcp.onrender.com/mcp`
- **Authentication:** Pass your Birdeye API key once as a request header:
  ```
  x-birdeye-api-key: YOUR_BIRDEYE_API_KEY
  ```

## Supported Chains
`solana` `ethereum` `arbitrum` `avalanche` `bsc` `optimism` `polygon` `base` `zksync` `sui` `monad`

All tools default to `solana` if no chain is specified.

---

## Available Tools

### Token Data

**`get_token_overview`**
Use when: user asks for a general summary or analysis of a token.
Params: `address`, `chain`

**`get_token_price`**
Use when: user asks what a token is worth or its current price.
Params: `address`, `chain`, `include_liquidity` (optional)

**`get_token_security`**
Use when: user asks if a token is safe, wants a rug check, or before recommending a token.
Params: `address`, `chain` (not supported on SUI)

**`get_token_metadata`**
Use when: you need to resolve a contract address to a name/symbol, or display token info.
Params: `address`, `chain`

**`get_token_market_data`**
Use when: user wants market cap, FDV, volume, or price change metrics.
Params: `address`, `chain`

**`get_token_trade_data`**
Use when: user wants to know buying/selling pressure or trading momentum.
Params: `address`, `chain`

**`get_token_creation_info`**
Use when: user wants to know when a token launched or who created it.
Params: `address`, `chain`

**`get_token_holders`**
Use when: user wants to check whale concentration or holder distribution.
Params: `address`, `chain`, `limit` (default 20), `offset`

---

### Price & OHLCV

**`get_price_history`**
Use when: user asks how a token has performed over time or wants a price chart.
Params: `address`, `chain`, `type` (interval), `time_from`, `time_to`

**`get_ohlcv_token`**
Use when: user needs candlestick data for technical analysis.
Params: `address`, `chain`, `type` (interval), `time_from`, `time_to`

**`get_ohlcv_pair`**
Use when: user needs OHLCV for a specific pool/market rather than the token overall.
Params: `pair_address`, `chain`, `type`, `time_from`, `time_to`

**`get_price_volume`**
Use when: user wants to confirm if a price move is backed by real volume.
Params: `address`, `chain`, `type` (24h / 4h / 1h / 30m)

**`get_historical_price_at_time`**
Use when: user wants to know what a token was worth at a specific past moment.
Params: `address`, `chain`, `unixtime`

---

### Trades

**`get_trades_by_token`**
Use when: user wants to see recent swaps or track who is buying/selling a token.
Params: `address`, `chain`, `tx_type`, `limit`, `offset`

**`get_trades_by_pair`**
Use when: user wants trade history for a specific pool or market.
Params: `pair_address`, `chain`, `tx_type`, `limit`, `offset`

---

### Discovery

**`get_trending_tokens`**
Use when: user asks what's trending or popular on a chain right now.
Params: `chain`, `sort_by` (rank / volume24hUSD / liquidity), `sort_type`, `limit`

**`get_new_listings`**
Use when: user wants to discover newly launched tokens or fresh listings.
Params: `chain`, `limit`, `offset`, `meme_platform_enabled`

**`get_top_traders`**
Use when: user wants to find smart money wallets or top traders for a token.
Params: `address`, `chain`, `time_frame`, `sort_by`, `limit`

**`search_tokens`**
Use when: user mentions a token by name or ticker and you need its contract address.
Params: `query`, `chain`, `target`, `sort_by`, `limit`

---

### Pairs

**`get_pair_overview`**
Use when: user wants to analyze a specific liquidity pool or trading pair.
Params: `pair_address`, `chain`

**`get_token_markets`**
Use when: user wants to find the best market to trade a token or compare DEX liquidity.
Params: `address`, `chain`, `sort_by`, `limit`

---

### Utility

**`get_supported_networks`**
Use when: user asks which blockchains are supported.
Params: none

---

## Tool Chaining Examples

**"Is this token safe to buy?"**
1. `search_tokens` — resolve name to address
2. `get_token_security` — check rug indicators
3. `get_token_overview` — check liquidity and holder count
4. `get_token_trade_data` — check buy/sell pressure

**"What's trending on Solana right now?"**
1. `get_trending_tokens` with `chain: solana`
2. `get_token_price` for each result to show current prices

**"Show me a new token that just launched"**
1. `get_new_listings` with `meme_platform_enabled: true`
2. `get_token_security` on interesting results
3. `get_token_holders` to check concentration

**"Who are the biggest traders of this token today?"**
1. `get_top_traders` with `time_frame: 24h`
2. `get_trades_by_token` to see their recent activity

---

## Interval Reference
`1m` `3m` `5m` `15m` `30m` `1H` `2H` `4H` `6H` `8H` `12H` `1D` `3D` `1W` `1M`

## Time Parameters
All `time_from` and `time_to` values are Unix timestamps (seconds).
Example: April 23 2026 00:00 UTC = `1745366400`