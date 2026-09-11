# Noolu Pidichaal Mathi — MVP

> **Vazhi ariyille? Noolu pidichaal mathi.**  
> Don’t know the route? Just follow the noodle.

**Descriptor:** An Idiyappam Public Transportation System  
**3D world:** NoolVerse  
**Target:** TinkerHub Useless Projects 3.0

## 1. Product in one sentence

A visitor uploads a top-down idiyappam photo; the website visibly extracts its noodle network and turns it into an absurdly serious, cinematic, explorable 3D metro system with stations, elevated lines, service disruptions, route planning, and tiny moving trains.

## 2. The winning demo

The complete reveal should take roughly 20–30 seconds:

1. The uploaded plate floats into a dark inspection chamber.
2. A scanner sweeps over the image and isolates the idiyappam.
3. Cyan skeleton paths race through the visible noodles.
4. Endpoints pulse as terminals; crossings expand into interchange hubs.
5. Colored rails rise from the plate into multiple elevations while station pillars assemble beneath them.
6. The camera dives into NoolVerse and the network comes alive with signals, particles, status lights, and moving trains.
7. The visitor selects Coconut Junction and Curry Sector.
8. The best route glows, irrelevant lines dim, and the camera follows the Nool Express through the network.
9. A dead-serious journey card announces: “73 noodle-centimetres. One transfer. Mild congestion near Chutney Exchange.”

The joke must land before anyone explains OpenCV, graph theory, or shaders. The technology is the escalation of the joke.

## 3. MVP promise

The MVP must complete this loop on a permanently hosted website:

**upload → analyze → reveal → explore → select stations → calculate route → ride train → share**

If a feature does not improve this loop, it is not MVP work.

## 4. Core scope

### 4.1 Input and safety

- Accept one JPEG, PNG, or WebP image up to a configurable 10 MB limit.
- Require a mostly top-down image, even lighting, a contrasting plate, and visible strands.
- Provide one-tap known-good sample photos for the hackathon demo.
- Correct orientation, strip metadata, resize the processing copy to a maximum 1,600 px side, and assign a server-generated filename.
- Reject unsupported, corrupt, implausibly large, or extremely low-contrast input with a useful retry suggestion.

### 4.2 Image-to-network pipeline

- Detect or crop the plate region.
- Segment visible idiyappam using grayscale/color-space thresholding and configurable cleanup.
- Apply opening, closing, small-object removal, and hole filling.
- Skeletonize the mask to one-pixel-wide visible paths.
- Detect endpoints, ordinary track pixels, and clustered junctions from local connectivity.
- Trace ordered polylines between logical graph nodes.
- Prune tiny spurs, simplify geometry, and calculate confidence and pixel length.
- Convert long edges into selectable station segments when the raw graph has too few useful stations.
- Treat ambiguous crossings as inferred interchanges; never claim to recover hidden noodle continuity from one photograph.

### 4.3 Metro interpretation

- Endpoints become terminals.
- Junction clusters become interchange stations.
- Small disconnected components become suspended services.
- Dense junction areas become congestion zones.
- Collinear edge pairs continue the same line; unmatched branches receive new lines.
- Station and line names are deterministic or persisted after creation.
- Route cost equals visible path length plus configurable transfer and disruption penalties.

## 5. The “insane” 3D explorer

The 3D map is the main product, not an optional visualization tab.

### 5.1 World construction

- Display a shallow 3D ceramic plate beneath the network.
- Project the normalized source image onto the plate so the audience can verify the result.
- Reconstruct visible noodle ridges as warm ivory procedural tubes or a lightweight height-field layer.
- Place colored metro rails directly above their corresponding detected paths.
- Separate overlapping lines across a few deliberate height levels.
- Build glowing station platforms, vertical interchange towers, terminal bumpers, support pillars, tunnel portals, and suspended-service barricades procedurally.
- Use a small optimized GLB Nool Express model that follows the selected route curve.

### 5.2 Camera modes

- **Orbit:** free rotate, pan, zoom, pinch, and reset.
- **Top view:** clean metro-diagram inspection aligned with the uploaded image.
- **Cinematic:** an authored flyover of the largest component and major interchange.
- **Train cam:** follow behind or beside the Nool Express during a selected journey.
- **Photo align:** return tracks to the exact top-down source-image alignment.

### 5.3 Interaction

- Hover or tap stations to reveal their name, line memberships, confidence, and status.
- Select origin and destination either in 3D or through accessible controls outside the canvas.
- Highlight the selected route; dim unrelated geometry without hiding context.
- Animate station pulses, interchange transfers, train motion, signals, and disruption warnings.
- Allow pause, replay, speed control, camera switching, and route clearing.
- Provide an optional muted-by-default soundscape using lightweight Web Audio cues.

### 5.4 Visual effects

- Use restrained selective bloom on active lines and stations.
- Use an environment map, baked lighting, fog, contact shadows, color grading, and vignette where the performance tier permits.
- Use shader-driven scan sweeps, line-growth reveals, animated route pulses, and congestion halos.
- Avoid effects that obscure the correspondence between the noodles and tracks.
- Respect reduced motion by replacing camera flight and animated growth with fast fades.

### 5.5 Quality tiers

