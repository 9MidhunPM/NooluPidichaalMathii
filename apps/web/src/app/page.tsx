"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from "react";

type Point = { x: number; y: number };
type Node = { id: string; name: string; position: Point };
type Edge = { id: string; points: Point[]; line_id: string };
type Graph = { nodes: Node[]; edges: Edge[]; lines: { id: string; color: string }[] };
type MetroMap = { id: string; graph: Graph; image_width: number; image_height: number };
type Route = { status: string; node_ids: string[]; edge_ids: string[]; warning?: string };

function Rails({ graph, route }: { graph: Graph; route: Route | null }): ReactNode {
  return <>{graph.edges.map((edge) => {
    const points = edge.points.map((point) => [(point.x - 50) / 10, 0.1, (point.y - 50) / 10]).flat();
    const color = route?.edge_ids.includes(edge.id) ? "#f6c453" : graph.lines.find((line) => line.id === edge.line_id)?.color ?? "#00d9ff";
    return <line key={edge.id}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(points), 3]} /></bufferGeometry><lineBasicMaterial color={color} /></line>;
  })}</>;
}

function World({ graph, route }: { graph: Graph; route: Route | null }): ReactNode {
  return <Canvas camera={{ position: [0, 9, 10], fov: 48 }}><color attach="background" args={["#101112"]} /><ambientLight intensity={1.2} /><directionalLight position={[4, 7, 4]} intensity={2} /><mesh rotation-x={-Math.PI / 2}><planeGeometry args={[13, 13]} /><meshStandardMaterial color="#2b2520" /></mesh><Rails graph={graph} route={route} />{graph.nodes.map((node) => <mesh key={node.id} position={[(node.position.x - 50) / 10, 0.25, (node.position.y - 50) / 10]}><sphereGeometry args={[route?.node_ids.includes(node.id) ? 0.28 : 0.16, 16, 16]} /><meshStandardMaterial color={route?.node_ids.includes(node.id) ? "#f6c453" : "#f9f1df"} emissive="#f6c453" emissiveIntensity={0.3} /></mesh>)}<OrbitControls /></Canvas>;
}

function sample(): Promise<File> { return new Promise((resolve, reject) => { const canvas = document.createElement("canvas"); canvas.width = 100; canvas.height = 100; const context = canvas.getContext("2d"); if (!context) { reject(new Error("Canvas unavailable")); return; } context.fillStyle = "#f9f1df"; context.fillRect(0, 0, 100, 100); context.strokeStyle = "#38231a"; context.lineWidth = 6; context.beginPath(); context.moveTo(10, 50); context.lineTo(90, 50); context.moveTo(50, 10); context.lineTo(50, 90); context.stroke(); canvas.toBlob((blob) => blob ? resolve(new File([blob], "demo-idiyappam.png", { type: "image/png" })) : reject(new Error("Demo image failed")), "image/png"); }); }

export default function HomePage(): ReactNode {
  const [map, setMap] = useState<MetroMap | null>(null); const [route, setRoute] = useState<Route | null>(null); const [origin, setOrigin] = useState(""); const [destination, setDestination] = useState(""); const [message, setMessage] = useState("Choose a top-down idiyappam photo or use the demo."); const [busy, setBusy] = useState(false);
  const upload = useCallback(async (file: File) => { setBusy(true); setMessage("Inspecting the noodle infrastructure…"); try { const body = new FormData(); body.append("image", file); const created = await fetch("/backend/api/maps", { method: "POST", body }); const data = await created.json(); if (!created.ok) throw new Error(data.message ?? data.code); const saved = await fetch(`/backend/api/maps/${data.id}`); const value = await saved.json() as MetroMap; if (!saved.ok) throw new Error(value.id ?? "Map storage failed"); setMap(value); setOrigin(value.graph.nodes[0]?.id ?? ""); setDestination(value.graph.nodes.at(-1)?.id ?? ""); setMessage("NoolVerse is ready. Choose two stations."); } catch (error) { setMessage(error instanceof Error ? error.message : "Processing failed"); } finally { setBusy(false); } }, []);
  const onFile = useCallback((event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void upload(file); }, [upload]);
  const plan = useCallback(async () => { if (!map) return; setBusy(true); const response = await fetch(`/backend/api/maps/${map.id}/route`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin_id: origin, destination_id: destination }) }); const result = await response.json() as Route; setRoute(result); setMessage(result.status === "ok" ? `Route ready across ${result.node_ids.length} stations.` : result.warning ?? "No route found."); setBusy(false); }, [destination, map, origin]);
  return <main><section className="hero"><p className="eyebrow">NOOLVERSE TRANSIT AUTHORITY</p><h1>Noolu Pidichaal Mathi</h1><p className="tagline">Vazhi ariyille? Noolu pidichaal mathi.</p><p>Upload idiyappam. Receive extremely serious public transport.</p><div className="actions"><label className="button">Upload a photo<input aria-label="Upload idiyappam photo" accept="image/jpeg,image/png,image/webp" type="file" onChange={onFile} hidden /></label><button onClick={() => void sample().then(upload)} disabled={busy}>Use demo map</button></div><p className="retention">Photos are normalized and retained for 7 days.</p><p role="status">{message}</p></section>{map && <section className="explorer"><div className="panel"><p className="eyebrow">MAP {map.id.slice(0, 8)}</p><h2>Choose your unnecessary journey</h2><div className="selectors"><select value={origin} onChange={(event) => setOrigin(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select><select value={destination} onChange={(event) => setDestination(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select><button onClick={() => void plan()} disabled={busy}>Plan route</button></div><svg className="map2d" viewBox={`0 0 ${map.image_width} ${map.image_height}`}>{map.graph.edges.map((edge) => <polyline key={edge.id} points={edge.points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={route?.edge_ids.includes(edge.id) ? "#f6c453" : map.graph.lines.find((line) => line.id === edge.line_id)?.color ?? "#00d9ff"} strokeWidth="3" />)}{map.graph.nodes.map((node) => <circle key={node.id} cx={node.position.x} cy={node.position.y} r="3" fill="#f9f1df" />)}</svg></div><div className="scene"><World graph={map.graph} route={route} /></div></section>}</main>;
}
