"use client";

import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, Color, DoubleSide, Group, TubeGeometry, Vector3 } from "three";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

type Point = { x: number; y: number };
type Node = { id: string; name: string; position: Point; kind: "terminal" | "station" | "interchange"; confidence: number };
type Edge = { id: string; from_node_id: string; to_node_id: string; points: Point[]; line_id: string; elevation_level: number };
type Line = { id: string; color: string; name: string };
type Graph = { nodes: Node[]; edges: Edge[]; lines: Line[] };
type MetroMap = { id: string; graph: Graph; image_width: number; image_height: number };
type Route = { status: "ok" | "no_route"; node_ids: string[]; edge_ids: string[]; total_length_px: number; warning?: string };
type CameraMode = "orbit" | "top" | "cinematic";
type AnalysisStage = "idle" | "uploading" | "tracing" | "assembling";

const WORLD_SIZE = 12;

function toWorld(point: Point, map: MetroMap, elevation = 0): Vector3 {
  const scale = WORLD_SIZE / Math.max(map.image_width, map.image_height);
  return new Vector3((point.x - map.image_width / 2) * scale, elevation, (point.y - map.image_height / 2) * scale);
}

function Rail({ edge, graph, map, active }: { edge: Edge; graph: Graph; map: MetroMap; active: boolean }): ReactNode {
  const line = graph.lines.find((item) => item.id === edge.line_id);
  const elevation = 0.28 + edge.elevation_level * 0.18;
  const curve = useMemo(() => new CatmullRomCurve3(edge.points.map((point) => toWorld(point, map, elevation))), [edge.points, elevation, map]);
  const deck = useMemo(() => new TubeGeometry(curve, Math.max(24, Math.min(240, edge.points.length * 2)), active ? 0.14 : 0.12, 10, false), [active, curve, edge.points.length]);
  const rail = useMemo(() => new TubeGeometry(curve, Math.max(24, Math.min(240, edge.points.length * 2)), active ? 0.09 : 0.075, 10, false), [active, curve, edge.points.length]);
  const color = active ? "#ff9d24" : line?.color ?? "#2dd4ff";
  return <group>
    <mesh geometry={deck} castShadow><meshStandardMaterial color="#161b1e" roughness={0.36} metalness={0.85} /></mesh>
    <mesh geometry={rail}><meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={active ? 1.4 : 0.6} roughness={0.24} metalness={0.74} /></mesh>
    {active ? <mesh geometry={rail}><meshBasicMaterial color={color} transparent opacity={0.12} /></mesh> : null}
  </group>;
}

function Plate({ imageUrl, map }: { imageUrl: string; map: MetroMap }): ReactNode {
  const texture = useTexture(imageUrl);
  const aspect = map.image_width / map.image_height;
  const width = aspect >= 1 ? WORLD_SIZE : WORLD_SIZE * aspect;
  const height = aspect >= 1 ? WORLD_SIZE / aspect : WORLD_SIZE;
  texture.colorSpace = "srgb";
  return <group>
    <mesh position={[0, -0.24, 0]} receiveShadow><cylinderGeometry args={[Math.max(width, height) * 0.59, Math.max(width, height) * 0.59, 0.32, 96]} /><meshStandardMaterial color="#e9d7b7" roughness={0.28} metalness={0.06} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 0]}><planeGeometry args={[width, height, 64, 64]} /><meshStandardMaterial map={texture} bumpMap={texture} bumpScale={0.12} roughness={0.66} side={DoubleSide} /></mesh>
  </group>;
}

function Station({ node, map, graph, selected }: { node: Node; map: MetroMap; graph: Graph; selected: boolean }): ReactNode {
  const incident = graph.edges.filter((edge) => edge.from_node_id === node.id || edge.to_node_id === node.id);
  const level = Math.max(0, ...incident.map((edge) => edge.elevation_level));
  const height = 0.28 + level * 0.18;
  const radius = node.kind === "interchange" ? 0.18 : 0.14;
  return <group position={toWorld(node.position, map, height)}>
    <mesh position={[-0.12, -height / 2, 0]} castShadow><cylinderGeometry args={[0.026, 0.04, height, 8]} /><meshStandardMaterial color="#5b5d56" roughness={0.8} /></mesh>
    <mesh position={[0.12, -height / 2, 0]} castShadow><cylinderGeometry args={[0.026, 0.04, height, 8]} /><meshStandardMaterial color="#5b5d56" roughness={0.8} /></mesh>
    <mesh><boxGeometry args={[radius * 3.4, 0.07, radius * 1.9]} /><meshStandardMaterial color="#d4cfc0" roughness={0.7} metalness={0.12} /></mesh>
    <mesh position={[0, 0.045, radius * 0.72]}><boxGeometry args={[radius * 3.1, 0.018, 0.035]} /><meshStandardMaterial color={selected ? "#ff9d24" : "#e7bd50"} emissive={selected ? "#ff9d24" : "#b98028"} emissiveIntensity={0.55} /></mesh>
    <mesh position={[0, 0.16, 0]}><boxGeometry args={[radius * 2.6, 0.035, radius * 1.5]} /><meshStandardMaterial color="#2c573f" roughness={0.62} /></mesh>
    <mesh position={[0, 0.105, 0]}><cylinderGeometry args={[0.018, 0.018, 0.11, 6]} /><meshStandardMaterial color="#4c5148" roughness={0.75} /></mesh>
    <Html position={[0, 0.32, 0]} center distanceFactor={9} occlude><span className="station-label">{node.name}</span></Html>
  </group>;
}

