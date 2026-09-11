# AGENTS.md — Noolu Pidichaal Mathi

This file governs repository work for **Noolu Pidichaal Mathi**, the idiyappam-to-3D-metro project. Build the smallest real slice, verify it, commit it, push it, and only then continue. Spectacle is required; untestable chaos is not.

## 1. Authority

Follow instructions in this order:

1. The user's current explicit request.
2. This `AGENTS.md`.
3. `PRD.md` for product behavior and architecture.
4. `MVP.md` for the first-release boundary and completion criteria.
5. Existing repository conventions that do not conflict with the above.

When the user supplies a repository, that exact repository is authoritative. Do not initialize another repository, create a substitute remote, mirror it elsewhere, or change the configured remote. Stop and ask if the intended repository or base branch is ambiguous.

## 2. Preferred model routing

- Use **GPT-5.6 Sol** as the default implementation model for scoped features, tests, routine refactors, documentation, asset integration, and ordinary debugging.
- Use **GPT-6 Astra** for architecture, computer-vision topology, complex Three.js/shader design, performance diagnosis, public-contract changes, security-sensitive work, hard blockers, and final review of major changes.
- Escalate from Sol to Astra when a change crosses subsystem boundaries, two evidence-based implementation attempts fail, or correctness depends on difficult spatial/graph reasoning.
- Model choice never relaxes verification, Git, licensing, or deployment rules.
- Sol and Astra are development tools. Do not introduce a production LLM dependency unless the user explicitly expands scope.

If the environment cannot select a preferred model, continue with the available model and state that limitation; do not block otherwise valid work.

## 3. Start-of-task procedure

Before edits:

1. Read `AGENTS.md`, `PRD.md`, `MVP.md`, relevant package documentation, and any closer-scoped `AGENTS.md`.
2. Inspect branch, working tree, remotes, recent commits, and open pull requests when available.
3. Preserve unrelated or uncommitted user work.
4. Classify the request as a minor slice or a big change.
5. Create or switch to the correct branch before implementation.
6. Define an observable completion check and the narrowest test seam.

Do not implement on `main`.

## 4. Branch policy

- Create a fresh branch for every coherent feature or big change.
- Use these prefixes:
  - `feat/<slug>` for product behavior.
  - `fix/<slug>` for defects.
  - `perf/<slug>` for measured performance work.
  - `test/<slug>` for test-only changes.
  - `docs/<slug>` for documentation.
  - `chore/<slug>` for dependencies, assets, tooling, or deployment maintenance.
- Branch from an up-to-date `main` unless the user names another base.
- Keep one purpose per branch and do not hide unrelated cleanup inside it.
- Never reuse a merged branch for new work.
- Never push directly to `main`.

A **big change** includes a new subsystem, architecture decision, public API/schema change, migration, security or deployment change, core render-pipeline change, or more than one independent user-visible feature. Every big change receives its own branch and pull request.

## 5. Atomic commit-and-push loop

For every minor feature or implementation slice:

1. Implement one coherent behavior.
2. Add or update the smallest meaningful tests and docs.
3. Run targeted verification.
4. Inspect the diff for secrets, unrelated edits, huge files, generated junk, and accidental lockfile churn.
5. Commit only that slice.
6. Push the commit immediately to the remote feature branch.
7. Confirm the remote contains the commit before beginning the next slice.

Never batch several finished minor features into one commit and never keep a pile of local commits until the end. One completed slice means one verified commit and one push.

Examples of valid slices:

- Validate image MIME and dimension limits.
- Add one segmentation strategy.
- Extract graph junction clusters.
- Implement one graph-contract decoder.
- Render batched rail geometry.
- Add instanced station supports.
- Implement train path sampling.
- Add reduced-motion camera behavior.
- Add one Dokploy health check.

Use Conventional Commit subjects, for example:

- `feat: reveal skeleton paths during analysis`
- `feat: add train-follow camera`
- `perf: batch rail geometry by material`
- `fix: dispose textures when changing maps`
- `test: add dense graph render fixture`
- `docs: record train model attribution`
- `chore: compress environment texture`

