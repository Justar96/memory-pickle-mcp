import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/**
 * MCP Server configuration
 */
export const SERVER_CONFIG = {
  name: "memory-pickle-mcp",
  version: "1.3.6",
} as const;

/**
 * Server capabilities configuration
 */
export const SERVER_CAPABILITIES = {
  capabilities: {
    resources: {},
    tools: {},
  },
} as const;

/**
 * Creates and configures the MCP server instance
 */
export function createServer(): Server {
  return new Server(SERVER_CONFIG, SERVER_CAPABILITIES);
}

/**
 * Creates the transport for the server
 */
export function createTransport(): StdioServerTransport {
  return new StdioServerTransport();
}

/**
 * Starts the server with the given transport
 * Note: Removed console.error to prevent interference with MCP stdio communication
 */
export async function startServer(server: Server, transport: StdioServerTransport): Promise<void> {
  await server.connect(transport);
  // Server is now running and ready to handle MCP requests
}
