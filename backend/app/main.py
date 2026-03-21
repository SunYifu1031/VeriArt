import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import GraphPayload, QARequest, QAResponse, PaginatedResponse, Node
from app.kg import get_kg_store
from app.qa import answer
from app.config import is_llm_available, VERIART_LLM_MODEL, VERIART_LLM_ENABLED, VERIART_LLM_API_KEY, VERIART_LLM_BASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VeriArt API",
    description="""
    艺术品知识图谱与可解释问答 API

    ## 功能特性

    * **知识图谱查询** - 获取完整图谱或局部子图
    * **智能问答** - 基于知识图谱的可解释问答，支持 LLM
    * **搜索功能** - 全局搜索艺术家、作品等实体
    * **分页支持** - 所有列表接口支持分页

    ## 主要端点

    * `/api/kg` - 获取完整知识图谱
    * `/api/kg/around` - 获取节点周围的子图
    * `/api/qa` - 智能问答
    * `/api/search` - 全局搜索
    * `/api/artists` - 艺术家列表
    * `/api/artworks` - 作品列表
    """,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_log():
    if is_llm_available():
        logger.info("VeriArt LLM 已配置: 模型=%s, Base URL=%s", VERIART_LLM_MODEL, VERIART_LLM_BASE_URL or "(默认)")
    else:
        logger.warning(
            "VeriArt LLM 未配置: VERIART_LLM_ENABLED=%s, API Key=%s。问答将使用模板回答。请在 backend/.env 中设置 VERIART_LLM_API_KEY 并重启。",
            VERIART_LLM_ENABLED,
            "已设置" if VERIART_LLM_API_KEY else "未设置",
        )


@app.get("/api/kg", response_model=GraphPayload)
def get_kg():
    """返回完整知识图谱（节点与边），供前端可视化。"""
    return get_kg_store().get_full_graph()


@app.get("/api/kg/around", response_model=GraphPayload)
def get_kg_around(node_ids: str = "", depth: int = 1):
    """根据节点 ID 列表返回局部子图。node_ids 逗号分隔。"""
    ids = [x.strip() for x in (node_ids or "").split(",") if x.strip()]
    if not ids:
        return get_kg_store().get_full_graph()
    return get_kg_store().subgraph_around_nodes(ids, depth=depth)


@app.post("/api/qa", response_model=QAResponse)
async def qa(req: QARequest):
    """基于知识图谱的问答，可选大语言模型生成；返回可解释答案、引用与相关子图。支持多轮对话历史。"""
    return await answer(req.query, history=req.history)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_configured": is_llm_available(),
        "llm_model": VERIART_LLM_MODEL if is_llm_available() else None,
    }


@app.get("/api/search")
def search(q: str = "", page: int = 1, page_size: int = 20):
    """全局搜索节点，支持分页"""
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    nodes, total = get_kg_store().search_nodes(q, page, page_size)
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=nodes,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@app.get("/api/artists")
def get_artists(page: int = 1, page_size: int = 20):
    """获取艺术家列表，支持分页"""
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    store = get_kg_store()
    all_artists = [n for n in store._nodes if n.type == "Artist"]
    total = len(all_artists)

    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_artists[start:end]
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=paginated,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@app.get("/api/artists/{artist_id}")
def get_artist(artist_id: str):
    """获取单个艺术家详情"""
    node = get_kg_store().get_node(artist_id)
    if not node:
        return {"error": "Artist not found"}, 404
    return node


@app.get("/api/artworks")
def get_artworks(page: int = 1, page_size: int = 20):
    """获取作品列表，支持分页"""
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    store = get_kg_store()
    all_artworks = [n for n in store._nodes if n.type == "Work"]
    total = len(all_artworks)

    start = (page - 1) * page_size
    end = start + page_size
    paginated = all_artworks[start:end]
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=paginated,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@app.get("/api/artworks/{artwork_id}")
def get_artwork(artwork_id: str):
    """获取单个作品详情"""
    node = get_kg_store().get_node(artwork_id)
    if not node:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Artwork not found")
    return node


