"use client";

import type { ReactNode } from "react";

function inlineFormat(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-orange-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function ReportMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="list-disc space-y-1 pl-5">
        {listItems.map((item, j) => (
          <li key={j}>{inlineFormat(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      continue;
    }
    flushList();
    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-orange-950">
          {inlineFormat(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={`h2-${i}`} className="mt-2 text-lg font-bold text-orange-900">
          {inlineFormat(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={`h3-${i}`} className="mt-1 font-semibold text-stone-800">
          {inlineFormat(line.slice(4))}
        </h3>,
      );
    } else if (line.trim()) {
      nodes.push(
        <p key={`p-${i}`} className="text-stone-700">
          {inlineFormat(line)}
        </p>,
      );
    }
  }
  flushList();

  return <div className="space-y-3">{nodes}</div>;
}
