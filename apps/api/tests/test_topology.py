import numpy as np
import pytest

from app.skeleton import SkeletonResult
from app.topology import TopologyError, extract_graph


def test_extract_graph_traces_one_visible_line_between_endpoints() -> None:
    pixels = np.zeros((9, 12), dtype=bool)
    pixels[4, 2:9] = True

    graph = extract_graph(SkeletonResult(pixels=pixels))

    assert [node.id for node in graph.nodes] == ["node-1", "node-2"]
    assert [(node.position.x, node.position.y) for node in graph.nodes] == [
        (2, 4),
        (8, 4),
    ]
    assert len(graph.edges) == 1
    assert graph.edges[0].from_node_id == "node-1"
    assert graph.edges[0].to_node_id == "node-2"
    assert len(graph.edges[0].points) == 7
    assert graph.edges[0].visible_length_px == 6


def test_extract_graph_clusters_a_crossing_into_one_junction_node() -> None:
    pixels = np.zeros((11, 11), dtype=bool)
    pixels[5, 2:9] = True
    pixels[2:9, 5] = True

    graph = extract_graph(SkeletonResult(pixels=pixels))

    assert len(graph.nodes) == 5
    assert len(graph.edges) == 4
    assert len([node for node in graph.nodes if node.degree >= 3]) == 1
    assert {edge.from_node_id for edge in graph.edges} | {
        edge.to_node_id for edge in graph.edges
    } == {node.id for node in graph.nodes}


def test_extract_graph_rejects_a_loop_without_a_visible_route() -> None:
    pixels = np.zeros((8, 8), dtype=bool)
    pixels[2, 2:6] = True
    pixels[5, 2:6] = True
    pixels[2:6, 2] = True
    pixels[2:6, 5] = True

    with pytest.raises(TopologyError, match="do not form a route") as error:
        extract_graph(SkeletonResult(pixels=pixels))

    assert error.value.code == "graph_no_visible_edges"


def test_extract_graph_curates_a_dense_visible_component() -> None:
    pixels = np.zeros((80, 80), dtype=bool)
    for coordinate in range(5, 75, 6):
        pixels[coordinate, 5:75] = True
        pixels[5:75, coordinate] = True

    graph = extract_graph(SkeletonResult(pixels=pixels))

    assert len(graph.nodes) == 10
    assert len(graph.edges) == 9
    assert max(len(edge.points) for edge in graph.edges) < 80
