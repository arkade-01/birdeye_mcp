import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://public-api.birdeye.so";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "Birdeye Data",
  version: "1.0.0",
});