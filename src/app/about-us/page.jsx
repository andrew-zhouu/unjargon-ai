import { ArrowRight, CheckCircle2, Sparkles, Shield } from "lucide-react";

export const metadata = {
  title: "About Us — Unjargon AI",
  description:
    "Unjargon AI makes complex language clear. Learn our mission, what we build, and how we measure impact.",
};

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/5">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 p-6 hover:border-white/20 transition">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/10 p-2">
          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : <span>•</span>}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 py-16">
      {/* background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent blur-2xl"
      />
      {/* hero */}
      <header className="mb-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Clarity, not oversimplification
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          We make complex language <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">understandable</span>.
        </h1>
        <p className="mt-8 max-w-2xl text-base text-muted-foreground">
        I started Unjargon AI with a simple belief: understanding shouldn’t depend on how complicated something sounds. 
        Whether it’s a law, a research paper, or a medical note, everyone deserves clarity.
        </p>

        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
        What began as my curiosity about language and technology has grown into a mission—using AI to make expertise 
        accessible without diluting its meaning. Our goal is simple: help people understand.{" "}
        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Quickly. Clearly.
        </span>
        </p>
      </header>

      {/* stats */}
      <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat value="10k+" label="Words clarified / week" />
        <Stat value="92%" label="Users report higher confidence" />
        <Stat value="2.4×" label="Average reading time saved" />
      </section>

      {/* content */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold">Our mission</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Expertise shouldn’t be locked behind jargon. We build tools that bridge experts and everyday
            readers with definitions, citations, and teach-back prompts—so understanding isn’t just faster,
            it’s <em>safer</em>.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              "Preserve facts while reducing bias and ambiguity.",
              "Meet users where they are with adaptive explanations.",
              "Measure comprehension, not just clicks."
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold">Reach us</h2>
          <p className="mt-3 text-muted-foreground">
            Partnerships, research, or press? We’d love to talk.
          </p>
          <a
            href="mailto:team@unjargon.ai"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-medium hover:border-white/20"
          >
            Email team@unjargon.ai <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <Feature icon={Shield} title="Accuracy with safeguards">
          Citations, versioned prompts, and guardrails help avoid hallucinations and preserve source intent.
        </Feature>
        <Feature icon={CheckCircle2} title="Explain, verify, retain">
          ELI5, teach-back, and self-check modes turn passive reading into active understanding.
        </Feature>
        <Feature icon={Sparkles} title="Built for real workflows">
          Export to PDF, share links, and domain-aware modes for legal, medical, gov, and education.
        </Feature>
      </section>
    </main>
  );
}
