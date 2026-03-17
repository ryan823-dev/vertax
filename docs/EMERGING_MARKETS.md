# 新兴市场获客指南

## 覆盖区域

VertaX 获客雷达现已全面覆盖四大新兴市场，包含 **40+ 国家**，**数百个采购平台**。

---

## 🌍 中东和北非 (MENA)

### 重点国家
- 🇸🇦 沙特阿拉伯 - 2030 愿景推动基建热潮
- 🇦🇪 阿联酋 - 迪拜/阿布扎比商业中心
- 🇶🇦 卡塔尔 - 后世界杯时代持续发展
- 🇲🇦 摩洛哥 - 非洲门户
- 🇪🇬 埃及 - 人口红利 + 苏伊士运河经济区

### 数据源
| 平台 | 覆盖 | 类型 |
|------|------|------|
| Manafathat | 沙特 | 政府采购 |
| Etimad | 摩洛哥 | 政府采购 |
| UAE Tenders | 阿联酋 | 综合招标 |
| Qatar Tenders | 卡塔尔 | 综合招标 |

### 行业机会
- 石油化工设备（海湾国家）
- 建筑涂料（基建项目）
- 工业涂装（制造业转移）
- 农业设备（北非）

---

## 🌍 非洲 (AFRICA)

### 重点国家
- 🇳🇬 尼日利亚 - 非洲第一大经济体
- 🇰🇪 肯尼亚 - 东非门户
- 🇿🇦 南非 - 工业化程度最高
- 🇪🇹 埃塞俄比亚 - 制造业新兴地
- 🇬🇭 加纳 - 政治稳定 + 资源丰富

### 数据源
| 平台 | 覆盖 | 类型 |
|------|------|------|
| EGPP | 埃及 | 政府采购 |
| Tenders Kenya | 肯尼亚 | 政府采购 |
| Tenders Nigeria | 尼日利亚 | 综合招标 |
| Tenders South Africa | 南非 | 综合招标 |

### 行业机会
- 农业机械（粮食安全）
- 建材涂料（城市化）
- 电力设备（能源基建）
- 矿业设备（资源开发）

---

## 🌍 拉美 (LATAM)

### 重点国家
- 🇧🇷 巴西 - 拉美最大市场
- 🇲🇽 墨西哥 - 近岸外包受益者
- 🇨🇱 智利 - 矿业 + 稳定增长
- 🇨🇴 哥伦比亚 - 多元化经济
- 🇦🇷 阿根廷 - 农业 + 能源

### 数据源
| 平台 | 覆盖 | 语言 |
|------|------|------|
| ComprasNet | 巴西 | 葡萄牙语 |
| Mercado Público | 墨西哥 | 西班牙语 |
| ChileCompra | 智利 | 西班牙语 |
| Colombia Compra | 哥伦比亚 | 西班牙语 |
| Argentina Compra | 阿根廷 | 西班牙语 |

### 行业机会
- 矿业设备（智利/秘鲁）
- 汽车制造（墨西哥/巴西）
- 农业加工（阿根廷/巴西）
- 石油天然气（墨西哥/巴西）

---

## 🌍 东欧和中亚 (ECA)

### 重点国家
- 🇵🇱 波兰 - 欧盟制造业中心
- 🇹🇷 土耳其 - 欧亚桥梁
- 🇰🇿 哈萨克斯坦 - 中亚最大市场
- 🇺🇿 乌兹别克斯坦 - 改革开放
- 🇷🇴 罗马尼亚 - IT+ 制造业

### 数据源
| 平台 | 覆盖 | 语言 |
|------|------|------|
| Zakupki | 俄罗斯/独联体 | 俄语 |
| Vestnik | 哈萨克斯坦 | 俄语 |
| Uzlis | 乌兹别克斯坦 | 俄语/乌兹别克语 |
| E-Uzk | 乌克兰 | 乌克兰语 |

### 行业机会
- 工业制造（波兰/土耳其）
- 能源设备（哈萨克斯坦）
- 农业加工（乌克兰/哈萨克斯坦）
- 基建材料（中亚）

