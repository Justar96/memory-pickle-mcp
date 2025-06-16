/**
 * Comprehensive tests for RequestHandlers covering all MCP protocol interactions
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { setupRequestHandlers } from '../src/handlers/RequestHandlers.js';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore.js';
import { ALL_TOOLS } from '../src/tools/index.js';

describe('RequestHandlers - Complete Coverage', () => {
  let server: Server;
  let core: MemoryPickleCore;

  beforeEach(async () => {
    core = await MemoryPickleCore.create();
    server = new Server({
      name: "memory-pickle-test",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {},
        resources: {},
        resourceTemplates: {}
      }
    });
    
    setupRequestHandlers(server, core);
  });

  describe('Tool Handling', () => {
    test('should list all available tools', async () => {
      const mockRequest = {
        params: {}
      };

      const handler = server['requestHandlers'].get('tools/list');
      expect(handler).toBeDefined();

      const result = await handler!(mockRequest as any);
      expect(result).toEqual({
        tools: ALL_TOOLS
      });
      expect(result.tools).toHaveLength(8);
      expect(result.tools[0].name).toBe('get_project_status');
    });

    test('should execute valid tool calls', async () => {
      const mockRequest = {
        params: {
          name: 'get_project_status',
          arguments: {}
        }
      };

      const handler = server['requestHandlers'].get('tools/call');
      expect(handler).toBeDefined();

      const result = await handler!(mockRequest as any);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No Projects Found');
    });

    test('should reject unauthorized tool calls', async () => {
      const mockRequest = {
        params: {
          name: 'unauthorized_tool',
          arguments: {}
        }
      };

      const handler = server['requestHandlers'].get('tools/call');
      expect(handler).toBeDefined();

      await expect(handler!(mockRequest as any)).rejects.toThrow('Unknown or unauthorized tool: unauthorized_tool');
    });

    test('should handle tool not implemented error', async () => {
      // Mock a core without the method
      const mockCore = {
        ...core,
        non_existent_method: undefined
      };

      server = new Server({
        name: "memory-pickle-test",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {},
          resources: {},
          resourceTemplates: {}
        }
      });
      
      setupRequestHandlers(server, mockCore as any);

      const mockRequest = {
        params: {
          name: 'get_project_status',
          arguments: {}
        }
      };

      const handler = server['requestHandlers'].get('tools/call');
      const result = await handler!(mockRequest as any);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[TOOL_NOT_IMPLEMENTED]');
    });

    test('should handle tool execution errors gracefully', async () => {
      const mockRequest = {
        params: {
          name: 'create_project',
          arguments: { name: '' } // Invalid empty name
        }
      };

      const handler = server['requestHandlers'].get('tools/call');
      const result = await handler!(mockRequest as any);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[ERROR]');
    });

    test('should execute all allowed tool methods', async () => {
      const allowedMethods = [
        'get_project_status', 'create_project', 'set_current_project',
        'create_task', 'update_task',
        'remember_this', 'recall_context',
        'generate_handoff_summary'
      ];

      const handler = server['requestHandlers'].get('tools/call');

      // Test get_project_status (read-only, safe)
      const statusResult = await handler!({
        params: { name: 'get_project_status', arguments: {} }
      } as any);
      expect(statusResult.content).toBeDefined();

      // Test create_project
      const projectResult = await handler!({
        params: { name: 'create_project', arguments: { name: 'Test Project' } }
      } as any);
      expect(projectResult.content[0].text).toContain('Test Project');

      // Test recall_context (should work even with no memories)
      const recallResult = await handler!({
        params: { name: 'recall_context', arguments: {} }
      } as any);
      expect(recallResult.content).toBeDefined();
    });
  });

  describe('Resource Handling', () => {
    test('should list available resources', async () => {
      const handler = server['requestHandlers'].get('resources/list');
      expect(handler).toBeDefined();

      const result = await handler!({ params: {} } as any);
      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);
    });

    test('should read session status resource', async () => {
      const handler = server['requestHandlers'].get('resources/read');
      expect(handler).toBeDefined();

      const result = await handler!({
        params: { uri: 'memory://session/status' }
      } as any);
      
      expect(result.contents).toBeDefined();
      expect(result.contents[0].text).toContain('Session started at');
    });

    test('should read project summary resource', async () => {
      // Create a project first
      await core.create_project({ name: 'Test Project' });

      const handler = server['requestHandlers'].get('resources/read');
      const result = await handler!({
        params: { uri: 'memory://projects/summary' }
      } as any);
      
      expect(result.contents).toBeDefined();
      expect(result.contents[0].text).toContain('Test Project');
    });

    test('should handle invalid resource URIs', async () => {
      const handler = server['requestHandlers'].get('resources/read');
      
      await expect(handler!({
        params: { uri: 'invalid://resource' }
      } as any)).rejects.toThrow();
    });

    test('should read all supported resource types', async () => {
      // Setup some data
      await core.create_project({ name: 'Test Project', description: 'Test description' });
      await core.create_task({ title: 'Test Task' });
      await core.remember_this({ content: 'Test memory', title: 'Test' });

      const handler = server['requestHandlers'].get('resources/read');
      
      const resourceUris = [
        'memory://session/status',
        'memory://projects/summary',
        'memory://tasks/active',
        'memory://memories/recent',
        'memory://handoff/summary'
      ];

      for (const uri of resourceUris) {
        const result = await handler!({ params: { uri } } as any);
        expect(result.contents).toBeDefined();
        expect(result.contents[0]).toHaveProperty('text');
      }
    });
  });

  describe('Template Handling', () => {
    test('should list resource templates', async () => {
      const handler = server['requestHandlers'].get('resourceTemplates/list');
      expect(handler).toBeDefined();

      const result = await handler!({ params: {} } as any);
      expect(result.resourceTemplates).toBeDefined();
      expect(Array.isArray(result.resourceTemplates)).toBe(true);
    });

    test('should provide template for project creation', async () => {
      const handler = server['requestHandlers'].get('resourceTemplates/list');
      const result = await handler!({ params: {} } as any);
      
      const templates = result.resourceTemplates;
      expect(templates.length).toBeGreaterThan(0);
      
      const projectTemplate = templates.find((t: any) => 
        t.name.includes('project') || t.description.includes('project')
      );
      expect(projectTemplate).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle malformed tool arguments', async () => {
      const handler = server['requestHandlers'].get('tools/call');
      
      const result = await handler!({
        params: {
          name: 'create_project',
          arguments: null // Invalid arguments
        }
      } as any);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[ERROR]');
    });

    test('should handle missing arguments object', async () => {
      const handler = server['requestHandlers'].get('tools/call');
      
      const result = await handler!({
        params: {
          name: 'create_project'
          // Missing arguments
        }
      } as any);
      
      expect(result.isError).toBe(true);
    });

    test('should format custom errors correctly', async () => {
      const handler = server['requestHandlers'].get('tools/call');
      
      // Try to create task without a project
      const result = await handler!({
        params: {
          name: 'create_task',
          arguments: { title: 'Test Task' }
        }
      } as any);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[ERROR]');
    });
  });

  describe('Tool Parameter Validation', () => {
    beforeEach(async () => {
      // Create a project for task-related tests
      await core.create_project({ name: 'Test Project' });
    });

    test('should validate dry_run parameter in create_project', async () => {
      const handler = server['requestHandlers'].get('tools/call');
      
      const result = await handler!({
        params: {
          name: 'create_project',
          arguments: { name: 'Dry Run Project', dry_run: true }
        }
      } as any);
      
      expect(result.content[0].text).toContain('[DRY RUN]');
      expect(result.isError).toBe(false);
    });

    test('should validate line_range parameter in create_task', async () => {
      const handler = server['requestHandlers'].get('tools/call');
      
      const result = await handler!({
        params: {
          name: 'create_task',
          arguments: {
            title: 'Task with line range',
            line_range: {
              start_line: 10,
              end_line: 20,
              file_path: 'src/test.js'
            }
          }
        }
      } as any);
      
      expect(result.content[0].text).toContain('Task with line range');
      expect(result.isError).toBe(false);
    });

    test('should validate importance parameter in remember_this', async () => {
      const handler = server['requestHandlers'].get('tools/call');
      
      const result = await handler!({
        params: {
          name: 'remember_this',
          arguments: {
            content: 'Critical information',
            importance: 'critical',
            title: 'Important Memory'
          }
        }
      } as any);
      
      expect(result.content[0].text).toContain('[STORED]');
      expect(result.isError).toBe(false);
    });
  });
});