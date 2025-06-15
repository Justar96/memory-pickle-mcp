import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import * as path from 'path';
import { getDataDir, getProjectsFile, getTasksFile, getMemoriesFile } from '../config/constants.js';
import { ALL_TOOLS } from '../tools/index.js';
import type { MemoryPickleCore } from '../core/MemoryPickleCore.js';

/**
 * Registers all Model Context Protocol (MCP) request handlers for tools, resources, and templates on the server.
 *
 * @param server - The server instance to register handlers on.
 * @param core - The core logic provider for tool execution.
 */
export function setupRequestHandlers(server: Server, core: MemoryPickleCore): void {
  // Tool handling
  setupToolHandlers(server, core);

  // Resource handling
  setupResourceHandlers(server);

  // Template handling
  setupTemplateHandlers(server);
}

/**
 * Registers request handlers for listing available tools and invoking core tool methods.
 *
 * Sets up handlers to return the list of supported tools and to execute whitelisted core methods by name with arguments. Only eight specific tool methods are allowed; attempts to call other tools result in an error. If a tool method is not implemented or execution fails, an error response is returned.
 *
 * @throws {Error} If a requested tool name is not in the allowed list or is not implemented.
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
 * Registers request handlers for listing and reading available resources in the data directory.
 *
 * Provides endpoints to enumerate accessible resource files (such as projects, tasks, memories, metadata, and exports) and to retrieve their contents by URI. Enforces strict validation to prevent unauthorized file access and directory traversal.
 *
 * @remark
 * Only files within the data directory and with recognized filenames can be accessed. Attempts to access files outside the allowed directory or with unsafe filenames will result in an error.
 */
function setupResourceHandlers(server: Server): void {
  // List resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [];

    // Check for split files (current architecture)
    const metaFile = path.join(getDataDir(), 'meta.yaml');
    if (fs.existsSync(getProjectsFile())) {
      resources.push({
        uri: `file:///projects.yaml`,
        mimeType: "text/yaml",
        name: "Projects",
        description: "Project data and metadata"
      });
    }

    if (fs.existsSync(getTasksFile())) {
      resources.push({
        uri: `file:///tasks.yaml`,
        mimeType: "text/yaml",
        name: "Tasks",
        description: "Task hierarchy and progress tracking"
      });
    }

    if (fs.existsSync(getMemoriesFile())) {
      resources.push({
        uri: `file:///memories.yaml`,
        mimeType: "text/yaml",
        name: "Memories",
        description: "Persistent memory storage and notes"
      });
    }

    if (fs.existsSync(metaFile)) {
      resources.push({
        uri: `file:///meta.yaml`,
        mimeType: "text/yaml",
        name: "Metadata",
        description: "Session tracking, templates, and configuration"
      });
    }

    // Check for exported markdown files
    const exportFile = path.join(getDataDir(), 'project-export.md');
    if (fs.existsSync(exportFile)) {
      resources.push({
        uri: `file:///project-export.md`,
        mimeType: "text/markdown",
        name: "Project Export",
        description: "Exported project summary in markdown format"
      });
    }

    return { resources };
  });

  // Read resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const url = new URL(request.params.uri);
      console.error(`Debug: Reading resource URI: ${request.params.uri}`);
      console.error(`Debug: URL protocol: ${url.protocol}, pathname: ${url.pathname}`);

      if (url.protocol === 'file:') {
        // Extract filename from URL - handle both with and without leading slash
        let fileName = url.pathname;
        if (fileName.startsWith('/')) {
          fileName = fileName.substring(1);
        }

        // Validate that fileName is not empty after processing
        if (!fileName || fileName.trim() === '') {
          throw new Error(`Invalid resource URI: filename is empty or missing. URI: ${request.params.uri}`);
        }

        console.error(`Debug: Processed fileName: "${fileName}"`);

        // Additional validation for suspicious filenames
        if (fileName === '.' || fileName === '..' || fileName.includes('..')) {
          throw new Error(`Invalid resource URI: unsafe filename "${fileName}". URI: ${request.params.uri}`);
        }

        console.error(`Debug: Extracted filename: ${fileName}`);

        // Map common filenames to actual file paths
        let actualFilePath;
        switch (fileName) {
          case 'projects.yaml':
            actualFilePath = getProjectsFile();
            break;
          case 'tasks.yaml':
            actualFilePath = getTasksFile();
            break;
          case 'memories.yaml':
            actualFilePath = getMemoriesFile();
            break;
          case 'meta.yaml':
            actualFilePath = path.join(getDataDir(), 'meta.yaml');
            break;
          case 'project-export.md':
            actualFilePath = path.join(getDataDir(), 'project-export.md');
            break;
          default:
            // Fallback to direct path construction
            actualFilePath = path.join(getDataDir(), fileName);
        }

        console.error(`Debug: Resolved file path: ${actualFilePath}`);

        // Security validation - ensure resolved path is within data directory
        const resolvedPath = path.resolve(actualFilePath);
        const dataDir = path.resolve(getDataDir());

        if (!resolvedPath.startsWith(dataDir)) {
          throw new Error('Access denied: File outside allowed directory');
        }

        if (fs.existsSync(resolvedPath)) {
          // Check if it's actually a file, not a directory
          const stats = fs.statSync(resolvedPath);
          if (stats.isDirectory()) {
            throw new Error(`Path is a directory, not a file: ${resolvedPath}. Original URI: ${request.params.uri}, processed fileName: "${fileName}". This usually indicates a malformed resource URI.`);
          }

          const content = fs.readFileSync(resolvedPath, 'utf8');

          // Determine MIME type based on file extension
          const ext = path.extname(fileName).toLowerCase();
          const mimeType = ext === '.md' ? 'text/markdown' : 'text/yaml';

          console.error(`Debug: Successfully read file, content length: ${content.length}`);

          return {
            contents: [{
              uri: request.params.uri,
              mimeType: mimeType,
              text: content
            }]
          };
        } else {
          throw new Error(`File does not exist: ${resolvedPath}. Original URI: ${request.params.uri}, processed fileName: "${fileName}"`);
        }
      }

      throw new Error(`Unsupported protocol: ${url.protocol}`);
    } catch (error) {
      console.error(`Debug: Error reading resource:`, error);
      throw error;
    }
  });
}

/**
 * Sets up template-related request handlers
 */
function setupTemplateHandlers(server: Server): void {
  // List resource templates
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    const templates = [];

    // File access template - allows accessing any file in the data directory
    templates.push({
      uriTemplate: "file:///{filename}",
      name: "Data File Access",
      description: "Access any YAML or Markdown file in the memory pickle data directory by filename (e.g., projects.yaml, tasks.yaml, memories.yaml, meta.yaml, project-export.md)",
      mimeType: "text/plain"
    });

    return { resourceTemplates: templates };
  });
}
