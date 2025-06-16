export interface LineRange {
  start_line: number;
  end_line: number;
  file_path?: string;
}

export interface Task {
  id: string;
  project_id: string;
  parent_id?: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_date?: string;
  created_date: string;
  due_date?: string;
  progress?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  subtasks?: string[]; // IDs of subtasks
  notes?: string[];
  blockers?: string[];
  line_range?: LineRange;
}