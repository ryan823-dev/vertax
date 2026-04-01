# 文档处理攻坚方案

## 核心策略：分层处理

```
┌─────────────────────────────────────────────────────────────────┐
│                      文档上传                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  文件大小判断    │
                    └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │   < 8MB         │             │   ≥ 8MB         │
    │  浏览器端处理    │             │  服务端处理      │
    └─────────────────┘             └─────────────────┘
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ PDF.js / WASM   │             │ 独立微服务       │
    │ 客户电脑执行     │             │ 或第三方API      │
    └─────────────────┘             └─────────────────┘
```

---

## 第一层：浏览器端处理（< 8MB）

### 技术方案

| 文件类型 | 处理技术 | 性能估算 |
|---------|---------|---------|
| PDF | PDF.js (Mozilla) | 1-5秒/页 |
| Word/Excel | Mammoth.js / SheetJS | 1-3秒 |
| 图片 OCR | Tesseract.js (WASM) | 2-5秒/页 |
| 音频 | Whisper.cpp WASM | 实时转录 |
| 视频 | Web FFmpeg + Whisper | 较慢，建议服务端 |

### 实现架构

```
前端组件
    │
    ├── FileProcessor.tsx (处理控制器)
    │       │
    │       ├── pdfWorker.ts (PDF处理 - Web Worker)
    │       ├── ocrWorker.ts (OCR处理 - Web Worker)
    │       └── audioWorker.ts (音频处理 - Web Worker)
    │
    └── 处理完成 → 上传文本到服务器
```

### 用户体验

```
1. 用户选择文件
2. 系统检测文件大小
3. < 8MB: 显示"正在处理..."进度条（本地处理）
4. 处理完成，自动上传
5. 用户看到"处理完成"状态
```

---

## 第二层：服务端处理（≥ 8MB）

### 选项A：第三方 API（推荐启动）

| 服务 | 价格 | 特点 |
|-----|------|-----|
| **Azure Document Intelligence** | $1.50/1000页 | 企业级、中文好 |
| **AssemblyAI** | $0.0006/秒 | 音视频转录首选 |

**月成本估算（100个大文件）：**
- 平均每文件 20 页 PDF：$3/月
- 平均每视频 10 分钟：$0.36/文件 = $36/月

### 选项B：独立微服务（长期方案）

```
部署架构：

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Vertax     │────▶│  处理服务    │────▶│   Neon DB   │
│  (Vercel)   │     │  (Railway)  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘

Railway 配置：
- 内存: 2GB
- CPU: 2 vCPU
- 月费: ~$10-20
```

---

## 推荐实施路线

### 阶段一：立即可用（1-2天）

```
目标：解决当前卡住问题

方案：
✅ 已完成 - 恢复同步处理
⏳ 等待部署验证

成本：¥0
```

### 阶段二：浏览器端处理（1-2周）

```
目标：小文件本地处理，提升体验

实现：
1. 集成 PDF.js（PDF文本提取）
2. 集成 Mammoth.js（Word文档）
3. 添加处理进度UI

成本：
- 开发时间：3-5天
- 运营成本：¥0

效果：
- 80% 文件在客户端处理
- 服务器压力降低
- 处理速度提升（不依赖网络）
```

### 阶段三：大文件服务（2-4周）

```
目标：大文件稳定处理

方案选择：
┌─────────────────────────────────────────────────┐
│  快速上线：第三方 API                            │
│  - AssemblyAI（音视频）                          │
│  - Azure Document Intelligence（文档）           │
│  - 预估月成本：$10-50                           │
├─────────────────────────────────────────────────┤
│  长期方案：独立微服务                            │
│  - Railway 部署                                 │
│  - 月成本：$10-20                               │
│  - 完全控制，无限制                              │
└─────────────────────────────────────────────────┘
```

---

## 技术实现概要

### 浏览器端处理核心代码

```typescript
// src/lib/browser-processor.ts

// PDF 处理（使用 PDF.js）
async function processPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ');
  }
  return text;
}

// Word 处理（使用 Mammoth）
async function processDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// 主入口
export async function processFile(file: File): Promise<{
  text: string;
  chunks: Chunk[];
}> {
  const sizeMB = file.size / (1024 * 1024);

  // 大文件走服务端
  if (sizeMB >= 8) {
    throw new Error('FILE_TOO_LARGE');
  }

  let text = '';
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    text = await processPdf(file);
  } else if (ext === 'docx') {
    text = await processDocx(file);
  } else {
    text = await file.text();
  }

  return { text, chunks: splitIntoChunks(text) };
}
```

### 前端组件

```tsx
// src/components/knowledge/file-uploader.tsx

export function FileUploader() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'uploading' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB < 8) {
      // 浏览器端处理
      setStatus('processing');
      const result = await processFile(file);
      setStatus('uploading');
      await uploadProcessedText(result);
    } else {
      // 服务端处理
      setStatus('uploading');
      await uploadForServerProcessing(file);
    }

    setStatus('done');
  };

  return (
    <div>
      {/* UI 实现 */}
    </div>
  );
}
```

---

## 成本预估总结

| 方案 | 开发成本 | 月运营成本 | 适用场景 |
|-----|---------|-----------|---------|
| 当前同步处理 | ✅ 已完成 | ¥0 | 基础需求 |
| + 浏览器端处理 | 3-5天 | ¥0 | 小文件优化 |
| + 第三方API | 1-2天 | $10-50 | 快速上线 |
| + 独立微服务 | 5-10天 | $10-20 | 长期方案 |

---

## 下一步

请确认：

1. **是否实施这个分层方案？**
2. **优先级：浏览器端处理 vs 大文件服务？**
3. **预算范围：第三方API可接受吗？**

确认后我可以立即开始开发。