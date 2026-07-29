import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Laptop,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Smartphone,
  Tablet,
  Trash2
} from "lucide-react"
import * as React from "react"
import { useEffect, useState } from "react"

import "~style.css"

import { Button } from "@osbe/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@osbe/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@osbe/ui/components/dropdown-menu"
import { ExtensionBrand } from "@osbe/ui/components/extension-brand"
import { PopupShell } from "@osbe/ui/components/extension-shell"
import { Input } from "@osbe/ui/components/input"
import { Label } from "@osbe/ui/components/label"
import iconUrl from "data-base64:../assets/icon.png"

import {
  createDefaultState,
  createPresetId,
  isValidWindowSize,
  MAX_WINDOW_SIZE,
  MIN_WINDOW_SIZE,
  movePreset,
  restoreDefaultPresets,
  type PresetState,
  type WindowPreset
} from "~/lib/presets"
import {
  readPresetState,
  subscribeToPresetChanges,
  writePresetState
} from "~/lib/storage"
import {
  readCurrentWindowSize,
  resizeCurrentWindow,
  type WindowSize
} from "~/lib/windows"

type EditorState = {
  key: number
  preset?: WindowPreset
}

type Notice = {
  message: string
  tone: "error" | "success"
}

function IndexPopup() {
  const [state, setState] = useState<PresetState>(createDefaultState())
  const [currentSize, setCurrentSize] = useState<WindowSize | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busyPresetId, setBusyPresetId] = useState<string | null>(null)

  useEffect(() => {
    readPresetState().then(setState)
    refreshCurrentSize()

    return subscribeToPresetChanges(() => {
      readPresetState().then(setState)
    })
  }, [])

  async function refreshCurrentSize() {
    try {
      setCurrentSize(await readCurrentWindowSize())
    } catch {
      setCurrentSize(null)
    }
  }

  async function persist(nextState: PresetState) {
    const savedState = await writePresetState(nextState)
    setState(savedState)
  }

  async function applyPreset(preset: WindowPreset) {
    setBusyPresetId(preset.id)
    setNotice(null)

    try {
      const nextSize = await resizeCurrentWindow(preset)
      setCurrentSize(nextSize)
      setNotice({
        message: `Window resized to ${nextSize.width} × ${nextSize.height}.`,
        tone: "success"
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : "Chrome could not resize this window.",
        tone: "error"
      })
    } finally {
      setBusyPresetId(null)
    }
  }

  async function savePreset(
    nextPreset: WindowPreset,
    resizeAfterSave: boolean
  ) {
    const editing = Boolean(editor?.preset)
    const presets = editing
      ? state.presets.map((preset) =>
          preset.id === nextPreset.id ? nextPreset : preset
        )
      : [...state.presets, nextPreset]

    await persist({ version: 1, presets })
    setEditor(null)

    if (resizeAfterSave) {
      await applyPreset(nextPreset)
    } else {
      setNotice({
        message: editing ? "Preset updated." : "Custom preset added.",
        tone: "success"
      })
    }
  }

  async function deletePreset(id: string) {
    await persist({
      version: 1,
      presets: state.presets.filter((preset) => preset.id !== id)
    })
    setNotice({ message: "Preset removed.", tone: "success" })
  }

  async function reorderPreset(id: string, direction: -1 | 1) {
    await persist({
      version: 1,
      presets: movePreset(state.presets, id, direction)
    })
  }

  async function resetPresets() {
    await persist({
      version: 1,
      presets: restoreDefaultPresets(state.presets)
    })
    setNotice({
      message: "Built-in presets restored. Custom presets kept.",
      tone: "success"
    })
  }

  return (
    <PopupShell className="flex max-h-[580px] w-[420px] flex-col overflow-hidden p-0">
      <header className="dimension-grid border-b bg-card px-4 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <ExtensionBrand
            description="One-click browser sizes"
            iconSrc={iconUrl}
            name="Window Resizer"
            size="sm"
          />
          <CurrentSize size={currentSize} />
        </div>

        {notice ? (
          <div
            className={
              notice.tone === "success"
                ? "mt-3 flex items-center gap-2 rounded-md border border-brand-green/25 bg-brand-green/5 px-3 py-2 text-xs font-medium text-brand-green"
                : "mt-3 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
            }
            role="status">
            {notice.tone === "success" ? (
              <Check className="size-3.5 shrink-0" />
            ) : null}
            {notice.message}
          </div>
        ) : null}
      </header>

      <section
        aria-label="Window size presets"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Presets
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {state.presets.length} saved
          </span>
        </div>

        {state.presets.length ? (
          <div className="space-y-1.5">
            {state.presets.map((preset, index) => (
              <PresetRow
                busy={busyPresetId === preset.id}
                canMoveDown={index < state.presets.length - 1}
                canMoveUp={index > 0}
                key={preset.id}
                onApply={() => applyPreset(preset)}
                onDelete={() => deletePreset(preset.id)}
                onEdit={() =>
                  setEditor({ key: Date.now(), preset: { ...preset } })
                }
                onMoveDown={() => reorderPreset(preset.id, 1)}
                onMoveUp={() => reorderPreset(preset.id, -1)}
                preset={preset}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-card px-6 py-8 text-center">
            <p className="text-sm font-semibold">No presets saved</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add a custom browser size or restore the defaults.
            </p>
          </div>
        )}
      </section>

      <footer className="flex items-center gap-2 border-t bg-card px-3 py-3">
        <Button
          className="flex-1"
          onClick={() => setEditor({ key: Date.now() })}
          size="sm"
          type="button">
          <Plus data-icon="inline-start" />
          Add preset
        </Button>
        <Button
          aria-label="Restore default presets"
          onClick={resetPresets}
          size="icon"
          title="Restore default presets"
          type="button"
          variant="outline">
          <RotateCcw />
        </Button>
      </footer>

      <PresetEditor
        currentSize={currentSize}
        editor={editor}
        key={editor?.key ?? "closed"}
        onClose={() => setEditor(null)}
        onSave={savePreset}
      />
    </PopupShell>
  )
}

function CurrentSize({ size }: { size: WindowSize | null }) {
  return (
    <div className="rounded-md border bg-background px-2.5 py-1.5 text-right">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Current
      </div>
      <div className="text-xs font-bold tabular-nums">
        {size ? `${size.width} × ${size.height}` : "Reading…"}
      </div>
    </div>
  )
}

type PresetRowProps = {
  busy: boolean
  canMoveDown: boolean
  canMoveUp: boolean
  onApply(): void
  onDelete(): void
  onEdit(): void
  onMoveDown(): void
  onMoveUp(): void
  preset: WindowPreset
}

function PresetRow({
  busy,
  canMoveDown,
  canMoveUp,
  onApply,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
  preset
}: PresetRowProps) {
  const device = getPresetDevice(preset)
  const DeviceIcon = device.Icon

  return (
    <div className="group flex items-stretch overflow-hidden rounded-lg border bg-card transition-colors hover:border-brand-cyan/50">
      <button
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60"
        disabled={busy}
        onClick={onApply}
        type="button">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-glass text-brand-blue">
          <DeviceIcon className="size-[18px]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{preset.name}</div>
          <div className="mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {busy ? "Resizing…" : getPresetLabel(preset, device.label)}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="flex items-baseline gap-1">
          <span className="font-mono text-lg font-bold leading-none">
            {preset.width}
          </span>
          <span className="text-[10px] font-bold">×</span>
          <span className="font-mono text-sm font-bold leading-none">
            {preset.height}
          </span>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Manage ${preset.name}`}
            className="h-auto w-10 shrink-0 rounded-none border-l text-muted-foreground"
            size="icon"
            type="button"
            variant="ghost">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Edit3 />
            Edit preset
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canMoveUp} onSelect={onMoveUp}>
            <ArrowUp />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canMoveDown} onSelect={onMoveDown}>
            <ArrowDown />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type PresetEditorProps = {
  currentSize: WindowSize | null
  editor: EditorState | null
  onClose(): void
  onSave(preset: WindowPreset, resizeAfterSave: boolean): Promise<void>
}

function PresetEditor({
  currentSize,
  editor,
  onClose,
  onSave
}: PresetEditorProps) {
  const preset = editor?.preset
  const [name, setName] = useState(preset?.name ?? "Custom")
  const [width, setWidth] = useState(
    String(preset?.width ?? currentSize?.width ?? 1280)
  )
  const [height, setHeight] = useState(
    String(preset?.height ?? currentSize?.height ?? 800)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save(resizeAfterSave: boolean) {
    const normalizedWidth = Number(width)
    const normalizedHeight = Number(height)
    const normalizedName = name.trim()

    if (!normalizedName) {
      setError("Give this preset a name.")
      return
    }

    if (
      !isValidWindowSize(normalizedWidth) ||
      !isValidWindowSize(normalizedHeight)
    ) {
      setError(
        `Width and height must be whole numbers from ${MIN_WINDOW_SIZE} to ${MAX_WINDOW_SIZE}.`
      )
      return
    }

    setSaving(true)
    setError("")

    try {
      await onSave(
        {
          id: preset?.id ?? createPresetId(),
          name: normalizedName,
          width: normalizedWidth,
          height: normalizedHeight
        },
        resizeAfterSave
      )
    } catch {
      setError("The preset could not be saved.")
      setSaving(false)
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    void save(false)
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(editor)}>
      <DialogContent className="w-[388px] gap-5 p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle>{preset ? "Edit preset" : "Add preset"}</DialogTitle>
          <DialogDescription>
            Sizes apply to the complete Chrome window, including its frame.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="preset-name">Name</Label>
            <Input
              autoFocus
              id="preset-name"
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="preset-width">Width</Label>
              <Input
                id="preset-width"
                inputMode="numeric"
                max={MAX_WINDOW_SIZE}
                min={MIN_WINDOW_SIZE}
                onChange={(event) => setWidth(event.target.value)}
                type="number"
                value={width}
              />
            </div>
            <span className="pb-2 text-sm font-bold text-muted-foreground">
              ×
            </span>
            <div className="space-y-2">
              <Label htmlFor="preset-height">Height</Label>
              <Input
                id="preset-height"
                inputMode="numeric"
                max={MAX_WINDOW_SIZE}
                min={MIN_WINDOW_SIZE}
                onChange={(event) => setHeight(event.target.value)}
                type="number"
                value={height}
              />
            </div>
          </div>

          {error ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="flex-row justify-end space-x-2">
            <Button
              disabled={saving}
              onClick={onClose}
              size="sm"
              type="button"
              variant="ghost">
              Cancel
            </Button>
            <Button disabled={saving} size="sm" type="submit" variant="outline">
              {saving ? "Saving…" : preset ? "Save changes" : "Add preset"}
            </Button>
            <Button
              disabled={saving}
              onClick={() => void save(true)}
              size="sm"
              type="button">
              {saving ? "Saving…" : "Save & resize"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function getPresetDevice(preset: WindowPreset) {
  if (preset.width <= 480) {
    return { Icon: Smartphone, label: "Phone" }
  }

  if (Math.min(preset.width, preset.height) <= 820) {
    return { Icon: Tablet, label: "Tablet" }
  }

  return { Icon: Laptop, label: "Computer" }
}

function getPresetLabel(preset: WindowPreset, device: string) {
  const orientation = preset.width > preset.height ? "landscape" : "portrait"

  return `${device} · ${orientation}`
}

export default IndexPopup
