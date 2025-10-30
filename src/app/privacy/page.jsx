// src/app/privacy/page.jsx
export const metadata = { title: 'Privacy Policy — Unjargon AI' };

const LAST_UPDATED = 'October 29, 2025';

export default function PrivacyPage() {
  return (
    <main className="px-6 md:px-12 py-10 max-w-[900px] mx-auto text-gray-200">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400">Last updated: {LAST_UPDATED}</p>
      </header>

      {/* TL;DR / At a Glance */}
      <section className="mb-8">
        <div className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-slate-900/60 to-slate-800/60 p-5">
          <h2 className="text-xl font-bold mb-3">At a Glance</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="rounded-lg border border-gray-700/50 p-3">
              <p className="font-semibold text-white">No accounts required</p>
              <p className="text-sm text-gray-300">We don’t ask you to sign up or create an account.</p>
            </li>
            <li className="rounded-lg border border-gray-700/50 p-3">
              <p className="font-semibold text-white">Local history only</p>
              <p className="text-sm text-gray-300">Your chat history is stored in your browser via localStorage, not on our servers.</p>
            </li>
            <li className="rounded-lg border border-gray-700/50 p-3">
              <p className="font-semibold text-white">AI processing only</p>
              <p className="text-sm text-gray-300">Text/images you submit are sent to our AI provider to generate a response; we don’t use your inputs for training.</p>
            </li>
            <li className="rounded-lg border border-gray-700/50 p-3">
              <p className="font-semibold text-white">Minimal server data</p>
              <p className="text-sm text-gray-300">We may temporarily use your IP for rate limiting and basic logs to keep the service reliable.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* What We Collect */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">1) What We Collect</h2>
        <div className="space-y-4 text-gray-200">
          <div>
            <p className="font-semibold text-white">a) Content You Provide</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li><span className="font-semibold">Text you paste</span> for simplification.</li>
              <li><span className="font-semibold">Images you upload</span> (e.g., screenshots). We support direct in-browser previews and may send the image (or a data URL) to the AI provider to analyze. Avoid sensitive content.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-white">b) Local App Data (On Your Device)</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li><span className="font-semibold">History / Titles</span> you see in the sidebar are stored only in your browser’s localStorage. You can delete them anytime from the UI or by clearing your browser storage.</li>
              <li><span className="font-semibold">UI preferences</span> (e.g., toggles, dismissed tips) may also be stored locally.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-white">c) Minimal Server/Operational Data</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li><span className="font-semibold">IP address (ephemeral)</span> may be used for <span className="font-semibold">rate limiting</span> and abuse prevention. We do not build profiles.</li>
              <li><span className="font-semibold">Basic request metadata</span> (timestamps, status codes) may appear in hosting logs for debugging and reliability.</li>
              <li><span className="font-semibold">Privacy-respecting analytics</span> (e.g., Vercel Analytics) may provide high-level metrics (page loads, performance). No personal profiles.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How We Use Data */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">2) How We Use Your Data</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-300">
          <li><span className="font-semibold">Generate results:</span> We send your input to an AI provider solely to produce the response you requested.</li>
          <li><span className="font-semibold">Run the service:</span> Prevent abuse (rate limiting), maintain reliability, and troubleshoot errors.</li>
          <li><span className="font-semibold">Improve UX:</span> Local preferences/history stay on your device; we don’t centralize them.</li>
        </ul>
      </section>

      {/* Data Sharing */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">3) When We Share Data</h2>
        <p className="text-gray-300 mb-3">We don’t sell your data. We share only what’s necessary to operate the app:</p>
        <div className="rounded-lg border border-gray-700/50 p-4">
          <ul className="space-y-3">
            <li>
              <p className="font-semibold text-white">AI Processing Provider</p>
              <p className="text-gray-300 text-sm">
                We send your submitted text/images to the AI provider to generate outputs. We configure the provider so your data is not used to train their models. Content may be transiently processed and streamed back to you.
              </p>
            </li>
            <li>
              <p className="font-semibold text-white">Hosting & Delivery</p>
              <p className="text-gray-300 text-sm">
                Our app is hosted (e.g., Vercel). Hosting platforms naturally receive network-level metadata (IP, timestamps, status codes) to deliver the site and keep it reliable.
              </p>
            </li>
            <li>
              <p className="font-semibold text-white">Optional File Storage</p>
              <p className="text-gray-300 text-sm">
                If image uploads are routed through a storage service (e.g., an S3 bucket you configure), your file may exist there temporarily to allow processing. We aim to use short-lived URLs and keep files only as long as needed.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* Data Retention */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">4) Data Retention</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-300">
          <li><span className="font-semibold">Local history:</span> Stays in your browser until you delete it.</li>
          <li><span className="font-semibold">AI requests/responses:</span> Processed transiently; we don’t store your text centrally for later use.</li>
          <li><span className="font-semibold">Logs & rate limit keys:</span> Minimal operational data retained for short periods to keep the service secure and functional.</li>
          <li><span className="font-semibold">Uploads:</span> If used, files are kept only as long as necessary to generate a result, then discarded per our storage settings.</li>
        </ul>
      </section>

      {/* Your Controls */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">5) Your Choices & Controls</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-300">
          <li><span className="font-semibold">Don’t enter sensitive data:</span> Please avoid personal, confidential, or regulated information.</li>
          <li><span className="font-semibold">Clear history:</span> Use the in-app controls to delete chats/titles, or clear your browser storage.</li>
          <li><span className="font-semibold">Uploads:</span> Remove files you’ve uploaded (where applicable) and avoid uploading sensitive images.</li>
        </ul>
      </section>

      {/* Security */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">6) Security</h2>
        <p className="text-gray-300">
          We use industry-standard HTTPS/TLS, scope access to necessary services, and minimize data retention. No system is perfectly secure, and online transmission involves risk. Please use discretion with what you submit.
        </p>
      </section>

      {/* Children */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">7) Children’s Privacy</h2>
        <p className="text-gray-300">
          Unjargon AI is not intended for children under 13, and we do not knowingly collect personal information from them.
        </p>
      </section>

      {/* International */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">8) International Use</h2>
        <p className="text-gray-300">
          If you access the app from outside the United States, your data may be processed in the U.S. or other countries where our providers operate, which may have different data protection laws than your jurisdiction.
        </p>
      </section>

      {/* Changes */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3">9) Changes to This Policy</h2>
        <p className="text-gray-300">
          We may update this Privacy Policy from time to time. Material changes will be reflected by updating the “Last updated” date above and posting the revised policy here.
        </p>
      </section>

      {/* Contact */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-3">10) Contact Us</h2>
        <p className="text-gray-300">
          Questions or requests? Email <span className="underline">team@unjargon.ai</span>.
        </p>
      </section>
    </main>
  );
}
