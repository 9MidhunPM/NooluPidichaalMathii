"""Deterministic shortest-path routing over persisted metro graphs."""

from dataclasses import dataclass
from heapq import heappop, heappush

from app.contracts import MetroGraph


@dataclass(frozen=True, slots=True)
class RouteResult:
    """A successful route or an explicit no-route outcome."""

    status: str
    node_ids: tuple[str, ...]
    edge_ids: tuple[str, ...]
    total_length_px: float
    warning: str | None = None


def find_route(graph: MetroGraph, origin_id: str, destination_id: str) -> RouteResult:
    """Find the shortest active visible route, without inventing connectivity."""
    node_ids = {node.id for node in graph.nodes}
    if origin_id not in node_ids or destination_id not in node_ids:
        return RouteResult("no_route", (), (), 0, "Choose stations from this map.")
    if origin_id == destination_id:
        return RouteResult("ok", (origin_id,), (), 0)

    adjacency: dict[str, list[tuple[str, str, float]]] = {
        node_id: [] for node_id in node_ids
    }
    for edge in graph.edges:
        if edge.service_status != "active":
            continue
        adjacency[edge.from_node_id].append(
            (edge.to_node_id, edge.id, edge.visible_length_px)
        )
        adjacency[edge.to_node_id].append(
            (edge.from_node_id, edge.id, edge.visible_length_px)
        )

    queue: list[tuple[float, str, tuple[str, ...], tuple[str, ...]]] = [
        (0, origin_id, (origin_id,), ())
    ]
    visited: set[str] = set()
    while queue:
        cost, node_id, route_nodes, route_edges = heappop(queue)
        if node_id in visited:
            continue
        visited.add(node_id)
        if node_id == destination_id:
            return RouteResult("ok", route_nodes, route_edges, cost)
        for neighbor_id, edge_id, length in sorted(adjacency[node_id]):
            if neighbor_id not in visited:
                heappush(
                    queue,
                    (
                        cost + length,
                        neighbor_id,
                        route_nodes + (neighbor_id,),
                        route_edges + (edge_id,),
                    ),
                )

    return RouteResult(
        "no_route",
        (),
        (),
        0,
        "These visible noodle paths do not connect those stations.",
    )
