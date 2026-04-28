/**
 * 目标客户画像评分配置类型定义
 *
 * 用户可以自定义正向/负向信号，控制获客雷达的候选评分逻辑
 */

/**
 * 评分信号规则
 */
export interface ScoringSignal {
  id: string;           // 唯一标识
  name: string;         // 信号名称（显示用）
  keywords: string[];   // 匹配关键词
  weight: number;       // 权重分数
  description?: string; // 说明
  category?: string;    // 分类（用于UI分组）
}

/**
 * 负向信号（排除规则）
 */
export interface ExclusionSignal {
  id: string;
  name: string;
  keywords: string[];
  description?: string;
  category?: string;
}

/**
 * 联系方式完整性评分
 */
export interface ContactScoring {
  hasWebsite: number;   // 有网站加分
  hasPhone: number;     // 有电话加分
  hasEmail: number;     // 有邮箱加分
}

/**
 * 信号来源加分配置
 *
 * 不同来源的信号代表不同意向程度
 */
export interface ChannelScoring {
  // 招标/采购信号
  tender: number;          // 政府招标
  ungm: number;            // 联合国采购
  ted: number;             // 欧盟招标
  sam_gov: number;         // 美国政府采购

  // 企业发现
  google_places: number;   // Google Maps POI
  brave_search: number;    // 搜索发现

  // 高意向信号
  hiring_signal: number;   // 招聘信号（公司增长）
  trade_data: number;      // 贸易数据（已购买相关产品）
  trade_show: number;      // 展会参展（有市场预算）

  // 其他
  ai_search: number;       // AI 搜索发现
  directory: number;       // 目录/黄页
}

/**
 * 层级阈值配置
 */
export interface TierThresholds {
  tierA: number;        // A级最低分（优质客户）
  tierB: number;        // B级最低分（潜力客户）
  // C级 = 低于 tierB 但不被排除
}

/**
 * 完整的评分配置
 */
export interface ScoringProfile {
  // 正向信号
  positiveSignals: ScoringSignal[];

  // 负向信号（命中即排除）
  negativeSignals: ExclusionSignal[];

  // 联系方式评分
  contactScoring: ContactScoring;

  // 信号来源加分
  channelScoring: ChannelScoring;

  // 层级阈值
  thresholds: TierThresholds;

  // 目标国家加分
  targetCountryBonus: number;

  // 基础分（确保所有候选至少得C级）
  baseScore: number;

  // 最后更新时间
  updatedAt?: string;

  // 更新人
  updatedBy?: string;
}

/**
 * 默认评分配置
 *
 * 基于涂装设备出海场景的默认规则
 */
export const DEFAULT_SCORING_PROFILE: ScoringProfile = {
  positiveSignals: [
    {
      id: 'manufacturer',
      name: '制造商信号',
      keywords: ['manufacturing', 'manufacturer', 'factory', 'mfg', '生产', '制造'],
      weight: 5,
      description: '生产型企业，有工厂',
      category: '企业类型',
    },
    {
      id: 'industrial-paint-automation',
      name: '工业涂装',
      keywords: [
        'robotic painting system',
        'spray painting automation',
        'industrial paint automation',
        'automatic paint spraying system',
        'robotic spray painting cell',
        'paint booth automation',
        'liquid paint finishing',
        'paint finishing line',
        'paint coating',
        'industrial painting',
        'paint line automation',
        '涂装',
        '喷涂',
      ],
      weight: 4,
      description: '工业涂装相关企业',
      category: '行业相关',
    },
    {
      id: 'automotive',
      name: '汽车相关',
      keywords: ['automotive', 'automotive paint', 'car', 'vehicle', '汽车', '整车'],
      weight: 3,
      description: '汽车制造或配套企业',
      category: '行业相关',
    },
    {
      id: 'metal-steel',
      name: '金属/钢铁',
      keywords: ['metal', 'steel', 'aluminum', '金属', '钢铁', '铝材'],
      weight: 2,
      description: '金属加工或钢铁企业',
      category: '行业相关',
    },
    {
      id: 'engineering',
      name: '工程/技术公司',
      keywords: ['engineering', 'technology', 'systems', '工程', '技术', '系统'],
      weight: 2,
      description: '工程技术类企业',
      category: '企业类型',
    },
  ],

  negativeSignals: [
    {
      id: 'retail-supply',
      name: '零售/供应商',
      keywords: [
        'supply',
        'supplier',
        'store',
        'shop',
        'warehouse',
        'paint distributor',
        'coating materials supplier',
        '供应',
        '商店',
        '仓库',
      ],
      description: '非终端客户，是中间商',
      category: '非目标客户',
    },
    {
      id: 'repair-service',
      name: '维修服务',
      keywords: ['repair', 'autobody', 'auto body', 'collision', 'restoration', '维修', '修补'],
      description: '维修服务商，非制造商',
      category: '非目标客户',
    },
    {
      id: 'paint-retail',
      name: '油漆零售',
      keywords: ['paints', 'colors', '油漆店', '涂料店'],
      description: '油漆涂料零售商',
      category: '非目标客户',
    },
    {
      id: 'non-paint-coating-process',
      name: '非油漆喷涂工艺',
      keywords: [
        'powder coating only',
        'battery slurry coating',
        'medical coating',
        'functional film coating',
        'adhesive dispensing',
        'glue dispensing',
        'sealant dispensing',
        'electroplating',
        'anodizing',
        'pvd coating',
        'thermal spray',
        'surface treatment only',
        'generic coating equipment',
      ],
      description: '非液体油漆喷涂自动化场景',
      category: '非目标客户',
    },
    {
      id: 'non-industrial',
      name: '非工业类',
      keywords: ['art studio', 'gallery', 'retail', '画廊', '艺术'],
      description: '非工业领域',
      category: '非目标客户',
    },
  ],

  contactScoring: {
    hasWebsite: 2,
    hasPhone: 1,
    hasEmail: 1,
  },

  // 信号来源加分（基于意向程度）
  channelScoring: {
    // 招标/采购信号 - 最高优先级（明确需求）
    tender: 5,           // 通用招标
    ungm: 6,             // 联合国采购
    ted: 5,              // 欧盟招标
    sam_gov: 6,          // 美国政府采购

    // 企业发现 - 中等优先级
    google_places: 2,    // Google Maps POI
    brave_search: 2,     // 搜索发现

    // 高意向信号 - 高优先级
    hiring_signal: 4,    // 招聘信号（公司增长=潜在需求）
    trade_data: 8,       // 贸易数据（已购买相关产品=最高意向）
    trade_show: 5,       // 展会参展（有市场预算=主动拓展）

    // 其他
    ai_search: 2,        // AI 搜索发现
    directory: 1,        // 目录/黄页
  },

  thresholds: {
    tierA: 8,
    tierB: 5,
  },

  targetCountryBonus: 1,
  baseScore: 0,
};

