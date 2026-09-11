"""Versioned public contracts for persisted metro maps."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

GraphSchemaVersion = Literal[1]
NodeKind = Literal["terminal", "station", "interchange"]
ServiceStatus = Literal["active", "suspended"]


class ImagePoint(BaseModel):
    """A finite coordinate in normalized source-image pixels."""

    model_config = ConfigDict(extra="forbid")

    x: FiniteFloat
    y: FiniteFloat


class MetroNode(BaseModel):
    """A selectable station or inferred interchange."""

    model_config = ConfigDict(extra="forbid")

    id: Annotated[str, Field(min_length=1, max_length=128)]
    kind: NodeKind
    name: Annotated[str, Field(min_length=1, max_length=128)]
    position: ImagePoint
    confidence: Annotated[float, Field(ge=0, le=1)]
    component_id: Annotated[str, Field(min_length=1, max_length=128)]
    service_status: ServiceStatus


class MetroEdge(BaseModel):
    """An ordered, visible noodle path between two graph nodes."""

    model_config = ConfigDict(extra="forbid")

    id: Annotated[str, Field(min_length=1, max_length=128)]
    from_node_id: Annotated[str, Field(min_length=1, max_length=128)]
    to_node_id: Annotated[str, Field(min_length=1, max_length=128)]
    points: Annotated[list[ImagePoint], Field(min_length=2)]
    visible_length_px: Annotated[float, Field(gt=0)]
    component_id: Annotated[str, Field(min_length=1, max_length=128)]
    confidence: Annotated[float, Field(ge=0, le=1)]
    service_status: ServiceStatus
    line_id: Annotated[str, Field(min_length=1, max_length=128)]
    elevation_level: int


class MetroLine(BaseModel):
    """A deterministic visual and routing line assignment."""

    model_config = ConfigDict(extra="forbid")

    id: Annotated[str, Field(min_length=1, max_length=128)]
    name: Annotated[str, Field(min_length=1, max_length=128)]
    color: Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]
    elevation_level: int
    service_status: ServiceStatus
    edge_ids: list[Annotated[str, Field(min_length=1, max_length=128)]]


class MetroGraph(BaseModel):
    """Schema v1 graph data returned by the map API."""

    model_config = ConfigDict(extra="forbid")

    schema_version: GraphSchemaVersion = 1
    nodes: list[MetroNode]
    edges: list[MetroEdge]
    lines: list[MetroLine]

    @model_validator(mode="after")
    def verify_references(self) -> "MetroGraph":
        node_ids = [node.id for node in self.nodes]
        edge_ids = [edge.id for edge in self.edges]
        line_ids = [line.id for line in self.lines]

        if len(node_ids) != len(set(node_ids)):
            raise ValueError("node IDs must be unique")
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("edge IDs must be unique")
        if len(line_ids) != len(set(line_ids)):
            raise ValueError("line IDs must be unique")

        known_nodes = set(node_ids)
        known_edges = set(edge_ids)
        known_lines = set(line_ids)

        for edge in self.edges:
            if (
                edge.from_node_id not in known_nodes
                or edge.to_node_id not in known_nodes
            ):
                raise ValueError(f"edge {edge.id} references an unknown node")
            if edge.line_id not in known_lines:
                raise ValueError(f"edge {edge.id} references an unknown line")

        for line in self.lines:
            if len(line.edge_ids) != len(set(line.edge_ids)):
                raise ValueError(f"line {line.id} repeats an edge")
            if unknown_edges := set(line.edge_ids) - known_edges:
                raise ValueError(
                    f"line {line.id} references unknown edges: {sorted(unknown_edges)}"
                )

        return self
