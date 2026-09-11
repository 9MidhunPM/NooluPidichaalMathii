import pytest
from pydantic import ValidationError

from app.contracts import MetroGraph


def valid_graph() -> dict[str, object]:
    return {
        "schema_version": 1,
        "nodes": [
            {
                "id": "station-a",
                "kind": "terminal",
                "position": {"x": 10, "y": 20},
                "confidence": 0.9,
                "component_id": "component-1",
                "service_status": "active",
            },
            {
                "id": "station-b",
                "kind": "station",
                "position": {"x": 30, "y": 20},
                "confidence": 0.8,
                "component_id": "component-1",
                "service_status": "active",
            },
        ],
        "edges": [
            {
                "id": "edge-1",
                "from_node_id": "station-a",
                "to_node_id": "station-b",
                "points": [{"x": 10, "y": 20}, {"x": 30, "y": 20}],
                "visible_length_px": 20,
                "component_id": "component-1",
                "confidence": 0.9,
                "service_status": "active",
                "line_id": "line-1",
                "elevation_level": 0,
            }
        ],
        "lines": [
            {
                "id": "line-1",
                "name": "Nool Express",
                "color": "#00D9FF",
                "elevation_level": 0,
                "service_status": "active",
                "edge_ids": ["edge-1"],
            }
        ],
    }


def test_graph_contract_accepts_consistent_references() -> None:
    graph = MetroGraph.model_validate(valid_graph())

    assert graph.schema_version == 1
    assert graph.edges[0].points[0].x == 10


def test_graph_contract_rejects_unknown_edge_node() -> None:
    graph = valid_graph()
    edges = graph["edges"]
    assert isinstance(edges, list)
    edge = edges[0]
    assert isinstance(edge, dict)
    edge["from_node_id"] = "missing-station"

    with pytest.raises(ValidationError, match="unknown node"):
        MetroGraph.model_validate(graph)


def test_graph_contract_rejects_unknown_schema_version() -> None:
    graph = valid_graph()
    graph["schema_version"] = 2

    with pytest.raises(ValidationError):
        MetroGraph.model_validate(graph)
