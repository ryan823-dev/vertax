# VertaX - GTM Intelligence OS

> 🌍 面向中国企业出海的智能获客平台

[![Website](https://img.shields.io/badge/website-vertax.top-blue)](https://vertax.top)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)

---

## 📖 项目简介

VertaX 是一套以企业知识为底座、同时驱动主动获客和内容增长，并通过协作与平台治理形成闭环的多租户增长操作系统。

**核心能力**：
- 🧠 **知识引擎** - 企业知识沉淀与 AI 能力底座
- 🎯 **获客雷达** - ICP 画像驱动的主动客户发现
- 📈 **增长系统** - SEO/AEO/GEO 内容自动化生产
- 📢 **声量枢纽** - 多平台社媒协同运营
- 🤝 **协作审批** - 跨模块任务与待办管理
- 🏢 **平台治理** - 多租户、API Key、系统配置

**适用客户**：
- 制造业出海企业
- B2B 出海团队
- 成长型出海公司

---

## 🚀 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 14+
- Prisma 5.16+

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

**必需环境变量**：
```env
# 数据库
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# AI 服务
OPENAI_API_KEY="sk-..."

# 邮件服务
RESEND_API_KEY="re_..."
```

### 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 执行数据迁移
npm run db:migrate

# （可选）种子数据
npm run db:seed
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 🏗️ 项目结构

```
vertax/
├── src/
│   ├── app/
│   │   ├── (marketing)/     # 官网营销页面（公开）
│   │   ├── customer/        # 租户端核心业务
│   │   ├── dashboard/       # 决策中心
│   │   ├── (tower)/         # 平台后台
│   │   └── api/             # API 接口
│   ├── components/
│   │   ├── marketing/       # Marketing 组件
│   │   └── ui/              # 共享 UI 组件
│   ├── lib/
│   │   ├── radar/           # 获客雷达核心
│   │   ├── marketing/       # 增长系统核心
│   │   └── design-tokens.ts # 设计令牌
│   └── actions/             # 服务端动作
├── prisma/
│   └── schema.prisma        # 数据库模型
├── docs/
│   └── ARCHITECTURE.md      # 架构文档
└── public/                  # 静态资源
```

**详细说明**：请阅读 [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

##  设计系统

VertaX 采用统一的设计语言：

- **主色调**：金色 `#D4AF37`
- **背景色**：奶油白 `#F7F3EA`
- **深色区块**：`#0B1220`

设计令牌位于 [`src/lib/design-tokens.ts`](src/lib/design-tokens.ts)

---

## 📚 核心文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 业务地图与模块职责详解 |
| [REPOSITORY-GUIDE.md](REPOSITORY-GUIDE.md) | 仓库管理与权限控制指南 |
| [docs/](docs/) | 更多技术文档 |

---

## 🔐 访问控制

本项目采用**目录级权限控制**：

### 公开目录
- `src/app/(marketing)/` - 官网营销页面
- `src/components/marketing/` - Marketing 组件
- `docs/` - 项目文档

### 受保护目录
- `src/app/customer/` - 租户端核心业务
- `src/app/(tower)/` - 平台后台
- `src/lib/radar/` - 获客雷达核心
- `src/lib/marketing/` - 增长系统核心

**详细说明**：请阅读 [REPOSITORY-GUIDE.md](REPOSITORY-GUIDE.md)

---

## 🛠️ 技术栈

- **前端**：Next.js 16 + React 19 + TypeScript 5
- **样式**：TailwindCSS 4 + Radix UI
- **数据库**：PostgreSQL + Prisma ORM
- **认证**：NextAuth.js (Auth.js)
- **AI**：OpenAI API
- **部署**：Vercel

---

## 📦 可用脚本

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 生产构建
npm run start            # 启动生产服务器

# 数据库
npm run db:generate      # 生成 Prisma Client
npm run db:migrate       # 执行数据迁移
npm run db:seed          # 种子数据
npm run db:studio        # Prisma Studio

# 代码质量
npm run lint             # ESLint 检查
```

---

## 🚀 部署

### Vercel 部署

最简单的方式是使用 [Vercel Platform](https://vercel.com/new)：

1. 连接 GitHub 仓库
2. 配置环境变量
3. 自动部署

### 手动部署

```bash
# 生产构建
npm run build

# 启动服务
npm run start
```

**详细部署指南**：[Next.js Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying)

---

## 🤝 贡献

### 代码审查流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

**注意**：敏感目录的 PR 需要 CODEOWNERS 审查。

### 行为准则

- 尊重他人，建设性反馈
- 遵守开源协议
- 保护敏感信息

---

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

- **官网**：[https://vertax.top](https://vertax.top)
- **邮箱**：contact@vertax.top
- **GitHub**：[@ryan823-dev](https://github.com/ryan823-dev)

---

## 🙏 致谢

感谢所有为 VertaX 做出贡献的开发者和用户！

---

**Built with ❤️ by VertaX Team**
