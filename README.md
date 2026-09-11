# Noolu Pidichaal Mathi

> **Vazhi ariyille? Noolu pidichaal mathi.**

Upload a top-down idiyappam photo and explore the visible noodle paths as an
absurdly serious 3D metro system.

The product specification is in [PRD.md](PRD.md); the first-release boundary
and acceptance criteria are in [MVP.md](MVP.md).

## Delivery workflow

Development is delivered as small, independently verifiable slices. Each slice
includes its narrowest meaningful tests and documentation, is committed with a
Conventional Commit subject, then pushed before the next slice begins. Major
scopes use dedicated branches and pull requests.

The active implementation sequence and release checks live in
[IMPLEMENTATION.md](IMPLEMENTATION.md).

## Planned architecture

- **Web:** Next.js, TypeScript, Tailwind CSS, React Three Fiber, and Drei.
- **API:** FastAPI, OpenCV, scikit-image, NetworkX, and PostgreSQL.
- **Storage:** a persistent volume for normalized images and JSONB graph data.
- **Delivery:** Docker Compose and Dokploy, with only the web entry point
  publicly routed.

The production pipeline and route planner are deterministic; they do not
require a production LLM.
