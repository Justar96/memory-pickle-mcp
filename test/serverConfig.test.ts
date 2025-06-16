/**
 * Tests for ServerConfig and related infrastructure
 */

import { createServer, createTransport } from '../src/server/ServerConfig.js';
import { SERVER_CONFIG } from '../src/config/constants.js';

describe('ServerConfig', () => {
  describe('createServer', () => {
    test('should create server with correct configuration', () => {
      const server = createServer();
      
      expect(server).toBeDefined();
      expect(server.name).toBe('memory-pickle-mcp');
      expect(server.version).toBe(SERVER_CONFIG.version);
    });

    test('should create server with tool capabilities', () => {
      const server = createServer();
      
      expect(server.capabilities).toBeDefined();
      expect(server.capabilities.tools).toBeDefined();
      expect(server.capabilities.resources).toBeDefined();
      expect(server.capabilities.resourceTemplates).toBeDefined();
    });

    test('should set up request handlers', () => {
      const server = createServer();
      
      // Check that the server can handle requests (handlers will be added by setupRequestHandlers)
      expect(server.setRequestHandler).toBeDefined();
      expect(typeof server.setRequestHandler).toBe('function');
    });
  });

  describe('createTransport', () => {
    test('should create stdio transport', () => {
      const transport = createTransport();
      
      expect(transport).toBeDefined();
      expect(transport.start).toBeDefined();
      expect(typeof transport.start).toBe('function');
    });
  });

  describe('Server and Transport Integration', () => {
    test('should be able to connect server and transport', async () => {
      const server = createServer();
      const transport = createTransport();
      
      expect(server.connect).toBeDefined();
      expect(typeof server.connect).toBe('function');
      
      // Note: We don't actually call connect() as it would start the server
      // and interfere with the test environment
    });
  });
});

describe('Constants', () => {
  test('should export SERVER_CONFIG with version', () => {
    expect(SERVER_CONFIG.version).toBeDefined();
    expect(typeof SERVER_CONFIG.version).toBe('string');
    expect(SERVER_CONFIG.version.length).toBeGreaterThan(0);
  });

  test('should have valid semantic version format', () => {
    // Basic semantic version check (major.minor.patch)
    const versionPattern = /^\d+\.\d+\.\d+/;
    expect(SERVER_CONFIG.version).toMatch(versionPattern);
  });
});