"use client";

import type { ChangeEvent, ReactNode } from "react";

import "./landing.css";

type LandingPageProps = {
  message: string;
  pendingImage: string | null;
  onUpload: (file: File) => void;
  onDemo: () => void;
};

const pipeline = [
  ["Inspection", "Decode, orient, validate and politely judge the lighting."],
  ["Nool isolation", "OpenCV separates breakfast from plate without consulting an astrologer."],
  ["Route survey", "A one-pixel skeleton exposes endpoints, junctions and suspicious crossings."],
  ["Transit planning", "The graph receives lines, stations, elevations and deterministic Kerala names."],
  ["Urban development", "React Three Fiber raises the rails and dispatches the Nool Express."],
] as const;

const features = [
  ["See the evidence", "Toggle the source photo, all detected strands and the exact paths promoted to metro duty."],
  ["Roam NoolVerse", "Orbit the plate, return to photo alignment or request a cinematic government inspection."],
  ["Plan a pointless commute", "Choose two stations, calculate a real shortest path and follow the tiny train."],
  ["Survive weak hardware", "Reduced motion, capped quality and a complete 2D route view keep the joke usable."],
] as const;

function NoolLogo({ compact = false }: { compact?: boolean }): ReactNode {
  return (
    <span className={compact ? "nool-logo compact" : "nool-logo"} aria-hidden="true">
      <svg viewBox="0 0 96 96" role="img">
        <circle cx="48" cy="48" r="43" />
        <path d="M18 60C27 20 35 73 47 33S66 71 78 28" />
        <circle cx="21" cy="51" r="5" />
        <circle cx="48" cy="32" r="5" />
        <circle cx="76" cy="35" r="5" />
      </svg>
    </span>
  );
}

function BreakfastMap(): ReactNode {
  return (
    <div className="breakfast-map">
      <img src="/demo/idiyappam-demo.png" alt="Top-down idiyappam used for the NMRL demonstration" />
      <svg viewBox="0 0 760 570" preserveAspectRatio="none" aria-hidden="true">
        <path className="demo-line line-one" d="M84 387C153 310 179 203 289 214S400 399 497 316 610 163 689 209" />
        <path className="demo-line line-two" d="M108 194C202 257 217 421 350 374S463 170 635 357" />
        <path className="demo-line line-three" d="M165 465C265 395 320 149 446 191S544 428 663 423" />
        <g className="demo-stations"><circle cx="84" cy="387" r="9"/><circle cx="289" cy="214" r="9"/><circle cx="497" cy="316" r="11"/><circle cx="689" cy="209" r="9"/><circle cx="108" cy="194" r="9"/><circle cx="350" cy="374" r="11"/><circle cx="635" cy="357" r="9"/><circle cx="165" cy="465" r="9"/><circle cx="446" cy="191" r="11"/><circle cx="663" cy="423" r="9"/></g>
      </svg>
      <span className="map-caption">Illustrative route overlay · live results are computed from your image</span>
    </div>
  );
}

