import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, ChevronRight, LogOut, Menu, Scissors, X } from "lucide-react";
import type { User } from "../../App";

export interface RoleNavItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group?: string;
}

interface RoleShellProps {
  user: User;
  roleLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  navItems: RoleNavItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  notificationSlot?: ReactNode;
  primaryAction?: ReactNode;
  children: ReactNode;
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SB";

export function RoleShell({
  user,
  roleLabel,
  eyebrow,
  title,
  description,
  navItems,
  activeSection,
  onSectionChange,
  onLogout,
  notificationSlot,
  primaryAction,
  children,
}: RoleShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setIsMobileNavOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setIsMobileNavOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [isMobileNavOpen]);

  const groupedItems = navItems.reduce<Record<string, RoleNavItem[]>>((groups, item) => {
    const group = item.group || "Workspace";
    groups[group] ||= [];
    groups[group].push(item);
    return groups;
  }, {});

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setIsMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4efe7] text-[#251f1a]">
      <a href="#role-main" className="skip-link">Skip to main content</a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[276px] flex-col border-r border-[#40342d] bg-[#241d18] text-[#f9f3e8] lg:flex">
        <div className="flex h-full flex-col px-5 py-6">
          <button
            type="button"
            onClick={() => onSectionChange(navItems[0]?.id || activeSection)}
            className="group mb-10 flex items-center gap-3 rounded-xl px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e0a756] text-[#241d18] ">
              <Scissors className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold text-xl tracking-[-0.04em] text-[#fff9ed]">Supremo</span>
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#cdbba7]">Barber studio</span>
            </span>
          </button>

          <div className="mb-5 px-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#c09a63]">{roleLabel}</p>
            <p className="mt-2 max-w-[190px] text-sm leading-6 text-[#cdbba7]">Appointments, services, and account settings.</p>
          </div>

          <nav className="flex-1 space-y-7 overflow-y-auto" aria-label={`${roleLabel} navigation`}>
            {Object.entries(groupedItems).map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#b9a796]">{group}</p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSectionChange(item.id)}
                        aria-current={active ? "page" : undefined}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756] ${
                          active
                            ? "bg-[#e0a756] text-[#241d18] "
                            : "text-[#d7c8b6] hover:bg-[#3a2e26] hover:text-[#fff9ed]"
                        }`}
                      >
                        <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#241d18]" : "text-[#c09a63]"}`} aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{item.label}</span>
                          <span className={`block truncate text-[0.68rem] ${active ? "text-[#45301b]" : "text-[#b9a796]"}`}>{item.description}</span>
                        </span>
                        {active && <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-6 border-t border-[#40342d] pt-5">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#30261f] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e0a756] font-bold text-[#241d18]">{initials(user.name)}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#fff9ed]">{user.name}</span>
                <span className="block truncate text-xs text-[#a99783]">{user.email}</span>
              </span>
            </div>
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#cdbba7] transition-colors hover:bg-[#3a2e26] hover:text-[#fff9ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756]">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[276px]">
        <header className="sticky top-0 z-30 border-b border-[#ded2c3] bg-[#f4efe7]/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-rust">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d48d3d]" aria-hidden="true" />
                  {eyebrow}
                </div>
                <h1 className="font-semibold text-2xl tracking-[-0.045em] text-[#241d18] sm:text-3xl">{title}</h1>
                <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-[#786b5c] sm:block">{description}</p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                {notificationSlot || <span className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[#ded2c3] bg-white text-[#75685a] sm:flex"><Bell className="h-4 w-4" aria-hidden="true" /></span>}
                {primaryAction}
                <button
                  type="button"
                  ref={menuTriggerRef}
                  onClick={() => setIsMobileNavOpen((open) => !open)}
                  aria-expanded={isMobileNavOpen}
                  aria-controls="mobile-role-navigation"
                  aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ded2c3] bg-white text-[#4e4034] transition hover:bg-[#eee5d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a756] lg:hidden"
                >
                  {isMobileNavOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#241d18] text-sm font-bold text-[#e0a756] lg:hidden" aria-label={`Signed in as ${user.name}`}>{initials(user.name)}</div>
              </div>
            </div>
          </div>
          <nav id="mobile-role-navigation" className={`${isMobileNavOpen ? "block" : "hidden"} max-h-[65dvh] overflow-y-auto overscroll-contain border-t border-[#ded2c3] bg-[#f9f5ee] px-4 py-3 lg:hidden`} aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-[1600px] gap-4 sm:grid-cols-2">
              {Object.entries(groupedItems).map(([group, items]) => (
                <div key={group}>
                  <p className="mb-2 px-1 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand-rust">{group}</p>
                  <div className="grid gap-1">
                    {items.map((item) => {
                      const active = activeSection === item.id;
                      return (
                        <button key={item.id} type="button" onClick={() => handleSectionChange(item.id)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-[#241d18] text-[#f9f3e8]" : "text-[#786b5c] hover:bg-[#eee5d8]"}`}>
                          <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#e0a756]" : "text-brand-rust"}`} aria-hidden="true" />
                          <span className="min-w-0"><span className="block text-sm font-bold">{item.label}</span><span className={`block text-xs ${active ? "text-[#d7c8b6]" : "text-[#75685a]"}`}>{item.description}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-4 max-w-[1600px] border-t border-[#ded2c3] pt-3">
              <p className="break-words px-3 text-sm font-semibold">{user.name}</p>
              <p className="break-all px-3 text-xs text-[#75685a]">{user.email}</p>
              <button type="button" onClick={onLogout} className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold hover:bg-[#eee5d8]">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </nav>
        </header>

        <main id="role-main" tabIndex={-1} className="mx-auto min-h-[calc(100vh-86px)] max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MetricTile({ label, value, detail, accent = "gold" }: { label: string; value: string; detail?: string; accent?: "gold" | "sage" | "rust" | "ink" }) {
  const accents = {
    gold: "bg-[#fff4dc] text-[#9b641f]",
    sage: "bg-[#e8eee1] text-[#587049]",
    rust: "bg-[#f5e2d9] text-[#974d2a]",
    ink: "bg-[#e9e0d5] text-[#45382e]",
  };
  return (
    <div className="min-w-0 rounded-xl border border-[#ded2c3] bg-[#fffdfa] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#75685a]">{label}</p>
        <span className={`h-2 w-2 shrink-0 rounded-full ${accents[accent]}`} aria-hidden="true" />
      </div>
      <p className="mt-4 break-words font-semibold tabular-nums text-3xl tracking-[-0.03em] text-[#241d18] sm:text-4xl">{value}</p>
      {detail && <p className="mt-2 text-sm text-[#786b5c]">{detail}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status?: string | null }) {
  const value = String(status || "pending");
  const tone = value === "completed" || value === "verified" || value === "approved" || value === "confirmed" || value === "upcoming"
    ? "bg-[#e8eee1] text-[#587049]"
    : value === "cancelled" || value === "rejected"
      ? "bg-[#f5e2d9] text-[#974d2a]"
      : "bg-[#fff4dc] text-[#9b641f]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold capitalize ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{value}</span>;
}

export function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-rust">{eyebrow}</p>}
        <h2 className="font-semibold text-2xl tracking-[-0.04em] text-[#241d18] sm:text-3xl">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-[#786b5c]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-xl border border-[#ded2c3] bg-[#fffdfa] ${className}`}>{children}</section>;
}
