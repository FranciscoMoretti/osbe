export function createId() {
  if ("crypto" in globalThis && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
