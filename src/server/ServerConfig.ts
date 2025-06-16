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
 * Creates a new standard input/output (stdio) transport for the server.
 *
 * @returns An instance of {@link StdioServerTransport} for server communication over stdio.
 */
export function createTransport(): StdioServerTransport {
  return new StdioServerTransport();
}

/**
 * Connects the server to the specified transport and begins handling MCP requests.
 *
 * @remark
 * Does not log startup messages to avoid interfering with MCP stdio communication.
 */
export async function startServer(server: Server, transport: StdioServerTransport): Promise<void> {
  await server.connect(transport);
  // Server is now running and ready to handle MCP requests
}
