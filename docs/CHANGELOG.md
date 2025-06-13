# Changelog

All notable changes to Memory Pickle MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-06-13

### Added
- **Configurable emoji support** via `MEMORY_PICKLE_NO_EMOJIS` environment variable
- Clean text mode for corporate and terminal environments
- `emojiUtils.ts` utility for consistent formatting across components
- Side-by-side configuration examples in documentation
- Multi-platform integration guides for Claude Desktop, Cursor, Windsurf, VS Code

### Fixed
- **Critical bug**: Tool names now use snake_case to match method names
- Resolves "Unknown tool" errors that made v1.0.0 unusable in MCP clients
- All 13 tools now work correctly with proper naming convention

### Changed
- Updated all configuration files to use npm package instead of hardcoded paths
- Enhanced documentation with emoji configuration examples
- Improved integration guides for universal compatibility

### Documentation
- Updated README.md with emoji configuration examples
- Enhanced INTEGRATION-GUIDE.md with multi-platform setup instructions  
- Added CLAUDE.md for development guidance
- Updated USAGE.md with configuration options

## [1.0.0] - 2025-06-13

### Added
- Initial public release of Memory Pickle MCP
- Complete rewrite from v2.0 internal version to production-ready v1.0
- 13 MCP tools for project management and memory storage
- Modular architecture with service layer separation
- Split-file YAML database system (projects, tasks, memories, meta)
- Automatic session continuity and project status loading
- Hierarchical task management with subtasks
- Progress tracking with percentage completion
- Priority levels (critical, high, medium, low)
- Blocker tracking and documentation
- Handoff summary generation for session transitions
- Memory system with categorization and search
- Export functionality to Markdown
- Project templates for guided planning
- Atomic database operations with file locking
- Backup rotation system
- Schema validation with auto-repair
- NPM package distribution via `@cabbages/memory-pickle-mcp`

### Project Management Tools
- `create_project` - Initialize new project containers
- `get_project_status` - Show hierarchical task tree (auto-loads at session start)
- `set_current_project` - Switch between multiple projects
- `generate_handoff_summary` - Create session transitions

### Task Management Tools
- `create_task` - Add tasks with automatic project assignment and priority detection
- `toggle_task` - Complete/uncomplete with progress updates
- `update_task_progress` - Track progress, notes, and blockers
- `get_tasks` - Filter and display tasks by criteria

### Memory Management Tools
- `remember_this` - Store important decisions and context
- `recall_context` - Search and retrieve memories

### Utility Tools
- `export_to_markdown` - Generate documentation from project data
- `apply_template` - Guide users through structured planning
- `list_categories` - Show overview and available templates

### Technical Features
- TypeScript with ES2022 target
- MCP SDK v0.6.0 integration
- Node.js 16+ compatibility
- Automatic `.memory-pickle/` directory creation
- Incremental database saves for performance
- Comprehensive error handling and validation
- Agent instruction system with priority levels
- Cross-platform compatibility (Windows, macOS, Linux)

### Documentation
- Complete README with practical examples
- Installation guide with multiple methods
- Tool reference documentation
- Usage guide with workflow examples
- Development guide for contributors
- Publishing best practices documentation

### Infrastructure
- NPM package published as `@cabbages/memory-pickle-mcp`
- GitHub repository with public access
- MIT license for open source use
- Automated build process with executable permissions
- Package size optimization (33.3 kB)

## [Unreleased]

### Planned
- Multi-agent collaboration features
- Visual dashboard integration
- Git integration for code-aware task tracking
- Advanced search with semantic understanding
- Task templates marketplace
- Memory lifecycle management (archival, cleanup)
- WebSocket support for real-time updates
- Plugin system for custom extensions

---

## Version History

- **v1.0.0** - First public release (June 2025)
- **v2.0.0** - Internal development version (never published)
- **v1.x** - Legacy memory-only system (deprecated)

## Migration Notes

### From v2.0 Internal
If upgrading from internal v2.0 development version:
- Data format is compatible
- New split-file system automatically migrates from monolithic format
- All existing memories and projects preserved

### From v1.x Legacy
Legacy memory files are automatically imported on first run if main database is empty.

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/cabbages/memory-pickle-mcp/issues
- NPM Package: https://www.npmjs.com/package/@cabbages/memory-pickle-mcp

## Contributors

- Initial development and architecture
- Modular refactoring and optimization
- Documentation and publishing setup