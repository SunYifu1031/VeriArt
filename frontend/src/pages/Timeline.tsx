import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'

interface TimelinePeriod {
  id: string
  label: string
  start_year: string
  end_year: string
  artists: Array<{
    id: string
    label: string
    birth_year?: string
    death_year?: string
  }>
  artworks: Array<{
    id: string
    label: string
    creation_date?: string
  }>
}

interface TimelineData {
  timeline: TimelinePeriod[]
}

export function Timeline() {
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/timeline')
        if (!res.ok) throw new Error('Failed to fetch timeline')
        const timelineData = await res.json()
        setData(timelineData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load timeline')
      } finally {
        setLoading(false)
      }
    }

    fetchTimeline()
  }, [])

  if (loading) {
    return <Loading message="加载时间线..." />
  }

  if (error || !data) {
    return (
      <div className="timeline-page">
        <ErrorMessage
          message={error || '时间线加载失败'}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="timeline-page">
      <div className="timeline-header">
        <h1>艺术时间线</h1>
        <p className="timeline-description">
          探索不同历史时期的艺术家与作品
        </p>
      </div>

      <div className="timeline-container">
        {data.timeline.map((period, index) => (
          <div key={period.id} className="timeline-period">
            <div className="period-marker">
              <div className="period-dot"></div>
              {index < data.timeline.length - 1 && <div className="period-line"></div>}
            </div>
            <div className="period-content">
              <div className="period-header">
                <Link to={`/period/${period.id}`} className="period-title">
                  {period.label}
                </Link>
                <span className="period-years">
                  {period.start_year} - {period.end_year}
                </span>
              </div>

              {period.artists.length > 0 && (
                <div className="period-section">
                  <h3>艺术家 ({period.artists.length})</h3>
                  <div className="period-items">
                    {period.artists.slice(0, 5).map((artist) => (
                      <Link
                        key={artist.id}
                        to={`/artist/${artist.id}`}
                        className="period-item"
                      >
                        <span className="item-label">{artist.label}</span>
                        {artist.birth_year && artist.death_year && (
                          <span className="item-meta">
                            {artist.birth_year} - {artist.death_year}
                          </span>
                        )}
                      </Link>
                    ))}
                    {period.artists.length > 5 && (
                      <Link to={`/period/${period.id}`} className="period-item-more">
                        查看全部 {period.artists.length} 位艺术家 →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {period.artworks.length > 0 && (
                <div className="period-section">
                  <h3>作品 ({period.artworks.length})</h3>
                  <div className="period-items">
                    {period.artworks.slice(0, 5).map((artwork) => (
                      <Link
                        key={artwork.id}
                        to={`/artwork/${artwork.id}`}
                        className="period-item"
                      >
                        <span className="item-label">{artwork.label}</span>
                        {artwork.creation_date && (
                          <span className="item-meta">{artwork.creation_date}</span>
                        )}
                      </Link>
                    ))}
                    {period.artworks.length > 5 && (
                      <Link to={`/period/${period.id}`} className="period-item-more">
                        查看全部 {period.artworks.length} 件作品 →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .timeline-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .timeline-header {
          margin-bottom: 3rem;
          text-align: center;
        }

        .timeline-header h1 {
          font-size: 2.5rem;
          color: var(--ink-text, #2c2825);
          margin-bottom: 0.5rem;
        }

        .timeline-description {
          font-size: 1.1rem;
          color: var(--charcoal, #4a4541);
        }

        .timeline-container {
          position: relative;
        }

        .timeline-period {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .period-marker {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 0.5rem;
        }

        .period-dot {
          width: 20px;
          height: 20px;
          background: var(--rose-gold, #d4a574);
          border: 4px solid var(--silk-cream, #f8f5f0);
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
          z-index: 2;
        }

        .period-line {
          width: 2px;
          flex: 1;
          background: linear-gradient(to bottom, var(--rose-gold, #d4a574), var(--pearl-gray, #e8e4df));
          margin-top: 0.5rem;
        }

        .period-content {
          flex: 1;
          background: white;
          border: 2px solid var(--pearl-gray, #e8e4df);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s;
        }

        .period-content:hover {
          border-color: var(--soft-blue, #5b9bd5);
          box-shadow: 0 4px 16px rgba(91, 155, 213, 0.15);
        }

        .period-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--pearl-gray, #e8e4df);
        }

        .period-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--ink-text, #2c2825);
          text-decoration: none;
          transition: color 0.3s;
        }

        .period-title:hover {
          color: var(--soft-blue, #5b9bd5);
        }

        .period-years {
          font-size: 1rem;
          color: var(--charcoal, #4a4541);
          background: var(--silk-cream, #f8f5f0);
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
        }

        .period-section {
          margin-bottom: 1.5rem;
        }

        .period-section:last-child {
          margin-bottom: 0;
        }

        .period-section h3 {
          font-size: 1rem;
          color: var(--charcoal, #4a4541);
          margin-bottom: 0.75rem;
          font-weight: 600;
        }

        .period-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .period-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: var(--silk-cream, #f8f5f0);
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s;
        }

        .period-item:hover {
          background: var(--soft-blue, #5b9bd5);
          transform: translateX(4px);
        }

        .period-item:hover .item-label {
          color: white;
        }

        .period-item:hover .item-meta {
          color: rgba(255, 255, 255, 0.9);
        }

        .item-label {
          color: var(--ink-text, #2c2825);
          font-weight: 500;
        }

        .item-meta {
          color: var(--charcoal, #4a4541);
          font-size: 0.9rem;
        }

        .period-item-more {
          display: block;
          padding: 0.5rem 0.75rem;
          text-align: center;
          color: var(--soft-blue, #5b9bd5);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }

        .period-item-more:hover {
          color: var(--rose-gold, #d4a574);
        }

        @media (max-width: 768px) {
          .timeline-page {
            padding: 1rem;
          }

          .timeline-period {
            gap: 1rem;
          }

          .period-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .period-title {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  )
}
