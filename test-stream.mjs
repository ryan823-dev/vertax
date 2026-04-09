/**
 * SSE 流式端点测试脚本
 * 用法: node test-stream.mjs
 */

import { spawn } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';

// 简单的测试 prompt
const testPayload = {
  entityType: 'Content',
  entityId: 'test-content-123',
  input: { title: '测试文章标题', keywords: ['AI', 'SEO'] },
  mode: 'generate',
  useCompanyProfile: false,
};

// 使用 curl 测试 SSE 流
function testSSEStream() {
  console.log('🔄 启动 SSE 流式测试...\n');

  const curl = spawn('curl', [
    '-s', '-S', '-N', // -N 禁用缓冲
    '-X', 'POST',
    `${BASE_URL}/api/ai/skills/marketing-generate-content-brief/stream`,
    '-H', 'Content-Type: application/json',
    '-H', 'Accept: text/event-stream',
    '--data-binary', JSON.stringify(testPayload),
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let chunkCount = 0;
  let totalContent = '';

  curl.stdout.on('data', (chunk) => {
    const text = chunk.toString('utf-8');
    console.log(`[chunk ${++chunkCount}] ${text.substring(0, 200)}...`);
    totalContent += text;
  });

  curl.stderr.on('data', (chunk) => {
    const text = chunk.toString('utf-8').trim();
    if (text && !text.includes('HTTP')) {
      console.log(`[stderr] ${text}`);
    }
  });

  curl.on('close', (code) => {
    console.log(`\n✅ 测试完成`);
    console.log(`   总 chunk 数: ${chunkCount}`);
    console.log(`   总内容长度: ${totalContent.length} chars`);
    console.log(`   退出码: ${code}`);
  });

  curl.on('error', (err) => {
    console.error(`❌ 错误: ${err.message}`);
  });

  // 30秒超时
  setTimeout(() => {
    curl.kill();
    console.log('\n⏱️  超时，测试结束');
  }, 30000);
}

// 测试非流式端点（对比）
function testNonStreaming() {
  console.log('\n\n🔄 启动非流式端点测试（对比）...\n');

  const curl = spawn('curl', [
    '-s', '-S',
    '-X', 'POST',
    `${BASE_URL}/api/ai/skills/marketing-generate-content-brief`,
    '-H', 'Content-Type: application/json',
    '--data-binary', JSON.stringify(testPayload),
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  curl.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf-8');
  });

  curl.on('close', (code) => {
    console.log(`\n✅ 非流式测试完成`);
    console.log(`   响应长度: ${stdout.length} chars`);
    console.log(`   退出码: ${code}`);
    if (stdout) {
      try {
        const json = JSON.parse(stdout);
        console.log(`   ok: ${json.ok}`);
        if (json.error) console.log(`   error: ${json.error}`);
      } catch {
        console.log(`   响应: ${stdout.substring(0, 100)}...`);
      }
    }
  });
}

// 主函数
console.log('='.repeat(60));
console.log('SSE 流式端点测试');
console.log('='.repeat(60));

testSSEStream();
testNonStreaming();
