"use client";
import {
  Globe,
  Scale,
  Stethoscope,
  Landmark,
  GraduationCap,
  TrendingUp,
  Apple,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Values must match the domains handled by /api/simplify.
export const DOMAINS = [
  { value: "general", label: "General", icon: Globe },
  { value: "legal", label: "Legal", icon: Scale },
  { value: "medical", label: "Medical", icon: Stethoscope },
  { value: "government", label: "Government", icon: Landmark },
  { value: "education", label: "Education", icon: GraduationCap },
  { value: "financial", label: "Financial", icon: TrendingUp },
  { value: "nutrition", label: "Nutritional", icon: Apple, note: "New" },
];

export function domainLabel(value) {
  return DOMAINS.find((d) => d.value === value)?.label || "General";
}

export const controlTriggerClass =
  "h-9 w-auto gap-1.5 rounded-lg border border-line bg-white/[0.04] px-2.5 text-sm sm:gap-2 sm:px-3 font-medium text-text shadow-none " +
  "hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:border-transparent " +
  "data-[state=open]:bg-white/[0.08] disabled:opacity-50 [&>svg:last-child]:text-text-muted [&>svg:last-child]:opacity-100";

export const controlContentClass =
  "rounded-xl border border-line-strong bg-ink-800 text-text shadow-2xl shadow-black/40";

export const controlItemClass =
  "rounded-md py-2 pl-2.5 pr-8 text-sm text-text-soft cursor-pointer " +
  "focus:bg-white/[0.07] focus:text-text data-[state=checked]:text-text";

export default function DomainSelect({ value, onChange, disabled, className }) {
  const current = DOMAINS.find((d) => d.value === value) || DOMAINS[0];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={`Domain: ${current.label}`} className={cn(controlTriggerClass, className)}>
        {/* SelectValue mirrors the selected item, including its icon */}
        <SelectValue placeholder="Choose domain" />
      </SelectTrigger>

      <SelectContent className={controlContentClass}>
        {DOMAINS.map(({ value: v, label, icon: ItemIcon, note }) => (
          <SelectItem key={v} value={v} className={controlItemClass}>
            <ItemIcon className="size-4 text-brand-cyan" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
            {note && (
              <span className="text-xs text-brand-cyan [[data-slot=select-trigger]_&]:hidden">{note}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
