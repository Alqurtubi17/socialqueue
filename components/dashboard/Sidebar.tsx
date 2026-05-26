"use client";
// components/dashboard/Sidebar.tsx
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: "/scheduler",
    label: "Scheduler",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/ai-bank",
    label: "AI Content Bank",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z"/>
        <path d="M5 3l.94 2.88L8 7l-2.06.62L5 11l-.94-2.88L2 7l2.06-.62z"/>
        <path d="M19 13l.94 2.88L22 17l-2.06.62L19 21l-.94-2.88L16 17l2.06-.62z"/>
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Akun Terhubung",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export function Sidebar({ user }: { user?: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[#0a0a0c] border-r border-[#141416] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src="/logo.png" alt="SocialQueue Logo" className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-bold tracking-tight">SocialQueue</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="section-label px-2 mb-2">Menu</p>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-[#18181b]"
              }`}
            >
              <span className={active ? "text-emerald-400" : "text-zinc-600"}>{icon}</span>
              {label}
            </a>
          );
        })}
      </nav>

      {/* User & logout */}
      <div className="p-3 border-t border-[#141416]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[11px] font-bold text-black flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-zinc-600 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 text-xs text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-[#18181b] transition-all"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
