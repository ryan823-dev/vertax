"use client";

import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Loader2, 
  Sparkles, 
  CheckCircle2,
  File,
  FileSpreadsheet,
  Presentation,
  Archive,
  X,
  Building2,
  Target,
  Award,
  MapPin,
  Users,
  Zap,
  BookOpen,
  TrendingUp,
  Globe2,
} from 'lucide-react';

// Supported file formats
const SUPPORTED_FORMATS = {
  documents: {
    label: '文档',
    extensions: ['.pdf', '.docx', '.doc', '.txt'],
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  presentations: {
    label: '演示文稿',
    extensions: ['.pptx', '.ppt'],
    icon: Presentation,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  spreadsheets: {
    label: '表格',
    extensions: ['.xlsx', '.xls', '.csv'],
    icon: FileSpreadsheet,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
  },
};

// Mock uploaded documents
const mockDocuments = [
  { id: '1', name: '涂豆科技-产品介绍.pdf', type: 'pdf', size: '2.3 MB', uploadedAt: '2024-03-01', status: 'analyzed' },
  { id: '2', name: '喷涂机器人技术白皮书.docx', type: 'docx', size: '1.8 MB', uploadedAt: '2024-03-02', status: 'analyzed' },
  { id: '3', name: '客户案例集.pptx', type: 'pptx', size: '5.2 MB', uploadedAt: '2024-03-03', status: 'pending' },
];

// Mock company profile (企业能力画像)
const mockProfile = {
  companyName: '涂豆科技',
  companyIntro: '专注于工业喷涂机器人研发与制造的高新技术企业，为汽车、家电、家具等行业提供智能喷涂解决方案。',
  coreProducts: [
    '六轴喷涂机器人',
    '喷涂生产线集成系统',
    '智能视觉检测系统',
    '云端喷涂工艺管理平台',
  ],
  techAdvantages: [
    '自主研发的轨迹规划算法，喷涂均匀度达99.5%',
    '模块化设计，支持快速换型',
    'AI视觉系统，实时检测喷涂质量',
    '节省30%以上涂料消耗',
  ],
  scenarios: [
    '汽车零部件喷涂',
    '家电外壳喷涂',
    '家具表面涂装',
    '3C产品精密喷涂',
  ],
  differentiators: [
    '10年+行业经验，服务200+客户',
    '完整的售后服务体系',
    '支持定制化开发',
    '通过ISO9001/CE认证',
  ],
  targetIndustries: ['汽车制造', '家电制造', '家具生产', '3C电子'],
  targetRegions: ['东南亚', '欧洲', '北美', '中东'],
  buyerPersonas: [
    { role: '生产总监', painPoints: ['效率低', '质量不稳定', '人工成本高'] },
    { role: '采购经理', painPoints: ['性价比', '售后服务', '交付周期'] },
  ],
};

export default function KnowledgeEnginePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [profile, setProfile] = useState(mockProfile);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    // TODO: Implement actual file upload
    setTimeout(() => {
      setIsUploading(false);
    }, 2000);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (selectedDocs.length === 0) return;
    setIsAnalyzing(true);
    // TODO: Call AI analysis API
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);
  }, [selectedDocs]);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B2B]">知识引擎</h1>
          <p className="text-sm text-slate-500 mt-1">上传企业资料，AI自动提炼企业能力画像</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">知识完整度</span>
          <div className="w-32 h-2 bg-[#E7E0D3] rounded-full overflow-hidden">
            <div className="w-[78%] h-full bg-[#C7A56A] rounded-full" />
          </div>
          <span className="text-sm font-bold text-[#C7A56A]">78%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Document Management */}
        <div className="col-span-1 space-y-6">
          {/* Upload Zone */}
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4">上传企业资料</h3>
            <div 
              className="border-2 border-dashed border-[#E7E0D3] rounded-xl p-8 text-center hover:border-[#C7A56A]/50 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
              }}
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-[#C7A56A] animate-spin mx-auto" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">拖拽文件到此处</p>
                  <p className="text-xs text-slate-400 mt-1">支持 PDF、Word、PPT、Excel</p>
                </>
              )}
            </div>

            {/* Supported formats */}
            <div className="mt-4 flex gap-2">
              {Object.values(SUPPORTED_FORMATS).map((format) => (
                <div key={format.label} className={`flex items-center gap-1 px-2 py-1 rounded ${format.bgColor}`}>
                  <format.icon size={12} className={format.color} />
                  <span className="text-[10px] text-slate-600">{format.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Document List */}
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0B1B2B]">已上传文档</h3>
              <span className="text-xs text-slate-400">{mockDocuments.length} 个文件</span>
            </div>
            
            <div className="space-y-2">
              {mockDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => toggleDocSelection(doc.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedDocs.includes(doc.id)
                      ? 'border-[#C7A56A] bg-[#C7A56A]/5'
                      : 'border-[#E7E0D3] hover:border-[#C7A56A]/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    doc.status === 'analyzed' ? 'bg-emerald-50' : 'bg-amber-50'
                  }`}>
                    <FileText size={16} className={doc.status === 'analyzed' ? 'text-emerald-500' : 'text-amber-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0B1B2B] truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-400">{doc.size} · {doc.uploadedAt}</p>
                  </div>
                  {doc.status === 'analyzed' && (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={selectedDocs.length === 0 || isAnalyzing}
              className="w-full mt-4 py-3 bg-[#0B1B2B] text-[#C7A56A] rounded-xl font-medium text-sm hover:bg-[#10263B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  AI分析中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  AI重新分析 ({selectedDocs.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Company Profile (企业能力画像) */}
        <div className="col-span-2 space-y-6">
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#C7A56A] to-[#C7A56A]/80 rounded-xl flex items-center justify-center">
                <Building2 size={24} className="text-[#0B1B2B]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0B1B2B]">{profile.companyName}</h2>
                <p className="text-sm text-slate-500">企业能力画像</p>
              </div>
              <span className="ml-auto px-3 py-1 bg-emerald-50 text-emerald-600 text-xs rounded-full">AI生成</span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6 p-4 bg-[#F7F3EA] rounded-xl">
              {profile.companyIntro}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Core Products */}
              <div className="p-4 border border-[#E7E0D3] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-[#C7A56A]" />
                  <h4 className="font-bold text-[#0B1B2B] text-sm">核心产品</h4>
                </div>
                <ul className="space-y-1.5">
                  {profile.coreProducts.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#C7A56A] mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tech Advantages */}
              <div className="p-4 border border-[#E7E0D3] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-[#C7A56A]" />
                  <h4 className="font-bold text-[#0B1B2B] text-sm">技术优势</h4>
                </div>
                <ul className="space-y-1.5">
                  {profile.techAdvantages.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#C7A56A] mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Application Scenarios */}
              <div className="p-4 border border-[#E7E0D3] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-[#C7A56A]" />
                  <h4 className="font-bold text-[#0B1B2B] text-sm">应用场景</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.scenarios.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-[#F7F3EA] text-xs text-slate-600 rounded">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Differentiators */}
              <div className="p-4 border border-[#E7E0D3] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-[#C7A56A]" />
                  <h4 className="font-bold text-[#0B1B2B] text-sm">差异化优势</h4>
                </div>
                <ul className="space-y-1.5">
                  {profile.differentiators.map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#C7A56A] mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ICP Section */}
          <div className="bg-[#FFFCF6] rounded-2xl border border-[#E7E0D3] p-6">
            <h3 className="font-bold text-[#0B1B2B] mb-4 flex items-center gap-2">
              <Users size={18} className="text-[#C7A56A]" />
              目标客户画像 (ICP)
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-[#F7F3EA] rounded-xl">
                <p className="text-xs text-slate-500 mb-2">目标行业</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.targetIndustries.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-xs text-[#0B1B2B] rounded border border-[#E7E0D3]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-[#F7F3EA] rounded-xl">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Globe2 size={12} />
                  目标区域
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.targetRegions.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-xs text-[#0B1B2B] rounded border border-[#E7E0D3]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Buyer Personas */}
            <div className="grid grid-cols-2 gap-4">
              {profile.buyerPersonas.map((persona, i) => (
                <div key={i} className="p-4 border border-[#E7E0D3] rounded-xl">
                  <p className="font-medium text-[#0B1B2B] text-sm mb-2">{persona.role}</p>
                  <p className="text-[10px] text-slate-500 mb-1">痛点：</p>
                  <div className="flex flex-wrap gap-1">
                    {persona.painPoints.map((pain, j) => (
                      <span key={j} className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded">
                        {pain}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
