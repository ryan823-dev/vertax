// ==================== 企业背调AI工作流Prompt模板 ====================
// 用于AI Agent引导执行企业背调调查的标准Prompt

/**
 * 企业背调OSINT工作流Prompt
 *
 * 此Prompt用于引导AI Agent执行完整的企业背景调查流程。
 * 可用于国际贸易、投资决策、合作伙伴筛选等场景。
 */

export const COMPANY_INVESTIGATION_PROMPT = `
# 企业背景调查OSINT工作流

## 任务目标
对目标企业执行开源情报(OSINT)收集，生成企业背调报告。

## 输入信息
- **目标企业名称**: {{company_name}}
- **已知域名**: {{domain}} (可选)
- **所在国家**: {{country}} (可选)
- **调查深度**: {{depth}} (basic/standard/deep)

## 执行流程

### Phase 1: 身份验证 (IDENTITY)

**目标**: 验证企业身份真实性，获取基础联系方式。

**步骤**:
1. **官网验证**
   - 搜索企业官网: "{{company_name}} official website"
   - 检查网站状态、SSL证书、技术栈
   - 提取联系方式(邮箱、电话、地址)

2. **Whois查询** (如有域名)
   - 查询域名注册信息
   - 关注: 注册时间、注册人、隐私保护
   - 计算: 域名年龄，检测异常(如注册时间短)

3. **LinkedIn搜索**
   - 搜索LinkedIn公司主页
   - 获取: 员工规模、行业、总部位置
   - 验证: 是否存在官方LinkedIn页面

**输出**:
- 身份验证状态 (已验证/部分验证/无法验证)
- 官网运行状态
- 基础联系方式

---

### Phase 2: 法定注册 (REGISTRATION)

**目标**: 获取企业法定注册信息、股东结构。

**步骤**:
1. **选择企业注册数据库**
   - 美国: OpenCorporates, Delaware Secretary of State
   - 英国: Companies House
   - 欧盟: EU Business Register
   - 全球: OpenCorporates

2. **搜索企业注册记录**
   - 查询: 注册号、注册地址、注册资本
   - 获取: 法定代表人、股东列表、高管列表
   - 检查: 经营状态 (正常/注销/清算)

3. **验证注册信息一致性**
   - 对比: 注册名称与官方名称
   - 对比: 注册地址与官网地址
   - 检查: 成立时间与域名注册时间关系

**输出**:
- 注册状态 (ACTIVE/DISSOLVED/SUSPENDED)
- 股东和高管信息
- 注册资本和成立时间

---

### Phase 3: 关联穿透 (ASSOCIATION)

**目标**: 识别关联企业、推断最终受益人，检测壳公司特征。

**步骤**:
1. **股东穿透**
   - 对企业股东反向查询其他投资
   - 标记: 母公司(持股≥50%)、重要投资方
   - 构建: 股东关联图谱

2. **高管关联**
   - 查询高管在其他企业的任职
   - 识别: 兄弟公司(同一高管任职)
   - 检测: 高管背景异常

3. **最终受益人(UBO)推断**
   - 个人股东直接识别为UBO
   - 企业股东需进一步穿透(持股≥25%)
   - 构建: 控制链图谱

4. **壳公司特征检测**
   - 检查: 注册地址(虚拟办公室/代理地址)
   - 检查: 注册资本与实缴资本差异
   - 检查: 经营范围异常宽泛
   - 检查: 股东/高管信息缺失

**输出**:
- 关联企业列表
- 最终受益人列表
- 壳公司风险信号

---

### Phase 4: 风险扫描 (RISK)

**目标**: 扫描制裁名单、公开法律记录、诉讼信息、负面新闻。

**步骤**:
1. **制裁名单检查**
   - 美国: OFAC SDN List
   - 欧盟: EU Sanctions List
   - 英国: UK Sanctions List
   - 联合国: UN Security Council Sanctions
   - 如命中: 直接标记高风险，暂停调查

2. **公开法律记录检查**
   - 查询: 法院公告、执行案件、监管处罚
   - 检查: 案件状态、执行进展、公开处罚信息
   - 获取: 涉案金额、案件阶段、披露主体

3. **诉讼记录搜索**
   - 搜索: "{{company_name}} lawsuit" / "{{company_name}} 起诉"
   - 提取: 案件类型、案件状态、涉案金额

4. **负面新闻舆情**
   - 搜索: "{{company_name}}" + 负面关键词
   - 关键词: fraud/scam/bankruptcy/investigation/违规/处罚
   - 评估: 新闻来源可信度、新闻时效性

**输出**:
- 风险记录列表
- 风险评分 (0-100)
- 风险等级 (HIGH/MEDIUM/LOW/CLEAR)

---

### Phase 5: 经营验证 (BUSINESS)

**目标**: 验证业务真实性，评估经营活跃度。

**步骤**:
1. **海关进出口数据**
   - 搜索: 进出口记录新闻/公告
   - 提取: 进出口产品、交易对手、交易国家
   - 注意: 专业数据需付费API

2. **招投标中标记录**
   - 搜索: "{{company_name}} 中标"
   - 获取: 中标项目、中标金额、招标方
   - 验证: 业务真实性

3. **经营新闻动态**
   - 搜索: 产品发布、合作新闻、投资新闻
   - 提取: 主要产品、主要市场、合作伙伴

4. **经营活跃度评估**
   - 计算: 基于记录数量和时效性
   - 输出: 活跃度评分 (0-100)

**输出**:
- 经营记录列表
- 经营活跃度评分
- 主要市场和产品

---

## 报告生成

### 综合评分计算

**真实性评分** (0-100):
- 身份层贡献 (30%): 官网+LinkedIn验证
- 注册层贡献 (40%): 注册状态+成立时间+注册资本
- 风险层贡献 (20%): 风险评分反向加权
- 经营层贡献 (10%): 经营活跃度

**风险等级判定**:
- HIGH: 制裁记录 / 重大诉讼或执行 / 企业注销
- MEDIUM: 壳公司特征 / 风险评分<60
- LOW: 风险评分60-80 / 真实性评分<70
- CLEAR: 风险评分>80 / 真实性评分>70

### 报告格式

\`\`\`markdown
# 企业背调报告

## 基本信息
- 目标企业: {{company_name}}
- 调查深度: {{depth}}
- 生成时间: {{timestamp}}

## 综合评估
| 指标 | 结果 |
| --- | --- |
| 真实性评分 | {{authenticity_score}}/100 |
| 风险等级 | {{overall_risk}} |

## 关键发现
[+] 身份验证: 官网正常运行
[+] 注册信息: 企业正常经营，成立10年
[-] 风险信息: 发现诉讼记录
[!] 关联穿透: 存在壳公司特征

## 可疑信号
- 域名注册时间较短: 3个月
- 股东信息未披露

## 建议行动
- 建议谨慎推进，可要求对方提供补充材料
- 建议实地考察或视频会议确认
\`\`\`

---

## 注意事项

### 数据源可靠性标注
- **OFFICIAL**: 官方数据源(企业注册、制裁名单)
- **COMMERCIAL**: 商业数据源(付费API)
- **PUBLIC**: 公开数据源(官网、LinkedIn)
- **INFERRED**: AI推断数据(搜索+分析)

### 合规要求
- 仅收集公开信息，不侵犯隐私
- 遵守各国数据保护法规
- 报告仅供内部决策参考，不得对外传播

### 时间预估
- BASIC: 1-2分钟
- STANDARD: 3-5分钟
- DEEP: 5-10分钟
`;

