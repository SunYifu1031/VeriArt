import { Link } from 'react-router-dom'
import type { Citation } from './types'

interface CitationsProps {
  citations: Citation[]
}

export function Citations({ citations }: CitationsProps) {
  if (!citations.length) return null

  const getNodePath = (type: string, nodeId: string): string | null => {
    switch (type) {
      case 'Artist':
        return `/artist/${nodeId}`
      case 'Work':
        return `/artwork/${nodeId}`
      case 'Period':
        return `/period/${nodeId}`
      case 'Organization':
        return `/organization/${nodeId}`
      default:
        return null
    }
  }

  return (
    <div className="citations">
      <h3>📚 知识来源</h3>
      <p className="citations-desc">以下信息来自知识图谱数据库，每条记录都标注了权威出处</p>
      <ul>
        {citations.map((c, i) => {
          const path = c.node_id ? getNodePath(c.type, c.node_id) : null
          return (
            <li key={c.node_id || i} className="citation-item">
              <div className="citation-header">
                {path ? (
                  <Link to={path} className="citation-label citation-link">
                    {c.label}
                  </Link>
                ) : (
                  <span className="citation-label">{c.label}</span>
                )}
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
          )
        })}
      </ul>

      <style>{`
        .citation-link {
          color: var(--soft-blue, #5b9bd5);
          text-decoration: none;
          transition: all 0.2s;
        }

        .citation-link:hover {
          color: var(--rose-gold, #d4a574);
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
