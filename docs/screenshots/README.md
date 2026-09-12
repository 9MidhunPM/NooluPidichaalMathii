# Runtime screenshot manifest

This manifest covers real runtime captures supplied by Midhun P M from
`https://idiyappam.midhunpm.in` on 2026-09-12. All five use the repository's
known-good demo idiyappam. The browser chrome was not included in the Hyprshot
captures, so the exact browser version is not asserted.

Runtime-optimized copies live in `apps/web/public/screenshots/`:

| File | Captured viewport | What it verifies |
| --- | ---: | --- |
| `detected-skeleton.webp` | 1264 × 1060 | The processing pipeline exposes its one-pixel visible-strand skeleton. |
| `selected-metro-paths.webp` | 1461 × 1267 | The evidence viewer distinguishes metro-selected routes from all detected strands. |
| `source-aligned-evidence.webp` | 1470 × 1263 | Coloured metro paths remain aligned with the original image coordinates. |
| `noolverse-operations.webp` | 2000 × 1164 | The 3D explorer, layer controls, source evidence, journey planner, and fictional service board coexist in the runtime. |
| `noolverse-route-planned.webp` | 2000 × 1176 | A calculated 403 noodle-centimetre journey is highlighted between named stations. |

The supplied PNGs were resized only where wider than 2000 pixels, stripped of
metadata, and encoded as WebP at quality 82. They were not retouched or
composited. No generated mockup is used as product evidence.
