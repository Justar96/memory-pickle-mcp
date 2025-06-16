import type { z } from 'zod';
import type { projectDatabaseSchema, Task, Project, Memory } from './schemas.js';

// --- Core Database Types (from Zod schemas) ---
export type { ProjectDatabase, Task, Project, Memory } from './schemas.js';
export type { LineRange } from './Task.js';


// --- View Model & Non-persistent Interfaces ---

export interface Milestone {
  id: string;
  title: string;
  due_date?: string;
  completed: boolean;
  tasks: string[]; // Task IDs
}

export interface ProjectSummary {
  project: Project;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  recent_completions: Task[];
  upcoming_tasks: Task[];
  critical_items: Task[];
  completion_percentage: number;
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

