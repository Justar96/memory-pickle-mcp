# Data Integrity & Workflow Validation

## 🚨 The Problem: Agent Workflow Failures

When AI agents fail to follow proper workflows or use tools incorrectly, it can lead to **data consistency issues**:

### Common Failure Scenarios:

1. **Agent Creates Tasks Without Projects**
   ```yaml
   # tasks.yaml - INCONSISTENT STATE
   tasks:
     - id: task_001
       project_id: proj_nonexistent  # ❌ Project doesn't exist!
       title: "Build homepage"
       status: "active"
   ```

2. **Agent Skips Workflow Steps**
   ```yaml
   # Agent directly modifies YAML instead of using tools
   projects:
     - id: proj_001
       name: "Website"
       status: "invalid_status"  # ❌ Not in allowed statuses!
       completion_percentage: 150  # ❌ Invalid percentage!
   ```

3. **Agent Creates Orphaned Data**
   ```yaml
   # memories.yaml - ORPHANED REFERENCES
   memories:
     - id: mem_001
       project_id: proj_deleted  # ❌ Project was deleted but memory remains!
       title: "Important note"
   ```

## 🛡️ The Solution: Data Integrity System

### **Automatic Protection Mechanisms:**

#### 1. **Startup Validation**
- Database is automatically validated and repaired on server startup
- Issues are logged and fixed before agents can interact with data
- Ensures clean state for every session

#### 2. **Real-time Validation**
- All tool operations use strict Zod schema validation
- Invalid data is rejected before it can corrupt the database
- Atomic operations prevent partial updates

#### 3. **Referential Integrity Checks**
- Tasks must reference valid projects
- Memories must reference valid projects/tasks
- Parent-child task relationships are validated

#### 4. **Data Consistency Validation**
- Enum values (status, priority) are validated
- Completion percentages are within 0-100 range
- Required fields are present and properly formatted

### **Recovery Tools for Agents:**

#### 🔧 `validate_database`
**Purpose**: Comprehensive database validation and repair
**Usage**: `validate_database(auto_repair=true, generate_report=true)`

**What it does:**
- ✅ Checks referential integrity (tasks → projects, memories → projects/tasks)
- ✅ Validates data consistency (enums, ranges, required fields)
- ✅ Repairs orphaned data automatically
- ✅ Recalculates completion percentages
- ✅ Generates detailed health report

**When to use:**
- After suspected data corruption
- Before important operations
- When agents report unexpected errors
- As part of regular maintenance

#### 🔍 `check_workflow_state`
**Purpose**: Quick workflow state validation
**Usage**: `check_workflow_state(project_id="optional")`

**What it does:**
- ✅ Validates current workflow state
- ✅ Checks for orphaned tasks/memories
- ✅ Verifies project-task relationships
- ✅ Reports workflow health status

**When to use:**
- Before starting new workflows
- When debugging workflow issues
- To verify system health

#### 🚑 `repair_orphaned_data`
**Purpose**: Fixes orphaned data relationships
**Usage**: `repair_orphaned_data(create_default_project=true)`

**What it does:**
- ✅ Finds tasks without valid projects
- ✅ Creates default project if needed
- ✅ Reassigns orphaned tasks
- ✅ Cleans up invalid references

**When to use:**
- When agent workflow was interrupted
- After manual YAML editing
- When tasks exist but no projects

## 🎯 Best Practices for Agents

### **1. Always Use Tools (Not Direct YAML Editing)**
```typescript
// ✅ CORRECT - Use tools
await create_project({ name: "Website", description: "Company website" });
await create_task({ title: "Build homepage", project_id: "proj_001" });

// ❌ WRONG - Direct YAML manipulation
// Don't manually edit YAML files
```

### **2. Validate Before Important Operations**
```typescript
// ✅ Check workflow state before major changes
await check_workflow_state();

// Proceed with operations...
await create_task({ ... });
```

### **3. Handle Errors Gracefully**
```typescript
try {
  await create_task({ title: "New task", project_id: "invalid_id" });
} catch (error) {
  // ✅ If task creation fails, validate and repair
  await validate_database({ auto_repair: true });
  
  // Try again with valid project
  const projects = await list_projects();
  await create_task({ title: "New task", project_id: projects[0].id });
}
```

### **4. Regular Health Checks**
```typescript
// ✅ Periodic validation during long workflows
if (operationCount % 10 === 0) {
  await check_workflow_state();
}
```

## 🔧 Technical Implementation

### **DataIntegrityService**
- **Location**: `src/services/DataIntegrityService.ts`
- **Purpose**: Core validation and repair logic
- **Methods**: `validateAndRepair()`, `generateHealthReport()`

### **Validation Rules**
1. **Referential Integrity**: All foreign keys must reference existing records
2. **Data Consistency**: Enum values, ranges, and formats must be valid
3. **Workflow Logic**: Business rules (e.g., completed projects can't have incomplete tasks)
4. **Security**: Path traversal prevention, input sanitization

### **Auto-Repair Strategies**
1. **Orphaned Tasks**: Assign to existing project or create default project
2. **Invalid Enums**: Reset to default valid values
3. **Invalid Ranges**: Recalculate from actual data
4. **Missing References**: Remove invalid references or create defaults

## 📊 Monitoring & Reporting

### **Health Report Includes:**
- Database statistics (projects, tasks, memories count)
- Integrity issues found and repaired
- Recommendations for preventing future issues
- Workflow state assessment

### **Logging:**
- All integrity issues are logged to console
- Repair actions are documented
- Performance metrics for validation operations

## 🚀 Usage Examples

### **Scenario 1: Agent Forgot to Create Project**
```typescript
// Agent tries to create task without project
await create_task({ title: "Homepage", project_id: "nonexistent" });
// ❌ Error: Project not found

// Solution: Validate and repair
await validate_database({ auto_repair: true });
// ✅ Auto-creates default project and assigns task

// Or create project first
await create_project({ name: "Website Project" });
await create_task({ title: "Homepage", project_id: "proj_001" });
```

### **Scenario 2: Data Corruption After Manual Edit**
```typescript
// After manual YAML editing, data is corrupted
await check_workflow_state();
// ⚠️ Reports: "5 orphaned tasks, 2 invalid statuses"

await validate_database({ auto_repair: true, generate_report: true });
// ✅ Repairs all issues and provides detailed report
```

### **Scenario 3: Preventive Maintenance**
```typescript
// Regular health check
const result = await validate_database({ auto_repair: false, generate_report: true });
// ✅ "Database healthy - no issues found"

// Or if issues found:
// ⚠️ "3 issues found" + detailed report
// Then run with auto_repair=true to fix
```

## 🎉 Benefits

1. **🛡️ Data Protection**: Prevents corruption from agent failures
2. **🔄 Self-Healing**: Automatically repairs common issues
3. **📊 Transparency**: Clear reporting of what was fixed
4. **🚀 Reliability**: Ensures consistent workflow execution
5. **🧠 Agent-Friendly**: Simple tools for agents to use
6. **⚡ Performance**: Fast validation with minimal overhead

The data integrity system ensures your MCP server remains robust and reliable, even when agents make mistakes or workflows are interrupted! 🎯
