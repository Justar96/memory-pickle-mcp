import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getVersion } from '../utils/version.js';

/**
 * MCP Server configuration
 */
export const SERVER_CONFIG = {
  name: "memory-pickle-mcp",
  version: getVersion(),
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
 * Creates and configures an MCP server instance with predefined settings and capabilities.
 *
 * @returns A new {@link Server} initialized with the server's configuration and capabilities.
 */
export function createServer(): Server {
  return new Server(SERVER_CONFIG, SERVER_CAPABILITIES);
}

/**
 * Creates and returns a transport for server communication over standard input and output streams.
 *
 * @returns A {@link StdioServerTransport} instance for stdio-based server communication.
 */
export function createTransport(): StdioServerTransport {
  return new StdioServerTransport();
}

/**
 * Connects the server to the provided stdio transport and starts processing MCP requests.
 *
 * @remark
 * Does not log startup messages to prevent interference with stdio-based MCP communication.
 */
export async function startServer(server: Server, transport: StdioServerTransport): Promise<void> {
  await server.connect(transport);
  // Server is now running and ready to handle MCP requests
}
