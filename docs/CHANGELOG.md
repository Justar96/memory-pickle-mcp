# Changelog

All notable changes to Memory Pickle MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.8] - 2025-06-16

### Changed
- **Version consistency**: Updated all version references across codebase to 1.3.8
- **Centralized version management**: Implemented single source of truth for version information
- **Documentation alignment**: Updated all documentation to reflect current in-memory-only system
- **Internal version constants**: Synchronized version numbers in configuration files

### Added
- **Automated version sync**: Created utility for dynamic version reading from package.json
- **Version management script**: Automated synchronization of version references across files
- **Version management documentation**: Comprehensive guide for centralized version control

### Fixed
- **Version mismatches**: Resolved inconsistent version references in constants and configuration
- **Documentation accuracy**: Updated tool documentation and usage guides to match current implementation
- **Output format consistency**: Replaced emoji examples with clean text format in all documentation
- **System description alignment**: Removed outdated file storage references from all docs

## [1.3.1] - 2025-06-15

### Changed
- **Simplified to clean text only**: Removed all emoji functionality for maximum simplicity and compatibility
- **Removed emoji configuration**: No more environment variables or conditional formatting
- **Streamlined codebase**: Eliminated emoji utility system and dual formatting logic
- **Updated documentation**: All examples now show clean text output only

### Benefits
- **Universal compatibility**: Works perfectly in all environments without dependencies
- **Simplified maintenance**: Single output format reduces complexity
- **Professional appearance**: Clean, consistent text suitable for all contexts
- **Better accessibility**: Screen reader friendly and logging compatible

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
- 8 essential MCP tools for project management and memory storage
- Modular architecture with service layer separation
- In-memory data storage for session-based operation
- Automatic session continuity and project status loading
- Hierarchical task management with subtasks
- Progress tracking with percentage completion
- Priority levels (critical, high, medium, low)
- Blocker tracking and documentation
- Handoff summary generation for session transitions
- Memory system with categorization and search
- Clean text output for universal compatibility
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

### Session Management Tools
- `generate_handoff_summary` - Create session transition summaries

### Technical Features
- TypeScript with ES2022 target
- MCP SDK v0.6.0 integration
- Node.js 16+ compatibility
- In-memory data storage with transaction safety
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

### From Previous Versions
**Important:** Starting with v1.3.0, Memory Pickle uses in-memory-only storage:
- No data persistence between sessions
- No file system dependencies
- Use `generate_handoff_summary` to create session summaries
- Save important information as markdown files for permanent storage

### Session Continuity
- During session: All data shared across tools
- Between sessions: Use handoff summaries for context transfer

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/Justar96/memory-pickle-mcp/issues
- NPM Package: https://www.npmjs.com/package/@cabbages/memory-pickle-mcp

## Contributors

- Initial development and architecture
- Modular refactoring and optimization
- Documentation and publishing setup