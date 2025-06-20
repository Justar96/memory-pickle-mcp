# Comprehensive Usage Guide

Memory Pickle MCP provides 13 advanced tools for AI-powered project management. This guide covers practical workflows, AI assistant integration, and advanced usage patterns.

## AI Assistant Integration

### **Cursor (Recommended)**
**Excellent MCP integration with Claude 3.5 Sonnet**

```json
// .cursor-settings.json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"]
    }
  }
}
```

**Optimal Workflow:**
- Agent automatically calls `recall_state` on session start
- Natural task creation through conversation
- Excellent context preservation between tool calls
- Seamless code location linking with file references

### **Cline, Roo, Kilo Mode Code**
**Advanced autonomous coding support**

**Configuration:** Standard MCP setup works perfectly
**Strengths:**
- Autonomous task breakdown and creation
- Excellent hierarchical task organization
- Automatic progress tracking during code changes
- Strong integration with git workflows and file modifications

**Best Practices:**
```yaml
# Link tasks to code changes automatically
create_task:
  title: "Refactor authentication middleware"
  line_range:
    start_line: 45
    end_line: 78
    file_path: "src/middleware/auth.ts"

# Track autonomous progress
update_task:
  task_id: "task_123"
  progress: 75
  notes: "Completed refactoring, running tests"
```

### **Windsurf**
**Seamless project tracking across sessions**

**Benefits:**
- Excellent session handoff capabilities
- Strong project context awareness  
- Natural integration with development workflows

### **Augment Remote Agent**
**Full tool support and context awareness**

**Optimizations:**
- Use `recall_state` for comprehensive context loading
- Leverage memory system for decision tracking
- Export session data for cross-session continuity

## Getting Started Workflows

### **New Project Setup**

**Step 1: Natural Project Creation**
```
You: "I'm building a REST API for a task management app"
Agent: Creating project and initial structure...
```

**Behind the scenes:**
```yaml
create_project:
  name: "Task Management REST API"
  description: "Complete API with authentication, CRUD operations, and data validation"
  status: "planning"

# Auto-becomes current project
# Agent may suggest initial tasks
```

**Step 2: Task Breakdown**
```
You: "I need authentication, user management, and task CRUD operations"
Agent: Breaking down the project into manageable tasks...
```

**Result:**
```yaml
create_task:
  title: "Authentication System"
  priority: "high"
  description: "JWT-based auth with login/register endpoints"

create_task:
  title: "User Management"
  priority: "medium"
  parent_id: "auth_task_id"  # Subtask of authentication

create_task:
  title: "Task CRUD Operations"
  priority: "high"
  description: "Create, read, update, delete for task entities"
```

### **Ongoing Development**

**Progress Updates:**
```
You: "Finished the login endpoint, starting on user registration"
Agent: Updating progress and tracking next steps...
```

**Automatic tracking:**
```yaml
update_task:
  task_id: "login_task"
  completed: true
  notes: "Implemented with JWT token generation and validation"

update_task:
  task_id: "registration_task"  
  progress: 20
  notes: "Started implementation, working on input validation"
```

**Decision Documentation:**
```
You: "I decided to use bcrypt for password hashing instead of plain SHA256"
Agent: Recording this important security decision...
```

```yaml
remember_this:
  content: "Using bcrypt for password hashing (cost factor 12) instead of SHA256 for better security against rainbow table attacks"
  importance: "critical"
  task_id: "auth_task_id"
```

## Advanced Workflow Patterns

### **Hierarchical Task Management**

**Complex Feature Development:**
```yaml
# Main feature
create_task:
  title: "User Dashboard Implementation"
  priority: "high"
  description: "Complete user dashboard with analytics and settings"

# UI Components (subtasks)
create_task:
  title: "Dashboard Analytics Widget"
  parent_id: "dashboard_task_id"
  line_range:
    start_line: 1
    end_line: 50
    file_path: "src/components/Dashboard/Analytics.tsx"

create_task:
  title: "User Settings Panel" 
  parent_id: "dashboard_task_id"
  line_range:
    start_line: 1
    end_line: 75
    file_path: "src/components/Dashboard/Settings.tsx"

# Backend API (subtasks)
create_task:
  title: "Dashboard Data API Endpoint"
  parent_id: "dashboard_task_id"
  line_range:
    start_line: 15
    end_line: 45
    file_path: "src/routes/dashboard.ts"
```

