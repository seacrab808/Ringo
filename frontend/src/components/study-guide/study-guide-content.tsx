"use client";

import { useMemo } from "react";
import {
  RINGO_STUDY_GUIDE_CSS,
  extractStudyGuideBody,
  isHtmlStudyGuide,
} from "@/lib/study-guide-html";
import { cn } from "@/lib/utils";

interface StudyGuideContentProps {
  content: string;
  title?: string;
  className?: string;
}

export function StudyGuideContent({
  content,
  className,
}: StudyGuideContentProps) {
  const inline = useMemo(() => {
    if (!isHtmlStudyGuide(content)) return null;
    const body = extractStudyGuideBody(content);
    return body || content;
  }, [content]);

  if (inline) {
    return (
      <div
        className={cn(
          "ringo-study-guide-preview overflow-x-auto rounded-2xl border border-stone-200 bg-white px-4 py-6 md:px-8",
          className,
        )}
      >
        <style dangerouslySetInnerHTML={{ __html: RINGO_STUDY_GUIDE_CSS }} />
        <div
          className="ringo-study-guide"
          dangerouslySetInnerHTML={{ __html: inline }}
        />
      </div>
    );
  }

  return (
    <pre
      className={cn(
        "whitespace-pre-wrap rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-800",
        className,
      )}
    >
      {content}
    </pre>
  );
}
