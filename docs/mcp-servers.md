# FreeCode DeepSeek Harness — MCP Server Configuration
# Pre-installed MCP servers for v0.5.0
#
# Serena MCP (oraios/serena): Semantic analysis at symbol level + structural editing
# LSP MCP Server (isaacphi/mcp-language-server): Language server protocol integration
#
# To enable, add these to your DSH_HOME/cordis.yml or agent cordis.yml

# === Serena MCP Server ===
# Semantic analysis toolkit for deep codebase understanding.
# Provides: symbol lookup, reference finding, code navigation, structural edits.
# Install: pip install serena-mcp  (or  npx -y @anthropic-ai/serena-mcp)
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
# Language server protocol bridge for TypeScript/JavaScript/Python/etc analysis.
# Provides: diagnostics, completions, hover, goto-definition, find-references.
# Install: npm install -g @isaacphi/mcp-language-server
#
# cordis.yml snippet:
# plugins:
#   mcp-client:
#     config:
#       serverName: lsp-ts
#       command: "npx"
#       args: ["-y", "@isaacphi/mcp-language-server", "--lsp", "typescript"]
#       rootDir: "${workspaceRoot}"
#   mcp-client:
#     config:
#       serverName: lsp-py
#       command: "npx"
#       args: ["-y", "@isaacphi/mcp-language-server", "--lsp", "python"]
#       rootDir: "${workspaceRoot}"
