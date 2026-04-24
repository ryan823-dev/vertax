export const colors = {
  bg: {
    primary: "#F6F9FC",
    secondary: "#FFFFFF",
    tertiary: "#EDF3FA",
    dark: "#0F1728",
    elevated: "#FBFDFF",
    gradient: "linear-gradient(180deg, #F6F9FC 0%, #EDF3FA 100%)",
    heroGradient:
      "radial-gradient(circle at 12% 12%, rgba(96,165,250,0.2), transparent 32%), radial-gradient(circle at 88% 8%, rgba(34,211,238,0.12), transparent 24%), linear-gradient(180deg, #0F1728 0%, #13203A 44%, #EDF3FA 100%)",
    darkGradient:
      "radial-gradient(circle at 18% 0%, rgba(56,189,248,0.14), transparent 34%), linear-gradient(180deg, #0F1728 0%, #111B30 100%)",
  },
  brand: {
    primary: "#3B82F6",
    secondary: "#22D3EE",
    accent: "#14B8A6",
    gold: "#C59B36",
    goldRgb: "197, 155, 54",
    gradient: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)",
    gradientHover: "linear-gradient(135deg, #1D4ED8 0%, #22D3EE 100%)",
    glow: "rgba(59, 130, 246, 0.28)",
    glowAccent: "rgba(34, 211, 238, 0.24)",
  },
  data: {
    positive: "#10B981",
    negative: "#EF4444",
    neutral: "#F59E0B",
    info: "#38BDF8",
    highlight: "#3B82F6",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    muted: "#64748B",
    inverse: "#F8FBFF",
    brand: "#2563EB",
  },
  border: {
    light: "#DDE6F2",
    medium: "#C7D4E5",
    strong: "rgba(148, 163, 184, 0.36)",
    brand: "rgba(59, 130, 246, 0.24)",
    glow: "rgba(59, 130, 246, 0.08)",
  },
  status: {
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#38BDF8",
  },
};

export const animations = {
  fadeIn: "fade-in 0.45s ease-out",
  slideUp: "slide-up 0.55s ease-out",
  slideIn: "slide-in 0.45s ease-out",
  pulse: "pulse 2s infinite",
  glow: "glow 2.4s ease-in-out infinite",
  float: "float 6s ease-in-out infinite",
  shimmer: "shimmer 2s linear infinite",
  bounce: "bounce 1s infinite",
  spin: "spin 1s linear infinite",
};

export const shadows = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.04)",
  md: "0 8px 24px rgba(15, 23, 42, 0.06)",
  lg: "0 20px 40px rgba(15, 23, 42, 0.08)",
  xl: "0 30px 80px rgba(15, 23, 42, 0.14)",
  glow: "0 12px 30px rgba(59, 130, 246, 0.22)",
  glowLg: "0 20px 50px rgba(59, 130, 246, 0.28)",
  glowAccent: "0 18px 40px rgba(34, 211, 238, 0.18)",
  card: "0 20px 48px rgba(15, 23, 42, 0.12)",
  cardHover: "0 28px 60px rgba(15, 23, 42, 0.16)",
};

export const fonts = {
  primary: 'Sora, "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: '"IBM Plex Mono", "SFMono-Regular", "Roboto Mono", monospace',
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
  "4xl": "6rem",
};

export const borderRadius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.875rem",
  xl: "1.125rem",
  "2xl": "1.5rem",
  full: "9999px",
};

export const gradients = {
  mesh: `
    radial-gradient(at 12% 10%, rgba(59, 130, 246, 0.12) 0px, transparent 34%),
    radial-gradient(at 85% 8%, rgba(34, 211, 238, 0.12) 0px, transparent 26%),
    radial-gradient(at 30% 78%, rgba(15, 118, 110, 0.08) 0px, transparent 28%)
  `,
  grid: `
    linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px)
  `,
  dot: `
    radial-gradient(circle, rgba(59, 130, 246, 0.16) 1px, transparent 1px)
  `,
};
