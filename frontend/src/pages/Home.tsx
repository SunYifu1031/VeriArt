import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Chat } from '../Chat'
import { D3GraphView } from '../D3GraphView'
import { Citations } from '../Citations'
import type { QAResponse } from '../types'

interface Stats {
  total_nodes: number
  total_edges: number
  node_types: Record<string, number>
  relation_types: Record<string, number>
}

export function Home() {
  const [lastQA, setLastQA] = useState<QAResponse | null>(null)
  const [graphKey, setGraphKey] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {/* stats are optional */})
  }, [])

  const onAnswer = (res: QAResponse) => {
    setLastQA(res)
    setGraphKey((k) => k + 1)
  }

  return (
    <>
      {stats && (
        <div className="stats-bar">
          <div className="stats-inner">
            <Link to="/artists" className="stat-item">
              <span className="stat-num">{stats.node_types['Artist'] ?? 0}</span>
              <span className="stat-label">艺术家</span>
            </Link>
            <div className="stat-divider" />
            <Link to="/artworks" className="stat-item">
              <span className="stat-num">{stats.node_types['Work'] ?? 0}</span>
              <span className="stat-label">作品</span>
            </Link>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{stats.node_types['Period'] ?? 0}</span>
              <span className="stat-label">时期</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{stats.total_edges}</span>
              <span className="stat-label">知识关系</span>
            </div>
          </div>
        </div>
      )}

      <main className="main">
        <section className="chat-section">
          <Chat onAnswer={onAnswer} />
          {lastQA && lastQA.citations.length > 0 && (
            <Citations citations={lastQA.citations} />
          )}
        </section>
        <section className="graph-section">
          <D3GraphView key={graphKey} subgraph={lastQA?.subgraph} />
        </section>
      </main>

      <style>{`
        .stats-bar {
          background: linear-gradient(135deg, rgba(212, 165, 116, 0.06) 0%, rgba(91, 155, 213, 0.06) 100%);
          border-bottom: 1px solid var(--pearl-gray, #e8e4df);
          padding: 0.75rem var(--spacing-xl, 3rem);
        }

        .stats-inner {
          max-width: 1800px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 0;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 1.5rem;
          text-decoration: none;
          transition: all 0.2s;
          border-radius: 8px;
          cursor: default;
        }

        a.stat-item {
          cursor: pointer;
        }

        a.stat-item:hover {
          background: rgba(91, 155, 213, 0.08);
        }

        .stat-num {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--rose-gold, #d4a574);
          font-family: var(--font-display, serif);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--charcoal, #4a4541);
          opacity: 0.8;
        }

        .stat-divider {
          width: 1px;
          height: 24px;
          background: var(--pearl-gray, #e8e4df);
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .stats-bar {
            padding: 0.75rem 1rem;
          }

          .stat-item {
            padding: 0.4rem 0.75rem;
            gap: 0.4rem;
          }

          .stat-num {
            font-size: 1.1rem;
          }

          .stat-label {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </>
  )
}
