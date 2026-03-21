import { useState, useEffect } from 'react'

interface Option {
  id: string
  label: string
}

interface QuizArtist {
  id: string
  label: string
  properties: Record<string, any>
}

interface QuizWork {
  id: string
  label: string
  properties: Record<string, any>
}

interface Quiz {
  mode: string
  question: string
  work?: QuizWork
  artist?: QuizArtist
  options: Option[]
  answer_id: string
}

type GameState = 'idle' | 'playing' | 'answered'

export function Games() {
  const [mode, setMode] = useState<'artist' | 'period'>('artist')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timer, setTimer] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 计时器
  useEffect(() => {
    if (gameState !== 'playing') return
    const interval = setInterval(() => {
      setTimer((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState])

  const fetchQuiz = async () => {
    setLoading(true)
    setError(null)
    setSelected(null)
    setTimer(0)
    try {
      const res = await fetch(`/api/games/quiz?mode=${mode}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || '出题失败')
      }
      const data = await res.json()
      setQuiz(data)
      setGameState('playing')
    } catch (e) {
      setError(e instanceof Error ? e.message : '出题失败')
      setGameState('idle')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (optionId: string) => {
    if (gameState !== 'playing' || !quiz) return
    setSelected(optionId)
    setGameState('answered')
    const correct = optionId === quiz.answer_id
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
    }))
    if (correct) {
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak > bestStreak) {
        setBestStreak(newStreak)
      }
    } else {
      setStreak(0)
    }
  }

  const getOptionClass = (optionId: string) => {
    if (gameState !== 'answered' || !quiz) return 'option-btn'
    if (optionId === quiz.answer_id) return 'option-btn option-correct'
    if (optionId === selected) return 'option-btn option-wrong'
    return 'option-btn option-dim'
  }

  return (
    <div className="games-page">
      <div className="games-header">
        <h1>艺术知识游戏</h1>
        <div className="stats-row">
          {score.total > 0 && (
            <div className="score-badge">
              {score.correct} / {score.total}
              <span className="score-label">答对</span>
            </div>
          )}
          {streak > 0 && (
            <div className="streak-badge">
              🔥 {streak} 连胜
            </div>
          )}
          {bestStreak > 0 && (
            <div className="best-badge">
              🏆 最佳 {bestStreak}
            </div>
          )}
          {gameState === 'playing' && (
            <div className="timer-badge">
              ⏱️ {timer}s
            </div>
          )}
        </div>
      </div>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'artist' ? 'active' : ''}`}
          onClick={() => { setMode('artist'); setQuiz(null); setGameState('idle'); setScore({ correct: 0, total: 0 }); setStreak(0) }}
        >
          🎨 猜作者
        </button>
        <button
          className={`mode-tab ${mode === 'period' ? 'active' : ''}`}
          onClick={() => { setMode('period'); setQuiz(null); setGameState('idle'); setScore({ correct: 0, total: 0 }); setStreak(0) }}
        >
          🏛️ 猜时期
        </button>
        {score.total > 0 && (
          <button
            className="reset-btn"
            onClick={() => { setScore({ correct: 0, total: 0 }); setStreak(0); setQuiz(null); setGameState('idle') }}
          >
            🔄 重置
          </button>
        )}
      </div>

      <div className="game-area">
        {gameState === 'idle' && !loading && (
          <div className="game-start">
            <div className="start-icon">{mode === 'artist' ? '🎨' : '🏛️'}</div>
            <p className="start-desc">
              {mode === 'artist'
                ? '看一件作品，猜猜它是哪位艺术家的创作？'
                : '看一位艺术家，猜猜他/她属于哪个历史时期？'}
            </p>
            <button className="start-btn" onClick={fetchQuiz}>
              开始游戏
            </button>
          </div>
        )}

        {loading && (
          <div className="game-loading">
            <div className="loading-spinner" />
            <p>正在出题...</p>
          </div>
        )}

        {error && (
          <div className="game-error">
            <p>{error}</p>
            <button className="start-btn" onClick={() => setError(null)}>
              返回
            </button>
          </div>
        )}

        {quiz && gameState !== 'idle' && (
          <div className="quiz-card">
            {/* 题目展示 */}
            <div className="quiz-subject">
              {quiz.work && (
                <div className="subject-artwork">
                  <div className="artwork-preview">
                    <span className="artwork-char">{quiz.work.label.slice(0, 2)}</span>
                  </div>
                  <div className="subject-info">
                    <h2 className="subject-title">{quiz.work.label}</h2>
                    {quiz.work.properties.creation_date && (
                      <p className="subject-meta">{quiz.work.properties.creation_date}</p>
                    )}
                    {quiz.work.properties.material && (
                      <p className="subject-meta">{quiz.work.properties.material}</p>
                    )}
                    {quiz.work.properties.current_location && (
                      <p className="subject-meta">📍 {quiz.work.properties.current_location}</p>
                    )}
                  </div>
                </div>
              )}
              {quiz.artist && (
                <div className="subject-artist">
                  <div className="artist-avatar-lg">
                    {quiz.artist.label.slice(0, 1)}
                  </div>
                  <div className="subject-info">
                    <h2 className="subject-title">{quiz.artist.label}</h2>
                    {quiz.artist.properties.birth_year && (
                      <p className="subject-meta">
                        {quiz.artist.properties.birth_year}
                        {quiz.artist.properties.death_year ? ` — ${quiz.artist.properties.death_year}` : ' —'}
                      </p>
                    )}
                    {quiz.artist.properties.specialty && (
                      <p className="subject-meta">{quiz.artist.properties.specialty}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="quiz-question">{quiz.question}</p>

            {/* 选项 */}
            <div className="options-grid">
              {quiz.options.map((opt) => (
                <button
                  key={opt.id}
                  className={getOptionClass(opt.id)}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={gameState === 'answered'}
                >
                  {opt.label}
                  {gameState === 'answered' && opt.id === quiz.answer_id && (
                    <span className="option-check"> ✓</span>
                  )}
                  {gameState === 'answered' && opt.id === selected && opt.id !== quiz.answer_id && (
                    <span className="option-x"> ✗</span>
                  )}
                </button>
              ))}
            </div>

            {/* 答题结果 */}
            {gameState === 'answered' && (
              <div className={`result-banner ${selected === quiz.answer_id ? 'result-correct' : 'result-wrong'}`}>
                {selected === quiz.answer_id ? '🎉 回答正确！' : `❌ 正确答案：${quiz.options.find(o => o.id === quiz.answer_id)?.label}`}
              </div>
            )}

            {gameState === 'answered' && (
              <button className="next-btn" onClick={fetchQuiz}>
                下一题 →
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .games-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .games-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .games-header h1 {
          font-size: 2.5rem;
          color: var(--ink-text, #2c2825);
          margin: 0;
        }

        .stats-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .score-badge,
        .streak-badge,
        .best-badge,
        .timer-badge {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          font-weight: 600;
        }

        .score-badge {
          font-size: 1.5rem;
          color: var(--rose-gold, #d4a574);
          background: rgba(212, 165, 116, 0.1);
          font-family: var(--font-display, serif);
        }

        .score-label {
          font-size: 0.9rem;
          color: var(--charcoal, #4a4541);
          font-weight: 400;
          font-family: var(--font-body, sans-serif);
        }

        .streak-badge {
          font-size: 1.2rem;
          color: #e74c3c;
          background: rgba(231, 76, 60, 0.1);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .best-badge {
          font-size: 1.1rem;
          color: #f39c12;
          background: rgba(243, 156, 18, 0.1);
        }

        .timer-badge {
          font-size: 1.1rem;
          color: var(--soft-blue, #5b9bd5);
          background: rgba(91, 155, 213, 0.1);
        }

        .mode-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .mode-tab {
          flex: 1;
          padding: 0.75rem;
          background: white;
          border: 2px solid var(--pearl-gray, #e8e4df);
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          color: var(--charcoal, #4a4541);
          transition: all 0.3s;
        }

        .mode-tab.active {
          border-color: var(--rose-gold, #d4a574);
          background: rgba(212, 165, 116, 0.08);
          color: var(--rose-gold, #d4a574);
        }

        .mode-tab:hover:not(.active) {
          border-color: var(--soft-blue, #5b9bd5);
          color: var(--soft-blue, #5b9bd5);
        }

        .reset-btn {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 2px solid #e74c3c;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          color: #e74c3c;
          transition: all 0.3s;
        }

        .reset-btn:hover {
          background: rgba(231, 76, 60, 0.08);
          transform: translateY(-1px);
        }

        .game-area {
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .game-start {
          text-align: center;
        }

        .start-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
        }

        .start-desc {
          font-size: 1.1rem;
          color: var(--charcoal, #4a4541);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .start-btn, .next-btn {
          padding: 0.85rem 2.5rem;
          background: linear-gradient(135deg, var(--rose-gold, #d4a574), var(--soft-blue, #5b9bd5));
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 600;
          transition: all 0.3s;
        }

        .start-btn:hover, .next-btn:hover {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 165, 116, 0.35);
        }

        .game-loading, .game-error {
          text-align: center;
          color: var(--charcoal, #4a4541);
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--pearl-gray, #e8e4df);
          border-top-color: var(--rose-gold, #d4a574);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .game-error p {
          color: #e74c3c;
          margin-bottom: 1rem;
        }

        .quiz-card {
          width: 100%;
          background: white;
          border: 1px solid var(--pearl-gray, #e8e4df);
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(44, 40, 37, 0.08);
        }

        .quiz-subject {
          margin-bottom: 1.5rem;
        }

        .subject-artwork {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .artwork-preview {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, rgba(212, 165, 116, 0.12), rgba(91, 155, 213, 0.12));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .artwork-char {
          font-family: var(--font-display, serif);
          font-size: 2.5rem;
          color: var(--charcoal, #4a4541);
          opacity: 0.4;
        }

        .subject-artist {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }

        .artist-avatar-lg {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--rose-gold, #d4a574), var(--soft-blue, #5b9bd5));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          color: white;
          font-weight: 700;
          font-family: var(--font-display, serif);
          flex-shrink: 0;
        }

        .subject-title {
          font-size: 1.5rem;
          color: var(--ink-text, #2c2825);
          margin: 0 0 0.5rem;
        }

        .subject-meta {
          font-size: 0.9rem;
          color: var(--charcoal, #4a4541);
          margin: 0.2rem 0;
          opacity: 0.8;
        }

        .quiz-question {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--ink-text, #2c2825);
          margin: 0 0 1.5rem;
          padding: 1rem;
          background: var(--silk-cream, #f8f5f0);
          border-radius: 8px;
          border-left: 4px solid var(--rose-gold, #d4a574);
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .option-btn {
          padding: 1rem;
          background: white;
          border: 2px solid var(--pearl-gray, #e8e4df);
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          color: var(--ink-text, #2c2825);
          transition: all 0.25s;
          text-align: left;
        }

        .option-btn:hover:not(:disabled) {
          border-color: var(--soft-blue, #5b9bd5);
          background: rgba(91, 155, 213, 0.06);
          transform: translateY(-1px);
        }

        .option-btn:disabled {
          cursor: default;
        }

        .option-correct {
          border-color: #27ae60 !important;
          background: rgba(39, 174, 96, 0.08) !important;
          color: #27ae60;
        }

        .option-wrong {
          border-color: #e74c3c !important;
          background: rgba(231, 76, 60, 0.08) !important;
          color: #e74c3c;
        }

        .option-dim {
          opacity: 0.45;
        }

        .option-check { color: #27ae60; font-weight: 700; }
        .option-x { color: #e74c3c; font-weight: 700; }

        .result-banner {
          text-align: center;
          padding: 1rem;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        .result-correct {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          border: 1px solid rgba(39, 174, 96, 0.3);
        }

        .result-wrong {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.3);
        }

        .next-btn {
          display: block;
          width: 100%;
        }

        @media (max-width: 600px) {
          .games-page { padding: 1rem; }
          .games-header h1 { font-size: 2rem; }
          .stats-row { gap: 0.5rem; }
          .score-badge, .streak-badge, .best-badge, .timer-badge {
            font-size: 0.9rem;
            padding: 0.4rem 0.75rem;
          }
          .mode-tabs { flex-direction: column; }
          .options-grid { grid-template-columns: 1fr; }
          .subject-artwork, .subject-artist { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  )
}
