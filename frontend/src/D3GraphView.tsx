import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import type { GraphPayload } from './types'

interface D3GraphViewProps {
  subgraph?: GraphPayload | null
}

type GraphNode = {
  id: string
  name: string
  type?: string
  properties?: any
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

type GraphLink = {
  source: string | GraphNode
  target: string | GraphNode
  relation?: string
}

function buildGraph(data: GraphPayload): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = data.nodes.map((n) => ({
    id: n.id,
    name: n.label,
    type: n.type,
    properties: n.properties,
  }))
  const nodeIds = new Set(nodes.map((n) => n.id))
  const links: GraphLink[] = data.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
    }))
  return { nodes, links }
}

export function D3GraphView({ subgraph }: D3GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const navigate = useNavigate()
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

  // 初始加载完整图谱
  useEffect(() => {
    if (!subgraph) {
      fetchGraph()
    }
  }, [])

  useEffect(() => {
    if (subgraph && subgraph.nodes.length > 0) {
      setGraph(buildGraph(subgraph))
      setShowFullGraph(false)
      setLoading(false)
      setError(null)
    } else if (subgraph === null) {
      fetchGraph()
    }
  }, [subgraph])

  // D3 渲染逻辑
  useEffect(() => {
    if (!svgRef.current || graph.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // 清空之前的内容
    svg.selectAll('*').remove()

    // 创建容器组，用于缩放和平移
    const g = svg.append('g')

    // 添加缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // 节点类型颜色映射（使用设计系统颜色）
    const typeColors: Record<string, string> = {
      'Work': '#d4a574',      // 作品 - 玫瑰金
      'Artist': '#5b9bd5',    // 艺术家 - 柔和蓝
      'Period': '#7ec8a3',    // 时期 - 翡翠绿
      'Organization': '#e8a87c', // 机构 - 暖橙
      'Exhibition': '#c27ba0',   // 展览 - 紫罗兰
      'Auction': '#e74c3c',      // 拍卖 - 红色
    }

    // 节点大小映射（根据类型）
    const getNodeRadius = (type?: string) => {
      const sizeMap: Record<string, number> = {
        'Artist': 12,      // 艺术家较大
        'Work': 10,        // 作品中等
        'Period': 14,      // 时期最大
        'Organization': 11, // 机构中等偏大
        'Exhibition': 9,    // 展览较小
        'Auction': 9,       // 拍卖较小
      }
      return sizeMap[type || ''] || 10
    }

    // 获取节点跳转路径
    const getNodePath = (node: GraphNode): string | null => {
      switch (node.type) {
        case 'Artist':
          return `/artist/${node.id}`
        case 'Work':
          return `/artwork/${node.id}`
        case 'Period':
          return `/period/${node.id}`
        case 'Organization':
          return `/organization/${node.id}`
        default:
          return null
      }
    }

    // 创建力导向模拟
    const simulation = d3.forceSimulation<GraphNode>(graph.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graph.links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    // 绘制连线
    const link = g.append('g')
      .selectAll('line')
      .data(graph.links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)

    // 绘制箭头
    svg.append('defs').selectAll('marker')
      .data(['arrow'])
      .join('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#999')
      .attr('d', 'M0,-5L10,0L0,5')

    link.attr('marker-end', 'url(#arrow)')

    // 绘制连线标签
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(graph.links)
      .join('text')
      .attr('font-size', 10)
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.relation || '')

    // 创建节点组
    const node = g.append('g')
      .selectAll('g')
      .data(graph.nodes)
      .join('g')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    // 绘制节点圆圈
    node.append('circle')
      .attr('r', d => getNodeRadius(d.type))
      .attr('fill', d => typeColors[d.type || ''] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2.5)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))')

    // 添加节点点击事件
    node.on('click', function(event, d) {
      event.stopPropagation()
      const path = getNodePath(d)
      if (path) {
        navigate(path)
      }
    })

    // 绘制节点标签
    node.append('text')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', 20)
      .attr('font-size', 12)
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('fill', '#2c2825')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // 添加节点悬停效果
    node.on('mouseenter', function(event, d) {
      const radius = getNodeRadius(d.type)
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', radius * 1.5)
        .attr('stroke-width', 4)

      // 高亮相关连线
      link.attr('stroke-opacity', l => {
        const linkData = l as GraphLink
        return (linkData.source as GraphNode).id === d.id ||
               (linkData.target as GraphNode).id === d.id ? 1 : 0.1
      })
      .attr('stroke-width', l => {
        const linkData = l as GraphLink
        return (linkData.source as GraphNode).id === d.id ||
               (linkData.target as GraphNode).id === d.id ? 3 : 2
      })

      // 显示详细信息
      showTooltip(event, d)
    })
    .on('mouseleave', function(_event, d) {
      const radius = getNodeRadius(d.type)
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', radius)
        .attr('stroke-width', 2.5)

      link.attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2)

      hideTooltip()
    })

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(44, 40, 37, 0.95)')
      .style('color', '#fff')
      .style('padding', '12px 16px')
      .style('border-radius', '8px')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
      .style('max-width', '300px')

    function showTooltip(event: any, d: GraphNode) {
      const path = getNodePath(d)
      let html = `<div style="margin-bottom: 8px;"><strong style="font-size: 14px;">${d.name}</strong></div>`
      html += `<div style="color: #e8e4df; margin-bottom: 4px;">类型: ${d.type || '未知'}</div>`

      if (d.properties) {
        const props = Object.entries(d.properties)
          .filter(([k, v]) => v && k !== 'name' && k !== 'name_zh')
          .slice(0, 4)
        if (props.length > 0) {
          html += '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(232, 228, 223, 0.3);">'
          html += props.map(([k, v]) => `<div style="color: #e8e4df; margin: 2px 0;">${k}: ${v}</div>`).join('')
          html += '</div>'
        }
      }

      if (path) {
        html += '<div style="margin-top: 8px; color: #5b9bd5; font-size: 11px;">点击查看详情 →</div>'
      }

      tooltip.html(html)
        .style('visibility', 'visible')
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
    }

    function hideTooltip() {
      tooltip.style('visibility', 'hidden')
    }

    // 拖拽函数
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      linkLabel
        .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // 清理函数
    return () => {
      simulation.stop()
      tooltip.remove()
    }
  }, [graph])

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
        <h3>知识图谱 (D3.js)</h3>
        {isQueryResult ? (
          <span className="graph-hint">查询相关子图 ({graph.nodes.length} 个节点)</span>
        ) : hasNodes && showFullGraph ? (
          <span className="graph-hint">完整图谱 ({graph.nodes.length} 个节点) - 可拖拽、缩放</span>
        ) : (
          <button type="button" className="graph-refresh" onClick={fetchGraph}>
            查看完整图谱
          </button>
        )}
      </div>
      <div className="graph-canvas">
        {hasNodes ? (
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="graph-empty">正在加载知识图谱...</div>
        )}
      </div>
    </div>
  )
}
