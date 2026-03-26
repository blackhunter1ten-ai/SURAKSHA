"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileText,
  Heart,
  Lock,
  MapPin,
  Navigation,
  Radio,
  Shield,
  Wifi,
} from "lucide-react";
import { ContactForm } from "@/app/contact/ContactForm";

const heroSlides = [
  {
    title: "Attention Tourists — Stay Alert in High-Risk Zones",
    subtitle: "Real-time alerts and safe corridors for every journey.",
  },
  {
    title: "Are You Safe — Smart Tourist Safety Monitoring 2025",
    subtitle: "India's next-gen tourist safety stack: AI, geo-fencing, and SOS.",
  },
  {
    title: "Thank You for Supporting Smart Tourist Safety Monitoring 2025",
    subtitle: "Together we make travel safer with transparent, verifiable protection.",
  },
];

const registryTourists = [
  {
    name: "John Smith",
    place: "India Gate",
    city: "New Delhi, India",
    detail: "Rajpath, India Gate, New Delhi",
    status: "Safe" as const,
    acc: "±8m",
    time: "2 min ago",
  },
  {
    name: "Maria Garcia",
    place: "Times Square",
    city: "New York, USA",
    detail: "Times Square, New York, NY",
    status: "Safe" as const,
    acc: "±5m",
    time: "1 min ago",
  },
  {
    name: "David Chen",
    place: "Big Ben",
    city: "London, United Kingdom",
    detail: "Westminster, London",
    status: "Warning" as const,
    acc: "±12m",
    time: "30 sec ago",
  },
  {
    name: "Sarah Johnson",
    place: "Red Fort",
    city: "New Delhi, India",
    detail: "Netaji Subhash Marg, Lal Qila",
    status: "Emergency" as const,
    acc: "±3m",
    time: "Just now",
  },
];

function statusStyle(s: "Safe" | "Warning" | "Emergency") {
  if (s === "Safe") return "bg-emerald-100 text-emerald-800";
  if (s === "Warning") return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-800";
}

