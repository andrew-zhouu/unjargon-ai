import { BookOpenCheck } from "lucide-react";

export const metadata = {
  title: "Terms of Use — Unjargon AI",
  description:
    "Read the Terms of Use for Unjargon AI, including acceptable use, privacy, and liability.",
};

const LAST_UPDATED = "October 28, 2025";

const sections = [
  { id: "eligibility", title: "1. Eligibility" },
  { id: "accounts", title: "2. Accounts" },
  { id: "acceptable-use", title: "3. Acceptable Use" },
  { id: "your-content", title: "4. Your Content" },
  { id: "accuracy", title: "5. AI Outputs & Accuracy" },
  { id: "billing", title: "6. Plans, Billing & Trials" },
  { id: "ip", title: "7. Intellectual Property" },
  { id: "privacy", title: "8. Privacy" },
  { id: "third-party", title: "9. Third-Party Services" },
  { id: "warranty", title: "10. Warranty Disclaimer" },
  { id: "liability", title: "11. Limitation of Liability" },
  { id: "termination", title: "12. Termination" },
  { id: "changes", title: "13. Changes to Terms" },
  { id: "contact", title: "14. Contact" },
];

export default function TermsPage() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 py-16">
      {/* subtle gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-indigo-500/15 via-transparent to-transparent blur-2xl"
      />

      {/* header */}
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
          <BookOpenCheck className="h-3.5 w-3.5" /> Last updated {LAST_UPDATED}
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Terms of Use</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Welcome to <strong>Unjargon AI</strong> (“Unjargon,” “we,” “our,” or “us”). By
          accessing or using our website, app, or services (collectively, the
          “Services”), you agree to these Terms of Use (the “Terms”). If you do not agree,
          please do not use the Services.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* sidebar */}
        <aside className="lg:col-span-1">
          <nav className="sticky top-20 rounded-2xl border border-white/10 p-4 text-sm">
            <div className="mb-2 font-medium">On this page</div>
            <ul className="space-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* main content */}
        <article className="prose prose-invert lg:col-span-3 max-w-none rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <Section id="eligibility" title="1. Eligibility">
            You must be at least <strong>13 years old</strong> (or the minimum age of
            digital consent in your region) to use the Services. If you’re using them on
            behalf of an organization, you represent that you have{" "}
            <strong>authority to bind that organization</strong> to these Terms.
          </Section>

          <Section id="accounts" title="2. Accounts">
            You are responsible for maintaining the{" "}
            <strong>confidentiality of your account credentials</strong> and for all
            activities under your account. Notify us immediately of any unauthorized
            access at{" "}
            <a href="mailto:team@unjargon.ai" className="font-medium underline">
              team@unjargon.ai
            </a>
            .
          </Section>

          <Section id="acceptable-use" title="3. Acceptable Use">
            <ul className="leading-7">
              <li>
                Do not use the Services to <strong>violate any laws</strong> or infringe
                upon others’ rights.
              </li>
              <li>
                Do not attempt to <strong>reverse-engineer, hack, or disrupt</strong> our
                systems.
              </li>
              <li>
                Do not upload or input <strong>content you do not have rights to</strong>,
                or that includes personal or sensitive data without consent.
              </li>
            </ul>
          </Section>

          <Section id="your-content" title="4. Your Content">
            <p>
              You retain ownership of your content. However, you grant Unjargon a{" "}
              <strong>worldwide, non-exclusive license</strong> to process it for operating
              and improving our Services.
            </p>
            <p>
              We may use <strong>de-identified, aggregated statistics</strong> to improve
              performance. We will <strong>never sell your data</strong>.
            </p>
          </Section>

          <Section id="accuracy" title="5. AI Outputs & Accuracy">
            <p>
              Our AI-generated outputs are for <strong>informational purposes only</strong>
              . They may contain inaccuracies or omissions. The output is limited to roughly  You are responsible for{" "}
              <strong>verifying</strong> all results—especially in{" "}
              <strong>legal, medical, financial, or safety-critical</strong> contexts.
              Nothing constitutes professional advice.
            </p>
          </Section>

          <Section id="billing" title="6. Plans, Billing & Trials">
            <p>
              When you purchase a paid plan, you authorize us (and our payment processors)
              to <strong>charge applicable fees and taxes</strong>. Subscriptions renew
              automatically unless canceled. Prices and features may change with notice.
            </p>
          </Section>

          <Section id="ip" title="7. Intellectual Property">
            The Services—including all <strong>software, UI/UX, branding, and models</strong>—are
            the property of Unjargon or our licensors. You may not copy or create
            derivative works except as permitted by these Terms or applicable law.
          </Section>

          <Section id="privacy" title="8. Privacy">
            Your privacy matters. Our data-handling practices are described in our{" "}
            <strong>Privacy Policy</strong> (coming soon). By using the Services, you
            consent to those practices.
          </Section>

          <Section id="third-party" title="9. Third-Party Services">
            The Services may link or integrate with third-party tools. Unjargon is{" "}
            <strong>not responsible</strong> for their content, policies, or availability.
          </Section>

          <Section id="warranty" title="10. Warranty Disclaimer">
            The Services are provided <strong>“as is” and “as available”</strong> without
            warranties of any kind—express, implied, or statutory—including{" "}
            <strong>merchantability</strong> or{" "}
            <strong>fitness for a particular purpose</strong>.
          </Section>

          <Section id="liability" title="11. Limitation of Liability">
            To the fullest extent permitted by law, Unjargon and its affiliates{" "}
            <strong>will not be liable</strong> for any indirect, incidental, special, or
            consequential damages—including <strong>loss of profits or data</strong>.
          </Section>

          <Section id="termination" title="12. Termination">
            We may <strong>suspend or terminate</strong> access if you violate these Terms.
            You may stop using the Services anytime. Sections that must survive (like
            Liability and IP) will remain in effect.
          </Section>

          <Section id="changes" title="13. Changes to Terms">
            We may update these Terms periodically. Continued use after changes become
            effective constitutes <strong>acceptance of the revised Terms</strong>.
          </Section>

          <Section id="contact" title="14. Contact">
            For questions, feedback, or legal notices, email{" "}
            <a href="mailto:team@unjargon.ai" className="font-medium underline">
              team@unjargon.ai
            </a>
            .
          </Section>
        </article>
      </div>
    </main>
  );
}

/* helper subcomponent for consistent section formatting */
function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-3 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
