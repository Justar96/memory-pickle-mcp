# Changelog

All notable changes to Memory Pickle MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2025-06-15

### Changed
- **Default to clean text output**: System now defaults to professional, emoji-free output
- **Reversed emoji configuration**: Use `MEMORY_PICKLE_USE_EMOJIS=true` to enable emojis (previously `MEMORY_PICKLE_NO_EMOJIS=true` to disable)
- **Updated documentation**: All configuration examples reflect new clean text default

### Benefits
- **Professional by default**: Better for corporate and enterprise environments
- **Universal compatibility**: Works perfectly in terminals, SSH, and restricted environments
- **Improved accessibility**: Better screen reader support and cleaner logs
- **Optional visual enhancement**: Emojis available when desired

## [1.3.0] - 2025-06-14

### 🎯 Major Simplification Release

### Changed
- **Simplified tool structure**: Reduced from 17 to 8 essential tools
- **Consolidated functionality**: `update_task` now handles completion, progress, notes, and blockers
- **Auto-current project**: New projects automatically become the current project
- **Enhanced workspace detection**: Added `MEMORY_PICKLE_WORKSPACE` environment variable support

### Removed
- `toggle_task` → Consolidated into `update_task`
- `update_task_progress` → Consolidated into `update_task`
- `get_tasks` → Functionality covered by `get_project_status`
- `export_to_markdown` → Replaced with `generate_handoff_summary`
- `apply_template` → Removed (rarely used)
- `list_categories` → Removed (redundant with `get_project_status`)
- Data integrity tools (`validate_database`, `check_workflow_state`, `repair_orphaned_data`) → Removed for simplicity

### Enhanced
- **`update_task`**: Single tool for all task updates (completion, progress, notes, blockers)
- **`create_project`**: Automatically sets new project as current
- **`get_project_status`**: More comprehensive project overview
- **Agent instructions**: Simplified and streamlined for better agent understanding

### Documentation
- Updated README.md to reflect 8-tool structure
- Revised INTEGRATION-GUIDE.md with simplified examples
- Updated agent-instructions-simplified.md
- Enhanced TOOLS.md with consolidated functionality
- Updated package.json to v1.3.0

### Benefits
- **Reduced complexity**: Easier for agents to understand and use
- **Eliminated redundancy**: One tool per function, no overlap
- **Better workflow**: Smoother project creation and task management
- **Cleaner codebase**: Removed rarely-used utilities and diagnostics

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
- Apache 2.0 license for open source use
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
- GitHub Issues: https://github.com/Justar96/memory-pickle-mcp/issues
- NPM Package: https://www.npmjs.com/package/@cabbages/memory-pickle-mcp

## Contributors

- Initial development and architecture
- Modular refactoring and optimization
- Documentation and publishing setup