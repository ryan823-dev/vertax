# VertaX 获客平台 - 使用手册

**版本**: v2.0  
**最后更新**: 2026-03-17  
**文档状态**: 完整版

---

## 📋 目录

1. [平台概览](#平台概览)
2. [访问地址](#访问地址)
3. [账号信息](#账号信息)
4. [快速入门](#快速入门)
5. [功能模块](#功能模块)
6. [获客雷达](#获客雷达)
7. [营销自动化](#营销自动化)
8. [知识引擎](#知识引擎)
9. [管理后台](#管理后台)
10. [API 集成](#api 集成)
11. [常见问题](#常见问题)

---

## 平台概览

VertaX 是一款面向 B2B 企业的智能获客平台，整合了：

- 🎯 **获客雷达** - 多渠道发现潜在客户
- 📧 **营销自动化** - 个性化邮件外联 + 追踪
- 🧠 **知识引擎** - 客户画像 + 智能评分
- 📊 **数据分析** - 获客效果 + ROI 追踪

---

## 访问地址

### 生产环境

| 系统 | 地址 | 说明 |
|------|------|------|
| **主平台** | https://vertax.top | 客户使用的主平台 |
| **Tower 管理后台** | https://vertax.top/admin | 管理员后台 |
| **API 端点** | https://vertax.top/api | REST API |

### 开发环境

| 系统 | 地址 | 说明 |
|------|------|------|
| **本地开发** | http://localhost:3000 | 开发环境 |

---

## 账号信息

### Tower 管理员账号

```
用户名：admin@vertax.top
密码：[请联系技术支持获取]
角色：Super Admin
权限：全系统管理
```

### 客户账号 - 涂豆（示例）

```
用户名：tdpaintcell@example.com
密码：[客户专属密码]
租户：涂豆
角色：Tenant Admin
权限：租户内全功能
```

### 客户账号 - MachRio（示例）

```
用户名：contact@machrio.com
密码：[客户专属密码]
租户：MachRio
角色：Tenant Admin
权限：租户内全功能
```

> ⚠️ **安全提示**: 首次登录后请立即修改密码

---

## 快速入门

### 1. 登录系统

1. 访问 https://vertax.top
2. 点击右上角「登录」
3. 输入邮箱和密码
4. 选择租户（如有多个）

### 2. 首次配置

#### 步骤 1: 设置目标客户画像

```
路径：知识引擎 → 评分规则
操作：
1. 点击「新建评分规则」
2. 输入目标行业关键词
3. 设置目标国家
4. 添加排除规则
5. 保存
```

#### 步骤 2: 配置获客雷达

```
路径：获客雷达 → 扫描配置
操作：
1. 点击「新建扫描任务」
2. 选择数据源（建议全选）
3. 设置扫描频率（建议每日）
4. 保存并启动
```

#### 步骤 3: 设置邮件外联

```
路径：营销自动化 → 邮件配置
操作：
1. 配置 Resend API Key
2. 设置发件人邮箱
3. 上传邮件模板
4. 测试发送
```

---

## 功能模块

### 获客雷达 (Radar)

**访问路径**: https://vertax.top/c/radar

#### 功能说明

- **多渠道扫描** - 10+ 数据源自动发现客户
- **智能评分** - 基于自定义规则评估客户质量
- **自动合格化** - A/B/C层级自动分类
- **实时通知** - 高意向客户即时推送

#### 数据源列表

| 数据源 | 类型 | 覆盖区域 | 意向度 |
|--------|------|----------|--------|
| UNGM | 招标 | 全球（联合国） | ⭐⭐⭐⭐ |
| TED | 招标 | 欧盟 27 国 | ⭐⭐⭐⭐ |
| SAM.gov | 招标 | 美国 | ⭐⭐⭐⭐⭐ |
| Google Maps | 企业 POI | 全球 | ⭐⭐ |
| Brave Search | 搜索发现 | 全球 | ⭐⭐ |
| 招聘信号 | 增长监测 | 全球 | ⭐⭐⭐⭐ |
| 海关数据 | 进口商发现 | 全球 | ⭐⭐⭐⭐⭐ |
| 展会参展 | 市场活跃 | 全球 | ⭐⭐⭐⭐ |
| 开发银行 | 新兴市场项目 | 中东/非洲/拉美/东欧 | ⭐⭐⭐⭐ |
| 新兴市场采购 | 本地采购平台 | 40+ 国家 | ⭐⭐⭐⭐ |

#### 创建扫描任务

```json
{
  "name": "中东市场开发",
  "regions": ["MENA"],
  "countries": ["SA", "AE", "QA"],
  "targetIndustries": ["coating", "manufacturing"],
  "keywords": ["coating", "painting", "surface treatment"],
  "enabledChannels": ["TENDER", "ECOSYSTEM"],
  "sourceIds": ["emerging_markets", "dev_bank", "trade_data"],
  "schedule": "0 2 * * *"
}
```

#### 查看候选客户

```
路径：获客雷达 → 候选客户
筛选条件：
- 层级（A/B/C）
- 国家/地区
- 行业
- 数据来源
- 发现时间
```

---

### 营销自动化 (Marketing)

**访问路径**: https://vertax.top/c/marketing

#### 邮件外联

**功能**:
- 个性化邮件生成
- 批量发送
- 打开/点击追踪
- 自动跟进序列

**创建邮件活动**:

```
1. 选择目标客户群体
2. 选择邮件模板
3. 自定义内容
4. 设置发送时间
5. 启动活动
```

#### 邮件追踪

**追踪指标**:
- 发送数量
- 打开率
- 点击率
- 回复率
- 转化率

**实时数据**:
```
路径：营销自动化 → 数据分析
```

---

### 知识引擎 (Knowledge)

**访问路径**: https://vertax.top/c/knowledge

#### 评分规则配置

**功能**: 自定义目标客户画像评分规则

**配置项**:
- 正向信号关键词
- 负向信号关键词
- 联系方式加分
- 信号来源加分
- 层级阈值

**示例配置**:

```json
{
  "positiveSignals": [
    { "keywords": ["manufacturing", "industrial"], "weight": 3 },
    { "keywords": ["coating", "painting"], "weight": 5 }
  ],
  "negativeSignals": [
    { "keywords": ["competitor", "rival"], "action": "exclude" }
  ],
  "contactScoring": {
    "hasWebsite": 2,
    "hasPhone": 1,
    "hasEmail": 1
  },
  "channelScoring": {
    "trade_data": 8,
    "sam_gov": 6,
    "dev_bank": 7
  },
  "thresholds": {
    "tierA": 8,
    "tierB": 5
  }
}
```

#### 买家画像

**功能**: 自动生成理想客户画像（ICP）

**数据来源**:
- 历史成交客户
- 高意向客户特征
- 行业标杆分析

---

### 管理后台 (Tower)

**访问路径**: https://vertax.top/admin

#### 租户管理

**功能**:
- 创建/编辑/删除租户
- 查看租户使用情况
- 配置租户权限
- 管理 API 密钥

**创建租户**:

```
1. 点击「新建租户」
2. 填写公司信息：
   - 公司名称
   - 域名
   - 管理员邮箱
   - 目标行业
   - 目标国家
3. 设置初始配额
4. 保存
```

#### API 密钥管理

**路径**: Tower → API 密钥

**可配置的 API**:
- SAM.gov（美国政府采购）
- Google Places（企业发现）
- Brave Search（AI 搜索）
- Resend（邮件发送）

---

## API 集成

### 基础信息

**API Base URL**: `https://vertax.top/api`

**认证方式**: Bearer Token

**请求头**:
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### 主要端点

#### 获取候选客户

```http
GET /api/radar/candidates
```

**参数**:
- `tier`: A/B/C
- `country`: 国家代码
- `limit`: 数量限制

**响应**:
```json
{
  "candidates": [
    {
      "id": "xxx",
      "displayName": "公司名",
      "country": "US",
      "tier": "A",
      "matchScore": 0.95
    }
  ]
}
```

#### 创建扫描任务

```http
POST /api/radar/scan
```

**请求体**:
```json
{
  "name": "新扫描任务",
  "keywords": ["coating"],
  "regions": ["MENA"]
}
```

#### 发送邮件

```http
POST /api/outreach/send
```

**请求体**:
```json
{
  "to": "customer@example.com",
  "template": "intro_v1",
  "personalization": {
    "companyName": "ABC Corp"
  }
}
```

### Webhook 配置

**支持事件**:
- `candidate_qualified` - 新合格候选
- `intent_high` - 高意向信号
- `email_sent` - 邮件发送
- `email_opened` - 邮件打开
- `email_clicked` - 链接点击

**配置路径**: Tower → Webhook 设置

---

## 常见问题

### Q1: 如何添加新的数据源？

```
路径：Tower → 数据源管理
操作：
1. 点击「添加数据源」
2. 选择适配器类型
3. 配置 API Key（如有）
4. 测试连接
5. 启用
```

### Q2: 评分规则如何生效？

评分规则修改后：
- 新发现的候选：立即应用新规则
- 已有候选：下次合格化时应用

**手动重新评分**:
```
路径：知识引擎 → 评分规则
操作：点击「重新评分所有候选」
```

### Q3: 邮件追踪如何工作？

**打开追踪**:
- 邮件中嵌入 1x1 透明像素
- 加载像素时记录打开事件
- 追踪链接：`https://vertax.top/api/track/open?eid=xxx`

**点击追踪**:
- 链接替换为代理链接
- 重定向时记录点击事件
- 追踪链接：`https://vertax.top/api/track/click?url=xxx&eid=xxx`

### Q4: 如何查看新兴市场客户？

```
路径：获客雷达 → 候选客户
筛选：
- 地区：MENA / AFRICA / LATAM / ECA
- 数据源：emerging_markets / dev_bank
```

### Q5: API 调用限制？

| 端点 | 限制 |
|------|------|
| 雷达扫描 | 10 次/分钟 |
| 邮件发送 | 30 次/分钟 |
| 数据查询 | 100 次/分钟 |

---

## 技术支持

### 联系方式

- **邮箱**: support@vertax.top
- **文档**: https://vertax.top/docs
- **状态页**: https://status.vertax.top

### 服务时间

- **工作日**: 9:00 - 18:00 (UTC+8)
- **紧急支持**: 7x24 小时（仅限企业版）

---

## 附录

### A. 环境变量配置

```bash
# 数据库
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 认证
AUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://vertax.top"

# 邮件服务
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="VertaX <noreply@vertax.top>"

# 数据源 API（可选）
SAM_GOV_API_KEY="your-key"
GOOGLE_MAPS_API_KEY="your-key"
BRAVE_SEARCH_API_KEY="your-key"
```

### B. 定时任务

| 任务 | 时间 | 说明 |
|------|------|------|
| 雷达扫描 | 每天 01:00 | 执行数据源扫描 |
| 候选合格化 | 每天 03:00 | 评分和分类 |
| 数据增强 | 每天 05:00 | 补充企业信息 |
| 数据清理 | 每天 02:00 | 清理过期数据 |
| 通知推送 | 每天 08:00 | 发送客户通知 |

### C. 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

**文档结束**

© 2026 VertaX. All rights reserved.
