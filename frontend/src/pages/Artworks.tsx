import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Pagination } from '../components/shared/Pagination'

interface Artwork {
  id: string
  label: string
  type: string
  properties: {
    creation_date?: string
    material?: string
    dimensions?: string
    current_location?: string
    source?: string
    [key: string]: any
  }
}

interface PaginatedResult {
  items: Artwork[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export function Artworks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1')

  const [result, setResult] = useState<PaginatedResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/artworks?page=${page}&page_size=24`)
        if (!res.ok) throw new Error('加载失败')
        const data = await res.json()
        setResult(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchArtworks()
  }, [page])

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getMaterialColor = (material?: string) => {
    if (!material) return 'var(--pearl-gray, #e8e4df)'
    if (material.includes('水墨')) return 'rgba(44, 40, 37, 0.08)'
    if (material.includes('设色')) return 'rgba(212, 165, 116, 0.12)'
    if (material.includes('泼墨')) return 'rgba(91, 155, 213, 0.12)'
    return 'rgba(126, 200, 163, 0.12)'
  }

  return (
    <div className="browse-page">
      <div className="browse-header">
        <h1>作品</h1>
        {result && (
          <p className="browse-count">共 {result.total} 件作品</p>
        )}
      </div>

      {loading && <Loading message="加载作品列表..." />}
      {error && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}

      {!loading && !error && result && (
        <>
          <div className="artwork-grid">
            {result.items.map((artwork) => (
              <Link
                key={artwork.id}
                to={`/artwork/${artwork.id}`}
                className="artwork-card"
                style={{ '--card-bg': getMaterialColor(artwork.properties.material) } as any}
              >
                <div className="artwork-thumbnail">
                  <span className="artwork-initial">{artwork.label.slice(0, 2)}</span>
                </div>
                <div className="artwork-info">
                  <h3 className="artwork-title">{artwork.label}</h3>
                  {artwork.properties.creation_date && (
                    <p className="artwork-date">{artwork.properties.creation_date}</p>
                  )}
                  {artwork.properties.material && (
                    <p className="artwork-material">{artwork.properties.material}</p>
                  )}
                  {artwork.properties.current_location && (
                    <p className="artwork-location">📍 {artwork.properties.current_location}</p>
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

        .artwork-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .artwork-card {
          display: flex;
          flex-direction: column;
          background: white;
          border: 1px solid var(--pearl-gray, #e8e4df);
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          transition: all 0.3s;
        }

        .artwork-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(212, 165, 116, 0.2);
          border-color: var(--rose-gold, #d4a574);
        }

        .artwork-thumbnail {
          height: 140px;
          background: var(--card-bg, var(--silk-cream, #f8f5f0));
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .artwork-thumbnail::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 60%, rgba(212, 165, 116, 0.15));
        }

        .artwork-initial {
          font-family: var(--font-display, serif);
          font-size: 3rem;
          color: var(--charcoal, #4a4541);
          opacity: 0.3;
          letter-spacing: 0.1em;
        }

        .artwork-info {
          padding: 1rem 1.25rem;
        }

        .artwork-title {
          font-size: 1.05rem;
          color: var(--ink-text, #2c2825);
          margin: 0 0 0.5rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .artwork-date {
          font-size: 0.85rem;
          color: var(--rose-gold, #d4a574);
          margin: 0 0 0.25rem;
          font-weight: 500;
        }

        .artwork-material {
          font-size: 0.8rem;
          color: var(--charcoal, #4a4541);
          margin: 0 0 0.25rem;
          opacity: 0.8;
        }

        .artwork-location {
          font-size: 0.8rem;
          color: var(--soft-blue, #5b9bd5);
          margin: 0.25rem 0 0;
        }

        @media (max-width: 768px) {
          .browse-page {
            padding: 1rem;
          }

          .browse-header h1 {
            font-size: 2rem;
          }

          .artwork-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 1rem;
          }

          .artwork-thumbnail {
            height: 100px;
          }
        }
      `}</style>
    </div>
  )
}
