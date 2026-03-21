import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Pagination } from '../components/shared/Pagination'

interface Node {
  id: string
  label: string
  type: string
  properties: Record<string, any>
}

interface SearchResult {
  items: Node[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')

  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&page_size=20`)
        if (!res.ok) throw new Error('搜索失败')
        const data = await res.json()
        setResults(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : '搜索失败')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, page])

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, page: newPage.toString() })
  }

  const getNodeLink = (node: Node) => {
    if (node.type === 'Artist') return `/artist/${node.id}`
    if (node.type === 'Work') return `/artwork/${node.id}`
    if (node.type === 'Period') return `/period/${node.id}`
    if (node.type === 'Organization') return `/organization/${node.id}`
    return '#'
  }

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      Artist: '艺术家',
      Work: '作品',
      Period: '时期',
      Organization: '机构',
      Exhibition: '展览',
      Auction: '拍卖'
    }
    return labels[type] || type
  }

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>搜索结果</h1>
        {query && <p className="search-query">"{query}"</p>}
      </div>

      {loading && <Loading message="搜索中..." />}

      {error && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}

      {!loading && !error && results && (
        <>
          <div className="search-meta">
            找到 {results.total} 个结果
          </div>

          {results.items.length === 0 ? (
            <div className="no-results">
              <p>没有找到相关结果</p>
              <Link to="/" className="back-home">返回首页</Link>
            </div>
          ) : (
            <>
              <div className="search-results">
                {results.items.map((node) => (
                  <Link
                    key={node.id}
                    to={getNodeLink(node)}
                    className="search-result-item"
                  >
                    <div className="result-type">{getNodeTypeLabel(node.type)}</div>
                    <h3 className="result-title">{node.label}</h3>
                    <div className="result-properties">
                      {Object.entries(node.properties).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="result-prop">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>

              <Pagination
                currentPage={results.page}
                totalPages={results.total_pages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </>
      )}

      <style>{`
        .search-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .search-header {
          margin-bottom: 2rem;
        }

        .search-header h1 {
          font-size: 2rem;
          color: var(--ink-text, #2c2825);
          margin-bottom: 0.5rem;
        }

        .search-query {
          font-size: 1.2rem;
          color: var(--charcoal, #4a4541);
          font-style: italic;
        }

        .search-meta {
          margin-bottom: 1.5rem;
          color: var(--charcoal, #4a4541);
          font-size: 0.95rem;
        }

        .search-results {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .search-result-item {
          display: block;
          padding: 1.5rem;
          background: white;
          border: 2px solid var(--pearl-gray, #e8e4df);
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.3s;
        }

        .search-result-item:hover {
          border-color: var(--soft-blue, #5b9bd5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(91, 155, 213, 0.15);
        }

        .result-type {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: var(--silk-cream, #f8f5f0);
          color: var(--rose-gold, #d4a574);
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .result-title {
          font-size: 1.25rem;
          color: var(--ink-text, #2c2825);
          margin-bottom: 0.75rem;
        }

        .result-properties {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .result-prop {
          font-size: 0.9rem;
          color: var(--charcoal, #4a4541);
        }

        .no-results {
          text-align: center;
          padding: 3rem;
        }

        .no-results p {
          font-size: 1.2rem;
          color: var(--charcoal, #4a4541);
          margin-bottom: 1rem;
        }

        .back-home {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: var(--soft-blue, #5b9bd5);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .back-home:hover {
          background: var(--rose-gold, #d4a574);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  )
}
