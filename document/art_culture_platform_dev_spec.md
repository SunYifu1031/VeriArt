# 艺术文化知识与体验平台 — 开发规格说明

基于 [art_culture_platform_prd.md](./art_culture_platform_prd.md) 的细化开发文档，供前后端与数据开发落地使用。

---

## 1. 技术栈与架构

### 1.1 总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Web)                            │
│  React + TypeScript + Vite | 图谱: Force-Graph / D3 | 路由: React Router  │
└───────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS / REST + 可选 WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                         Backend (API)                             │
│  FastAPI (Python 3.10+) | 认证: JWT / OAuth2 | 异步 I/O           │
└─────┬─────────────────┬─────────────────┬──────────────────────┘
      │                 │                 │
┌─────▼─────┐   ┌───────▼───────┐   ┌────▼─────┐
│  Neo4j    │   │  PostgreSQL   │   │  Redis   │
│  图数据库   │   │  用户/订单/内容 │   │  缓存/会话 │
└───────────┘   └───────────────┘   └──────────┘
```

- **前端**：SPA，支持 SSR 可选（后续 SEO/首屏）。
- **后端**：RESTful API，统一 JSON；文件上传走 multipart；大结果可分页。
- **图库**：Neo4j 存艺术实体与关系；关系型库存用户、订阅、课程、衍生品等业务数据。

### 1.2 技术选型表

| 层级     | 技术               | 用途说明 |
|----------|--------------------|----------|
| 前端框架 | React 18 + TypeScript | 页面与组件 |
| 构建     | Vite               | 开发/构建 |
| 路由     | React Router v6    | 路由与懒加载 |
| 状态     | Zustand 或 React Query | 全局状态 / 服务端状态 |
| 图谱可视化 | react-force-graph-2d / 3d 或 D3 | 知识图谱、关系网络 |
| 时间线   | 自研或 vis-timeline / Timeline.js | 艺术时间线 |
| 后端     | FastAPI            | API、鉴权、业务逻辑 |
| 图数据库 | Neo4j 5.x          | Artist / Artwork / Movement / Museum 及关系 |
| 关系库   | PostgreSQL 15+     | 用户、订单、课程、内容草稿 |
| 缓存     | Redis 7            | 会话、热点查询、限流 |
| 对象存储 | S3 兼容 (MinIO/AWS) | 图片、VR 资源、课程媒体 |
| AI       | OpenAI-compatible API | 问答、导览、推荐文案 |

### 1.3 目录与仓库建议

```
art-culture-platform/
├── apps/
│   ├── web/                 # 前端 SPA
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── api/
│   │   │   ├── stores/
│   │   │   └── ...
│   │   └── package.json
│   └── api/                 # 后端 FastAPI
│       ├── app/
│       │   ├── api/v1/
│       │   ├── core/
│       │   ├── models/
│       │   ├── services/
│       │   └── ...
│       └── requirements.txt
├── packages/
│   └── graph-schema/        # Neo4j 约束、种子数据、迁移脚本
├── docs/                    # API 文档、部署说明
├── docker-compose.yml       # Neo4j, PostgreSQL, Redis, API
└── README.md
```

---

## 2. 数据模型

### 2.1 Neo4j 图模型（艺术领域）

**节点标签与属性**

| 标签 | 说明 | 主键/唯一 | 属性示例 |
|------|------|-----------|----------|
| `Artist` | 艺术家 | `id` (UUID) | name, name_zh, birth_year, death_year, birth_place, bio_short, image_url |
| `Artwork` | 作品 | `id` (UUID) | title, title_zh, year, medium, dimensions, image_url, description |
| `ArtMovement` | 艺术流派 | `id` (UUID) | name, name_zh, start_year, end_year, description |
| `Museum` | 博物馆/机构 | `id` (UUID) | name, name_zh, country, city, website |
| `Style` | 风格标签 | `id` (UUID) | name, name_zh |
| `Period` | 时期（年代） | `id` (UUID) | label, start_year, end_year |

**关系类型（PRD 对齐）**

| 关系类型 | 起点 | 终点 | 属性示例 |
|----------|------|------|----------|
| `CREATED` | Artist | Artwork | year (可选) |
| `BELONGS_TO_MOVEMENT` | Artwork | ArtMovement | — |
| `PRACTICED_MOVEMENT` | Artist | ArtMovement | role (e.g. founder, member) |
| `INFLUENCED_BY` | Artist | Artist | — |
| `LOCATED_IN` | Artwork | Museum | from_year, to_year（现藏/曾藏） |
| `HAS_STYLE` | Artwork / Artist | Style | — |
| `PART_OF_PERIOD` | Artwork / ArtMovement | Period | — |

**Cypher 约束示例（Neo4j）**

```cypher
CREATE CONSTRAINT artist_id IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT artwork_id IF NOT EXISTS FOR (a:Artwork) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT movement_id IF NOT EXISTS FOR (m:ArtMovement) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT museum_id IF NOT EXISTS FOR (m:Museum) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT style_id IF NOT EXISTS FOR (s:Style) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT period_id IF NOT EXISTS FOR (p:Period) REQUIRE p.id IS UNIQUE;
```

### 2.2 关系型库（PostgreSQL）概要

- **users**：id, email, password_hash, display_name, role, created_at, updated_at。
- **profiles**：user_id, avatar_url, preferences (JSONB)。
- **subscriptions**：user_id, plan (free|basic|premium), started_at, expires_at。
- **courses**：id, title, type (art_history|painting|kids), level, cover_url, description, created_at。
- **course_enrollments**：user_id, course_id, progress (JSONB), enrolled_at。
- **orders**：id, user_id, type (course|merch|subscription), amount, status, created_at。
- **order_items**：order_id, product_type, product_id, quantity, price。

（表结构应在单独 schema 文档中给出 DDL。）

### 2.3 艺术时间线数据来源

- 时间线“刻度”来自：`Period` 节点 + `ArtMovement.start_year/end_year` + `Artwork.year`。
- API 按时间范围查询 Neo4j，聚合为时间线条目（时期、运动、代表作品/艺术家），见下文 API。

---

## 3. API 设计

### 3.1 约定

- Base URL：`/api/v1`。
- 认证：Bearer JWT；可选 API Key（内部/合作）。
- 分页：`page`（从 1）、`page_size`（默认 20，最大 100）。
- 统一错误体：`{ "detail": "...", "code": "ERROR_CODE" }`。

### 3.2 艺术知识模块

| 方法 | 路径 | 说明 | 主要 Query/Body |
|------|------|------|------------------|
| GET | `/artists` | 艺术家列表（支持搜索、筛选） | q, movement_id, period_id, page, page_size |
| GET | `/artists/:id` | 艺术家详情 | — |
| GET | `/artists/:id/artworks` | 该艺术家的作品列表 | page, page_size |
| GET | `/artists/:id/related` | 相关艺术家/流派/作品（图谱 1–2 跳） | limit |
| GET | `/artworks` | 作品列表 | q, artist_id, movement_id, museum_id, page, page_size |
| GET | `/artworks/:id` | 作品详情 | — |
| GET | `/artworks/:id/related` | 相关作品/艺术家 | limit |
| GET | `/movements` | 流派列表 | q, period_id, page, page_size |
| GET | `/movements/:id` | 流派详情 | — |
| GET | `/museums` | 博物馆列表 | country, q, page, page_size |
| GET | `/museums/:id` | 博物馆详情 | — |
| GET | `/graph` | 知识图谱子图（用于关系图） | node_id, node_type, depth=1, limit=50 |
| GET | `/timeline` | 艺术时间线 | from_year, to_year, granularity=decade|century |

### 3.3 艺术家故事模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/artists/:id/story` | 艺术家故事结构：出生、学习、风格形成、代表作品、晚年等（可由 Neo4j + 结构化字段或 CMS 提供） |

