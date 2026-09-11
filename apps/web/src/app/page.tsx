"use client";

import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, Color, DoubleSide, Mesh, TubeGeometry, Vector3 } from "three";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

type Point = { x: number; y: number };
type Node = { id: string; name: string; position: Point; kind: "terminal" | "station" | "interchange"; confidence: number };
type Edge = { id: string; points: Point[]; line_id: string; elevation_level: number };
type Line = { id: string; color: string; name: string };
type Graph = { nodes: Node[]; edges: Edge[]; lines: Line[] };
type MetroMap = { id: string; graph: Graph; image_width: number; image_height: number };
type Route = { status: "ok" | "no_route"; node_ids: string[]; edge_ids: string[]; total_length_px: number; warning?: string };
type CameraMode = "orbit" | "top" | "cinematic";

const WORLD_SIZE = 12;

function toWorld(point: Point, map: MetroMap, elevation = 0): Vector3 {
  const scale = WORLD_SIZE / Math.max(map.image_width, map.image_height);
  return new Vector3((point.x - map.image_width / 2) * scale, elevation, (point.y - map.image_height / 2) * scale);
}

function Rail({ edge, graph, map, active }: { edge: Edge; graph: Graph; map: MetroMap; active: boolean }): ReactNode {
  const line = graph.lines.find((item) => item.id === edge.line_id);
  const elevation = 0.24 + edge.elevation_level * 0.28;
  const curve = useMemo(() => new CatmullRomCurve3(edge.points.map((point) => toWorld(point, map, elevation))), [edge.points, elevation, map]);
  const geometry = useMemo(() => new TubeGeometry(curve, Math.max(16, Math.min(180, edge.points.length)), active ? 0.13 : 0.09, 10, false), [active, curve, edge.points.length]);
  const color = active ? "#ff9d24" : line?.color ?? "#2dd4ff";
  return <group><mesh geometry={geometry} castShadow><meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={active ? 1.8 : 0.72} roughness={0.28} metalness={0.55} /></mesh>{active ? <mesh geometry={geometry} scale={1.22}><meshBasicMaterial color={color} transparent opacity={0.16} /></mesh> : null}</group>;
}

function Plate({ imageUrl, map }: { imageUrl: string; map: MetroMap }): ReactNode {
  const texture = useTexture(imageUrl);
  const aspect = map.image_width / map.image_height;
  const width = aspect >= 1 ? WORLD_SIZE : WORLD_SIZE * aspect;
  const height = aspect >= 1 ? WORLD_SIZE / aspect : WORLD_SIZE;
  texture.colorSpace = "srgb";
  return <group><mesh position={[0, -0.24, 0]} receiveShadow><cylinderGeometry args={[Math.max(width, height) * 0.59, Math.max(width, height) * 0.59, 0.32, 96]} /><meshStandardMaterial color="#e9d7b7" roughness={0.28} metalness={0.06} /></mesh><mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 0]}><planeGeometry args={[width, height]} /><meshStandardMaterial map={texture} roughness={0.72} side={DoubleSide} /></mesh></group>;
}

