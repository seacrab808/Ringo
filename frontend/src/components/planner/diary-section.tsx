"use client";

import { Textarea } from "@/components/ui/textarea";

interface DiarySectionProps {
  value: string;
  onChange: (v: string) => void;
}

export function DiarySection({ value, onChange }: DiarySectionProps) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-4 shadow-sm ring-1 ring-orange-100/60">
      <h2 className="mb-2 text-sm font-semibold text-orange-950">오늘의 일기</h2>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="오늘 기록을 남겨보세요. 내일은 더 잘할 수 있어요!"
        className="min-h-[88px] resize-none rounded-2xl border-orange-100/80 bg-white/80 text-sm leading-relaxed focus-visible:ring-orange-200"
      />
    </div>
  );
}
