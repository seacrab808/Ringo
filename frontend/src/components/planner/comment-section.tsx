"use client";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CommentSectionProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function CommentSection({ value, onChange, className }: CommentSectionProps) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-3xl bg-white/95 shadow-sm ring-1 ring-stone-200/60",
        className,
      )}
    >
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-stone-800">COMMENT</h2>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="오늘의 코멘트를 남겨보세요"
        className="min-h-[72px] resize-none rounded-none rounded-b-3xl border-0 bg-transparent px-4 py-3 text-sm leading-relaxed shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
