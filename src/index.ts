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
  .describe("Blockchain network");

const addressSchema = z.string().describe("Token contract address");

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
  .describe("Time interval");

// ─── Server Factory ───────────────────────────────────────────────────────────

function createServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "Birdeye Data",
    version: "1.0.0",
  });

  // ─── Token ──────────────────────────────────────────────────────────────────

  server.tool(
    "get_token_overview",
    "Full overview of a token: price, volume, market cap, liquidity, holders, and more",
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
    "Current real-time price of a token",
    {
      address: addressSchema,
      chain: chainSchema,
      include_liquidity: z
        .boolean()
        .optional()
        .describe("Include liquidity data"),
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
    "Security info for a token: mint authority, freeze authority, top holder concentration",
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
    "Metadata for a token: name, symbol, decimals, logo",
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
    "Real-time market data for a token: price, volume, market cap, price change",
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
    "Trade statistics for a token: buy/sell counts, volume, unique wallets",
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
    "Creation info for a token: creator address, creation time, initial liquidity",
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
    "Holder list for a token in descending order by amount held",
    {
      address: addressSchema,
      chain: chainSchema,
      limit: z.number().optional().default(20).describe("Max 100"),
      offset: z.number().optional().default(0),
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
    "Historical price data for a token over a time range",
    {
      address: addressSchema,
      chain: chainSchema,
      address_type: z.enum(["token", "pair"]).default("token"),
      type: intervalSchema,
      time_from: z.number().optional().describe("Start time as Unix timestamp"),
      time_to: z.number().optional().describe("End time as Unix timestamp"),
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
    "OHLCV candlestick data for a token",
    {
      address: addressSchema,
      chain: chainSchema,
      type: intervalSchema,
      time_from: z.number().optional().describe("Start time as Unix timestamp"),
      time_to: z.number().optional().describe("End time as Unix timestamp"),
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
    "OHLCV candlestick data for a specific trading pair",
    {
      pair_address: z.string().describe("Pair or market address"),
      chain: chainSchema,
      type: intervalSchema,
      time_from: z.number().optional().describe("Start time as Unix timestamp"),
      time_to: z.number().optional().describe("End time as Unix timestamp"),
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
    "Current price and volume for a token over a time period",
    {
      address: addressSchema,
      chain: chainSchema,
      type: z.enum(["24h", "4h", "1h", "30m"]).default("24h"),
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
    "Price of a token at the closest available time to a given Unix timestamp",
    {
      address: addressSchema,
      chain: chainSchema,
      unixtime: z.number().describe("Unix timestamp"),
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
    "Recent trade history for a token",
    {
      address: addressSchema,
      chain: chainSchema,
      tx_type: z.enum(["swap", "add", "remove", "all"]).default("swap"),
      limit: z.number().optional().default(50).describe("Max 100"),
      offset: z.number().optional().default(0),
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
    "Recent trade history for a trading pair",
    {
      pair_address: z.string().describe("Pair or market address"),
      chain: chainSchema,
      tx_type: z.enum(["swap", "add", "remove", "all"]).default("swap"),
      limit: z.number().optional().default(50).describe("Max 100"),
      offset: z.number().optional().default(0),
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
    "List of trending tokens sorted by a specified metric",
    {
      chain: chainSchema,
      sort_by: z.enum(["rank", "volume24hUSD", "liquidity"]).default("rank"),
      sort_type: z.enum(["asc", "desc"]).default("desc"),
      limit: z.number().optional().default(20).describe("Max 100"),
      offset: z.number().optional().default(0),
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
    "Newly listed tokens on any supported chain",
    {
      chain: chainSchema,
      limit: z.number().optional().default(20).describe("Max 100"),
      offset: z.number().optional().default(0),
      meme_platform_enabled: z
        .boolean()
        .optional()
        .describe("Include meme platform tokens"),
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
    "Top traders for a given token within a time window",
    {
      address: addressSchema,
      chain: chainSchema,
      time_frame: z
        .enum(["30m", "1h", "2h", "4h", "6h", "8h", "12h", "24h"])
        .default("24h"),
      sort_by: z.enum(["volume", "trade"]).default("volume"),
      sort_type: z.enum(["asc", "desc"]).default("desc"),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
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
    "search_tokens",
    "Search for tokens and markets by name, symbol, or address",
    {
      query: z.string().describe("Token name, symbol, or address"),
      chain: chainSchema,
      target: z.enum(["token", "market", "all"]).default("all"),
      sort_by: z
        .enum(["fdv", "marketcap", "liquidity", "volume_24h_usd"])
        .optional(),
      sort_type: z.enum(["asc", "desc"]).optional().default("desc"),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
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
    "Overview of a trading pair: price, volume, liquidity, reserves",
    {
      pair_address: z.string().describe("Pair or market address"),
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
    "All markets/pairs that a token trades on",
    {
      address: addressSchema,
      chain: chainSchema,
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
      sort_by: z
        .enum(["liquidity", "volume24h", "trade24h"])
        .optional()
        .default("liquidity"),
      sort_type: z.enum(["asc", "desc"]).optional().default("desc"),
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

  // ─── Utility ─────────────────────────────────────────────────────────────────

  server.tool(
    "get_supported_networks",
    "List all blockchain networks supported by Birdeye",
    {},
    async () => {
      const data = await birdeyeGet("/defi/networks", {}, "solana", apiKey);
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
