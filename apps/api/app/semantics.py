"""Deterministic metro labels and line assignments for visible topology."""

from collections import defaultdict, deque

from app.contracts import MetroEdge, MetroGraph, MetroLine, MetroNode, NodeKind
from app.topology import TopologyGraph

LINE_COLORS = ("#00D9FF", "#FF6B6B", "#F6C453", "#74D99F", "#A78BFA")
LINE_NAMES = (
    "Nool Express",
    "Chutney Changeover",
    "Steam Engine, No Engine",
    "Gravy Train",
    "The Last Strand",
)
STATION_NAMES = (
    "Thiruvanantha-Puttu Central",
    "Kozhi-Code Red Chutney",
    "Thrissur Pooram of Porotta",
    "Kollam, Let's Roll-appam",
    "Kannur Kneadn't Wait",
    "Malappuram Masala Junction",
    "Palakkad Pal-appam Pass",
    "Alappuzha All-Appam Aboard",
)
STATION_QUALIFIERS = (
    "Platform",
    "Garden Side",
    "Market Gate",
    "Harbour End",
    "Canal View",
    "Banana Leaf Side",
    "Morning Shift",
    "Last Noodle Stop",
)


def assign_metro_semantics(topology: TopologyGraph, seed: int) -> MetroGraph:
    """Create a stable, fully validated metro graph from visible topology."""
    if seed < 0:
        raise ValueError("visual seed must be non-negative")

    component_by_node = _components(topology)
    line_by_edge, line_definitions = _assign_lines(topology, component_by_node)

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
            line_id=line_by_edge[edge.id],
            elevation_level=line_definitions[line_by_edge[edge.id]][1],
        )
        for edge in topology.edges
    ]
    graph_lines = [
        MetroLine(
            id=line_id,
            name=_line_name(index, seed),
            color=LINE_COLORS[(seed + index) % len(LINE_COLORS)],
            elevation_level=elevation_level,
            service_status="active",
            edge_ids=edge_ids,
        )
        for index, (line_id, (edge_ids, elevation_level)) in enumerate(
            sorted(line_definitions.items()),
        )
    ]
    return MetroGraph(nodes=graph_nodes, edges=graph_edges, lines=graph_lines)


def _assign_lines(
    topology: TopologyGraph, component_by_node: dict[str, str]
) -> tuple[dict[str, str], dict[str, tuple[list[str], int]]]:
    """Group a dense curated graph into a small palette of readable services."""
    edges_by_component: dict[str, list[str]] = defaultdict(list)
    for edge in topology.edges:
        edges_by_component[component_by_node[edge.from_node_id]].append(edge.id)

    edge_by_id = {edge.id: edge for edge in topology.edges}
    line_by_edge: dict[str, str] = {}
    line_definitions: dict[str, tuple[list[str], int]] = {}
    line_index = 0
    for component_id in sorted(edges_by_component):
        remaining = set(edges_by_component[component_id])
        adjacency: dict[str, list[str]] = defaultdict(list)
        for edge_id in remaining:
            edge = edge_by_id[edge_id]
            adjacency[edge.from_node_id].append(edge_id)
            adjacency[edge.to_node_id].append(edge_id)
        while remaining:
            # A service is grown through connected edges, never by unrelated ID order.
            queue = deque((min(remaining),))
            assigned: list[str] = []
            while queue and len(assigned) < 5:
                edge_id = queue.popleft()
                if edge_id not in remaining:
                    continue
                remaining.remove(edge_id)
                assigned.append(edge_id)
                edge = edge_by_id[edge_id]
                for node_id in (edge.from_node_id, edge.to_node_id):
                    queue.extend(
                        candidate
                        for candidate in sorted(adjacency[node_id])
                        if candidate in remaining
                    )
            line_index += 1
            line_id = f"line-{line_index}"
            line_definitions[line_id] = (assigned, (line_index - 1) % 3)
            line_by_edge.update({edge_id: line_id for edge_id in assigned})
    return line_by_edge, line_definitions


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
    return _unique_display_name(STATION_NAMES, index, seed)


def _line_name(index: int, seed: int) -> str:
    return _unique_display_name(LINE_NAMES, index, seed)


def _unique_display_name(names: tuple[str, ...], index: int, seed: int) -> str:
    """Return a deterministic, collision-safe display name for a map."""
    base = names[(seed + index) % len(names)]
    cycle = index // len(names)
    if cycle == 0:
        return base
    words: list[str] = []
    while cycle:
        cycle, digit = divmod(cycle - 1, len(STATION_QUALIFIERS))
        words.append(STATION_QUALIFIERS[digit])
    return f"{base} {' / '.join(reversed(words))}"
