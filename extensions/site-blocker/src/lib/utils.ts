import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDurationUntil(timestamp?: number) {
  if (!timestamp) {
    return ""
  }

  const remaining = Math.max(0, timestamp - Date.now())
  const minutes = Math.ceil(remaining / 60000)

  if (minutes <= 1) {
    return "less than 1 minute"
  }

  return `${minutes} minutes`
}

export function createId() {
  if ("crypto" in globalThis && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
