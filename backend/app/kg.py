"""
In-memory knowledge graph store. Loads from kg/seed.json and supports
query by keyword and subgraph extraction for explanations.
"""
from pathlib import Path
import json
from typing import Optional

from app.models import Node, Edge, GraphPayload, Citation


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def load_kg() -> tuple[list[Node], list[Edge]]:
    """Load knowledge graph from all JSON files in kg/ directory."""
    kg_dir = _project_root() / "kg"
    all_nodes: list[Node] = []
    all_edges: list[Edge] = []

    # Load all JSON files
    json_files = list(kg_dir.glob("*.json"))
    for json_file in json_files:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            nodes = [Node(**n) for n in data.get("nodes", [])]
            edges = [Edge(**e) for e in data.get("edges", [])]
            all_nodes.extend(nodes)
            all_edges.extend(edges)

    return all_nodes, all_edges


class KGStore:
    def __init__(self) -> None:
        self._nodes: list[Node] = []
        self._edges: list[Edge] = []
        self._node_by_id: dict[str, Node] = {}
        self._edges_by_source: dict[str, list[Edge]] = {}
        self._edges_by_target: dict[str, list[Edge]] = {}
        self._reload()

    def _reload(self) -> None:
        self._nodes, self._edges = load_kg()
        self._node_by_id = {n.id: n for n in self._nodes}
        self._edges_by_source = {}
        self._edges_by_target = {}
        for e in self._edges:
            self._edges_by_source.setdefault(e.source, []).append(e)
            self._edges_by_target.setdefault(e.target, []).append(e)

    def get_full_graph(self) -> GraphPayload:
        return GraphPayload(nodes=self._nodes, edges=self._edges)

    def search_nodes(self, q: str) -> list[Node]:
        q = (q or "").strip().lower()
        if not q:
            return []
        out: list[Node] = []
        for n in self._nodes:
            if q in n.label.lower():
                out.append(n)
                continue
            for v in (n.properties or {}).values():
                if isinstance(v, str) and q in v.lower():
                    out.append(n)
                    break
        return out

    def get_node(self, node_id: str) -> Optional[Node]:
        return self._node_by_id.get(node_id)

    def get_neighbors(self, node_id: str, depth: int = 1) -> tuple[list[Node], list[Edge]]:
        if depth <= 0:
            return [], []
        seen_n: set[str] = set()
        seen_e: set[tuple[str, str, str]] = set()
        nodes: list[Node] = []
        edges: list[Edge] = []

        # 首先添加初始节点本身
        initial_node = self._node_by_id.get(node_id)
        if initial_node:
            nodes.append(initial_node)
            seen_n.add(node_id)

        frontier = [node_id]
        for _ in range(depth):
            next_frontier: list[str] = []
            for nid in frontier:
                for e in self._edges_by_source.get(nid, []) + self._edges_by_target.get(nid, []):
                    key = (e.source, e.target, e.relation)
                    if key not in seen_e:
                        seen_e.add(key)
                        edges.append(e)
                    for oid in (e.source, e.target):
                        if oid not in seen_n:
                            next_frontier.append(oid)
                            seen_n.add(oid)
                            n = self._node_by_id.get(oid)
                            if n:
                                nodes.append(n)
            frontier = next_frontier
        return nodes, edges

    def subgraph_around_nodes(self, node_ids: list[str], depth: int = 1) -> GraphPayload:
        all_nodes: list[Node] = []
        all_edges: list[Edge] = []
        seen_n: set[str] = set()
        seen_e: set[tuple[str, str, str]] = set()
        for nid in node_ids:
            ns, es = self.get_neighbors(nid, depth)
            for n in ns:
                if n.id not in seen_n:
                    seen_n.add(n.id)
                    all_nodes.append(n)
            for e in es:
                key = (e.source, e.target, e.relation)
                if key not in seen_e:
                    seen_e.add(key)
                    all_edges.append(e)
        return GraphPayload(nodes=all_nodes, edges=all_edges)

    def nodes_to_citations(self, nodes: list[Node]) -> list[Citation]:
        citations = []
        for n in nodes:
            props = n.properties or {}
            citations.append(
                Citation(
                    node_id=n.id,
                    label=n.label,
                    type=n.type,
                    source=props.get("source"),
                    source_id=props.get("source_id"),
                    excerpt=n.label + " " + " | ".join(f"{k}:{v}" for k, v in props.items() if k not in ("source", "source_id") and v),
                )
            )
        return citations


_store: Optional[KGStore] = None


def get_kg_store() -> KGStore:
    global _store
    if _store is None:
        _store = KGStore()
    return _store
