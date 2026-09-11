"""Deterministic metro labels and line assignments for visible topology."""

from collections import defaultdict, deque

from app.contracts import MetroEdge, MetroGraph, MetroLine, MetroNode, NodeKind
from app.topology import TopologyGraph

LINE_COLORS = ("#00D9FF", "#FF6B6B", "#F6C453", "#74D99F", "#A78BFA")
LINE_NAMES = (
    "Nool Express",
    "Coconut Connector",
    "Curry Circular",
    "Chutney Link",
    "Steam Service",
)
STATION_NAMES = (
    "Coconut Junction",
    "Curry Sector",
    "Puttu Point",
    "Sambar Square",
    "Chutney Crossing",
    "Appam Annex",
    "Kattan Terminal",
    "Banana Leaf Bay",
)


def assign_metro_semantics(topology: TopologyGraph, seed: int) -> MetroGraph:
    """Create a stable, fully validated metro graph from visible topology."""
    if seed < 0:
        raise ValueError("visual seed must be non-negative")

    component_by_node = _components(topology)
    components = tuple(sorted(set(component_by_node.values())))
    line_by_component = {
        component_id: f"line-{index}"
        for index, component_id in enumerate(components, start=1)
    }
    edges_by_component: dict[str, list[str]] = defaultdict(list)
    for edge in topology.edges:
        edges_by_component[component_by_node[edge.from_node_id]].append(edge.id)

    graph_nodes = [
        MetroNode(
            id=node.id,
            kind=_node_kind(node.degree),
            name=_station_name(index, seed),
            position=node.position,
            confidence=_node_confidence(node.degree),
            component_id=component_by_node[node.id],
            service_status="active",
        )
        for index, node in enumerate(topology.nodes)
    ]
    graph_edges = [
        MetroEdge(
            id=edge.id,
            from_node_id=edge.from_node_id,
            to_node_id=edge.to_node_id,
            points=list(edge.points),
            visible_length_px=edge.visible_length_px,
            component_id=component_by_node[edge.from_node_id],
            confidence=0.8,
            service_status="active",
            line_id=line_by_component[component_by_node[edge.from_node_id]],
            elevation_level=0,
        )
        for edge in topology.edges
    ]
    graph_lines = [
        MetroLine(
            id=line_by_component[component_id],
            name=_line_name(index, seed),
            color=LINE_COLORS[(seed + index) % len(LINE_COLORS)],
            elevation_level=0,
            service_status="active",
            edge_ids=sorted(edges_by_component[component_id]),
        )
        for index, component_id in enumerate(components)
    ]
    return MetroGraph(nodes=graph_nodes, edges=graph_edges, lines=graph_lines)


def _components(topology: TopologyGraph) -> dict[str, str]:
    adjacency: dict[str, set[str]] = {node.id: set() for node in topology.nodes}
    for edge in topology.edges:
        adjacency[edge.from_node_id].add(edge.to_node_id)
        adjacency[edge.to_node_id].add(edge.from_node_id)

    component_by_node: dict[str, str] = {}
    component_index = 0
    for node_id in sorted(adjacency):
        if node_id in component_by_node:
            continue
        component_index += 1
        component_id = f"component-{component_index}"
        queue = deque((node_id,))
        component_by_node[node_id] = component_id
        while queue:
            current = queue.popleft()
            for neighbor in sorted(adjacency[current]):
                if neighbor not in component_by_node:
                    component_by_node[neighbor] = component_id
                    queue.append(neighbor)
    return component_by_node


def _node_kind(degree: int) -> NodeKind:
    if degree == 1:
        return "terminal"
    if degree >= 3:
        return "interchange"
    return "station"


def _node_confidence(degree: int) -> float:
    if degree >= 3:
        return 0.7
    if degree == 1:
        return 0.95
    return 0.8


def _station_name(index: int, seed: int) -> str:
    return STATION_NAMES[(seed + index) % len(STATION_NAMES)]


def _line_name(index: int, seed: int) -> str:
    return LINE_NAMES[(seed + index) % len(LINE_NAMES)]