function CameraDirector({ mode }: { mode: CameraMode }): ReactNode {
  const { camera } = useThree();
  const destination = useMemo(() => mode === "top" ? new Vector3(0, 15, 0.01) : mode === "cinematic" ? new Vector3(10, 8, 10) : new Vector3(8, 7, 8), [mode]);
  const transition = useRef(0);
  useEffect(() => { transition.current = 1; }, [mode]);
  useFrame((_, delta) => { if (transition.current <= 0) return; camera.position.lerp(destination, Math.min(1, delta * 3.5)); camera.lookAt(0, 0, 0); transition.current -= delta; });
  return null;
}

function NoolExpress({ edge, map, color, offset = 0 }: { edge: Edge | undefined; map: MetroMap; color: string; offset?: number }): ReactNode {
  const train = useRef<Group>(null);
  const elevation = 0.43 + (edge?.elevation_level ?? 0) * 0.18;
  const curve = useMemo(() => edge ? new CatmullRomCurve3(edge.points.map((point) => toWorld(point, map, elevation))) : null, [edge, elevation, map]);
  useFrame(({ clock }) => { if (!train.current || !curve) return; const progress = (clock.getElapsedTime() * 0.07 + offset) % 1; const point = curve.getPointAt(progress); const ahead = curve.getPointAt((progress + 0.012) % 1); train.current.position.copy(point); train.current.lookAt(ahead.x, point.y, ahead.z); });
  return curve ? <group ref={train}><group rotation-y={Math.PI / 2}><mesh position={[0, 0.075, 0]}><boxGeometry args={[0.52, 0.16, 0.22]} /><meshStandardMaterial color="#e8e5d8" metalness={0.62} roughness={0.28} /></mesh><mesh position={[0, 0.105, 0.116]}><boxGeometry args={[0.36, 0.07, 0.014]} /><meshStandardMaterial color="#153746" emissive="#2cc6e7" emissiveIntensity={0.45} /></mesh><mesh position={[-0.18, 0.075, 0.123]}><boxGeometry args={[0.06, 0.12, 0.014]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} /></mesh><mesh position={[0.18, 0.075, 0.123]}><boxGeometry args={[0.06, 0.12, 0.014]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} /></mesh></group><pointLight position={[0, 0.1, 0.18]} color="#fff2bc" intensity={1.2} distance={1.5} /></group> : null;
}

function MetroWorld({ map, route, imageUrl, cameraMode }: { map: MetroMap; route: Route | null; imageUrl: string; cameraMode: CameraMode }): ReactNode {
  const activeEdges = new Set(route?.edge_ids ?? []);
  const selectedNodes = new Set(route?.node_ids ?? []);
  const routeEdge = map.graph.edges.find((edge) => activeEdges.has(edge.id)) ?? map.graph.edges[0];
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [8, 7, 8], fov: 44 }}>
    <color attach="background" args={["#090c0e"]} /><fog attach="fog" args={["#090c0e", 12, 24]} /><ambientLight intensity={1.25} color="#c7e6ff" /><directionalLight position={[5, 10, 4]} intensity={3.1} color="#ffe1ab" castShadow /><pointLight position={[-4, 4, -2]} intensity={13} color="#36d9ff" distance={12} />
    <CameraDirector mode={cameraMode} /><Suspense fallback={null}><Plate imageUrl={imageUrl} map={map} /></Suspense>
    {map.graph.edges.map((edge) => <Rail key={edge.id} edge={edge} graph={map.graph} map={map} active={activeEdges.has(edge.id)} />)}{map.graph.nodes.map((node) => <Station key={node.id} node={node} map={map} graph={map.graph} selected={selectedNodes.has(node.id)} />)}<NoolExpress edge={routeEdge} map={map} color="#ff9d24" />{map.graph.edges.slice(1, 4).map((edge, index) => <NoolExpress key={edge.id} edge={edge} map={map} color={map.graph.lines.find((line) => line.id === edge.line_id)?.color ?? "#00d9ff"} offset={(index + 1) * 0.23} />)}
    <OrbitControls makeDefault enablePan enableDamping enableRotate={cameraMode === "orbit"} target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={20} />
  </Canvas>;
}

