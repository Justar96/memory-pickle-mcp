import type { Task } from './Task.js';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_date: string;
  status: 'planning' | 'in_progress' | 'blocked' | 'completed' | 'archived';
  completion_percentage: number;
  tasks: string[]; // Task IDs
  milestones?: Milestone[];
}

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