No “WIP”, “misc”, or “final fix actually final” commits. Git has suffered enough.

## 6. History safety

- Do not force-push, rewrite published history, amend a published commit, rebase a published branch, squash, or delete a remote branch without explicit permission.
- Do not use destructive Git commands to discard the working tree.
- Do not bypass hooks or CI with `--no-verify`.
- If a push is rejected, investigate and report the cause; do not rewrite shared history automatically.
- If authentication is missing, report the exact blocked operation. Never retrieve, expose, or repurpose credentials.

## 7. Pull requests

Open one PR for each big change after all included atomic commits are pushed. A PR is ready only when:

- It contains one coherent major scope.
- Relevant lint, format, type, unit, integration, end-to-end, production-build, and Docker checks pass.
- Public contracts, migrations, configuration, asset provenance, and docs are current.
- UI/3D work includes screenshots or a short recording when possible.
- Performance-sensitive work includes before/after measurements on a production build.
- Risks, compatibility, deployment effects, and rollback are stated.

Use this PR body:

```markdown
## Summary

## User-visible result

## Verification

## Screenshots or recording

## Performance evidence

## Assets and licenses

## Schema, configuration, and deployment notes

## Risks and rollback
```

Do not combine unrelated big changes. Do not merge or delete a branch without user authorization or an already-authorized repository automation.

## 8. Web research and asset acquisition

Agents are authorized to search the web and download textures, HDRIs, 3D models, icons, audio, and technical references when they materially improve the requested feature.

For technical decisions:

- Prefer current official documentation, original repositories, specifications, and primary sources.
- Record important links or decisions in the relevant documentation or PR.
- Verify downloaded APIs and examples against the project's installed versions.
- Do not paste unreviewed code from random tutorials.

For every downloaded asset:

1. Verify the original source and exact license before download.
2. Prefer CC0 or public domain; use attribution licenses only when compatible.
3. Reject ripped, proprietary, paywalled, attribution-unknown, or suspicious assets.
4. Inspect archives before extracting and never execute downloaded binaries or scripts casually.
5. Store runtime assets inside the repository; never hotlink them in production.
6. Optimize textures and geometry for the browser.
7. Add or update `ASSET_LICENSES.md` with name, creator, source URL, license, download date, and modifications.
8. Commit the asset, optimization, fallback, attribution, and usage as one atomic slice.

Recommended delivery formats are WebP/AVIF for ordinary images, KTX2/Basis for GPU textures, and optimized GLB using Meshopt or Draco where supported. Keep a procedural fallback for optional decorative assets.

Large files require deliberate review. Do not add Git LFS, a new CDN, or an external asset service without user approval.

## 9. Product invariants

- The product name is **Noolu Pidichaal Mathi**.
- The tagline is **“Vazhi ariyille? Noolu pidichaal mathi.”**
- NoolVerse is the 3D world, not the main product name.
- Tracks must visibly derive from the uploaded noodle paths.
- A single photo cannot prove hidden strand continuity; crossings remain inferred or uncertain.
- The core pipeline and routing are deterministic and do not require an LLM.
- Station/line names are deterministic or persisted.
- The 3D explorer is core MVP behavior.
- Route planning remains functional outside the canvas and in the 2D fallback.
- Visual ambition never overrides accessibility, privacy, licensing, or measured performance.

## 10. Architecture boundaries

- FastAPI owns validation, image processing, graph extraction, metro semantics, routing, retention, and readiness.
- Next.js owns pages, interaction, accessibility, saved-map presentation, and 2D fallback.
- React Three Fiber owns browser scene construction and animation from API data.
- PostgreSQL stores validated, versioned graph JSON and map metadata.
- A mounted volume stores normalized images.
- Add Redis/workers only after measurements prove they are needed.
- Do not run computer vision twice solely for presentation; store the small reveal artifacts needed by the client.

Prefer narrow typed seams:

