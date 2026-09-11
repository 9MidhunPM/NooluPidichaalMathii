# Implementation checkpoints

This file makes the intended atomic delivery order visible. A checkpoint is
complete only after its focused verification passes, its diff is reviewed, and
the commit is pushed and confirmed on its feature branch.

## Milestones

1. **Foundation** — reproducible frontend/backend development environment,
   contracts, tests, database migration, and CI.
2. **Image to route** — safe upload, deterministic baseline vision, persisted
   graph, and accessible 2D routing for a controlled image.
3. **Vision reliability** — acceptance corpus, topology cleanup, metro
   semantics, uncertainty, and transfer-aware routing.
4. **NoolVerse foundation** — aligned plate, rails, stations, interaction,
   camera controls, quality baseline, and 2D fallback.
5. **Reveal and trains** — real pipeline events, visual reveal, train journey,
   cameras, playback, and reduced-motion behavior.
6. **Product experience** — landing and upload guidance, samples, visual
   polish, accessibility, effects, and adaptive quality.
7. **Production** — operational limits, retention, observability, containers,
   Dokploy configuration, and public smoke checks.
8. **Release acceptance** — production performance, end-to-end coverage,
   public verification, and three demo rehearsals.

## Required release evidence

- Five controlled photos produce primary networks without manual correction.
- Upload-to-map p95 is at most 10 seconds on the actual host.
- Saved-map retrieval p95 is at most 500 ms on the deployment network.
- Balanced mode reaches 60 FPS on the target laptop; the selected phone tier
  reaches at least 30 FPS on the physical device.
- Reduced motion, keyboard, touch, and the complete 2D fallback work.
- Share links survive a browser refresh and container replacement.
- Unit, golden-image, contract, integration, browser, accessibility,
  production-build, and container checks pass.

## Non-negotiable boundaries

- Never claim hidden noodle continuity from a single image.
- Never re-run vision solely to present a reveal.
- Keep PostgreSQL, image storage, and the processing API private in production.
- Store no production secrets in Git.
- Do not add Redis, a worker, or a production LLM unless measurement justifies
  the scope change.
