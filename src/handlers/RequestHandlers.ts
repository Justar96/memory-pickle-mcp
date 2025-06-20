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
import { formatErrorResponse, MemoryPickleError } from '../utils/errors.js';

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
 * Dynamically extracts tool names from the tools definition to ensure synchronization
 */
function getToolNames(): string[] {
  return ALL_TOOLS.map(tool => tool.name);
}

/**
 * Validates that a core method exists for a given tool name
 */
function validateCoreMethod(core: MemoryPickleCore, toolName: string): boolean {
  return typeof (core as any)[toolName] === 'function';
}

/**
 * Registers MCP request handlers for listing available tools and invoking core tool methods.
 *
 * Dynamically synchronizes with the tools definition and validates core method availability.
 * All tool execution errors are caught and returned as proper error responses.
 */
function setupToolHandlers(server: Server, core: MemoryPickleCore): void {
  // Get tool names dynamically from tools definition
  const toolNames = getToolNames();

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: ALL_TOOLS
    };
  });

  // Handle tool calls with improved error handling and validation
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Validate tool exists in our tools definition
    if (!toolNames.includes(name)) {
      throw new MemoryPickleError(
        `Unknown tool: ${name}. Available tools: ${toolNames.join(', ')}`,
        'UNKNOWN_TOOL'
      );
    }

    // Validate core method exists
    if (!validateCoreMethod(core, name)) {
      throw new MemoryPickleError(
        `Tool not implemented in core: ${name}`,
        'TOOL_NOT_IMPLEMENTED'
      );
    }

    try {
      // Execute the tool method
      const result = await (core as any)[name](args || {});
      return result;
    } catch (error) {
      // Enhanced error handling with context
      const enhancedError = error instanceof Error 
        ? new Error(`Tool '${name}' execution failed: ${error.message}`)
        : new Error(`Tool '${name}' execution failed: Unknown error`);
      
      return formatErrorResponse(enhancedError);
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
      },
      {
        uri: `memory:///system-stats`,
        mimeType: "application/json",
        name: "System Statistics",
        description: "Current system performance and health statistics"
      }
    ];

    return { resources };
  });

  // Read resources - serve in-memory data with enhanced error handling
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

          case '/system-stats':
            // Return system statistics as JSON
            const stats = core.getSystemStats();
            return {
              contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(stats, null, 2)
              }]
            };

          default:
            throw new MemoryPickleError(
              `Unknown memory resource: ${resourcePath}. Available resources: /current-session, /session-summary, /system-stats`,
              'UNKNOWN_RESOURCE'
            );
        }
      }

      throw new MemoryPickleError(
        `Unsupported protocol: ${url.protocol}. Only memory:// protocol is supported in in-memory mode.`,
        'UNSUPPORTED_PROTOCOL'
      );
    } catch (error) {
      if (error instanceof MemoryPickleError) {
        throw error;
      }
      throw new MemoryPickleError(
        `Resource access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESOURCE_ACCESS_ERROR'
      );
    }
  });
}

/**
 * Registers a request handler that lists available resource templates for in-memory resources.
 *
 * The handler advertises templates for accessing in-memory resources such as "current-session", "session-summary", and "system-stats" via the `memory://` protocol.
 */
function setupTemplateHandlers(server: Server): void {
  // List resource templates
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    const templates = [];

    // In-memory resource access template
    templates.push({
      uriTemplate: "memory:///{resource}",
      name: "In-Memory Resource Access",
      description: "Access in-memory resources (current-session, session-summary, system-stats)",
      mimeType: "application/json"
    });

    return { resourceTemplates: templates };
  });
}
