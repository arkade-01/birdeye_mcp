import express, { Request } from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const BIRDEYE_API_BASE = "https://public-api.birdeye.so";
const PORT = process.env.PORT ?? 3000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function birdeyeGet(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  chain: string = "solana",
  apiKey: string,
): Promise<unknown> {
  const url = new URL(`${BIRDEYE_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "X-API-KEY": apiKey,
      "x-chain": chain,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Birdeye API error ${res.status}: ${text}`);
  }

  return res.json();
}

function extractApiKey(req: Request): string {
  const key = req.headers["x-birdeye-api-key"];
  if (!key || typeof key !== "string") {
    throw new Error("Missing x-birdeye-api-key header");
  }
  return key;
}

// ─── Shared Schemas ───────────────────────────────────────────────────────────

const chainSchema = z
  .enum([
    "solana",
    "ethereum",
    "arbitrum",
    "avalanche",
    "bsc",
    "optimism",
    "polygon",
    "base",
    "zksync",
    "sui",
    "monad",
  ])
  .default("solana")
  .describe(
    "Blockchain network the token lives on. Defaults to solana if not specified.",
  );

const addressSchema = z
  .string()
  .describe("The token's contract address on the specified blockchain.");

const intervalSchema = z
  .enum([
    "1m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1H",
    "2H",
    "4H",
    "6H",
    "8H",
    "12H",
    "1D",
    "3D",
    "1W",
    "1M",
  ])
  .default("1D")
  .describe(
    "Candle/data interval. Use 1D for daily, 1H for hourly, 1m for 1-minute granularity.",
  );

// ─── Server Factory ───────────────────────────────────────────────────────────

function createServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "Birdeye Data",
    version: "1.0.0",
  });

  // ─── Token ──────────────────────────────────────────────────────────────────

  server.tool(
    "get_token_overview",
    `Get a comprehensive snapshot of any token including price, 24h volume, market cap, 
liquidity, number of holders, and price change percentages. Use this as the first call 
when a user asks for a general overview, summary, or analysis of a token. Works across 
all supported chains.`,
    { address: addressSchema, chain: chainSchema },
    async ({ address, chain }) => {
      const data = await birdeyeGet(
        "/defi/token_overview",
        { address },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_price",
    `Get the current real-time USD price of a token by its contract address. Use this 
when a user asks what a token is worth, its current price, or wants a quick price check. 
Optionally include liquidity data to understand how deep the market is.`,
    {
      address: addressSchema,
      chain: chainSchema,
      include_liquidity: z
        .boolean()
        .optional()
        .describe(
          "Set to true to also return available liquidity alongside the price.",
        ),
    },
    async ({ address, chain, include_liquidity }) => {
      const data = await birdeyeGet(
        "/defi/price",
        { address, include_liquidity },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_security",
    `Check the security profile of a token to assess rug pull risk and red flags. Returns 
mint authority status, freeze authority status, top 10 holder concentration, and other 
on-chain security indicators. Use this when a user asks if a token is safe, wants a rug 
check, or before recommending a token. Not supported on SUI.`,
    { address: addressSchema, chain: chainSchema },
    async ({ address, chain }) => {
      const data = await birdeyeGet(
        "/defi/token_security",
        { address },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_metadata",
    `Fetch basic identifying information about a token: name, symbol, number of decimals, 
logo URL, and on-chain extensions. Use this when you need to identify or display a token, 
resolve a contract address to a human-readable name, or verify token details.`,
    { address: addressSchema, chain: chainSchema },
    async ({ address, chain }) => {
      const data = await birdeyeGet(
        "/defi/v3/token/meta-data/single",
        { address },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_market_data",
    `Get real-time market statistics for a token including current price, 24h trading volume, 
fully diluted valuation (FDV), market cap, and price change over multiple timeframes. Use 
this when a user wants market performance metrics or wants to compare a token's market 
standing.`,
    { address: addressSchema, chain: chainSchema },
    async ({ address, chain }) => {
      const data = await birdeyeGet(
        "/defi/v3/token/market-data",
        { address },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_trade_data",
    `Get aggregated trading activity for a token: total number of buys and sells, buy/sell 
volume, number of unique buyer and seller wallets over different timeframes. Use this to 
gauge trading momentum, buying pressure, or whether a token is being accumulated or 
distributed.`,
    { address: addressSchema, chain: chainSchema },
    async ({ address, chain }) => {
      const data = await birdeyeGet(
        "/defi/v3/token/trade-data/single",
        { address },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_creation_info",
    `Look up when and by whom a token was created on-chain, including the creator's wallet 
address, creation timestamp, and initial liquidity added. Use this to assess token age, 
verify launch details, or investigate a token's origin.`,
    { address: addressSchema, chain: chainSchema },
    async ({ address, chain }) => {
      const data = await birdeyeGet(
        "/defi/token_creation_info",
        { address },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_holders",
    `Retrieve a ranked list of wallets holding a token, ordered from largest to smallest 
holding. Returns wallet addresses and their percentage ownership. Use this to analyze 
holder distribution, check for whale concentration, or identify major holders of a token.`,
    {
      address: addressSchema,
      chain: chainSchema,
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Number of holders to return. Max 100."),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe("Pagination offset for fetching more holders."),
    },
    async ({ address, chain, limit, offset }) => {
      const data = await birdeyeGet(
        "/defi/v3/token/holder",
        { address, limit, offset },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ─── Price & OHLCV ──────────────────────────────────────────────────────────

  server.tool(
    "get_price_history",
    `Fetch historical price data for a token over a specified time range and interval. 
Returns a time series of prices useful for charting, trend analysis, or backtesting. 
Use this when a user asks how a token has performed over time, wants to see price history, 
or needs data for a chart.`,
    {
      address: addressSchema,
      chain: chainSchema,
      address_type: z
        .enum(["token", "pair"])
        .default("token")
        .describe(
          "Whether the address belongs to a token or a specific trading pair.",
        ),
      type: intervalSchema,
      time_from: z
        .number()
        .optional()
        .describe("Start of the time range as a Unix timestamp."),
      time_to: z
        .number()
        .optional()
        .describe("End of the time range as a Unix timestamp."),
    },
    async ({ address, chain, address_type, type, time_from, time_to }) => {
      const data = await birdeyeGet(
        "/defi/history_price",
        { address, address_type, type, time_from, time_to },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_ohlcv_token",
    `Get OHLCV (Open, High, Low, Close, Volume) candlestick data for a token at a chosen 
interval. Use this for technical analysis, building price charts, detecting breakouts, 
or analyzing volume patterns. Choose a shorter interval (1m, 5m) for intraday analysis 
or longer (1D, 1W) for trend analysis.`,
    {
      address: addressSchema,
      chain: chainSchema,
      type: intervalSchema,
      time_from: z
        .number()
        .optional()
        .describe("Start of the time range as a Unix timestamp."),
      time_to: z
        .number()
        .optional()
        .describe("End of the time range as a Unix timestamp."),
    },
    async ({ address, chain, type, time_from, time_to }) => {
      const data = await birdeyeGet(
        "/defi/ohlcv",
        { address, type, time_from, time_to },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_ohlcv_pair",
    `Get OHLCV candlestick data scoped to a specific trading pair or liquidity pool address 
rather than the token overall. Use this when you need price data for a specific market 
(e.g. SOL/USDC on Raydium) rather than the token's aggregate price across all markets.`,
    {
      pair_address: z
        .string()
        .describe(
          "The address of the specific trading pair or liquidity pool.",
        ),
      chain: chainSchema,
      type: intervalSchema,
      time_from: z
        .number()
        .optional()
        .describe("Start of the time range as a Unix timestamp."),
      time_to: z
        .number()
        .optional()
        .describe("End of the time range as a Unix timestamp."),
    },
    async ({ pair_address, chain, type, time_from, time_to }) => {
      const data = await birdeyeGet(
        "/defi/ohlcv/pair",
        { address: pair_address, type, time_from, time_to },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_price_volume",
    `Get a token's current price combined with its trading volume over a recent time window 
(30 minutes to 24 hours). Use this for a quick read on recent market activity, to detect 
volume spikes, or to confirm whether price moves are backed by real trading volume.`,
    {
      address: addressSchema,
      chain: chainSchema,
      type: z
        .enum(["24h", "4h", "1h", "30m"])
        .default("24h")
        .describe("Time window for volume calculation."),
    },
    async ({ address, chain, type }) => {
      const data = await birdeyeGet(
        "/defi/price_volume/single",
        { address, type },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_historical_price_at_time",
    `Look up what a token's price was at a specific point in time by providing a Unix 
timestamp. Returns the closest available price to that moment. Use this to check a token's 
price at a past event, calculate historical PnL, or verify a price at a specific block time.`,
    {
      address: addressSchema,
      chain: chainSchema,
      unixtime: z
        .number()
        .describe(
          "The Unix timestamp of the point in time you want the price for.",
        ),
    },
    async ({ address, chain, unixtime }) => {
      const data = await birdeyeGet(
        "/defi/historical_price_unix",
        { address, unixtime },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ─── Trades ─────────────────────────────────────────────────────────────────

  server.tool(
    "get_trades_by_token",
    `Fetch a list of recent swap transactions for a token across all its trading pairs. 
Returns transaction hashes, wallet addresses, trade amounts, and timestamps. Use this 
to monitor recent trading activity, track large trades, or investigate who is buying 
and selling a token.`,
    {
      address: addressSchema,
      chain: chainSchema,
      tx_type: z
        .enum(["swap", "add", "remove", "all"])
        .default("swap")
        .describe(
          "Filter by transaction type. Use 'swap' for trades, 'add'/'remove' for liquidity events.",
        ),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Number of trades to return. Max 100."),
      offset: z.number().optional().default(0).describe("Pagination offset."),
    },
    async ({ address, chain, tx_type, limit, offset }) => {
      const data = await birdeyeGet(
        "/defi/txs/token",
        { address, tx_type, limit, offset },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_trades_by_pair",
    `Fetch recent trades for a specific trading pair or liquidity pool. Use this when you 
want trade history scoped to one market (e.g. a specific Raydium or Uniswap pool) rather 
than all trades across every market for a token.`,
    {
      pair_address: z
        .string()
        .describe(
          "The address of the specific trading pair or liquidity pool.",
        ),
      chain: chainSchema,
      tx_type: z
        .enum(["swap", "add", "remove", "all"])
        .default("swap")
        .describe("Filter by transaction type."),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Number of trades to return. Max 100."),
      offset: z.number().optional().default(0).describe("Pagination offset."),
    },
    async ({ pair_address, chain, tx_type, limit, offset }) => {
      const data = await birdeyeGet(
        "/defi/txs/pair",
        { address: pair_address, tx_type, limit, offset },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ─── Discovery ───────────────────────────────────────────────────────────────

  server.tool(
    "get_trending_tokens",
    `Get a live ranked list of trending tokens on any supported chain, sortable by rank, 
24h volume, or liquidity. Use this when a user asks what's trending, what tokens are 
hot right now, or wants to discover popular tokens on a specific chain.`,
    {
      chain: chainSchema,
      sort_by: z
        .enum(["rank", "volume24hUSD", "liquidity"])
        .default("rank")
        .describe("Criteria to rank tokens by."),
      sort_type: z
        .enum(["asc", "desc"])
        .default("desc")
        .describe("Sort direction."),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Number of tokens to return. Max 100."),
      offset: z.number().optional().default(0).describe("Pagination offset."),
    },
    async ({ chain, sort_by, sort_type, limit, offset }) => {
      const data = await birdeyeGet(
        "/defi/token_trending",
        { sort_by, sort_type, limit, offset },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_new_listings",
    `Get the most recently listed tokens on any supported chain. Use this to discover 
newly launched tokens, monitor fresh listings for early opportunities, or build a new 
token radar. Enable meme_platform_enabled to include tokens from meme launchpads.`,
    {
      chain: chainSchema,
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Number of tokens to return. Max 100."),
      offset: z.number().optional().default(0).describe("Pagination offset."),
      meme_platform_enabled: z
        .boolean()
        .optional()
        .describe(
          "Set to true to include tokens launched on meme platforms like pump.fun.",
        ),
    },
    async ({ chain, limit, offset, meme_platform_enabled }) => {
      const data = await birdeyeGet(
        "/defi/v2/tokens/new_listing",
        { limit, offset, meme_platform_enabled },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_top_traders",
    `Identify the wallets that have traded a token the most by volume or number of trades 
within a given time window. Use this to find smart money wallets, track influential 
traders on a token, or detect coordinated trading activity.`,
    {
      address: addressSchema,
      chain: chainSchema,
      time_frame: z
        .enum(["30m", "1h", "2h", "4h", "6h", "8h", "12h", "24h"])
        .default("24h")
        .describe("Time window to rank traders within."),
      sort_by: z
        .enum(["volume", "trade"])
        .default("volume")
        .describe("Rank traders by total volume traded or number of trades."),
      sort_type: z
        .enum(["asc", "desc"])
        .default("desc")
        .describe("Sort direction."),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of traders to return."),
      offset: z.number().optional().default(0).describe("Pagination offset."),
    },
    async ({
      address,
      chain,
      time_frame,
      sort_by,
      sort_type,
      limit,
      offset,
    }) => {
      const data = await birdeyeGet(
        "/defi/v2/tokens/top_traders",
        { address, time_frame, sort_by, sort_type, limit, offset },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_supported_networks",
    `Returns the full list of blockchain networks currently supported by Birdeye. Use this 
to check which chains are available before making other calls, or when a user asks which 
blockchains are supported.`,
    {},
    async () => {
      const data = await birdeyeGet("/defi/networks", {}, "solana", apiKey);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "search_tokens",
    `Search for tokens or trading pairs by name, ticker symbol, or contract address. 
Returns matching results with price and market data. Use this when a user mentions a 
token by name (e.g. "find me info on BONK") and you need to resolve it to a contract 
address, or when exploring what tokens exist around a keyword.`,
    {
      query: z
        .string()
        .describe(
          "Token name, ticker symbol, or contract address to search for.",
        ),
      chain: chainSchema,
      target: z
        .enum(["token", "market", "all"])
        .default("all")
        .describe("Whether to search tokens, trading pairs/markets, or both."),
      sort_by: z
        .enum(["fdv", "marketcap", "liquidity", "volume_24h_usd"])
        .optional()
        .describe("Sort results by this market metric."),
      sort_type: z
        .enum(["asc", "desc"])
        .optional()
        .default("desc")
        .describe("Sort direction."),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results to return."),
      offset: z.number().optional().default(0).describe("Pagination offset."),
    },
    async ({ query, chain, target, sort_by, sort_type, limit, offset }) => {
      const data = await birdeyeGet(
        "/defi/v3/search",
        { keyword: query, target, sort_by, sort_type, limit, offset },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ─── Pairs ───────────────────────────────────────────────────────────────────

  server.tool(
    "get_pair_overview",
    `Get a detailed overview of a specific trading pair or liquidity pool: base and quote 
token info, current price, 24h volume, total liquidity, and reserve amounts. Use this 
when a user wants to analyze a specific market, compare liquidity across pools, or 
investigate a particular trading pair.`,
    {
      pair_address: z
        .string()
        .describe(
          "The contract address of the trading pair or liquidity pool.",
        ),
      chain: chainSchema,
    },
    async ({ pair_address, chain }) => {
      const data = await birdeyeGet(
        "/defi/v3/pair/overview/single",
        { address: pair_address },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "get_token_markets",
    `List all trading pairs and liquidity pools where a token is actively traded, sorted 
by liquidity, volume, or trade count. Use this to find the best market to trade a token, 
compare liquidity across DEXes, or discover all venues where a token is listed.`,
    {
      address: addressSchema,
      chain: chainSchema,
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of markets to return."),
      offset: z.number().optional().default(0).describe("Pagination offset."),
      sort_by: z
        .enum(["liquidity", "volume24h", "trade24h"])
        .optional()
        .default("liquidity")
        .describe("Rank markets by this metric."),
      sort_type: z
        .enum(["asc", "desc"])
        .optional()
        .default("desc")
        .describe("Sort direction."),
    },
    async ({ address, chain, limit, offset, sort_by, sort_type }) => {
      const data = await birdeyeGet(
        "/defi/v2/markets",
        { address, limit, offset, sort_by, sort_type },
        chain,
        apiKey,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  return server;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.post("/mcp", async (req, res) => {
  let apiKey: string;

  try {
    apiKey = extractApiKey(req);
  } catch {
    res
      .status(401)
      .json({ error: "Missing or invalid x-birdeye-api-key header" });
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const server = createServer(apiKey);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Birdeye MCP server running on port ${PORT}`);
});