### **Code Location Linking**

**Development Task with Context:**
```yaml
create_task:
  title: "Fix authentication middleware bug"
  description: "Token validation fails for refresh tokens"
  priority: "critical"
  line_range:
    start_line: 67
    end_line: 89
    file_path: "src/middleware/auth.ts"

# Link decision to same code
remember_this:
  content: "Bug caused by JWT library version mismatch. Downgraded to v8.5.1 for compatibility with refresh token validation"
  importance: "high"
  task_id: "bug_fix_task_id"
  line_range:
    start_line: 67
    end_line: 89  
    file_path: "src/middleware/auth.ts"
```

### **Progress Tracking with Blockers**

**Complex Task Management:**
```yaml
update_task:
  task_id: "deployment_task"
  progress: 60
  notes: 
    - "Docker configuration complete"
    - "CI/CD pipeline setup done"
    - "Working on SSL certificate configuration"
  blockers:
    - "Waiting for SSL certificate from IT team"
    - "Production database credentials pending"
    - "Security review required before deployment"
```

### **Session Handoff Patterns**

**End of Development Session:**
```yaml
# Generate comprehensive handoff
generate_handoff_summary:
  format: "detailed"
  project_id: "current"

# Export for permanent storage
export_session:
  format: "markdown"
  include_handoff: true
  raw_markdown: true
```

**Result:**
```markdown
## Development Session Summary

### Completed Today
- ✅ Authentication middleware implementation
- ✅ User registration endpoint with validation  
- ✅ JWT token generation and refresh logic

### In Progress (60% complete)
- 🔄 Dashboard analytics widget
  - Backend API complete
  - Frontend components 60% done
  - Blocked: Waiting for design review

### Next Session Priorities
1. Complete dashboard frontend components
2. Address SSL certificate configuration
3. Begin integration testing

### Critical Decisions Made
- Switched to bcrypt for password hashing (security improvement)
- Using Redis for session storage (performance optimization)

### Active Blockers
- SSL certificate approval (blocking deployment)
- Design review for dashboard (blocking UI completion)
```

## Memory Management Strategies

### **Decision Tracking**

**Architecture Decisions:**
```yaml
remember_this:
  content: "Chose PostgreSQL over MongoDB for ACID compliance and complex relational queries in reporting features"
  title: "Database Technology Decision"
  importance: "critical"
  project_id: "current"
```

**Technical Solutions:**
```yaml
remember_this:
  content: "Implemented rate limiting using Redis sliding window algorithm (100 requests per minute per user)"
  importance: "high"
  task_id: "rate_limiting_task"
  line_range:
    start_line: 23
    end_line: 45
    file_path: "src/middleware/rateLimit.ts"
```

### **Context Retrieval**

**Finding Previous Decisions:**
```yaml
recall_context:
  query: "database choice postgresql"
  importance: "critical"
  limit: 5
```

**Project-Specific Search:**
```yaml
recall_context:
  query: "authentication security"
  project_id: "current_project_id"
  importance: "high"
```

## Data Management Best Practices

### **⚠️ Session Persistence Strategy**

**Critical Understanding:**
- All data exists only during current session
- Session ends = complete data loss
- No automatic backups or file persistence

**Essential Practices:**

**1. Regular Exports:**
```yaml
# Every 1-2 hours during long sessions
export_session:
  format: "markdown"
  include_handoff: true
```

**2. Decision Documentation:**
```yaml
# Document important decisions immediately
remember_this:
  content: "Critical architectural decision with rationale"
  importance: "critical"
```

**3. Handoff Summaries:**
```yaml
# Before ending any session
generate_handoff_summary:
  format: "detailed"
```

### **Performance Optimization**

**Efficient Data Access:**
```yaml
# Use limits on large datasets
list_tasks:
  status: "active"
  limit: 20
  offset: 0

# Filter by project for focused results
recall_context:
  query: "search_term"
  project_id: "specific_project"
  limit: 10
```

**Memory Management:**
```yaml
# Use appropriate importance levels
remember_this:
  content: "Minor implementation detail"
  importance: "low"  # Won't clutter high-priority searches

remember_this:
  content: "Critical security configuration"
  importance: "critical"  # Easy to find later
```

## Collaborative Workflows

### **Team Handoffs**

