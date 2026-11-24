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
    <aside className="hidden w-60 shrink-0 border-r border-border bg-white lg:block">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/" className="font-semibold tracking-tight text-near-black">
          Es Magico
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-near-black ${
                active
                  ? "bg-off-white font-medium text-near-black"
                  : "text-charcoal hover:bg-off-white hover:text-near-black"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
