"""
问答：先基于知识图谱检索，再视配置用大语言模型生成回答（否则模板回答）。
保证可解释：回答基于检索到的节点与来源，并返回 citations 与 subgraph。
"""
from app.config import VERIART_LLM_MODEL, is_llm_available
from app.kg import get_kg_store
from app.llm import generate_answer
from app.models import QAResponse, Citation, GraphPayload, Node


def _build_context_text(hits: list[Node]) -> str:
    """把检索到的节点整理成供 LLM 使用的上下文文本。"""
    lines = []
    for n in hits:
        props = n.properties or {}
        parts = [f"[{n.type}] {n.label}"]
        for k, v in props.items():
            if v is not None and str(v).strip():
                parts.append(f"  {k}: {v}")
        lines.append("\n".join(parts))
    return "\n\n".join(lines)


def _template_answer(hits: list[Node], q: str) -> str:
    """无 LLM 或 LLM 失败时的模板回答。"""
    works = [n for n in hits if n.type == "Work"]
    artists = [n for n in hits if n.type == "Artist"]
    others = [n for n in hits if n.type not in ("Work", "Artist")]
    parts = []
    if works:
        for w in works[:5]:
            props = w.properties or {}
            name = w.label
            creation = props.get("creation_date", "")
            typ = props.get("type", "")
            dim = props.get("dimensions", "")
            material = props.get("material", "")
            source = props.get("source", "")
            line = f"**{name}**"
            if typ:
                line += f"（{typ}）"
            if creation:
                line += f"，创作年代：{creation}"
            if material:
                line += f"，{material}"
            if dim:
                line += f"，尺寸 {dim}"
            if source:
                line += f"。依据来源：{source}。"
            else:
                line += "。"
            parts.append(line)
    if artists:
        for a in artists[:5]:
            props = a.properties or {}
            name = a.label
            birth = props.get("birth_year", "")
            death = props.get("death_year", "")
            source = props.get("source", "")
            line = f"**{name}**"
            if birth or death:
                line += f"（约 {birth}–{death}）" if death else f"（约 {birth}–）"
            line += "。"
            if source:
                line += f" 依据来源：{source}。"
            parts.append(line)
    for n in others[:3]:
        props = n.properties or {}
        line = f"**{n.label}**（{n.type}）"
        if props:
            line += " " + "；".join(f"{k}: {v}" for k, v in list(props.items())[:4] if v)
        line += "。"
        parts.append(line)
    return "\n\n".join(parts)


SYSTEM_PROMPT = """你是 VeriArt 的艺术品咨询助手，精通中国书画艺术史。

你需要提供两部分内容：

**第一部分：基本介绍（灵活回答）**
- 根据你的艺术史知识，简要介绍用户询问的艺术家、作品或概念
- 包括历史背景、艺术特色、文化意义等基本信息
- 这部分可以自由发挥，展现你的专业知识
- 用 `### 基本介绍` 作为标题

**第二部分：知识图谱验证信息（严格基于检索结果）**
- 仅使用下面「知识图谱检索结果」中的确切信息
- 列出从数据库中查到的具体作品、馆藏信息、尺寸、年代等
- 必须标注信息来源（如：据故宫博物院藏品总目）
- 如果检索结果不足，说明数据库中暂无相关记录
- 用 `### 知识图谱中的相关信息` 作为标题

格式示例：
```
### 基本介绍
[你的专业介绍...]

### 知识图谱中的相关信息
[基于检索结果的具体信息...]
```

使用 Markdown 格式增强可读性。"""


async def answer(query: str) -> QAResponse:
    store = get_kg_store()
    q = (query or "").strip()
    if not q:
        return QAResponse(
            answer="请输入您想了解的艺术家、作品名或相关关键词（如：齐白石、徐悲鸿、清明上河图）。",
            citations=[],
            subgraph=None,
        )

    hits = store.search_nodes(q)

    # 即使没有检索到结果，也让 LLM 提供基本介绍
    citations = store.nodes_to_citations(hits) if hits else []
    node_ids = [n.id for n in hits] if hits else []
    subgraph = store.subgraph_around_nodes(node_ids, depth=1) if node_ids else None

    if hits:
        context = _build_context_text(hits)
        user_message = f"知识图谱检索结果：\n\n{context}\n\n用户问题：{q}"
    else:
        user_message = f"知识图谱检索结果：暂无相关记录\n\n用户问题：{q}\n\n注意：虽然数据库中没有相关信息，但你仍需提供基本介绍，并在第二部分说明数据库中暂无记录。"

    answer_text = await generate_answer(SYSTEM_PROMPT, user_message)
    if answer_text:
        return QAResponse(
            answer=answer_text,
            citations=citations,
            subgraph=subgraph,
            answer_source="llm",
            llm_model=VERIART_LLM_MODEL if is_llm_available() else None,
        )

    # 如果 LLM 失败，使用模板回答
    if not hits:
        answer_text = f"暂未找到与「{q}」相关的数据库记录。\n\n当前知识库以故宫博物院等权威来源的书画作品为主。您可以尝试查询：\n- 著名作品名（如：清明上河图、兰亭序）\n- 书画家名（如：齐白石、徐悲鸿、张大千）"
    else:
        answer_text = _template_answer(hits, q)

    return QAResponse(
        answer=answer_text,
        citations=citations,
        subgraph=subgraph,
        answer_source="template",
        llm_model=None,
    )
