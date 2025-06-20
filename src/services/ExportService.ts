import type { ProjectDatabase } from '../types/index.js';

/**
 * Service for exporting session data in various formats
 */
export class ExportService {
  
  /**
   * Export session data as JSON
   */
  static exportAsJson(database: ProjectDatabase, sessionActivity: any): string {
    const exportData = {
      export_info: {
        timestamp: new Date().toISOString(),
        session_duration_minutes: sessionActivity.sessionDuration,
        total_tool_calls: Object.values(sessionActivity.toolUsageCount).reduce((a, b) => (a as number) + (b as number), 0)
      },
      database: {
        projects: database.projects,
        tasks: database.tasks,
        memories: database.memories,
        meta: database.meta
      },
      session_activity: sessionActivity
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export session data as markdown
   */
  static exportAsMarkdown(database: ProjectDatabase, sessionActivity: any, handoffSummary?: string): string {
    let markdown = `# Session Export - ${new Date().toLocaleDateString()}\n\n`;
    
    if (handoffSummary) {
      markdown += handoffSummary + '\n\n---\n\n';
    }

    markdown += `## Complete Session Data\n\n`;
    markdown += `**Export Time:** ${new Date().toLocaleString()}\n`;
    markdown += `**Session Duration:** ${sessionActivity.sessionDuration} minutes\n`;
    markdown += `**Total Tool Calls:** ${Object.values(sessionActivity.toolUsageCount).reduce((a, b) => (a as number) + (b as number), 0)}\n\n`;

    // Projects section
    markdown += `### Projects (${database.projects.length})\n\n`;
    database.projects.forEach(project => {
      const projectTasks = database.tasks.filter(t => t.project_id === project.id);
      const completedTasks = projectTasks.filter(t => t.completed);
      
      markdown += `#### ${project.name}\n`;
      markdown += `- **Status:** ${project.status}\n`;
      markdown += `- **Progress:** ${project.completion_percentage}%\n`;
      markdown += `- **Tasks:** ${completedTasks.length}/${projectTasks.length} completed\n`;
      markdown += `- **ID:** ${project.id}\n`;
      if (project.description) {
        markdown += `- **Description:** ${project.description}\n`;
      }
      markdown += `\n`;
    });

    // Tasks section
    markdown += `### Tasks (${database.tasks.length})\n\n`;
    database.tasks.forEach(task => {
      const status = task.completed ? '[COMPLETED]' : '[ACTIVE]';
      markdown += `#### ${task.title} ${status}\n`;
      markdown += `- **Priority:** ${task.priority}\n`;
      markdown += `- **Project ID:** ${task.project_id}\n`;
      markdown += `- **ID:** ${task.id}\n`;
      if (task.description) {
        markdown += `- **Description:** ${task.description}\n`;
      }
      if (task.progress && task.progress > 0) {
        markdown += `- **Progress:** ${task.progress}%\n`;
      }
      markdown += `\n`;
    });

    // Memories section
    markdown += `### Memories (${database.memories.length})\n\n`;
    database.memories.forEach(memory => {
      markdown += `#### ${memory.title}\n`;
      markdown += `- **Importance:** ${memory.importance}\n`;
      markdown += `- **Content:** ${memory.content}\n`;
      if (memory.project_id) {
        markdown += `- **Project ID:** ${memory.project_id}\n`;
      }
      if (memory.task_id) {
        markdown += `- **Task ID:** ${memory.task_id}\n`;
      }
      markdown += `- **Created:** ${new Date(memory.timestamp).toLocaleString()}\n`;
      markdown += `\n`;
    });

    return markdown;
  }
}