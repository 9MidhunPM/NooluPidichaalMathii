"use client";

import { Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, Color, DoubleSide, Group, TubeGeometry, Vector3 } from "three";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

type Point = { x: number; y: number };
type Node = { id: string; name: string; position: Point; kind: "terminal" | "station" | "interchange" };
type Edge = { id: string; from_node_id: string; to_node_id: string; points: Point[]; line_id: string; elevation_level: number };
type Line = { id: string; color: string; name: string };
type Graph = { nodes: Node[]; edges: Edge[]; lines: Line[] };
type MetroMap = { id: string; graph: Graph; image_width: number; image_height: number; skeleton_available?: boolean };
type Route = { status: "ok" | "no_route"; node_ids: string[]; edge_ids: string[]; total_length_px: number; warning?: string };
type CameraMode = "orbit" | "top" | "cinematic";
const WORLD_SIZE = 12;
const world = (point: Point, map: MetroMap, y = 0) => new Vector3((point.x - map.image_width / 2) * WORLD_SIZE / Math.max(map.image_width, map.image_height), y, (point.y - map.image_height / 2) * WORLD_SIZE / Math.max(map.image_width, map.image_height));

function MapTrace({ map, active, className }: { map: MetroMap; active: Set<string>; className: string }): ReactNode {
  return <svg className={className} viewBox={`0 0 ${map.image_width} ${map.image_height}`} preserveAspectRatio="none" aria-hidden="true">{map.graph.edges.map((edge) => {
    const line = map.graph.lines.find((item) => item.id === edge.line_id);
    return <polyline key={edge.id} points={edge.points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={line?.color ?? "#7dd3fc"} strokeWidth={active.has(edge.id) ? 7 : 2.4} opacity={active.size && !active.has(edge.id) ? .12 : active.has(edge.id) ? 1 : .44} strokeLinecap="round" strokeLinejoin="round" />;
  })}</svg>;
}

function Rail({ edge, graph, map, active }: { edge: Edge; graph: Graph; map: MetroMap; active: boolean }): ReactNode {
  const line = graph.lines.find((item) => item.id === edge.line_id);
  const elevation = .28 + edge.elevation_level * .18;
  const curve = useMemo(() => new CatmullRomCurve3(edge.points.map((point) => world(point, map, elevation))), [edge.points, elevation, map]);
  const segments = Math.max(24, Math.min(240, edge.points.length * 2));
  const deck = useMemo(() => new TubeGeometry(curve, segments, active ? .11 : .09, 10, false), [active, curve, segments]);
  const rail = useMemo(() => new TubeGeometry(curve, segments, active ? .058 : .042, 10, false), [active, curve, segments]);
  const color = line?.color ?? "#2dd4ff";
  return <group><mesh geometry={deck}><meshStandardMaterial color="#333630" roughness={.72} metalness={.25} /></mesh><mesh geometry={rail}><meshStandardMaterial color={color} emissive={new Color(color)} emissiveIntensity={active ? 2 : .55} roughness={.24} metalness={.74} /></mesh>{active ? <mesh geometry={rail}><meshBasicMaterial color={color} transparent opacity={.18} /></mesh> : null}</group>;
}

function Plate({ imageUrl, map }: { imageUrl: string; map: MetroMap }): ReactNode {
  const texture = useTexture(imageUrl); texture.colorSpace = "srgb";
  const aspect = map.image_width / map.image_height, width = aspect >= 1 ? WORLD_SIZE : WORLD_SIZE * aspect, height = aspect >= 1 ? WORLD_SIZE / aspect : WORLD_SIZE;
  return <group><mesh position={[0,-.24,0]}><cylinderGeometry args={[Math.max(width,height)*.59,Math.max(width,height)*.59,.32,96]} /><meshStandardMaterial color="#e9d7b7" roughness={.28} /></mesh><mesh rotation-x={-Math.PI/2} position={[0,-.06,0]}><planeGeometry args={[width,height,64,64]} /><meshStandardMaterial map={texture} bumpMap={texture} bumpScale={.08} roughness={.66} side={DoubleSide} /></mesh></group>;
}

function Station({ node, graph, map, selected }: { node: Node; graph: Graph; map: MetroMap; selected: boolean }): ReactNode {
  const level = Math.max(0, ...graph.edges.filter((edge) => edge.from_node_id === node.id || edge.to_node_id === node.id).map((edge) => edge.elevation_level));
  const height = .28 + level * .18, radius = node.kind === "interchange" ? .18 : .14;
  return <group position={world(node.position,map,height)}><mesh position={[-.12,-height/2,0]}><cylinderGeometry args={[.026,.04,height,8]} /><meshStandardMaterial color="#5b5d56" roughness={.8} /></mesh><mesh position={[.12,-height/2,0]}><cylinderGeometry args={[.026,.04,height,8]} /><meshStandardMaterial color="#5b5d56" roughness={.8} /></mesh><mesh><boxGeometry args={[radius*3.4,.07,radius*1.9]} /><meshStandardMaterial color="#d4cfc0" roughness={.7} /></mesh><mesh position={[0,.045,radius*.72]}><boxGeometry args={[radius*3.1,.018,.035]} /><meshStandardMaterial color={selected ? "#ff9d24" : "#e7bd50"} emissive={selected ? "#ff9d24" : "#b98028"} emissiveIntensity={.55} /></mesh><mesh position={[0,.16,0]}><boxGeometry args={[radius*2.6,.035,radius*1.5]} /><meshStandardMaterial color="#2c573f" roughness={.62} /></mesh><Html position={[0,.32,0]} center distanceFactor={9} occlude><span className="station-label">{node.name}</span></Html></group>;
}

function Metro({ edge, map, color }: { edge?: Edge; map: MetroMap; color: string }): ReactNode {
  const ref = useRef<Group>(null); const elevation = .43 + (edge?.elevation_level ?? 0)*.18;
  const curve = useMemo(() => edge ? new CatmullRomCurve3(edge.points.map((point) => world(point,map,elevation))) : null,[edge,map,elevation]);
  useFrame(({clock}) => { if (!ref.current || !curve) return; const p=(clock.getElapsedTime()*.07)%1, at=curve.getPointAt(p), ahead=curve.getPointAt((p+.012)%1); ref.current.position.copy(at); ref.current.lookAt(ahead); });
  return curve ? <group ref={ref}><group rotation-y={Math.PI/2}><mesh position={[0,.075,0]}><boxGeometry args={[.52,.16,.22]} /><meshStandardMaterial color="#e8e5d8" metalness={.62} roughness={.28} /></mesh><mesh position={[0,.105,.116]}><boxGeometry args={[.36,.07,.014]} /><meshStandardMaterial color="#153746" emissive="#2cc6e7" emissiveIntensity={.45} /></mesh><mesh position={[-.18,.075,.123]}><boxGeometry args={[.06,.12,.014]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.65} /></mesh><mesh position={[.18,.075,.123]}><boxGeometry args={[.06,.12,.014]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.65} /></mesh></group></group> : null;
}

function MetroWorld({ map, route, imageUrl, mode }: { map: MetroMap; route: Route | null; imageUrl: string; mode: CameraMode }): ReactNode {
  const active = new Set(route?.edge_ids ?? []); const first = map.graph.edges.find((edge) => active.has(edge.id)) ?? map.graph.edges[0];
  const camera = mode === "top" ? [0,12,.01] : mode === "cinematic" ? [9,6,9] : [8,6,8];
  return <Canvas shadows dpr={[1,1.5]} camera={{position:camera as [number,number,number],fov:44}}><color attach="background" args={["#090c0e"]} /><fog attach="fog" args={["#090c0e",10,21]} /><ambientLight intensity={1.2} /><directionalLight position={[5,10,4]} intensity={2.5} /><Suspense fallback={null}><Plate imageUrl={imageUrl} map={map} /></Suspense>{map.graph.edges.map((edge) => <Rail key={edge.id} edge={edge} graph={map.graph} map={map} active={active.has(edge.id)} />)}{map.graph.nodes.map((node) => <Station key={node.id} node={node} graph={map.graph} map={map} selected={route?.node_ids.includes(node.id) ?? false} />)}<Metro edge={first} map={map} color={map.graph.lines.find((line) => line.id === first?.line_id)?.color ?? "#ff9d24"} /><OrbitControls makeDefault enableDamping target={[0,0,0]} maxPolarAngle={Math.PI/2.05} minDistance={4} maxDistance={20} /></Canvas>;
}

function Journey({ map, route, origin, destination, onOrigin, onDestination, onPlan }: { map: MetroMap; route: Route | null; origin: string; destination: string; onOrigin: (id: string) => void; onDestination: (id: string) => void; onPlan: () => void }): ReactNode {
  return <aside className="journey-panel"><p className="panel-kicker">PLAN A JOURNEY</p><h2>Where are we unnecessarily going?</h2><label>From<select value={origin} onChange={(event) => onOrigin(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>To<select value={destination} onChange={(event) => onDestination(event.target.value)}>{map.graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><button className="route-button" onClick={onPlan}>Show route <span>→</span></button><div className="journey-card"><p>Suggested journey</p>{route?.status === "ok" ? <small>{route.node_ids.map((id) => map.graph.nodes.find((node) => node.id === id)?.name).join(" · ")}<br />{Math.round(route.total_length_px)} noodle-centimetres</small> : <small>Choose two stations to light the noodle.</small>}</div></aside>;
}

export default function HomePage({ initialMapId }: { initialMapId?: string }): ReactNode {
  const [map,setMap]=useState<MetroMap|null>(null), [route,setRoute]=useState<Route|null>(null), [origin,setOrigin]=useState(""), [destination,setDestination]=useState(""), [mode,setMode]=useState<CameraMode>("orbit"), [message,setMessage]=useState("Upload a top-down idiyappam photo to open NoolVerse.");
  const open = useCallback(async(id:string) => { const response=await fetch(`/backend/api/maps/${id}`), value=await response.json() as MetroMap; if(!response.ok) throw new Error("Saved map unavailable"); setMap(value); setOrigin(value.graph.nodes[0]?.id ?? ""); setDestination(value.graph.nodes[1]?.id ?? value.graph.nodes[0]?.id ?? ""); },[]);
  const upload = useCallback(async(file:File) => { setMessage("Tracing visible noodle paths…"); try { const body=new FormData(); body.append("image",file); const response=await fetch("/backend/api/maps",{method:"POST",body}), data=await response.json() as {id?:string;message?:string}; if(!response.ok || !data.id) throw new Error(data.message ?? "Map creation failed"); await open(data.id); } catch(error) { setMessage(error instanceof Error ? error.message : "Processing failed"); } },[open]);
  useEffect(() => { if(initialMapId) void open(initialMapId); },[initialMapId,open]);
  const plan = useCallback(async() => { if(!map) return; const response=await fetch(`/backend/api/maps/${map.id}/route`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({origin_id:origin,destination_id:destination})}); setRoute(await response.json() as Route); },[destination,map,origin]);
  if(!map) return <main className="control-room"><header className="topbar"><div className="brand-mark">≋</div><div><p className="wordmark">NOOLU PIDICHAAL MATHI</p><p className="brand-tagline">Vazhi ariyille? Noolu pidichaal mathi.</p></div></header><section className="launch"><p className="eyebrow">NOOLVERSE TRANSIT AUTHORITY</p><h1>From idiyappam to an unnecessarily serious metro.</h1><p>{message}</p><label className="gold-button">Upload your idiyappam<input aria-label="Upload idiyappam photo" accept="image/jpeg,image/png,image/webp" type="file" onChange={(event:ChangeEvent<HTMLInputElement>) => { const file=event.target.files?.[0]; if(file) void upload(file); }} hidden /></label></section></main>;
  const active=new Set(route?.edge_ids ?? []), imageUrl=`/backend/api/maps/${map.id}/image`;
  return <main className="control-room"><header className="topbar"><div className="brand-mark">≋</div><div><p className="wordmark">NOOLU PIDICHAAL MATHI</p><p className="brand-tagline">Vazhi ariyille? Noolu pidichaal mathi.</p></div></header><section className="explorer-shell"><aside className="layers-panel"><p className="panel-kicker">MAP {map.id.slice(0,8)}</p><h2>NoolVerse layers</h2><div className="layer-active">◈ <span>3D Metro Map</span></div><div className="source-thumb" style={{backgroundImage:`url(${imageUrl})`}}><MapTrace map={map} active={active} className="source-trace" /><span>Used metro paths</span></div><div className="skeleton-pair">{map.skeleton_available ? <figure><img src={`/backend/api/maps/${map.id}/artifacts/skeleton`} alt="All detected idiyappam strands" /><figcaption>All strands</figcaption></figure> : <figure className="skeleton-missing"><figcaption>Raw strands unavailable</figcaption></figure>}<figure className="used-skeleton"><MapTrace map={map} active={active} className="used-trace" /><figcaption>Used paths</figcaption></figure></div><p className="source-copy">Photo traces and skeletons use the same image coordinates as the metro.</p></aside><div className="world-panel"><div className="world-heading"><div><p className="eyebrow">NOODLE TO NETWORK</p><h2>Idiyappam Metro</h2></div><div className="view-tabs"><button className={mode==="orbit"?"active":""} onClick={() => setMode("orbit")}>Orbit</button><button className={mode==="top"?"active":""} onClick={() => setMode("top")}>Top view</button><button className={mode==="cinematic"?"active":""} onClick={() => setMode("cinematic")}>Cinematic</button></div></div><div className="world-canvas"><MetroWorld map={map} route={route} imageUrl={imageUrl} mode={mode} /></div></div><Journey map={map} route={route} origin={origin} destination={destination} onOrigin={(id) => { setOrigin(id); setRoute(null); }} onDestination={(id) => { setDestination(id); setRoute(null); }} onPlan={() => void plan()} /></section></main>;
}
