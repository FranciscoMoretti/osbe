import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleAlert,
  Edit3,
  Maximize2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  ScanLine,
  Trash2
} from "lucide-react"
import * as React from "react"
import { useEffect, useState } from "react"

import "~style.css"

import { Alert, AlertDescription } from "@osbe/ui/components/alert"
import { Badge } from "@osbe/ui/components/badge"
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@osbe/ui/components/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@osbe/ui/components/empty"
import { ExtensionBrand } from "@osbe/ui/components/extension-brand"
import { PopupShell } from "@osbe/ui/components/extension-shell"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from "@osbe/ui/components/field"
import { Input } from "@osbe/ui/components/input"
import { Separator } from "@osbe/ui/components/separator"
import { Spinner } from "@osbe/ui/components/spinner"
import { cn } from "@osbe/ui/lib/utils"
import iconUrl from "data-base64:../assets/icon.png"

import {
  createDefaultState,
  createPresetId,
  isValidResizeSize,
  MAX_RESIZE_SIZE,
  MIN_RESIZE_SIZE,
  movePreset,
  restoreDefaultPresets,
  type PresetState,
  type ResizePreset,
  type ResizeTarget
} from "~/lib/presets"
import {
  readPresetState,
  subscribeToPresetChanges,
  writePresetState
} from "~/lib/storage"
import {
  readCurrentWindowMetrics,
  resizeCurrentWindow,
  type WindowMetrics
} from "~/lib/windows"

type EditorState = {
  key: number
  preset?: ResizePreset
}

type Notice = {
  message: string
  tone: "error" | "success"
}