export function LandingPage() {
  const [slide, setSlide] = useState(0);
  const [showAllLocs, setShowAllLocs] = useState(true);
  const s = heroSlides[slide];

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="hero-gradient circuit-bg grid-bg relative overflow-hidden text-white">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-24 lg:px-8">
          {/* Slide arrows */}
          <button
            type="button"
            className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-2.5 backdrop-blur transition hover:bg-white/15 lg:block"
            onClick={() => setSlide((i) => (i === 0 ? heroSlides.length - 1 : i - 1))}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-2.5 backdrop-blur transition hover:bg-white/15 lg:block"
            onClick={() => setSlide((i) => (i + 1) % heroSlides.length)}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Left — SOS Card with animated ring */}
          <div className="relative flex w-full max-w-sm justify-center lg:w-5/12">
            {/* Animated outer ring */}
            <div className="absolute inset-0 m-auto h-72 w-72 animate-spin-slow rounded-full border-2 border-dashed border-cyan-400/20" />
            <div className="absolute inset-0 m-auto h-64 w-64 animate-spin-slow rounded-full border border-indigo-400/15" style={{ animationDirection: 'reverse', animationDuration: '18s' }} />

            <div className="relative z-10 w-full max-w-xs">
              {/* Main SOS Card */}
              <div className="glass-strong rounded-3xl p-8 shadow-2xl">
                <div className="animate-pulse-glow rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-rose-700 px-6 py-6 text-center shadow-lg shadow-red-500/30">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <p className="text-xl font-black tracking-widest">ARE YOU SAFE?</p>
                  <div className="mx-auto mt-3 h-1.5 w-3/4 rounded-full bg-white/20">
                    <div className="h-full w-2/3 rounded-full bg-white/60 animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)', backgroundSize: '200% 100%' }} />
                  </div>
                </div>
                <p className="mt-5 text-center text-xs font-medium tracking-wide text-white/70">
                  One-tap SOS · Live location · Authority sync
                </p>
              </div>

              {/* Floating stat badges */}
              <div className="absolute -left-6 top-4 animate-float glass rounded-xl px-3 py-2 shadow-lg">
                <p className="text-[10px] font-semibold text-cyan-300">LIVE TRACKING</p>
                <p className="text-lg font-bold text-white">1,247</p>
                <p className="text-[9px] text-white/50">tourists protected</p>
              </div>
              <div className="absolute -right-4 bottom-8 glass rounded-xl px-3 py-2 shadow-lg" style={{ animation: 'float-up 4s ease-in-out 1s infinite' }}>
                <p className="text-[10px] font-semibold text-emerald-300">RESPONSE TIME</p>
                <p className="text-lg font-bold text-white">&lt; 2m</p>
                <p className="text-[9px] text-white/50">avg emergency</p>
              </div>
            </div>
          </div>

          {/* Right — Text content */}
          <div className="flex w-full flex-1 flex-col gap-5 text-center lg:text-left">
            {/* Tech badges */}
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Brain className="h-3 w-3" /> AI Detection
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                <MapPin className="h-3 w-3" /> Geo-Sensing
              </span>
            </div>

            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg md:text-4xl lg:text-5xl">
              {s.title}
            </h1>
            <p className="text-balance text-lg leading-relaxed text-white/75 lg:text-xl">
              {s.subtitle}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-2 lg:justify-start">
              <Link
                href="/emergency"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:shadow-red-500/40 hover:brightness-110"
              >
                <Radio className="h-4 w-4" />
                Emergency SOS
              </Link>
              <Link
                href="/dashboard/user/fir"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                <FileText className="h-4 w-4" />
                File e-FIR
              </Link>
            </div>

            {/* Slide dots */}
            <div className="flex justify-center gap-2.5 pt-3 lg:justify-start">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === slide ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comprehensive Safety Solution (6 compact cards) ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8" id="download">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
          Advanced Technology Stack
        </p>
        <h2 className="mt-2 text-center text-3xl font-bold text-slate-900 md:text-4xl">
          Comprehensive Safety Solution
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-center text-slate-600">
          Our integrated platform combines cutting-edge technologies to provide
          unprecedented tourist safety monitoring and emergency response capabilities.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">


          {/* AI Anomaly Detection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Brain className="h-8 w-8 text-violet-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">AI Anomaly Detection</h3>
            <p className="text-sm font-medium text-violet-600">Real-time behavior monitoring</p>
            <p className="mt-3 text-sm text-slate-600">
              Advanced ML algorithms detect unusual patterns like location drops, prolonged
              inactivity, or route deviations for immediate alerts.
            </p>
            <div className="mt-4 flex justify-between text-center text-xs">
              <div>
                <p className="text-xl font-bold text-slate-900">97.3%</p>
                <p className="text-slate-500">Accuracy</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">24/7</p>
                <p className="text-slate-500">Monitoring</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">0.8s</p>
                <p className="text-slate-500">Response</p>
              </div>
            </div>
          </div>

          {/* Geo-Fencing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <MapPin className="h-8 w-8 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">Geo-Fencing Alerts</h3>
            <p className="text-sm font-medium text-emerald-600">Boundary-based safety zones</p>
            <p className="mt-3 text-sm text-slate-600">
              Virtual boundaries around high-risk areas trigger automatic alerts to tourists
              and authorities when breached.
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-700">24 Active Zones</p>
          </div>

          {/* Emergency Panic Button */}
          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Emergency Panic Button</h3>
            <p className="text-sm text-red-600">Instant emergency response</p>
            <p className="mt-3 text-sm text-slate-600">
              One-touch emergency activation sends location, medical info, and alerts to
              authorities and emergency contacts.
            </p>
            <Link
              href="/emergency"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700"
            >
              <Radio className="h-4 w-4" />
              EMERGENCY
            </Link>
          </div>

          {/* IoT Smart Band */}
          <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
              <Activity className="h-5 w-5 text-pink-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold">IoT Smart Band</h3>
            <p className="text-sm text-pink-600">Continuous health monitoring</p>
            <div className="mt-3 rounded-lg bg-sky-50 p-3 text-xs">
              <span className="rounded bg-blue-200 px-1.5 py-0.5 font-semibold">Beta</span>{" "}
              <span className="rounded bg-blue-100 px-1.5 py-0.5">Coming Soon</span>
              <p className="mt-2 text-slate-700">
                SOS alerts and fall detection on wearable.
              </p>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-600">
              <span><Heart className="mr-1 inline h-3 w-3" />72 BPM</span>
              <span>Normal</span>
              <span className="text-emerald-600">Active</span>
            </div>
          </div>

          {/* Auto E-FIR */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <FileText className="h-5 w-5 text-slate-700" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Auto e-FIR Generation</h3>
            <p className="text-sm text-slate-600">Automated incident reporting</p>
            <p className="mt-3 text-sm text-slate-600">
              Automatic Electronic FIR generation for missing persons or emergencies with secure audit trail.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs">
              <li className="flex justify-between">
                Report Generation <span className="rounded bg-amber-200 px-1.5">Automated</span>
              </li>

              <li className="flex justify-between">
                Authority Integration <span className="rounded bg-amber-200 px-1.5">Real-time</span>
              </li>
            </ul>
            <Link
              href="/dashboard/user/fir"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              File e-FIR
            </Link>
          </div>
        </div>
      </section>

      {/* ── Geo-Sensing — map + tourist registry ── */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase text-emerald-600">
            Live Location Tracking
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold text-slate-900">
            Geo-Sensing Integration
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-slate-600">
            Real-time location tracking with Google Maps integration showing live tourist
            locations, safe zones, and emergency response.
          </p>

          {/* Map */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Live Tourist Location Tracking
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                  4 Active
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/geo"
                  className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Crosshair className="h-3 w-3" />
                  Start Real GPS
                </Link>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showAllLocs}
                    onChange={(e) => setShowAllLocs(e.target.checked)}
                  />
                  Show All Locations
                </label>
              </div>
            </div>
            <div className="relative h-72 bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100">
              <div className="absolute left-4 top-4 max-w-xs rounded-xl bg-white/95 p-3 text-xs shadow-md backdrop-blur">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Google Maps API + GPS Active
                </p>
                <p className="mt-1 text-slate-600">Real-time reverse geocoding enabled</p>
                <p className="text-slate-500">Accuracy: ±3–15 meters</p>
              </div>
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
                  <Wifi className="h-4 w-4" />
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
                  <Navigation className="h-4 w-4" />
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
                  <Shield className="h-4 w-4" />
                </span>
              </div>
              <div className="absolute bottom-6 left-8 right-8 flex flex-wrap justify-center gap-6">
                {registryTourists.slice(0, showAllLocs ? 4 : 2).map((t) => (
                  <div
                    key={t.name}
                    className="max-w-[140px] rounded-lg bg-white/95 p-2 text-[10px] shadow-md backdrop-blur"
                  >
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-slate-500">{t.place}</p>
                    <span
                      className={`mt-1 inline-block rounded px-1 text-[9px] font-semibold ${statusStyle(t.status)}`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Safe (2)</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">Warning (1)</span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">Emergency (1)</span>
          </div>

          {/* Tourist registry */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-900">Live Tourist Registry</h3>
            <div className="mt-4 space-y-2">
              {registryTourists.map((t) => (
                <div
                  key={t.name}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-600">{t.place} · {t.city}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle(t.status)}`}
                    >
                      {t.status}
                    </span>
                    <p className="text-xs text-slate-500">{t.acc} · {t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Authority Dashboard (compact) ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase text-slate-500">
          Real-time Analytics
        </p>
        <h2 className="mt-2 text-center text-3xl font-bold text-slate-900">
          Authority Dashboard
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Comprehensive real-time monitoring and analytics for tourism authorities and
          emergency response teams.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["15,847", "+12% from last month", "Total Tourists", "text-blue-600"],
            ["3", "Requires immediate attention", "Active Alerts", "text-red-600"],
            ["< 2 min", "Average resolution time", "Resolved Incidents", "text-amber-600"],
            ["98.7%", "Overall safety rating", "Safety Score", "text-rose-600"],
          ].map(([n, sub, title, c]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-500">{title}</p>
              <p className={`mt-2 text-3xl font-bold ${c}`}>{n}</p>
              <p className="mt-1 text-xs text-slate-500">{sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/dashboard/admin"
            className="inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Open Authority Dashboard
          </Link>
        </div>
      </section>

      {/* ── About ── */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase text-slate-500">
            About the System
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold text-slate-900">
            Revolutionizing Tourist Safety
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Our Smart Tourist Safety Monitoring system ensures that tourists visiting remote and
            high-risk areas are protected through cutting-edge technology integration.
          </p>
          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              {[
                ["AI-Powered Detection", "Real-time anomaly detection and predictive analytics."],
                ["Geo-Fencing Technology", "Automated boundary monitoring and alert systems."],
                ["IoT Integration", "Smart wearables for continuous health monitoring."],
              ].map(([t, d]) => (
                <div key={t as string}>
                  <h3 className="font-bold text-slate-900">{t}</h3>
                  <p className="text-sm text-slate-600">{d}</p>
                </div>
              ))}
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-sky-200 to-amber-100 shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80"
                alt="Happy tourist with backpack in scenic mountain landscape"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="py-16" id="contact">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase text-blue-600">
            Get in Touch
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold text-slate-900">
            Contact Our Team
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Ready to implement smart tourist safety in your region? Get in touch with our
            experts for consultation and deployment.
          </p>
          <div className="mt-10 grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-900">Send us a Message</h3>
              <p className="text-sm text-slate-600">
                Fill out the form below and we&apos;ll get back to you within 24 hours.
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <ContactForm />
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">Emergency Contacts</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  <li>
                    <p className="text-xs text-slate-500">24/7 Emergency Hotline</p>
                    <p className="font-mono text-slate-900">+1-800-TOURIST-911</p>
                  </li>
                  <li>
                    <p className="text-xs text-slate-500">Crisis Response Center</p>
                    <p>response@touristsafety.gov</p>
                  </li>
                  <li>
                    <p className="text-xs text-slate-500">Technical Support</p>
                    <p>support@smarttouristsafety.com</p>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">System Status</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {[
                    ["AI Detection System", "Active"],
                    ["IoT Network", "Connected"],
                    ["Emergency Services", "Ready"],
                  ].map(([label, st]) => (
                    <li key={label} className="flex justify-between">
                      <span>{label}</span>
                      <span className="text-emerald-600">{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
