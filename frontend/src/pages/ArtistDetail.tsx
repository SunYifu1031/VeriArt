import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Card } from '../components/shared/Card'
import { FavoriteButton } from '../components/shared/FavoriteButton'
import type { ReactNode } from 'react'

interface Artist {
  id: string
  label: string
  type: string
  properties: {
    name?: string
    birth_year?: string
    death_year?: string
    specialty?: string
    source?: string
    [key: string]: any
  }
}

interface Artwork {
  id: string
  label: string
  type: string
  properties: {
    title?: string
    year?: string
    medium?: string
    [key: string]: any
  }
}

export function ArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [story, setStory] = useState<string | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        setLoading(true)
        // 获取完整图谱
        const res = await fetch('/api/kg')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        // 查找艺术家节点
        const artistNode = data.nodes.find((n: any) => n.id === id)
        if (!artistNode) throw new Error('Artist not found')

        setArtist(artistNode)

        // 查找该艺术家的作品（支持两种关系方向）
        const artistWorks = data.edges
          .filter((e: any) =>
            (e.source === id && e.relation === 'created') ||
            (e.target === id && e.relation === 'CREATED_BY')
          )
          .map((e: any) => {
            const workId = e.source === id ? e.target : e.source
            return data.nodes.find((n: any) => n.id === workId)
          })
          .filter(Boolean)

        setArtworks(artistWorks)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load artist')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchArtist()
  }, [id])

  if (loading) {
    return <Loading message="加载艺术家信息..." />
  }

  if (error || !artist) {
    return (
      <div className="artist-detail">
        <ErrorMessage
          message={error || '艺术家未找到'}
          onRetry={() => window.location.reload()}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/" className="back-link">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="artist-detail">
      <div className="artist-header">
        <Link to="/artists" className="back-link">← 艺术家列表</Link>
        <div className="header-title-row">
          <h1>{artist.label}</h1>
          <FavoriteButton id={artist.id} size="large" />
        </div>
        <div className="artist-meta">
          {artist.properties.birth_year && artist.properties.death_year && (
            <span className="years">
              {artist.properties.birth_year} - {artist.properties.death_year}
            </span>
          )}
          {artist.properties.specialty && (
            <span className="specialty">{artist.properties.specialty}</span>
          )}
        </div>
      </div>

      <div className="artist-content">
        <section className="artist-info">
          <h2>基本信息</h2>
          <dl>
            {Object.entries(artist.properties).map(([key, value]) => {
              if (!value || key === 'name') return null
              const labelMap: Record<string, string> = {
                birth_year: '出生年份',
                death_year: '逝世年份',
                nationality: '国籍',
                specialty: '专长',
                source: '数据来源',
                source_id: '来源编号',
                biography: '简介',
                style: '风格',
                school: '流派',
                teacher: '师承',
                awards: '荣誉',
              }
              return (
                <div key={key} className="info-item">
                  <dt>{labelMap[key] || key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              )
            })}
          </dl>
        </section>

        <section className="artist-story">
          <div className="story-header">
            <h2>艺术生涯</h2>
            {!story && !storyLoading && (
              <button
                className="story-btn"
                onClick={async () => {
                  setStoryLoading(true)
                  try {
                    const res = await fetch(`/api/artists/${id}/story`)
                    const data = await res.json()
                    setStory(data.story)
                  } catch {
                    setStory('_故事加载失败，请稍后重试。_')
                  } finally {
                    setStoryLoading(false)
                  }
                }}
              >
                ✨ 生成 AI 故事
              </button>
            )}
          </div>
          {storyLoading && (
            <div className="story-loading">
              <span>AI 正在撰写艺术家故事...</span>
            </div>
          )}
          {story && (
            <div className="story-content">
              <ReactMarkdown>{story}</ReactMarkdown>
            </div>
          )}
        </section>

        {artworks.length > 0 && (
          <section className="artist-artworks">
            <h2>代表作品 ({artworks.length})</h2>
            <div className="artworks-grid">
              {artworks.map((work) => {
                const description: ReactNode[] = []
                if (work.properties.creation_date || work.properties.year) {
                  description.push(<p key="year" className="year">{work.properties.creation_date || work.properties.year}</p>)
                }
                if (work.properties.material || work.properties.medium) {
                  description.push(<p key="medium" className="medium">{work.properties.material || work.properties.medium}</p>)
                }
                if (work.properties.current_location) {
                  description.push(<p key="loc" className="location">📍 {work.properties.current_location}</p>)
                }
                return (
                  <Card
                    key={work.id}
                    title={work.label}
                    description={<>{description}</>}
                    link={`/artwork/${work.id}`}
                  />
                )
              })}
            </div>
          </section>
        )}
      </div>

      <style>{`
        .artist-detail {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 1rem;
          color: #5b9bd5;
          text-decoration: none;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .artist-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: #2c2825;
        }

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-title-row h1 {
          margin: 0;
        }

        .artist-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .artist-meta span {
          padding: 0.25rem 0.75rem;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .artist-content {
          display: grid;
          gap: 2rem;
        }

        .artist-info h2,
        .artist-artworks h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #2c2825;
        }

        .info-item {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 1rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }

        .info-item dt {
          font-weight: 600;
          color: #666;
        }

        .info-item dd {
          margin: 0;
        }

        .artist-story {
          background: linear-gradient(135deg, rgba(212, 165, 116, 0.05) 0%, rgba(91, 155, 213, 0.05) 100%);
          border: 1px solid var(--pearl-gray, #e8e4df);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .story-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .artist-story h2 {
          font-size: 1.5rem;
          color: var(--ink-text, #2c2825);
          margin: 0;
        }

        .story-btn {
          padding: 0.5rem 1.25rem;
          background: linear-gradient(135deg, var(--rose-gold, #d4a574), var(--soft-blue, #5b9bd5));
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s;
        }

        .story-btn:hover {
          opacity: 0.85;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
        }

        .story-loading {
          color: var(--charcoal, #4a4541);
          font-style: italic;
          padding: 1rem 0;
          opacity: 0.7;
        }

        .story-content {
          line-height: 1.9;
          color: var(--ink-text, #2c2825);
        }

        .story-content h2,
        .story-content h3 {
          color: var(--rose-gold, #d4a574);
          margin: 1.2rem 0 0.5rem;
        }

        .story-content p {
          margin: 0.75rem 0;
        }

        .story-content strong {
          color: var(--rose-gold-dark, #b8895f);
        }

        .artworks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .year,
        .medium,
        .location {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: #666;
        }

        .location {
          color: var(--soft-blue, #5b9bd5);
          font-size: 0.8rem;
        }

        .loading,
        .error {
          text-align: center;
          padding: 3rem;
          font-size: 1.2rem;
          color: #666;
        }

        .error {
          color: #e74c3c;
        }
      `}</style>
    </div>
  )
}
