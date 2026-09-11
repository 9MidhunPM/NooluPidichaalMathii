"""Deterministic graph extraction from one-pixel visible noodle paths."""

from collections import deque
from dataclasses import dataclass
from math import hypot

import numpy as np

from app.contracts import ImagePoint
from app.skeleton import SkeletonResult

Pixel = tuple[int, int]


class TopologyError(ValueError):
    """A safe reason why a skeleton cannot become a usable metro graph."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class TopologyNode:
    """A clustered endpoint or junction candidate in image coordinates."""

    id: str
    position: ImagePoint
    degree: int


@dataclass(frozen=True, slots=True)
class TopologyEdge:
    """A visible ordered skeleton path between two logical topology nodes."""

    id: str
    from_node_id: str
    to_node_id: str
    points: tuple[ImagePoint, ...]
    visible_length_px: float


@dataclass(frozen=True, slots=True)
class TopologyGraph:
    """Visible topology before metro names, lines, and service semantics exist."""

    nodes: tuple[TopologyNode, ...]
    edges: tuple[TopologyEdge, ...]


def extract_graph(skeleton: SkeletonResult) -> TopologyGraph:
    """Cluster skeleton endpoints/junctions and trace every edge exactly once."""
    pixels = skeleton.pixels
    candidate_pixels = {
        pixel
        for pixel in _foreground_pixels(pixels)
        if _neighbor_count(pixel, pixels) != 2
    }
    if not candidate_pixels:
        raise TopologyError(
            "graph_no_topology_nodes",
            "The visible noodle paths need at least one endpoint or junction to map.",
        )

    clusters = _candidate_clusters(candidate_pixels)
    pixel_node_ids: dict[Pixel, str] = {}
    nodes: list[TopologyNode] = []
    for index, cluster in enumerate(clusters, start=1):
        node_id = f"node-{index}"
        for pixel in cluster:
            pixel_node_ids[pixel] = node_id
        nodes.append(
            TopologyNode(
                id=node_id,
                position=_cluster_position(cluster),
                degree=max(_neighbor_count(pixel, pixels) for pixel in cluster),
            )
        )

    visited_links: set[frozenset[Pixel]] = set()
    edges: list[TopologyEdge] = []
    for start_pixel in sorted(candidate_pixels):
        for next_pixel in _neighbors(start_pixel, pixels):
            link = frozenset((start_pixel, next_pixel))
            if link in visited_links:
                continue

            path = _trace_path(
                start_pixel,
                next_pixel,
                pixels,
                candidate_pixels,
                visited_links,
            )
            end_pixel = path[-1]
            from_node_id = pixel_node_ids[start_pixel]
            to_node_id = pixel_node_ids[end_pixel]
            if from_node_id == to_node_id:
                continue
            points = tuple(ImagePoint(x=x, y=y) for y, x in path)
            edges.append(
                TopologyEdge(
                    id=f"edge-{len(edges) + 1}",
                    from_node_id=from_node_id,
                    to_node_id=to_node_id,
                    points=points,
                    visible_length_px=_path_length(path),
                )
            )

    if not edges:
        raise TopologyError(
            "graph_no_visible_edges",
            "The visible noodle paths do not form a route between stations.",
        )

    return TopologyGraph(nodes=tuple(nodes), edges=tuple(edges))


def _foreground_pixels(pixels: np.ndarray) -> set[Pixel]:
    return {(int(y), int(x)) for y, x in np.argwhere(pixels)}


def _neighbors(pixel: Pixel, pixels: np.ndarray) -> tuple[Pixel, ...]:
    y, x = pixel
    height, width = pixels.shape
    neighbors: list[Pixel] = []
    for neighbor_y in range(max(0, y - 1), min(height, y + 2)):
        for neighbor_x in range(max(0, x - 1), min(width, x + 2)):
            if (neighbor_y, neighbor_x) != pixel and pixels[neighbor_y, neighbor_x]:
                neighbors.append((neighbor_y, neighbor_x))
    return tuple(sorted(neighbors))


def _neighbor_count(pixel: Pixel, pixels: np.ndarray) -> int:
    return len(_neighbors(pixel, pixels))


def _candidate_clusters(candidate_pixels: set[Pixel]) -> tuple[tuple[Pixel, ...], ...]:
    remaining = set(candidate_pixels)
    clusters: list[tuple[Pixel, ...]] = []
    while remaining:
        initial = min(remaining)
        queue = deque((initial,))
        cluster: set[Pixel] = set()
        remaining.remove(initial)
        while queue:
            pixel = queue.popleft()
            cluster.add(pixel)
            y, x = pixel
            adjacent = {
                (neighbor_y, neighbor_x)
                for neighbor_y in range(y - 1, y + 2)
                for neighbor_x in range(x - 1, x + 2)
                if (neighbor_y, neighbor_x) in remaining
            }
            for neighbor in sorted(adjacent):
                remaining.remove(neighbor)
                queue.append(neighbor)
        clusters.append(tuple(sorted(cluster)))
    return tuple(sorted(clusters, key=lambda cluster: cluster[0]))


def _cluster_position(cluster: tuple[Pixel, ...]) -> ImagePoint:
    y_total = sum(y for y, _ in cluster)
    x_total = sum(x for _, x in cluster)
    return ImagePoint(x=x_total / len(cluster), y=y_total / len(cluster))


def _trace_path(
    start_pixel: Pixel,
    next_pixel: Pixel,
    pixels: np.ndarray,
    candidate_pixels: set[Pixel],
    visited_links: set[frozenset[Pixel]],
) -> tuple[Pixel, ...]:
    path = [start_pixel]
    previous = start_pixel
    current = next_pixel
    visited_links.add(frozenset((previous, current)))

    while current not in candidate_pixels:
        path.append(current)
        onward = [
            neighbor for neighbor in _neighbors(current, pixels) if neighbor != previous
        ]
        if len(onward) != 1:
            raise TopologyError(
                "graph_ambiguous_trace",
                "The visible noodle paths need a clearer top-down photo to map.",
            )
        following = onward[0]
        visited_links.add(frozenset((current, following)))
        previous, current = current, following

    path.append(current)
    return tuple(path)


def _path_length(path: tuple[Pixel, ...]) -> float:
    return sum(
        hypot(next_x - current_x, next_y - current_y)
        for (current_y, current_x), (next_y, next_x) in zip(path, path[1:])
    )
