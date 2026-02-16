export interface Node {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
  source_page?: number
  confidence?: number
}

export interface Edge {
  source: string
  target: string
  relation: string
  properties: Record<string, unknown>
  source_page?: number
  confidence?: number
}

export interface GraphPayload {
  nodes: Node[]
  edges: Edge[]
}

export interface Citation {
  node_id: string
  label: string
  type: string
  source?: string
  source_id?: string
  excerpt?: string
}

export interface QAResponse {
  answer: string
  citations: Citation[]
  subgraph?: GraphPayload | null
  answer_source?: 'llm' | 'template' | null
  llm_model?: string | null
}
