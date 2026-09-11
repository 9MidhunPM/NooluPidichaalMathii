# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitors, hackathon judges, and presenters who want to turn a controlled top-down idiyappam photograph into an explorable transport network. Shared-map viewers should be able to understand and route through an existing network without knowing computer vision or graph theory.

## Product Purpose

Noolu Pidichaal Mathi makes the technical transformation from food photograph to deterministic metro network visible, funny, and interactive. Success means the premise lands immediately, the image-derived tracks remain provable, and a visitor can upload or use a known-good sample, inspect the transformation, explore NoolVerse, plan a route, and ride the Nool Express.

## Positioning

The product does not classify or merely decorate a food image: it extracts the visible noodle geometry, converts it into a versioned routable graph, and reconstructs that same topology as a miniature 3D public-transport system.

## Operating Context

The first release is a browser-based TinkerHub Useless Projects 3.0 experience. It must work as a repeatable live demo despite venue Wi-Fi, remain useful through a 2D fallback, and explain enough of its deterministic vision and routing pipeline for a technical audience to verify the joke is real.

## Capabilities and Constraints

- The product name is Noolu Pidichaal Mathi; NoolVerse names the 3D world and NMRL names the fictional operator.
- The core loop is upload, analyze, reveal, explore, select stations, calculate route, ride train, and share.
- Tracks must visibly derive from detected noodle paths. Crossings are inferred where one photograph cannot prove hidden strand continuity.
- The production pipeline and routing are deterministic and do not require an LLM.
- Upload, sample, route planning, saved maps, 3D interaction, and 2D fallback remain first-class behavior.
- The public experience must preserve privacy, accessibility, reduced motion, keyboard/touch operation, and measured performance.
- Operational timetable and service-board content is fictional and must never be presented as real Kerala transit advice.

## Brand Commitments

The fixed tagline is “Vazhi ariyille? Noolu pidichaal mathi.” The voice treats breakfast infrastructure with absurd bureaucratic seriousness, using Malayalam and Manglish wordplay while keeping controls and technical explanations clear. Visual spectacle is required, but honesty and usability outrank decoration.

## Evidence on Hand

- `PRD.md` and `MVP.md` define product behavior, architecture, visual principles, and acceptance boundaries.
- `public/demo/idiyappam-demo.png` is a known-good demonstration image.
- The current application contains a functional upload flow, staged processing reveal, source-aligned evidence layers, deterministic metro graph, 3D explorer, route planner, moving train, and fictional NMRL service board.
- Real runtime screenshots are required; concept art must not be passed off as working product evidence.

## Product Principles

1. The joke lands in one sentence, then the implementation proves it.
2. Every rail visibly owes its route to an actual noodle path.
3. Bureaucratic seriousness supplies the comedy; clear language supplies the usability.
4. 3D spectacle degrades gracefully without removing route planning or evidence.
5. Deterministic, persisted results make the live demo repeatable and shareable.

## Accessibility & Inclusion

The experience must support reduced motion, keyboard and touch interaction, readable contrast, accessible controls outside WebGL, and a complete 2D fallback when WebGL is unavailable.
