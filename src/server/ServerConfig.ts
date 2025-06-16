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
 * Instantiates and returns a new MCP server with predefined configuration and capabilities.
 *
 * @returns A {@link Server} instance configured for the MCP protocol.
 */
export function createServer(): Server {
  return new Server(SERVER_CONFIG, SERVER_CAPABILITIES);
}

/**
 * Creates and returns a new transport for server communication over standard input and output streams.
 *
 * @returns A {@link StdioServerTransport} instance for stdio-based server communication.
 */
export function createTransport(): StdioServerTransport {
  return new StdioServerTransport();
}

/**
 * Connects the server to the provided transport and starts processing MCP requests.
 *
 * @remark
 * Startup messages are not logged to prevent interference with MCP stdio communication.
 */
export async function startServer(server: Server, transport: StdioServerTransport): Promise<void> {
  await server.connect(transport);
  // Server is now running and ready to handle MCP requests
}
