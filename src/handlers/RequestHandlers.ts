import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ALL_TOOLS } from '../tools/index.js';
import type { MemoryPickleCore } from '../core/MemoryPickleCore.js';

/**
 * Registers all Model Context Protocol (MCP) request handlers for tools, resources, and templates on the server.
 *
 * Sets up endpoints for tool listing and invocation, resource enumeration and retrieval, and template listing, enabling MCP-compliant interactions through the provided server instance.
 *
 * @param server - The server instance on which to register MCP request handlers.
 * @param core - The core logic provider used for tool execution.
 */
export function setupRequestHandlers(server: Server, core: MemoryPickleCore): void {
  // Tool handling
  setupToolHandlers(server, core);

  // Resource handling
  setupResourceHandlers(server, core);

  // Template handling
  setupTemplateHandlers(server);
}

/**
 * Registers request handlers for listing available tools and invoking specific core tool methods.
 *
 * Sets up handlers to return the list of supported tools and to execute a restricted set of eight core methods by name with arguments. Only these whitelisted tool methods can be invoked; attempts to call other tools result in an error. If a requested tool is not implemented on the core, an error is thrown. Execution errors are caught and returned as error responses.
 *
 * @throws {Error} If the requested tool name is not in the allowed list or is not implemented on the core.
 */
function setupToolHandlers(server: Server, core: MemoryPickleCore): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: ALL_TOOLS
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Simplified whitelist of core methods (8 tools)
    const allowedMethods = [
      'get_project_status', 'create_project', 'set_current_project',
      'create_task', 'update_task',
      'remember_this', 'recall_context',
      'generate_handoff_summary'
    ];

    if (!allowedMethods.includes(name)) {
      throw new Error(`Unknown or unauthorized tool: ${name}`);
    }

    try {
      if (typeof (core as any)[name] === 'function') {
        return await (core as any)[name](args);
      } else {
        throw new Error(`Tool not implemented: ${name}`);
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  });
}

/**
 * Registers request handlers for in-memory resources.
 *
 * Provides endpoints to access in-memory data as virtual resources.
 * All data is served from memory without any file system dependencies.
 */
function setupResourceHandlers(server: Server, core: MemoryPickleCore): void {
  // List resources - return virtual in-memory resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [
      {
        uri: `memory:///current-session`,
        mimeType: "application/json",
        name: "Current Session Data",
        description: "In-memory session data including projects, tasks, and memories"
      },
      {
        uri: `memory:///session-summary`,
        mimeType: "text/markdown",
        name: "Session Summary",
        description: "Current session summary in markdown format"
      }
    ];

    return { resources };
  });

  // Read resources - serve in-memory data
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const url = new URL(request.params.uri);

      if (url.protocol === 'memory:') {
        const resourcePath = url.pathname;

        switch (resourcePath) {
          case '/current-session':
            // Return current in-memory database as JSON
            const database = core.getDatabase();
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(database, null, 2)
              }]
            };

          case '/session-summary':
            // Return session summary as markdown
            const summary = await core.generate_handoff_summary({});
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: "text/markdown",
                text: summary.content[0].text
              }]
            };

          default:
            throw new Error(`Unknown memory resource: ${resourcePath}`);
        }
      }

      throw new Error(`Unsupported protocol: ${url.protocol}. Only memory:// protocol is supported in in-memory mode.`);
    } catch (error) {
      throw error;
    }
  });
}

/**
 * Sets up template-related request handlers for in-memory resources
 */
function setupTemplateHandlers(server: Server): void {
  // List resource templates
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    const templates = [];

    // In-memory resource access template
    templates.push({
      uriTemplate: "memory:///{resource}",
      name: "In-Memory Resource Access",
      description: "Access in-memory resources (current-session, session-summary)",
      mimeType: "application/json"
    });

    return { resourceTemplates: templates };
  });
}
