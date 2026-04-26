"use client";

/**
 * RadarContentMatchPanel - Radar candidate <-> Marketing content linkage panel
 *
 * Shows:
 * - Existing content links for the selected candidate
 * - Auto-match suggestions based on keywords/industry
 * - Quick actions: link, unlink, view content
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Loader2,
  Sparkles,
  LinkIcon,
  Unlink,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  getLinksForCandidate,
  findMatchingContent,
  batchCreateContentLinks,
  deleteContentLink,
  type RadarContentLinkData,
  type ContentMatchResult,
} from '@/actions/radar-content-link';

// ==================== Types ====================

interface RadarContentMatchPanelProps {
  candidateId: string;
  candidateName: string;
}

// ==================== Component ====================

export function RadarContentMatchPanel({
  candidateId,
  candidateName: _candidateName,
}: RadarContentMatchPanelProps) {
  const [links, setLinks] = useState<RadarContentLinkData[]>([]);
  const [suggestions, setSuggestions] = useState<ContentMatchResult[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing links
  const loadLinks = useCallback(async () => {
    setIsLoadingLinks(true);
    try {
      const data = await getLinksForCandidate(candidateId);
      setLinks(data);
    } catch (err) {
      console.error('Failed to load links:', err);
    } finally {
      setIsLoadingLinks(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadLinks();
    setSuggestions([]);
    setError(null);
  }, [candidateId, loadLinks]);

  // Auto-match
  const handleAutoMatch = async () => {
    setIsMatching(true);
    setError(null);
    try {
      const results = await findMatchingContent(candidateId);
      // Filter out already-linked content
      const linkedIds = new Set(links.map((l) => l.content?.id));
      setSuggestions(results.filter((r) => !linkedIds.has(r.contentId)));
    } catch (err) {
      setError('匹配失败，请稍后重试');
      console.error('Auto-match failed:', err);
    } finally {
      setIsMatching(false);
    }
  };

  // Batch link suggestions
  const handleBatchLink = async () => {
    if (suggestions.length === 0) return;
    setIsLinking(true);
    setError(null);
    try {
      const result = await batchCreateContentLinks({
        candidateId,
        matches: suggestions.map((s) => ({
          contentId: s.contentId,
          matchScore: s.matchScore,
          matchedKeywords: s.matchedKeywords,
        })),
      });
      if (result.created > 0) {
        await loadLinks();
        setSuggestions([]);
      }
    } catch (err) {
      setError('关联失败');
      console.error('Batch link failed:', err);
    } finally {
      setIsLinking(false);
    }
  };

  // Unlink
  const handleUnlink = async (linkId: string) => {
    try {
      await deleteContentLink(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      console.error('Unlink failed:', err);
    }
  };

  const linkTypeLabel = (type: string) => {
    switch (type) {
      case 'KEYWORD_MATCH': return '关键词';
      case 'INDUSTRY_MATCH': return '行业';
      case 'OUTREACH_EMBED': return '外联';
      case 'MANUAL': return '手动';
      default: return type;
    }
  };

  return (
    <div className="bg-[var(--ci-surface-muted)] rounded-xl border border-[var(--ci-border)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1B2B]">
          <FileText size={14} className="text-[var(--ci-accent)]" />
          内容联动
        </h4>
        <span className="text-xs text-slate-400">
          {links.length > 0 ? `${links.length} 篇关联` : ''}
        </span>
      </div>

      {/* Existing Links */}
      {isLoadingLinks ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="text-[var(--ci-accent)] animate-spin" />
        </div>
      ) : links.length > 0 ? (
        <div className="space-y-2 mb-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-[#FFFFFF] rounded-xl border border-[var(--ci-border)] p-3 flex items-start gap-2"
            >
              <FileText size={14} className="text-[var(--ci-accent)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/customer/marketing/contents/${link.content?.id}`}
                  className="text-xs font-medium text-[#0B1B2B] hover:text-[var(--ci-accent)] truncate block"
                >
                  {link.content?.title || '未知内容'}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ci-accent)]/10 text-[var(--ci-accent)]">
                    {linkTypeLabel(link.linkType)}
                  </span>
                  {link.matchScore !== null && (
                    <span className="text-[10px] text-slate-400">
                      匹配 {link.matchScore}%
                    </span>
                  )}
                  {link.content?.status && (
                    <span className={`text-[10px] ${
                      link.content.status === 'published' ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                      {link.content.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleUnlink(link.id)}
                className="text-slate-300 hover:text-red-400 transition-colors p-1"
                title="取消关联"
              >
                <Unlink size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">
              发现 {suggestions.length} 篇匹配内容
            </span>
            <button
              onClick={handleBatchLink}
              disabled={isLinking}
              className="text-xs text-[var(--ci-accent)] hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              {isLinking ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <LinkIcon size={10} />
              )}
              全部关联
            </button>
          </div>
          <div className="space-y-1.5">
            {suggestions.slice(0, 5).map((s) => (
              <div
                key={s.contentId}
                className="bg-[#FFFFFF] rounded-lg border border-dashed border-[var(--ci-accent)]/30 p-2 flex items-center gap-2"
              >
                <Sparkles size={12} className="text-[var(--ci-accent)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#0B1B2B] truncate block">
                    {s.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    匹配词: {s.matchedKeywords.slice(0, 3).join(', ')}
                  </span>
                </div>
                <span className={`text-xs font-medium shrink-0 ${
                  s.matchScore >= 80 ? 'text-emerald-600' :
                  s.matchScore >= 50 ? 'text-amber-600' : 'text-slate-400'
                }`}>
                  {s.matchScore}%
                </span>
              </div>
            ))}
            {suggestions.length > 5 && (
              <p className="text-[10px] text-slate-400 text-center">
                +{suggestions.length - 5} 更多匹配
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 mb-3">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Actions */}
      <button
        onClick={handleAutoMatch}
        disabled={isMatching}
        className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--ci-accent)]/10 text-[var(--ci-accent)] rounded-xl text-xs font-medium hover:bg-[var(--ci-accent)]/20 transition-colors disabled:opacity-50"
      >
        {isMatching ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            正在匹配...
          </>
        ) : (
          <>
            <Search size={14} />
            {links.length > 0 || suggestions.length > 0 ? '重新匹配内容' : '智能匹配内容'}
          </>
        )}
      </button>
    </div>
  );
}
