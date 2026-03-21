import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface CardProps {
  title: string
  subtitle?: string
  description?: ReactNode
  link?: string
  image?: string
  children?: ReactNode
  onClick?: () => void
}

export function Card({ title, subtitle, description, link, image, children, onClick }: CardProps) {
  const content = (
    <div className="card" onClick={onClick}>
      {image && (
        <div className="card-image">
          <img src={image} alt={title} />
        </div>
      )}
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        {description && <div className="card-description">{description}</div>}
        {children}
      </div>
      <style>{`
        .card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: ${onClick || link ? 'pointer' : 'default'};
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .card-image {
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card-content {
          padding: 1.5rem;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          color: #2c2825;
        }

        .card-subtitle {
          font-size: 0.9rem;
          color: #666;
          margin: 0 0 0.5rem 0;
        }

        .card-description {
          font-size: 0.95rem;
          color: #444;
          line-height: 1.5;
          margin: 0;
        }

        .card-description p {
          margin: 0.2rem 0;
        }
      `}</style>
    </div>
  )

  if (link) {
    return <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link>
  }

  return content
}
