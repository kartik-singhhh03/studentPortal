"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-white lg:block">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-near-black transition-opacity hover:opacity-80"
        >
          Es Magico
          <span className="mt-0.5 block text-[11px] font-normal text-neutral">
            Student Results
          </span>
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-2.5" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-near-black ${
                active
                  ? "bg-off-white font-medium text-near-black shadow-[inset_2px_0_0_0_var(--color-near-black)]"
                  : "text-charcoal hover:bg-off-white hover:text-near-black"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
