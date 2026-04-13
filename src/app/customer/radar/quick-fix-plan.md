# 获客雷达快速可用行动计划

**目标**: 尽快让获客雷达能顺畅使用，符合正常人类思维习惯
**优先级原则**: 用户当前最困惑的地方优先改，改动最小化，立即见效

---

## 一、当前用户最困惑的3个问题

### 问题1: 候选池详情里不知道"我该做什么"
- 用户看到一堆模块：背调按钮、邮件序列、发送开发信、内容联动
- 不清楚这些是"审核辅助"还是"跟进动作"
- 结果：用户在候选池就想开始外联，但语义应该是"审核→导入→去线索库跟进"

### 问题2: 背调要手动点"开始背调"
- 用户疑惑：系统为什么不自动给我背调结果？
- 点击按钮后才执行，违背"代理自动执行"原则

### 问题3: 邮件序列、开发信入口在候选池
- 用户以为这是候选池的职责
- 实际应该在线索库
- 结果：候选池和线索库职责边界模糊

---

## 二、快速见效方案（最小改动）

### Phase 1: 候选池详情快速精简（立即见效）

**改动量**: 10分钟内完成，不改后端

**具体改动**:

1. **隐藏邮件序列模块** (candidates/page.tsx line 1365-1475)
   ```tsx
   // 快速方案：注释掉整个邮件序列区块
   {/* 暂时隐藏 - 邮件序列应该在线索库详情里 */}
   {/* researchData && (
     <div className="...">邮件序列...</div>
   ) */}
   ```
   
   **效果**: 用户不再在候选池看到外联工具，清楚知道"先审核，导入后再跟进"

2. **隐藏发送开发信入口** (candidates/page.tsx line 1523+)
   ```tsx
   // 快速方案：注释掉发送开发信区块
   {/* 暂时隐藏 - 开发信应该在线索库 */}
   {/* 发送开发信入口... */}
   ```
   
   **效果**: 候选池职责清晰化，只做审核+导入

3. **背调改成自动触发** (candidates/page.tsx line 1224-1356)
   ```tsx
   // 快速方案：onMount自动触发背调
   useEffect(() => {
     if (selectedCandidate && !researchData && !isResearching) {
       handleResearch(selectedCandidate);
     }
   }, [selectedCandidate?.id]);
   
   // UI改为"AI正在背调中..."
   ```
   
   **效果**: 用户打开详情就看到背调结果，不需要手动触发

4. **隐藏内容联动面板** (candidates/page.tsx line 1359-1362)
   ```tsx
   // 快速方案：暂时注释
   {/* 内容联动面板定位不明，暂时隐藏 */}
   ```
   
   **效果**: 减少用户困惑，避免看到定位不清的模块

5. **操作区简化文案** (candidates/page.tsx line 1477-1520)
   ```tsx
   // 快速方案：改按钮文案
   "导入线索库" → "导入线索库并继续跟进"
   
   // 导入成功后显示引导
   toast.success('已导入线索库，可在线索库继续跟进', {
     action: { label: '去线索库', onClick: () => router.push('/customer/radar/prospects') }
   });
   ```
   
   **效果**: 用户清楚知道下一步是去线索库

**总计改动**: 5处注释 + 1处文案调整，10分钟内完成

**用户感知变化**:
- 之前：打开详情 → 看一堆模块 → 不知道该点哪个
- 之后：打开详情 → 看背调结果 → 评级 → 导入 → 去线索库跟进

---

### Phase 2: 遗留页面路径清理（次要优先）

**改动量**: 5分钟

**具体改动**:

1. **channels/tasks/profiles 加重定向**
   ```tsx
   // src/app/customer/radar/channels/page.tsx
   import { redirect } from 'next/navigation';
   export default function ChannelsPage() {
     redirect('/customer/radar/search');
   }
   ```
   
   **效果**: 用户访问旧路径时自动跳转到新版自动搜索页

**总计改动**: 3个页面加redirect，5分钟完成

---

### Phase 3: 线索库快速补充外联入口（可选）

**改动量**: 20分钟，如果Phase 1效果好可以暂缓

**具体改动**:

1. **线索库详情增加邮件序列入口**
   ```tsx
   // prospects/page.tsx 详情区增加
   <div className="...">
     <h4>外联推进</h4>
     <button onClick={() => generateEmailSequence(prospect)}>
       生成邮件序列
     </button>
     <button onClick={() => sendOutreach(prospect)}>
       发送开发信
     </button>
   </div>
   ```
   
   **效果**: 线索库有实质功能，用户导入后知道去哪里跟进

---

## 三、执行顺序建议

**立即执行**（今天完成）:
1. Phase 1: 候选池详情精简（10分钟）
2. Phase 2: 遗留页面重定向（5分钟）

**效果验证**（明天）:
- 让用户走一遍完整流程：画像 → 自动搜索 → 候选池审核 → 导入 → 线索库
- 确认用户不再困惑"我该做什么"

**可选补充**（如果验证后发现线索库太空）:
- Phase 3: 线索库增加外联入口（20分钟）

---

## 四、为什么这是最快见效的方案

1. **不改后端**: 所有改动都是前端注释/文案调整，不需要API调整
2. **不改数据结构**: 不涉及schema变更，不需要数据库迁移
3. **不改路由**: 导航已经在Phase 1-3完成，只需要注释旧页面
4. **立即改善心智**: 用户打开候选池就知道"审核→导入"，不再困惑

---

## 五、验证标准

用户走完流程后应该能清楚回答：
1. "我现在在做什么？" → 审核候选 / 在线索库跟进
2. "下一步该做什么？" → 导入线索库 / 发送开发信
3. "这个页面是干什么的？" → 候选池是审核筛选，线索库是外联推进

---

## 六、具体代码改动位置

```
src/app/customer/radar/candidates/page.tsx:
  - line 1365-1475: 注释邮件序列模块
  - line 1523+: 注释发送开发信入口
  - line 1359-1362: 注释内容联动面板
  - line 1224: useEffect自动触发背调
  - line 1515: 改按钮文案 + 增加跳转引导

src/app/customer/radar/channels/page.tsx:
  - 整个文件改成redirect('/customer/radar/search')

src/app/customer/radar/tasks/page.tsx:
  - 整个文件改成redirect('/customer/radar/search')

src/app/customer/radar/profiles/page.tsx:
  - 整个文件改成redirect('/customer/radar/search')
```

---

**结论**: 15分钟改动，立即改善用户心智。如果需要我直接开始改代码，请确认。