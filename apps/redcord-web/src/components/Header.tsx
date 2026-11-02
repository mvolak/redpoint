"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ExternalMark, buttonClass, cx } from "@redcord/ui";
import type { NavItem } from "@/config/site";
import { Wordmark } from "./Wordmark";

interface HeaderProps {
  nav: readonly NavItem[];
  shopUrl: string;
  cta: { label: string; href: string };
}

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0] ?? href;
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

/** Desktop dropdown: the label is a real link; a separate button toggles the submenu. */
function DesktopItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLLIElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  const active = isActive(pathname, item.href);

  return (
    <li
      ref={wrap}
      className="relative flex items-center"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          btn.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex min-h-11 items-center rounded-full px-3 text-[15px] font-medium hover:text-brand",
          active && "text-brand",
        )}
      >
        {item.label}
      </Link>
      {item.children && (
        <>
          <button
            ref={btn}
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className="-ml-2 flex h-11 w-8 items-center justify-center rounded-full hover:text-brand"
          >
            <span className="sr-only">Podnabídka {item.label}</span>
            <svg aria-hidden="true" viewBox="0 0 12 12" className={cx("h-3 w-3 transition-transform", open && "rotate-180")}>
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <div
            id={id}
            hidden={!open}
            className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-white p-2 shadow-xl"
          >
            <ul>
              {item.children.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-xl px-4 text-[15px] hover:bg-surface-muted"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </li>
  );
}

export function Header({ nav, shopUrl, cta }: HeaderProps) {
  const pathname = usePathname() ?? "/";
  const mobile = useRef<HTMLDetailsElement>(null);

  // Close the mobile menu after client-side navigation.
  useEffect(() => {
    if (mobile.current) mobile.current.open = false;
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white">
      <div className="mx-auto flex h-18 max-w-content items-center gap-4 px-5 md:px-8 lg:px-12">
        <Link href="/" className="mr-auto flex min-h-11 items-center" aria-label="Redcord — úvodní stránka">
          <Wordmark />
        </Link>

        <nav aria-label="Hlavní navigace" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <DesktopItem key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
        </nav>

        <a
          href={shopUrl}
          rel="noopener"
          className="hidden min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[15px] font-semibold hover:border-ink md:inline-flex"
        >
          E-shop
          <ExternalMark />
        </a>
        <Link href="/hledat/" className="hidden h-11 w-11 items-center justify-center rounded-full hover:bg-surface-muted md:flex">
          <span className="sr-only">Hledat</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4.5 4.5" />
          </svg>
        </Link>
        <Link href={cta.href} className={buttonClass("dark", "hidden min-h-11 px-5 py-2 text-[15px] sm:inline-flex")}>
          {cta.label}
        </Link>

        {/* Mobile/tablet menu: native <details> so it works without JavaScript. */}
        <details ref={mobile} className="group xl:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Zavřít</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path className="group-open:hidden" d="M3 6h14M3 14h14" />
              <path className="hidden group-open:inline" d="m5 5 10 10M15 5 5 15" />
            </svg>
          </summary>
          <div className="absolute inset-x-0 top-full h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-line bg-white">
            <nav aria-label="Hlavní navigace (mobil)" className="mx-auto max-w-content px-5 pb-12 pt-4 md:px-8">
              <ul className="grid gap-6 md:grid-cols-2">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="flex min-h-11 items-center text-2xl font-bold tracking-tight">
                      {item.label}
                    </Link>
                    {item.children && (
                      <ul className="mt-1 border-l-2 border-line pl-4">
                        {item.children
                          .filter((c) => c.href !== item.href)
                          .map((c) => (
                            <li key={c.href}>
                              <Link href={c.href} className="flex min-h-11 items-center text-muted hover:text-ink">
                                {c.label}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
                <Link href={cta.href} className={buttonClass("dark")}>
                  {cta.label}
                </Link>
                <a href={shopUrl} rel="noopener" className={buttonClass("outline-dark")}>
                  E-shop
                  <ExternalMark />
                </a>
                <Link href="/hledat/" className={buttonClass("outline-dark")}>
                  Hledat
                </Link>
              </div>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
