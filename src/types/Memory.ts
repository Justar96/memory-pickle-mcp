export interface Memory {
  id: string;
  timestamp: string;
  category: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  title: string;
  content: string;
  related_memories?: string[];
  task_id?: string; // Link to task if relevant
  project_id?: string; // Link to project if relevant
}

