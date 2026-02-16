import type { Citation } from './types'

interface CitationsProps {
  citations: Citation[]
}

export function Citations({ citations }: CitationsProps) {
  if (!citations.length) return null
  return (
    <div className="citations">
      <h3>📚 知识来源</h3>
      <p className="citations-desc">以下信息来自知识图谱数据库，每条记录都标注了权威出处</p>
      <ul>
        {citations.map((c, i) => (
          <li key={c.node_id || i} className="citation-item">
            <div className="citation-header">
              <span className="citation-label">{c.label}</span>
              <span className="citation-type">{c.type}</span>
            </div>
            {c.source && (
              <div className="citation-source">
                <strong>📖 来源：</strong>{c.source}
                {c.source_id && <span className="citation-id">（{c.source_id}）</span>}
              </div>
            )}
            {c.excerpt && (
              <div className="citation-excerpt">{c.excerpt}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
