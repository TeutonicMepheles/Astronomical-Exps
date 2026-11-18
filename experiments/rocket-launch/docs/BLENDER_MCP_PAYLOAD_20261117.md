# Blender MCP installation and payload rebuild · 2026-11-17

User authorized installing Blender MCP and rebuilding the payload. Work continues in `B:/GithubProject/Astronomical-Exps-rocket-paint-20261116`, branch `codex/rocket-painted-lighting-20261116`, origin `https://github.com/TeutonicMepheles/Astronomical-Exps.git`. Existing dirty rocket work is retained; no commit/push requested.

## Installation and verified execution

- Third-party project: https://github.com/ahujasid/mcp-for-blender ; installed package `mcp-for-blender` 2.3.0, bundled Blender addon 2.0 / protocol 16.
- Addon installed to `C:/Users/Golajah/AppData/Roaming/Blender Foundation/Blender/4.5/scripts/addons/blender_mcp.py`, enabled and Blender preferences saved. Blender 4.5.4 LTS listens only at localhost:9876.
- Registered global Codex server with `codex mcp add blender -- C:\Users\Golajah\.local\bin\uvx.exe mcp-for-blender`. The running chat used an MCP SDK client rather than requiring a Codex restart midway through the job.
- `tools/blender-mcp-client.py` initializes the actual stdio MCP server, lists its 10 tools, and invokes `execute_blender_code` against live Blender. Source-file opening and model construction are separate calls because opening a .blend invalidates the current UI context until the next command.
- Rebuild response: `TIANZHOU_MCP_REBUILT 1984 cargo faces, thermal maps and framed stowed wings`, followed by successful GLB export and editable .blend save. This is actual MCP execution, not merely a background Blender Python job labelled MCP.

## Model changes and boundary

Preserves the approved Tianzhou-inspired two-module cylindrical silhouette, 10.6 m total length and 3.35 m maximum diameter. `tools/refine-tianzhou-payload.py` adds original 1024² thermal-cover albedo/roughness/normal maps, restrained circumferential seams, a schematic gold-tone propulsion thermal belt, concentric docking contact rings, and frames/gaps/compact straps on both closed three-layer panel stacks.

Sources remain those linked in [Tianzhou payload](TIANZHOU_PAYLOAD_20261117.md). Exact blanket seams, thermal-belt color/extent, module partitions and panel/strap dimensions are visual approximations. They are not reconstructed engineering drawings. No guessed internal cargo, fuel-system layout or deployment mechanism is presented as fact. The earlier unverified tank-layout issue remains open and is not addressed by this payload task.

`tools/transplant-interior.py` preserves the original KIU binary prefix, exterior, hierarchy, node transforms and all seven animation definitions while replacing the nine existing interior mesh references. Generated selection contours, blueprint silhouettes and fills are synchronized. Runtime query version: `tianzhou-mcp-20261117`.

## Performance scope and verification

Static geometry and embedded textures only; no new clock, event loop or per-frame texture upload. Reuses materials while combining details to avoid one draw call per small frame piece. Final GLB 14,149,240 bytes, 193,049 instanced triangles, 32 mesh objects, 15 materials and eight embedded textures. This records resource cost, not a device FPS claim. Physical whiteboard and long-run acceptance remain open.

Independent final-GLB checks: 380 KIU structure/source checks, exact exterior/hierarchy/animation preservation, 10.6/3.35 envelope, compact folded stacks, sampled fairing containment and offline thermal texture wiring. Minimum sampled fairing margin remains about 0.162 model units, not an engineering clearance.

Completed: npm run check (0 errors), npm test (24 tests and calculation/course checks), npm run test:browser (eight entries, component/lifecycle/offline smoke), three-viewport recognize/assemble regression, 22 model-hatching selections, 22 model-tip cases and shared contour/drag/resize/cleanup regression all pass with zero page/Shader errors. Screenshots were inspected for assembly placement and standalone payload detail; this is local review, not whiteboard acceptance. No commit/push/PR.

Detail image: docs/review/payload-mcp-20261117/Payload-detail.png (inspection lighting, not a new product page). Local preview: http://127.0.0.1:9041/experiments/rocket-launch/?v=tianzhou-mcp-20261117 .