function Station({ node, map, selected }: { node: Node; map: MetroMap; selected: boolean }): ReactNode {
  const height = node.kind === "interchange" ? 0.72 : 0.42;
  const radius = node.kind === "interchange" ? 0.2 : 0.13;
  return <group position={toWorld(node.position, map, height)}><mesh position={[0, -height / 2, 0]} castShadow><cylinderGeometry args={[0.045, 0.065, height, 8]} /><meshStandardMaterial color="#3f3730" roughness={0.58} metalness={0.66} /></mesh><mesh><cylinderGeometry args={[radius, radius, 0.08, 32]} /><meshStandardMaterial color={selected ? "#fff3c4" : "#f6e6cc"} emissive={selected ? "#ff9d24" : "#8bdcff"} emissiveIntensity={selected ? 2 : 0.55} roughness={0.22} metalness={0.6} /></mesh><mesh position={[0, 0.055, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[radius * 0.7, 0.024, 8, 28]} /><meshBasicMaterial color={selected ? "#ff9d24" : "#e9f7ff"} /></mesh><Html position={[0, 0.22, 0]} center distanceFactor={9} occlude><span style={{ display: "block", padding: "3px 6px", border: "1px solid rgba(229,238,240,.38)", borderRadius: 4, background: "rgba(6,11,14,.78)", color: "#f8f4e9", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{node.name}</span></Html></group>;
}

function CameraDirector({ mode }: { mode: CameraMode }): ReactNode {
  const { camera } = useThree();
  const destination = useMemo(() => mode === "top" ? new Vector3(0, 15, 0.01) : mode === "cinematic" ? new Vector3(10, 8, 10) : new Vector3(8, 7, 8), [mode]);
  useFrame((_, delta) => { camera.position.lerp(destination, Math.min(1, delta * 3.5)); camera.lookAt(0, 0, 0); });
  return null;
}

function NoolExpress({ edge, map, enabled }: { edge: Edge | undefined; map: MetroMap; enabled: boolean }): ReactNode {
  const train = useRef<Mesh>(null);
  const curve = useMemo(() => edge ? new CatmullRomCurve3(edge.points.map((point) => toWorld(point, map, 0.38))) : null, [edge, map]);
  useFrame(({ clock }) => { if (!train.current || !curve || !enabled) return; const progress = (clock.getElapsedTime() * 0.1) % 1; const point = curve.getPointAt(progress); const ahead = curve.getPointAt((progress + 0.015) % 1); train.current.position.copy(point); train.current.lookAt(ahead.x, point.y, ahead.z); });
  return curve ? <mesh ref={train} visible={enabled} castShadow><boxGeometry args={[0.34, 0.13, 0.17]} /><meshStandardMaterial color="#f7eee0" emissive="#ff7d1a" emissiveIntensity={0.7} metalness={0.8} roughness={0.22} /></mesh> : null;
}

function MetroWorld({ map, route, imageUrl, cameraMode }: { map: MetroMap; route: Route | null; imageUrl: string; cameraMode: CameraMode }): ReactNode {
  const activeEdges = new Set(route?.edge_ids ?? []);
  const selectedNodes = new Set(route?.node_ids ?? []);
  const routeEdge = map.graph.edges.find((edge) => activeEdges.has(edge.id)) ?? map.graph.edges[0];
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [8, 7, 8], fov: 44 }}><color attach="background" args={["#090c0e"]} /><fog attach="fog" args={["#090c0e", 12, 24]} /><ambientLight intensity={1.25} color="#c7e6ff" /><directionalLight position={[5, 10, 4]} intensity={3.1} color="#ffe1ab" castShadow /><pointLight position={[-4, 4, -2]} intensity={13} color="#36d9ff" distance={12} /><CameraDirector mode={cameraMode} /><Suspense fallback={null}><Plate imageUrl={imageUrl} map={map} /></Suspense>{map.graph.edges.map((edge) => <Rail key={edge.id} edge={edge} graph={map.graph} map={map} active={activeEdges.has(edge.id)} />)}{map.graph.nodes.map((node) => <Station key={node.id} node={node} map={map} selected={selectedNodes.has(node.id)} />)}<NoolExpress edge={routeEdge} map={map} enabled={route?.status === "ok"} /><OrbitControls makeDefault enablePan enableDamping enableRotate={cameraMode === "orbit"} target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={20} /></Canvas>;
}

function demo(): Promise<File> { return new Promise((resolve, reject) => { const canvas = document.createElement("canvas"); canvas.width = 560; canvas.height = 420; const context = canvas.getContext("2d"); if (!context) { reject(new Error("Canvas unavailable")); return; } context.fillStyle = "#264b32"; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = "#f8eddb"; context.lineWidth = 9; for (let index = 0; index < 8; index += 1) { context.beginPath(); context.ellipse(280, 210, 210 - index * 18, 130 - index * 11, index * 0.31, 0, Math.PI * 2); context.stroke(); } canvas.toBlob((blob) => blob ? resolve(new File([blob], "demo-idiyappam.png", { type: "image/png" })) : reject(new Error("Demo image failed")), "image/png"); }); }

export default function HomePage({ initialMapId }: { initialMapId?: string }): ReactNode {
  const [map, setMap] = useState<MetroMap | null>(null); const [route, setRoute] = useState<Route | null>(null); const [origin, setOrigin] = useState(""); const [destination, setDestination] = useState(""); const [message, setMessage] = useState("Upload a top-down idiyappam photo to open NoolVerse."); const [busy, setBusy] = useState(false); const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const openMap = useCallback(async (mapId: string) => { setBusy(true); try { const saved = await fetch(`/backend/api/maps/${mapId}`); const value = await saved.json() as MetroMap; if (!saved.ok) throw new Error("This saved map is unavailable."); const first = value.graph.nodes[0]?.id ?? ""; const second = value.graph.nodes[1]?.id ?? first; setMap(value); setOrigin(first); setDestination(second); setMessage("NoolVerse is assembled. Choose a journey."); } catch (error) { setMessage(error instanceof Error ? error.message : "Map retrieval failed"); } finally { setBusy(false); } }, []);
  const upload = useCallback(async (file: File) => { setBusy(true); setRoute(null); setMessage("Scanning visible noodle paths…"); try { const body = new FormData(); body.append("image", file); const created = await fetch("/backend/api/maps", { method: "POST", body }); const data = await created.json() as { id?: string; message?: string; code?: string }; if (!created.ok || !data.id) throw new Error(data.message ?? data.code ?? "Map creation failed"); await openMap(data.id); } catch (error) { setMessage(error instanceof Error ? error.message : "Processing failed"); } finally { setBusy(false); } }, [openMap]);
  useEffect(() => { if (initialMapId) void openMap(initialMapId); }, [initialMapId, openMap]);
  const onFile = useCallback((event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void upload(file); }, [upload]);
  const plan = useCallback(async () => { if (!map || !origin || !destination) return; setBusy(true); try { const response = await fetch(`/backend/api/maps/${map.id}/route`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin_id: origin, destination_id: destination }) }); const result = await response.json() as Route; setRoute(result); setMessage(result.status === "ok" ? `Route lit across ${result.node_ids.length} stations.` : result.warning ?? "No visible route found."); } finally { setBusy(false); } }, [destination, map, origin]);
  const imageUrl = map ? `/backend/api/maps/${map.id}/image` : ""; const selectedOrigin = map?.graph.nodes.find((node) => node.id === origin); const selectedDestination = map?.graph.nodes.find((node) => node.id === destination);
  return <main className="control-room"><header className="topbar"><div className="brand-mark" aria-hidden="true">≋</div><div><p className="wordmark">NOOLU PIDICHAAL MATHI</p><p className="brand-tagline">Vazhi ariyille? Noolu pidichaal mathi.</p></div><p className="system-status"><span /> All services unnecessarily operational</p></header>{!map ? <section className="launch"><p className="eyebrow">NOOLVERSE TRANSIT AUTHORITY</p><h1>From idiyappam to an unnecessarily serious metro.</h1><p>We trace visible noodles, curate a navigable network, then raise it into a tiny world.</p><div className="launch-actions"><label className="gold-button">Upload your idiyappam<input aria-label="Upload idiyappam photo" accept="image/jpeg,image/png,image/webp" type="file" onChange={onFile} hidden /></label><button className="ghost-button" onClick={() => void demo().then(upload)} disabled={busy}>Use demo plate</button></div><p className="privacy-note">JPEG, PNG, or WebP · top-down works best · normalized photos are retained for 7 days</p><p role="status" className="status-copy">{message}</p></section> : <section className="explorer-shell"><aside className="layers-panel"><p className="panel-kicker">MAP {map.id.slice(0, 8)}</p><h2>NoolVerse layers</h2><div className="layer-active">◈ <span>3D Metro Map</span></div><div className="layer-row">◉ <span>Noodle photo</span><b>100%</b></div><div className="layer-row">⌘ <span>Curated path network</span><b>{map.graph.edges.length} routes</b></div><div className="layer-row">◎ <span>Station anchors</span><b>{map.graph.nodes.length}</b></div><div className="source-thumb" style={{ backgroundImage: `url(${imageUrl})` }}><span>Aligned source</span></div><p className="source-copy">Visible paths only. Dense crossings remain inferred.</p></aside><div className="world-panel"><div className="world-heading"><div><p className="eyebrow">NOODLE TO NETWORK</p><h2>Idiyappam Metro</h2></div><div className="view-tabs"><button className={cameraMode === "orbit" ? "active" : ""} onClick={() => setCameraMode("orbit")}>Orbit</button><button className={cameraMode === "top" ? "active" : ""} onClick={() => setCameraMode("top")}>Top view</button><button className={cameraMode === "cinematic" ? "active" : ""} onClick={() => setCameraMode("cinematic")}>Cinematic</button></div></div><div className="world-canvas"><MetroWorld map={map} route={route} imageUrl={imageUrl} cameraMode={cameraMode} /></div><div className="world-footer"><span>◉ Source-aligned plate</span><span>{map.graph.lines.length} active line{map.graph.lines.length === 1 ? "" : "s"}</span><span>⌁ {route?.status === "ok" ? `${Math.round(route.total_length_px)} noodle-centimetres` : "select a route"}</span></div></div><aside className="journey-panel"><p className="panel-kicker">PLAN A JOURNEY</p><h2>Where are we unnecessarily going?</h2><label>From<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>To<select value={destination} onChange={(event) => setDestination(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><button className="route-button" onClick={() => void plan()} disabled={busy}>Show route <span>→</span></button><div className="journey-card"><p>Suggested journey</p><strong>{selectedOrigin?.name ?? "Choose origin"}</strong><div className="route-rail" /><strong>{selectedDestination?.name ?? "Choose destination"}</strong><small>{route?.status === "ok" ? `${route.node_ids.length} stations · ${Math.round(route.total_length_px)} noodle-centimetres` : route?.warning ?? "Choose two stations to illuminate the rail."}</small></div><p role="status" className="status-copy">{message}</p></aside></section>}</main>;
}
