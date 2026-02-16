import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { QAResponse } from './types'

const API = '/api'

type Message = { role: 'user' | 'assistant'; content: string; qa?: QAResponse }

interface ChatProps {
  onAnswer: (res: QAResponse) => void
}

export function Chat({ onAnswer }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch(`${API}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data: QAResponse = await res.json()
      onAnswer(data)
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.answer, qa: data },
      ])
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: '请求失败，请确认后端已启动（如 `uvicorn app.main:app --reload`）。',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-placeholder">
            输入作品名、作者或关键词查询，例如：清明上河图、张择端、兰亭序、故宫
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-label">{msg.role === 'user' ? '您' : 'VeriArt'}</div>
            <div className="message-content">
              {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === 'assistant' && msg.qa && (
              <div className="message-source">
                {msg.qa.answer_source === 'llm' && msg.qa.llm_model
                  ? `由大模型生成 (${msg.qa.llm_model})`
                  : msg.qa.answer_source === 'template'
                    ? '模板回答（未配置或 LLM 调用未成功）'
                    : null}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message message-assistant">
            <div className="message-label">VeriArt</div>
            <div className="message-content">查询知识图谱中…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="输入问题…"
          disabled={loading}
        />
        <button className="chat-send" onClick={send} disabled={loading}>
          发送
        </button>
      </div>
    </div>
  )
}