### 3.4 探索与推荐

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/explore/today` | 今日艺术家/作品（可基于日期种子随机） |
| GET | `/explore/random` | 随机艺术作品 N 条 |
| GET | `/explore/movements` | 流派探索入口（列表 + 封面） |
| GET | `/recommend/artists` | 推荐艺术家（需 user_id 或 session；冷启动可随机/热门） |
| GET | `/recommend/artworks` | 推荐作品 |
| GET | `/recommend/museums` | 推荐博物馆 |

### 3.5 AI 能力

| 方法 | 路径 | 说明 | Body |
|------|------|------|------|
| POST | `/ai/qa` | 艺术问答 | `{ "query": "印象派有哪些艺术家？" }` |
| POST | `/ai/tour` | 作品/展厅 AI 讲解 | `{ "artwork_id": "...", "language": "zh" }` |
| GET  | `/ai/recommend` | AI 推荐（结合用户行为） | user_id, type=artists|artworks|museums, limit |

### 3.6 用户与业务（MVP 后可扩展）

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`。
- `GET/POST /users/me/profile`。
- `GET /courses`, `GET /courses/:id`, `POST /courses/:id/enroll`。
- `GET /orders`, `POST /orders`（创建订单），`GET /orders/:id`。
- `GET /subscriptions/plans`, `POST /subscriptions/subscribe`。

