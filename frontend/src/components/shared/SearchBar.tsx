import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索艺术家、作品..."
        className="search-input"
      />
      <button type="submit" className="search-button">
        搜索
      </button>
      <style>{`
        .search-bar {
          display: flex;
          gap: 0.5rem;
          min-width: 300px;
          max-width: 500px;
          flex: 1;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid var(--pearl-gray, #e8e4df);
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          transition: all 0.3s;
          font-family: inherit;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--soft-blue, #5b9bd5);
          box-shadow: 0 0 0 3px rgba(91, 155, 213, 0.1);
        }

        .search-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--rose-gold, #d4a574) 0%, var(--soft-blue, #5b9bd5) 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .search-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(91, 155, 213, 0.3);
        }

        @media (max-width: 768px) {
          .search-bar {
            min-width: 100%;
          }
        }
      `}</style>
    </form>
  )
}
