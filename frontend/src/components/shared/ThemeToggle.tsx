import { useTheme } from '../../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
      <style>{`
        .theme-toggle {
          background: none;
          border: 1px solid var(--pearl-gray);
          color: var(--charcoal);
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .theme-toggle:hover {
          background: var(--gradient-accent);
          border-color: var(--rose-gold);
          transform: translateY(-2px);
          box-shadow: var(--shadow-medium);
        }

        .theme-toggle:active {
          transform: translateY(0);
        }

        [data-theme="dark"] .theme-toggle {
          border-color: rgba(255, 255, 255, 0.2);
          color: #f0f0f0;
        }

        [data-theme="dark"] .theme-toggle:hover {
          background: rgba(212, 165, 116, 0.15);
          border-color: var(--rose-gold);
        }
      `}</style>
    </button>
  )
}
