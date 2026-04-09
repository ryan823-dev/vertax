/**
 * 语义三元组内容组件
 * 帮助 AI 引擎理解和抽取关键事实
 * 模式：[主体] [动作] [客体]
 */

interface SemanticTriple {
  subject: string;
  verb: string;
  object: string;
}

interface SemanticContentProps {
  triples: SemanticTriple[];
}

/**
 * 语义三元组列表
 * 用于关键事实展示，便于 AI 抽取
 */
export function SemanticTripleList({ triples }: SemanticContentProps) {
  return (
    <ul className="space-y-2 my-4" role="list" aria-label="关键事实">
      {triples.map((triple, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
          <span className="text-cyan-500 mt-1">•</span>
          <span>
            <strong className="text-white">{triple.subject}</strong>{' '}
            <span className="text-gray-400">{triple.verb}</span>{' '}
            <span>{triple.object}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 特性→如何→结果 段落组件
 * 标准化段落结构，便于 AI 理解
 */
interface FeatureParagraphProps {
  feature: string;
  user: string;
  job: string;
  mechanism: string;
  process: string;
  result: string;
  timeframe?: string;
}

export function FeatureParagraph({
  feature,
  user,
  job,
  mechanism,
  process,
  result,
  timeframe = "短期内"
}: FeatureParagraphProps) {
  return (
    <div className="my-4">
      <p className="text-gray-300 leading-relaxed">
        <strong className="text-white">{feature}</strong> 帮助 <span className="text-cyan-400">{user}</span> 解决 <span className="text-cyan-400">{job}</span>。
        它通过 {mechanism} 实现 {process}。
        团队可在 {timeframe} 看到 <strong className="text-white">{result}</strong>。
      </p>
    </div>
  );
}

/**
 * 比较表格组件
 * 用于产品对比页面，便于 AI 抽取比较数据
 */
interface ComparisonItem {
  feature: string;
  vertax: string;
  alternative: string;
  source?: string;
}

interface ComparisonTableProps {
  title: string;
  alternatives: string[];
  items: ComparisonItem[];
}

export function ComparisonTable({ title, alternatives, items }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm" role="table" aria-label={title}>
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">特性</th>
            <th className="text-left py-3 px-4 text-cyan-400 font-medium">VertaX</th>
            {alternatives.map((alt, i) => (
              <th key={i} className="text-left py-3 px-4 text-gray-400 font-medium">{alt}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b border-white/5">
              <td className="py-3 px-4 text-white">{item.feature}</td>
              <td className="py-3 px-4 text-cyan-300">{item.vertax}</td>
              {alternatives.map((_, i) => (
                <td key={i} className="py-3 px-4 text-gray-400">
                  {item.alternative}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 关键定义组件
 * 用于 Category Explainer 页面，清晰定义概念
 */
interface KeyDefinitionProps {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

export function KeyDefinition({ term, definition, relatedTerms }: KeyDefinitionProps) {
  return (
    <div className="my-6 p-4 bg-white/5 rounded-lg border border-white/10">
      <dl>
        <dt className="text-lg font-bold text-white mb-2">{term}</dt>
        <dd className="text-gray-300 leading-relaxed">{definition}</dd>
        {relatedTerms && relatedTerms.length > 0 && (
          <dd className="mt-3 text-sm text-gray-500">
            相关术语：
            {relatedTerms.map((t, i) => (
              <span key={i} className="ml-2 px-2 py-0.5 bg-white/5 rounded text-gray-400">
                {t}
              </span>
            ))}
          </dd>
        )}
      </dl>
    </div>
  );
}

/**
 * 预定义的 VertaX 核心语义三元组
 * 可在多个页面复用
 */
export const vertaxCoreTriples: SemanticTriple[] = [
  { subject: "VertaX", verb: "是", object: "面向中国企业出海的智能获客平台" },
  { subject: "VertaX", verb: "包含", object: "六大核心模块：决策中心、知识引擎、获客雷达、增长系统、声量枢纽、推进中台" },
  { subject: "知识引擎", verb: "沉淀", object: "企业私有知识库，让 AI 理解业务" },
  { subject: "获客雷达", verb: "发现", object: "ICP 智能客户与线索分层" },
  { subject: "增长系统", verb: "生产", object: "多语言 SEO 内容，吸引自然询盘" },
  { subject: "VertaX", verb: "支持", object: "SEO/AEO/GEO 全链路优化" },
  { subject: "VertaX", verb: "服务", object: "制造业、工业品、技术服务型 B2B 出海企业" },
];

/**
 * AEO/GEO 核心三元组
 */
export const aeoGeoTriples: SemanticTriple[] = [
  { subject: "AEO", verb: "全称是", object: "Answer Engine Optimization（答案引擎优化）" },
  { subject: "GEO", verb: "全称是", object: "Generative Engine Optimization（生成引擎优化）" },
  { subject: "AEO", verb: "优化目标", object: "让品牌在 AI 搜索答案中被引用" },
  { subject: "GEO", verb: "优化目标", object: "让 AI 生成内容时引用企业信息" },
  { subject: "ChatGPT Search", verb: "是", object: "OpenAI 的 AI 搜索引擎" },
  { subject: "Perplexity", verb: "是", object: "AI 搜索引擎，提供带引用的答案" },
  { subject: "Google AI Overviews", verb: "是", object: "Google 搜索中的 AI 摘要功能" },
  { subject: "语义三元组", verb: "格式为", object: "[主体] [动作] [客体]" },
];