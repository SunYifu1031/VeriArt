import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../contexts/FavoritesContext'
import { Loading } from '../components/shared/Loading'
import { FavoriteButton } from '../components/shared/FavoriteButton'

interface Node {
  id: string
  label: string
  type: string
  properties: Record<string, any>
}

export function Favorites() {
  const { favorites } = useFavorites()
  const [items, setItems] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFavorites = async () => {
      if (favorites.size === 0) {
        setItems([])
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/kg')
        const data = await res.json()
        const favoriteNodes = data.nodes.filter((n: Node) => favorites.has(n.id))
        setItems(favoriteNodes)
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [favorites])

  const artists = items.filter((n) => n.type === 'Artist')
  const artworks = items.filter((n) => n.type === 'Work')
  const others = items.filter((n) => n.type !== 'Artist' && n.type !== 'Work')

  if (loading) {
    return <Loading message="加载收藏..." />
  }

  return (
    <div className="favorites-page">
      <div className="favorites-header">
        <h1>我的收藏</h1>
        <p className="favorites-count">共 {items.length} 项</p>
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🤍</div>
          <p className="empty-text">还没有收藏任何内容</p>
          <p className="empty-hint">浏览艺术家和作品时，点击 ❤️ 按钮即可收藏</p>
          <div className="empty-links">
            <Link to="/artists" className="empty-link">浏览艺术家</Link>
            <Link to="/artworks" className="empty-link">浏览作品</Link>
          </div>
        </div>
      )}

      {artists.length > 0 && (
        <section className="favorites-section">
          <h2>艺术家 ({artists.length})</h2>
          <div className="favorites-grid">
            {artists.map((artist) => (
              <Link key={artist.id} to={`/artist/${artist.id}`} className="favorite-card">
                <div className="card-header">
                  <div className="artist-avatar">
                    {artist.label.slice(0, 1)}
                  </div>
                  <FavoriteButton id={artist.id} size="small" />
                </div>
                <h3 className="card-title">{artist.label}</h3>
                {artist.properties.birth_year && (
                  <p className="card-meta">
                    {artist.properties.birth_year}
                    {artist.properties.death_year ? ` — ${artist.properties.death_year}` : ' —'}
                  </p>
                )}
                {artist.properties.specialty && (
                  <p className="card-specialty">{artist.properties.specialty}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {artworks.length > 0 && (
        <section className="favorites-section">
          <h2>作品 ({artworks.length})</h2>
          <div className="favorites-grid">
            {artworks.map((work) => (
              <Link key={work.id} to={`/artwork/${work.id}`} className="favorite-card">
                <div className="card-header">
                  <div className="artwork-preview">
                    <span className="artwork-char">{work.label.slice(0, 2)}</span>
                  </div>
                  <FavoriteButton id={work.id} size="small" />
                </div>
                <h3 className="card-title">{work.label}</h3>
                {work.properties.creation_date && (
                  <p className="card-meta">{work.properties.creation_date}</p>
                )}
                {work.properties.material && (
                  <p className="card-material">{work.properties.material}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="favorites-section">
          <h2>其他 ({others.length})</h2>
          <div className="favorites-grid">
            {others.map((item) => (
              <div key={item.id} className="favorite-card">
                <div className="card-header">
                  <span className="item-type">{item.type}</span>
                  <FavoriteButton id={item.id} size="small" />
                </div>
                <h3 className="card-title">{item.label}</h3>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .favorites-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .favorites-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--pearl-gray, #e8e4df);
        }

        .favorites-header h1 {
          font-size: 2.5rem;
          color: var(--ink-text, #2c2825);
          margin: 0 0 0.5rem;
        }

        .favorites-count {
          color: var(--charcoal, #4a4541);
          opacity: 0.7;
          margin: 0;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .empty-text {
          font-size: 1.5rem;
          color: var(--charcoal, #4a4541);
          margin: 0 0 0.5rem;
        }

        .empty-hint {
          color: var(--charcoal, #4a4541);
          opacity: 0.7;
          margin: 0 0 2rem;
        }

        .empty-links {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .empty-link {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--rose-gold, #d4a574), var(--soft-blue, #5b9bd5));
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s;
        }

        .empty-link:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        .favorites-section {
          margin-bottom: 3rem;
        }

        .favorites-section h2 {
          font-size: 1.8rem;
          color: var(--ink-text, #2c2825);
          margin: 0 0 1.5rem;
        }

        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        .favorite-card {
          background: white;
          border: 1px solid var(--pearl-gray, #e8e4df);
          border-radius: 12px;
          padding: 1.25rem;
          text-decoration: none;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }

        .favorite-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(212, 165, 116, 0.2);
          border-color: var(--rose-gold, #d4a574);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .artist-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--rose-gold, #d4a574), var(--soft-blue, #5b9bd5));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          font-weight: 700;
          font-family: var(--font-display, serif);
        }

        .artwork-preview {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, rgba(212, 165, 116, 0.12), rgba(91, 155, 213, 0.12));
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .artwork-char {
          font-family: var(--font-display, serif);
          font-size: 1.2rem;
          color: var(--charcoal, #4a4541);
          opacity: 0.4;
        }

        .item-type {
          padding: 0.25rem 0.75rem;
          background: var(--silk-cream, #f8f5f0);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--charcoal, #4a4541);
          font-weight: 500;
        }

        .card-title {
          font-size: 1.1rem;
          color: var(--ink-text, #2c2825);
          margin: 0 0 0.5rem;
          font-weight: 600;
        }

        .card-meta {
          font-size: 0.85rem;
          color: var(--rose-gold, #d4a574);
          margin: 0 0 0.25rem;
        }

        .card-specialty,
        .card-material {
          font-size: 0.8rem;
          color: var(--charcoal, #4a4541);
          opacity: 0.8;
          margin: 0;
        }

        @media (max-width: 768px) {
          .favorites-page {
            padding: 1rem;
          }

          .favorites-header h1 {
            font-size: 2rem;
          }

          .favorites-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1rem;
          }

          .empty-links {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  )
}
