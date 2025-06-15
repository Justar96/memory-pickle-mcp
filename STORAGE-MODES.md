# In-Memory Storage Documentation

## 🎯 **Overview**

Memory Pickle MCP now operates exclusively in **in-memory mode** for simplicity and reliability. All data is stored in memory during your session and is automatically lost when the session ends. This provides a clean, predictable experience without file system complexity.

## 🧠 **How It Works**

- **All data is stored in memory only** - no files are created or modified
- **Session-based storage** - data persists during your current session
- **Clean slate on restart** - each new session starts fresh
- **No setup required** - works immediately without any configuration

## ✨ **Benefits**

- **🚀 Fast Performance** - No file I/O operations slow you down
- **🔒 Privacy-First** - No data written to your file system
- **🧹 Clean Environment** - No directories or files created
- **⚡ Instant Setup** - Works immediately without configuration
- **🔄 Fresh Start** - Each session begins with a clean slate

## 📝 **For Persistent Storage**

Since data is temporary, we recommend creating markdown files for important information:

### **Suggested Workflow**
1. **Use Memory Pickle MCP** for active session work
2. **Create markdown files** for information you want to keep
3. **Use handoff summaries** to document session progress

### **Markdown File Suggestions**
- `project-notes.md` - Key project decisions and requirements
- `session-summary-YYYY-MM-DD.md` - Daily progress summaries
- `decisions.md` - Important technical decisions
- `blockers.md` - Current issues and blockers

### **User Experience**
```
User: "Create a project called 'My App'"
Agent: ✅ Project created successfully!
       📝 Note: Data is stored in memory only.
       Consider creating markdown files to document your project progress.

[Session ends]
[New session starts]

User: "Show me my projects"
Agent: ❌ No projects found. (Previous data was lost)
       💡 Tip: Check your markdown files for previous session notes.
```

## � **Tool Integration**

Memory Pickle MCP tools automatically suggest creating markdown files when appropriate:

### **remember_this Tool**
- For critical/high importance memories, suggests creating markdown files
- Provides ready-to-use markdown templates
- Recommends appropriate file names

### **generate_handoff_summary Tool**
- Always suggests saving summary as markdown file
- Provides date-stamped file names
- Perfect for session continuity

### **Example Tool Output**
```
Agent: ✅ Memory Saved!
       Title: Database Schema Design
       Importance: critical

       💡 Suggestion: Since this is critical importance, consider creating a markdown file:

       # Database Schema Design

       [Your memory content here]

       Save as: database-schema-design.md
```

## ⚠️ **Known Limitations and Edge Cases**

### **Mid-Session Directory Creation**

**What happens if you create `.memory-pickle` folder during an active session?**

#### **Current Behavior (Tested)**
- ✅ **Task operations work** - new tasks are saved to disk
- ❌ **Project operations have issues** - projects may not be saved properly
- ⚠️ **Inconsistent behavior** - some data saves, some doesn't
- ❌ **No automatic migration** - existing memory data may be lost

#### **Recommended Workaround**
```bash
# If you create .memory-pickle mid-session:
mkdir .memory-pickle

# Restart your MCP server/agent session to ensure clean transition
# This guarantees all future operations will be persistent
```

#### **Why This Happens**
The system was designed assuming users choose persistence **before** starting work. Mid-session transitions involve complex state management that isn't fully reliable.

### **Directory Deletion During Session**

**What happens if you delete `.memory-pickle` folder during an active session?**

#### **Current Behavior**
- ⚠️ **Undefined behavior** - not thoroughly tested
- ❌ **Likely data loss** - current session data may be lost
- ❌ **No graceful fallback** - system may error or behave unpredictably

#### **Recommended Approach**
```bash
# If you want to switch from persistent to memory-only:
rm -rf .memory-pickle

# Restart your MCP server/agent session
# This ensures clean transition to memory-only mode
```

## 🎯 **Best Practices**

### **For New Projects**
```bash
# Decide on persistence BEFORE starting work
mkdir .memory-pickle  # If you want persistence
# OR don't create it if you want memory-only

# Then start your MCP agent session
```

### **For Existing Projects**
- **Persistent projects**: Keep the `.memory-pickle` directory
- **Memory-only projects**: Don't create the directory
- **Switching modes**: Restart your session after directory changes

### **Environment Variable Override**
```bash
# Force specific workspace (useful for testing)
export MEMORY_PICKLE_WORKSPACE=/path/to/your/project
```

## 🔧 **Troubleshooting**

### **"My data disappeared!"**
- **Likely cause**: You were in memory-only mode
- **Check**: Look for `.memory-pickle` directory in your project
- **Solution**: Create the directory and restart session for future persistence

### **"Files aren't being saved!"**
- **Likely cause**: Mid-session directory creation
- **Check**: Restart your MCP session
- **Solution**: Always create `.memory-pickle` before starting work

### **"Wrong directory being used!"**
- **Likely cause**: Multiple `.memory-pickle` directories exist
- **Check**: Priority order (workspace env var > cwd > project root > home)
- **Solution**: Use `MEMORY_PICKLE_WORKSPACE` environment variable

## 📊 **Mode Comparison**

| Feature | Memory-Only | Persistent |
|---------|-------------|------------|
| **Setup Required** | None | Create `.memory-pickle` directory |
| **Data Persistence** | ❌ Session only | ✅ Between sessions |
| **File System Impact** | ❌ None | ✅ Creates YAML files |
| **Performance** | ✅ Faster (no I/O) | ⚠️ Slightly slower (disk I/O) |
| **Use Case** | Temporary work, testing | Real projects, long-term work |
| **Data Safety** | ❌ High risk of loss | ✅ Persistent storage |

## 🚨 **Honest Assessment**

### **What Works Well**
- ✅ Both modes work reliably when used as designed
- ✅ Clear mode detection and user messaging
- ✅ No accidental directory creation
- ✅ All MCP tools function identically in both modes

### **What Has Limitations**
- ❌ Mid-session mode transitions are unreliable
- ❌ No automatic data migration between modes
- ❌ Complex directory priority logic can be confusing
- ❌ No built-in backup/recovery mechanisms

### **Recommended Usage**
- **Choose your mode before starting work**
- **Restart sessions when changing modes**
- **Use environment variables for complex setups**
- **Treat mid-session transitions as unsupported**

This documentation reflects the **actual tested behavior** as of the current implementation, not idealized behavior.
