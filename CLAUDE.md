# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
```bash
npm run build          # Compile TypeScript and make executable
npm run watch          # Watch mode for development
npm run prepare        # Pre-publish build (runs automatically)
```

### Testing
```bash
npm test               # Run all tests with Jest
npm run test:coverage  # Run tests with coverage report
```

### Debugging and Inspection
```bash
npm run inspector      # Launch MCP inspector at http://localhost:6274
node build/index.js    # Run server directly for testing
```

### Version Management
```bash
npm run update-version    # Update version across all config files
npm version patch|minor|major  # Standard npm version bump (auto-syncs)
```

## Architecture Overview

### Core Design Pattern
This is an **MCP (Model Context Protocol) server** that provides AI agents with project management and memory tools. The system uses **in-memory storage only** - no files are persisted to disk.

### Service-Oriented Architecture
```
src/
├── core/MemoryPickleCore.ts     # Main business logic orchestration
├── handlers/RequestHandlers.ts  # MCP protocol request handling
├── services/                    # Domain services
│   ├── InMemoryStore.ts        # Transaction-safe memory storage
│   ├── ProjectService.ts       # Project management logic
│   ├── TaskService.ts          # Task management logic
│   └── MemoryService.ts        # Context/memory management
├── tools/index.ts              # 8 MCP tools with enhanced prompts
└── types/schemas.ts            # Zod validation schemas
```

### Key Architectural Decisions

1. **In-Memory Only Storage**: All data exists only during the session. No file persistence eliminates concurrency issues and simplifies deployment.

2. **Transaction Safety**: InMemoryStore uses snapshot-based transactions to ensure data integrity without file locking complexity.

3. **Service Separation**: Clear boundaries between projects, tasks, and memories with dedicated services for each domain.

4. **MCP Protocol Compliance**: Strict adherence to MCP standards with proper error handling and clean text output.

### Data Flow
1. MCP client calls tool → RequestHandlers 
2. RequestHandlers validates input → MemoryPickleCore methods
3. MemoryPickleCore coordinates services → InMemoryStore transactions
4. Results flow back with clean text formatting

## Tool Architecture

The system provides **8 essential MCP tools** with research-backed prompt engineering:

**Core Workflow Tools:**
- `get_project_status` - Always use first in sessions
- `create_project` - Creates new project contexts
- `create_task` - Auto-detects priority from user language
- `update_task` - Handles progress, completion, blockers

**Memory System:**
- `remember_this` - Stores context and decisions
- `recall_context` - Searches stored memories

**Session Management:**
- `generate_handoff_summary` - Creates session continuity
- `set_current_project` - Switches active context

### Tool Design Principles
- **Action-oriented descriptions** with clear usage triggers
- **Auto-detection patterns** for priority and context
- **Proactive behavior hints** for AI agents
- **Single responsibility** per tool

## Session Memory Model

### Memory Lifecycle
- Data created at session start
- All tools share the same in-memory database
- Data destroyed when session ends
- **Handoff summaries** provide continuity between sessions

### Session Tracking
The core tracks comprehensive session activity:
- Tasks created/updated/completed
- Memories stored
- Project switches
- Tool usage patterns
- Key decisions made

## Development Practices

### Type Safety
- All data validated with **Zod schemas** at runtime
- TypeScript strict mode enforced
- Comprehensive error handling with specific error types

### Testing Strategy
- **133 tests** covering all services and edge cases
- Test utilities in `test/utils/testHelpers.ts`
- Integration tests for MCP protocol compliance
- Coverage reporting available

### Error Handling
- Defensive programming throughout
- Clean error messages for MCP clients
- Graceful degradation when data not found
- No console.error output to prevent MCP stdio interference

## Version Management

The project uses **centralized version management**:
- Single source of truth in `package.json`
- `src/utils/version.ts` reads version dynamically
- `scripts/update-version.mjs` syncs configuration files
- Use `npm version patch` for automated version bumps

## Clean Text Output Philosophy

The system uses **clean text only** (no emojis) for:
- Universal compatibility across environments
- Screen reader accessibility
- Professional appearance in corporate settings
- Clean logs and automation output

Output uses standardized prefixes:
- `[OK]` - Successful operations
- `[ERROR]` - Failed operations
- `[INFO]` - Status information
- `[CURRENT]` - Active project indicators
- `[DONE]` - Completed items

## MCP Integration

### Local Development
```json
{
  "mcpServers": {
    "memory-pickle-dev": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "/path/to/this/repository"
    }
  }
}
```

### Production Configuration
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"]
    }
  }
}
```

The server automatically provides all 8 tools to MCP clients with comprehensive documentation and usage examples.

## MCP Agent Awareness Features

This codebase implements advanced MCP agent awareness patterns following industry best practices:

### 1. Enhanced Tool Specifications
- **Concrete examples**: Every tool includes 2-3 realistic usage examples with actual user quotes
- **Trigger patterns**: Natural language patterns that should activate each tool
- **Priority detection**: Automatic mapping from user urgency language to priority levels
- **Dry-run support**: All mutating operations support `dry_run: true` for safe testing

### 2. Structured Error Handling
- **Specific error classes**: 9 custom error types with clear error codes
- **Self-correction hints**: Error messages include suggestions for valid alternatives
- **Validation feedback**: Structured validation with field-specific guidance
- **Clean text format**: All errors use `[ERROR_CODE]` prefixes for easy parsing

### 3. Proactive Behavior Patterns
- **Auto-detection**: Tools automatically detect priority from user language ("urgent" → critical)
- **Context awareness**: Session tracking provides rich context for handoff summaries
- **Smart defaults**: Tools work together automatically (current project linking)
- **Decision routing**: Clear if/then patterns for when to use each tool

### 4. Testing and Validation
- **Dry-run mode**: `dry_run: true` parameter validates inputs without changes
- **Error simulation**: Test error conditions safely with structured error responses
- **Integration testing**: 133 tests cover all tool interactions and edge cases
- **Schema validation**: Runtime validation with Zod ensures type safety

### Example Error Responses
```
[TASK_NOT_FOUND] Task 'auth_task' not found. Available tasks: login_ui, jwt_setup, oauth_flow...
[VALIDATION_ERROR] Validation failed for field 'priority': Must be one of: critical, high, medium, low. Received: urgent
[DRY_RUN] create_project: Would create project 'E-commerce Site' and set it as current project. No changes made.
```

### Agent Integration Patterns
The tools follow these patterns for optimal agent adoption:

1. **Session initialization**: Always start with `get_project_status`
2. **Natural triggers**: Listen for action words ("need to" → `create_task`)
3. **Progress tracking**: Detect completion phrases ("I finished" → `update_task`)
4. **Memory storage**: Auto-trigger on importance keywords ("remember that")
5. **Error recovery**: Specific error codes enable intelligent retry strategies