### 3.7 响应示例（与 PRD 对齐）

**GET /artists/:id**

```json
{
  "id": "uuid",
  "name": "Vincent van Gogh",
  "name_zh": "文森特·梵高",
  "birth_year": 1853,
  "death_year": 1890,
  "birth_place": "Zundert, Netherlands",
  "bio_short": "...",
  "image_url": "https://...",
  "movements": [{ "id": "...", "name": "Post-Impressionism" }],
  "influenced_by": [{ "id": "...", "name": "..." }],
  "representative_artworks": [{ "id": "...", "title": "Starry Night", "image_url": "..." }]
}
```

**GET /timeline**

```json
{
  "entries": [
    {
      "year": 1400,
      "label": "文艺复兴",
      "type": "period",
      "movements": [{ "id": "...", "name": "Renaissance" }],
      "artists": [{ "id": "...", "name": "..." }],
      "artworks": [{ "id": "...", "title": "..." }]
    }
  ]
}
```

---

## 4. 前端页面与路由

### 4.1 路由表

| 路径 | 页面/组件 | 说明 |
|------|-----------|------|
| `/` | Home | 首页：今日艺术、探索入口、时间线入口、VR/学习入口 |
| `/explore` | Explore | 艺术探索：今日艺术家、随机作品、流派探索 |
| `/timeline` | Timeline | 艺术时间线：轴滚动，点击进艺术家/作品 |
| `/vr` | VRGallery | VR 艺术馆入口（MVP 后可实现） |
| `/learn` | Learn | 艺术学习：路线、课程入口 |
| `/artist/:id` | ArtistDetail | 艺术家页：详情、作品、关系图谱、故事 |
| `/artwork/:id` | ArtworkDetail | 作品页：详情、作者、流派、馆藏、相关 |
| `/movement/:id` | MovementDetail | 流派页：简介、艺术家、作品 |
| `/museum/:id` | MuseumDetail | 博物馆页：简介、馆藏作品 |
| `/graph` | GraphView | 全图/子图关系网络（可嵌入或独立页） |
| `/search` | Search | 全局搜索：艺术家、作品、流派、博物馆 |
| `/login`, `/register` | Auth | 登录/注册（MVP 后） |

### 4.2 核心页面规格

**首页**

- 今日艺术：调用 `GET /explore/today`，展示 1 个艺术家 + 1 件作品（可轮播）。
- 艺术探索：卡片入口 → `/explore`。
- 艺术时间线：入口 → `/timeline`。
- VR 艺术馆：入口 → `/vr`。
- 艺术学习：入口 → `/learn`。

**艺术家页**

- 头部：头像、姓名、生卒、流派标签。
- Tab 或区块：简介、代表作品列表、关系图谱（小图）、艺术家故事（时间线式）、相关艺术家/作品。

**作品页**

- 大图、标题、作者、年代、材质、尺寸、馆藏、流派。
- 相关作品、同一作者作品。

**时间线页**

- 横向或纵向时间轴；刻度由 `GET /timeline` 提供。
- 点击刻度或条目进入时期/流派/艺术家/作品详情。

**知识图谱页**

- 从 `GET /graph` 取子图（或全图限制数量）；节点类型区分颜色；点击节点跳转对应详情页。

### 4.3 组件分层

- **layout**：Header、Footer、MainLayout。
- **features**：artist、artwork、movement、museum、timeline、graph、explore、vr、learn。
- **shared**：SearchBar、Card、ImageWithFallback、Pagination、Loading、ErrorBoundary。

---

## 5. AI 集成规格

### 5.1 艺术问答（PRD 6.1）

- 输入：用户自然语言问题。
- 流程：检索 Neo4j（关键词/向量）+ 检索到的实体作为 context 送入 LLM；回答需引用实体（如艺术家、作品名）。
- 输出：结构化答案 + 引用列表（artist_id, artwork_id 等），前端可做来源链接。
- 配置：与现 VeriArt 类似，支持 OpenAI-compatible API（含 OpenRouter）；system prompt 限定“仅基于给定艺术知识回答”。

### 5.2 艺术导览（PRD 6.2）

- 输入：artwork_id（或 museum_id + 展厅 id）。
- 流程：取作品元数据 + 可选博物馆/流派背景 → 生成 1–3 段讲解文案。
- 输出：Markdown 或纯文本；可选 TTS 用。
- 缓存：同一 artwork_id 可缓存 24h，减少调用。

### 5.3 AI 推荐（PRD 6.3）

- 输入：user_id（可选）、type（artists/artworks/museums）、limit。
- 流程：有行为数据则用协同/向量；冷启动用热门或随机；可加 LLM 生成“推荐理由”短句。
- 输出：id 列表 + 理由；前端再请求详情接口拼装。

