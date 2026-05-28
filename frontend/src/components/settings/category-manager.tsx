"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUILTIN_SLUGS } from "@/lib/categories";
import { useRingo } from "@/hooks/use-ringo-store";

export function CategoryManager() {
  const { categories, addCategory, updateCategory, removeCategory } = useRingo();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#dbeafe");

  const handleAdd = () => {
    if (!label.trim()) return;
    addCategory(label.trim(), color);
    setLabel("");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Task·타임테이블 색에 쓰입니다. 이름은 한글로 적어도 됩니다.
      </p>

      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.slug}
            className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-orange-100"
          >
            <input
              type="color"
              value={c.colorHex}
              onChange={(e) => updateCategory(c.slug, { colorHex: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border-0"
              aria-label={`${c.label} 색`}
            />
            <Input
              value={c.label}
              onChange={(e) => updateCategory(c.slug, { label: e.target.value })}
              className="h-9 flex-1 min-w-[8rem] rounded-xl"
            />
            <span className="text-xs text-muted-foreground">{c.slug}</span>
            {!BUILTIN_SLUGS.has(c.slug) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-500"
                onClick={() => removeCategory(c.slug)}
                aria-label="삭제"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="새 카테고리 (예: 외주)"
          className="h-10 flex-1 min-w-[10rem] rounded-xl"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-14 rounded-xl"
        />
        <Button type="button" onClick={handleAdd} className="rounded-xl bg-orange-500">
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
      </div>
    </div>
  );
}
