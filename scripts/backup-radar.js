#!/usr/bin/env node

/**
 * 获客雷达数据备份脚本
 *
 * 功能：
 * 1. 备份关键数据到本地文件
 * 2. 备份到 OSS (可选)
 * 3. 清理过期数据
 *
 * 使用方式：
 *   node scripts/backup-radar.js                    # 完整备份
 *   node scripts/backup-radar.js --data-only        # 仅数据
 *   node scripts/backup-radar.js --dry-run          # 预览不执行
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// ==================== 配置 ====================

const BACKUP_DIR = path.join(__dirname, "../backups");
const RETENTION_DAYS = 30; // 保留30天
const DRY_RUN = process.argv.includes("--dry-run");
const DATA_ONLY = process.argv.includes("--data-only");

// 需要备份的模型
const MODELS_TO_BACKUP = [
  "lead",
  "campaign",
  "candidate",
  "outreachRecord",
  "radarError",
  "apiKeyConfig",
];

// ==================== 工具函数 ====================

function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  const prefix = type === "ERROR" ? "❌" : type === "SUCCESS" ? "✅" : "ℹ️";
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log(`创建备份目录: ${BACKUP_DIR}`);
  }
}

function getBackupFilename(prefix) {
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  return `${prefix}_${date}_${time}.json`;
}

// ==================== 数据备份 ====================

async function backupData(prisma) {
  const timestamp = new Date().toISOString();
  const backup = {
    version: "1.0",
    timestamp,
    exportedAt: new Date().toISOString(),
    data: {},
  };

  for (const model of MODELS_TO_BACKUP) {
    try {
      const Model = prisma[model];
      if (!Model) {
        log(`模型不存在: ${model}`, "WARN");
        continue;
      }

      log(`备份 ${model}...`);
      const records = await Model.findMany({
        where: { deletedAt: null },
        take: 100000, // 限制数量
      });

      backup.data[model] = {
        count: records.length,
        records,
      };

      log(`  ✓ ${records.length} 条记录`, "SUCCESS");
    } catch (error) {
      log(`备份 ${model} 失败: ${error.message}`, "ERROR");
    }
  }

  return backup;
}

async function saveBackup(backup) {
  if (DRY_RUN) {
    log("Dry run - 不保存备份文件");
    return;
  }

  ensureBackupDir();

  const filename = getBackupFilename("radar_backup");
  const filepath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

  // 同步到 OSS (如果配置了)
  await uploadToOSS(filepath, filename);

  log(`备份已保存: ${filename}`, "SUCCESS");
  return filepath;
}

async function uploadToOSS(filepath, filename) {
  // TODO: 实现 OSS 上传
  // const { OSS_ENDPOINT, OSS_BUCKET, OSS_ACCESS_KEY } = process.env;
  log("OSS 上传暂未配置，跳过");
}

// ==================== 清理过期备份 ====================

async function cleanupOldBackups() {
  if (DRY_RUN) {
    log("Dry run - 不清理旧备份");
    return;
  }

  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const file of files) {
    if (!file.startsWith("radar_backup_")) continue;

    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);

    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(filepath);
      deleted++;
      log(`删除过期备份: ${file}`);
    }
  }

  if (deleted > 0) {
    log(`清理完成，删除 ${deleted} 个过期备份`, "SUCCESS");
  }
}

// ==================== 清理雷达错误日志 ====================

async function cleanupOldErrors(prisma) {
  if (DRY_RUN) {
    log("Dry run - 不清理错误日志");
    return;
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7天

  try {
    const result = await prisma.radarError.deleteMany({
      where: {
        timestamp: { lt: cutoff },
      },
    });

    log(`清理 ${result.count} 条过期错误日志`, "SUCCESS");
  } catch (error) {
    log(`清理错误日志失败: ${error.message}`, "ERROR");
  }
}

// ==================== 主函数 ====================

async function main() {
  console.log("\n" + "=".repeat(50));
  log("获客雷达数据备份开始");
  if (DRY_RUN) log("⚠️ Dry run 模式 - 仅预览不执行");
  console.log("=".repeat(50) + "\n");

  const prisma = new PrismaClient();

  try {
    // 备份数据
    const backup = await backupData(prisma);

    // 保存备份
    await saveBackup(backup);

    // 清理旧备份
    await cleanupOldBackups();

    // 清理过期错误日志
    if (!DATA_ONLY) {
      await cleanupOldErrors(prisma);
    }

    log("\n备份完成!", "SUCCESS");
  } catch (error) {
    log(`备份失败: ${error.message}`, "ERROR");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
main().catch(console.error);
