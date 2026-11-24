"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border bg-white lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold text-near-black">
          Es Magico
        </Link>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
          className="px-2"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="sr-only">Toggle navigation</span>
        </Button>
      </div>
      {open ? (
        <nav id="mobile-nav" className="border-t border-border px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded px-3 py-2 text-sm ${
                  active
                    ? "bg-off-white font-medium text-near-black"
                    : "text-charcoal"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
