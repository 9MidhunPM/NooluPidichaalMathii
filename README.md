<img width="1280" height="640" alt="TinkerHub Useless Projects" src="https://github.com/user-attachments/assets/892ccf47-6ce2-4b02-819b-c286a894c0a7" />

# Noolu Pidichaal Mathi 🎯

> **Vazhi ariyille? Noolu pidichaal mathi.**

## Basic Details

### Team Name: Popcorn

### Team Members

- Team Lead: Midhun P M — Sahrdaya College of Engineering

### Project Description

Noolu Pidichaal Mathi turns an idiyappam photograph into an absurdly official
metro network. It extracts visible strands, reveals the intermediate skeleton,
builds a deterministic graph, and lets a visitor plan a journey through
**NoolVerse**, the 3D world of NMRL — Noolu Metro Rail Limited.

### The Problem (that doesn't exist)

Breakfast has no reliable public transport. A passenger at Kottayam Kappa
Connection cannot reach Kozhi-Code Red Chutney before the sambar gets cold.

### The Solution (that nobody asked for)

We promote visible idiyappam paths to public infrastructure. The app reveals the
source image, skeleton, chosen paths, graph, stations, routes, trains, and a
fictional NMRL timetable. Crossings a single photo cannot prove remain inferred.

## Technical Details

### Technologies/Components Used

For Software:

- TypeScript, Python, SQL
- Next.js, React, FastAPI, PostgreSQL
- React Three Fiber, Drei, Three.js
- OpenCV, scikit-image, NumPy, SQLAlchemy, asyncpg
- pnpm, uv, Vitest, pytest, Ruff, mypy, Docker Compose, Dokploy

For Hardware:

- No dedicated hardware. Image processing runs in FastAPI; NoolVerse uses a
  WebGL-capable browser with a usable 2D fallback.

### Implementation

The pipeline normalizes an uploaded image, segments visible noodle regions,
skeletonizes them, extracts a versioned graph, assigns deterministic NMRL
semantics, and persists the result. The Next.js client stages source → skeleton
→ selected metro paths before entering the 3D explorer. Timetables and
announcements are labelled as fictional IST simulation data, never KMRL advice.

For Software:

# Installation

```bash
pnpm install
cd apps/api && uv sync
```

# Run

```bash
# Terminal 0 — PostgreSQL with retained local data
docker compose -f compose.dev.yml up -d postgres

# Terminal 1 — web app
pnpm --filter @noolu/web dev

# Terminal 2 — API
cd apps/api
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

# Verify

```bash
pnpm --filter @noolu/web check
pnpm --filter @noolu/web test
pnpm --filter @noolu/web build
cd apps/api && uv run ruff check app tests && uv run mypy && uv run pytest
```

### Project Documentation

For Software:

Read the [Kerala city-name and timetable policy](docs/city-names.md) for the
deterministic naming rules and the distinction between NMRL jokes and real
transport information.

# Screenshots

These are real captures from the deployed demo using the known-good idiyappam
image. No concept art is presented as product evidence.

### NoolVerse route and operations

![NoolVerse operations map with a planned 403 noodle-centimetre journey, map layers, stations, and the fictional NMRL service board](apps/web/public/screenshots/noolverse-route-planned.webp)

The source photograph remains under the rails while the explorer exposes map
layers, camera modes, journey controls, a calculated route, and fictional NMRL
departures in one interactive view.

### From visible strands to selected metro paths

<p align="center">
  <img width="48%" alt="One-pixel skeleton extracted from the idiyappam" src="apps/web/public/screenshots/detected-skeleton.webp" />
  <img width="48%" alt="Metro paths selected from the noodle skeleton" src="apps/web/public/screenshots/selected-metro-paths.webp" />
</p>

### Source-aligned evidence

![Evidence viewer showing colored metro paths aligned with the source idiyappam](apps/web/public/screenshots/source-aligned-evidence.webp)

The [screenshot manifest](docs/screenshots/README.md) records capture dimensions,
provenance, and what each image verifies.

# Diagrams

```mermaid
flowchart LR
    A[Idiyappam image] --> B[Normalize and segment]
    B --> C[Skeleton and visible strands]
    C --> D[Versioned metro graph]
    D --> E[Deterministic NMRL semantics]
    E --> F[PostgreSQL and upload volume]
    E --> G[Next.js fallback and NoolVerse]
    G --> H[Route planner, train, and timetable]
```

For Hardware:

# Schematic & Circuit

Not applicable: this is a software-only breakfast transit authority.

# Build Photos

Not applicable: the only construction material is idiyappam topology.

### Project Demo

# Video

Live demo: [idiyappam.midhunpm.in](https://idiyappam.midhunpm.in)

# Additional Demos

- [Repository](https://github.com/9MidhunPM/NooluPidichaalMathii)
- [Kerala station naming and fictional timetable policy](docs/city-names.md)

## Team Contributions

- **Midhun P M:** product direction, visual system, deterministic image-to-graph
  pipeline, API, frontend, 3D explorer, testing, deployment, and documentation.

---

Made with ❤️ at TinkerHub Useless Projects

![TinkerHub](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Useless Projects](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)
