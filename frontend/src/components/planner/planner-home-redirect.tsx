"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useRingo } from "@/hooks/use-ringo-store";

/** Full page load (refresh): open today's planner main view. */
export function PlannerHomeRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated } = useRingo();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!hydrated || didRedirect.current) return;
    didRedirect.current = true;
    const keep =
      pathname === "/planner" ||
      pathname.startsWith("/tasks/") ||
      pathname === "/cafeteria" ||
      pathname === "/habits" ||
      pathname === "/chat" ||
      pathname === "/calendar" ||
      pathname === "/settings";
    if (keep) {
      return;
    }
    if (pathname !== "/planner") {
      router.replace("/planner");
    }
  }, [hydrated, pathname, router]);

  return null;
}
