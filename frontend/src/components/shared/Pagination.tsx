interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | string)[] = []

  // 始终显示第一页
  pages.push(1)

  // 显示当前页附近的页码
  if (currentPage > 3) {
    pages.push('...')
  }

  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i)
  }

  // 显示最后一页
  if (currentPage < totalPages - 2) {
    pages.push('...')
  }
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        上一页
      </button>

      {pages.map((page, index) => {
        if (page === '...') {
          return <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
        }

        return (
          <button
            key={page}
            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(page as number)}
          >
            {page}
          </button>
        )
      })}

      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        下一页
      </button>

      <style>{`
        .pagination {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          justify-content: center;
          margin: 2rem 0;
        }

        .pagination-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #5b9bd5;
        }

        .pagination-btn.active {
          background: #5b9bd5;
          color: white;
          border-color: #5b9bd5;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-ellipsis {
          padding: 0.5rem;
          color: #666;
        }
      `}</style>
    </div>
  )
}