/**
 * 快速背调Prompt模板
 */
export const QUICK_INVESTIGATION_PROMPT = `
# 快速企业背调

## 目标
快速验证企业身份真实性，生成基础背调报告。

## 输入
- 企业名称: {{company_name}}
- 已知域名: {{domain}} (可选)

## 步骤

### 1. 官网验证 (30秒)
搜索 "{{company_name}} official website"，检查:
- 网站是否正常运行
- 是否有SSL证书
- 是否提供联系方式

### 2. LinkedIn验证 (30秒)
搜索 "{{company_name}} LinkedIn"，检查:
- 是否存在公司主页
- 员工规模是否匹配声称规模

### 3. 企业注册查询 (1分钟)
使用OpenCorporates查询 "{{company_name}}":
- 注册状态 (Active/Dissolved)
- 成立时间
- 注册国家

### 输出格式
\`\`\`
企业: {{company_name}}
验证状态: [已验证/部分验证/无法验证]
官网: [正常运行/异常]
LinkedIn: [存在/不存在]
注册状态: [正常/异常]
建议: [可推进/需进一步核实]
\`\`\`
`;

/**
 * 风险优先Prompt模板
 */
export const RISK_PRIORITY_PROMPT = `
# 企业风险优先扫描

## 目标
快速扫描企业风险信息，识别高风险信号。

## 输入
- 企业名称: {{company_name}}
- 国家: {{country}}

## 执行顺序

### 1. 制裁名单检查 (最高优先级)
搜索 "{{company_name}}" 在以下名单:
- OFAC SDN List (美国)
- EU Sanctions List (欧盟)
- UN Sanctions List (联合国)

**如果命中**: 立即终止调查，标记"禁止合作"，报告风险。

### 2. 公开法律记录检查 (高优先级)
搜索 "{{company_name}} lawsuit" / "{{company_name}} legal action":
- 检查是否存在公开诉讼、执行或监管处罚
- 检查是否有持续中的法院或执法记录

### 3. 负面新闻搜索 (中优先级)
搜索 "{{company_name}}" + 负面关键词:
- fraud/scam/investigation/bankruptcy
- 违规/处罚/涉嫌/调查

### 4. 法院公告搜索 (中优先级)
搜索 "{{company_name}} 法院公告/诉讼"

## 输出格式
\`\`\`
风险扫描结果
- 制裁名单: [无命中/命中-具体名单]
- 法律记录: [无/有-案件详情]
- 诉讼记录: [无/有-案件数量]
- 负面新闻: [无/有-关键词]

风险等级: [HIGH/MEDIUM/LOW/CLEAR]
风险评分: {{score}}/100
建议: [禁止合作/谨慎推进/正常推进]
\`\`\`
`;

