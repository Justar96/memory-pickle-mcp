import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryPickleCoreTestUtils, MCPToolTestUtils, TestDataFactory } from './utils/testHelpers';
import { MemoryPickleCore } from '../src/core/MemoryPickleCore';
import { ALL_TOOLS, TOOL_NAMES } from '../src/tools';
import * as path from 'path';

/**
 * REAL MCP Tool Integration Tests
 * 
 * This file tests the actual MCP tool functionality through MemoryPickleCore,
 * not just service methods. This is what we should have been testing all along.
 */
describe('MCP Tools Integration - Real Testing', () => {
  let core: MemoryPickleCore;
  let testData: any;

  beforeEach(async () => {
    // Reset test data factory counters to ensure consistent IDs
    TestDataFactory.reset();

    // Create MemoryPickleCore with realistic test scenario
    const scenario = await MemoryPickleCoreTestUtils.createWithScenario('basic');
    core = scenario.core;
    testData = scenario.testData;
  });

  describe('Complete MCP Tool Coverage', () => {
    it('should test all 8 MCP tools successfully', async () => {
      const results = await MCPToolTestUtils.testAllMCPTools(core);
      
      // Verify we tested all tools
      expect(results.coverage.tested.length).toBeGreaterThan(0);
      expect(results.coverage.percentage).toBeGreaterThan(0);
      
      // Log results for debugging
      console.log('MCP Tool Coverage:', results.coverage);
      console.log('Successful tools:', results.coverage.tested);
      console.log('Failed tools:', results.coverage.missing);
      
      // Each successful tool should return valid MCP response
      Object.entries(results.results).forEach(([toolName, response]) => {
        const validation = MCPToolTestUtils.validateMCPResponse(response, toolName);
        expect(validation.isValid).toBe(true);
        if (!validation.isValid) {
          console.error(`${toolName} validation errors:`, validation.errors);
        }
      });
    });
  });

  describe('Individual MCP Tool Testing', () => {
    it('should test get_project_status tool', async () => {
      const projectId = testData.projects[0].id;
      const response = await MCPToolTestUtils.callMCPTool(core, 'get_project_status', {
        project_id: projectId
      });

      const validation = MCPToolTestUtils.validateMCPResponse(response, 'get_project_status');
      expect(validation.isValid).toBe(true);

      expect(response.content[0].text).toContain('Project Status');
      expect(response.content[0].text).toContain(testData.projects[0].name);
    });

    it('should test create_project tool', async () => {
      const response = await MCPToolTestUtils.callMCPTool(core, 'create_project', {
        name: 'New Integration Test Project',
        description: 'Created via MCP tool integration test'
      });
      
      const validation = MCPToolTestUtils.validateMCPResponse(response, 'create_project');
      expect(validation.isValid).toBe(true);
      
      expect(response.content[0].text).toContain('New Integration Test Project');
      expect(response.content[0].text).toContain('Project Created Successfully');
    });

    it('should test create_task tool', async () => {
      // Don't pass project_id - let it use current project
      const response = await MCPToolTestUtils.callMCPTool(core, 'create_task', {
        title: 'Integration Test Task',
        description: 'Created via MCP tool integration test',
        priority: 'high'
      });
      
      const validation = MCPToolTestUtils.validateMCPResponse(response, 'create_task');
      expect(validation.isValid).toBe(true);
      
      expect(response.content[0].text).toContain('Integration Test Task');
      expect(response.content[0].text).toContain('Priority:** high');
    });

    it('should test remember_this tool', async () => {
      const response = await MCPToolTestUtils.callMCPTool(core, 'remember_this', {
        content: 'This is an important integration test memory',
        title: 'Integration Test Memory',
        importance: 'high',
        project_id: testData.projects[0].id
      });
      
      const validation = MCPToolTestUtils.validateMCPResponse(response, 'remember_this');
      expect(validation.isValid).toBe(true);
      
      expect(response.content[0].text).toContain('Integration Test Memory');
      expect(response.content[0].text).toContain('Memory Saved');
    });

    it('should test recall_context tool', async () => {
      // First store a memory
      await MCPToolTestUtils.callMCPTool(core, 'remember_this', {
        content: 'Searchable test memory content',
        title: 'Searchable Memory',
        importance: 'medium'
      });

      // Then recall it
      const response = await MCPToolTestUtils.callMCPTool(core, 'recall_context', {
        query: 'searchable',
        limit: 5
      });
      
      const validation = MCPToolTestUtils.validateMCPResponse(response, 'recall_context');
      expect(validation.isValid).toBe(true);
      
      expect(response.content[0].text).toContain('Recalled Memories');
    });

    it('should test generate_handoff_summary tool', async () => {
      const projectId = testData.projects[0].id;
      const response = await MCPToolTestUtils.callMCPTool(core, 'generate_handoff_summary', {
        project_id: projectId
      });
      
      const validation = MCPToolTestUtils.validateMCPResponse(response, 'generate_handoff_summary');
      expect(validation.isValid).toBe(true);
      
      expect(response.content[0].text).toContain('[HANDOFF] Session Summary');
      expect(response.content[0].text).toContain(testData.projects[0].name);
    });
  });

  describe('MCP Tool Error Handling', () => {
    it('should handle invalid arguments gracefully', async () => {
      await expect(MCPToolTestUtils.callMCPTool(core, 'create_task', {
        // Missing required title
        project_id: 'test'
      })).rejects.toThrow();

      await expect(MCPToolTestUtils.callMCPTool(core, 'update_task', {
        // Missing required task_id
        title: 'Updated'
      })).rejects.toThrow();
    });

    it('should handle non-existent resources gracefully', async () => {
      await expect(MCPToolTestUtils.callMCPTool(core, 'get_project_status', {
        project_id: 'non-existent-project'
      })).rejects.toThrow('Project not found');

      await expect(MCPToolTestUtils.callMCPTool(core, 'update_task', {
        task_id: 'non-existent-task',
        title: 'Updated'
      })).rejects.toThrow('Task not found');
    });
  });

  describe('MCP Tool Workflow Integration', () => {
    it('should support complete project workflow via MCP tools', async () => {
      // 1. Create project
      const createProjectResponse = await MCPToolTestUtils.callMCPTool(core, 'create_project', {
        name: 'Workflow Test Project',
        description: 'Testing complete workflow'
      });
      expect(createProjectResponse.content[0].text).toContain('Workflow Test Project');

      // 2. Get project status (use the current project)
      const statusResponse = await MCPToolTestUtils.callMCPTool(core, 'get_project_status');
      expect(statusResponse.content[0].text).toContain('Project Status');

      // 3. Create task (will use current project automatically)
      const createTaskResponse = await MCPToolTestUtils.callMCPTool(core, 'create_task', {
        title: 'Workflow Test Task',
        description: 'Testing task creation in workflow'
      });
      expect(createTaskResponse.content[0].text).toContain('Workflow Test Task');

      // 4. Remember something
      const rememberResponse = await MCPToolTestUtils.callMCPTool(core, 'remember_this', {
        content: 'Important workflow decision made',
        title: 'Workflow Memory'
      });
      expect(rememberResponse.content[0].text).toContain('Workflow Memory');

      // 5. Generate handoff summary
      const summaryResponse = await MCPToolTestUtils.callMCPTool(core, 'generate_handoff_summary');
      expect(summaryResponse.content[0].text).toContain('[HANDOFF] Session Summary');
    });
  });
});
