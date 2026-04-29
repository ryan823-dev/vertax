"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            background: "#FAFAF8",
          }}
        >
          <div
            style={{
              background: "#FFFCF6",
              border: "1px solid #E8E4DC",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "420px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "#FEF2F2",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                fontSize: "24px",
              }}
            >
              ⚠
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#0B1B2B",
                margin: "0 0 0.5rem",
              }}
            >
              系统遇到意外错误
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#64748B",
                margin: "0 0 1rem",
                lineHeight: 1.6,
              }}
            >
              服务暂时不可用，可能是网络波动或服务冷启动。请稍后重试。
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#94A3B8",
                  fontFamily: "monospace",
                  margin: "0 0 1rem",
                }}
              >
                Digest: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1.25rem",
                background: "#E8C468",
                color: "#0B1B2B",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              ↻ 重新加载
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
