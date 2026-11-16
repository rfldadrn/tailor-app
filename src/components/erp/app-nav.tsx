"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, type AppRole } from "@/nav.config";

export function AppNav({ role }: { role: AppRole }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Navigasi utama">
      {navGroups.map((group) => {
        const items = group.items.filter((item) => item.roles.includes(role));
        if (items.length === 0) return null;

        return (
          <div className="nav-group" key={group.label}>
            <p className="nav-group-label">{group.label}</p>
            {items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`nav-link${active ? " nav-link-active" : ""}`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.7} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
