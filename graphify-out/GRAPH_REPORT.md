# Graph Report - free-code-deepseek-harness  (2026-09-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 433 nodes · 749 edges · 20 communities (15 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c145b2ef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16

## God Nodes (most connected - your core abstractions)
1. `GeminiWeb2ApiSupervisor` - 19 edges
2. `t()` - 18 edges
3. `createEmbeddedBrowser()` - 17 edges
4. `HarnessSupervisor` - 17 edges
5. `TorFleet` - 15 edges
6. `seedProviders()` - 11 edges
7. `scripts` - 10 edges
8. `bootstrap()` - 10 edges
9. `refreshModels()` - 10 edges
10. `EmbeddedBrowser` - 9 edges

## Surprising Connections (you probably didn't know these)
- `copy()` --calls--> `t()`  [EXTRACTED]
  src/main/embedded-browser.ts → src/main/i18n.ts
- `bootstrap()` --calls--> `GeminiWeb2ApiSupervisor`  [EXTRACTED]
  src/main/index.ts → src/main/gemini-web2api-supervisor.ts
- `createShellRuntime()` --calls--> `HarnessSupervisor`  [EXTRACTED]
  src/main/runtime.ts → src/main/harness-supervisor.ts
- `ShellRuntime` --references--> `HarnessSupervisor`  [EXTRACTED]
  src/main/runtime.ts → src/main/harness-supervisor.ts
- `UpdateServiceOptions` --references--> `HarnessUpdaterAdapter`  [EXTRACTED]
  src/main/updater.ts → src/main/harness-updater.ts

## Import Cycles
- None detected.

## Communities (20 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (50): BackendState, shouldNotifyBackendState(), createDialogBridge(), DialogBridge, readBody(), reply(), I18nKey, initLocale() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (40): electron-builder, esbuild, @freecode/opencode-adapter, @freecode/shared-types, js-yaml, dependencies, electron-updater, @freecode/opencode-adapter (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (23): checkHarnessRelease(), createHarnessUpdater(), GitHubRelease, GitHubReleaseAsset, harnessAssetName(), harnessPlatform(), HarnessUpdateInfo, HarnessUpdaterAdapter (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (20): ALWAYS_EXPOSED_MODELS, CatalogModel, endpointUrl(), listModelIds(), ModelCatalog, ModelRefreshError, ModelRefreshFailureCode, nowSeconds() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (14): ensureConfig(), GeminiWeb2ApiStartResult, GeminiWeb2ApiStatus, GeminiWeb2ApiSupervisor, GeminiWeb2ApiSupervisorConfig, killTree(), PythonCommand, resolvePythonCommand() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (20): buildHarnessExtraEnv(), DialogBridgeEnv, bootstrap(), resolveGeminiPort(), IpcDeps, resolveOpencodeBinary(), createShellRuntime(), ShellRuntime (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (26): GEMINI_WEB_DISPLAY_NAME, GEMINI_WEB_FALLBACK_MODELS, GEMINI_WEB_PROVIDER, GEMINI_WEB_TEXT_ONLY, LOCAL_PROVIDER_AUTH_HEADER, cloneFallbackModels(), cloneGeminiFallbackModels(), FALLBACK_MODELS (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (21): Action, allowedUrl(), BrowserPublicState, BrowserTab, ChromeCopy, copy(), createEmbeddedBrowser(), handleChromeCommand() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (14): findFreePort(), isPortFree(), loadTorFleetState(), ManagedTor, resolveTorBinaryPath(), resolveTorGeoipDir(), saveTorFleetState(), sleep() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (10): DSH_WEB_ARGS, HarnessInstance, HarnessStatus, HarnessSupervisor, HarnessSupervisorConfig, killTree(), sleep(), writeConsoleDiagnostic() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (17): defaultRendererTargets(), enable(), isEnabled(), LocaleSetPayloadSchema, PoolResizePayloadSchema, PoolRestartWorkerPayloadSchema, registerIpc(), TorfleetEnablePayloadSchema (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (15): defaultConfig(), EMBEDDED_MCP_CONFIG_VERSION, EmbeddedMcpConfig, EmbeddedMcpState, ensureEmbeddedMcpConfig(), ManagedMcpServer, MCP_MANAGED_PATCH_BEGIN, MCP_MANAGED_PATCH_END (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (14): dist, DOM, ES2022, resources, src/**/*, tests/**/*, ../../tsconfig.base.json, compilerOptions (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.26
Nodes (9): awaitHarnessLayout(), criticalPaths(), formatPreflightFailure(), PreflightOptions, PreflightResult, PreflightRetryOptions, readEntries(), verifyBridgeInvariant() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.21
Nodes (5): AppLogger, createAppLogger(), RotatingDestination, RotatingLoggerOptions, dirs

## Knowledge Gaps
- **110 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+105 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 162 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GeminiWeb2ApiSupervisor` connect `Community 4` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `HarnessSupervisor` connect `Community 9` to `Community 5`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `TorFleet` connect `Community 8` to `Community 0`, `Community 10`, `Community 5`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06605222734254992 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._