"""Single-pass deterministic image-to-metro processing orchestration."""

from dataclasses import dataclass
from hashlib import blake2b

from app.contracts import MetroGraph
from app.images import NormalizedImage, decode_and_normalize
from app.segmentation import SegmentationResult, segment
from app.semantics import assign_metro_semantics
from app.settings import ApiSettings
from app.skeleton import SkeletonResult, skeletonize
from app.topology import TopologyGraph, extract_graph

PIPELINE_VERSION = "baseline-v1"


@dataclass(frozen=True, slots=True)
class ProcessedMap:
    """All artifacts from one processing run, retained for persistence and reveal."""

    image: NormalizedImage
    segmentation: SegmentationResult
    skeleton: SkeletonResult
    topology: TopologyGraph
    graph: MetroGraph
    visual_seed: int
    pipeline_version: str = PIPELINE_VERSION


def process_image(image_data: bytes, settings: ApiSettings) -> ProcessedMap:
    """Run decoding, segmentation, skeletonization, topology, and semantics once."""
    image = decode_and_normalize(image_data, settings)
    segmentation = segment(image)
    skeleton = skeletonize(segmentation)
    topology = extract_graph(skeleton)
    visual_seed = _visual_seed(image.data)
    graph = assign_metro_semantics(topology, visual_seed)
    return ProcessedMap(
        image=image,
        segmentation=segmentation,
        skeleton=skeleton,
        topology=topology,
        graph=graph,
        visual_seed=visual_seed,
    )


def _visual_seed(normalized_image_data: bytes) -> int:
    return int.from_bytes(
        blake2b(normalized_image_data, digest_size=4).digest(),
        byteorder="big",
    )
