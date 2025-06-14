import type { Memory, MemoryTemplate, HandoffSummary, Task, Project } from '../types/index.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Service responsible for memory management and handoff operations
 */
export class MemoryService {
  /**
   * Creates a new memory entry
   */
  createMemory(args: {
    title: string;
    content: string;
    category?: string;
    importance?: 'critical' | 'high' | 'medium' | 'low';
    tags?: string[];
    task_id?: string;
    project_id?: string;
  }): Memory {
    const { 
      title, 
      content, 
      category = 'general', 
      importance = 'medium', 
      tags = [], 
      task_id, 
      project_id 
    } = args;
    
    if (!title || !content) {
      throw new Error('Title and content are required');
    }

    return {
      id: generateId('mem'),
      timestamp: new Date().toISOString(),
      category,
      importance,
      tags: Array.isArray(tags) ? tags : [tags],
      title,
      content,
      task_id,
      project_id,
      related_memories: []
    };
  }

  /**
   * Creates and adds a memory to the memories array
   */
  addMemory(memories: Memory[], args: {
    title: string;
    content: string;
    category?: string;
    importance?: 'critical' | 'high' | 'medium' | 'low';
    tags?: string[];
    task_id?: string;
    project_id?: string;
  }): Memory {
    const memory = this.createMemory(args);
    memories.push(memory);
    return memory;
  }

  /**
   * Searches memories based on query and filters
   */
  searchMemories(memories: Memory[], args: {
    query?: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }): Memory[] {
    const { query, category, tags, limit = 10 } = args;
    
    if (!query) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    
    const results = memories.filter(memory => {
      const lowerCaseTags = memory.tags.map(t => t.toLowerCase());

      const matchesQuery =
        memory.title.toLowerCase().includes(lowerQuery) ||
        memory.content.toLowerCase().includes(lowerQuery) ||
        lowerCaseTags.some(tag => tag.includes(lowerQuery));
      
      const matchesCategory = !category || memory.category.toLowerCase() === category.toLowerCase();
      
      // Use AND logic for tags: all provided tags must be present.
      const matchesTags = !tags || tags.every((tag: string) => lowerCaseTags.includes(tag.toLowerCase()));
      
      return matchesQuery && matchesCategory && matchesTags;
    }).slice(0, limit);

    return results;
  }

  /**
   * Formats memory search results for display
   */
  formatMemoryResults(memories: Memory[]): string {
    const formattedResults = memories.map(memory => {
      return `## ${memory.title}
**Category:** ${memory.category} | **Importance:** ${memory.importance}
**Tags:** ${memory.tags.join(', ')}
**Date:** ${new Date(memory.timestamp).toLocaleDateString()}

${memory.content}`;
    }).join('\n\n---\n\n');

    return `🧠 Found ${memories.length} relevant memories:\n\n${formattedResults}`;
  }

  /**
   * Generates a handoff summary for session transitions
   */
  generateHandoffSummary(
    project: Project,
    tasks: Task[],
    sessionCount: number,
    format: 'detailed' | 'compact' = 'detailed',
    sessionStartTime?: Date
  ): HandoffSummary {
    // Get tasks completed in current session (default to last 2 hours if no session start time)
    const sessionCutoff = sessionStartTime || new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const recentlyCompleted = tasks
      .filter(t =>
        t.project_id === project.id &&
        t.completed &&
        t.completed_date &&
        new Date(t.completed_date) > sessionCutoff
      )
      .map(t => t.title);

    const inProgress = tasks
      .filter(t => 
        t.project_id === project.id && 
        !t.completed &&
        (t.progress && t.progress > 0)
      )
      .map(t => `${t.title} (${t.progress}%)`);

    const blocked = tasks
      .filter(t => 
        t.project_id === project.id && 
        t.blockers && 
        t.blockers.length > 0
      )
      .map(t => `${t.title}: ${t.blockers!.join(', ')}`);

    const upcoming = tasks
      .filter(t => 
        t.project_id === project.id && 
        !t.completed &&
        (t.priority === 'critical' || t.priority === 'high')
      )
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5)
      .map(t => `${t.title} (${t.priority})`);

