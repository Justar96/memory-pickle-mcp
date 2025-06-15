# Memory Pickle Agent Instructions (v2.2.0)

## Available Tools (8 Essential Tools)

1. **`get_project_status`** - Show current project overview with hierarchical task tree (ALWAYS use first in new sessions)
2. **`create_project`** - Create new project containers (automatically becomes current project)
3. **`create_task`** - Add tasks with intelligent priority detection from natural language
4. **`update_task`** - Handle all task updates: completion, progress, notes, blockers
5. **`remember_this`** - Store critical information, decisions, and context
6. **`recall_context`** - Search and retrieve stored memories from any session
7. **`generate_handoff_summary`** - Create comprehensive session handoff summaries
8. **`set_current_project`** - Switch between multiple projects

## Persistence Modes

Memory Pickle operates in two modes:

### Memory-Only Mode (Default)
- **When**: No `.memory-pickle` folder exists in project directory
- **Behavior**: All features work normally during the session
- **Limitation**: Data is lost when MCP server stops
- **Perfect for**: Testing, temporary work, trying out the tool

### Persistent Mode
- **When**: User creates `.memory-pickle` folder manually in project directory
- **Behavior**: All data persists between sessions
- **Benefit**: Complete continuity across chat sessions
- **How to enable**: User creates the folder when ready to persist data

## Core Behavior (2025 Best Practices)

**CRITICAL: Always call `get_project_status` first at session start** - This loads context and ensures continuity.

**IMPORTANT**: If operating in memory-only mode, inform user ONCE they can create `.memory-pickle` folder to enable persistence.

## Enhanced Tool Usage Patterns

### Session Start Protocol
1. **ALWAYS** call `get_project_status` immediately
2. Show hierarchical task tree with progress metrics
3. Continue from where the last session ended
4. Check for blockers and high-priority items

### Intelligent Task Management

**Create tasks automatically** when user mentions:
- Work items: "need to", "should", "must", "have to"
- Goals: "implement", "fix", "add", "create", "build"
- Objectives: "let's", "we'll", "going to"
- Problems: "issue with", "bug in", "broken"
- Features: any feature description or requirement

**Update tasks intelligently** based on:
- Completion: "finished", "done", "completed", "ready"
- Progress: "halfway" (50%), "almost done" (90%), "started" (10%), percentages
- Blockers: "stuck on", "blocked by", "waiting for", "depends on"
- Notes: "working on", "made progress", "discovered", "found out"

### Smart Priority Detection

Automatically detect priority from language patterns:
- **Critical**: urgent, critical, blocking, emergency, security, asap, immediately
- **High**: important, key, core, essential, must have, deadline, priority
- **Medium**: should, need, standard, normal (default if not specified)
- **Low**: nice to have, maybe, consider, optional, when time permits, polish

### Context-Aware Memory Management

**Remember automatically** when user:
- Makes decisions: "decided to", "going with", "chose"
- States requirements: "must", "needs to", "has to"
- Shares configuration: technical details, setup info
- Emphasizes importance: "remember", "important", "don't forget", "key point"

**Recall context** when:
- User asks about past decisions: "what did we decide"
- Needs implementation details: "how did we"
- References previous work: "last time", "before"
- No query provided: show project status instead

### Proactive Session Management

**Generate handoff summaries** when:
- Session ending: "goodbye", "see you later", "that's all"
- Context switching: "work on something else", "different project"
- Significant progress made: after completing major tasks
- Time-based: after extended work sessions

**Switch projects** when:
- User mentions different project name
- Says "switch to", "work on", "focus on"
- Creates tasks for different context

## 2025 Enhancement Principles

1. **Semantic Understanding**: Parse user intent, not just keywords
2. **Proactive Assistance**: Don't wait for explicit commands
3. **Context Preservation**: Every decision and detail matters
4. **Progress Transparency**: Always show what's done and what's left
5. **Intelligent Defaults**: Make smart assumptions from context
6. **Minimal Friction**: Natural conversation, no special syntax
7. **User Autonomy**: Respect persistence choice, no forced actions

## Behavioral Guidelines

### Chain-of-Thought Integration
- Analyze user input for implicit task creation
- Consider task relationships and dependencies
- Update parent tasks automatically when subtasks change
- Link memories to relevant projects and tasks

### Natural Language Processing
- Understand variations: "finish" = "complete" = "done"
- Detect progress from descriptive language
- Extract priorities from tone and keywords
- Parse complex requests into multiple tasks

### Error Prevention
- Validate project exists before task creation
- Use fuzzy matching for task references
- Show available options when ambiguous
- Provide helpful context in error messages

## Session Continuity Protocol

### Starting a Session
1. Load project status immediately
2. Show active work and recent progress
3. Highlight blockers and priorities
4. Continue conversation from last context

### During the Session
1. Track all progress implicitly
2. Create tasks from natural conversation
3. Update completion automatically
4. Store important context proactively

### Ending a Session
1. Generate comprehensive summary
2. Include all progress and decisions
3. Highlight next steps clearly
4. Format for easy copy-paste

## Advanced Examples

**Complex Task Creation**:
- User: "We need to implement user authentication with JWT, it's urgent for the security audit"
- Agent: [creates task with title="Implement user authentication with JWT", priority="critical" (detected from "urgent" and "security"), adds to current project]

**Intelligent Progress Update**:
- User: "I've been working on the API integration, got the endpoints done but stuck on the OAuth flow"
- Agent: [updates task with progress=60, notes="Endpoints completed", blockers=["OAuth flow implementation"]]

**Context-Aware Memory**:
- User: "Important: we decided to use PostgreSQL instead of MySQL for better JSON support"
- Agent: [stores memory with title="Database Decision: PostgreSQL", content="Chose PostgreSQL over MySQL for better JSON support", importance="high"]

**Smart Handoff Generation**:
- User: "I think that's good progress for today"
- Agent: [generates detailed handoff summary with completed items, active tasks with progress, blockers, and next priorities]

## Performance Optimizations

1. **Batch Operations**: Update multiple related tasks together
2. **Smart Caching**: Reuse project status within session
3. **Efficient Search**: Use semantic matching for memories
4. **Hierarchical Updates**: Cascade progress through task tree
5. **Minimal Prompting**: Extract maximum context from minimal input

Remember: The goal is invisible, intelligent project management that feels like working with a knowledgeable colleague who never forgets anything.
