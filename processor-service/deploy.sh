#!/bin/bash
# Railway 部署脚本
# 使用方法: ./deploy.sh

set -e

echo "=========================================="
echo "Vertax Processor Service - Railway 部署"
echo "=========================================="

# 检查 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "安装 Railway CLI..."
    npm install -g @railway/cli
fi

# 检查是否已登录
echo ""
echo "步骤 1: 登录 Railway"
echo "----------------------------------------"
echo "请在终端执行以下命令（会打开浏览器）："
echo "  railway login"
echo ""
echo "登录完成后，按 Enter 继续..."
read -r

# 创建项目
echo ""
echo "步骤 2: 创建 Railway 项目"
echo "----------------------------------------"
echo "请执行以下命令："
echo "  railway init"
echo "选择 'Empty Project'，命名为 'vertax-processor'"
echo ""
echo "创建完成后，按 Enter 继续..."
read -r

# 设置环境变量
echo ""
echo "步骤 3: 设置环境变量"
echo "----------------------------------------"
echo "请提供以下信息："

read -p "DATABASE_URL (PostgreSQL 连接字符串): " db_url
read -p "OSS_REGION (如 oss-cn-hangzhou): " oss_region
read -p "OSS_ACCESS_KEY_ID: " oss_key_id
read -p "OSS_ACCESS_KEY_SECRET: " oss_key_secret
read -p "OSS_BUCKET: " oss_bucket
read -p "PROCESSOR_API_KEY (生成一个安全密钥): " api_key

echo ""
echo "设置环境变量..."
railway variables set DATABASE_URL="$db_url"
railway variables set DIRECT_URL="$db_url"
railway variables set OSS_REGION="$oss_region"
railway variables set OSS_ACCESS_KEY_ID="$oss_key_id"
railway variables set OSS_ACCESS_KEY_SECRET="$oss_key_secret"
railway variables set OSS_BUCKET="$oss_bucket"
railway variables set PROCESSOR_API_KEY="$api_key"

# 部署
echo ""
echo "步骤 4: 部署服务"
echo "----------------------------------------"
railway up

# 获取域名
echo ""
echo "步骤 5: 获取服务 URL"
echo "----------------------------------------"
railway domain

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "请将以下环境变量添加到主应用 (Vercel)："
echo "  PROCESSOR_SERVICE_URL=<上面的 URL>"
echo "  PROCESSOR_API_KEY=$api_key"
echo ""