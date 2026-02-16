import { useState, useEffect, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphPayload } from './types'

interface GraphViewProps {
  subgraph?: GraphPayload | null
}

type GraphNode = { id: string; name: string; type?: string; properties?: any }
type GraphLink = { source: string; target: string; relation?: string }

function buildGraph(data: GraphPayload): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = data.nodes.map((n) => ({
    id: n.id,
    name: n.label,
    type: n.type,
    properties: n.properties,
  }))
  const links: GraphLink[] = data.edges.map((e) => ({
    source: e.source,
    target: e.target,
    relation: e.relation,
  }))
  return { nodes, links }
}

export function GraphView({ subgraph }: GraphViewProps) {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullGraph, setShowFullGraph] = useState(true)

  const fetchGraph = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/kg')
      if (!res.ok) throw new Error(res.statusText)
      const data: GraphPayload = await res.json()
      setGraph(buildGraph(data))
      setShowFullGraph(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载图谱失败')
      setGraph({ nodes: [], links: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载完整图谱（仅首次挂载时）
  useEffect(() => {
    // 只在没有 subgraph prop 时才加载完整图谱
    if (!subgraph) {
      fetchGraph()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在首次挂载时执行

  useEffect(() => {
    // 当有查询结果时，显示子图
    if (subgraph && subgraph.nodes.length > 0) {
      setGraph(buildGraph(subgraph))
      setShowFullGraph(false)
      setLoading(false)
      setError(null)
    } else if (subgraph === null) {
      // 如果明确传入null，说明查询无结果，恢复显示完整图谱
      fetchGraph()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subgraph]) // 只依赖 subgraph，避免无限循环

  // 如果正在加载
  if (loading) {
    return (
      <div className="graph-view">
        <div className="graph-header">
          <h3>知识图谱</h3>
          <span className="graph-hint">加载中...</span>
        </div>
        <div className="graph-canvas">
          <div className="graph-loading">正在加载知识图谱...</div>
        </div>
      </div>
    )
  }

  // 如果有错误
  if (error) {
    return (
      <div className="graph-view">
        <div className="graph-header">
          <h3>知识图谱</h3>
        </div>
        <div className="graph-canvas">
          <div className="graph-error">{error}</div>
        </div>
      </div>
    )
  }

  const hasNodes = graph.nodes.length > 0
  const isQueryResult = subgraph && subgraph.nodes.length > 0

  return (
    <div className="graph-view">
      <div className="graph-header">
        <h3>知识图谱</h3>
        {isQueryResult ? (
          <span className="graph-hint">查询相关子图 ({graph.nodes.length} 个节点)</span>
        ) : hasNodes && showFullGraph ? (
          <span className="graph-hint">完整图谱 ({graph.nodes.length} 个节点)</span>
        ) : (
          <button type="button" className="graph-refresh" onClick={fetchGraph}>
            查看完整图谱
          </button>
        )}
      </div>
      <div className="graph-canvas">
        {hasNodes ? (
          <ForceGraph2D
            graphData={graph}
            nodeLabel={(node: any) => {
              const n = node as GraphNode
              let tooltip = `${n.name} (${n.type || '未知类型'})`
              if (n.properties) {
                const props = Object.entries(n.properties)
                  .filter(([k, v]) => v && k !== 'name' && k !== 'name_zh')
                  .map(([k, v]) => `${k}: ${v}`)
                  .slice(0, 5)
                if (props.length > 0) {
                  tooltip += '\n\n' + props.join('\n')
                }
              }
              return tooltip
            }}
            // 启用节点拖拽
            enableNodeDrag={true}
            // 力导向布局参数 - 让节点自动分散
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            warmupTicks={100}
            cooldownTicks={200}
            nodeCanvasObject={(node: any, ctx) => {
              const n = node as GraphNode & { x?: number; y?: number }
              const label = n.name
              // 文字大小固定，不随缩放改变，这样zoom in时文字会更大
              const fontSize = 16
              const nodeSize = 8

              ctx.font = `bold ${fontSize}px Sans-Serif`

              // 根据类型设置颜色 - 使用更鲜明的颜色
              const typeColors: Record<string, string> = {
                'Work': '#d4a574',         // 玫瑰金 - 作品
                'Artist': '#5b9bd5',       // 柔和蓝 - 艺术家
                'Period': '#7ec8a3',       // 翡翠绿 - 时期
                'Organization': '#e8a87c', // 橙金 - 机构
                'Exhibition': '#c27ba0',   // 紫红 - 展览
                'Auction': '#e74c3c',      // 红色 - 拍卖
              }
              const color = typeColors[n.type || ''] || '#999'

              // 绘制外圈光晕
              const gradient = ctx.createRadialGradient(n.x || 0, n.y || 0, 0, n.x || 0, n.y || 0, nodeSize + 3)
              gradient.addColorStop(0, color)
              gradient.addColorStop(1, color + '30') // 30% 透明度
              ctx.fillStyle = gradient
              ctx.beginPath()
              ctx.arc(n.x || 0, n.y || 0, nodeSize + 3, 0, 2 * Math.PI)
              ctx.fill()

              // 绘制节点主体
              ctx.fillStyle = color
              ctx.beginPath()
              ctx.arc(n.x || 0, n.y || 0, nodeSize, 0, 2 * Math.PI)
              ctx.fill()

              // 节点边框
              ctx.strokeStyle = '#fff'
              ctx.lineWidth = 2
              ctx.stroke()

              // 绘制文字 - 加粗和阴影
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'

              // 文字阴影
              ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
              ctx.shadowBlur = 3
              ctx.shadowOffsetX = 0
              ctx.shadowOffsetY = 0

              ctx.fillStyle = '#2c2825'
              ctx.fillText(label, n.x || 0, (n.y || 0) + nodeSize + 12)

              // 重置阴影
              ctx.shadowColor = 'transparent'
              ctx.shadowBlur = 0
            }}
            linkLabel={(link: any) => link.relation || ''}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkColor={() => '#999'}
            linkWidth={2}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
          />
        ) : (
          <div className="graph-empty">
            正在加载知识图谱...
          </div>
        )}
      </div>
    </div>
  )
}
