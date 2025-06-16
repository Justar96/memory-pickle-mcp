#!/usr/bin/env node

/**
 * Memory Pickle MCP Server
 *
 * A simplified project management system that provides:
 * - Project and task management with clear organization
 * - in-memory storage for context and notes
 * - Session handoff capabilities for continuity
 * - Split-file YAML database for better organization
 *
 * Features:
 * - 9 essential MCP tools with research-backed prompts
 * - Atomic file operations with proper locking
 * - Automatic task priority detection
 * - Session tracking and handoff summaries
 * - Clean, agent-friendly interface
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
 * Initializes and launches the Memory Pickle MCP Server.
 *
 * Sets up the core logic, configures the server, registers request handlers, establishes the transport layer, and starts the server process.
 *
 * @remark
 * If startup fails, the process exits with code 1 without logging to standard output or error to prevent interference with MCP standard I/O.
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
    // Note: Avoid console.error to prevent MCP stdio interference
    // Error details are available in the error object for debugging
    process.exit(1);
  }
}

// Start the server
main();
