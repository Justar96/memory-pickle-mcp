#!/usr/bin/env node

/**
 * Memory Pickle MCP Server
 *
 * An intelligent project management system that provides:
 * - Project and task management with hierarchical organization
 * - Persistent memory storage for context and notes
 * - Intelligent task analysis and optimization
 * - Comprehensive export and handoff capabilities
 * - Split-file YAML database for better organization
 *
 * Features:
 * - 17 MCP tools for complete project lifecycle management
 * - Atomic file operations with proper locking
 * - Automatic task priority detection
 * - Memory templates for structured note-taking
 * - Markdown export functionality
 * - Session tracking and handoff summaries
 * - Intelligent task analysis and recommendations
 *
 * Architecture:
 * - Service-oriented design with clear separation of concerns
 * - Robust error handling and validation
 * - Comprehensive test coverage
 * - Type-safe operations with Zod schemas
 */

import { MemoryPickleCore } from './core/MemoryPickleCore.js';
import { setupRequestHandlers } from './handlers/RequestHandlers.js';
import { createServer, createTransport, startServer } from './server/ServerConfig.js';

/**
 * Main server startup function
 */
async function main(): Promise<void> {
  try {
    // Create the core business logic instance
    const core = await MemoryPickleCore.create();

    // Create and configure the MCP server
    const server = createServer();

    // Set up all request handlers
    setupRequestHandlers(server, core);

    // Create transport and start server
    const transport = createTransport();
    await startServer(server, transport);

  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

// Start the server
main();
