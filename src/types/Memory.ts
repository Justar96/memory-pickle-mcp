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

export interface MemoryTemplate {
  category: string;
  structure: TemplateStep[];
  auto_trigger?: string[];
}

export interface TemplateStep {
  step: string;
  prompt: string;
}