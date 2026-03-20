#!/usr/bin/env node

/**
 * 获客雷达健康检查脚本
 *
 * 使用方式：
 *   node scripts/radar-health-check.js              # 完整健康报告
 *   node scripts/radar-health-check.js --adapters  # 仅检查适配器
 *   node scripts/radar-health-check.js --candidates # 仅检查候选新鲜度
 */

const https = require("https");
const http = require("http");

// ==================== 配置 ====================

const ADAPTERS = [
  { name: "TED API", url: "https://api.ted.europa.eu/v3/" },
  { name: "UNGM", url: "https://www.ungm.org" },
  { name: "SAM.gov", url: "https://sam.gov" },
  { name: "Brave Search", url: "https://api.search.brave.com" },
  { name: "Hunter.io", url: "https://api.hunter.io" },
  { name: "People Data Labs", url: "https://api.peopledatalabs.com" },
  { name: "Tavily", url: "https://api.tavily.com" },
  { name: "Exa", url: "https://api.exa.ai" },
];

const TIMEOUT = 5000;

// ==================== 工具函数 ====================

function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  const prefix =
    type === "ERROR"
      ? "❌"
      : type === "SUCCESS"
      ? "✅"
      : type === "WARN"
      ? "⚠️"
      : "ℹ️";
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function getStatusEmoji(status) {
  return status === "healthy" ? "✅" : status === "degraded" ? "⚡" : "❌";
}

// ==================== HTTP 检查 ====================

function checkEndpoint(name, url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;

    const req = client.get(url + (url.endsWith("/") ? "" : "/"), (res) => {
      const latency = Date.now() - startTime;
      resolve({
        name,
        status: res.statusCode < 500 ? "healthy" : "degraded",
        latency,
        statusCode: res.statusCode,
      });
    });

    req.on("error", (err) => {
      resolve({
        name,
        status: "down",
        latency: Date.now() - startTime,
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        name,
        status: "down",
        latency: TIMEOUT,
        error: "Timeout",
      });
    });

    req.setTimeout(TIMEOUT);
  });
}

// ==================== 健康报告 ====================

async function runHealthCheck() {
  console.log("\n" + "=".repeat(60));
  log("获客雷达健康检查");
  console.log("=".repeat(60) + "\n");

  const args = process.argv.slice(2);
  const checkAdapters = args.includes("--adapters") || args.length === 0;
  const checkCandidates = args.includes("--candidates") || args.length === 0;

  let overallStatus = "healthy";

  // 1. 检查数据源适配器
  if (checkAdapters) {
    log("检查数据源适配器...\n");

    const results = await Promise.all(
      ADAPTERS.map((a) => checkEndpoint(a.name, a.url))
    );

    let healthy = 0;
    let degraded = 0;
    let down = 0;

    results.forEach((r) => {
      const emoji = getStatusEmoji(r.status);
      const latencyStr = r.latency ? `(${r.latency}ms)` : "";
      const errorStr = r.error ? ` - ${r.error}` : "";

      if (r.status === "healthy") {
        healthy++;
        log(`${emoji} ${r.name}: OK ${latencyStr}`);
      } else if (r.status === "degraded") {
        degraded++;
        log(`${emoji} ${r.name}: 降级 (${r.statusCode}) ${latencyStr}`, "WARN");
      } else {
        down++;
        log(`${emoji} ${r.name}: 不可用 ${errorStr}`, "ERROR");
      }
    });

    console.log("\n📊 适配器状态汇总:");
    console.log(`   ✅ 健康: ${healthy}`);
    console.log(`   ⚡ 降级: ${degraded}`);
    console.log(`   ❌ 不可用: ${down}`);

    if (down >= 3) {
      overallStatus = "down";
    } else if (down > 0 || degraded > 0) {
      overallStatus = "degraded";
    }
  }

  // 2. 检查候选新鲜度 (需要 API)
  if (checkCandidates) {
    console.log("\n\n📊 候选数据新鲜度:");
    console.log("   (需要 API 访问)");
    console.log('   运行: curl http://localhost:3000/api/radar/health');
  }

  // 3. 总体状态
  console.log("\n" + "=".repeat(60));
  console.log("总体状态: " + getStatusEmoji(overallStatus) + " " + overallStatus.toUpperCase());
  console.log("=".repeat(60) + "\n");

  return overallStatus;
}

// 运行
runHealthCheck()
  .then((status) => {
    process.exit(status === "healthy" ? 0 : status === "degraded" ? 1 : 2);
  })
  .catch((err) => {
    log(`检查失败: ${err.message}`, "ERROR");
    process.exit(3);
  });
