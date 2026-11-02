"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link
      href={href}
      className={clsx(
        "px-3 py-1.5 rounded-md text-sm transition",
        active ? "bg-accent/15 text-white border border-accent/40" : "text-muted hover:text-white hover:bg-white/5"
      )}
    >
      {children}
    </Link>
  );
}
