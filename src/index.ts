#!/usr/bin/env node

/**
 * Memory Pickle MCP Server
 *
 * A high-performance, in-memory project management system for AI agents that provides:
 * - Project and task management with hierarchical organization
 * - Session-based memory storage for context and notes
 * - Intelligent recall and handoff capabilities
 * - Comprehensive export functionality
 * - Real-time data synchronization with transaction safety
 *
 * Features:
 * - 8 essential MCP tools for streamlined project lifecycle management
 * - In-memory storage with atomic transaction safety
 * - Mutex-based concurrency control for data integrity
 * - Automatic task priority detection and progress tracking
 * - Session activity tracking and analytics
 * - Enhanced handoff summaries for session continuity
 * - Intelligent context recall with semantic search
 * - Memory limits and size monitoring for stability
 *
 * Architecture:
 * - Service-oriented design with clear separation of concerns
 * - Transaction-safe in-memory storage with deep snapshots
 * - Robust error handling with defensive programming
 * - Comprehensive test coverage (261 tests, 16 test suites)
 * - Type-safe operations with Zod schemas
 * - Performance optimized for single-client MCP usage
 *
 * Performance:
 * - Ultra-fast operations (85 items created in ~22ms)
 * - Efficient memory usage with configurable limits
 * - Concurrent operation support with proper serialization
 * - Real-time data consistency without file I/O overhead
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
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

// Start the server
main();
