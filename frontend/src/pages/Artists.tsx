import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Pagination } from '../components/shared/Pagination'

interface Artist {
  id: string
  label: string
  type: string
  properties: {
    birth_year?: string
    death_year?: string
    nationality?: string
    specialty?: string
    source?: string
    [key: string]: any
  }
}

interface PaginatedResult {
  items: Artist[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export function Artists() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1')

  const [result, setResult] = useState<PaginatedResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/artists?page=${page}&page_size=24`)
        if (!res.ok) throw new Error('加载失败')
        const data = await res.json()
        setResult(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchArtists()
  }, [page])

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1>艺术家</h1>
        {result && (
          <p className="browse-count">共 {result.total} 位艺术家</p>
        )}
      </div>

      {loading && <Loading message="加载艺术家列表..." />}
      {error && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}

      {!loading && !error && result && (
        <>
          <div className="artist-grid">
            {result.items.map((artist) => (
              <Link key={artist.id} to={`/artist/${artist.id}`} className="artist-card">
                <div className="artist-avatar">
                  {artist.label.slice(0, 1)}
                </div>
                <div className="artist-info">
                  <h3 className="artist-name">{artist.label}</h3>
                  {(artist.properties.birth_year || artist.properties.death_year) && (
                    <p className="artist-years">
                      {artist.properties.birth_year}
                      {artist.properties.death_year ? ` — ${artist.properties.death_year}` : ' —'}
                    </p>
                  )}
                  {artist.properties.specialty && (
                    <p className="artist-specialty">{artist.properties.specialty}</p>
                  )}
                  {artist.properties.nationality && (
                    <p className="artist-nationality">{artist.properties.nationality}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={result.page}
            totalPages={result.total_pages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <style>{`
        .browse-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .browse-header {
          display: flex;
          align-items: baseline;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--pearl-gray, #e8e4df);
        }

        .browse-header h1 {
          font-size: 2.5rem;
          color: var(--ink-text, #2c2825);
          margin: 0;
        }

        .browse-count {
          color: var(--charcoal, #4a4541);
          font-size: 1rem;
          opacity: 0.7;
          margin: 0;
        }

        .artist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .artist-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 1rem;
          background: white;
          border: 1px solid var(--pearl-gray, #e8e4df);
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s;
          text-align: center;
        }

        .artist-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(91, 155, 213, 0.15);
          border-color: var(--soft-blue, #5b9bd5);
        }

        .artist-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--rose-gold, #d4a574), var(--soft-blue, #5b9bd5));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          color: white;
          font-weight: 700;
          margin-bottom: 1rem;
          font-family: var(--font-display, serif);
        }

        .artist-name {
          font-size: 1.15rem;
          color: var(--ink-text, #2c2825);
          margin: 0 0 0.5rem;
          font-weight: 600;
        }

        .artist-years {
          font-size: 0.85rem;
          color: var(--charcoal, #4a4541);
          margin: 0 0 0.25rem;
          opacity: 0.8;
        }

        .artist-specialty,
        .artist-nationality {
          font-size: 0.8rem;
          color: var(--soft-blue, #5b9bd5);
          margin: 0.2rem 0 0;
        }

        @media (max-width: 768px) {
          .browse-page {
            padding: 1rem;
          }

          .browse-header h1 {
            font-size: 2rem;
          }

          .artist-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  )
}
