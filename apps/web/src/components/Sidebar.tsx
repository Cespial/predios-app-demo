"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Building2,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/predios", label: "Predios", icon: Building2 },
  { href: "/ciudades", label: "Ciudades", icon: LayoutGrid },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-screen bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-zinc-800 shrink-0">
        <span
          className={`font-bold text-emerald-500 text-xl tracking-tight transition-all duration-300 ${
            collapsed ? "text-center w-full text-base" : ""
          }`}
        >
          {collapsed ? "T" : "tensor.lat"}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={isActive ? "text-emerald-400" : "text-zinc-500"}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
