import { MapPin, Phone, Shield } from "lucide-react";
import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900">Contact</h1>
      <p className="mt-2 text-slate-600">
        Reach operations, crisis response, or technical support.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900">Send us a Message</h2>
          <p className="text-sm text-slate-600">
            Fill out the form — submissions persist via{" "}
            <code className="rounded bg-slate-100 px-1">POST /api/contact</code>.
          </p>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <ContactForm />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-blue-600" />
              Emergency Contacts
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                <span>24/7 Hotline: +1-800-TOURIST-911</span>
              </li>
              <li>Crisis: response@touristsafety.gov</li>
              <li className="flex gap-2">
                <Shield className="h-4 w-4 shrink-0 text-slate-500" />
                Tech: support@smarttouristsafety.com
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">System Status</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {["AI Detection System", "IoT Network", "Emergency Response"].map(
                (s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {s}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
