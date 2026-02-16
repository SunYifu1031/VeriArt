# VeriArt - 艺术品知识图谱与问答系统

VeriArt 是一个基于知识图谱的中国书画艺术品问答系统，结合了大语言模型和结构化知识库，提供可追溯、可验证的艺术信息查询服务。

## 功能特点

- 🎨 **知识图谱可视化**：交互式图谱展示艺术家、作品、拍卖等实体关系
- 💬 **智能问答**：基于LLM的灵活回答 + 知识图谱的精准验证
- 📚 **数据溯源**：每条信息都标注权威来源
- 🔍 **全文检索**：快速查找艺术家、作品信息
- 📊 **丰富数据**：200+位书画家、100+件作品、40+条拍卖记录

## 技术栈

**前端**：
- React + TypeScript
- Vite
- Force-Graph (知识图谱可视化)

**后端**：
- FastAPI (Python)
- In-memory知识图谱
- OpenAI-compatible LLM

## 本地开发

### 后端
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## 环境变量

创建 `backend/.env` 文件：
```
VERIART_LLM_API_KEY=your_api_key_here
VERIART_LLM_BASE_URL=https://openrouter.ai/api/v1
VERIART_LLM_MODEL=openai/gpt-4o-mini
```

## 部署

- 前端：Vercel
- 后端：Railway

## License

MIT
