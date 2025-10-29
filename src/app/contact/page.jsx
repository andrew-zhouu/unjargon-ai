import ContactForm from "./ContactForm";
import { Mail, MessageSquareMore } from "lucide-react";

export const metadata = {
  title: "Contact — Unjargon AI",
  description: "Get in touch with the Unjargon AI team.",
};

export default function ContactPage() {
  return (
    <main className="relative mx-auto max-w-5xl px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[300px] bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent blur-2xl"
      />
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Questions, partnerships, or support—drop us a line. We usually reply within 1–2 business days.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Mail className="h-5 w-5" /> Email
          </h2>
          <p className="mt-3">
            <a className="underline underline-offset-4" href="mailto:team@unjargon.ai">
              team@unjargon.ai
            </a>
          </p>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground backdrop-blur">
            Tip: Include screenshots or a link to your doc—context helps us answer faster.
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium">FAQ</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>We don’t train public models on your inputs.</li>
              <li>Education pricing available—email us from a school domain.</li>
              <li>API beta is being tested—message us for more info.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <MessageSquareMore className="h-5 w-5" /> Message us
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This form opens your email app with your filled-out message.
          </p>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
