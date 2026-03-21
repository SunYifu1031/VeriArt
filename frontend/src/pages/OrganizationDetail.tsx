import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loading } from '../components/shared/Loading'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { Card } from '../components/shared/Card'

interface Organization {
  id: string
  label: string
  type: string
  properties: {
    name?: string
    type?: string
    location?: string
    website?: string
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

export function OrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/kg')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        // 查找机构节点
        const orgNode = data.nodes.find((n: any) => n.id === id)
        if (!orgNode) throw new Error('Organization not found')

        setOrganization(orgNode)

        // 查找与该机构相关的作品（收藏、拍卖等）
        const relatedWorks = data.edges
          .filter((e: any) =>
            (e.source === id || e.target === id) &&
            (e.relation === 'collected_by' || e.relation === 'auctioned_by' || e.relation === 'exhibited_at')
          )
          .map((e: any) => {
            const workId = e.source === id ? e.target : e.source
            return data.nodes.find((n: any) => n.id === workId && n.type === 'Work')
          })
          .filter(Boolean)

        setArtworks(relatedWorks)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load organization')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchOrganization()
  }, [id])

  if (loading) {
    return <Loading message="加载机构信息..." />
  }

  if (error || !organization) {
    return (
      <div className="organization-detail">
        <ErrorMessage
          message={error || '机构未找到'}
          onRetry={() => window.location.reload()}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/" className="back-link">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="organization-detail">
      <div className="organization-header">
        <Link to="/" className="back-link">← 返回首页</Link>
        <h1>{organization.label}</h1>
        <div className="organization-meta">
          {organization.properties.type && (
            <span className="org-type">{organization.properties.type}</span>
          )}
          {organization.properties.location && (
            <span className="org-location">{organization.properties.location}</span>
          )}
        </div>
      </div>

      <div className="organization-content">
        <section className="organization-info">
          <h2>基本信息</h2>
          <dl>
            {organization.properties.name && (
              <div className="info-item">
                <dt>名称</dt>
                <dd>{organization.properties.name}</dd>
              </div>
            )}
            {organization.properties.type && (
              <div className="info-item">
                <dt>类型</dt>
                <dd>{organization.properties.type}</dd>
              </div>
            )}
            {organization.properties.location && (
              <div className="info-item">
                <dt>地点</dt>
                <dd>{organization.properties.location}</dd>
              </div>
            )}
            {organization.properties.website && (
              <div className="info-item">
                <dt>网站</dt>
                <dd>
                  <a href={organization.properties.website} target="_blank" rel="noopener noreferrer">
                    {organization.properties.website}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {artworks.length > 0 && (
          <section className="organization-artworks">
            <h2>相关作品 ({artworks.length})</h2>
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
        .organization-detail {
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

        .organization-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: var(--ink-text, #2c2825);
        }

        .organization-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .organization-meta span {
          padding: 0.25rem 0.75rem;
          background: var(--silk-cream, #f8f5f0);
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .org-type {
          color: var(--rose-gold, #d4a574);
          font-weight: 600;
        }

        .org-location {
          color: var(--charcoal, #4a4541);
        }

        .organization-content {
          display: grid;
          gap: 2rem;
        }

        .organization-info h2,
        .organization-artworks h2 {
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

        .artworks-grid {
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
