# Changelog

All notable changes to Memory Pickle MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.9] - 2025-06-20

### Changed
- Complete documentation rewrite to accurately reflect 13-tool system instead of incorrect 8-tool references. Added comprehensive AI assistant integration guide for Cursor, Cline, Roo, Kilo mode code.

### Fixed  
- Corrected tool documentation mismatch between docs and actual codebase implementation. Enhanced technical specifications with performance metrics and caution warnings.

## [1.3.8] - 2025-06-16

### Changed
- Updated all version references across codebase to 1.3.8 with centralized version management. Aligned documentation to reflect current in-memory-only system.

### Fixed
- Resolved inconsistent version references and replaced emoji examples with clean text format. Removed outdated file storage references from documentation.

## [1.3.1] - 2025-06-15

### Changed
- Removed all emoji functionality and environment variables for maximum simplicity and compatibility. Streamlined codebase to single clean text output format for universal accessibility.

## [1.3.0] - 2025-06-14

### Changed
- Simplified tool structure from 17 to 13 comprehensive tools with consolidated functionality. Enhanced `update_task` to handle completion, progress, notes, and blockers in single tool.

### Removed
- Removed redundant tools like `toggle_task`, `get_tasks`, and data integrity utilities for simplicity. Consolidated overlapping functionality to eliminate redundancy and improve agent understanding.

## [1.1.0] - 2025-06-13

### Added
- Configurable emoji support and clean text mode for corporate environments. Multi-platform integration guides for Claude Desktop, Cursor, Windsurf, VS Code.

### Fixed
- Critical bug where tool names caused "Unknown tool" errors making v1.0.0 unusable. All 13 tools now work correctly with proper snake_case naming convention.

## [1.0.0] - 2025-06-13

### Added
- Initial public release with 13 comprehensive MCP tools for project management and memory storage. Complete TypeScript rewrite with modular architecture and in-memory data storage for session-based operation.

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