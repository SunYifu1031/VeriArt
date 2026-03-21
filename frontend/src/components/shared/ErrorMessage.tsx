interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          重试
        </button>
      )}
      <style>{`
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          min-height: 200px;
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-message {
          color: #e74c3c;
          font-size: 1.1rem;
          text-align: center;
          margin: 0 0 1rem 0;
        }

        .error-retry-btn {
          padding: 0.5rem 1.5rem;
          background: #5b9bd5;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.95rem;
          transition: background 0.2s;
        }

        .error-retry-btn:hover {
          background: #4a8bc2;
        }
      `}</style>
    </div>
  )
}
