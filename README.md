# 星图达人RPA系统

一套完整的达人营销需求分析 + 搜索自动化解决方案。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        星图达人RPA系统                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐      │
│  │   Agent 需求分析系统  │  ────►  │  XinTuRPA 达人搜索   │      │
│  │   (端口: 3001)       │   API   │   (端口: 3000)       │      │
│  │                      │         │                      │      │
│  │  • 上传需求文档       │         │  • 自动启动浏览器    │      │
│  │  • AI智能分析        │ ──────► │  • 登录星图平台      │      │
│  │  • 提取关键词        │ keywords│  • 达人数据抓取      │      │
│  │  • 生成JSON参数      │         │  • 导出CSV结果       │      │
│  └─────────────────────┘         └─────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

端口分配：
  Agent 前端:      http://localhost:5174
  Agent 后端:      http://localhost:3001
  XinTuRPA 前端:   http://localhost:5173
  XinTuRPA 后端:   http://localhost:3000
```

## 快速启动

### 方式一：一键启动（推荐）

```
双击运行 "启动系统.bat"
```

### 方式二：手动启动

```bash
# 终端1 - Agent系统
cd Agent
npm install
npm run server

# 终端2 - XinTuRPA系统
npm install
npm run server
```

### 方式三：开发模式（前端热更新）

```bash
# 终端1 - Agent API
cd Agent && npm run server

# 终端2 - Agent 前端
cd Agent && npm run dev

# 终端3 - XinTuRPA API
npm run server

# 终端4 - XinTuRPA 前端
npm run dev
```

## 完整使用流程

### 第一步：需求分析（Agent系统）

1. 访问 **http://localhost:5174**
2. 上传客户需求文档（支持 .xlsx, .xls, .txt, .md）
3. 或选择需求文档库中的预置文档
4. 点击 **"开始分析"**
5. AI自动分析输出：
   - 目标人群画像
   - 关键词列表（分类显示）
   - JSON格式参数

### 第二步：启动达人搜索

1. 分析完成后，点击 **"🚀 启动星图搜索"**
2. 系统自动：
   - 调用 XinTuRPA API
   - 传递关键词参数
   - 打开星图浏览器

### 第三步：登录并抓取

1. 在XinTuRPA浏览器中登录抖音/星图
2. 点击 **"确认登录"**
3. 关键词已自动加载，可修改/删除/添加
4. 点击 **"开始抓取"**
5. 抓取完成后下载CSV文件

## 功能特性

### Agent 需求分析系统

| 功能 | 说明 |
|------|------|
| 文档上传 | 拖拽上传Excel、TXT、Markdown |
| 需求文档库 | 读取预置文档 |
| AI智能分析 | 提取人群画像和关键词 |
| 关键词分类 | 通用词/核心人群词/圈外人群词 |
| 一键导出 | 导出分析结果JSON |
| 系统串联 | 直接启动XinTuRPA搜索 |

### XinTuRPA 达人搜索系统

| 功能 | 说明 |
|------|------|
| 浏览器自动化 | 自动打开星图平台 |
| 登录管理 | 支持扫码/账号密码，记住状态 |
| 多关键词搜索 | 批量搜索+自动翻页 |
| 数据抓取 | 达人完整信息（60+字段） |
| 实时进度 | 显示抓取进度 |
| CSV导出 | 导出达人数据 |
| 数据看板 | 统计信息和列表展示 |

## 抓取数据字段

### 基本信息
- 昵称、ID、认证类型、地区、性别

### 粉丝数据
- 粉丝数、15天涨粉、30天涨粉、涨粉率

### 内容数据
- 互动率、平均播放、完播率、30天作品数

### 电商数据
- 橱窗状态、电商等级、GMV、GPM、客单价

### 报价数据
- 1-20秒/21-60秒/60秒+报价
- 各时长CPM、CPE报价

### 指数数据
- 星图指数、转化指数、种草指数、传播指数

## 目录结构

```
XinTuRPA/
│
├── Agent/                      # Agent需求分析系统
│   ├── src/
│   │   ├── server.js          # Express后端
│   │   ├── App.vue            # Vue前端
│   │   ├── api/index.js       # API调用
│   │   └── skills/            # AI提示词
│   ├── config.json            # API配置
│   └── package.json
│
├── src/                        # XinTuRPA后端
│   ├── server.js              # Express服务
│   ├── routes/api.js          # API路由
│   ├── browser.js             # Playwright控制
│   ├── search.js              # 搜索逻辑
│   ├── parser.js              # 数据解析
│   ├── storage.js             # 文件存储
│   └── config.js              # 配置管理
│
├── vue-app/                    # XinTuRPA前端
│   └── src/
│       ├── App.vue            # Vue组件
│       └── api/index.js       # API调用
│
├── output/                     # 抓取结果
├── dist/                       # 构建产物
├── config.json                 # XinTuRPA配置
└── 启动系统.bat                # 一键启动
```

## 配置文件

### Agent配置 (Agent/config.json)

```json
{
  "apiKey": "your-api-key",
  "baseURL": "https://open.bigmodel.cn/api/paas/v4",
  "model": "glm-4.5-flash",
  "port": 3001
}
```

### XinTuRPA配置 (config.json)

```json
{
  "browser": "msedge",
  "loginUrl": "https://sso.oceanengine.com/xingtu/login?role=1",
  "marketUrl": "https://www.xingtu.cn/ad/creator/market",
  "maxPages": 3,
  "outputDir": "./output"
}
```

## API接口

### Agent接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传文档 |
| `/api/demand-files` | GET | 文档库列表 |
| `/api/read-demand` | POST | 读取文档 |
| `/api/analyze-sync` | POST | AI分析 |

### XinTuRPA接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/start-browser` | POST | 启动浏览器 |
| `/api/check-login` | POST | 检查登录 |
| `/api/confirm-login` | POST | 确认登录 |
| `/api/start-crawl` | POST | 开始抓取 |
| `/api/start-from-agent` | POST | Agent启动 |
| `/api/status` | GET | 系统状态 |
| `/api/authors` | GET | 达人数据 |
| `/api/files` | GET | 文件列表 |

## 系统要求

- Node.js 18+
- Playwright
- Chrome/Edge/Firefox 浏览器

## 常见问题

**Q: 页面打不开？**
> 运行 `npm run build` 构建前端

**Q: 浏览器没有启动？**
> 检查浏览器配置，确保Playwright驱动已安装

**Q: Agent分析失败？**
> 检查 Agent/config.json 中的 API Key

**Q: 抓取数据为空？**
> 确保已登录星图平台

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Express
- **浏览器**: Playwright
- **AI**: OpenAI / 智谱AI
- **数据**: xlsx
