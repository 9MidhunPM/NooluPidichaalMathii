"use client";

type Point = { x: number; y: number };
type Edge = { id: string; points: Point[]; line_id: string };
type Graph = { edges: Edge[]; lines: { id: string; color: string }[] };
type RevealMap = { id: string; image_width: number; image_height: number; graph: Graph; skeleton_available?: boolean };

const colour = (graph: Graph, edge: Edge) => graph.lines.find((line) => line.id === edge.line_id)?.color ?? "#7ee7d3";

export function ProcessingReveal({ map, stage }: { map: RevealMap; stage: "skeleton" | "tracks" }) {
  const imageUrl = `/backend/api/maps/${map.id}/image`;
  const isSkeleton = stage === "skeleton";
  return <main className="control-room processing-room" aria-live="polite">
    <header className="topbar"><div className="brand-mark">≋</div><div><p className="wordmark">NOOLU PIDICHAAL MATHI <span>· NMRL</span></p><p className="brand-tagline">Vazhi ariyille? Noolu pidichaal mathi.</p></div><p className="system-status"><span />NMRL control room awake</p></header>
    <section className="processing-stage">
      <p className="eyebrow">NMRL VISION PIPELINE</p>
      <h1>{isSkeleton ? "OpenCV found the strands." : "NMRL chose its tracks."}</h1>
      <p>{isSkeleton ? "The skeleton is the evidence. The next screen turns only visible paths into routes." : "Coloured traces show the noodle paths that become the metro. Boarding NoolVerse now…"}</p>
      <div className="reveal-frame">
        {isSkeleton && map.skeleton_available ? <img src={`/backend/api/maps/${map.id}/artifacts/skeleton`} alt="OpenCV skeleton of the uploaded idiyappam" /> : <div className="trace-stage"><img src={imageUrl} alt="Uploaded idiyappam with selected NMRL paths" /><svg viewBox={`0 0 ${map.image_width} ${map.image_height}`} preserveAspectRatio="none" aria-hidden="true">{map.graph.edges.map((edge) => <polyline key={edge.id} points={edge.points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={colour(map.graph, edge)} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}</svg></div>}
      </div>
      <ol className="reveal-steps"><li className="done">Source photo</li><li className={isSkeleton ? "active" : "done"}>OpenCV skeleton</li><li className={isSkeleton ? "" : "active"}>Chosen metro paths</li><li>3D NoolVerse</li></ol>
    </section>
  </main>;
}