export function LandingPage({ message, pendingImage, onUpload, onDemo }: LandingPageProps): ReactNode {
  return (
    <main className="landing-page">
      {/*
        THESIS: A public-transport launch disguised as a punched Kerala bus ticket; no generic SaaS hero.
        OWN-WORLD: Turmeric paper, route-board green, cobalt ink, coral punches, hard rules and perforations.
        STORY: Understand the one-line joke, inspect the real mechanism, then upload or board the known-good demo.
        FIRST VIEWPORT: Giant title and route line at left; actionable ticket with source breakfast at right.
        FORM: Bus-ticket journey, grounded direction 4; product-teardown staging; seed bf647f77.
      */}
      <nav className="landing-nav" aria-label="Primary navigation">
        <a className="nav-brand" href="#top" aria-label="Noolu Pidichaal Mathi home">
          <NoolLogo compact />
          <span><strong>Noolu Pidichaal Mathi</strong><small>An Idiyappam Public Transportation System</small></span>
        </a>
        <div className="nav-links"><a href="#how-it-works">Route survey</a><a href="#proof">Proof, not payasam</a><a href="#faq">FAQ</a></div>
        <a className="nav-ticket" href="#board">Get a ticket <span>↘</span></a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="service-ribbon"><span>●</span> NMRL SERVICES NEEDLESSLY OPERATIONAL</div>
          <p className="malayalam-line" lang="ml">അപ്പം ഉണ്ട്. മാപ്പും ഉണ്ട്.</p>
          <h1 aria-label="One plate. Many platforms. Zero necessity.">One plate.<br />Many platforms.<br /><em>Zero necessity.</em></h1>
          <p className="hero-lede">Upload a top-down idiyappam photo. We detect the visible strands, build a real route graph and turn breakfast into a cinematic 3D metro called <strong>NoolVerse.</strong></p>
          <div className="hero-notes"><span>Deterministic vision</span><span>Real shortest paths</span><span>Tiny moving train</span></div>
          <a className="down-route" href="#how-it-works">See where this nool goes <span>↓</span></a>
        </div>

        <aside className="boarding-ticket" id="board" aria-labelledby="ticket-title">
          <div className="ticket-head"><span>NMRL / SINGLE BREAKFAST</span><b>KL · 03</b></div>
          <div className="ticket-title-row"><NoolLogo /><div><p>BOARDING PASS</p><h2 id="ticket-title">Plate → NoolVerse</h2></div></div>
          {pendingImage ? <img className="ticket-preview" src={pendingImage} alt="Uploaded idiyappam being processed" /> : <BreakfastMap />}
          <p className="upload-message" role="status">{message}</p>
          <div className="ticket-actions">
            <label className="primary-action">Upload idiyappam <span>＋</span><input aria-label="Upload idiyappam photo" accept="image/jpeg,image/png,image/webp" type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} hidden /></label>
            <button className="sample-action" onClick={onDemo}>Board the demo breakfast <span>→</span></button>
          </div>
          <div className="ticket-fine-print"><span>JPEG · PNG · WEBP</span><span>MAX 10 MB</span><span>METADATA STRIPPED</span></div>
        </aside>
      </section>

      <div className="punch-divider" aria-hidden="true"><span>ROUTE 〰 ROUTE 〰 ROUTE 〰 ROUTE 〰 ROUTE 〰 ROUTE</span></div>

      <section className="manifesto" aria-label="Project premise">
        <p className="manifesto-side">PUBLIC NOTICE<br />NMRL/NOOL/2026</p>
        <blockquote>“Vazhi ariyille?<br /><strong>Noolu pidichaal mathi.</strong>”</blockquote>
        <div><p>Don’t know the route? Just follow the noodle.</p><p>Finally, public transport with enough carbohydrates.</p></div>
      </section>

      <section className="pipeline-section" id="how-it-works">
        <header className="section-heading"><p>HOW THE APPAM BECOMES A MAP</p><h2 aria-label="Five departments. One overqualified breakfast.">Five departments.<br />One overqualified breakfast.</h2><span>Nothing here needs an LLM. The bureaucracy is locally sourced.</span></header>
        <ol className="pipeline-list">
          {pipeline.map(([title, copy], index) => <li key={title}><span className="punch-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{copy}</p></div><span className="pipeline-status">{index === 4 ? "READY TO BOARD" : "PASSED"}</span></li>)}
        </ol>
      </section>

      <section className="proof-section" id="proof">
        <div className="proof-intro"><p>NMRL EVIDENCE OFFICE</p><h2>The tracks cannot simply vibe their way across the plate.</h2><p>Every rail keeps the source-image coordinates that produced it. Visitors can compare the photograph, the full skeleton and the selected metro paths at any time.</p><div className="honesty-stamp">CROSSINGS<br /><strong>INFERRED</strong><br />NOT MAGIC</div></div>
        <div className="evidence-strip">
          <figure><div className="evidence-image"><img src="/demo/idiyappam-demo.png" alt="Original top-down idiyappam demo photograph" /></div><figcaption><b>Source photograph</b><span>Ground truth stays under the railway.</span></figcaption></figure>
          <figure><div className="evidence-image skeleton-card"><img src="/demo/idiyappam-demo.png" alt="Idiyappam prepared for visible-strand extraction" /><span className="scan-line" /></div><figcaption><b>Visible-strand survey</b><span>One-pixel routes expose topology.</span></figcaption></figure>
          <figure><div className="evidence-image"><BreakfastMap /></div><figcaption><b>Metro interpretation</b><span>Only selected paths earn rail status.</span></figcaption></figure>
        </div>
      </section>

      <section className="feature-section">
        <header className="feature-title"><NoolLogo /><div><p>WELCOME TO NOOLVERSE</p><h2>A city raised<br />above breakfast.</h2></div></header>
        <div className="feature-ledger">{features.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        <div className="world-poster"><div className="poster-sky"><span className="poster-moon">N</span><div className="poster-track track-a"/><div className="poster-track track-b"/><div className="poster-station station-a">CHUTNEY EXCHANGE</div><div className="poster-station station-b">COCONUT JUNCTION</div><div className="poster-train">NMRL</div></div><div className="poster-caption"><b>NOOLVERSE</b><span>Interactive 3D explorer · Built in the browser</span></div></div>
      </section>

      <section className="tech-section">
        <div><p>UNDER THE PLATE</p><h2 aria-label="Actual engineering. Questionable civic priority.">Actual engineering.<br />Questionable civic priority.</h2></div>
        <ul><li><b>FastAPI + OpenCV</b><span>validates, normalizes, segments and skeletonizes</span></li><li><b>NetworkX + PostgreSQL</b><span>builds routes and persists the versioned graph</span></li><li><b>Next.js + React</b><span>owns the accessible journey and evidence controls</span></li><li><b>Three.js + R3F</b><span>raises the plate into an explorable metro world</span></li></ul>
      </section>

      <section className="photo-rules">
        <div className="rules-copy"><p>BEFORE THE CONDUCTOR WHISTLES</p><h2>Give the noodle surveyor a fighting chance.</h2><p>Top-down. Even light. Contrasting plate. Visible strands. Curry can join after the civil works inspection.</p></div>
        <div className="rule-board"><span>01</span><b>Camera above plate</b><span>02</span><b>No dramatic shadows</b><span>03</span><b>Keep strands visible</b><span>04</span><b>Under 10 MB, please</b></div>
      </section>

      <section className="faq-section" id="faq">
        <header><p>PASSENGER GRIEVANCE CELL</p><h2>Frequently argued questions</h2></header>
        <div className="faq-list">
          <details open><summary>Does this understand which noodle goes under a crossing?<span>＋</span></summary><p>No. A single photograph cannot prove hidden continuity. Ambiguous crossings are marked as inferred, because confidence is not a substitute for X-ray vision.</p></details>
          <details><summary>Is this just AI making up a metro map?<span>＋</span></summary><p>No. The image pipeline and routing are deterministic. Same image, same settings, same public-transport overreaction.</p></details>
          <details><summary>What happens to my breakfast photo?<span>＋</span></summary><p>Metadata is stripped, storage uses a server-generated name and uploads expire with their saved map. We need the nool, not your camera roll biography.</p></details>
          <details><summary>Will this run on my potato phone?<span>＋</span></summary><p>Balanced and Survival modes reduce the spectacle. Route planning remains available outside WebGL, because potatoes also deserve mobility.</p></details>
        </div>
      </section>

      <section className="final-cta"><p lang="ml">വഴി തെറ്റിയാൽ, നൂൽ പിടിക്കുക.</p><h2>Platform ready.<br />Chutney pending.</h2><div><button className="final-demo" onClick={onDemo}>Launch demo breakfast <span>→</span></button><a href="#board">or upload your own plate</a></div><NoolLogo /></section>

      <footer className="landing-footer"><div><strong>Noolu Pidichaal Mathi</strong><span>A proudly unnecessary project by Midhun P M.</span></div><p>NMRL is fictional. The routes are real. Please do not wait for this train at an actual platform.</p><a href="#top">Back to first stop ↑</a></footer>
    </main>
  );
}