function IndexPopup() {
  const [state, setState] = useState<PresetState>(createDefaultState())
  const [currentMetrics, setCurrentMetrics] = useState<WindowMetrics | null>(
    null
  )
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busyPresetId, setBusyPresetId] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([readPresetState().then(setState), refreshCurrentSize()])

    return subscribeToPresetChanges(() => {
      readPresetState().then(setState)
    })
  }, [])

  async function refreshCurrentSize() {
    try {
      setCurrentMetrics(await readCurrentWindowMetrics())
    } catch {
      setCurrentMetrics(null)
    }
  }

  async function persist(nextState: PresetState) {
    const savedState = await writePresetState(nextState)
    setState(savedState)
  }

  async function applyPreset(preset: ResizePreset) {
    setBusyPresetId(preset.id)
    setNotice(null)

    try {
      const nextMetrics = await resizeCurrentWindow(preset)
      setCurrentMetrics(nextMetrics)
      setNotice({
        message: `${getResizeTargetName(preset.target)} resized to ${preset.width} × ${preset.height}.`,
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
    nextPreset: ResizePreset,
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
      return
    }

    setNotice({
      message: editing ? "Preset updated." : "Custom preset added.",
      tone: "success"
    })
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
    <PopupShell className="flex h-[580px] w-[420px] flex-col overflow-hidden p-0">
      <header className="instrument-header shrink-0 bg-card px-4 pb-4 pt-4">
        <ExtensionBrand
          description="Calibrated browser frames"
          iconSrc={iconUrl}
          name="Window Resizer"
          size="sm"
        />
        <CurrentWindowPanel metrics={currentMetrics} />
        <div aria-hidden="true" className="ruler-edge" />
      </header>

      {notice ? (
        <Alert
          className="mx-3 mt-3"
          role="status"
          variant={notice.tone === "error" ? "destructive" : "success"}>
          {notice.tone === "error" ? <CircleAlert /> : <CheckCircle2 />}
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="Window size presets"
        className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-3">
          <div>
            <h2 className="instrument-eyebrow">Size presets</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select a frame to apply it
            </p>
          </div>
          <span className="instrument-count">
            {String(state.presets.length).padStart(2, "0")}
          </span>
        </div>

        {state.presets.length ? (
          <div className="mx-3 overflow-hidden rounded-lg border bg-card">
            {state.presets.map((preset, index) => (
              <PresetRow
                busy={busyPresetId === preset.id}
                canMoveDown={index < state.presets.length - 1}
                canMoveUp={index > 0}
                index={index}
                isCurrent={
                  currentMetrics?.[preset.target]?.width === preset.width &&
                  currentMetrics[preset.target]?.height === preset.height
                }
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
          <Empty className="mx-3 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Maximize2 />
              </EmptyMedia>
              <EmptyTitle>No presets saved</EmptyTitle>
              <EmptyDescription>
                Create a custom browser frame or restore the built-ins.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      <footer className="shrink-0 bg-card">
        <Separator />
        <div className="flex items-center gap-2 px-3 py-3">
          <Button
            className="flex-1"
            onClick={() => setEditor({ key: Date.now() })}
            size="sm"
            type="button">
            <Plus data-icon="inline-start" />
            New custom size
          </Button>
          <Button
            aria-label="Restore built-in presets"
            onClick={resetPresets}
            size="icon"
            title="Restore built-in presets"
            type="button"
            variant="outline">
            <RotateCcw />
          </Button>
        </div>
      </footer>

      <PresetEditor
        currentMetrics={currentMetrics}
        editor={editor}
        key={editor?.key ?? "closed"}
        onClose={() => setEditor(null)}
        onSave={savePreset}
      />
    </PopupShell>
  )
}

function CurrentWindowPanel({ metrics }: { metrics: WindowMetrics | null }) {
  const width = metrics?.window.width ?? 16
  const height = metrics?.window.height ?? 10

  return (
    <div className="instrument-display mt-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-primary-foreground/65">
          <ScanLine className="size-3.5" />
          <span className="instrument-label">Current outer frame</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2 text-primary-foreground">
          {metrics ? (
            <>
              <span className="instrument-value">{metrics.window.width}</span>
              <span className="instrument-multiply">×</span>
              <span className="instrument-value">{metrics.window.height}</span>
              <span className="instrument-unit">px</span>
            </>
          ) : (
            <span className="instrument-loading">Reading window…</span>
          )}
        </div>
        {metrics?.viewport ? (
          <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-foreground/55">
            Viewport {metrics.viewport.width} × {metrics.viewport.height}
          </div>
        ) : null}
      </div>
      <ViewportGlyph height={height} inverse width={width} />
    </div>
  )
}

type PresetRowProps = {
  busy: boolean
  canMoveDown: boolean
  canMoveUp: boolean
  index: number
  isCurrent: boolean
  onApply(): void
  onDelete(): void
  onEdit(): void
  onMoveDown(): void
  onMoveUp(): void
  preset: ResizePreset
}

function PresetRow({
  busy,
  canMoveDown,
  canMoveUp,
  index,
  isCurrent,
  onApply,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
  preset
}: PresetRowProps) {
  const rowStyle = {
    animationDelay: `${index * 18 + 35}ms`
  }

  return (
    <div
      className={cn(
        "preset-row group relative flex items-stretch",
        index > 0 && "border-t",
        isCurrent && "bg-accent"
      )}
      style={rowStyle}>
      <button
        aria-current={isCurrent ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60"
        disabled={busy}
        onClick={onApply}
        type="button">
        <span aria-hidden="true" className="preset-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <ViewportGlyph
          active={isCurrent}
          height={preset.height}
          width={preset.width}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{preset.name}</div>
          <div className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {busy ? "Resizing…" : getPresetLabel(preset)}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div aria-hidden="true" className="preset-dimensions">
            <span>{preset.width}</span>
            <span className="preset-dimension-mark">×</span>
            <span>{preset.height}</span>
          </div>
          {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Manage ${preset.name}`}
            className="h-auto w-10 shrink-0 rounded-none border-l"
            size="icon"
            type="button"
            variant="ghost">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
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
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type ViewportGlyphProps = {
  active?: boolean
  height: number
  inverse?: boolean
  width: number
}

function ViewportGlyph({
  active = false,
  height,
  inverse = false,
  width
}: ViewportGlyphProps) {
  const glyphSize = getViewportGlyphSize(width, height)

  return (
    <div
      aria-hidden="true"
      className={cn(
        "viewport-glyph",
        active && "viewport-glyph-active",
        inverse && "viewport-glyph-inverse"
      )}>
      <div className="viewport-glyph-frame" style={glyphSize}>
        <span />
      </div>
    </div>
  )
}

type PresetEditorProps = {
  currentMetrics: WindowMetrics | null
  editor: EditorState | null
  onClose(): void
  onSave(preset: ResizePreset, resizeAfterSave: boolean): Promise<void>
}

function PresetEditor({
  currentMetrics,
  editor,
  onClose,
  onSave
}: PresetEditorProps) {
  const preset = editor?.preset
  const [target, setTarget] = useState<ResizeTarget>(preset?.target ?? "window")
  const [name, setName] = useState(preset?.name ?? "Custom")
  const [width, setWidth] = useState(
    String(preset?.width ?? currentMetrics?.window.width ?? 1280)
  )
  const [height, setHeight] = useState(
    String(preset?.height ?? currentMetrics?.window.height ?? 800)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{
    field: "dimensions" | "name" | "save"
    message: string
  } | null>(null)
  const previewWidth = Number(width) || 16
  const previewHeight = Number(height) || 10

  async function save(resizeAfterSave: boolean) {
    const normalizedWidth = Number(width)
    const normalizedHeight = Number(height)
    const normalizedName = name.trim()

    if (!normalizedName) {
      setError({ field: "name", message: "Give this preset a name." })
      return
    }

    if (
      !isValidResizeSize(normalizedWidth) ||
      !isValidResizeSize(normalizedHeight)
    ) {
      setError({
        field: "dimensions",
        message: `Width and height must be whole numbers from ${MIN_RESIZE_SIZE} to ${MAX_RESIZE_SIZE}.`
      })
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(
        {
          id: preset?.id ?? createPresetId(),
          name: normalizedName,
          width: normalizedWidth,
          height: normalizedHeight,
          target
        },
        resizeAfterSave
      )
    } catch {
      setError({
        field: "save",
        message: "The preset could not be saved."
      })
      setSaving(false)
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    void save(false)
  }

  function selectTarget(nextTarget: ResizeTarget) {
    setTarget(nextTarget)

    const currentTargetSize = currentMetrics?.[nextTarget]

    if (!preset && currentTargetSize) {
      setWidth(String(currentTargetSize.width))
      setHeight(String(currentTargetSize.height))
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(editor)}>
      <DialogContent className="w-[396px] gap-0 overflow-hidden p-0">
        <div className="p-5 pb-4">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle>
              {preset ? "Edit custom size" : "New custom size"}
            </DialogTitle>
            <DialogDescription>
              Choose whether the dimensions apply to the browser window or the
              page viewport.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="dialog-measurement mx-5">
          <div>
            <div className="instrument-label">
              {getResizeTargetName(target)} preview
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="dialog-measurement-value">{width || "—"}</span>
              <span className="instrument-multiply">×</span>
              <span className="dialog-measurement-value">{height || "—"}</span>
            </div>
          </div>
          <ViewportGlyph height={previewHeight} inverse width={previewWidth} />
        </div>

        <form className="flex flex-col gap-5 p-5" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={error?.field === "name"}>
              <FieldLabel htmlFor="preset-name">Preset name</FieldLabel>
              <Input
                aria-invalid={error?.field === "name"}
                autoFocus
                id="preset-name"
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </Field>

            <FieldSet className="gap-0">
              <FieldLegend variant="label">Resize target</FieldLegend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                <ResizeTargetOption
                  checked={target === "window"}
                  description="Outer frame"
                  label="Window"
                  onChange={() => selectTarget("window")}
                  value="window"
                />
                <ResizeTargetOption
                  checked={target === "viewport"}
                  description="Page area"
                  label="Viewport"
                  onChange={() => selectTarget("viewport")}
                  value="viewport"
                />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="sr-only">
                {getResizeTargetName(target)} dimensions
              </FieldLegend>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <Field data-invalid={error?.field === "dimensions"}>
                  <FieldLabel htmlFor="preset-width">Width</FieldLabel>
                  <Input
                    aria-invalid={error?.field === "dimensions"}
                    id="preset-width"
                    inputMode="numeric"
                    max={MAX_RESIZE_SIZE}
                    min={MIN_RESIZE_SIZE}
                    onChange={(event) => setWidth(event.target.value)}
                    type="number"
                    value={width}
                  />
                </Field>
                <span className="pb-2 text-sm font-bold text-muted-foreground">
                  ×
                </span>
                <Field data-invalid={error?.field === "dimensions"}>
                  <FieldLabel htmlFor="preset-height">Height</FieldLabel>
                  <Input
                    aria-invalid={error?.field === "dimensions"}
                    id="preset-height"
                    inputMode="numeric"
                    max={MAX_RESIZE_SIZE}
                    min={MIN_RESIZE_SIZE}
                    onChange={(event) => setHeight(event.target.value)}
                    type="number"
                    value={height}
                  />
                </Field>
              </div>
            </FieldSet>
          </FieldGroup>

          <FieldError>{error?.message}</FieldError>

          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              disabled={saving}
              onClick={onClose}
              size="sm"
              type="button"
              variant="ghost">
              Cancel
            </Button>
            <Button disabled={saving} size="sm" type="submit" variant="outline">
              {saving ? <Spinner data-icon="inline-start" /> : null}
              {preset ? "Save" : "Add"}
            </Button>
            <Button
              disabled={saving}
              onClick={() => void save(true)}
              size="sm"
              type="button">
              {saving ? <Spinner data-icon="inline-start" /> : null}
              Save & resize
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type ResizeTargetOptionProps = {
  checked: boolean
  description: string
  label: string
  onChange(): void
  value: ResizeTarget
}

function ResizeTargetOption({
  checked,
  description,
  label,
  onChange,
  value
}: ResizeTargetOptionProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors",
        checked
          ? "border-brand-blue bg-accent text-accent-foreground"
          : "bg-card hover:bg-muted/60"
      )}>
      <input
        checked={checked}
        className="sr-only"
        name="resize-target"
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 items-center justify-center rounded-full border",
          checked ? "border-brand-blue" : "border-muted-foreground/50"
        )}>
        {checked ? (
          <span className="size-2 rounded-full bg-brand-blue" />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold">{label}</span>
        <span className="block text-[10px] text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}

function getPresetLabel(preset: ResizePreset) {
  const orientation = preset.width > preset.height ? "landscape" : "portrait"
  return `${getResizeTargetName(preset.target)} · ${orientation}`
}

function getResizeTargetName(target: ResizeTarget) {
  return target === "viewport" ? "Viewport" : "Window"
}

function getViewportGlyphSize(width: number, height: number) {
  const ratio = Math.max(0.25, Math.min(4, width / height))

  if (ratio >= 1) {
    return {
      height: `${Math.max(12, Math.round(28 / ratio))}px`,
      width: "28px"
    }
  }

  return {
    height: "26px",
    width: `${Math.max(11, Math.round(26 * ratio))}px`
  }
}

export default IndexPopup