@app.get("/api/timeline")
def get_timeline():
    """获取时间线数据，按年代聚合艺术家和作品"""
    store = get_kg_store()

    # 收集所有时期节点
    periods = [n for n in store._nodes if n.type == "Period"]

    # 为每个时期收集相关的艺术家和作品
    timeline_data = []
    for period in periods:
        period_data = {
            "id": period.id,
            "label": period.label,
            "start_year": period.properties.get("start_year"),
            "end_year": period.properties.get("end_year"),
            "artists": [],
            "artworks": []
        }

        # 查找属于该时期的艺术家和作品
        for edge in store._edges:
            if edge.target == period.id and edge.relation == "belongs_to":
                node = store.get_node(edge.source)
                if node:
                    if node.type == "Artist":
                        period_data["artists"].append({
                            "id": node.id,
                            "label": node.label,
                            "birth_year": node.properties.get("birth_year"),
                            "death_year": node.properties.get("death_year")
                        })
                    elif node.type == "Work":
                        period_data["artworks"].append({
                            "id": node.id,
                            "label": node.label,
                            "creation_date": node.properties.get("creation_date")
                        })

        timeline_data.append(period_data)

    # 按开始年份排序
    timeline_data.sort(key=lambda x: int(x["start_year"]) if x["start_year"] else 0)

    return {"timeline": timeline_data}


@app.get("/api/explore/today")
def explore_today():
    """今日艺术 - 随机推荐一位艺术家和一件作品"""
    import random
    store = get_kg_store()

    artists = [n for n in store._nodes if n.type == "Artist"]
    artworks = [n for n in store._nodes if n.type == "Work"]

    featured_artist = random.choice(artists) if artists else None
    featured_artwork = random.choice(artworks) if artworks else None

    return {
        "artist": featured_artist,
        "artwork": featured_artwork
    }


@app.get("/api/stats")
def get_stats():
    """获取知识图谱统计信息"""
    store = get_kg_store()
    type_counts: dict[str, int] = {}
    for n in store._nodes:
        type_counts[n.type] = type_counts.get(n.type, 0) + 1

    relation_counts: dict[str, int] = {}
    for e in store._edges:
        relation_counts[e.relation] = relation_counts.get(e.relation, 0) + 1

    return {
        "total_nodes": len(store._nodes),
        "total_edges": len(store._edges),
        "node_types": type_counts,
        "relation_types": relation_counts,
    }


@app.get("/api/explore/random")
def explore_random(type: str = "all", count: int = 6):
    """随机发现 - 随机返回指定类型的节点"""
    import random
    store = get_kg_store()

    if count < 1 or count > 20:
        count = 6

    if type == "artist":
        nodes = [n for n in store._nodes if n.type == "Artist"]
    elif type == "artwork":
        nodes = [n for n in store._nodes if n.type == "Work"]
    elif type == "period":
        nodes = [n for n in store._nodes if n.type == "Period"]
    else:
        nodes = store._nodes

    random_nodes = random.sample(nodes, min(count, len(nodes)))
    return {"items": random_nodes}


