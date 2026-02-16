from pydantic import BaseModel
from typing import Literal, Optional, Any


class Node(BaseModel):
    id: str
    label: str
    type: str
    properties: dict[str, Any] = {}
    source_page: Optional[int] = None
    confidence: Optional[float] = None


class Edge(BaseModel):
    source: str
    target: str
    relation: str
    properties: dict[str, Any] = {}
    source_page: Optional[int] = None
    confidence: Optional[float] = None


class GraphPayload(BaseModel):
    nodes: list[Node]
    edges: list[Edge]


class Citation(BaseModel):
    node_id: str
    label: str
    type: str
    source: Optional[str] = None
    source_id: Optional[str] = None
    excerpt: Optional[str] = None


class QARequest(BaseModel):
    query: str


class QAResponse(BaseModel):
    answer: str
    citations: list[Citation] = []
    subgraph: Optional[GraphPayload] = None
    answer_source: Optional[Literal["llm", "template"]] = None
    llm_model: Optional[str] = None
