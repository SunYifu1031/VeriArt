"""
OpenAI 兼容的大语言模型调用。
支持 OpenAI、OpenRouter、Azure、本地/代理等兼容接口。
调用方式与官方示例一致：base_url、api_key、default_headers（如 OpenRouter 的 HTTP-Referer、X-Title）。
"""
import logging

from app.config import (
    VERIART_LLM_API_KEY,
    VERIART_LLM_BASE_URL,
    VERIART_LLM_MODEL,
    VERIART_LLM_TIMEOUT,
    VERIART_LLM_MAX_TOKENS,
    get_llm_default_headers,
    is_llm_available,
)

logger = logging.getLogger(__name__)


async def generate_answer(system_prompt: str, user_message: str) -> str | None:
    """
    根据系统提示与用户问题生成回答。
    未配置或调用失败时返回 None，调用方可回退到模板回答。
    """
    if not is_llm_available() or not VERIART_LLM_API_KEY:
        logger.info("LLM 未调用：未配置 API Key 或 VERIART_LLM_ENABLED=false，将使用模板回答")
        return None
    try:
        from openai import AsyncOpenAI
    except ImportError:
        logger.warning("LLM 未调用：未安装 openai 包，请执行 pip install openai")
        return None

    default_headers = get_llm_default_headers()
    client = AsyncOpenAI(
        api_key=VERIART_LLM_API_KEY,
        base_url=VERIART_LLM_BASE_URL or None,
        default_headers=default_headers if default_headers else None,
    )
    try:
        resp = await client.chat.completions.create(
            model=VERIART_LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=VERIART_LLM_MAX_TOKENS,
            timeout=VERIART_LLM_TIMEOUT,
        )
        choice = resp.choices[0] if resp.choices else None
        if choice and choice.message and choice.message.content:
            return choice.message.content.strip()
    except Exception as e:
        logger.warning("LLM 调用失败，已回退到模板回答：%s", e)
    return None
