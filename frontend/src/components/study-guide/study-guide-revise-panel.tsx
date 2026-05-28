"use client";

import { FormEvent, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface StudyGuideRevisePanelProps {
  disabled?: boolean;
  onRevise: (instruction: string) => Promise<void>;
}

export function StudyGuideRevisePanel({ disabled, onRevise }: StudyGuideRevisePanelProps) {
  const [instruction, setInstruction] = useState("");
  const [revising, setRevising] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = instruction.trim();
    if (!text || revising || disabled) return;
    setRevising(true);
    try {
      await onRevise(text);
      setInstruction("");
    } finally {
      setRevising(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-2xl bg-violet-50/80 p-3 ring-1 ring-violet-100">
      <p className="text-xs font-medium text-violet-900">학습지 수정 AI</p>
      <p className="text-xs text-violet-700/90">
        예: 「2장 용어 카드를 더 쉽게 풀어줘」, 「비교표 추가해줘」, 「예제 3개 더 넣어줘」
      </p>
      <Textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="바꾸고 싶은 내용을 말해 주세요…"
        rows={3}
        disabled={disabled || revising}
        className="resize-none rounded-xl border-violet-200 bg-white text-sm"
      />
      <Button
        type="submit"
        size="sm"
        disabled={disabled || revising || !instruction.trim()}
        className="w-full rounded-xl gap-2 bg-violet-600 hover:bg-violet-700"
      >
        {revising ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        AI로 학습지 수정
      </Button>
    </form>
  );
}
