import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Card } from '../components/shared/Card'

interface Period {
  id: string
  label: string
  type: string
  properties: {
    label?: string
    start_year?: string
    end_year?: string
    source?: string
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
    specialty?: string
    [key: string]: any
  }
}

interface Artwork {
  id: string
  label: string
  type: string
  properties: {
    name?: string
    creation_date?: string
    material?: string
    [key: string]: any
  }
}

export function PeriodDetail() {
  const { id } = useParams<{ id: string }>()
  const [period, setPeriod] = useState<Period | null>(null)
  const [artists, setArtists] = useState<Artist[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPeriod = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/kg')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        // 查找时期节点
        const periodNode = data.nodes.find((n: any) => n.id === id)
        if (!periodNode) throw new Error('Period not found')

        setPeriod(periodNode)

        // 查找该时期的艺术家
        const periodArtists = data.edges
          .filter((e: any) => e.source === id && e.relation === 'belongs_to')
          .map((e: any) => data.nodes.find((n: any) => n.id === e.target && n.type === 'Artist'))
          .filter(Boolean)

        setArtists(periodArtists)

        // 查找该时期的作品
        const periodWorks = data.edges
          .filter((e: any) => e.source === id && e.relation === 'belongs_to')
          .map((e: any) => data.nodes.find((n: any) => n.id === e.target && n.type === 'Work'))
          .filter(Boolean)

        setArtworks(periodWorks)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load period')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchPeriod()
  }, [id])

  if (loading) {
    return <Loading message="加载时期信息..." />
  }

  if (error || !period) {
    return (
      <div className="period-detail">
        <ErrorMessage
          message={error || '时期未找到'}
          onRetry={() => window.location.reload()}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/" className="back-link">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="period-detail">
      <div className="period-header">
        <Link to="/" className="back-link">← 返回首页</Link>
        <h1>{period.label}</h1>
        {period.properties.start_year && period.properties.end_year && (
          <div className="period-years">
            {period.properties.start_year} - {period.properties.end_year}
          </div>
        )}
      </div>

      <div className="period-content">
        {artists.length > 0 && (
          <section className="period-artists">
            <h2>代表艺术家 ({artists.length})</h2>
            <div className="artists-grid">
              {artists.map((artist) => (
                <Card
                  key={artist.id}
                  title={artist.label}
                  description={
                    <>
                      {artist.properties.birth_year && artist.properties.death_year && (
                        <p className="years">
                          {artist.properties.birth_year} - {artist.properties.death_year}
                        </p>
                      )}
                      {artist.properties.specialty && (
                        <p className="specialty">{artist.properties.specialty}</p>
                      )}
                    </>
                  }
                  link={`/artist/${artist.id}`}
                />
              ))}
            </div>
          </section>
        )}

        {artworks.length > 0 && (
          <section className="period-artworks">
            <h2>代表作品 ({artworks.length})</h2>
            <div className="artworks-grid">
              {artworks.map((work) => (
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
        .period-detail {
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

        .period-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: var(--ink-text, #2c2825);
        }

        .period-years {
          font-size: 1.2rem;
          color: var(--charcoal, #4a4541);
          margin-bottom: 2rem;
          padding: 0.5rem 1rem;
          background: var(--silk-cream, #f8f5f0);
          border-radius: 4px;
          display: inline-block;
        }

        .period-content {
          display: grid;
          gap: 2rem;
        }

        .period-artists h2,
        .period-artworks h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: var(--ink-text, #2c2825);
        }

        .artists-grid,
        .artworks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .years,
        .specialty,
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
