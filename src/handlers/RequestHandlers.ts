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
 * Registers all MCP request handlers for tools, resources, and templates on the server.
 *
 * Sets up endpoints for tool invocation, in-memory resource access, and resource template listing, enabling MCP-compliant operations using the provided core logic.
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
 * Registers MCP request handlers for listing available tools and invoking specific core tool methods.
 *
 * Sets up endpoints to return the list of supported tools and to execute a restricted set of eight whitelisted core methods by name with arguments. Only these allowed tool methods can be invoked; attempts to call other tools or unimplemented methods result in errors. Execution errors are caught and returned as error responses.
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
 * Registers MCP request handlers for listing and reading virtual in-memory resources.
 *
 * Exposes endpoints to enumerate and access session data and summaries as resources using the `memory://` protocol. All resources are dynamically generated from the in-memory state of the provided core instance.
 *
 * @remark Only the `memory://` protocol is supported. Attempting to access other protocols or unknown resource paths will result in an error.
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
 * Registers a request handler that lists available resource templates for in-memory resources.
 *
 * The handler advertises a single template for accessing in-memory resources such as "current-session" and "session-summary" via the `memory://` protocol.
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
