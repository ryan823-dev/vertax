# Resend 邮件服务配置指南

本文档说明如何配置 Resend 邮件服务，使 VertaX 获客闭环完整运行。

---

## 1. 注册 Resend 账户

1. 访问 [resend.com](https://resend.com)
2. 点击 "Start for free" 注册
3. 免费版每月可发送 3,000 封邮件

---

## 2. 获取 API Key

1. 登录 Resend 后台
2. 进入 **API Keys** 页面
3. 点击 **Create API Key**
4. 填写：
   - Name: `VertaX Production`
   - Permission: `Sending access`
   - Domain: 选择已验证的域名（或使用默认的 `on.resend.com`）
5. 复制生成的 API Key（格式：`re_xxxxxxxxxx`）

---

## 3. 验证发件域名（推荐）

### 3.1 添加域名

1. 进入 **Domains** 页面
2. 点击 **Add Domain**
3. 输入：`vertax.top`
4. 选择区域：推荐选择离用户最近的区域

### 3.2 配置 DNS 记录

Resend 会生成 3 条 DNS 记录，添加到域名 DNS 管理后台：

| 类型 | 名称 | 值 |
|------|------|------|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3...` (DKIM 公钥) |

### 3.3 验证

1. 等待 DNS 生效（通常 5-30 分钟）
2. 在 Resend 后台点击 **Verify**
3. 状态变为 ✅ Verified 即可使用

---

## 4. 配置 Vercel 环境变量

### 方法一：Vercel CLI

```bash
# 配置 API Key
printf "re_your_actual_api_key" | npx vercel env add RESEND_API_KEY production --yes

# 配置发件地址（可选，有默认值）
printf "VertaX <noreply@vertax.top>" | npx vercel env add RESEND_FROM_EMAIL production --yes
```

### 方法二：Vercel Dashboard

1. 进入项目 Settings → Environment Variables
2. 添加：
   - `RESEND_API_KEY` = `re_your_actual_api_key`
   - `RESEND_FROM_EMAIL` = `VertaX <noreply@vertax.top>` (可选)
3. 重新部署项目

---

## 5. 测试邮件发送

配置完成后，通过 API 测试：

```bash
curl -X GET "https://vertax.top/api/debug/test-outreach?secret=YOUR_CRON_SECRET&action=test-send&email=your@email.com"
```

成功响应：
```json
{
  "ok": true,
  "result": {
    "success": true,
    "messageId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

---

## 6. 租户自定义配置（可选）

大客户可以使用自己的 Resend 账户发送邮件，保持品牌独立。

### 6.1 通过 API 配置

```bash
curl -X POST "https://vertax.top/api/settings/email-config" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "action": "update",
    "usePlatformKey": false,
    "customApiKey": "re_client_api_key",
    "customFromDomain": "client.com",
    "fromEmail": "Client Name <sales@client.com>",
    "replyToEmail": "sales@client.com"
  }'
```

### 6.2 验证自定义域名

```bash
curl -X POST "https://vertax.top/api/settings/email-config" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "action": "verify_domain",
    "domain": "client.com"
  }'
```

返回 DNS 记录，添加到客户域名的 DNS 管理后台。

---

## 7. 邮件发送配额

| 计划 | 月发送量 | 价格 |
|------|----------|------|
| Free | 3,000 封 | $0 |
| Starter | 50,000 封 | $20/月 |
| Pro | 100,000 封 | $50/月 |
| Business | 自定义 | 联系销售 |

---

## 8. 故障排查

### 邮件发送失败

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `API key is invalid` | API Key 未配置或错误 | 检查 Vercel 环境变量 |
| `Domain not verified` | 发件域名未验证 | 完成 DNS 验证 |
| `Rate limit exceeded` | 超过发送配额 | 升级 Resend 计划 |

### 邮件进入垃圾箱

1. 确保 DKIM 记录正确配置
2. 检查 SPF 记录
3. 避免邮件内容触发垃圾邮件过滤（过多链接、营销词汇等）

---

## 9. 相关文件

| 文件 | 说明 |
|------|------|
| `src/lib/email/resend-client.ts` | Resend 客户端，支持平台/租户双模式 |
| `src/lib/email/outreach-service.ts` | Outreach 批量发送服务 |
| `src/app/api/settings/email-config/route.ts` | 租户邮件配置 API |
| `src/app/api/cron/radar-notify/route.ts` | 商机推送通知 Cron |
| `src/app/api/outreach/send/route.ts` | Outreach 发送 API |

---

## 10. 快速检查清单

- [ ] 注册 Resend 账户
- [ ] 获取 API Key
- [ ] 验证发件域名 `vertax.top`
- [ ] 配置 Vercel 环境变量 `RESEND_API_KEY`
- [ ] 重新部署项目
- [ ] 测试邮件发送
- [ ] 确认 Cron 任务正常运行
