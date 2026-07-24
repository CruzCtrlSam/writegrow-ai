"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { createClient } from "@/lib/supabase/client";

interface NavLink {
  href: string;
  label: string;
}

export function AppNav({
  links,
  studentName,
}: {
  links: NavLink[];
  studentName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4">
        <Link href="/parent/dashboard" className="shrink-0">
          <Logo />
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex min-h-11 items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-sprout-100 text-sprout-700"
                    : "text-ink/70 hover:bg-black/5"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {studentName && (
            <span className="hidden rounded-full bg-honey-100 px-3 py-1 text-xs font-semibold text-honey-500 sm:inline">
              {studentName}
            </span>
          )}
          <button onClick={signOut} className="min-h-11 px-1 text-sm font-medium text-ink/60 hover:text-ink">
            Sign out
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-black/5 px-3 py-2 md:hidden">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                active ? "bg-sprout-100 text-sprout-700" : "text-ink/70"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
