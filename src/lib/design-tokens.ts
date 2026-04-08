/* ── Design Tokens ── */
// VertaX 深色科技风设计系统
// 适合 AI + 数据驱动的 B2B 增长平台

export const colors = {
  // 背景色 - 深色科技风
  bg: {
    primary: '#0A0A0A',      // 深黑主背景
    secondary: '#111111',     // 卡片背景
    tertiary: '#1A1A1A',      // 第三层背景
    dark: '#050505',          // 最深背景
    elevated: '#161616',      // 悬浮卡片背景
    gradient: 'linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 100%)',
    heroGradient: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #16213E 100%)',
    darkGradient: 'linear-gradient(180deg, #050505 0%, #111111 100%)',
  },
  // 品牌色 - 蓝紫渐变（科技感）
  brand: {
    primary: '#6366F1',       // 靛蓝紫 - 主品牌色
    secondary: '#8B5CF6',     // 紫色 - AI、智能
    accent: '#06B6D4',        // 青色 - 数据、增长
    gold: '#D4AF37',
    goldRgb: '212, 175, 55',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
    gradientHover: 'linear-gradient(135deg, #7C7FF2 0%, #9D6EF7 50%, #0FCFEC 100%)',
    glow: 'rgba(99, 102, 241, 0.5)',
    glowAccent: 'rgba(6, 182, 212, 0.5)',
  },
  // 数据可视化色
  data: {
    positive: '#10B981',      // 绿色 - 增长
    negative: '#EF4444',      // 红色 - 下降
    neutral: '#F59E0B',       // 黄色 - 警告/中性
    info: '#06B6D4',          // 青色 - 信息
    highlight: '#6366F1',     // 高亮
  },
  // 文字色
  text: {
    primary: '#FFFFFF',       // 主文字
    secondary: '#A1A1AA',     // 次文字
    muted: '#71717A',         // 弱化文字
    inverse: '#0A0A0A',       // 反色文字
    brand: '#6366F1',         // 品牌色文字
  },
  // 边框色
  border: {
    light: 'rgba(255,255,255,0.05)',
    medium: 'rgba(255,255,255,0.1)',
    strong: 'rgba(255,255,255,0.15)',
    brand: 'rgba(99,102,241,0.3)',
    glow: 'rgba(99,102,241,0.2)',
  },
  // 状态色
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
  },
};

// 动画配置
export const animations = {
  fadeIn: 'fade-in 0.5s ease-out',
  slideUp: 'slide-up 0.6s ease-out',
  slideIn: 'slide-in 0.5s ease-out',
  pulse: 'pulse 2s infinite',
  glow: 'glow 2s ease-in-out infinite',
  float: 'float 6s ease-in-out infinite',
  shimmer: 'shimmer 2s linear infinite',
  bounce: 'bounce 1s infinite',
  spin: 'spin 1s linear infinite',
};

// 阴影
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  glowLg: '0 0 40px rgba(99, 102, 241, 0.4)',
  glowAccent: '0 0 20px rgba(6, 182, 212, 0.3)',
  card: '0 4px 20px rgba(0,0,0,0.25)',
  cardHover: '0 8px 30px rgba(0,0,0,0.35)',
};

// 字体
export const fonts = {
  primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
};

// 间距
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
};

// 圆角
export const borderRadius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
};

// 渐变背景
export const gradients = {
  mesh: `
    radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(6, 182, 212, 0.1) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(99, 102, 241, 0.1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%)
  `,
  grid: `
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
  `,
  dot: `
    radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)
  `,
};