- `decode_and_normalize(image) -> NormalizedImage`
- `segment(image, settings) -> SegmentationResult`
- `skeletonize(mask) -> SkeletonResult`
- `extract_graph(skeleton, settings) -> MetroGraph`
- `assign_metro_semantics(graph, seed) -> MetroGraph`
- `find_route(graph, origin, destination, options) -> RouteResult`
- `build_render_model(graph, quality) -> RenderModel`

Version the public graph contract. Any change to node, edge, line, route, status, coordinates, or errors requires contract tests and PR notes.

## 11. 3D quality rules

- Treat the aligned plate and source image as ground truth.
- Smooth paths only within a tested tolerance; do not beautify them into unrelated curves.
- Batch rail geometry and instance repeated scene objects.
- Share materials, textures, and geometries.
- Sample trains by distance along curves for stable speed.
- Use discrete elevation levels and explicit interchange connectors.
- Apply effects in a degradable stack: core materials → emissive cues → bloom → shadows → particles/fog.
- Provide Cinematic, Balanced, and Survival tiers.
- Cap DPR and monitor sustained frame time in production mode.
- Dispose every map-specific GPU resource and animation subscription when leaving a map.
- Preserve reduced-motion, keyboard, touch, and WebGL-fallback behavior.

Do not accept “looks smooth on my machine.” Record frame rate, draw calls, triangles, GPU memory indicators where available, initial transfer size, and test device/browser.

## 12. Verification

After each minor slice, run the narrowest relevant checks. Before a PR is ready, run all available applicable checks.

### Backend

- Formatter, linter, type checks, unit tests, golden-image topology tests, API contract tests, and PostgreSQL integration tests.

### Frontend

- Formatter, linter, TypeScript check, component tests, accessibility checks, production build, and end-to-end flows.

### 3D

- Fixed-graph geometry tests, finite-coordinate checks, visual regression, resource-disposal tests, reduced-motion checks, WebGL fallback, and production performance profile.

### Deployment

- Docker/Compose build, migration check, liveness, readiness, persistence, and external public smoke test.

Tests should exercise the highest useful public seam. Mock only external, unreliable, or expensive boundaries and maintain representative contract fixtures.

## 13. Completion rules

A feature is complete only when:

- Its observable behavior matches `PRD.md` and stays within `MVP.md`.
- Success, failure, and relevant boundary tests pass.
- Documentation, configuration, and asset attribution are current.
- The atomic implementation commit is pushed to the feature branch.
- Its PR exists and is green when it qualifies as a big change.
- Remaining limitations are explicit.

A 3D feature is not complete from a screenshot. It must work interactively in a production build at the relevant performance tier.

## 14. Dokploy contract

Production deployment is in scope after the user provides the exact repository and required Dokploy access/configuration.

- Use checked-in Dockerfiles and Docker Compose.
- Deploy verified, merged `main` through Dokploy.
- Route only the public web entry point through Traefik at `idiyappam.midhunpm.in` unless the user changes it.
- Keep FastAPI, PostgreSQL, optional Redis, and storage administration on the private Dokploy network without public host ports.
- Persist PostgreSQL data and normalized uploads across container replacement.
- Configure secrets and environment-specific values in Dokploy, never in Git.
- Provide `.env.example` with names and safe placeholders.
- Expose `/health/live` and `/health/ready`.
- Run migrations explicitly and make destructive migrations require approval.
- After deployment, verify the public hostname, health endpoints, persistence, and one real image-to-route-to-train-cam journey.

Do not call deployment successful because containers are green. Green containers can host a beautifully operational corpse.

## 15. Stop conditions

Stop and ask when:

- The supplied repository, intended remote, or base branch is unclear.
- Required repository/Dokploy access is missing.
- Work would discard user changes or rewrite published history.
- A destructive or irreversible data migration is required.
- Asset licensing cannot be verified.
- A proposed dependency, service, CDN, or production LLM materially expands scope or cost.
- A big change cannot be isolated from unrelated work.

When blocked, preserve the working tree and report the exact branch, latest pushed commit, completed verification, failure evidence, and smallest action required from the user.

