"use client";

import { ProcessingReveal } from "./processing-reveal";
import { ServiceBoard } from "./service-board";
import { LandingPage } from "./landing-page";
import "./services.css";

import { Html, Line as DreiLine, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { BufferGeometry, CatmullRomCurve3, DoubleSide, Float32BufferAttribute, Group, TubeGeometry, Vector3 } from "three";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Point = { x: number; y: number };
type Node = { id: string; name: string; position: Point; kind: "terminal" | "station" | "interchange" };
type Edge = { id: string; from_node_id: string; to_node_id: string; points: Point[]; line_id: string; elevation_level: number };
type Line = { id: string; color: string; name: string };
type Graph = { nodes: Node[]; edges: Edge[]; lines: Line[] };
type MetroMap = { id: string; graph: Graph; image_width: number; image_height: number; skeleton_available?: boolean };
type Route = { status: "ok" | "no_route"; node_ids: string[]; edge_ids: string[]; total_length_px: number; warning?: string };
type CameraMode = "orbit" | "top" | "cinematic";
type LayerKey = "photo" | "strands" | "tracks" | "stations" | "interchanges" | "supports" | "trains" | "labels";
type Layers = Record<LayerKey, boolean>;
type PreviewKind = "source" | "skeleton" | "paths" | null;

const WORLD_SIZE = 12;
const DEFAULT_LAYERS: Layers = { photo: true, strands: true, tracks: true, stations: true, interchanges: true, supports: true, trains: true, labels: false };
const LAYERS: Array<[LayerKey, string, string]> = [["tracks", "Metro tracks", "half-round deck and rails"], ["strands", "Chosen noodle strands", "source-aligned evidence"], ["photo", "Source idiyappam", "ground truth photo"], ["stations", "Stations", "terminals and stops"], ["interchanges", "Interchanges", "transfer hubs"], ["supports", "Track supports", "low-rise piers"], ["trains", "Nool Express", "rolling stock"], ["labels", "Station labels", "names in the world"]];
const world = (point: Point, map: MetroMap, y = 0) => new Vector3((point.x - map.image_width / 2) * WORLD_SIZE / Math.max(map.image_width, map.image_height), y, (point.y - map.image_height / 2) * WORLD_SIZE / Math.max(map.image_width, map.image_height));
const colorFor = (graph: Graph, edge: Edge) => graph.lines.find((line) => line.id === edge.line_id)?.color ?? "#18c4df";

function namesFor(graph: Graph): Map<string, string> { const seen = new Map<string, number>(); const suffixes = ["Garden Side", "Harbour End", "Market Gate", "Canal View"]; return new Map(graph.nodes.map((node) => { const base = node.name.replace(/\s+\d+$/, ""); const count = (seen.get(base) ?? 0) + 1; seen.set(base, count); return [node.id, count === 1 ? base : `${base} ${suffixes[(count - 2) % suffixes.length]}`]; })); }

function MapTrace({ map, active, className }: { map: MetroMap; active: Set<string>; className: string }): ReactNode { return <svg className={className} viewBox={`0 0 ${map.image_width} ${map.image_height}`} preserveAspectRatio="none" aria-hidden="true">{map.graph.edges.map((edge) => <polyline key={edge.id} points={edge.points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={colorFor(map.graph, edge)} strokeWidth={active.has(edge.id) ? 7 : 2.4} opacity={active.size && !active.has(edge.id) ? .12 : active.has(edge.id) ? 1 : .48} strokeLinecap="round" strokeLinejoin="round" />)}</svg>; }

function deckGeometry(curve: CatmullRomCurve3, segments: number): BufferGeometry {
  const centers = curve.getPoints(segments), profile = [[-.13,0],[.13,0],[.13,-.015],[.12,-.055],[.085,-.09],[.04,-.115],[0,-.123],[-.04,-.115],[-.085,-.09],[-.12,-.055],[-.13,-.015]];
  const vertices: number[] = [], indices: number[] = [];
  centers.forEach((center, index) => { const before = centers[Math.max(0,index-1)], after = centers[Math.min(centers.length-1,index+1)], tangent = after.clone().sub(before).setY(0).normalize(), side = new Vector3(-tangent.z,0,tangent.x); profile.forEach(([offset,drop]) => vertices.push(center.x + side.x * offset, center.y + drop, center.z + side.z * offset)); });
  for(let row=0; row<centers.length-1; row+=1) for(let col=0; col<profile.length-1; col+=1) { const a=row*profile.length+col,b=a+1,c=a+profile.length,d=c+1; indices.push(a,c,b,b,c,d); }
  const geometry=new BufferGeometry(); geometry.setAttribute("position",new Float32BufferAttribute(vertices,3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function Rail({ edge, graph, map, active }: { edge: Edge; graph: Graph; map: MetroMap; active: boolean }): ReactNode {
  const elevation=.28+edge.elevation_level*.18, curve=useMemo(() => new CatmullRomCurve3(edge.points.map((point) => world(point,map,elevation))),[edge.points,elevation,map]), segments=Math.max(24,Math.min(240,edge.points.length*2));
  const deck=useMemo(() => deckGeometry(curve,segments),[curve,segments]), rail=useMemo(() => new TubeGeometry(curve,segments,.012,6,false),[curve,segments]);
  useEffect(() => () => { deck.dispose(); rail.dispose(); },[deck,rail]); const color=colorFor(graph,edge), points=curve.getPoints(segments);
  return <group><mesh geometry={deck}><meshStandardMaterial color="#28383a" roughness={.62} metalness={.56}/></mesh><mesh geometry={rail} position={[0,.018,0]}><meshStandardMaterial color="#e1eee9" roughness={.28} metalness={.9}/></mesh><DreiLine points={points} color={color} lineWidth={active?3.3:1.45} transparent opacity={active?1:.62}/><DreiLine points={points} color={color} lineWidth={active?8:3} transparent opacity={active?.25:.08}/></group>;
}

function Strands({ map, active }: { map: MetroMap; active: Set<string> }): ReactNode { return <group>{map.graph.edges.map((edge) => <DreiLine key={edge.id} points={edge.points.map((point) => world(point,map,.012))} color={colorFor(map.graph,edge)} lineWidth={active.has(edge.id)?2.4:.85} transparent opacity={active.size&&!active.has(edge.id)?.11:active.has(edge.id)?.95:.44}/>)}</group>; }

function Plate({ imageUrl,map,photo }: { imageUrl:string;map:MetroMap;photo:boolean }): ReactNode { const texture=useTexture(imageUrl); texture.colorSpace="srgb"; const aspect=map.image_width/map.image_height,width=aspect>=1?WORLD_SIZE:WORLD_SIZE*aspect,height=aspect>=1?WORLD_SIZE/aspect:WORLD_SIZE; return <group><mesh position={[0,-.24,0]}><cylinderGeometry args={[Math.max(width,height)*.59,Math.max(width,height)*.59,.32,96]}/><meshStandardMaterial color="#dce2d2" roughness={.33}/></mesh><mesh rotation-x={-Math.PI/2} position={[0,-.06,0]}><planeGeometry args={[width,height,64,64]}/><meshStandardMaterial map={photo?texture:null} color={photo?"#fff":"#142226"} bumpMap={photo?texture:null} bumpScale={.06} roughness={.66} side={DoubleSide}/></mesh></group>; }

function Station({ node,graph,map,selected,supports,labels,name }: { node:Node;graph:Graph;map:MetroMap;selected:boolean;supports:boolean;labels:boolean;name:string }): ReactNode { const incident=graph.edges.filter((edge)=>edge.from_node_id===node.id||edge.to_node_id===node.id),level=Math.max(0,...incident.map((edge)=>edge.elevation_level)),height=.28+level*.18,radius=node.kind==="interchange"?.19:.14,roofColors=[...new Set(incident.map((edge)=>colorFor(graph,edge)))]; return <group position={world(node.position,map,height)}>{supports?[-.12,.12].map((x)=><mesh key={x} position={[x,-height/2,0]}><cylinderGeometry args={[.026,.04,height,8]}/><meshStandardMaterial color="#50635e" roughness={.8}/></mesh>):null}<mesh><boxGeometry args={[radius*3.5,.07,radius*1.9]}/><meshStandardMaterial color="#dbe6dd" roughness={.66}/></mesh>{roofColors.map((color,index)=><mesh key={color} position={[((index-(roofColors.length-1)/2)*radius*2.55/roofColors.length),.15,0]}><boxGeometry args={[radius*2.55/roofColors.length,.034,radius*1.45]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected?1.5:.7}/></mesh>)}{labels?<Html position={[0,.32,0]} center distanceFactor={9} occlude><span className="station-label">{name}</span></Html>:null}</group>; }

function Metro({ edge,map,color }: { edge?:Edge;map:MetroMap;color:string }): ReactNode { const ref=useRef<Group>(null), elevation=.43+(edge?.elevation_level??0)*.18,curve=useMemo(()=>edge?new CatmullRomCurve3(edge.points.map((point)=>world(point,map,elevation))):null,[edge,map,elevation]); useFrame(({clock})=>{if(!ref.current||!curve)return;const p=(clock.getElapsedTime()*.07)%1,at=curve.getPointAt(p),ahead=curve.getPointAt((p+.012)%1);ref.current.position.copy(at);ref.current.lookAt(ahead);}); return curve?<group ref={ref}><group rotation-y={Math.PI/2}><mesh position={[0,.075,0]}><boxGeometry args={[.52,.16,.22]}/><meshStandardMaterial color="#eef2e9" metalness={.62} roughness={.28}/></mesh><mesh position={[0,.105,.116]}><boxGeometry args={[.36,.07,.014]}/><meshStandardMaterial color="#123c4c" emissive="#20bcd1" emissiveIntensity={.6}/></mesh><mesh position={[-.18,.075,.123]}><boxGeometry args={[.06,.12,.014]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.8}/></mesh><mesh position={[.18,.075,.123]}><boxGeometry args={[.06,.12,.014]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.8}/></mesh></group></group>:null; }

function MetroWorld({ map,route,imageUrl,mode,layers,names }: { map:MetroMap;route:Route|null;imageUrl:string;mode:CameraMode;layers:Layers;names:Map<string,string> }): ReactNode { const active=new Set(route?.edge_ids??[]),first=map.graph.edges.find((edge)=>active.has(edge.id))??map.graph.edges[0],camera=mode==="top"?[0,12,.01]:mode==="cinematic"?[9,5.5,9]:[8,6,8]; return <Canvas key={mode} shadows dpr={[1,1.5]} camera={{position:camera as [number,number,number],fov:44}}><color attach="background" args={["#061014"]}/><fog attach="fog" args={["#061014",10,21]}/><ambientLight intensity={1.25}/><directionalLight position={[5,10,4]} intensity={2.7}/><Suspense fallback={null}><Plate imageUrl={imageUrl} map={map} photo={layers.photo}/></Suspense>{layers.strands?<Strands map={map} active={active}/>:null}{layers.tracks?map.graph.edges.map((edge)=><Rail key={edge.id} edge={edge} graph={map.graph} map={map} active={active.has(edge.id)}/>):null}{map.graph.nodes.filter((node)=>node.kind==="interchange"?layers.interchanges:layers.stations).map((node)=><Station key={node.id} node={node} graph={map.graph} map={map} selected={route?.node_ids.includes(node.id)??false} supports={layers.supports} labels={layers.labels} name={names.get(node.id)??node.name}/>) }{layers.trains?<Metro edge={first} map={map} color={first?colorFor(map.graph,first):"#1dc5d2"}/>:null}<OrbitControls makeDefault enableDamping target={[0,0,0]} maxPolarAngle={Math.PI/2.05} minDistance={4} maxDistance={20}/></Canvas>; }

function Preview({ kind,map,imageUrl,active,onClose }: { kind:PreviewKind;map:MetroMap;imageUrl:string;active:Set<string>;onClose:()=>void }): ReactNode { if(!kind)return null;const title=kind==="source"?"Source image and chosen metro paths":kind==="skeleton"?"All detected idiyappam strands":"Metro paths chosen from the noodle";return <div className="preview-backdrop" role="presentation" onMouseDown={onClose}><section className="preview-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event)=>event.stopPropagation()}><header><div><p className="panel-kicker">NMRL EVIDENCE VIEWER</p><h2>{title}</h2></div><button aria-label="Close image preview" onClick={onClose}>×</button></header><div className="preview-canvas">{kind==="skeleton"&&map.skeleton_available?<img src={`/backend/api/maps/${map.id}/artifacts/skeleton`} alt="All detected idiyappam strands"/>:kind==="skeleton"?<p>Raw strand artifact is unavailable for this earlier saved map.</p>:<div style={{position:"relative",display:"inline-block",maxWidth:"100%",maxHeight:"65dvh",lineHeight:0}}><img src={imageUrl} alt="Source idiyappam" style={{display:"block",maxWidth:"100%",maxHeight:"65dvh",objectFit:"contain"}}/><MapTrace map={map} active={active} className="preview-trace"/></div>}</div><p>Each coloured trace uses the original image coordinates.</p></section></div>; }

function LayersPanel({ map,imageUrl,active,layers,onLayer,onPreview }: { map:MetroMap;imageUrl:string;active:Set<string>;layers:Layers;onLayer:(key:LayerKey)=>void;onPreview:(kind:PreviewKind)=>void }): ReactNode { return <aside className="layers-panel"><p className="panel-kicker">NMRL / MAP {map.id.slice(0,8)}</p><h2>Map layers</h2><div className="layer-active">◈ <span>NoolVerse live map</span><b>Balanced</b></div><div className="layer-list">{LAYERS.map(([key,label,hint])=><label className="layer-row" key={key}><input type="checkbox" checked={layers[key]} onChange={()=>onLayer(key)}/><span><strong>{label}</strong><small>{hint}</small></span></label>)}</div><div className="evidence-grid"><button className="source-thumb evidence-button" style={{backgroundImage:`url(${imageUrl})`}} onClick={()=>onPreview("source")}><MapTrace map={map} active={active} className="source-trace"/><span>Source + chosen paths</span></button><button className="evidence-button skeleton-preview" onClick={()=>onPreview("skeleton")}>{map.skeleton_available?<img src={`/backend/api/maps/${map.id}/artifacts/skeleton`} alt=""/>:<span>Raw strands unavailable</span>}<b>All strands</b></button><button className="evidence-button used-skeleton" onClick={()=>onPreview("paths")}><MapTrace map={map} active={active} className="used-trace"/><b>Used metro paths</b></button></div><p className="source-copy">Click an evidence card to inspect source-aligned paths.</p></aside>; }

function Journey({ map,route,origin,destination,onOrigin,onDestination,onPlan,names }: { map:MetroMap;route:Route|null;origin:string;destination:string;onOrigin:(id:string)=>void;onDestination:(id:string)=>void;onPlan:()=>void;names:Map<string,string> }): ReactNode { const status=route?.status==="no_route"?route.warning??"No noodle-supported journey joins these stations.":"Choose two stations to light the noodle.";return <aside className="journey-panel"><p className="panel-kicker">NMRL JOURNEY PLANNER</p><h2>Where are we unnecessarily going?</h2><label>From<select value={origin} onChange={(event)=>onOrigin(event.target.value)}>{map.graph.nodes.map((node)=><option key={node.id} value={node.id}>{names.get(node.id)}</option>)}</select></label><label>To<select value={destination} onChange={(event)=>onDestination(event.target.value)}>{map.graph.nodes.map((node)=><option key={node.id} value={node.id}>{names.get(node.id)}</option>)}</select></label><button className="route-button" onClick={onPlan}>Show selected journey <span>→</span></button><div className="journey-card"><p>Suggested journey</p>{route?.status==="ok"?<><strong>{Math.round(route.total_length_px)} noodle-centimetres</strong><ol className="journey-timeline">{route.node_ids.map((id,index)=><li key={id}><i/><span><strong>{names.get(id)}</strong><small>{index===0?"Board the Nool Express":index===route.node_ids.length-1?"Arrive mildly overcooked":"Continue through this station"}</small></span></li>)}</ol></>:<small>{status}</small>}</div><ServiceBoard graph={map.graph} names={names}/></aside>; }

export default function HomePage({ initialMapId }: { initialMapId?: string }): ReactNode {
  const [map, setMap] = useState<MetroMap | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [message, setMessage] = useState("Upload a top-down idiyappam photo to open NoolVerse.");
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  const [preview, setPreview] = useState<PreviewKind>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [revealStage, setRevealStage] = useState<"skeleton" | "tracks" | null>(null);

  const open = useCallback(async (id: string) => {
    const response = await fetch(`/backend/api/maps/${id}`);
    const value = await response.json() as MetroMap;
    if (!response.ok) throw new Error("Saved map unavailable");
    setMap(value);
    setRoute(null);
    setOrigin(value.graph.nodes[0]?.id ?? "");
    setDestination(value.graph.nodes[1]?.id ?? value.graph.nodes[0]?.id ?? "");
  }, []);

  const upload = useCallback(async (file: File) => {
    setPendingImage(URL.createObjectURL(file));
    setMessage("Input received. OpenCV is looking for actual noodle paths…");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/backend/api/maps", { method: "POST", body });
      const data = await response.json() as { id?: string; message?: string };
      if (!response.ok || !data.id) throw new Error(data.message ?? "Map creation failed");
      await open(data.id);
      setRevealStage("skeleton");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Processing failed");
      setPendingImage(null);
    }
  }, [open]);

  const useDemo = useCallback(async () => {
    setMessage("Loading the NMRL demonstration breakfast…");
    const response = await fetch("/demo/idiyappam-demo.png");
    const image = await response.blob();
    await upload(new File([image], "idiyappam-demo.png", { type: "image/png" }));
  }, [upload]);

  useEffect(() => { if (initialMapId) void open(initialMapId); }, [initialMapId, open]);
  useEffect(() => {
    if (!map || !revealStage) return;
    const delay = revealStage === "skeleton" ? 1050 : 950;
    const timer = window.setTimeout(() => setRevealStage(revealStage === "skeleton" ? "tracks" : null), delay);
    return () => window.clearTimeout(timer);
  }, [map, revealStage]);
  useEffect(() => { const saved = window.localStorage.getItem("nmrl-layers"); if (saved) try { setLayers({ ...DEFAULT_LAYERS, ...JSON.parse(saved) as Partial<Layers> }); } catch {} }, []);
  useEffect(() => { window.localStorage.setItem("nmrl-layers", JSON.stringify(layers)); }, [layers]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);

  const plan = useCallback(async () => {
    if (!map) return;
    try {
      const response = await fetch(`/backend/api/maps/${map.id}/route`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin_id: origin, destination_id: destination }) });
      const value = await response.json() as Route;
      if (!response.ok) throw new Error(value.warning ?? "Journey planning failed");
      setRoute(value);
    } catch (error) {
      setRoute({ status: "no_route", node_ids: [], edge_ids: [], total_length_px: 0, warning: error instanceof Error ? error.message : "Journey planning failed" });
    }
  }, [destination, map, origin]);

  if (!map) return <LandingPage message={message} pendingImage={pendingImage} onUpload={(file) => void upload(file)} onDemo={() => void useDemo()} />;

  if (revealStage) return <ProcessingReveal map={map} stage={revealStage} />;
  const active = new Set(route?.edge_ids ?? []), imageUrl = `/backend/api/maps/${map.id}/image`, names = namesFor(map.graph), toggle = (key: LayerKey) => setLayers((current) => ({ ...current, [key]: !current[key] }));
  return <main className="control-room"><header className="topbar"><div className="brand-mark">≋</div><div><p className="wordmark">NOOLU PIDICHAAL MATHI <span>· NMRL</span></p><p className="brand-tagline">Vazhi ariyille? Noolu pidichaal mathi.</p></div><p className="system-status"><span />NMRL services needlessly operational</p></header><section className="explorer-shell"><LayersPanel map={map} imageUrl={imageUrl} active={active} layers={layers} onLayer={toggle} onPreview={setPreview} /><div className="world-panel"><div className="world-heading"><div><p className="eyebrow">NOOLU METRO RAIL LIMITED</p><h2>NoolVerse operations map</h2></div><div className="view-tabs"><button className={mode === "orbit" ? "active" : ""} onClick={() => setMode("orbit")}>Orbit</button><button className={mode === "top" ? "active" : ""} onClick={() => setMode("top")}>Top view</button><button className={mode === "cinematic" ? "active" : ""} onClick={() => setMode("cinematic")}>Cinematic</button></div></div><div className="world-canvas"><MetroWorld map={map} route={route} imageUrl={imageUrl} mode={mode} layers={layers} names={names} /></div><footer className="world-footer"><span>Tracks follow visible noodle geometry</span><span>Crossings are inferred</span></footer></div><Journey map={map} route={route} origin={origin} destination={destination} onOrigin={(id) => { setOrigin(id); setRoute(null); }} onDestination={(id) => { setDestination(id); setRoute(null); }} onPlan={() => void plan()} names={names} /></section><Preview kind={preview} map={map} imageUrl={imageUrl} active={active} onClose={() => setPreview(null)} /></main>;
}
