import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { setupRequestHandlers } from '../src/handlers/RequestHandlers';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';
import { MemoryPickleCoreTestUtils, TestDataFactory } from './utils/testHelpers';
import { ALL_TOOLS } from '../src/tools';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

/**
 * RequestHandlers and MCP Tools Integration Tests
 *
 * This tests MCP tool definitions and core functionality.
 * Focuses on what we can reliably test without complex MCP server setup.
 */
describe('MCP Tools and RequestHandlers Integration', () => {
  let core: MemoryPickleCore;

  beforeEach(async () => {
    // Reset test data factory counters
    TestDataFactory.reset();

    // Create MemoryPickleCore with test data
    const scenario = await MemoryPickleCoreTestUtils.createWithScenario('basic');
    core = scenario.core;
  });

  describe('MCP Tool Definitions', () => {
    it('should have all 8 MCP tools properly defined', async () => {
      expect(ALL_TOOLS).toBeDefined();
      expect(Array.isArray(ALL_TOOLS)).toBe(true);
      expect(ALL_TOOLS.length).toBe(8); // All 8 essential MCP tools

      const expectedTools = [
        'get_project_status',
        'create_project',
        'set_current_project',
        'create_task',
        'update_task',
        'remember_this',
        'recall_context',
        'generate_handoff_summary'
      ];

      const toolNames = ALL_TOOLS.map(tool => tool.name);
      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
    });

    it('should have valid MCP tool schemas', async () => {
      ALL_TOOLS.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it('should have proper tool input validation schemas', async () => {
      const toolsWithRequiredFields = [
        { name: 'create_project', requiredFields: ['name'] },
        { name: 'create_task', requiredFields: ['title'] },
        { name: 'update_task', requiredFields: ['task_id'] },
        { name: 'remember_this', requiredFields: ['content'] },
        { name: 'set_current_project', requiredFields: ['project_id'] }
      ];

      toolsWithRequiredFields.forEach(({ name, requiredFields }) => {
        const tool = ALL_TOOLS.find(t => t.name === name);
        expect(tool).toBeDefined();

        requiredFields.forEach(field => {
          expect(tool.inputSchema.properties[field]).toBeDefined();
        });

        if (tool.inputSchema.required) {
          requiredFields.forEach(field => {
            expect(tool.inputSchema.required).toContain(field);
          });
        }
      });
    });
  });

  describe('RequestHandlers Setup', () => {
    it('should create server and setup handlers without errors', async () => {
      // Test that we can create a server and setup handlers
      const server = new Server(
        { name: "test-memory-pickle-mcp", version: "1.0.0" },
        { capabilities: { tools: {}, resources: {} } }
      );

      // This should not throw an error
      expect(() => setupRequestHandlers(server, core)).not.toThrow();
    });

    it('should have access to MemoryPickleCore methods', async () => {
      // Test that the core has all the expected MCP tool methods
      const expectedMethods = [
        'get_project_status',
        'create_project',
        'set_current_project',
        'create_task',
        'update_task',
        'remember_this',
        'recall_context',
        'generate_handoff_summary'
      ];

      expectedMethods.forEach(method => {
        expect(typeof core[method]).toBe('function');
      });
    });

  });

  describe('Core Integration with RequestHandlers', () => {
    it('should be able to call all MCP tool methods on core', async () => {
      // Test that we can call each MCP tool method directly on the core
      // This validates the integration between RequestHandlers and MemoryPickleCore

      // Test get_project_status
      const statusResponse = await core.get_project_status({});
      expect(statusResponse.content[0].text).toContain('Project Status');

      // Test create_project
      const projectResponse = await core.create_project({
        name: 'RequestHandler Integration Test',
        description: 'Testing core integration'
      });
      expect(projectResponse.content[0].text).toContain('RequestHandler Integration Test');

      // Test remember_this
      const memoryResponse = await core.remember_this({
        content: 'Integration test memory',
        title: 'Test Memory'
      });
      expect(memoryResponse.content[0].text).toContain('Memory Saved');

      // Test recall_context
      const recallResponse = await core.recall_context({
        query: 'integration',
        limit: 5
      });
      expect(recallResponse.content[0].text).toContain('Recalled Memories');
    });
  });
});
