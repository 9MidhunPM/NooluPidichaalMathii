"""Deterministic graph extraction from one-pixel visible noodle paths."""

from collections import deque
from dataclasses import dataclass
from math import hypot

import cv2
import numpy as np

from app.contracts import ImagePoint
from app.skeleton import SkeletonResult

Pixel = tuple[int, int]
MAX_RAW_TOPOLOGY_NODES = 96
CURATED_STATION_COUNT = 10


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

    graph = TopologyGraph(nodes=tuple(nodes), edges=tuple(edges))
    if len(graph.nodes) > MAX_RAW_TOPOLOGY_NODES:
        return _curate_dense_skeleton(skeleton)
    return graph


def _curate_dense_skeleton(skeleton: SkeletonResult) -> TopologyGraph:
    """Make a small, image-supported navigation graph from a dense noodle tangle."""
    component = _largest_component(skeleton.pixels)
    if len(component) < 2:
        raise TopologyError(
            "graph_no_primary_component",
            "The visible noodle paths do not form a primary network.",
        )

    anchors = _spread_anchors(component, min(CURATED_STATION_COUNT, len(component)))
    paths: list[tuple[Pixel, ...]] = []
    degrees = [0 for _ in anchors]
    connected = [anchors[0]]
    for anchor_index, anchor in enumerate(anchors[1:], start=1):
        path, existing_index = _shortest_path_to_any(anchor, connected, component)
        paths.append(path)
        degrees[anchor_index] += 1
        degrees[existing_index] += 1
        connected.append(anchor)

    nodes = tuple(
        TopologyNode(
            id=f"node-{index}",
            position=ImagePoint(x=pixel[1], y=pixel[0]),
            degree=degrees[index - 1],
        )
        for index, pixel in enumerate(anchors, start=1)
    )
    edges = tuple(
        TopologyEdge(
            id=f"edge-{index}",
            from_node_id=f"node-{existing_anchor + 1}",
            to_node_id=f"node-{index + 1}",
            points=tuple(ImagePoint(x=x, y=y) for y, x in _simplify_path(path)),
            visible_length_px=_path_length(path),
        )
        for index, (path, existing_anchor) in enumerate(
            (
                (path, _nearest_anchor_index(path[-1], anchors[:edge_index]))
                for edge_index, path in enumerate(paths, start=1)
            ),
            start=1,
        )
    )
    return TopologyGraph(nodes=nodes, edges=edges)


def _largest_component(pixels: np.ndarray) -> set[Pixel]:
    remaining = _foreground_pixels(pixels)
    largest: set[Pixel] = set()
    while remaining:
        start = min(remaining)
        component = {start}
        queue = deque((start,))
        remaining.remove(start)
        while queue:
            pixel = queue.popleft()
            for neighbor in _neighbors(pixel, pixels):
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    queue.append(neighbor)
        if len(component) > len(largest):
            largest = component
    return largest


def _spread_anchors(component: set[Pixel], count: int) -> list[Pixel]:
    """Choose stable source points that cover the visible primary component."""
    ordered = sorted(component)
    centre_y = sum(y for y, _ in ordered) / len(ordered)
    centre_x = sum(x for _, x in ordered) / len(ordered)
    anchors = [
        min(
            ordered,
            key=lambda pixel: (pixel[0] - centre_y) ** 2
            + (pixel[1] - centre_x) ** 2,
        )
    ]
    while len(anchors) < count:
        anchors.append(
            max(
                ordered,
                key=lambda pixel: min(
                    (pixel[0] - anchor[0]) ** 2 + (pixel[1] - anchor[1]) ** 2
                    for anchor in anchors
                ),
            )
        )
    return anchors


def _shortest_path_to_any(
    start: Pixel, targets: list[Pixel], component: set[Pixel]
) -> tuple[tuple[Pixel, ...], int]:
    target_indices = {pixel: index for index, pixel in enumerate(targets)}
    queue = deque((start,))
    previous: dict[Pixel, Pixel | None] = {start: None}
    while queue:
        current = queue.popleft()
        if current in target_indices:
            path = [current]
            while previous[path[-1]] is not None:
                parent = previous[path[-1]]
                assert parent is not None
                path.append(parent)
            return tuple(reversed(path)), target_indices[current]
        y, x = current
        for neighbor_y in range(y - 1, y + 2):
            for neighbor_x in range(x - 1, x + 2):
                neighbor = (neighbor_y, neighbor_x)
                if neighbor in component and neighbor not in previous:
                    previous[neighbor] = current
                    queue.append(neighbor)
    raise TopologyError(
        "graph_disconnected", "The visible noodle paths do not connect."
    )


def _nearest_anchor_index(pixel: Pixel, anchors: list[Pixel]) -> int:
    return min(
        range(len(anchors)),
        key=lambda index: (pixel[0] - anchors[index][0]) ** 2
        + (pixel[1] - anchors[index][1]) ** 2,
    )


def _simplify_path(path: tuple[Pixel, ...]) -> tuple[Pixel, ...]:
    """Reduce render payload while staying within two source pixels of a route."""
    coordinates = np.array([(x, y) for y, x in path], dtype=np.float32).reshape(
        -1, 1, 2
    )
    simplified = cv2.approxPolyDP(coordinates, epsilon=2.0, closed=False)
    return tuple((int(y), int(x)) for x, y in simplified.reshape(-1, 2))


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
