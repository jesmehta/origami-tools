# Origami tools — documentation

Documentation for the tools in this repo, from overview down to the
reasoning behind them. Each file stands on its own and links to the next
level down.

| File | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the code is laid out: the shared `common/` module and its API, each tool's state model, the render/interaction loop, how export works |
| [INTERFACE.md](INTERFACE.md) | UI conventions shared by all tools: sidebar layout, tooltips, sheet/margin, grid & snap, handles, export naming |
| [MATH.md](MATH.md) | The geometry: mirror reflection, rays + Kawasaki, clipping, snapping candidates, and summaries (with links) of the x-span, hypar and vPleat maths |
| [DECISIONS.md](DECISIONS.md) | Design decisions, alternatives that were rejected, and why |
| [TODO.md](TODO.md) | Open items, ideas, and gotchas for whoever edits this next |
| [conversations/](conversations/) | Conversation logs: what was asked, how requests were clarified, direct quotes, corrections |

Per-tool reference (usage, per-tool decisions, changelog) stays in each
tool's own README:
[mirror-pleats](../mirror-pleats/README.md) ·
[x-span](../x-span/README.md) ·
[hypar](../hypar/README.md) ·
[vPleat-visualiser](../vPleat-visualiser/README.md) ·
[kirigami-tools](../kirigami-tools/README.md) (separate, not on `common/` yet).

The top-level [README](../README.md) is the index of tools plus the shared-features changelog.
