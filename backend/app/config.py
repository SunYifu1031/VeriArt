"""
LLM 与运行配置，从环境变量读取。
支持 .env 文件（需安装 python-dotenv）。
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    # 先读当前工作目录，再读 backend/.env（后者优先，保证从任意目录启动都能读到 backend/.env）
    load_dotenv()
    _backend_dir = Path(__file__).resolve().parent.parent
    _env_path = _backend_dir / ".env"
    load_dotenv(_env_path)
except ImportError:
    pass


def _str(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip()
    return v if v else None


def _bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in ("1", "true", "yes", "on")


# ----------------------------
# LLM 配置（大语言模型）
# ----------------------------

# 是否启用 LLM 生成回答（未配置 API Key 或设为 false 时使用模板回答）
VERIART_LLM_ENABLED: bool = _bool(os.environ.get("VERIART_LLM_ENABLED", "true"))

# API Key（必填项，若使用 OpenAI 或兼容接口）
VERIART_LLM_API_KEY: str | None = _str(os.environ.get("VERIART_LLM_API_KEY"))

# 接口地址（可选。不填则用 OpenAI 默认；兼容 OpenAI 的本地/代理可填，如 https://api.openai.com/v1 或 本地 base URL）
VERIART_LLM_BASE_URL: str | None = _str(os.environ.get("VERIART_LLM_BASE_URL"))

# 模型名称（如 gpt-4o-mini, gpt-4o, deepseek-chat 等）
VERIART_LLM_MODEL: str = _str(os.environ.get("VERIART_LLM_MODEL")) or "gpt-4o-mini"

# 超时（秒）
VERIART_LLM_TIMEOUT: int = int(os.environ.get("VERIART_LLM_TIMEOUT", "60"))

# 最大 token 数（回答长度上限）
VERIART_LLM_MAX_TOKENS: int = int(os.environ.get("VERIART_LLM_MAX_TOKENS", "1024"))

# OpenRouter 等可选请求头（用于统计/排名等）
# HTTP-Referer: 站点 URL
# X-Title: 站点名称
VERIART_LLM_HTTP_REFERER: str | None = _str(os.environ.get("VERIART_LLM_HTTP_REFERER"))
VERIART_LLM_X_TITLE: str | None = _str(os.environ.get("VERIART_LLM_X_TITLE"))


def get_llm_default_headers() -> dict[str, str]:
    """供 OpenRouter 等使用的 default_headers，仅包含已配置的项。"""
    h: dict[str, str] = {}
    if VERIART_LLM_HTTP_REFERER:
        h["HTTP-Referer"] = VERIART_LLM_HTTP_REFERER
    if VERIART_LLM_X_TITLE:
        h["X-Title"] = VERIART_LLM_X_TITLE
    return h


def is_llm_available() -> bool:
    """是否已配置并可调用 LLM（启用且存在 API Key）。"""
    return bool(VERIART_LLM_ENABLED and VERIART_LLM_API_KEY)
