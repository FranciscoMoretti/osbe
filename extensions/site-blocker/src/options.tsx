import {
  Ban,
  Check,
  Clock3,
  FileDown,
  FileUp,
  Globe2,
  MoreVertical,
  PauseCircle,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react"
import * as React from "react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react"

import "~style.css"

import { Alert, AlertDescription, AlertTitle } from "@osbe/ui/components/alert"
import { Button } from "@osbe/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@osbe/ui/components/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@osbe/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@osbe/ui/components/dropdown-menu"
import { Input } from "@osbe/ui/components/input"
import { Label } from "@osbe/ui/components/label"
import { Switch } from "@osbe/ui/components/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@osbe/ui/components/tooltip"
import { cn } from "@osbe/ui/lib/utils"
import iconUrl from "data-base64:../assets/icon.png"

import {
  clearExpiredOverrides,
  createDirectFaviconUrls,
  createFaviconPageUrls,
  isRuleBlocking,
  isRuleOverridden,
  normalizeDomain,
  validateDomain
} from "~/lib/matcher"
import { readState, subscribeToStateChanges, writeState } from "~/lib/storage"
import type { AppState, BlockRule } from "~/lib/types"
import {
  DEFAULT_STATE,
  GET_BLOCKING_RULES_STATUS_MESSAGE,
  REFRESH_BLOCKING_RULES_MESSAGE,
  type BlockingRulesStatus,
  type ExtensionMessageResponse
} from "~/lib/types"
import { createId } from "~/lib/utils"

const OVERRIDE_MINUTES = [5, 10, 15, 30]

function OptionsPage() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [temporaryAccessRuleId, setTemporaryAccessRuleId] = useState<
    string | null
  >(null)
  const [domain, setDomain] = useState("")
  const [error, setError] = useState("")
  const [blockingRulesStatus, setBlockingRulesStatus] =
    useState<BlockingRulesStatus | null>(null)
  const [blockingRulesError, setBlockingRulesError] = useState("")
  const importInputRef = useRef<HTMLInputElement>(null)

  const activeRules = useMemo(
    () => state.rules.filter((rule) => isRuleBlocking(rule)),
    [state.rules]
  )
  const overriddenRules = useMemo(
    () => state.rules.filter((rule) => rule.enabled && isRuleOverridden(rule)),
    [state.rules]
  )
  const disabledRules = useMemo(
    () => state.rules.filter((rule) => !rule.enabled),
    [state.rules]
  )
  const addPreviewDomain = useMemo(() => {
    const normalizedDomain = normalizeDomain(domain)
    return validateDomain(normalizedDomain) ? null : normalizedDomain
  }, [domain])
  const temporaryAccessRule = useMemo(
    () => state.rules.find((rule) => rule.id === temporaryAccessRuleId) || null,
    [state.rules, temporaryAccessRuleId]
  )
  const expectedDynamicRuleCount = state.settings.paused
    ? 0
    : activeRules.length
  const dynamicRuleCount = blockingRulesStatus?.dynamicRuleCount
  const matchTest = blockingRulesStatus?.matchTest
  const blockingRulesMismatch =
    loaded &&
    typeof dynamicRuleCount === "number" &&
    dynamicRuleCount !== expectedDynamicRuleCount
  const blockingMatchMismatch =
    loaded &&
    expectedDynamicRuleCount > 0 &&
    matchTest?.supported === true &&
    !matchTest.error &&
    matchTest.matchedRuleIds.length === 0
  const diagnosticsNeedAttention =
    blockingRulesMismatch ||
    blockingMatchMismatch ||
    Boolean(matchTest?.error) ||
    Boolean(blockingRulesError)

  useEffect(() => {
    let mounted = true

    readState().then((nextState) => {
      if (!mounted) {
        return
      }

      const cleaned = clearExpiredOverrides(nextState.rules)
      setState({ ...nextState, rules: cleaned.rules })
      setLoaded(true)
      refreshBlockingRulesStatus(true)
    })

    const unsubscribe = subscribeToStateChanges(() => {
      readState().then((nextState) => {
        setState(nextState)
        refreshBlockingRulesStatus(false)
      })
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  async function commitState(nextState: AppState) {
    setState(nextState)
    await writeState(nextState)
    await refreshBlockingRulesStatus(false)
  }

  async function refreshBlockingRulesStatus(forceRefresh: boolean) {
    const message = {
      type: forceRefresh
        ? REFRESH_BLOCKING_RULES_MESSAGE
        : GET_BLOCKING_RULES_STATUS_MESSAGE
    }

    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      setBlockingRulesStatus(null)
      setBlockingRulesError("")
      return
    }

    try {
      const response = await chrome.runtime.sendMessage<
        typeof message,
        ExtensionMessageResponse<BlockingRulesStatus>
      >(message)

      if (response?.ok === false) {
        setBlockingRulesStatus(null)
        setBlockingRulesError(response.error)
        return
      }

      setBlockingRulesStatus(response?.data || null)
      setBlockingRulesError("")
    } catch (error) {
      setBlockingRulesStatus(null)
      setBlockingRulesError(
        error instanceof Error
          ? error.message
          : "Could not inspect Chrome blocking rules."
      )
    }
  }

  async function addRule(event: FormEvent) {
    event.preventDefault()

    const normalizedDomain = normalizeDomain(domain)
    const validationError = validateDomain(normalizedDomain)

    if (validationError) {
      setError(validationError)
      return
    }

    if (state.rules.some((rule) => rule.domain === normalizedDomain)) {
      setError(`${normalizedDomain} is already in the block list.`)
      return
    }

    const now = Date.now()
    const nextRule: BlockRule = {
      id: createId(),
      domain: normalizedDomain,
      enabled: true,
      createdAt: now
    }

    await commitState({
      ...state,
      rules: [nextRule, ...state.rules]
    })

    setDomain("")
    setError("")
    setAddDialogOpen(false)
  }

  async function updateRule(ruleId: string, patch: Partial<BlockRule>) {
    await commitState({
      ...state,
      rules: state.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule
      )
    })
  }

  async function deleteRule(ruleId: string) {
    if (temporaryAccessRuleId === ruleId) {
      setTemporaryAccessRuleId(null)
    }
    await commitState({
      ...state,
      rules: state.rules.filter((rule) => rule.id !== ruleId)
    })
  }

  async function setBlockingEnabled(enabled: boolean) {
    await commitState({
      ...state,
      settings: {
        ...state.settings,
        paused: !enabled
      }
    })
  }

  async function grantTemporaryAccess(rule: BlockRule, minutes: number) {
    await updateRule(rule.id, {
      overrideUntil: Date.now() + minutes * 60000
    })
    setTemporaryAccessRuleId(null)
  }

  async function endTemporaryAccess(rule: BlockRule) {
    const { overrideUntil: _overrideUntil, ...nextRule } = rule

    await commitState({
      ...state,
      rules: state.rules.map((currentRule) =>
        currentRule.id === rule.id ? nextRule : currentRule
      )
    })
  }

  function openTemporaryAccess(ruleId: string) {
    setTemporaryAccessRuleId(ruleId)
  }

  function exportRules() {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        rules: state.rules
      },
      null,
      2
    )
    const url = URL.createObjectURL(
      new Blob([payload], { type: "application/json" })
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "osbe-site-blocker-rules.json"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function importRules(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]

    if (!file) {
      return
    }

    try {
      const payload = JSON.parse(await file.text()) as { rules?: unknown[] }
      const importedRules = Array.isArray(payload.rules) ? payload.rules : []
      const usedIds = new Set(state.rules.map((rule) => rule.id))
      const usedDomains = new Set(state.rules.map((rule) => rule.domain))
      const validRules = importedRules.flatMap((rule) => {
        if (typeof rule !== "object" || !rule) {
          return []
        }

        const candidate = rule as Partial<BlockRule> & { pattern?: unknown }
        const legacyPattern =
          typeof candidate.pattern === "string" ? candidate.pattern : ""
        const normalizedDomain = normalizeDomain(
          typeof candidate.domain === "string"
            ? candidate.domain
            : legacyPattern
        )

        if (
          validateDomain(normalizedDomain) ||
          usedDomains.has(normalizedDomain)
        ) {
          return []
        }

        const id =
          typeof candidate.id === "string" && !usedIds.has(candidate.id)
            ? candidate.id
            : createId()
        usedIds.add(id)
        usedDomains.add(normalizedDomain)

        return [
          {
            id,
            domain: normalizedDomain,
            enabled: candidate.enabled !== false,
            overrideUntil:
              typeof candidate.overrideUntil === "number"
                ? candidate.overrideUntil
                : undefined,
            createdAt:
              typeof candidate.createdAt === "number"
                ? candidate.createdAt
                : Date.now()
          }
        ]
      })

      if (validRules.length === 0) {
        setError("Choose a JSON export with at least one valid block rule.")
        return
      }

      await commitState({
        ...state,
        rules: [...validRules, ...state.rules]
      })
      setError("")
    } catch {
      setError("Could not read that JSON file.")
    } finally {
      event.currentTarget.value = ""
    }
  }

  return (
    <TooltipProvider>
      <main className="osbe-shell">
        <header className="osbe-app-header">
          <div className="osbe-app-header-inner">
            <div className="osbe-brand">
              <div className="osbe-brand-icon">
                <img alt="" aria-hidden="true" src={iconUrl} />
              </div>
              <div className="min-w-0">
                <h1 className="osbe-brand-name">Site Blocker</h1>
                <p className="osbe-brand-kicker">OSBE local extension</p>
              </div>
            </div>
          </div>
        </header>

        <div className="osbe-dashboard">
          <section className="osbe-workspace" id="block-list">
            <header className="osbe-page-head">
              <div>
                <h2 className="osbe-page-title">Block List</h2>
                <p className="osbe-page-copy">
                  Block sites permanently, pause all blocking, or grant short
                  access from this dashboard.
                </p>
              </div>
            </header>

            <section className="osbe-metrics" aria-label="Block list status">
              <MetricCard label="Sites in list" value={state.rules.length} />
              <MetricCard
                label="Blocking now"
                value={state.settings.paused ? 0 : activeRules.length}
              />
              <MetricCard
                label="Temporary access"
                value={overriddenRules.length}
              />
              <MetricCard label="Not included" value={disabledRules.length} />
            </section>

            <Card className="osbe-list-card">
              <label
                className="osbe-global-rail"
                data-state={state.settings.paused ? "paused" : "active"}
                id="settings">
                <span className="osbe-global-icon">
                  {state.settings.paused ? (
                    <PauseCircle data-icon="inline-start" />
                  ) : (
                    <ShieldCheck data-icon="inline-start" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="osbe-global-title">Global blocking</span>
                  <span className="osbe-global-copy">
                    {state.settings.paused
                      ? `All blocking paused · ${state.rules.length} site setting${state.rules.length === 1 ? "" : "s"} preserved`
                      : `${activeRules.length} of ${state.rules.length} site${state.rules.length === 1 ? "" : "s"} currently blocking`}
                  </span>
                </span>
                <Switch
                  aria-label="Global blocking"
                  checked={!state.settings.paused}
                  onCheckedChange={setBlockingEnabled}
                />
              </label>
              <CardHeader className="osbe-list-header">
                <div>
                  <CardTitle>Blocked Items</CardTitle>
                  <CardDescription>
                    Manage domains, temporary access, and per-site controls.
                  </CardDescription>
                </div>
                <div className="osbe-list-actions">
                  <Dialog
                    open={addDialogOpen}
                    onOpenChange={(open) => {
                      setAddDialogOpen(open)
                      if (!open) {
                        setError("")
                      }
                    }}>
                    <DialogTrigger asChild>
                      <Button type="button">
                        <Plus data-icon="inline-start" />
                        Add to Block List
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add blocked site</DialogTitle>
                        <DialogDescription>
                          Block this website, every page on it, and its
                          subdomains.
                        </DialogDescription>
                      </DialogHeader>
                      <form className="osbe-dialog-form" onSubmit={addRule}>
                        <div className="osbe-field">
                          <Label htmlFor="new-rule-domain">Website</Label>
                          <div className="osbe-domain-input-shell">
                            <SiteIcon domain={addPreviewDomain || ""} />
                            <Input
                              autoFocus
                              id="new-rule-domain"
                              onChange={(event) =>
                                setDomain(event.currentTarget.value)
                              }
                              placeholder="x.com"
                              value={domain}
                            />
                          </div>
                        </div>
                        {error ? (
                          <Alert variant="destructive">
                            <AlertTitle>Could not add rule</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        ) : null}
                        <DialogFooter>
                          <Button type="submit">
                            <Plus data-icon="inline-start" />
                            Add site
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button
                    disabled={state.rules.length === 0}
                    onClick={exportRules}
                    type="button"
                    variant="secondary">
                    <FileDown data-icon="inline-start" />
                    Export
                  </Button>
                  <Button
                    onClick={() => importInputRef.current?.click()}
                    type="button"
                    variant="secondary">
                    <FileUp data-icon="inline-start" />
                    Import
                  </Button>
                  <input
                    accept="application/json"
                    className="sr-only"
                    onChange={importRules}
                    ref={importInputRef}
                    type="file"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {state.rules.length === 0 ? (
                  <div className="osbe-empty-state">
                    <Ban data-icon="inline-start" />
                    <h3>No blocked items yet</h3>
                    <p>
                      Add a website such as x.com or mail.google.com to start
                      blocking.
                    </p>
                  </div>
                ) : (
                  <div className="osbe-rule-list">
                    {state.rules.map((rule) => {
                      const overridden = isRuleOverridden(rule)
                      const blocking = isRuleBlocking(rule)

                      return (
                        <RuleRow
                          blocking={blocking}
                          key={rule.id}
                          onDelete={deleteRule}
                          onEndTemporaryAccess={endTemporaryAccess}
                          onOpenTemporaryAccess={openTemporaryAccess}
                          onUpdate={updateRule}
                          overridden={overridden}
                          paused={state.settings.paused}
                          rule={rule}
                          rules={state.rules}
                        />
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <section className="osbe-about-section" id="about">
              <div className="osbe-about-copy">
                <Shield data-icon="inline-start" />
                <div>
                  <h2>Private by design</h2>
                  <p>
                    No account, upgrade, or remote sync. Rules stay in browser
                    storage.
                  </p>
                </div>
              </div>
              <details className="osbe-diagnostics">
                <summary>
                  Diagnostics
                  {diagnosticsNeedAttention ? (
                    <span className="osbe-diagnostic-warning">
                      Needs attention
                    </span>
                  ) : null}
                </summary>
                <dl>
                  <div>
                    <dt>Chrome rules</dt>
                    <dd>
                      {typeof dynamicRuleCount === "number"
                        ? dynamicRuleCount
                        : loaded
                          ? "Unknown"
                          : "Loading"}
                    </dd>
                  </div>
                  <div>
                    <dt>Match test</dt>
                    <dd>
                      {getMatchTestLabel(matchTest, expectedDynamicRuleCount)}
                    </dd>
                  </div>
                </dl>
                {blockingRulesError || matchTest?.error ? (
                  <p className="osbe-diagnostic-error">
                    {blockingRulesError || matchTest?.error}
                  </p>
                ) : blockingRulesMismatch || blockingMatchMismatch ? (
                  <p className="osbe-diagnostic-error">
                    Chrome rules do not match the current block list. Reload the
                    unpacked extension.
                  </p>
                ) : null}
              </details>
            </section>
          </section>
        </div>

        <TemporaryAccessDialog
          onConfirm={grantTemporaryAccess}
          onOpenChange={(open) => {
            if (!open) {
              setTemporaryAccessRuleId(null)
            }
          }}
          open={Boolean(temporaryAccessRule)}
          rule={temporaryAccessRule}
        />
      </main>
    </TooltipProvider>
  )
}

function MetricCard({
  label,
  value
}: {
  label: string
  value: number | string
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="osbe-metric-value">{value}</p>
      </CardContent>
    </Card>
  )
}

function TemporaryAccessDialog({
  onConfirm,
  onOpenChange,
  open,
  rule
}: {
  onConfirm: (rule: BlockRule, minutes: number) => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  rule: BlockRule | null
}) {
  const [minutes, setMinutes] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setMinutes(suggestTemporaryAccessMinutes(rule?.overrideUntil))
  }, [open, rule?.id, rule?.overrideUntil])

  if (!rule) {
    return null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)

    try {
      await onConfirm(rule, minutes)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="osbe-temporary-dialog"
        style={{
          maxWidth: "440px",
          width: "min(calc(100vw - 2rem), 440px)"
        }}>
        <div className="osbe-temporary-heading">
          <span className="osbe-temporary-heading-icon" aria-hidden="true">
            <Clock3 />
          </span>
          <DialogHeader>
            <DialogTitle>
              {isRuleOverridden(rule)
                ? "Change temporary access"
                : "Set temporary access"}
            </DialogTitle>
            <DialogDescription>
              Allow access to <strong>{rule.domain}</strong>. Blocking resumes
              automatically when the timer ends.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form className="osbe-dialog-form" onSubmit={handleSubmit}>
          <fieldset className="osbe-duration-fieldset">
            <legend>Duration</legend>
            <div className="osbe-duration-grid">
              {OVERRIDE_MINUTES.map((option) => (
                <button
                  aria-pressed={minutes === option}
                  className="osbe-duration-option"
                  data-selected={minutes === option}
                  key={option}
                  onClick={() => setMinutes(option)}
                  type="button">
                  <Check className="osbe-duration-check" aria-hidden="true" />
                  <span className="osbe-duration-value">{option}</span>
                  <span className="osbe-duration-unit">min</span>
                </button>
              ))}
            </div>
          </fieldset>
          <DialogFooter className="osbe-temporary-footer gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button disabled={submitting} type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={submitting} type="submit">
              <Clock3 data-icon="inline-start" />
              {submitting ? "Saving..." : "Allow access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TemporaryAccessStatus({
  onDismiss,
  rule
}: {
  onDismiss: (rule: BlockRule) => Promise<void>
  rule: BlockRule
}) {
  const [now, setNow] = useState(Date.now())
  const expiredRef = useRef(false)
  const remaining = Math.max(0, (rule.overrideUntil || 0) - now)

  useEffect(() => {
    expiredRef.current = false
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [rule.overrideUntil])

  useEffect(() => {
    if (remaining > 0 || expiredRef.current) {
      return
    }

    expiredRef.current = true
    void onDismiss(rule)
  }, [onDismiss, remaining, rule])

  return (
    <span
      aria-label={`Temporary access, ${formatCountdown(remaining)} remaining`}
      className="osbe-temporary-status">
      <Clock3 data-icon="inline-start" />
      <span className="osbe-temporary-copy">
        Temporary access
        <span aria-hidden="true">·</span>
        <span className="osbe-countdown">{formatCountdown(remaining)}</span>
      </span>
      <button
        aria-label={`End temporary access for ${rule.domain}`}
        className="osbe-temporary-dismiss"
        onClick={() => onDismiss(rule)}
        title="End temporary access"
        type="button">
        <X />
      </button>
    </span>
  )
}

function suggestTemporaryAccessMinutes(overrideUntil?: number) {
  if (!overrideUntil || overrideUntil <= Date.now()) {
    return 10
  }

  const remainingMinutes = Math.ceil((overrideUntil - Date.now()) / 60000)
  return (
    OVERRIDE_MINUTES.find((minutes) => minutes >= remainingMinutes) ||
    OVERRIDE_MINUTES[OVERRIDE_MINUTES.length - 1]
  )
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function RuleRow({
  blocking,
  onDelete,
  onEndTemporaryAccess,
  onOpenTemporaryAccess,
  onUpdate,
  overridden,
  paused,
  rule,
  rules
}: {
  blocking: boolean
  onDelete: (ruleId: string) => Promise<void>
  onEndTemporaryAccess: (rule: BlockRule) => Promise<void>
  onOpenTemporaryAccess: (ruleId: string) => void
  onUpdate: (ruleId: string, patch: Partial<BlockRule>) => Promise<void>
  overridden: boolean
  paused: boolean
  rule: BlockRule
  rules: BlockRule[]
}) {
  return (
    <article
      className={cn("osbe-rule-row", (!blocking || paused) && "is-muted")}>
      <SiteIcon domain={rule.domain} />
      <div className="min-w-0 flex-1">
        <div className="osbe-rule-summary">
          <span className="osbe-rule-title">
            <span className="osbe-rule-label">{rule.domain}</span>
          </span>
          {overridden ? (
            <TemporaryAccessStatus
              onDismiss={onEndTemporaryAccess}
              rule={rule}
            />
          ) : (
            <RuleEffectiveStatus paused={paused} rule={rule} rules={rules} />
          )}
        </div>
      </div>

      <div className="osbe-row-controls">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Label className="sr-only" htmlFor={`enabled-${rule.id}`}>
                {rule.enabled ? "Stop blocking" : "Block"} {rule.domain}
              </Label>
              <Switch
                checked={rule.enabled}
                id={`enabled-${rule.id}`}
                onCheckedChange={(enabled) =>
                  onUpdate(rule.id, {
                    enabled,
                    overrideUntil: enabled ? rule.overrideUntil : undefined
                  })
                }
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {rule.enabled
              ? "Stop blocking this site"
              : "Block this site when global blocking is on"}
          </TooltipContent>
        </Tooltip>

        <RuleActionsMenu
          onDelete={onDelete}
          onEndTemporaryAccess={onEndTemporaryAccess}
          onOpenTemporaryAccess={onOpenTemporaryAccess}
          overridden={overridden}
          rule={rule}
        />
      </div>
    </article>
  )
}

function RuleActionsMenu({
  onDelete,
  onEndTemporaryAccess,
  onOpenTemporaryAccess,
  overridden,
  rule
}: {
  onDelete: (ruleId: string) => Promise<void>
  onEndTemporaryAccess: (rule: BlockRule) => Promise<void>
  onOpenTemporaryAccess: (ruleId: string) => void
  overridden: boolean
  rule: BlockRule
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`More actions for ${rule.domain}`}
          size="icon"
          variant="ghost">
          <MoreVertical data-icon="inline-start" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          disabled={!rule.enabled}
          onSelect={() => onOpenTemporaryAccess(rule.id)}>
          <Clock3 data-icon="inline-start" />
          {overridden ? "Change temporary access" : "Temporary access"}
        </DropdownMenuItem>
        {overridden ? (
          <DropdownMenuItem onSelect={() => onEndTemporaryAccess(rule)}>
            <X data-icon="inline-start" />
            End temporary access
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onSelect={() => onDelete(rule.id)}>
          <Trash2 data-icon="inline-start" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SiteIcon({ domain }: { domain: string }) {
  const sources = useMemo(() => faviconSourcesForDomain(domain), [domain])
  const [sourceIndex, setSourceIndex] = useState(0)
  const currentSource = sources[sourceIndex]

  useEffect(() => {
    setSourceIndex(0)
  }, [domain])

  return (
    <div className="osbe-site-icon" aria-hidden="true">
      {currentSource ? (
        <img
          alt=""
          onError={() => setSourceIndex((index) => index + 1)}
          referrerPolicy="no-referrer"
          src={currentSource}
        />
      ) : null}
      <Globe2 className="osbe-site-icon-fallback" data-icon="inline-start" />
    </div>
  )
}

function RuleEffectiveStatus({
  paused,
  rule,
  rules
}: {
  paused: boolean
  rule: BlockRule
  rules: BlockRule[]
}) {
  const status = getRuleEffectiveStatus(rule, rules, paused)
  const StatusIcon = status.icon

  return (
    <span className="osbe-effective-status" data-tone={status.tone}>
      <StatusIcon data-icon="inline-start" />
      {status.label}
    </span>
  )
}

function getRuleEffectiveStatus(
  rule: BlockRule,
  rules: BlockRule[],
  paused: boolean
) {
  const activeParent = findNearestBlockingParent(rule, rules)

  if (!rule.enabled) {
    return {
      icon: Ban,
      label: activeParent
        ? `Not blocked · overrides ${activeParent.domain}`
        : "Not included in blocking",
      tone: "off"
    } as const
  }

  if (paused) {
    return {
      icon: PauseCircle,
      label: "Paused by the global setting",
      tone: "paused"
    } as const
  }

  const exceptionCount = rules.filter(
    (candidate) =>
      candidate.id !== rule.id &&
      candidate.domain.endsWith(`.${rule.domain}`) &&
      !isRuleBlocking(candidate)
  ).length

  return {
    icon: ShieldCheck,
    label:
      exceptionCount > 0
        ? `Blocking with ${exceptionCount} more-specific exception${exceptionCount === 1 ? "" : "s"}`
        : "Blocking this site and its subdomains",
    tone: "blocking"
  } as const
}

function findNearestBlockingParent(rule: BlockRule, rules: BlockRule[]) {
  return (
    rules
      .filter(
        (candidate) =>
          candidate.id !== rule.id &&
          rule.domain.endsWith(`.${candidate.domain}`) &&
          isRuleBlocking(candidate)
      )
      .sort((left, right) => right.domain.length - left.domain.length)[0] ||
    null
  )
}

function getMatchTestLabel(
  matchTest: BlockingRulesStatus["matchTest"],
  expectedRuleCount: number
) {
  if (matchTest?.error) {
    return "Error"
  }

  if (matchTest?.supported === false) {
    return "Unavailable"
  }

  if (matchTest) {
    return matchTest.matchedRuleIds.length > 0 ? "Pass" : "No match"
  }

  return expectedRuleCount > 0 ? "Loading" : "None"
}

function faviconSourcesForDomain(domain: string) {
  const directSources = createDirectFaviconUrls(domain)

  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) {
    return directSources
  }

  return [
    ...directSources,
    ...createFaviconPageUrls(domain).map(
      (pageUrl) =>
        `${chrome.runtime.getURL("/_favicon/")}?pageUrl=${encodeURIComponent(pageUrl)}&size=32`
    )
  ]
}

export default OptionsPage