/**
 * 预设评分模板
 *
 * 针对不同行业场景的预设配置
 */
export const SCORING_TEMPLATES: Record<string, {
  name: string;
  description: string;
  profile: ScoringProfile;
}> = {
  'coating-equipment': {
    name: '涂装设备出海',
    description: '适用于涂装设备、喷涂生产线制造商寻找海外买家',
    profile: DEFAULT_SCORING_PROFILE,
  },
  'machinery-export': {
    name: '机械设备出口',
    description: '适用于各类机械设备制造商寻找海外工厂客户',
    profile: {
      ...DEFAULT_SCORING_PROFILE,
      positiveSignals: [
        {
          id: 'manufacturer',
          name: '制造商信号',
          keywords: ['manufacturing', 'manufacturer', 'factory', 'mfg', '生产', '制造'],
          weight: 5,
          category: '企业类型',
        },
        {
          id: 'production-line',
          name: '生产线企业',
          keywords: ['production', 'assembly line', 'factory', 'plant', '生产线', '工厂'],
          weight: 4,
          category: '企业类型',
        },
        {
          id: 'industrial',
          name: '工业企业',
          keywords: ['industrial', 'industry', '工业'],
          weight: 3,
          category: '行业相关',
        },
      ],
      negativeSignals: [
        {
          id: 'retail-supply',
          name: '零售/供应商',
          keywords: ['supply', 'supplier', 'store', 'shop', 'distributor', '供应', '分销'],
          category: '非目标客户',
        },
        {
          id: 'service-only',
          name: '纯服务商',
          keywords: ['service', 'consulting', 'agency', '服务', '咨询', '代理'],
          category: '非目标客户',
        },
      ],
    },
  },
  'b2b-saas': {
    name: 'B2B SaaS 销售',
    description: '适用于B2B软件寻找企业客户',
    profile: {
      ...DEFAULT_SCORING_PROFILE,
      positiveSignals: [
        {
          id: 'tech-company',
          name: '科技公司',
          keywords: ['technology', 'software', 'tech', 'it', 'digital', '科技', '软件'],
          weight: 4,
          category: '企业类型',
        },
        {
          id: 'enterprise',
          name: '中大型企业',
          keywords: ['enterprise', 'corporation', 'inc', 'ltd', 'group', '集团', '公司'],
          weight: 3,
          category: '企业规模',
        },
        {
          id: 'hiring',
          name: '正在招聘',
          keywords: ['hiring', 'careers', 'jobs', '招聘'],
          weight: 2,
          category: '增长信号',
        },
      ],
      negativeSignals: [
        {
          id: 'freelancer',
          name: '个人/自由职业',
          keywords: ['freelance', 'consultant', 'self-employed', '自由职业', '个人'],
          category: '非目标客户',
        },
      ],
    },
  },
};
