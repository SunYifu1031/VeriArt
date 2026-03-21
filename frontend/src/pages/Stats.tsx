import { useEffect, useState } from 'react'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'

interface StatsData {
  totalNodes: number
  totalEdges: number
  nodesByType: Record<string, number>
  edgesByRelation: Record<string, number>
  topArtists: Array<{ id: string; label: string; workCount: number }>
}

export function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/kg')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        // 统计节点类型
        const nodesByType: Record<string, number> = {}
        data.nodes.forEach((n: any) => {
          nodesByType[n.type] = (nodesByType[n.type] || 0) + 1
        })

        // 统计关系类型
        const edgesByRelation: Record<string, number> = {}
        data.edges.forEach((e: any) => {
          edgesByRelation[e.relation] = (edgesByRelation[e.relation] || 0) + 1
        })

        // 统计艺术家作品数量
        const artistWorkCount: Record<string, number> = {}
        data.edges.forEach((e: any) => {
          if (e.relation === 'created' || e.relation === 'CREATED_BY') {
            const artistId = e.relation === 'created' ? e.source : e.target
            artistWorkCount[artistId] = (artistWorkCount[artistId] || 0) + 1
          }
        })

        const topArtists = Object.entries(artistWorkCount)
          .map(([id, count]) => {
            const artist = data.nodes.find((n: any) => n.id === id)
            return { id, label: artist?.label || id, workCount: count }
          })
          .sort((a, b) => b.workCount - a.workCount)
          .slice(0, 10)

        setStats({
          totalNodes: data.nodes.length,
          totalEdges: data.edges.length,
          nodesByType,
          edgesByRelation,
          topArtists,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <Loading message="加载统计数据..." />
  }

  if (error || !stats) {
    return (
      <div className="stats-page">
        <ErrorMessage
          message={error || '统计数据未找到'}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const typeLabels: Record<string, string> = {
    Artist: '艺术家',
    Work: '作品',
    Period: '时期',
    Organization: '组织',
    Auction: '拍卖',
    Exhibition: '展览',
    Location: '地点',
  }

  const relationLabels: Record<string, string> = {
    created: '创作',
    CREATED_BY: '创作者',
    belongs_to: '属于',
    held_at: '举办于',
    exhibited_in: '展出于',
    auctioned_at: '拍卖于',
    located_in: '位于',
  }

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>数据统计</h1>
        <p className="stats-subtitle">VeriArt 知识图谱数据概览</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.totalNodes}</div>
          <div className="stat-label">总节点数</div>
        </div>

        <div className="stat-card stat-card-secondary">
          <div className="stat-icon">🔗</div>
          <div className="stat-value">{stats.totalEdges}</div>
          <div className="stat-label">总关系数</div>
        </div>

        <div className="stat-card stat-card-accent">
          <div className="stat-icon">🎨</div>
          <div className="stat-value">{stats.nodesByType.Artist || 0}</div>
          <div className="stat-label">艺术家</div>
        </div>

        <div className="stat-card stat-card-accent">
          <div className="stat-icon">🖼️</div>
          <div className="stat-value">{stats.nodesByType.Work || 0}</div>
          <div className="stat-label">作品</div>
        </div>
      </div>

      <div className="stats-sections">
        <section className="stats-section">
          <h2>节点类型分布</h2>
          <div className="stats-bars">
            {Object.entries(stats.nodesByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const percentage = (count / stats.totalNodes) * 100
                return (
                  <div key={type} className="stat-bar-item">
                    <div className="stat-bar-label">
                      <span>{typeLabels[type] || type}</span>
                      <span className="stat-bar-count">{count}</span>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </section>

        <section className="stats-section">
          <h2>关系类型分布</h2>
          <div className="stats-bars">
            {Object.entries(stats.edgesByRelation)
              .sort((a, b) => b[1] - a[1])
              .map(([relation, count]) => {
                const percentage = (count / stats.totalEdges) * 100
                return (
                  <div key={relation} className="stat-bar-item">
                    <div className="stat-bar-label">
                      <span>{relationLabels[relation] || relation}</span>
                      <span className="stat-bar-count">{count}</span>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill stat-bar-fill-secondary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </section>

        <section className="stats-section">
          <h2>作品数量 Top 10 艺术家</h2>
          <div className="stats-list">
            {stats.topArtists.map((artist, index) => (
              <div key={artist.id} className="stats-list-item">
                <div className="stats-list-rank">{index + 1}</div>
                <div className="stats-list-content">
                  <div className="stats-list-name">{artist.label}</div>
                  <div className="stats-list-meta">{artist.workCount} 件作品</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .stats-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .stats-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .stats-header h1 {
          font-size: 2.5rem;
          color: var(--ink-text);
          margin-bottom: 0.5rem;
        }

        .stats-subtitle {
          color: var(--charcoal);
          opacity: 0.7;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: white;
          border: 1px solid var(--pearl-gray);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-medium);
        }

        .stat-card-primary {
          background: linear-gradient(135deg, rgba(212, 165, 116, 0.1), rgba(91, 155, 213, 0.1));
          border-color: var(--rose-gold);
        }

        .stat-card-secondary {
          background: linear-gradient(135deg, rgba(91, 155, 213, 0.1), rgba(126, 200, 163, 0.1));
          border-color: var(--soft-blue);
        }

        .stat-card-accent {
          background: var(--silk-cream);
        }

        .stat-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--ink-text);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--charcoal);
          opacity: 0.8;
        }

        .stats-sections {
          display: grid;
          gap: 2rem;
        }

        .stats-section {
          background: white;
          border: 1px solid var(--pearl-gray);
          border-radius: 12px;
          padding: 2rem;
        }

        .stats-section h2 {
          font-size: 1.5rem;
          color: var(--ink-text);
          margin-bottom: 1.5rem;
        }

        .stats-bars {
          display: grid;
          gap: 1rem;
        }

        .stat-bar-item {
          display: grid;
          gap: 0.5rem;
        }

        .stat-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: var(--charcoal);
        }

        .stat-bar-count {
          font-weight: 600;
          color: var(--ink-text);
        }

        .stat-bar-track {
          height: 8px;
          background: var(--silk-cream);
          border-radius: 4px;
          overflow: hidden;
        }

        .stat-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--rose-gold), var(--soft-blue));
          border-radius: 4px;
          transition: width 0.6s ease-out;
        }

        .stat-bar-fill-secondary {
          background: linear-gradient(90deg, var(--soft-blue), var(--jade-accent));
        }

        .stats-list {
          display: grid;
          gap: 0.75rem;
        }

        .stats-list-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--silk-cream);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .stats-list-item:hover {
          background: var(--gradient-accent);
          transform: translateX(4px);
        }

        .stats-list-rank {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--rose-gold), var(--soft-blue));
          color: white;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .stats-list-content {
          flex: 1;
        }

        .stats-list-name {
          font-weight: 600;
          color: var(--ink-text);
          margin-bottom: 0.25rem;
        }

        .stats-list-meta {
          font-size: 0.85rem;
          color: var(--charcoal);
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .stats-page {
            padding: 1rem;
          }

          .stats-header h1 {
            font-size: 2rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .stat-icon {
            font-size: 2rem;
          }

          .stat-value {
            font-size: 2rem;
          }

          .stats-section {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}
