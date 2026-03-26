"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  Download,
  Globe,
  LogIn,
  Menu,
  Phone,
  User,
  X,
  AlertTriangle,
  FileText,
  MoreHorizontal,
} from "lucide-react";

const nav = [
  { href: "/", label: "Home" },
  { href: "/solution", label: "Solution" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setLoginOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  /* close dropdowns on outside click */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) setLoginOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-amber-400 text-sm font-bold text-white">
            S
          </span>
          <span className="hidden font-bold tracking-tight text-slate-900 sm:inline">
            SURAKSHA
          </span>
          <span className="rounded-full bg-amber-300/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-900">
            Tourist Safety
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-amber-100/80 text-amber-900"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-2 lg:flex">

          {/* Login dropdown */}
          <div className="relative" ref={loginRef}>
            <button
              type="button"
              onClick={() => { setLoginOpen(!loginOpen); setMoreOpen(false); }}
              className="flex items-center gap-1 rounded-full border-2 border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700"
            >
              <LogIn className="h-4 w-4" />
              Login
              <ChevronDown className="h-3 w-3" />
            </button>
            {loginOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <Link
                  href="/login/admin"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => setLoginOpen(false)}
                >
                  <User className="h-4 w-4 text-blue-600" />
                  Authority (Admin)
                </Link>
                <Link
                  href="/login/user"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => setLoginOpen(false)}
                >
                  <User className="h-4 w-4 text-emerald-600" />
                  Tourist (User)
                </Link>
                <Link
                  href="/login"
                  className="block border-t border-slate-100 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                  onClick={() => setLoginOpen(false)}
                >
                  Compare login options →
                </Link>
              </div>
            )}
          </div>


          {/* More dropdown — houses Download App, Language, Contact */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => { setMoreOpen(!moreOpen); setLoginOpen(false); }}
              className="flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <a
                  href="#download"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setMoreOpen(false)}
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  Download App
                </a>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setMoreOpen(false)}
                >
                  <Phone className="h-4 w-4 text-amber-600" />
                  Contact Us
                </Link>
                <div className="border-t border-slate-100 px-3 py-2">
                  <p className="flex items-center gap-2 text-sm text-slate-700">
                    <Globe className="h-4 w-4 text-blue-600" />
                    English 🇺🇸
                  </p>
                  <p className="mt-1 pl-6 text-xs text-slate-400">
                    हिंदी (coming soon)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="rounded-lg p-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard/user/fir"
              className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
            >
              <FileText className="h-4 w-4" />
              e-FIR
            </Link>
            <Link
              href="/login/admin"
              className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800"
            >
              Login — Admin
            </Link>
            <Link
              href="/login/user"
              className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
            >
              Login — Tourist
            </Link>
            <Link
              href="/emergency"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency SOS
            </Link>
            <a
              href="#download"
              className="flex items-center justify-center gap-2 rounded-lg border border-emerald-300 py-2 text-sm font-medium text-emerald-800"
            >
              <Download className="h-4 w-4" />
              Download App
            </a>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-amber-400 py-2 text-sm font-medium text-slate-800"
            >
              <Phone className="h-4 w-4" />
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
