import type { Project, Task, ProjectSummary } from '../types/index.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Service responsible for project management operations
 */
export class ProjectService {
  /**
   * Creates a new project
   */
  createProject(args: { name: string; description?: string; status?: 'planning' | 'in_progress' | 'blocked' | 'completed' | 'archived' }): Project {
    const { name, description, status = 'planning' } = args;
    
    if (!name) {
      throw new Error('Project name is required');
    }

    // Validate status if provided
    if (status && !['planning', 'in_progress', 'blocked', 'completed', 'archived'].includes(status)) {
      throw new Error(`Invalid project status: ${status}. Must be one of: planning, in_progress, blocked, completed, archived`);
    }

    return {
      id: generateId('proj'),
      name,
      description,
      created_date: new Date().toISOString(),
      status,
      completion_percentage: 0,
      tasks: [],
      milestones: []
    };
  }

  /**
   * Updates project completion percentage based on tasks
   */
  updateProjectCompletion(project: Project, tasks: Task[]): void {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    
    if (projectTasks.length === 0) {
      project.completion_percentage = 0;
      return;
    }

    const completedTasks = projectTasks.filter(t => t.completed).length;
    project.completion_percentage = Math.round((completedTasks / projectTasks.length) * 100);

    if (project.completion_percentage === 100) {
      project.status = 'completed';
    } else if (project.completion_percentage > 0) {
      project.status = 'in_progress';
    }
  }

  /**
   * Generates a comprehensive project summary
   */
  generateProjectSummary(project: Project, tasks: Task[]): ProjectSummary {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    
    const completed = projectTasks.filter(t => t.completed);
    const inProgress = projectTasks.filter(t => !t.completed && t.progress && t.progress > 0);
    const blocked = projectTasks.filter(t => t.blockers && t.blockers.length > 0);
    const critical = projectTasks.filter(t => t.priority === 'critical');
    
    const recentCompletions = completed
      .filter(t => t.completed_date)
      .sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime())
      .slice(0, 5);

    const upcoming = projectTasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5);

    return {
      project,
      total_tasks: projectTasks.length,
      completed_tasks: completed.length,
      in_progress_tasks: inProgress.length,
      blocked_tasks: blocked.length,
      recent_completions: recentCompletions,
      upcoming_tasks: upcoming,
      critical_items: critical,
      completion_percentage: project.completion_percentage
    };
  }

  /**
   * Updates a project with new values
   */
  updateProject(projects: Project[], projectId: string, updates: Partial<Project>): Project {
    const project = this.findProjectById(projects, projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Apply updates
    Object.assign(project, updates);
    return project;
  }

  /**
   * Finds a project by ID
   */
  findProjectById(projects: Project[], projectId: string): Project | undefined {
    return projects.find(p => p.id === projectId);
  }

  /**
   * Gets the completion percentage for a project
   */
  getProjectCompletion(projects: Project[], projectId: string): number {
    const project = this.findProjectById(projects, projectId);
    return project?.completion_percentage || 0;
  }

  /**
   * Formats all projects overview
   */
  formatAllProjectsOverview(projects: Project[], tasks: Task[]): string {
    if (projects.length === 0) {
      return `📋 No projects found. Use \`create_project\` to start a new project.`;
    }

    let result = `# 📊 All Projects Overview\n\n`;
    
    projects.forEach(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const completedTasks = projectTasks.filter(t => t.completed).length;
      
      result += `## ${project.name}\n`;
      result += `**Status:** ${project.status} | **Completion:** ${project.completion_percentage}%\n`;
      result += `**Tasks:** ${completedTasks}/${projectTasks.length} completed\n`;
      result += `**ID:** ${project.id}\n\n`;
    });

    return result;
  }
}