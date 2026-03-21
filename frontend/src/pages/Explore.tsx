import { useEffect, useState } from 'react'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Card } from '../components/shared/Card'

interface Node {
  id: string
  label: string
  type: string
  properties: Record<string, any>
}

interface TodayData {
  artist: Node | null
  artwork: Node | null
}

export function Explore() {
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [randomArtists, setRandomArtists] = useState<Node[]>([])
  const [randomArtworks, setRandomArtworks] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 获取今日推荐
      const todayRes = await fetch('/api/explore/today')
      if (!todayRes.ok) throw new Error('Failed to fetch today data')
      const today = await todayRes.json()
      setTodayData(today)

      // 获取随机艺术家
      const artistsRes = await fetch('/api/explore/random?type=artist&count=6')
      if (!artistsRes.ok) throw new Error('Failed to fetch random artists')
      const artists = await artistsRes.json()
      setRandomArtists(artists.items)

      // 获取随机作品
      const artworksRes = await fetch('/api/explore/random?type=artwork&count=6')
      if (!artworksRes.ok) throw new Error('Failed to fetch random artworks')
      const artworks = await artworksRes.json()
      setRandomArtworks(artworks.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load explore data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    fetchData()
  }

  if (loading) {
    return <Loading message="加载探索内容..." />
  }

  if (error) {
    return (
      <div className="explore-page">
        <ErrorMessage message={error} onRetry={handleRefresh} />
      </div>
    )
  }

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1>探索艺术</h1>
        <button className="refresh-btn" onClick={handleRefresh}>
          🔄 换一批
        </button>
      </div>

      {todayData && (
        <section className="today-section">
          <h2>今日推荐</h2>
          <div className="today-grid">
            {todayData.artist && (
              <Card
                title={todayData.artist.label}
                description={
                  <>
                    <p className="card-type">艺术家</p>
                    {todayData.artist.properties.birth_year && todayData.artist.properties.death_year && (
                      <p className="card-meta">
                        {todayData.artist.properties.birth_year} - {todayData.artist.properties.death_year}
                      </p>
                    )}
                    {todayData.artist.properties.specialty && (
                      <p className="card-meta">{todayData.artist.properties.specialty}</p>
                    )}
                  </>
                }
                link={`/artist/${todayData.artist.id}`}
              />
            )}
            {todayData.artwork && (
              <Card
                title={todayData.artwork.label}
                description={
                  <>
                    <p className="card-type">作品</p>
                    {todayData.artwork.properties.creation_date && (
                      <p className="card-meta">{todayData.artwork.properties.creation_date}</p>
                    )}
                    {todayData.artwork.properties.material && (
                      <p className="card-meta">{todayData.artwork.properties.material}</p>
                    )}
                  </>
                }
                link={`/artwork/${todayData.artwork.id}`}
              />
            )}
          </div>
        </section>
      )}

      <section className="random-section">
        <h2>随机发现 - 艺术家</h2>
        <div className="random-grid">
          {randomArtists.map((artist) => (
            <Card
              key={artist.id}
              title={artist.label}
              description={
                <>
                  {artist.properties.birth_year && artist.properties.death_year && (
                    <p className="card-meta">
                      {artist.properties.birth_year} - {artist.properties.death_year}
                    </p>
                  )}
                  {artist.properties.specialty && (
                    <p className="card-meta">{artist.properties.specialty}</p>
                  )}
                </>
              }
              link={`/artist/${artist.id}`}
            />
          ))}
        </div>
      </section>

      <section className="random-section">
        <h2>随机发现 - 作品</h2>
        <div className="random-grid">
          {randomArtworks.map((artwork) => (
            <Card
              key={artwork.id}
              title={artwork.label}
              description={
                <>
                  {artwork.properties.creation_date && (
                    <p className="card-meta">{artwork.properties.creation_date}</p>
                  )}
                  {artwork.properties.material && (
                    <p className="card-meta">{artwork.properties.material}</p>
                  )}
                </>
              }
              link={`/artwork/${artwork.id}`}
            />
          ))}
        </div>
      </section>

      <style>{`
        .explore-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .explore-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .explore-header h1 {
          font-size: 2.5rem;
          color: var(--ink-text, #2c2825);
        }

        .refresh-btn {
          padding: 0.75rem 1.5rem;
          background: var(--soft-blue, #5b9bd5);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 500;
        }

        .refresh-btn:hover {
          background: var(--rose-gold, #d4a574);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3);
        }

        .today-section,
        .random-section {
          margin-bottom: 3rem;
        }

        .today-section h2,
        .random-section h2 {
          font-size: 1.75rem;
          color: var(--ink-text, #2c2825);
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--pearl-gray, #e8e4df);
        }

        .today-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .random-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .card-type {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: var(--silk-cream, #f8f5f0);
          color: var(--rose-gold, #d4a574);
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .card-meta {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: var(--charcoal, #4a4541);
        }

        @media (max-width: 768px) {
          .explore-page {
            padding: 1rem;
          }

          .explore-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .explore-header h1 {
            font-size: 2rem;
          }

          .today-grid {
            grid-template-columns: 1fr;
          }

          .random-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
