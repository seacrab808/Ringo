"use client";

import { PlannerHomeRedirect } from "@/components/planner/planner-home-redirect";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#faf8f5]">
      <PlannerHomeRedirect />
      <AppSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
