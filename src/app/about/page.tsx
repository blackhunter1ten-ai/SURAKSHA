import Image from "next/image";
import { Cpu, MapPin, Shield, Watch } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
      <p className="text-center text-xs font-semibold uppercase text-slate-500">
        About the System
      </p>
      <h1 className="mt-2 text-center text-3xl font-bold text-slate-900 md:text-4xl">
        Revolutionizing Tourist Safety
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
        high-risk areas with AI anomaly detection,
        geo-fencing, and IoT-ready vitals.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          {[
            {
              icon: Cpu,
              title: "AI-Powered Detection",
              text: "Real-time anomaly detection and predictive analytics.",
            },
            {
              icon: MapPin,
              title: "Geo-Fencing Technology",
              text: "Automated boundary monitoring and alert systems.",
            },
            {
              icon: Watch,
              title: "IoT Integration",
              text: "Smart wearables for continuous health monitoring.",
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <f.icon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-sky-200 to-amber-100 shadow-lg">
          <Image
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80"
            alt="Tourist hiking safely"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
    </div>
  );
}
