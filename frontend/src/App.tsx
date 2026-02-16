import { useState } from 'react'
import { Chat } from './Chat'
import './App.css'
import { GraphView } from './GraphView'
import { Citations } from './Citations'
import type { QAResponse } from './types'

function App() {
  const [lastQA, setLastQA] = useState<QAResponse | null>(null)
  const [graphKey, setGraphKey] = useState(0)

  const onAnswer = (res: QAResponse) => {
    setLastQA(res)
    setGraphKey((k) => k + 1)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>VeriArt</h1>
        <p className="tagline">在艺术与时间的流转中，以智能与可信技术为线索，追踪作品的来历与脉络，汇聚多源信息与数字印记，呈现可追溯、可印证的清晰依据，让每一次判断都建立在被看见的真实之上。</p>
      </header>
      <main className="main">
        <section className="chat-section">
          <Chat onAnswer={onAnswer} />
          {lastQA && lastQA.citations.length > 0 && (
            <Citations citations={lastQA.citations} />
          )}
        </section>
        <section className="graph-section">
          <GraphView key={graphKey} subgraph={lastQA?.subgraph} />
        </section>
      </main>
    </div>
  )
}

export default App
