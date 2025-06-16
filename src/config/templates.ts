import type { MemoryTemplate } from '../types/index.js';

export const DEFAULT_TEMPLATES: { [key: string]: MemoryTemplate } = {
  project_checklist: {
    category: "project_management",
    structure: [
      { step: "Project Goals", prompt: "What are the main goals of this project?" },
      { step: "Key Milestones", prompt: "What are the major milestones?" },
      { step: "Initial Tasks", prompt: "What are the first tasks to complete?" },
      { step: "Success Criteria", prompt: "How will we measure success?" }
    ],
    auto_trigger: ["checklist", "project plan", "todo list", "task list"]
  },
  sprint_planning: {
    category: "project_management",
    structure: [
      { step: "Sprint Goals", prompt: "What should be accomplished this sprint?" },
      { step: "Task Breakdown", prompt: "Break down into specific tasks" },
      { step: "Priorities", prompt: "What are the must-have vs nice-to-have items?" },
      { step: "Blockers", prompt: "Any known blockers or dependencies?" }
    ],
    auto_trigger: ["sprint", "iteration", "weekly plan"]
  },
  daily_standup: {
    category: "project_management",
    structure: [
      { step: "Completed", prompt: "What was completed since last session?" },
      { step: "In Progress", prompt: "What's currently being worked on?" },
      { step: "Blockers", prompt: "Any blockers or issues?" },
      { step: "Next Steps", prompt: "What's planned for next?" }
    ],
    auto_trigger: ["daily", "standup", "progress update"]
  }
};