/**
 * 股权穿透Prompt模板
 */
export const ASSOCIATION_PROMPT = `
# 企业股权穿透分析

## 目标
识别企业关联关系，推断最终受益人，检测壳公司特征。

## 输入
- 企业名称: {{company_name}}
- 股东列表: {{shareholders}}
- 高管列表: {{officers}}

## 执行步骤

### 1. 股东分析
对每个股东:
- 如果是企业: 查询该企业的其他投资
- 如果持股≥50%: 标记为母公司/主要投资方
- 构建股东关系树

### 2. 高管关联
对每个高管:
- 搜索 "{{officer_name}}" 在其他企业的任职
- 识别兄弟公司关系
- 检测高管背景异常

### 3. UBO推断
- 个人股东直接识别为UBO
- 企业股东穿透至持股≥25%的最终个人
- 构建控制链

### 4. 壳公司检测
检查特征:
- 注册地址含"虚拟办公室/代理地址"
- 实缴资本<注册资本10%
- 经营范围异常宽泛
- 股东/高管信息缺失
- 无实际经营活动

## 输出格式
\`\`\`
股权穿透结果

## 关联企业
| 企业名 | 关系 | 持股比例 |
| --- | --- | --- |
| {{name}} | {{relationship}} | {{shareholding}}% |

## 最终受益人
| 姓名 | 持股比例 | 控制类型 |
| --- | --- | --- |
| {{ubo_name}} | {{shareholding}}% | {{control_type}} |

## 壳公司检测
- 特征数量: {{signal_count}}
- 风险判定: {{shell_risk}}
\`\`\`
`;

// 导出所有Prompt模板
export const PROMPT_TEMPLATES = {
  full: COMPANY_INVESTIGATION_PROMPT,
  quick: QUICK_INVESTIGATION_PROMPT,
  risk: RISK_PRIORITY_PROMPT,
  association: ASSOCIATION_PROMPT,
};

/**
 * 生成填充后的Prompt
 */
export function generatePrompt(
  template: string,
  params: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '未知');
  }

  return result;
}

/**
 * 根据调查深度选择Prompt模板
 */
export function selectPromptTemplate(depth: 'basic' | 'standard' | 'deep'): string {
  switch (depth) {
    case 'basic':
      return QUICK_INVESTIGATION_PROMPT;
    case 'standard':
      return COMPANY_INVESTIGATION_PROMPT;
    case 'deep':
      return COMPANY_INVESTIGATION_PROMPT;
    default:
      return COMPANY_INVESTIGATION_PROMPT;
  }
}
