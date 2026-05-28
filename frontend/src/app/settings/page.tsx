"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryManager } from "@/components/settings/category-manager";
import { RecurringTaskForm } from "@/components/settings/recurring-task-form";
import { useRingo } from "@/hooks/use-ringo-store";

export default function SettingsPage() {
  const { hydrated } = useRingo();

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-orange-800">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#faf8f5] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/planner"
            className="rounded-xl p-2 text-stone-600 hover:bg-orange-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-orange-950">설정</h1>
            <p className="text-sm text-muted-foreground">
              카테고리 · 학기 반복 일정
            </p>
          </div>
        </div>

        <section className="rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-orange-100">
          <h2 className="mb-4 text-base font-semibold text-stone-800">카테고리</h2>
          <CategoryManager />
        </section>

        <section className="rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-orange-100">
          <h2 className="mb-4 text-base font-semibold text-stone-800">
            학기 반복 일정
          </h2>
          <RecurringTaskForm />
        </section>
      </div>
    </div>
  );
}
