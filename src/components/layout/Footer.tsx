import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-white">SmartTouristSafety System</p>
            <p className="mt-3 text-sm leading-relaxed">
              Advanced tourist safety monitoring powered by AI and IoT for
              comprehensive protection and emergency response.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <a href="#" className="hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white">
                Terms of Service
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
              Core Features
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "AI Anomaly Detection",
                "Geo-Fencing Alerts",
                "IoT Smart Bands",
                "Auto E-FIR Generation",
              ].map((t) => (
                <li key={t}>
                  <Link href="/solution" className="hover:text-white">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
              Resources
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "API Documentation",
                "Integration Guide",
                "Best Practices",
                "Case Studies",
                "Developer Tools",
              ].map((t) => (
                <li key={t}>
                  <a href="#" className="hover:text-white">
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
              24/7 Support
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Emergency Hotline</li>
              <li className="font-mono text-white">+1-800-EMERGENCY</li>
              <li>Technical Support</li>
              <li>Training Programs</li>
              <li>System Maintenance</li>
              <li>Updates &amp; Patches</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-700 pt-8 sm:flex-row">
          <p className="text-center text-xs text-slate-500 sm:text-left">
            © 2024 Smart Tourist Safety System. All rights reserved.
          </p>
          <p className="text-xs text-slate-500">
            Protecting tourists worldwide with advanced technology
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-600 px-2 py-0.5">AI Powered</span>
            <span className="rounded-full border border-slate-600 px-2 py-0.5">IoT Enabled</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
