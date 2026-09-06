# FreeCode DeepSeek Harness — MCP Server Configuration
# Pre-installed MCP servers for v0.5.0
#
# Serena MCP (@anthropic-ai/serena-mcp): Semantic analysis at symbol level + structural editing
# LSP MCP Server (@isaacphi/mcp-language-server): Language server protocol integration
#
# Run `pnpm setup:mcp` from the repo root to install all MCP servers.
# This writes JSON configs to ~/.dsh/mcp/ and generates DSH_HOME/cordis.yml.
#
# Manual configuration below for reference.

# === Serena MCP Server ===
# Semantic analysis toolkit for deep codebase understanding.
# Provides: symbol lookup, reference finding, code navigation, structural edits.
# Install: npm install -g @anthropic-ai/serena-mcp
#
# Config file: ~/.dsh/mcp/serena.json
# {
#   "serverName": "serena",
#   "command": "npx",
#   "args": ["-y", "@anthropic-ai/serena-mcp"],
#   "rootDir": "${workspaceRoot}"
# }
#
# cordis.yml snippet:
# plugins:
#   mcp-client:
#     config:
#       serverName: serena
#       command: "npx"
#       args: ["-y", "@anthropic-ai/serena-mcp"]
#       rootDir: "${workspaceRoot}"

# === LSP MCP Server ===
# Language server protocol bridge for TypeScript/JavaScript/Python analysis.
# Provides: diagnostics, completions, hover, goto-definition, find-references.
# Install: npm install -g @isaacphi/mcp-language-server
#
# Config file: ~/.dsh/mcp/lsp.json
# {
#   "servers": [
#     {
#       "serverName": "lsp-typescript",
#       "command": "npx",
#       "args": ["-y", "@isaacphi/mcp-language-server", "--lsp", "typescript"],
#       "rootDir": "${workspaceRoot}"
#     },
#     {
#       "serverName": "lsp-python",
#       "command": "npx",
#       "args": ["-y", "@isaacphi/mcp-language-server", "--lsp", "python"],
#       "rootDir": "${workspaceRoot}"
#     }
#   ]
# }
#
# cordis.yml snippet:
# plugins:
#   mcp-client:
#     config:
#       serverName: lsp-typescript
#       command: "npx"
#       args: ["-y", "@isaacphi/mcp-language-server", "--lsp", "typescript"]
#       rootDir: "${workspaceRoot}"
#   mcp-client:
#     config:
#       serverName: lsp-python
#       command: "npx"
#       args: ["-y", "@isaacphi/mcp-language-server", "--lsp", "python"]
#       rootDir: "${workspaceRoot}"