---

## 📊 国际开发银行项目

### 覆盖银行
| 银行 | 覆盖区域 | 重点领域 |
|------|----------|----------|
| 世界银行 | 全球 | 基建/教育/卫生 |
| 非洲开发银行 | 非洲 54 国 | 基建/农业/能源 |
| 美洲开发银行 | 拉美/加勒比 | 基建/社会项目 |
| 欧洲复兴开发银行 | 东欧/中亚 | 私营部门/基建 |
| 伊斯兰开发银行 | 伊斯兰国家 | 基建/减贫 |

### 项目类型
- 政府采购招标
- 设备采购合同
- 咨询服务合同
- 工程建设合同

---

## 🎯 使用建议

### 1. 地区优先级配置

```typescript
// 在 RadarSearchProfile 中配置
{
  regions: ['MENA', 'AFRICA', 'LATAM', 'ECA'],
  countries: ['SA', 'AE', 'NG', 'BR', 'MX'], // 重点国家
  targetIndustries: ['coating', 'manufacturing', 'mining'],
}
```

### 2. 数据源组合

```typescript
// 启用多个数据源
{
  enabledChannels: ['TENDER', 'ECOSYSTEM'],
  sourceIds: [
    'ungm',              // 联合国采购
    'dev_bank',          // 开发银行项目
    'emerging_markets',  // 本地采购平台
    'trade_data',        // 海关数据
  ],
}
```

### 3. 多语言关键词

```typescript
// 使用本地语言关键词效果更好
{
  keywords: [
    'coating',          // 英语
    'recubrimiento',    // 西班牙语（拉美）
    'revestimento',     // 葡萄牙语（巴西）
    'покрытие',         // 俄语（东欧）
    'طلاء',             // 阿拉伯语（中东）
  ],
}
```

---

## ⚡ 信号评分增强

新兴市场信号来源加分：

```typescript
channelScoring: {
  // 开发银行项目 - 高优先级
  dev_bank: 7,         // 世界银行等
  
  // 本地采购平台 - 中高优先级
  emerging_markets: 6, // 中东/非洲/拉美/东欧
  
  // 贸易数据 - 最高意向
  trade_data: 8,       // 已购买相关产品
}
```

---

## 📈 最佳实践

### 1. 开发银行项目
- ✅ 预算明确（美元/欧元）
- ✅ 流程规范（国际招标）
- ✅ 付款有保障
- ⚠️ 周期较长（6-18 个月）

### 2. 本地采购平台
- ✅ 需求直接
- ✅ 决策较快
- ⚠️ 需要本地化（语言/关系）
- ⚠️ 付款条件需评估

### 3. 海关数据
- ✅ 已验证买家
- ✅ 需求明确
- ✅ 成交率高
- ⚠️ 数据更新频率

### 4. 展会参展商
- ✅ 有市场预算
- ✅ 主动拓展
- ✅ 质量较高
- ⚠️ 需要跟进时机

---

## 🔧 配置示例

### 中东市场配置

```json
{
  "name": "中东市场开发",
  "regions": ["MENA"],
  "countries": ["SA", "AE", "QA", "KW"],
  "targetIndustries": ["coating", "oil_gas", "construction"],
  "keywords": ["coating", "painting", "surface treatment"],
  "enabledChannels": ["TENDER", "ECOSYSTEM"],
  "sourceIds": ["dev_bank", "emerging_markets", "trade_data"]
}
```

### 拉美市场配置

```json
{
  "name": "拉美市场开发",
  "regions": ["LATAM"],
  "countries": ["BR", "MX", "CL", "CO"],
  "targetIndustries": ["mining", "manufacturing", "automotive"],
  "keywords": ["mining equipment", "industrial coating"],
  "enabledChannels": ["TENDER", "TRADESHOW"],
  "sourceIds": ["dev_bank", "emerging_markets", "trade_show"]
}
```

---

## 📞 技术支持

如需配置新兴市场获客雷达，请联系技术支持或查阅文档。