@app.get("/api/artists/{artist_id}/story")
async def get_artist_story(artist_id: str):
    """获取艺术家故事（AI 生成的艺术生涯叙述）"""
    from fastapi import HTTPException
    from app.llm import generate_answer

    store = get_kg_store()
    artist = store.get_node(artist_id)
    if not artist or artist.type != "Artist":
        raise HTTPException(status_code=404, detail="Artist not found")

    # 获取该艺术家相关的作品
    works_nodes, _ = store.get_neighbors(artist_id, depth=1)
    works = [n for n in works_nodes if n.type == "Work" and n.id != artist_id]

    props = artist.properties or {}
    birth = props.get("birth_year", "")
    death = props.get("death_year", "")
    specialty = props.get("specialty", "")
    source = props.get("source", "")

    works_desc = ""
    if works:
        works_list = []
        for w in works[:10]:
            wp = w.properties or {}
            line = w.label
            if wp.get("creation_date"):
                line += f"（{wp['creation_date']}）"
            if wp.get("material"):
                line += f"，{wp['material']}"
            if wp.get("current_location"):
                line += f"，现藏于{wp['current_location']}"
            works_list.append(line)
        works_desc = "\n".join(f"- {l}" for l in works_list)

    system_prompt = """你是一位精通中国艺术史的学者，擅长用生动优美的文字讲述艺术家的人生故事。
请以第三人称叙事风格，撰写一篇关于艺术家的艺术生涯故事，包含：
1. 早年经历与学艺过程
2. 艺术风格的形成与发展
3. 代表性作品与艺术成就
4. 对后世的影响与历史地位

要求：
- 语言优美流畅，富有文学性
- 基于已知历史事实，避免凭空捏造具体日期或事件
- 如提及知识图谱中的作品，需自然融入叙事
- 篇幅约 400-600 字
- 使用 Markdown 格式，适当分段"""

    artist_info = f"艺术家：{artist.label}"
    if birth:
        artist_info += f"\n生卒年：{birth}"
        if death:
            artist_info += f" — {death}"
    if specialty:
        artist_info += f"\n专长：{specialty}"
    if source:
        artist_info += f"\n数据来源：{source}"
    if works_desc:
        artist_info += f"\n\n知识图谱中的相关作品：\n{works_desc}"

    story = await generate_answer(system_prompt, artist_info)

    if not story:
        # 无 LLM 时返回基础模板
        years = f"{birth} — {death}" if birth and death else (birth or "")
        story = f"## {artist.label}\n\n"
        if years:
            story += f"**生卒年**：{years}\n\n"
        if specialty:
            story += f"**专长**：{specialty}\n\n"
        if works:
            story += f"**知识图谱中的相关作品**：\n{works_desc}\n\n"
        story += "_（暂未配置 LLM，无法生成 AI 故事。请在 backend/.env 中配置 VERIART_LLM_API_KEY。）_"

    return {"artist_id": artist_id, "artist_name": artist.label, "story": story}


@app.get("/api/games/quiz")
def get_quiz(mode: str = "artist"):
    """艺术游戏：猜作者或猜流派。返回一道题目和 4 个选项。"""
    import random
    from fastapi import HTTPException

    store = get_kg_store()

    if mode == "artist":
        # 从有 CREATED_BY 关系的作品中随机选一件
        work_artist_pairs: list[tuple] = []
        for edge in store._edges:
            if edge.relation == "CREATED_BY":
                work = store.get_node(edge.source)
                artist = store.get_node(edge.target)
                if work and artist:
                    work_artist_pairs.append((work, artist))

        if len(work_artist_pairs) < 4:
            raise HTTPException(status_code=400, detail="数据不足，无法出题")

        question_pair = random.choice(work_artist_pairs)
        question_work, correct_artist = question_pair

        # 从其他艺术家中选 3 个干扰选项
        all_artists = [n for n in store._nodes if n.type == "Artist" and n.id != correct_artist.id]
        distractors = random.sample(all_artists, min(3, len(all_artists)))
        options = [correct_artist] + distractors
        random.shuffle(options)

        return {
            "mode": "artist",
            "question": f"这件作品「{question_work.label}」的创作者是谁？",
            "work": {
                "id": question_work.id,
                "label": question_work.label,
                "properties": question_work.properties,
            },
            "options": [{"id": a.id, "label": a.label} for a in options],
            "answer_id": correct_artist.id,
        }

    elif mode == "period":
        # 猜时期：给出艺术家，猜他所属的时期
        artist_period_pairs: list[tuple] = []
        for edge in store._edges:
            if edge.relation in ("belongs_to", "PART_OF"):
                artist = store.get_node(edge.source)
                period = store.get_node(edge.target)
                if artist and artist.type == "Artist" and period and period.type == "Period":
                    artist_period_pairs.append((artist, period))

        if len(artist_period_pairs) < 4:
            raise HTTPException(status_code=400, detail="数据不足，无法出题")

        question_pair = random.choice(artist_period_pairs)
        question_artist, correct_period = question_pair

        all_periods = [n for n in store._nodes if n.type == "Period" and n.id != correct_period.id]
        distractors = random.sample(all_periods, min(3, len(all_periods)))
        options = [correct_period] + distractors
        random.shuffle(options)

        return {
            "mode": "period",
            "question": f"艺术家「{question_artist.label}」属于哪个历史时期？",
            "artist": {
                "id": question_artist.id,
                "label": question_artist.label,
                "properties": question_artist.properties,
            },
            "options": [{"id": p.id, "label": p.label} for p in options],
            "answer_id": correct_period.id,
        }

    raise HTTPException(status_code=400, detail="mode 参数无效，支持 artist 或 period")


