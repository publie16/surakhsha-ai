import Link from "next/link";
import { Shield, Navigation, AlertTriangle, ArrowRight, Eye, Radio, HeartPulse } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-background via-surface to-surface-dark">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-terracotta/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-50px] right-[-50px] w-[400px] h-[300px] bg-copper/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-terracotta/20 border border-terracotta/40 flex items-center justify-center text-terracotta shadow-glass-sm">
            <Shield className="w-5 h-5 text-copper" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold tracking-tight text-cream">SurakshaAI</span>
            <span className="ml-2 text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-terracotta/25 text-copper border border-terracotta/30">
              Prototype
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs sm:text-sm font-medium text-cream-muted hover:text-cream transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Municipal View
          </Link>
          <Link
            href="/app"
            className="text-xs sm:text-sm font-semibold bg-terracotta hover:bg-terracotta-hover text-white px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-terracotta/25 flex items-center gap-2"
          >
            <span>Launch App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="w-full max-w-4xl mx-auto px-6 py-12 sm:py-16 text-center z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-copper mb-6 backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-safe animate-pulse" />
          <span>Smart Cities for a Safer India · College Innovation Prototype</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-cream leading-[1.1] mb-6">
          The <span className="text-safe underline decoration-safe/30 underline-offset-8">safest</span> walking route, not just the fastest.
        </h1>

        <p className="text-base sm:text-xl text-cream-muted max-w-2xl mb-10 leading-relaxed font-sans">
          Standard maps optimize solely for travel time. SurakshaAI evaluates real-world street lighting, open storefronts, crowd density, and historical risk to guide women along secure, actively populated paths.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/app"
            className="w-full sm:w-auto px-8 py-4 bg-terracotta hover:bg-terracotta-hover text-white text-base sm:text-lg font-semibold rounded-2xl transition-all shadow-xl shadow-terracotta/20 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Navigation className="w-5 h-5 text-cream" />
            <span>Find Safe Route</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-4 glass-card text-cream hover:text-white text-base font-medium rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-white/10"
          >
            <span>Municipal Dashboard</span>
          </Link>
        </div>

        {/* Prototype notice pill */}
        <p className="mt-6 text-xs text-cream-muted/70 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-copper" />
          Prototype: risk scores computed proactively via NCRB crime patterns & open street intelligence.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-16 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-safe/10 border border-safe/20 flex items-center justify-center text-safe mb-5 group-hover:scale-105 transition-transform">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-cream mb-2">AI Safe Routing</h3>
            <p className="text-sm text-cream-muted leading-relaxed">
              Proactive multi-factor A* cost routing that avoids dimly-lit alleys, isolated stretches, and known high-risk zones, preferring well-trafficked commercial corridors.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-copper/15 border border-copper/30 flex items-center justify-center text-copper mb-5 group-hover:scale-105 transition-transform">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-cream mb-2">Dynamic Risk Heatmap</h3>
            <p className="text-sm text-cream-muted leading-relaxed">
              Live visual heat layers reflecting street lamp coverage, open late-night stores, police presence, and real-time community reports from walking commuters.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-sos/15 border border-sos/30 flex items-center justify-center text-sos mb-5 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-cream mb-2">Smart Shake-to-SOS</h3>
            <p className="text-sm text-cream-muted leading-relaxed">
              Emergency activation triggered discreetly by shaking the phone or manual panic button with countdown cancellation, auto-notifying trusted contacts with live coordinates.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-6 px-6 text-center text-xs text-cream-muted/60 z-10 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
        <p>© 2026 SurakshaAI · College Prototype for Smart Cities for a Safer India</p>
        <p className="mt-2 sm:mt-0 text-[11px] text-cream-muted/50">
          Powered by OpenStreetMap & Nominatim · Zero proprietary API keys
        </p>
      </footer>
    </main>
  );
}
