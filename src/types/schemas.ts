import { z } from 'zod';

// Schemas for primitive/reused types
const prioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

// Line range schema for code/content references
const lineRangeSchema = z.object({
  start_line: z.number().int().positive(),
  end_line: z.number().int().positive(),
  file_path: z.string().optional(),
}).refine(
  (data) => data.start_line <= data.end_line,
  {
    message: "start_line must be less than or equal to end_line",
    path: ["start_line"]
  }
).optional();

export const taskSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  parent_id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  completed_date: z.string().optional(),
  created_date: z.string(),
  due_date: z.string().optional(),
  progress: z.number().optional(),
  priority: prioritySchema,
  tags: z.array(z.string()).default([]),
  subtasks: z.array(z.string()).optional().default([]),
  notes: z.array(z.string()).optional().default([]),
  blockers: z.array(z.string()).optional().default([]),
  line_range: lineRangeSchema,
});

export const milestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  due_date: z.string().optional(),
  completed: z.boolean(),
  tasks: z.array(z.string()).default([]),
});

// Schema for Project
const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  created_date: z.string(),
  status: z.enum(['planning', 'in_progress', 'blocked', 'completed', 'archived']),
  completion_percentage: z.number(),
  tasks: z.array(z.string()).default([]),
  milestones: z.array(milestoneSchema).optional().default([]),
});

// Schema for Memory
const memorySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  category: z.string(),
  importance: prioritySchema,
  tags: z.array(z.string()).default([]),
  title: z.string(),
  content: z.string(),
  related_memories: z.array(z.string()).optional().default([]),
  task_id: z.string().optional(),
  project_id: z.string().optional(),
  line_range: lineRangeSchema,
});

// Main Database Schema
export const projectDatabaseSchema = z.object({
  meta: z.object({
    last_updated: z.string(),
    version: z.string(),
    current_project_id: z.string().optional(),
    session_count: z.number(),
  }),
  projects: z.array(projectSchema).default([]),
  tasks: z.array(taskSchema).default([]),
  memories: z.array(memorySchema).default([]),
  templates: z.record(z.any()).default({}),
});

// Type inference for easy use
export type ProjectDatabase = z.infer<typeof projectDatabaseSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Memory = z.infer<typeof memorySchema>;