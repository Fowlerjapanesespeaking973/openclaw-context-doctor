# OpenClaw Context Doctor 快速开始

这是一个独立的 Next.js 16 demo，用来把 agent 启动前已经消耗掉多少上下文预算可视化出来。

它会展示：

- 标准 bootstrap 文件，例如 `AGENTS.md`、`TOOLS.md`、`MEMORY.md`
- 扫描到的 skills
- system prompt / workspace files / tool metadata 各自大概占了多少 token
- 最后大概还剩多少 token 可以留给真正的对话

## 1. 安装

```bash
pnpm install
cp .env.example .env.local
```

## 2. 配置 `.env.local`

```env
CONTEXT_DOCTOR_ALLOWED_ROOTS=/Users/your-name/Documents/Web,/Users/your-name/.openclaw/workspace
CONTEXT_DOCTOR_WORKSPACE=/Users/your-name/Documents/Web/example-project
CONTEXT_DOCTOR_CTX_SIZE=200000
```

说明：

- `CONTEXT_DOCTOR_ALLOWED_ROOTS`
  - 允许扫描的目录白名单，多个路径用逗号分隔
  - 没配这个变量时，`Local Scan` 会直接报错，但 `Demo Snapshot` 还能正常用
- `CONTEXT_DOCTOR_WORKSPACE`
  - 可选的默认扫描目录
  - 页面里不填路径时，会回退到这里
- `CONTEXT_DOCTOR_CTX_SIZE`
  - 可选的默认上下文窗口大小

## 3. 启动

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 4. 两种模式

### Demo Snapshot

- 走 `GET /api/context-doctor/mock`
- 内置 mock 数据
- 适合演示、截图、给别人先看概念

### Local Scan

- 走 `POST /api/context-doctor/scan`
- 扫描真实本地目录
- 只有在路径位于 `CONTEXT_DOCTOR_ALLOWED_ROOTS` 里时才允许
- 更适合本地运行，不建议在公开预览站默认开启

## 5. API 示例

获取 demo 数据：

```bash
curl http://localhost:3000/api/context-doctor/mock
```

扫描真实目录：

```bash
curl -X POST http://localhost:3000/api/context-doctor/scan \
  -H "Content-Type: application/json" \
  -d '{"workspacePath":"/Users/you/Documents/Web/project","ctxSize":200000}'
```

## 6. 测试和构建

运行测试：

```bash
pnpm test
```

跑生产构建：

```bash
pnpm build
```

## 7. 这个 demo 没做什么

这个仓库刻意没有带上：

- Supabase
- 远端 VPS snapshot 拉取
- 原来更大的 Office / ops 页面
- 营销站内容

它的目标不是完整产品，而是一个干净、可演示、可二次开发的 reference implementation。
