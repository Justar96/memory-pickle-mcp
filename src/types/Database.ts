import type { Project } from './Project.js';
import type { Task } from './Task.js';
import type { Memory } from './Memory.js';

export interface ProjectDatabase {
  meta: {
    last_updated: string;
    version: string;
    current_project_id?: string;
    session_count: number;
  };
  projects: Project[];
  tasks: Task[];
  memories: Memory[];
  templates: { [key: string]: any };
}

export interface HandoffSummary {
  project_name: string;
  completion_percentage: number;
  last_session_date: string;
  completed_in_last_session: string[];
  in_progress: string[];
  blocked_items: string[];
  next_priorities: string[];
  session_notes: string;
}