**Preparing for Team Member:**
```yaml
# Generate detailed project state
export_session:
  format: "markdown"
  include_handoff: true

# Create focused handoff summary
generate_handoff_summary:
  format: "detailed"
  project_id: "shared_project_id"
```

**Result for Team Sharing:**
```markdown
## Project Handoff: Authentication System

### Current Status (78% Complete)
- ✅ Core authentication logic implemented
- ✅ JWT token generation and validation
- 🔄 Password reset flow (85% complete)
- ❌ Two-factor authentication (not started)

### Active Blockers
1. Security audit scheduled for next week
2. Email service integration pending approval
3. Database migration requires DBA review

### Key Decisions & Context
- Using JWT with 15-minute access tokens + 7-day refresh tokens
- Implemented rate limiting: 5 login attempts per 15 minutes
- Password requirements: 12+ chars, mixed case, numbers, symbols

### Next Steps
1. Complete password reset email templates
2. Implement 2FA using TOTP (Google Authenticator)
3. Add audit logging for all auth events

### Code Locations
- Main auth logic: `src/auth/AuthService.ts` (lines 45-180)
- JWT middleware: `src/middleware/auth.ts` (lines 12-67)
- Rate limiting: `src/middleware/rateLimit.ts` (lines 23-45)
```

### **Cross-Project Context**

**Managing Multiple Projects:**
```yaml
# List all projects with status
list_projects:
  limit: 10

# Switch context between projects
set_current_project:
  project_id: "mobile_app_project"

# Project-specific task management
create_task:
  title: "Implement push notifications"
  project_id: "mobile_app_project"
```

## Troubleshooting & Recovery

### **Data Loss Prevention**

**Session Backup Strategy:**
```bash
# Every hour during development
export_session -> save as timestamped markdown file
generate_handoff_summary -> save as project_status.md
```

**Critical Decision Backup:**
```yaml
# Immediately after important decisions
remember_this:
  content: "Decision with full context and rationale"
  importance: "critical"
  
# Then export
export_session:
  format: "markdown"
  raw_markdown: true  # Clean format for external storage
```

### **Context Recovery**

**After Session Restart:**
1. Load previous handoff summary
2. Reference exported session data
3. Use `recall_state` to understand current context
4. Recreate critical project structure if needed

### **Performance Issues**

**Large Dataset Management:**
```yaml
# Use pagination for large task lists
list_tasks:
  limit: 50
  offset: 100  # Skip first 100 tasks

# Filter aggressively
list_tasks:
  status: "active"
  priority: "high"
  project_id: "current_project"
```

**Memory Optimization:**
```yaml
# Focus searches by project
recall_context:
  query: "specific_term"
  project_id: "target_project"
  
# Use importance filtering
recall_context:
  importance: "critical"
  limit: 5
```

## Integration Examples

### **With Git Workflows**

**Code Change Tracking:**
```yaml
# Before making changes
create_task:
  title: "Refactor user authentication"
  line_range:
    start_line: 45
    end_line: 120
    file_path: "src/auth/UserAuth.ts"

# During development
update_task:
  task_id: "refactor_task"
  progress: 50
  notes: "Extracted common validation logic to separate function"

# After completion
update_task:
  task_id: "refactor_task"
  completed: true
  notes: "Refactoring complete, all tests passing, ready for PR"

# Document architectural changes
remember_this:
  content: "Extracted authentication validation into reusable AuthValidator class to reduce code duplication across login/register/reset flows"
  importance: "high"
  task_id: "refactor_task"
```

### **With Testing Workflows**

**Test-Driven Development:**
```yaml
# Plan testing strategy
create_task:
  title: "Unit tests for authentication service"
  parent_id: "auth_feature_task"
  
create_task:
  title: "Integration tests for auth endpoints"
  parent_id: "auth_feature_task"

# Track test coverage
update_task:
  task_id: "unit_tests_task"
  progress: 75
  notes: "Completed tests for login/register, working on password reset tests"

# Document test decisions
remember_this:
  content: "Using Jest with supertest for API testing. Mocking external email service to avoid dependencies in test environment"
  importance: "medium"
  task_id: "integration_tests_task"
```

This comprehensive usage guide enables full utilization of Memory Pickle MCP's 13-tool system for advanced project management, session continuity, and collaborative development workflows across different AI assistant platforms.