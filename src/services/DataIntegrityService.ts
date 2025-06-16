import type { ProjectDatabase, Project, Task, Memory } from '../types/index.js';

/**
 * Service responsible for maintaining data integrity and consistency
 */
export class DataIntegrityService {
  
  /**
   * Validates and repairs database integrity issues
   */
  validateAndRepair(database: ProjectDatabase): {
    isValid: boolean;
    issues: string[];
    repairedDatabase: ProjectDatabase;
  } {
    const issues: string[] = [];
    const repairedDb = JSON.parse(JSON.stringify(database)); // Deep clone

    // 1. Check referential integrity
    this.validateReferentialIntegrity(repairedDb, issues);
    
    // 2. Check data consistency
    this.validateDataConsistency(repairedDb, issues);
    
    // 3. Check workflow states
    this.validateWorkflowStates(repairedDb, issues);
    
    // 4. Repair orphaned data
    this.repairOrphanedData(repairedDb, issues);
    
    // 5. Validate completion percentages
    this.validateAndRepairCompletionPercentages(repairedDb, issues);

    return {
      isValid: issues.length === 0,
      issues,
      repairedDatabase: repairedDb
    };
  }

  /**
   * Validates referential integrity between projects, tasks, and memories
   */
  private validateReferentialIntegrity(database: ProjectDatabase, issues: string[]): void {
    const projectIds = new Set(database.projects.map(p => p.id));
    const taskIds = new Set(database.tasks.map(t => t.id));

    // Check tasks reference valid projects
    database.tasks.forEach(task => {
      if (!projectIds.has(task.project_id)) {
        issues.push(`Task "${task.title}" (${task.id}) references non-existent project: ${task.project_id}`);
        
        // Auto-repair: Create a default project or assign to existing one
        if (database.projects.length > 0) {
          task.project_id = database.projects[0].id;
          issues.push(`  → Repaired: Assigned task to project "${database.projects[0].name}"`);
        } else {
          // Create a default project
          const defaultProject: Project = {
            id: 'proj_default',
            name: 'Default Project',
            description: 'Auto-created project for orphaned tasks',
            created_date: new Date().toISOString(),
            status: 'planning',
            completion_percentage: 0,
            tasks: [],
            milestones: []
          };
          database.projects.push(defaultProject);
          task.project_id = defaultProject.id;
          issues.push(`  → Repaired: Created default project and assigned task`);
        }
      }
    });

    // Check task parent references
    database.tasks.forEach(task => {
      if (task.parent_id && !taskIds.has(task.parent_id)) {
        issues.push(`Task "${task.title}" (${task.id}) references non-existent parent task: ${task.parent_id}`);
        task.parent_id = undefined;
        issues.push(`  → Repaired: Removed invalid parent reference`);
      }
    });

    // Check memories reference valid projects/tasks
    database.memories.forEach(memory => {
      if (memory.project_id && !projectIds.has(memory.project_id)) {
        issues.push(`Memory "${memory.title}" (${memory.id}) references non-existent project: ${memory.project_id}`);
        memory.project_id = undefined;
        issues.push(`  → Repaired: Removed invalid project reference`);
      }
      
      if (memory.task_id && !taskIds.has(memory.task_id)) {
        issues.push(`Memory "${memory.title}" (${memory.id}) references non-existent task: ${memory.task_id}`);
        memory.task_id = undefined;
        issues.push(`  → Repaired: Removed invalid task reference`);
      }
    });
  }

  /**
   * Validates data consistency (enums, ranges, etc.)
   */
  private validateDataConsistency(database: ProjectDatabase, issues: string[]): void {
    const validProjectStatuses = ['planning', 'in_progress', 'blocked', 'completed', 'archived'];
    const validPriorities = ['critical', 'high', 'medium', 'low'];

    // Validate project statuses
    database.projects.forEach(project => {
      if (!validProjectStatuses.includes(project.status)) {
        issues.push(`Project "${project.name}" has invalid status: ${project.status}`);
        project.status = 'planning';
        issues.push(`  → Repaired: Set status to 'planning'`);
      }
    });

    // Validate task priorities
    database.tasks.forEach(task => {
      if (!validPriorities.includes(task.priority)) {
        issues.push(`Task "${task.title}" has invalid priority: ${task.priority}`);
        task.priority = 'medium';
        issues.push(`  → Repaired: Set priority to 'medium'`);
      }
    });

    // Validate memory priorities
    database.memories.forEach(memory => {
      if (!validPriorities.includes(memory.importance)) {
        issues.push(`Memory "${memory.title}" has invalid importance: ${memory.importance}`);
        memory.importance = 'medium';
        issues.push(`  → Repaired: Set importance to 'medium'`);
      }
    });
  }

