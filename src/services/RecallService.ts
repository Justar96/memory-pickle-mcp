import type { ProjectDatabase, Project, Task, Memory } from '../types/index.js';

/**
 * Service for universal state recall - combines projects, tasks, and memories
 * into optimized, ranked JSON responses for agent planning
 */
export class RecallService {

  /**
   * Universal state recall - returns ranked, filtered context in single call
   */
  static generateStateRecall(
    database: ProjectDatabase,
    args: {
      limit?: number;
      project_id?: string;
      include_completed?: boolean;
      memory_importance?: 'low' | 'medium' | 'high' | 'critical';
      focus?: 'tasks' | 'projects' | 'memories' | 'all';
    } = {}
  ): {
    current_project: Project | null;
    active_tasks: Task[];
    overdue_tasks: Task[];
    recent_completions: Task[];
    recent_memories: Memory[];
    project_stats: {
      total: number;
      in_progress: number;
      completed: number;
      blocked: number;
    };
    task_stats: {
      total: number;
      active: number;
      completed: number;
      critical: number;
      high_priority: number;
    };
    session_context: {
      current_project_id?: string;
      total_projects: number;
      total_tasks: number;
      total_memories: number;
    };
  } {
    const {
      limit = 20,
      project_id,
      include_completed = false,
      memory_importance,
      focus = 'all'
    } = args;

    // Get current project
    const currentProjectId = project_id || database.meta?.current_project_id;
    const currentProject = currentProjectId 
      ? database.projects.find(p => p.id === currentProjectId) || null
      : null;

    // Filter tasks by project if specified
    let tasks = database.tasks;
    if (currentProjectId) {
      tasks = tasks.filter(t => t.project_id === currentProjectId);
    }

    // Get active tasks (prioritized and ranked)
    const activeTasks = tasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        // Sort by priority first, then creation date
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
      })
      .slice(0, Math.floor(limit * 0.6)); // 60% of limit for active tasks

    // Get overdue tasks (tasks with blockers or high priority older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const overdueTasks = tasks
      .filter(t => !t.completed && (
        (t.blockers && t.blockers.length > 0) ||
        (t.priority === 'critical' && new Date(t.created_date) < sevenDaysAgo)
      ))
      .slice(0, 5);

    // Get recent completions
    const recentCompletions = include_completed
      ? tasks
          .filter(t => t.completed && t.completed_date)
          .sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime())
          .slice(0, Math.floor(limit * 0.2)) // 20% of limit
      : [];

    // Filter memories
    let memories = database.memories;
    if (currentProjectId) {
      memories = memories.filter(m => 
        m.project_id === currentProjectId || 
        (!m.project_id && m.task_id && tasks.some(t => t.id === m.task_id))
      );
    }
    if (memory_importance) {
      memories = memories.filter(m => m.importance === memory_importance);
    }

    // Get recent memories (ranked by importance and recency)
    const recentMemories = memories
      .sort((a, b) => {
        // Sort by importance first, then recency
        const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
        if (importanceDiff !== 0) return importanceDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, Math.floor(limit * 0.2)); // 20% of limit

    // Calculate project stats
    const projectStats = {
      total: database.projects.length,
      in_progress: database.projects.filter(p => p.status === 'in_progress').length,
      completed: database.projects.filter(p => p.status === 'completed').length,
      blocked: database.projects.filter(p => p.status === 'blocked').length
    };

    // Calculate task stats
    const allTasks = database.tasks;
    const taskStats = {
      total: allTasks.length,
      active: allTasks.filter(t => !t.completed).length,
      completed: allTasks.filter(t => t.completed).length,
      critical: allTasks.filter(t => t.priority === 'critical' && !t.completed).length,
      high_priority: allTasks.filter(t => t.priority === 'high' && !t.completed).length
    };

    // Session context
    const sessionContext = {
      current_project_id: currentProjectId,
      total_projects: database.projects.length,
      total_tasks: database.tasks.length,
      total_memories: database.memories.length
    };

    return {
      current_project: currentProject,
      active_tasks: activeTasks,
      overdue_tasks: overdueTasks,
      recent_completions: recentCompletions,
      recent_memories: recentMemories,
      project_stats: projectStats,
      task_stats: taskStats,
      session_context: sessionContext
    };
  }

  /**
   * Format state recall as human-readable text
   */
  static formatStateRecall(stateData: ReturnType<typeof RecallService.generateStateRecall>): string {
    let output = `# 🎯 Universal State Recall\n\n`;

    // Current project context
    if (stateData.current_project) {
      output += `## 📋 Current Project: **${stateData.current_project.name}**\n`;
      output += `Status: ${stateData.current_project.status} | Completion: ${stateData.current_project.completion_percentage}%\n`;
      if (stateData.current_project.description) {
        output += `${stateData.current_project.description.substring(0, 150)}${stateData.current_project.description.length > 150 ? '...' : ''}\n`;
      }
      output += `\n`;
    } else {
      output += `## 📋 No Current Project Set\n`;
      output += `Use \`set_current_project\` to focus on a specific project.\n\n`;
    }

    // Active tasks (prioritized)
    if (stateData.active_tasks.length > 0) {
      output += `## 🔥 Active Tasks (${stateData.active_tasks.length})\n`;
      stateData.active_tasks.forEach((task, index) => {
        const priorityEmoji = { critical: '🚨', high: '⚡', medium: '📌', low: '📝' };
        output += `${index + 1}. ${priorityEmoji[task.priority]} **${task.title}** (${task.priority})\n`;
        if (task.progress && task.progress > 0) {
          output += `   Progress: ${task.progress}%\n`;
        }
      });
      output += `\n`;
    }

    // Overdue/blocked tasks
    if (stateData.overdue_tasks.length > 0) {
      output += `## ⚠️ Overdue/Blocked Tasks (${stateData.overdue_tasks.length})\n`;
      stateData.overdue_tasks.forEach((task, index) => {
        output += `${index + 1}. **${task.title}** (${task.priority})\n`;
        if (task.blockers && task.blockers.length > 0) {
          output += `   🚫 Blocked: ${task.blockers[0]}\n`;
        }
      });
      output += `\n`;
    }

    // Recent completions
    if (stateData.recent_completions.length > 0) {
      output += `## ✅ Recent Completions (${stateData.recent_completions.length})\n`;
      stateData.recent_completions.forEach((task, index) => {
        const completedDate = task.completed_date 
          ? new Date(task.completed_date).toLocaleDateString()
          : 'Recently';
        output += `${index + 1}. **${task.title}** (${completedDate})\n`;
      });
      output += `\n`;
    }

    // Recent memories
    if (stateData.recent_memories.length > 0) {
      output += `## 🧠 Recent Context (${stateData.recent_memories.length})\n`;
      stateData.recent_memories.forEach((memory, index) => {
        const importanceEmoji = { critical: '🚨', high: '⚡', medium: '📝', low: '💡' };
        output += `${index + 1}. ${importanceEmoji[memory.importance]} **${memory.title}**\n`;
        output += `   ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}\n`;
      });
      output += `\n`;
    }

    // Summary stats
    output += `## 📊 Summary Statistics\n`;
    output += `**Projects:** ${stateData.project_stats.total} total`;
    if (stateData.project_stats.in_progress > 0) {
      output += ` (${stateData.project_stats.in_progress} in progress)`;
    }
    if (stateData.project_stats.blocked > 0) {
      output += ` (${stateData.project_stats.blocked} blocked)`;
    }
    output += `\n`;
    
    output += `**Tasks:** ${stateData.task_stats.active}/${stateData.task_stats.total} active`;
    if (stateData.task_stats.critical > 0) {
      output += ` (${stateData.task_stats.critical} critical)`;
    }
    output += `\n`;
    
    output += `**Memories:** ${stateData.session_context.total_memories} stored\n`;

    return output;
  }

  /**
   * Search and rank memories with advanced filtering
   */
  static searchMemories(
    memories: Memory[],
    query: string,
    options: {
      importance?: 'low' | 'medium' | 'high' | 'critical';
      project_id?: string;
      task_id?: string;
      limit?: number;
    } = {}
  ): Memory[] {
    const { importance, project_id, task_id, limit = 10 } = options;
    
    let filtered = memories;

    // Apply filters
    if (importance) {
      filtered = filtered.filter(m => m.importance === importance);
    }
    if (project_id) {
      filtered = filtered.filter(m => m.project_id === project_id);
    }
    if (task_id) {
      filtered = filtered.filter(m => m.task_id === task_id);
    }

    // Text search with ranking
    if (query?.trim()) {
      const searchTerm = query.trim().toLowerCase();
      filtered = filtered
        .map(memory => {
          let score = 0;
          const titleMatch = memory.title.toLowerCase().includes(searchTerm);
          const contentMatch = memory.content.toLowerCase().includes(searchTerm);
          
          if (titleMatch) score += 10;
          if (contentMatch) score += 5;
          
          // Boost score based on importance
          const importanceBoost = { critical: 4, high: 3, medium: 2, low: 1 };
          score += importanceBoost[memory.importance];
          
          // Boost recent memories
          const age = Date.now() - new Date(memory.timestamp).getTime();
          const daysSinceCreated = age / (1000 * 60 * 60 * 24);
          if (daysSinceCreated < 7) score += 2;
          
          return { memory, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.memory);
    } else {
      // Sort by importance and recency if no search query
      const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered = filtered.sort((a, b) => {
        const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
        if (importanceDiff !== 0) return importanceDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    }

    return filtered.slice(0, limit);
  }
}