"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  MessageCircle,
  Settings,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/planner", label: "오늘", icon: LayoutGrid, exact: true },
  { href: "/chat", label: "채팅", icon: MessageCircle },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/habits", label: "습관", icon: CheckCircle2 },
  { href: "/reports", label: "리포트", icon: Sparkles },
  { href: "/cafeteria", label: "우정학식", icon: UtensilsCrossed },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[72px] shrink-0 flex-col items-center border-r border-orange-100/80 bg-[#fdf8f3] py-4 md:w-[200px] md:items-stretch md:px-3">
      <Link
        href="/planner"
        className="mb-6 flex flex-col items-center gap-1 md:flex-row md:gap-3 md:px-2"
      >
        <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-orange-50 ring-2 ring-orange-100">
          <Image
            src="/assets/ringo-mascot.png"
            alt="Ringo"
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div className="hidden md:block">
          <p className="text-lg font-bold text-orange-950">Ringo</p>
          <p className="text-xs text-muted-foreground">Yuna&apos;s Planner</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-medium transition-colors md:flex-row md:gap-3 md:px-3 md:text-sm",
                active
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-stone-600 hover:bg-orange-50 hover:text-orange-900",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
