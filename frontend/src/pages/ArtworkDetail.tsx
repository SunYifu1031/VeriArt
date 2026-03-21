import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Card } from '../components/shared/Card'
import { FavoriteButton } from '../components/shared/FavoriteButton'

interface Artwork {
  id: string
  label: string
  type: string
  properties: {
    name?: string
    creation_date?: string
    dimensions?: string
    material?: string
    current_location?: string
    source?: string
    source_url?: string
    [key: string]: any
  }
}

interface Artist {
  id: string
  label: string
  type: string
  properties: {
    name?: string
    birth_year?: string
    death_year?: string
    [key: string]: any
  }
}

export function ArtworkDetail() {
  const { id } = useParams<{ id: string }>()
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [relatedWorks, setRelatedWorks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        setLoading(true)
        // 获取完整图谱
        const res = await fetch('/api/kg')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        // 查找作品节点
        const artworkNode = data.nodes.find((n: any) => n.id === id)
        if (!artworkNode) throw new Error('Artwork not found')

        setArtwork(artworkNode)

        // 查找作品的作者（支持两种关系方向）
        const createdByEdge = data.edges.find(
          (e: any) =>
            (e.target === id && e.relation === 'created') ||
            (e.source === id && e.relation === 'CREATED_BY')
        )
        if (createdByEdge) {
          const artistId = createdByEdge.relation === 'CREATED_BY' ? createdByEdge.target : createdByEdge.source
          const artistNode = data.nodes.find((n: any) => n.id === artistId)
          if (artistNode) {
            setArtist(artistNode)

            // 查找同一作者的其他作品
            const sameArtistWorks = data.edges
              .filter((e: any) =>
                ((e.source === artistId && e.relation === 'created') ||
                 (e.target === artistId && e.relation === 'CREATED_BY')) &&
                (e.source === artistId ? e.target : e.source) !== id
              )
              .map((e: any) => {
                const workId = e.source === artistId ? e.target : e.source
                return data.nodes.find((n: any) => n.id === workId)
              })
              .filter(Boolean)
              .slice(0, 6)

            setRelatedWorks(sameArtistWorks)
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load artwork')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchArtwork()
  }, [id])

  if (loading) {
    return <Loading message="加载作品信息..." />
  }

  if (error || !artwork) {
    return (
      <div className="artwork-detail">
        <ErrorMessage
          message={error || '作品未找到'}
          onRetry={() => window.location.reload()}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/" className="back-link">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="artwork-detail">
      <div className="artwork-header">
        <Link to="/artworks" className="back-link">← 作品列表</Link>
        <div className="header-title-row">
          <h1>{artwork.label}</h1>
          <FavoriteButton id={artwork.id} size="large" />
        </div>
        {artist && (
          <div className="artwork-artist">
            <Link to={`/artist/${artist.id}`} className="artist-link">
              {artist.label}
            </Link>
            {artist.properties.birth_year && artist.properties.death_year && (
              <span className="artist-years">
                ({artist.properties.birth_year} - {artist.properties.death_year})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="artwork-content">
        <section className="artwork-info">
          <h2>作品信息</h2>
          <dl>
            {artwork.properties.creation_date && (
              <div className="info-item">
                <dt>创作时间</dt>
                <dd>{artwork.properties.creation_date}</dd>
              </div>
            )}
            {artwork.properties.material && (
              <div className="info-item">
                <dt>材质</dt>
                <dd>{artwork.properties.material}</dd>
              </div>
            )}
            {artwork.properties.dimensions && (
              <div className="info-item">
                <dt>尺寸</dt>
                <dd>{artwork.properties.dimensions}</dd>
              </div>
            )}
            {artwork.properties.current_location && (
              <div className="info-item">
                <dt>收藏地</dt>
                <dd>{artwork.properties.current_location}</dd>
              </div>
            )}
            {artwork.properties.source && (
              <div className="info-item">
                <dt>数据来源</dt>
                <dd>
                  {artwork.properties.source_url ? (
                    <a href={artwork.properties.source_url} target="_blank" rel="noopener noreferrer">
                      {artwork.properties.source}
                    </a>
                  ) : (
                    artwork.properties.source
                  )}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {relatedWorks.length > 0 && (
          <section className="related-works">
            <h2>相关作品 ({relatedWorks.length})</h2>
            <div className="works-grid">
              {relatedWorks.map((work) => (
                <Card
                  key={work.id}
                  title={work.label}
                  description={
                    <>
                      {work.properties.creation_date && (
                        <p className="creation-date">{work.properties.creation_date}</p>
                      )}
                      {work.properties.material && (
                        <p className="material">{work.properties.material}</p>
                      )}
                    </>
                  }
                  link={`/artwork/${work.id}`}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <style>{`
        .artwork-detail {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 1rem;
          color: var(--soft-blue, #5b9bd5);
          text-decoration: none;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .artwork-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: var(--ink-text, #2c2825);
        }

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-title-row h1 {
          margin: 0;
        }

        .artwork-artist {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          font-size: 1.1rem;
        }

        .artist-link {
          color: var(--soft-blue, #5b9bd5);
          text-decoration: none;
          font-weight: 600;
        }

        .artist-link:hover {
          text-decoration: underline;
        }

        .artist-years {
          color: var(--charcoal, #4a4541);
        }

        .artwork-content {
          display: grid;
          gap: 2rem;
        }

        .artwork-info h2,
        .related-works h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: var(--ink-text, #2c2825);
        }

        .info-item {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 1rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--pearl-gray, #e8e4df);
        }

        .info-item dt {
          font-weight: 600;
          color: var(--charcoal, #4a4541);
        }

        .info-item dd {
          margin: 0;
        }

        .info-item a {
          color: var(--soft-blue, #5b9bd5);
          text-decoration: none;
        }

        .info-item a:hover {
          text-decoration: underline;
        }

        .works-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .creation-date,
        .material {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: var(--charcoal, #4a4541);
        }
      `}</style>
    </div>
  )
}

