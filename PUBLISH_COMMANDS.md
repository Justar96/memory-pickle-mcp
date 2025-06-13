# Quick Publishing Commands

## The Issue
When publishing scoped packages (packages with `@` prefix like `@cabbages/memory-pickle-mcp`), npm defaults to private publishing which requires payment.

## Solution
Use the `--access public` flag to publish as a public package:

```bash
npm publish --access public
```

## Complete Publishing Process

### 1. Authenticate with npm
```bash
npm login
```
Follow the browser authentication process.

### 2. Final Build and Test
```bash
npm run build
node test-npm-package.js
```

### 3. Publish as Public Package
```bash
npm publish --access public
```

### 4. Verify Publication
```bash
npm view @cabbages/memory-pickle-mcp
```

## Alternative: Set Public Access in package.json

You can also add this to your `package.json` to make it default to public:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

Then you can use the regular `npm publish` command.

## After Publishing

Users can install with:
```bash
npx -y @cabbages/memory-pickle-mcp
```

Or add to their MCP configuration:
```json
{
  "mcpServers": {
    "memory-pickle": {
      "command": "npx",
      "args": ["-y", "@cabbages/memory-pickle-mcp"]
    }
  }
}