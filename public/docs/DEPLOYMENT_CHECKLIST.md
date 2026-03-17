# VertaX 获客雷达 - 部署清单

## ✅ 已完成功能

### 核心获客功能
- [x] 获客雷达扫描引擎
- [x] 多数据源适配器（10+）
- [x] 智能评分系统（可配置）
- [x] 数据增强服务
- [x] 意图追踪
- [x] Webhook 通知

### 外联触达功能
- [x] 邮件外联服务
- [x] 自托管邮件追踪（像素 + 点击）
- [x] 个性化邮件生成
- [x] 序列邮件发送

### 管理功能
- [x] Tower 租户管理
- [x] API 密钥配置
- [x] 成本追踪
- [x] 评分规则配置

---

## 🆕 新增数据源（待测试）

### 已开发完成
1. **SAM.gov** - 美国政府采购 ✅
2. **招聘信号** - 公司增长监测 ✅
3. **海关贸易数据** - 进口商发现 ✅
4. **展会参展商** - 市场活跃客户 ✅
5. **国际开发银行** - 新兴市场项目 ✅
6. **新兴市场采购平台** - 40+ 国家本地平台 ✅

### 需要配置的资源

#### 可选 API Keys（不配置会使用网页抓取备选方案）

```bash
# .env 或 .env.production

# SAM.gov API（美国政府采购，可选）
SAM_GOV_API_KEY=your_api_key_here

# Google Places API（已有配置）
GOOGLE_PLACES_API_KEY=your_key_here

# Brave Search API（已有配置）
BRAVE_SEARCH_API_KEY=your_key_here
```

---

## 📋 部署步骤

### 1. 数据库迁移

```bash
# 应用最新的 Prisma schema
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate
```

### 2. 环境变量检查

```bash
# 确保以下变量已配置
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://vertax.top

# 可选 API Keys
SAM_GOV_API_KEY=
GOOGLE_PLACES_API_KEY=
BRAVE_SEARCH_API_KEY=
```

### 3. 构建验证

```bash
npm run build
```

### 4. 测试新兴市场数据源

```bash
# 运行测试脚本
npx tsx scripts/test-emerging-markets.ts
```

### 5. 创建测试扫描任务

在 Tower 管理后台或通过 API：

```json
{
  "name": "中东市场测试",
  "regions": ["MENA"],
  "countries": ["SA", "AE"],
  "targetIndustries": ["coating", "manufacturing"],
  "keywords": ["coating", "painting", "surface treatment"],
  "enabledChannels": ["TENDER", "ECOSYSTEM"],
  "sourceIds": ["emerging_markets", "dev_bank", "trade_data"],
  "schedule": "0 2 * * *"
}
```

---

## 🎯 推荐配置

### 中东市场配置

```json
{
  "name": "中东市场开发 - 沙特阿联酋",
  "regions": ["MENA"],
  "countries": ["SA", "AE", "QA", "KW"],
  "targetIndustries": ["coating", "oil_gas", "construction"],
  "keywords": ["coating", "painting", "surface treatment", "industrial finishing"],
  "enabledChannels": ["TENDER", "ECOSYSTEM"],
  "sourceIds": [
    "dev_bank",
    "emerging_markets",
    "trade_data",
    "google_places"
  ],
  "scoringProfile": {
    "targetCountries": ["SA", "AE", "QA"],
    "industryCodes": ["coating", "manufacturing"],
    "exclusionRules": {
      "excludedCompanies": []
    }
  }
}
```

### 拉美市场配置

```json
{
  "name": "拉美市场开发 - 巴西墨西哥",
  "regions": ["LATAM"],
  "countries": ["BR", "MX", "CL", "CO"],
  "targetIndustries": ["mining", "manufacturing", "automotive"],
  "keywords": [
    "mining equipment",
    "industrial coating",
    "recubrimiento",
    "revestimento"
  ],
  "enabledChannels": ["TENDER", "TRADESHOW"],
  "sourceIds": [
    "dev_bank",
    "emerging_markets",
    "trade_show",
    "hiring_signal"
  ]
}
```

### 非洲市场配置

```json
{
  "name": "非洲市场开发 - 尼日利亚肯尼亚",
  "regions": ["AFRICA"],
  "countries": ["NG", "KE", "ZA", "EG"],
  "targetIndustries": ["agriculture", "construction", "manufacturing"],
  "keywords": ["agricultural machinery", "construction equipment"],
  "enabledChannels": ["TENDER", "ECOSYSTEM"],
  "sourceIds": [
    "dev_bank",
    "emerging_markets",
    "ungm"
  ]
}
```

---

## 🔍 验证清单

### 基础功能验证
- [ ] 数据库连接正常
- [ ] 构建无错误
- [ ] 环境变量配置完整
- [ ] 定时任务正常运行

### 新数据源验证
- [ ] SAM.gov 能发现美国招标
- [ ] 招聘信号能识别扩张公司
- [ ] 贸易数据能发现进口商
- [ ] 展会数据能获取参展商
- [ ] 开发银行能获取项目信息
- [ ] 新兴市场平台能获取本地招标

### 评分系统验证
- [ ] 信号来源加分生效
- [ ] 新兴市场信号加分正确
- [ ] 层级判定（A/B/C）准确

### 外联功能验证
- [ ] 邮件追踪像素正常
- [ ] 链接点击追踪正常
- [ ] 意图分数计算正确
- [ ] Webhook 通知触发正常

---

## 📊 监控指标

### 数据源质量
- 每个数据源发现的候选数量
- 候选通过率（合格/总数）
- 候选层级分布（A/B/C 比例）
- 响应时间监控

### 外联效果
- 邮件打开率
- 链接点击率
- 高意向客户数量
- Webhook 触发次数

---

## 🆘 故障排查

### 适配器不工作
1. 检查 API Key 是否配置
2. 查看日志中的错误信息
3. 测试网络连接
4. 验证速率限制

### 评分不准确
1. 检查评分配置文件
2. 验证信号关键词
3. 调整阈值设置

### 邮件追踪失效
1. 检查 Resend 配置
2. 验证追踪 API 端点
3. 确认邮件模板包含像素

---

## 📞 联系支持

如遇到问题，请查看：
- 应用日志
- 数据库状态
- API 调用记录

---

**最后更新**: 2026-03-17
**版本**: v2.0 - 新兴市场增强版
