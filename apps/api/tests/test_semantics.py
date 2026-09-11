import numpy as np
import pytest

from app.contracts import MetroGraph
from app.semantics import assign_metro_semantics
from app.skeleton import SkeletonResult
from app.topology import extract_graph


def a_line_topology():
    pixels = np.zeros((9, 12), dtype=bool)
    pixels[4, 2:9] = True
    return extract_graph(SkeletonResult(pixels=pixels))


def test_assign_metro_semantics_creates_a_contract_valid_graph() -> None:
    graph = assign_metro_semantics(a_line_topology(), seed=0)

    assert isinstance(graph, MetroGraph)
    assert [node.name for node in graph.nodes] == ["Coconut Junction", "Curry Sector"]
    assert [node.kind for node in graph.nodes] == ["terminal", "terminal"]
    assert graph.lines[0].name == "Nool Express"
    assert graph.edges[0].line_id == graph.lines[0].id
    assert graph.edges[0].component_id == "component-1"


def test_assign_metro_semantics_is_stable_for_the_same_seed() -> None:
    topology = a_line_topology()

    assert assign_metro_semantics(topology, seed=4) == assign_metro_semantics(
        topology,
        seed=4,
    )


def test_assign_metro_semantics_rejects_negative_seeds() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        assign_metro_semantics(a_line_topology(), seed=-1)
