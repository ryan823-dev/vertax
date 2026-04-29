"use client";

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { executeSkill } from '@/actions/skills';
import type { SkillRequest, SkillResponse } from '@/lib/skills/types';
import type { EntityType } from '@/types/artifact';

// ==================== Types ====================

interface SkillTriggerProps {
  skillName: string;
  displayName: string;
  description?: string;
  entityType: EntityType;
  entityId: string;
  input: Record<string, unknown>;
  evidenceIds?: string[];
  useCompanyProfile?: boolean;
  onSuccess?: (result: SkillResponse) => void;
  onError?: (error: Error) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
}

// ==================== Component ====================

export function SkillTrigger({
  skillName,
  displayName,
  description,
  entityType,
  entityId,
  input,
  evidenceIds,
  useCompanyProfile = true,
  onSuccess,
  onError,
  variant = 'outline',
  size = 'sm',
  className,
  disabled,
}: SkillTriggerProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SkillResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const request: SkillRequest = {
        entityType,
        entityId,
        input,
        mode: 'generate',
        evidenceIds,
        useCompanyProfile,
      };

      const response = await executeSkill(skillName, request);
      setResult(response);
      setShowResult(true);
      onSuccess?.(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Skill 执行失败';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleExecute}
        disabled={disabled || isExecuting}
        className={className}
      >
        {isExecuting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {displayName}
      </Button>

      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {displayName} 执行完成
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          {result && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* 引用证据 - 让用户知道结论有据可依 */}
              {result.references.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-emerald-800 mb-2">
                    参考了 {result.references.length} 条知识
                  </p>
                  <ul className="space-y-1">
                    {result.references.map((ref, i) => (
                      <li key={i} className="text-xs text-emerald-700">
                        [{i + 1}] {ref.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