  /**
   * Validates workflow states and business logic
   */
  private validateWorkflowStates(database: ProjectDatabase, issues: string[]): void {
    // Check if there are tasks without any project
    const orphanedTasks = database.tasks.filter(task => 
      !database.projects.some(project => project.id === task.project_id)
    );

    if (orphanedTasks.length > 0) {
      issues.push(`Found ${orphanedTasks.length} orphaned tasks without valid projects`);
    }

    // Check for completed projects with incomplete tasks
    database.projects.forEach(project => {
      if (project.status === 'completed') {
        const projectTasks = database.tasks.filter(task => task.project_id === project.id);
        const incompleteTasks = projectTasks.filter(task => !task.completed);
        
        if (incompleteTasks.length > 0) {
          issues.push(`Project "${project.name}" is marked completed but has ${incompleteTasks.length} incomplete tasks`);
          project.status = 'in_progress';
          issues.push(`  → Repaired: Changed project status to 'in_progress'`);
        }
      }
    });
  }

  /**
   * Repairs orphaned data by creating missing relationships
   */
  private repairOrphanedData(database: ProjectDatabase, issues: string[]): void {
    // If no projects exist but tasks do, create a default project
    if (database.projects.length === 0 && database.tasks.length > 0) {
      const defaultProject: Project = {
        id: 'proj_default',
        name: 'Default Project',
        description: 'Auto-created project for existing tasks',
        created_date: new Date().toISOString(),
        status: 'planning',
        completion_percentage: 0,
        tasks: [],
        milestones: []
      };
      database.projects.push(defaultProject);
      
      // Assign all tasks to the default project
      database.tasks.forEach(task => {
        task.project_id = defaultProject.id;
      });
      
      issues.push(`Created default project and assigned ${database.tasks.length} orphaned tasks`);
    }
  }

  /**
   * Validates and repairs completion percentages
   */
  private validateAndRepairCompletionPercentages(database: ProjectDatabase, issues: string[]): void {
    database.projects.forEach(project => {
      // Ensure completion percentage is within valid range
      if (project.completion_percentage < 0 || project.completion_percentage > 100) {
        issues.push(`Project "${project.name}" has invalid completion percentage: ${project.completion_percentage}`);
        
        // Recalculate based on tasks
        const projectTasks = database.tasks.filter(task => task.project_id === project.id);
        if (projectTasks.length > 0) {
          const completedTasks = projectTasks.filter(task => task.completed).length;
          project.completion_percentage = Math.round((completedTasks / projectTasks.length) * 100);
        } else {
          project.completion_percentage = 0;
        }
        
        issues.push(`  → Repaired: Recalculated completion percentage to ${project.completion_percentage}%`);
      }
    });
  }

  /**
   * Generates a health report for the database
   */
  generateHealthReport(database: ProjectDatabase): string {
    const validation = this.validateAndRepair(database);
    
    let report = '# Database Health Report\n\n';
    
    if (validation.isValid) {
      report += '✅ **Status**: Healthy - No issues found\n\n';
    } else {
      report += `⚠️ **Status**: Issues Found (${validation.issues.length} total)\n\n`;
      report += '## Issues and Repairs:\n\n';
      validation.issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
      report += '\n';
    }
    
    // Add statistics
    report += '## Database Statistics:\n\n';
    report += `- **Projects**: ${database.projects.length}\n`;
    report += `- **Tasks**: ${database.tasks.length}\n`;
    report += `- **Memories**: ${database.memories.length}\n`;
    report += `- **Templates**: ${Object.keys(database.templates).length}\n\n`;
    
    // Add recommendations
    if (!validation.isValid) {
      report += '## Recommendations:\n\n';
      report += '1. Use the `create_project` tool before creating tasks\n';
      report += '2. Ensure all task operations reference valid project IDs\n';
      report += '3. Regularly check data integrity using health reports\n';
      report += '4. Use the MCP tools instead of direct YAML editing\n';
    }
    
    return report;
  }
}
