export type StorageAdapter = {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  subscribe(key: string, listener: () => void): () => void
}

type StoredStateOptions<T> = {
  adapter?: StorageAdapter
  defaults: T
  key: string
  normalize(value: unknown): T
}

type BrowserStorageOptions = {
  fallbackEventName?: string
  fallbackKey?: string
  fallbackStorage?: Storage
}

export function createStoredState<T>({
  adapter = createBrowserStorageAdapter(),
  defaults,
  key,
  normalize
}: StoredStateOptions<T>) {
  const read = async () => normalize((await adapter.get(key)) ?? defaults)

  const write = async (value: T) => {
    const normalized = normalize(value)
    await adapter.set(key, normalized)
    return normalized
  }

  const update = async (updater: (current: T) => T) =>
    write(updater(await read()))

  const subscribe = (listener: () => void) => adapter.subscribe(key, listener)

  return { read, subscribe, update, write }
}

export function createBrowserStorageAdapter(
  options: BrowserStorageOptions = {}
): StorageAdapter {
  if (typeof chrome !== "undefined" && Boolean(chrome.storage?.local)) {
    return createChromeStorageAdapter()
  }

  const fallbackStorage =
    options.fallbackStorage ??
    (typeof localStorage === "undefined" ? undefined : localStorage)

  if (!fallbackStorage) {
    return createMemoryStorageAdapter()
  }

  const eventName =
    options.fallbackEventName ?? "osbe-extension-storage-changed"
  const getFallbackKey = (key: string) => options.fallbackKey ?? key

  return {
    async get(key) {
      const stored = fallbackStorage.getItem(getFallbackKey(key))
      return stored ? JSON.parse(stored) : undefined
    },
    async set(key, value) {
      fallbackStorage.setItem(getFallbackKey(key), JSON.stringify(value))
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(eventName, { detail: key }))
      }
    },
    subscribe(key, listener) {
      if (typeof window === "undefined") return () => {}

      const onChange = (event: Event) => {
        if (!(event instanceof CustomEvent) || event.detail === key) {
          listener()
        }
      }

      window.addEventListener(eventName, onChange)
      return () => window.removeEventListener(eventName, onChange)
    }
  }
}

export function createMemoryStorageAdapter(
  initial: Record<string, unknown> = {}
): StorageAdapter {
  const values = new Map(Object.entries(initial))
  const listeners = new Map<string, Set<() => void>>()

  return {
    async get(key) {
      return values.get(key)
    },
    async set(key, value) {
      values.set(key, value)
      for (const listener of Array.from(listeners.get(key) ?? [])) {
        listener()
      }
    },
    subscribe(key, listener) {
      const keyListeners = listeners.get(key) ?? new Set()
      keyListeners.add(listener)
      listeners.set(key, keyListeners)

      return () => {
        keyListeners.delete(listener)
      }
    }
  }
}

function createChromeStorageAdapter(): StorageAdapter {
  return {
    async get(key) {
      try {
        const result = await chrome.storage.local.get(key)
        return result[key]
      } catch (error) {
        if (isInvalidatedExtensionContext(error)) return undefined
        throw error
      }
    },
    async set(key, value) {
      try {
        await chrome.storage.local.set({ [key]: value })
      } catch (error) {
        if (isInvalidatedExtensionContext(error)) return
        throw error
      }
    },
    subscribe(key, listener) {
      const onChange = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string
      ) => {
        if (areaName === "local" && changes[key]) {
          listener()
        }
      }

      try {
        chrome.storage.onChanged.addListener(onChange)
      } catch {
        return () => {}
      }

      return () => {
        try {
          chrome.storage.onChanged.removeListener(onChange)
        } catch {
          // An extension page can outlive an extension update or reload.
        }
      }
    }
  }
}

function isInvalidatedExtensionContext(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("extension context invalidated")
  )
}
