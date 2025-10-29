"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

export default function ContactForm() {
  const [status, setStatus] = useState("idle");

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    const form = new FormData(e.currentTarget);
    const name = encodeURIComponent(form.get("name"));
    const email = encodeURIComponent(form.get("email"));
    const topic = encodeURIComponent(form.get("topic") || "General");
    const message = encodeURIComponent(form.get("message"));

    // mailto fallback
    window.location.href = `mailto:team@unjargon.ai?subject=[Unjargon]%20${topic}&body=From:%20${name}%20<${email}>\n\n${message}`;
    setStatus("success");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" placeholder="Your name" required />
        <Field label="Email" name="email" type="email" placeholder="you@example.com" required />
      </div>
      <Field label="Topic" name="topic" placeholder="Partnership, support, feedback…" />
      <FieldArea
        label="Message"
        name="message"
        rows={6}
        placeholder="How can we help?"
        required
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-medium backdrop-blur transition hover:border-white/20 disabled:opacity-60"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Send
          </>
        )}
      </button>

      {status === "success" && (
        <p className="text-sm text-emerald-400">Thanks! Your email draft just opened.</p>
      )}
    </form>
  );
}

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium">
      {children}
    </label>
  );
}

function InputBase(props) {
  return (
    <input
      {...props}
      className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none transition placeholder:text-muted-foreground/70 focus:border-white/20"
    />
  );
}

function TextAreaBase(props) {
  return (
    <textarea
      {...props}
      className="mt-1 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 outline-none transition placeholder:text-muted-foreground/70 focus:border-white/20"
    />
  );
}

function Field({ label, name, type = "text", ...rest }) {
  const id = `field-${name}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <InputBase id={id} name={name} type={type} {...rest} />
    </div>
  );
}

function FieldArea({ label, name, ...rest }) {
  const id = `field-${name}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <TextAreaBase id={id} name={name} {...rest} />
    </div>
  );
}