---

## 6. VR 艺术馆与艺术游戏（第三阶段）

### 6.1 VR 艺术馆（PRD 3.5）

- 形式：360° 全景图或 WebXR；先支持桌面端点击拖拽浏览。
- 内容：展厅 JSON 配置（热点位置、作品 id、讲解音频/文案）。
- 接口：`GET /vr/rooms`、`GET /vr/rooms/:id`（含热点与作品列表）；作品介绍复用 `GET /artworks/:id` 或 `/ai/tour`。
- 技术选型：Three.js + 全景图；或 A-Frame；语音讲解可用浏览器 TTS 或预录音频。

### 6.2 艺术游戏（PRD 3.6）

- **猜作者**：随机一件作品，选项为 4 个艺术家；用 `GET /artworks/random` + 同流派/同时期艺术家。
- **拼图**：名画切块打乱；前端实现；图片来自 Artwork.image_url。
- **猜流派**：随机作品，选项为 4 个流派；用 Artwork 与 ArtMovement 关系。
- 接口：可统一 `GET /games/quiz?type=artist|movement` 返回题目 payload；记录分数可走 PostgreSQL（需登录）。

---

## 7. 开发阶段与任务拆解

### 第一阶段（MVP 核心）

| 序号 | 任务 | 产出 |
|------|------|------|
| 1 | Neo4j 图模型建表与约束 | 约束脚本 + 种子数据（艺术家、作品、流派、博物馆各若干） |
| 2 | 后端：艺术家/作品/流派/博物馆 CRUD 与列表搜索 API | 满足 3.2 节接口 |
| 3 | 后端：`/graph` 子图接口、`/timeline` 时间线接口 | Cypher 与聚合逻辑 |
| 4 | 前端：路由与 Layout、首页框架 | 首页静态区块 + 入口链接 |
| 5 | 前端：艺术家页、作品页、流派页、博物馆页 | 调用上述 API，展示详情与列表 |
| 6 | 前端：知识图谱页（关系图） | 调用 `/graph`，节点可点击跳转 |
| 7 | 前端：时间线页 | 调用 `/timeline`，点击进详情 |
| 8 | 前端：全局搜索 | 调用艺术家/作品/流派搜索，结果聚合 |

### 第二阶段（增强体验）

| 序号 | 任务 | 产出 |
|------|------|------|
| 9 | 艺术家故事数据结构与 API | `GET /artists/:id/story` |
| 10 | 探索模块：今日、随机、流派探索 | `/explore/*`，首页与探索页 |
| 11 | 推荐 API（冷启动 + 简单规则） | `/recommend/*` |
| 12 | AI 问答接入 | `POST /ai/qa`，可解释引用 |
| 13 | 用户与认证（可选） | 注册/登录、JWT、profile |
| 14 | 课程/订单表与基础 API（为商业模式预留） | courses、orders 等 |

### 第三阶段（沉浸与游戏）

| 序号 | 任务 | 产出 |
|------|------|------|
| 15 | VR 艺术馆：房间配置与热点 API | `/vr/rooms` |
| 16 | VR 前端：全景浏览 + 作品热点与讲解 | 一个演示展厅 |
| 17 | 艺术游戏：猜作者 / 猜流派 / 拼图 | 题目 API + 三个小游戏页 |
| 18 | AI 导览与推荐理由 | `/ai/tour`、推荐理由文案 |

---

## 8. 非功能需求

- **性能**：列表接口 P95 &lt; 500ms；图谱子图 &lt; 1s；时间线 &lt; 800ms。
- **可用性**：API 可用性目标 99.5%；前端错误边界与友好提示。
- **安全**：HTTPS；敏感接口限流；密钥与配置走环境变量。
- **SEO**：重要内容页（艺术家、作品、流派）可做 SSR 或静态预渲染（后续迭代）。

---

## 9. 文档与交付物

- **API 文档**：OpenAPI 3.0（FastAPI 自动生成），另存 `docs/openapi.yaml`。
- **图模型文档**：Neo4j 节点/关系清单与示例 Cypher（本说明 2.1 节可导出为独立 doc）。
- **部署说明**：docker-compose 启动 Neo4j/PostgreSQL/Redis/API；前端 build 与托管（Vercel/Nginx 等）。
- **PRD 对照**：本开发文档与 [art_culture_platform_prd.md](./art_culture_platform_prd.md) 的模块与阶段一一对应，便于验收与排期。

---

*文档版本：1.0 | 基于 PRD 艺术文化知识与体验平台*
