'use client';

import { useState } from 'react';
import { Download, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface WhitepaperDownloadProps {
  whitepaperTitle: string;
  downloadUrl: string;
}

export function WhitepaperDownload({ whitepaperTitle: _whitepaperTitle, downloadUrl }: WhitepaperDownloadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const _email = formData.get('email') as string;
    const _name = formData.get('name') as string;
    const _company = formData.get('company') as string;

    try {
      // TODO: 调用实际的后端 API 保存线索
      // await fetch('/api/resources/download', {
      //   method: 'POST',
      //   body: JSON.stringify({ email, name, company, resource: whitepaperTitle }),
      // });

      // 模拟成功
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitted(true);

      // 自动触发下载
      window.open(downloadUrl, '_blank');
    } catch {
      setError('下载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Download Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-8 py-4 rounded-lg transition-colors text-base"
      >
        <Download className="w-5 h-5" />
        免费下载白皮书
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">下载已启动</h3>
                <p className="text-gray-400 text-sm mb-6">
                  感谢下载！白皮书将在新窗口打开。<br />
                  我们已将副本发送到你的邮箱。
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
                >
                  关闭
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Download className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    获取完整白皮书
                  </h3>
                  <p className="text-gray-400 text-sm">
                    填写以下信息，立即下载 48 页深度报告
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      姓名 <span className="text-amber-400">*</span>
                    </label>
                    <input
                      required
                      name="name"
                      type="text"
                      placeholder="您的姓名"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      公司名称 <span className="text-amber-400">*</span>
                    </label>
                    <input
                      required
                      name="company"
                      type="text"
                      placeholder="公司名称"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      工作邮箱 <span className="text-amber-400">*</span>
                    </label>
                    <input
                      required
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      我们不会发送垃圾邮件，仅用于发送白皮书和相关资源
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        立即下载
                      </>
                    )}
                  </button>
                </form>

                <p className="text-xs text-gray-500 text-center mt-4">
                  点击&ldquo;立即下载&rdquo;即表示您同意我们的
                  <a href="/privacy" className="text-cyan-400 hover:underline">隐私政策</a>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
