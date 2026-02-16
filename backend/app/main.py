import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import GraphPayload, QARequest, QAResponse
from app.kg import get_kg_store
from app.qa import answer
from app.config import is_llm_available, VERIART_LLM_MODEL, VERIART_LLM_ENABLED, VERIART_LLM_API_KEY, VERIART_LLM_BASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VeriArt API",
    description="艺术品知识图谱与可解释问答 API",
    version="0.1.0",
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
    """基于知识图谱的问答，可选大语言模型生成；返回可解释答案、引用与相关子图。"""
    return await answer(req.query)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_configured": is_llm_available(),
        "llm_model": VERIART_LLM_MODEL if is_llm_available() else None,
    }