function demo(): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas"); canvas.width = 560; canvas.height = 420;
    const context = canvas.getContext("2d"); if (!context) { reject(new Error("Canvas unavailable")); return; }
    context.fillStyle = "#264b32"; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = "#f8eddb"; context.lineWidth = 9;
    for (let index = 0; index < 8; index += 1) { context.beginPath(); context.ellipse(280, 210, 210 - index * 18, 130 - index * 11, index * 0.31, 0, Math.PI * 2); context.stroke(); }
    canvas.toBlob((blob) => blob ? resolve(new File([blob], "demo-idiyappam.png", { type: "image/png" })) : reject(new Error("Demo image failed")), "image/png");
  });
}

function AnalysisReveal({ previewUrl, stage, message }: { previewUrl: string | null; stage: AnalysisStage; message: string }): ReactNode {
  const steps: Array<[AnalysisStage, string, string]> = [["uploading", "PHOTO", "Securing the breakfast evidence"], ["tracing", "SKELETON", "Tracing visible noodle paths"], ["assembling", "METRO", "Assigning excessively serious services"]];
  const current = steps.findIndex(([value]) => value === stage);
  return <section className="analysis-reveal" aria-live="polite"><div className="analysis-preview" style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}><span>{previewUrl ? "SOURCE PHOTO" : "WAITING FOR A PLATE"}</span></div><div className="analysis-copy"><p className="eyebrow">NOOLVERSE SCAN</p><h2>{message}</h2><div className="analysis-steps">{steps.map(([value, title, caption], index) => <div className={index <= current ? "analysis-step active" : "analysis-step"} key={value}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{title}</strong><small>{caption}</small></span></div>)}</div><p className="privacy-note">The source stays visible while the server traces real paths. The stored mask and skeleton arrive in the next reveal slice.</p></div></section>;
}

function JourneyTimeline({ nodes }: { nodes: Node[] }): ReactNode {
  if (!nodes.length) return <small>Choose two stations to illuminate the rail.</small>;
  return <ol className="journey-timeline">{nodes.map((node, index) => <li key={node.id}><i /><span><strong>{node.name}</strong><small>{index === 0 ? "Board with your tiffin" : index === nodes.length - 1 ? "Alight before the coconut chutney closes" : node.kind === "interchange" ? "Transfer if your noodle permits" : "Keep calm and carry curry"}</small></span></li>)}</ol>;
}

