import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { QAResponse } from './types'

const API = '/api'

type Message = { role: 'user' | 'assistant'; content: string; qa?: QAResponse }

interface ChatProps {
  onAnswer: (res: QAResponse) => void
}

export function Chat({ onAnswer }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem('veriart_chat_history')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem('veriart_chat_history', JSON.stringify(messages))
  }, [messages])

  const clearHistory = () => {
    if (confirm('确定要清空所有聊天记录吗？')) {
      setMessages([])
      localStorage.removeItem('veriart_chat_history')
    }
  }

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    // 构建历史记录（只保留最近 10 条）
    const currentMessages = messages.slice(-10)
    const history = currentMessages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await fetch(`${API}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, history }),
      })
      const data: QAResponse = await res.json()
      onAnswer(data)
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.answer, qa: data },
      ])
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '未知错误'
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `❌ 请求失败：${errorMsg}\n\n请确认：\n- 后端服务已启动（\`uvicorn app.main:app --reload\`）\n- 后端运行在 http://localhost:8000\n- 网络连接正常`,
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
        {messages.length > 0 && (
          <div className="chat-header">
            <span className="chat-count">共 {messages.length} 条消息</span>
            <button className="chat-clear" onClick={clearHistory} title="清空历史">
              🗑️ 清空
            </button>
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
          <div className="message message-assistant message-loading">
            <div className="message-label">VeriArt</div>
            <div className="message-content">
              <div className="loading-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <span className="loading-text">正在查询知识图谱...</span>
            </div>
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
