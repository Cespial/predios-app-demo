"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Building2,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mapa", label: "Explorador", icon: Map },
  { href: "/predios", label: "Ranking", icon: Building2 },
  { href: "/ciudades", label: "Ciudades", icon: LayoutGrid },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const navContent = (
    <>
      {/* Logo */}
      <div className="shrink-0">
        <div className="flex items-center h-[56px] px-4">
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center w-full" : ""}`}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot shrink-0" />
            {!collapsed && (
              <div className="animate-fade-in">
                <span className="text-xl font-bold text-tensor tracking-tight">tensor</span>
                <span className="text-xl font-light text-zinc-500">.lat</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden p-1 text-zinc-500 hover:text-zinc-300"
          >
            <X size={16} />
          </button>
        </div>
        {!collapsed && (
          <p className="px-4 pb-3 text-[10px] uppercase tracking-[0.15em] text-zinc-600 font-medium">
            Inteligencia Territorial
          </p>
        )}
        <div className="separator-glow mx-4" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-emerald-500/8 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400" />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? "text-emerald-400" : "text-zinc-600"}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center h-11 border-t border-[#1e2229] text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 bg-[#13161b] border border-[#1e2229] rounded-lg text-zinc-500 hover:text-zinc-300"
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-56 flex flex-col bg-[#0c0e11] border-r border-[#1e2229] transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-[#0c0e11] border-r border-[#1e2229] transition-all duration-300 ${
          collapsed ? "w-[52px]" : "w-56"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
