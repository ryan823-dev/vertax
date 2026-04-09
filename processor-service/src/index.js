import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { processDocument } from './processors/document.js';
import { processVideo } from './processors/video.js';
import { processImage } from './processors/image.js';
import { saveToDatabase } from './services/database.js';
import { downloadFromOSS } from './services/oss.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }
});

// 注册插件
await fastify.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
});
await fastify.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 健康检查
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 文档处理接口
fastify.post('/process', async (request, reply) => {
  const { assetId, storageKey, mimeType, tenantId, apiKey } = request.body;

  // API Key 验证
  if (apiKey !== process.env.PROCESSOR_API_KEY) {
    reply.code(401);
    return { error: 'Unauthorized' };
  }

  try {
    fastify.log.info({ assetId, mimeType }, 'Starting document processing');

    // 更新状态为处理中
    await saveToDatabase(assetId, {
      processingStatus: 'processing',
      processor: 'microservice'
    });

    // 下载文件
    const fileBuffer = await downloadFromOSS(storageKey);

    // 根据文件类型选择处理器
    let result;
    if (mimeType.startsWith('video/')) {
      result = await processVideo(fileBuffer, mimeType);
    } else if (mimeType.startsWith('image/')) {
      result = await processImage(fileBuffer, mimeType);
    } else {
      result = await processDocument(fileBuffer, mimeType);
    }

    // 保存结果到数据库
    await saveToDatabase(assetId, {
      processingStatus: 'ready',
      textLength: result.text.length,
      chunkCount: result.chunks.length,
      processedAt: new Date().toISOString()
    }, result.chunks, tenantId);

    fastify.log.info({ assetId, chunkCount: result.chunks.length }, 'Processing completed');

    return {
      success: true,
      assetId,
      textLength: result.text.length,
      chunkCount: result.chunks.length
    };

  } catch (error) {
    fastify.log.error({ assetId, error: error.message }, 'Processing failed');

    await saveToDatabase(assetId, {
      processingStatus: 'failed',
      processingError: error.message
    }).catch(() => {});

    reply.code(500);
    return { error: error.message };
  }
});

// 批量处理接口
fastify.post('/process/batch', async (request, reply) => {
  const { assets, apiKey } = request.body;

  if (apiKey !== process.env.PROCESSOR_API_KEY) {
    reply.code(401);
    return { error: 'Unauthorized' };
  }

  const results = [];
  for (const asset of assets) {
    try {
      const response = await fetch(`${process.env.SELF_URL || 'http://localhost:3001'}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...asset, apiKey })
      });
      const result = await response.json();
      results.push({ assetId: asset.assetId, ...result });
    } catch (error) {
      results.push({ assetId: asset.assetId, error: error.message });
    }
  }

  return { results };
});

// 启动服务
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Processor service listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
