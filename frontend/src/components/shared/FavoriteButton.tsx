import { useFavorites } from '../../contexts/FavoritesContext'

interface FavoriteButtonProps {
  id: string
  size?: 'small' | 'medium' | 'large'
}

export function FavoriteButton({ id, size = 'medium' }: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const favorited = isFavorite(id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (favorited) {
      removeFavorite(id)
    } else {
      addFavorite(id)
    }
  }

  const sizeMap = {
    small: '1.5rem',
    medium: '2rem',
    large: '2.5rem',
  }

  return (
    <button
      className={`favorite-btn ${favorited ? 'favorited' : ''} size-${size}`}
      onClick={handleClick}
      title={favorited ? '取消收藏' : '收藏'}
    >
      {favorited ? '❤️' : '🤍'}
      <style>{`
        .favorite-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: ${sizeMap[size]};
          padding: 0.25rem;
          transition: all 0.2s;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .favorite-btn:hover {
          transform: scale(1.15);
        }

        .favorite-btn:active {
          transform: scale(0.95);
        }

        .favorite-btn.favorited {
          animation: heartbeat 0.3s ease-out;
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </button>
  )
}
