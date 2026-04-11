/**
 * 语义内容组件
 * 用于把关键概念、对比信息和定义以更适合搜索引擎与 AI 抽取的方式展示出来。
 */

export interface SemanticTriple {
  subject: string;
  verb: string;
  object: string;
}

export interface SemanticContentProps {
  triples: SemanticTriple[];
}

export function SemanticTripleList({ triples }: SemanticContentProps) {
  return (
    <ul className="my-4 space-y-2" role="list" aria-label="关键事实">
      {triples.map((triple, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
          <span className="mt-1 text-cyan-500">•</span>
          <span>
            <strong className="text-white">{triple.subject}</strong>{" "}
            <span className="text-gray-400">{triple.verb}</span>{" "}
            <span>{triple.object}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface FeatureParagraphProps {
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
  timeframe = "短期内",
}: FeatureParagraphProps) {
  return (
    <div className="my-4">
      <p className="leading-relaxed text-gray-300">
        <strong className="text-white">{feature}</strong> 帮助
        <span className="text-cyan-400"> {user} </span>
        解决
        <span className="text-cyan-400"> {job} </span>
        。它通过 {mechanism} 实现 {process}，团队通常可以在 {timeframe} 内看到
        <strong className="text-white"> {result}</strong>。
      </p>
    </div>
  );
}

export interface ComparisonItem {
  feature: string;
  vertax: string;
  alternative: string;
  source?: string;
}

export interface ComparisonTableProps {
  title: string;
  alternatives: string[];
  items: ComparisonItem[];
}

export function ComparisonTable({
  title,
  alternatives,
  items,
}: ComparisonTableProps) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label={title}>
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left font-medium text-gray-400">
              特性
            </th>
            <th className="px-4 py-3 text-left font-medium text-cyan-400">
              VertaX
            </th>
            {alternatives.map((alt, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left font-medium text-gray-400"
              >
                {alt}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b border-white/5">
              <td className="px-4 py-3 text-white">{item.feature}</td>
              <td className="px-4 py-3 text-cyan-300">{item.vertax}</td>
              {alternatives.map((_, altIndex) => (
                <td
                  key={altIndex}
                  className="px-4 py-3 text-gray-400"
                >
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

export interface KeyDefinitionProps {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

export function KeyDefinition({
  term,
  definition,
  relatedTerms,
}: KeyDefinitionProps) {
  return (
    <div className="my-6 rounded-lg border border-white/10 bg-white/5 p-4">
      <dl>
        <dt className="mb-2 text-lg font-bold text-white">{term}</dt>
        <dd className="leading-relaxed text-gray-300">{definition}</dd>
        {relatedTerms && relatedTerms.length > 0 && (
          <dd className="mt-3 text-sm text-gray-500">
            相关术语：
            {relatedTerms.map((relatedTerm, index) => (
              <span
                key={index}
                className="ml-2 rounded bg-white/5 px-2 py-0.5 text-gray-400"
              >
                {relatedTerm}
              </span>
            ))}
          </dd>
        )}
      </dl>
    </div>
  );
}

export const vertaxCoreTriples: SemanticTriple[] = [
  {
    subject: "VertaX",
    verb: "是",
    object: "面向中国企业出海场景的智能获客平台",
  },
  {
    subject: "VertaX",
    verb: "覆盖",
    object: "内容增长、客户发现、线索转化与协同执行等核心模块",
  },
  {
    subject: "知识引擎",
    verb: "沉淀",
    object: "企业私有知识与可复用的销售、营销语料",
  },
  {
    subject: "获客雷达",
    verb: "发现",
    object: "更接近 ICP 的目标客户、线索和市场信号",
  },
  {
    subject: "增长系统",
    verb: "生产",
    object: "面向 SEO、AEO、GEO 的多语种内容资产",
  },
  {
    subject: "VertaX",
    verb: "支持",
    object: "SEO、AEO、GEO 一体化增长执行",
  },
];

export const aeoGeoTriples: SemanticTriple[] = [
  {
    subject: "AEO",
    verb: "全称是",
    object: "Answer Engine Optimization",
  },
  {
    subject: "GEO",
    verb: "全称是",
    object: "Generative Engine Optimization",
  },
  {
    subject: "AEO",
    verb: "优化目标是",
    object: "让品牌更容易被答案引擎引用和总结",
  },
  {
    subject: "GEO",
    verb: "优化目标是",
    object: "让品牌信息更容易进入生成式搜索与 AI 回答",
  },
  {
    subject: "ChatGPT Search",
    verb: "属于",
    object: "生成式搜索入口的一种代表形态",
  },
  {
    subject: "Perplexity",
    verb: "特点是",
    object: "在回答中直接展示引用来源",
  },
  {
    subject: "语义三元组",
    verb: "常见格式是",
    object: "[主体] [动作] [客体]",
  },
];
