from app.contracts import MetroGraph
from app.routing import find_route
from tests.test_contracts import valid_graph


def test_find_route_returns_the_shortest_active_path() -> None:
    graph = MetroGraph.model_validate(valid_graph())

    route = find_route(graph, "station-a", "station-b")

    assert route.status == "ok"
    assert route.node_ids == ("station-a", "station-b")
    assert route.edge_ids == ("edge-1",)
    assert route.total_length_px == 20


def test_find_route_returns_typed_no_route_for_unknown_station() -> None:
    graph = MetroGraph.model_validate(valid_graph())

    route = find_route(graph, "station-a", "missing")

    assert route.status == "no_route"
    assert route.warning == "Choose stations from this map."


def test_find_route_skips_suspended_edges() -> None:
    graph_data = valid_graph()
    edges = graph_data["edges"]
    assert isinstance(edges, list)
    assert isinstance(edges[0], dict)
    edges[0]["service_status"] = "suspended"

    route = find_route(MetroGraph.model_validate(graph_data), "station-a", "station-b")

    assert route.status == "no_route"
