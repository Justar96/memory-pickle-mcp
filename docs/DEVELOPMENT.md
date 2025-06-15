# Development Guide

## Project Structure

```
memory-pickle-mcp/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── services/             # Business logic
│   │   ├── ProjectService.ts # Project management
│   │   ├── TaskService.ts    # Task operations
│   │   ├── MemoryService.ts  # Memory & handoffs
│   │   ├── StorageService.ts # Database persistence
│   │   └── DataIntegrityService.ts # Database validation
│   ├── tools/                # MCP tool definitions
│   │   └── index.ts          # 8 essential tools with optimized prompts
│   ├── types/                # TypeScript interfaces
│   ├── utils/                # Utility functions
│   └── config/               # Configuration & constants
├── build/                    # Compiled JavaScript
├── docs/                     # Documentation
└── test/                     # Test files
```

## Setup for Development

### Prerequisites
- Node.js 16+
- npm or yarn
- TypeScript knowledge

### Installation
```bash
git clone https://github.com/Justar96/memory-pickle-mcp.git
cd memory-pickle-mcp
npm install
```

### Build
```bash
npm run build        # Compile TypeScript
npm run watch        # Watch mode for development
```

### Testing
```bash
npm run inspector    # Test with MCP inspector
node build/index.js  # Run server directly
```

## Architecture

### Service Layer
The business logic is organized into services:

- **ProjectService**: Project lifecycle, completion tracking
- **TaskService**: Task CRUD, hierarchy, progress calculation
- **MemoryService**: Memory storage, handoff generation
- **StorageService**: Database persistence with atomic operations
- **DataIntegrityService**: Database validation and repair operations

### Tool Layer
MCP tools are consolidated into a single optimized file:

- **8 Essential Tools**: Streamlined with research-backed prompts for better agent recognition
- **Consistent Format**: Natural language descriptions without XML formatting
- **Clear Purpose**: Each tool has a single, well-defined responsibility

### Data Storage
Split-file YAML database:
- `projects.yaml` - Project data
- `tasks.yaml` - Task data
- `memories.yaml` - Memory data
- `meta.yaml` - Metadata and settings

## Key Design Patterns

### Service Pattern
Each service has a single responsibility:

```typescript
class TaskService {
  createTask(args: CreateTaskArgs): Task
  updateTaskProgress(task: Task, updates: ProgressUpdate): void
  toggleTask(task: Task): void
  // ...
}
```

### Atomic Operations
Database operations use exclusive locking:

```typescript
const result = await this.storageService.runExclusive(async (db) => {
  // Modify database
  db.tasks.push(newTask);
  
  return {
    result: newTask,
    commit: true,
    changedParts: new Set(['tasks'])
  };
});
```

### Tool Registration
Tools are defined declaratively:

```typescript
export const CREATE_TASK_TOOL: Tool = {
  name: "create_task",
  description: "Create a new task",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      priority: { type: "string", enum: ["critical", "high", "medium", "low"] }
    },
    required: ["title"]
  }
};
```

## Adding New Features

### Adding a New Tool

1. **Define the tool** in appropriate tools file:
```typescript
export const NEW_TOOL: Tool = {
  name: "new_tool",
  description: "Does something useful",
  inputSchema: { /* schema */ }
};
```

2. **Add to tool registry** in `tools/index.ts`:
```typescript
export const ALL_TOOLS = [
  ...EXISTING_TOOLS,
  NEW_TOOL
];
```

3. **Implement the method** in main server class:
```typescript
async newTool(args: NewToolArgs) {
  // Implementation
  return {
    content: [{ type: "text", text: "Result" }]
  };
}
```

### Adding a New Service

1. **Create service file** in `services/`:
```typescript
export class NewService {
  someMethod(args: Args): Result {
    // Business logic
  }
}
```

2. **Add to service exports** in `services/index.ts`

3. **Integrate in main server** class

### Modifying Data Schema

1. **Update types** in `types/` directory
2. **Update storage service** if needed
3. **Add migration logic** for backward compatibility
4. **Update validation schemas**

## Testing

### Manual Testing
```bash
# Start MCP inspector
npm run inspector

# Test specific tool
echo '{"method": "tools/call", "params": {"name": "create_task", "arguments": {"title": "Test"}}}' | node build/index.js
```

### Integration Testing
```bash
# Test with real MCP client
# Configure client to use local build
node build/index.js
```

## Code Style

### TypeScript
- Strict mode enabled
- Explicit return types for public methods
- Interface-first design

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  return {
    content: [{
      type: "text",
      text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }],
    isError: true
  };
}
```

### Async Patterns
- Use async/await consistently
- Handle promises properly
- Use exclusive locking for database operations

## Performance Considerations

### Database Operations
- In-memory during runtime
- Atomic file writes
- Incremental saves (only changed parts)
- File locking prevents corruption

### Memory Usage
- Efficient array operations
- Task indexing for O(1) lookups
- Lazy loading where possible

## Publishing

### Version Bump
```bash
npm version patch|minor|major
```

### Build and Publish
```bash
npm run build
npm publish --access public
```

### Testing Published Package
```bash
npx -y @cabbages/memory-pickle-mcp
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request

### Commit Messages
- Use conventional commits
- Include scope: `feat(tasks): add priority sorting`
- Keep first line under 50 characters

### Pull Request Process
1. Ensure tests pass
2. Update documentation
3. Add changelog entry
4. Request review

## Debugging

### Common Issues
- **Tool not found**: Check tool registration in `tools/index.ts`
- **Database corruption**: Check file locking and atomic operations
- **Type errors**: Ensure interfaces match implementation

### Debug Mode
```bash
NODE_ENV=development node build/index.js
```

### Logging
The server logs to stderr:
```typescript
console.error('Debug info:', data);
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Build and test
4. Publish to npm
5. Tag release in git
6. Update documentation

This covers the essential development information for contributing to Memory Pickle MCP.