| Tier | Intended device | Rendering |
|---|---|---|
| Cinematic | Strong desktop GPU | Selective bloom, contact shadows, particles, full train effects, high-detail assets |
| Balanced | Typical laptop/phone | Reduced particles, cheaper shadows, capped DPR, full interaction |
| Survival | Weak GPU/WebGL | Flat 2D map and route planner; no loss of core functionality |

Quality selection begins automatically and remains manually overrideable.

## 6. Browser performance budget

- Target 60 FPS on a representative laptop and at least 30 FPS on a mid-range phone.
- Keep initial compressed transfer below 5 MB excluding the user upload; stretch ceiling is 8 MB.
- Return at most 10,000 simplified graph points by default.
- Use merged or batched rail geometry rather than one draw call per edge.
- Use instancing for stations, supports, signals, and repeated props.
- Use compressed GLB, KTX2/Basis textures, compact environment maps, and lazy loading.
- Cap device pixel ratio to a tested range, normally 1–1.5.
- Render on demand while idle and continuously only during movement/effects.
- Avoid real-time physics, dynamic global illumination, large transparent layers, and per-object shadows.
- Dispose replaced textures, materials, geometries, animation loops, and event listeners.

## 7. Implementation shape

| Layer | Choice |
|---|---|
| Application UI | Next.js, TypeScript, Tailwind CSS |
| 3D rendering | Three.js, React Three Fiber, Drei |
| Effects | `@react-three/postprocessing`, enabled by quality tier |
| Processing API | Python FastAPI |
| Vision | OpenCV and scikit-image |
| Graph/routing | NetworkX |
| Persistence | PostgreSQL with validated JSONB graph data |
| File storage | Persistent Dokploy volume |
| Packaging | Docker Compose deployed through Dokploy |

The computer-vision pipeline runs server-side. The browser receives a versioned graph and constructs the 3D world locally. Redis and a worker are added only if measurements prove synchronous processing cannot meet the response target.

## 8. Minimal API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/maps` | Validate, process, persist, and return a new map |
| `GET` | `/api/maps/{id}` | Return graph, visual settings, and presentation metadata |
| `POST` | `/api/maps/{id}/route` | Calculate an ordered route between two nodes |
| `GET` | `/api/maps/{id}/image` | Return the normalized source image safely |
| `GET` | `/health/live` | Process liveness |
| `GET` | `/health/ready` | Required dependency readiness |

The graph contract must contain versioned nodes, edges, lines, ordered edge points, elevation levels, confidence, service state, display names, image dimensions, and aggregate statistics.

## 9. Asset rules

- Agents may search for and download textures, HDRIs, 3D models, icons, and sound effects when they materially improve the product.
- Prefer CC0 or public-domain assets; permissive attributed assets are acceptable only when their terms fit the project.
- Self-host every runtime asset. Never hotlink a third-party asset.
- Record source URL, author, license, downloaded date, and modifications in `ASSET_LICENSES.md`.
- Optimize downloaded assets before shipping and keep the original only when its license or future editing requires it.
- Do not use ripped game assets, proprietary metro branding, or files with unclear ownership.

## 10. Persistence and sharing

- Store graph data, processing settings, stable names, visual seed, and expiry in PostgreSQL.
- Store normalized images in a persistent mounted volume.
- Create an unguessable `/map/{id}` share URL.
- Reopening a map must not rerun image processing.
- A scheduled retention job removes expired database records and matching files.

## 11. Deployment

- Use only the repository the user supplies.
- Build and deploy the merged, verified `main` branch through Dokploy.
- Serve the application through the existing Traefik configuration at `idiyappam.midhunpm.in`, unless the user selects another hostname.
- Keep FastAPI, PostgreSQL, Redis if introduced, and storage administration off public ports.
- Persist uploads and database data across container replacement.
- Expose `/health/live` and `/health/ready`.
- Production must operate with the development laptop completely powered off.

## 12. Explicitly out of scope

- Correctly identifying a physical strand hidden below another strand.
- Arbitrary plates, side angles, curry-covered idiyappam, hands, or terrible lighting.
- Scientifically accurate distance, scale, traffic, or journey time.
- Live video, AR, VR-headset support, native mobile apps, or multiplayer.
- User accounts, payments, public social feeds, comments, and leaderboards.
- A full manual graph editor.
- GPU compute or an LLM as a mandatory runtime dependency.
- WebGPU-only rendering; WebGL must remain supported.
- A unique subdomain for every generated map.

## 13. MVP definition of done

The MVP is complete only when:

- Five of five controlled acceptance photos produce an explorable primary network without manual correction.
- Upload-to-map finishes within 10 seconds at p95 on the actual host.
- The full scan-to-3D reveal runs without visible stalling on the representative laptop.
- A visitor can orbit the world, select two connected stations, receive a correct route, switch to train cam, and watch the Nool Express complete the trip.
- The 3D view meets 60 FPS on the target laptop and 30 FPS on the target mid-range phone in an appropriate quality tier.
- Reduced motion, keyboard operation, touch controls, and the 2D fallback work.
- A share link survives browser refresh and container redeployment.
- Invalid uploads fail safely and expired uploads are deleted correctly.
- Unit, golden-image, contract, integration, end-to-end, accessibility, production-build, and Docker checks pass.
- The public hostname and both health endpoints succeed from outside the host.
- Three consecutive full demo rehearsals complete without a critical failure.

