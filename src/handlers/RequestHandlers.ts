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
import { DATA_DIR, PROJECTS_FILE, TASKS_FILE, MEMORIES_FILE } from '../config/constants.js';
import { ALL_TOOLS } from '../tools/index.js';
import type { MemoryPickleCore } from '../core/MemoryPickleCore.js';

/**
 * Sets up all MCP request handlers for the server
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
 * Sets up tool-related request handlers
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

    // Simple whitelist of allowed methods
    const allowedMethods = [
      'create_project', 'get_project_status', 'update_project', 'list_projects', 'set_current_project',
      'create_task', 'update_task', 'toggle_task', 'list_tasks', 'get_tasks', 'update_task_progress',
      'remember_this', 'recall_context', 'add_memory', 'search_memories',
      'export_to_markdown', 'list_templates', 'list_categories', 'generate_handoff_summary',
      'validate_database', 'check_workflow_state', 'repair_orphaned_data'
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
 * Sets up resource-related request handlers
 */
function setupResourceHandlers(server: Server): void {
  // List resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [];

    // Check for split files (current architecture)
    const metaFile = path.join(DATA_DIR, 'meta.yaml');
    if (fs.existsSync(PROJECTS_FILE)) {
      resources.push({
        uri: `file:///projects.yaml`,
        mimeType: "text/yaml",
        name: "Projects",
        description: "Project data and metadata"
      });
    }

    if (fs.existsSync(TASKS_FILE)) {
      resources.push({
        uri: `file:///tasks.yaml`,
        mimeType: "text/yaml",
        name: "Tasks",
        description: "Task hierarchy and progress tracking"
      });
    }

    if (fs.existsSync(MEMORIES_FILE)) {
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
    const exportFile = path.join(DATA_DIR, 'project-export.md');
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
            actualFilePath = PROJECTS_FILE;
            break;
          case 'tasks.yaml':
            actualFilePath = TASKS_FILE;
            break;
          case 'memories.yaml':
            actualFilePath = MEMORIES_FILE;
            break;
          case 'meta.yaml':
            actualFilePath = path.join(DATA_DIR, 'meta.yaml');
            break;
          case 'project-export.md':
            actualFilePath = path.join(DATA_DIR, 'project-export.md');
            break;
          default:
            // Fallback to direct path construction
            actualFilePath = path.join(DATA_DIR, fileName);
        }

        console.error(`Debug: Resolved file path: ${actualFilePath}`);

        // Security validation - ensure resolved path is within data directory
        const resolvedPath = path.resolve(actualFilePath);
        const dataDir = path.resolve(DATA_DIR);

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
