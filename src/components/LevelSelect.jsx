"use client";
import { Gauge } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { controlTriggerClass, controlContentClass, controlItemClass } from "@/components/DomainSelect";

// Values and descriptors must match levelStyle() in the API routes.
export const LEVELS = [
  { value: "beginner", label: "Beginner", hint: "Simple" },
  { value: "intermediate", label: "Intermediate", hint: "Clear" },
  { value: "advanced", label: "Advanced", hint: "Detailed" },
  { value: "professional", label: "Professional", hint: "Scholarly" },
];

export function levelLabel(value) {
  return LEVELS.find((l) => l.value === value)?.label || "Intermediate";
}

export default function LevelSelect({ value, onChange, disabled, className }) {
  const current = LEVELS.find((l) => l.value === value) || LEVELS[1];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={`Level: ${current.label} (${current.hint})`}
        className={cn(controlTriggerClass, className)}
      >
        <Gauge className="size-4 text-brand-violet" aria-hidden="true" />
        <SelectValue placeholder="Choose level" />
      </SelectTrigger>

      <SelectContent className={controlContentClass}>
        {LEVELS.map(({ value: v, label, hint }) => (
          <SelectItem key={v} value={v} className={controlItemClass}>
            <span>
              {label}
              <span className="text-text-muted max-sm:hidden"> · {hint}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