export default function HomePage({ initialMapId }: { initialMapId?: string }): ReactNode {
  const [map, setMap] = useState<MetroMap | null>(null); const [route, setRoute] = useState<Route | null>(null); const [origin, setOrigin] = useState(""); const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("Upload a top-down idiyappam photo to open NoolVerse."); const [busy, setBusy] = useState(false); const [cameraMode, setCameraMode] = useState<CameraMode>("orbit"); const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");
  const openMap = useCallback(async (mapId: string) => { setBusy(true); try { const saved = await fetch(`/backend/api/maps/${mapId}`); const value = await saved.json() as MetroMap; if (!saved.ok) throw new Error("This saved map is unavailable."); const first = value.graph.nodes[0]?.id ?? ""; const second = value.graph.nodes[1]?.id ?? first; setMap(value); setOrigin(first); setDestination(second); setAnalysisStage("idle"); setMessage("NoolVerse is assembled. Choose a journey."); } catch (error) { setMessage(error instanceof Error ? error.message : "Map retrieval failed"); } finally { setBusy(false); } }, []);
  const upload = useCallback(async (file: File) => { const localPreview = URL.createObjectURL(file); setPreviewUrl((existing) => { if (existing) URL.revokeObjectURL(existing); return localPreview; }); setBusy(true); setRoute(null); setAnalysisStage("uploading"); setMessage("Securing your breakfast evidence…"); try { const body = new FormData(); body.append("image", file); setAnalysisStage("tracing"); setMessage("Tracing visible noodle paths…"); const created = await fetch("/backend/api/maps", { method: "POST", body }); const data = await created.json() as { id?: string; message?: string; code?: string }; if (!created.ok || !data.id) throw new Error(data.message ?? data.code ?? "Map creation failed"); setAnalysisStage("assembling"); setMessage("Raising rails and naming stops…"); await openMap(data.id); } catch (error) { setAnalysisStage("idle"); setMessage(error instanceof Error ? error.message : "Processing failed"); } finally { setBusy(false); } }, [openMap]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]); useEffect(() => { if (initialMapId) void openMap(initialMapId); }, [initialMapId, openMap]);
  const onFile = useCallback((event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void upload(file); }, [upload]);
  const plan = useCallback(async () => { if (!map || !origin || !destination) return; setBusy(true); try { const response = await fetch(`/backend/api/maps/${map.id}/route`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin_id: origin, destination_id: destination }) }); const result = await response.json() as Route; setRoute(result); setMessage(result.status === "ok" ? `Route lit across ${result.node_ids.length} stations.` : result.warning ?? "No visible route found."); } finally { setBusy(false); } }, [destination, map, origin]);
  const imageUrl = map ? `/backend/api/maps/${map.id}/image` : ""; const selectedOrigin = map?.graph.nodes.find((node) => node.id === origin); const selectedDestination = map?.graph.nodes.find((node) => node.id === destination); const journeyNodes = route?.node_ids.map((id) => map?.graph.nodes.find((node) => node.id === id)).filter((node): node is Node => Boolean(node)) ?? [];
  return <main className="control-room"><header className="topbar"><div className="brand-mark" aria-hidden="true">≋</div><div><p className="wordmark">NOOLU PIDICHAAL MATHI</p><p className="brand-tagline">Vazhi ariyille? Noolu pidichaal mathi.</p></div><p className="system-status"><span /> All services unnecessarily operational</p></header>{!map ? <><section className="launch"><p className="eyebrow">NOOLVERSE TRANSIT AUTHORITY</p><h1>From idiyappam to an unnecessarily serious metro.</h1><p>We trace visible noodles, curate a navigable network, then raise it into a tiny world.</p><div className="launch-actions"><label className="gold-button">Upload your idiyappam<input aria-label="Upload idiyappam photo" accept="image/jpeg,image/png,image/webp" type="file" onChange={onFile} hidden /></label><button className="ghost-button" onClick={() => void demo().then(upload)} disabled={busy}>Use demo plate</button></div><p className="privacy-note">JPEG, PNG, or WebP · top-down works best · normalized photos are retained for 7 days</p><p role="status" className="status-copy">{message}</p></section>{(busy || previewUrl) ? <AnalysisReveal previewUrl={previewUrl} stage={analysisStage} message={message} /> : null}</> : <section className="explorer-shell"><aside className="layers-panel"><p className="panel-kicker">MAP {map.id.slice(0, 8)}</p><h2>NoolVerse layers</h2><div className="layer-active">◈ <span>3D Metro Map</span></div><div className="layer-row">◉ <span>Noodle photo</span><b>100%</b></div><div className="layer-row">⌘ <span>Curated path network</span><b>{map.graph.edges.length} routes</b></div><div className="layer-row">◎ <span>Station anchors</span><b>{map.graph.nodes.length}</b></div><div className="source-thumb" style={{ backgroundImage: `url(${imageUrl})` }}><span>Aligned source</span></div><p className="source-copy">Visible paths only. Dense crossings remain inferred.</p></aside><div className="world-panel"><div className="world-heading"><div><p className="eyebrow">NOODLE TO NETWORK</p><h2>Idiyappam Metro</h2></div><div className="view-tabs"><button className={cameraMode === "orbit" ? "active" : ""} onClick={() => setCameraMode("orbit")}>Orbit</button><button className={cameraMode === "top" ? "active" : ""} onClick={() => setCameraMode("top")}>Top view</button><button className={cameraMode === "cinematic" ? "active" : ""} onClick={() => setCameraMode("cinematic")}>Cinematic</button></div></div><div className="world-canvas"><MetroWorld map={map} route={route} imageUrl={imageUrl} cameraMode={cameraMode} /></div><div className="world-footer"><span>◉ Source-aligned plate</span><span>{map.graph.lines.length} active line{map.graph.lines.length === 1 ? "" : "s"}</span><span>⌁ {route?.status === "ok" ? `${Math.round(route.total_length_px)} noodle-centimetres` : "select a route"}</span></div></div><aside className="journey-panel"><p className="panel-kicker">PLAN A JOURNEY</p><h2>Where are we unnecessarily going?</h2><label>From<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>To<select value={destination} onChange={(event) => setDestination(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><button className="route-button" onClick={() => void plan()} disabled={busy}>Show route <span>→</span></button><div className="journey-card"><p>Suggested journey</p><strong>{selectedOrigin?.name ?? "Choose origin"}</strong>{route?.status === "ok" ? <JourneyTimeline nodes={journeyNodes} /> : <><div className="route-rail" /><strong>{selectedDestination?.name ?? "Choose destination"}</strong><small>{route?.warning ?? "Choose two stations to illuminate the rail."}</small></>}<small>{route?.status === "ok" ? `${journeyNodes.length} stations · ${Math.round(route.total_length_px)} noodle-centimetres` : null}</small></div><p role="status" className="status-copy">{message}</p></aside></section>}</main>;
}
