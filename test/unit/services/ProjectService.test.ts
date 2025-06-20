/**
 * Unit Tests for ProjectService
 * 
 * Tests individual ProjectService methods in isolation
 */

import { ProjectService } from '../../../src/services/ProjectService.js';

describe('ProjectService Unit Tests', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    projectService = new ProjectService();
  });

  describe('createProject', () => {
    it('should create a project with default values', () => {
      const project = projectService.createProject({
        name: 'Test Project',
        description: 'A test project'
      });

      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('A test project');
      expect(project.status).toBe('planning');
      expect(project.completion_percentage).toBe(0);
      expect(project.id).toMatch(/^proj_/);
      expect(Array.isArray(project.tasks)).toBe(true);
      expect(project.tasks).toHaveLength(0);
    });

    it('should create a project with custom status', () => {
      const project = projectService.createProject({
        name: 'Custom Project',
        description: 'Custom description',
        status: 'in_progress'
      });

      expect(project.status).toBe('in_progress');
    });

    it('should throw error for empty name', () => {
      expect(() => {
        projectService.createProject({
          name: '',
          description: 'Test'
        });
      }).toThrow();
    });
  });

  describe('findProjectById', () => {
    it('should find existing project', () => {
      const projects = [
        projectService.createProject({ name: 'Project 1' }),
        projectService.createProject({ name: 'Project 2' })
      ];

      const found = projectService.findProjectById(projects, projects[0].id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Project 1');
    });

    it('should return undefined for non-existent project', () => {
      const projects = [
        projectService.createProject({ name: 'Project 1' })
      ];

      const found = projectService.findProjectById(projects, 'nonexistent');
      expect(found).toBeUndefined();
    });

    it('should handle empty projects array', () => {
      const found = projectService.findProjectById([], 'any-id');
      expect(found).toBeUndefined();
    });
  });

  describe('updateProject', () => {
    it('should update project fields', () => {
      const projects = [
        projectService.createProject({ name: 'Original Name' })
      ];

      const updated = projectService.updateProject(projects, projects[0].id, {
        name: 'Updated Name',
        description: 'Updated Description',
        status: 'in_progress'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated Description');
      expect(updated.status).toBe('in_progress');
    });

    it('should throw error for non-existent project', () => {
      const projects = [
        projectService.createProject({ name: 'Test' })
      ];

      expect(() => {
        projectService.updateProject(projects, 'nonexistent', {
          name: 'New Name'
        });
      }).toThrow('Project not found: nonexistent');
    });
  });
}); 