    return {
      project_name: project.name,
      completion_percentage: project.completion_percentage,
      last_session_date: new Date().toISOString(),
      completed_in_last_session: recentlyCompleted,
      in_progress: inProgress,
      blocked_items: blocked,
      next_priorities: upcoming,
      session_notes: `Session #${sessionCount + 1}`
    };
  }

  /**
   * Formats handoff summary for display
   */
  formatHandoffSummary(handoff: HandoffSummary, format: 'detailed' | 'compact' = 'detailed'): string {
    let result = `# 🤝 Project Handoff Summary\n\n`;
    result += `**Project:** ${handoff.project_name}\n`;
    result += `**Completion:** ${handoff.completion_percentage}%\n`;
    result += `**Session Date:** ${new Date(handoff.last_session_date).toLocaleString()}\n\n`;

    if (format === 'detailed') {
      result += `## ✅ Completed This Session\n`;
      if (handoff.completed_in_last_session.length > 0) {
        handoff.completed_in_last_session.forEach(item => {
          result += `- ${item}\n`;
        });
      } else {
        result += `- No tasks completed this session\n`;
      }

      result += `\n## 🔄 In Progress\n`;
      if (handoff.in_progress.length > 0) {
        handoff.in_progress.forEach(item => {
          result += `- ${item}\n`;
        });
      } else {
        result += `- No tasks currently in progress\n`;
      }

      if (handoff.blocked_items.length > 0) {
        result += `\n## 🚨 Blocked Items\n`;
        handoff.blocked_items.forEach(item => {
          result += `- ${item}\n`;
        });
      }

      result += `\n## 🎯 Next Priorities\n`;
      if (handoff.next_priorities.length > 0) {
        handoff.next_priorities.forEach(item => {
          result += `- ${item}\n`;
        });
      } else {
        result += `- No high priority items pending\n`;
      }
    } else {
      // Compact format for easy copy/paste
      result += `**Quick Summary:**\n`;
      result += `Completed: ${handoff.completed_in_last_session.length} tasks | `;
      result += `In Progress: ${handoff.in_progress.length} | `;
      result += `Blocked: ${handoff.blocked_items.length}\n\n`;
      result += `**Continue with:** ${handoff.next_priorities[0] || 'Review project status for next tasks'}`;
    }

    result += `\n\n---\n*Copy this summary to your next chat session to continue where you left off.*`;

    return result;
  }

  /**
   * Applies a template and formats the output
   */
  applyTemplate(templates: { [key: string]: MemoryTemplate }, templateName: string): string {
    if (!templateName) {
      throw new Error('Template name is required');
    }

    const template = templates[templateName];
    if (!template) {
      const availableTemplates = Object.keys(templates).join(', ');
      throw new Error(`Template "${templateName}" not found. Available: ${availableTemplates}`);
    }

    let result = `📋 **Template: ${templateName}**\n**Category:** ${template.category}\n\n`;
    
    template.structure.forEach((step: { step: string; prompt: string }, index: number) => {
      result += `**${index + 1}. ${step.step}**\n${step.prompt}\n\n`;
    });

    result += `\n💡 **Next Steps:**
1. Answer each prompt above
2. Create tasks based on your answers
3. Use \`create_task\` for each action item`;

    return result;
  }

  /**
   * Exports memories to markdown format
   */
  exportMemoriesToMarkdown(memories: Memory[]): string {
    if (memories.length === 0) {
      return '';
    }

    let markdown = `## Memories\n\n`;
    
    memories.forEach(memory => {
      markdown += `### ${memory.title}\n`;
      markdown += `**Category:** ${memory.category} | **Importance:** ${memory.importance}\n`;
      markdown += `**Tags:** ${memory.tags.join(', ')}\n\n`;
      markdown += `${memory.content}\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  }

  /**
   * Generates project management overview
   */
  generateOverview(
    projects: Project[],
    tasks: Task[],
    memories: Memory[],
    sessionCount: number,
    templates: { [key: string]: MemoryTemplate }
  ): string {
    let result = `📊 **Project Management Overview**\n\n`;
    
    // Show project stats
    result += `**Active Projects:** ${projects.length}\n`;
    result += `**Total Tasks:** ${tasks.length}\n`;
    result += `**Completed Tasks:** ${tasks.filter(t => t.completed).length}\n`;
    result += `**Session Count:** ${sessionCount}\n\n`;

    // Show available templates
    result += `**Available Templates:**\n`;
    Object.keys(templates).forEach(template => {
      result += `- ${template}\n`;
    });

    result += `\n💡 Use \`get_project_status\` to see your current tasks.`;

    return result;
  }
}