import {
  AlertCircle,
  Check,
  Download,
  FileImage,
  FileText,
  LoaderCircle
} from "lucide-react"
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"

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

import iconUrl from "data-base64:../../assets/icon.png"

import {
  downloadPdfCapture,
  downloadPngCapture
} from "~/lib/capture-export"
import {
  assembleCapture,
  type CaptureSegment
} from "~/lib/capture-image"
import { createDownloadBaseName } from "~/lib/capture-math"
import type {
  CaptureChunk,
  CaptureMessage,
  CaptureMetadata
} from "~/lib/capture-types"

type CapturePhase =
  | "waiting"
  | "capturing"
  | "processing"
  | "ready"
  | "error"

function CaptureResultPage() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  )
  const captureId = params.get("capture")
  const initialError = params.get("error")
  const chunksRef = useRef<CaptureChunk[]>([])
  const metadataRef = useRef<CaptureMetadata | null>(null)
  const segmentUrlsRef = useRef<string[]>([])
  const [phase, setPhase] = useState<CapturePhase>(
    initialError ? "error" : "waiting"
  )
  const [metadata, setMetadata] = useState<CaptureMetadata | null>(null)
  const [segments, setSegments] = useState<CaptureSegment[]>([])
  const [progress, setProgress] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [error, setError] = useState(initialError ?? "")
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(
    null
  )

  useEffect(() => {
    if (!captureId || initialError) {
      if (!initialError) {
        setError("This capture link is missing its capture identifier.")
        setPhase("error")
      }
      return
    }

    let complete = false
    let disposed = false
    const port = chrome.runtime.connect({ name: `capture:${captureId}` })

    const onMessage = (message: CaptureMessage) => {
      if (disposed) return

      if (message.type === "capture-start") {
        metadataRef.current = message.metadata
        setMetadata(message.metadata)
        setPhase("capturing")
        return
      }

      if (message.type === "capture-chunk") {
        chunksRef.current.push(message.chunk)
        return
      }

      if (message.type === "capture-progress") {
        setFrameCount(message.frameCount)
        setProgress(
          Math.min(
            100,
            Math.round(
              (message.capturedHeight / message.documentHeight) * 100
            )
          )
        )
        return
      }

      if (message.type === "capture-error") {
        complete = true
        port.disconnect()
        setError(message.message)
        setPhase("error")
        return
      }

      if (message.type === "capture-complete") {
        complete = true
        port.disconnect()
        setFrameCount(message.frameCount)
        setProgress(100)
        setPhase("processing")

        const captureMetadata = metadataRef.current
        if (!captureMetadata) {
          setError("Capture metadata was not received.")
          setPhase("error")
          return
        }

        void assembleCapture(
          chunksRef.current,
          captureMetadata,
          message.documentHeight
        )
          .then((nextSegments) => {
            if (disposed) {
              for (const segment of nextSegments) {
                URL.revokeObjectURL(segment.url)
              }
              return
            }

            segmentUrlsRef.current = nextSegments.map(
              (segment) => segment.url
            )
            setSegments(nextSegments)
            setPhase("ready")
          })
          .catch((captureError) => {
            if (disposed) return
            setError(
              captureError instanceof Error
                ? captureError.message
                : "The captured page could not be assembled."
            )
            setPhase("error")
          })
      }
    }

    port.onMessage.addListener(onMessage)
    port.onDisconnect.addListener(() => {
      if (!complete && !disposed) {
        setError(
          "The capture stopped before it finished. Reload the original page and try again."
        )
        setPhase("error")
      }
    })
    port.postMessage({ type: "preview-ready" })

    return () => {
      disposed = true
      port.disconnect()
    }
  }, [captureId, initialError])

  useEffect(
    () => () => {
      for (const url of segmentUrlsRef.current) {
        URL.revokeObjectURL(url)
      }
    },
    []
  )

  const baseName = metadata
    ? createDownloadBaseName(
        metadata.title,
        new Date(metadata.capturedAt)
      )
    : "full-page-capture"

  const downloadPng = async () => {
    if (!segments.length) return
    setExporting("png")

    try {
      await downloadPngCapture(segments, baseName)
    } finally {
      setExporting(null)
    }
  }

  const downloadPdf = async () => {
    if (!segments.length) return
    setExporting("pdf")

    try {
      await downloadPdfCapture(segments, baseName)
    } finally {
      setExporting(null)
    }
  }

  const pageHost = metadata
    ? getDisplayHost(metadata.url)
    : "Preparing your capture"

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b border-primary-foreground/15 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary-foreground/15 bg-primary-foreground/10">
              <img
                alt=""
                className="h-8 w-8"
                height="32"
                src={iconUrl}
                width="32"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">
                OSBE Full Page Capture
              </h1>
              <p className="truncate text-xs text-primary-foreground/70 sm:text-sm">
                {pageHost}
              </p>
            </div>
          </div>

          {phase === "ready" ? (
            <div className="flex items-center gap-2">
              <Button
                className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                disabled={exporting !== null}
                onClick={() => void downloadPng()}
                variant="outline"
              >
                {exporting === "png" ? (
                  <LoaderCircle data-icon className="animate-spin" />
                ) : (
                  <FileImage data-icon />
                )}
                {segments.length === 1 ? "Download PNG" : "Download PNGs"}
              </Button>
              <Button
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                disabled={exporting !== null}
                onClick={() => void downloadPdf()}
              >
                {exporting === "pdf" ? (
                  <LoaderCircle data-icon className="animate-spin" />
                ) : (
                  <FileText data-icon />
                )}
                Download PDF
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        {phase === "error" ? (
          <Alert className="mx-auto max-w-2xl" variant="destructive">
            <AlertCircle />
            <AlertTitle>Capture failed</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              <p className="mt-2">
                Chrome prevents captures on internal pages and the Chrome Web
                Store.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        {phase === "waiting" ||
        phase === "capturing" ||
        phase === "processing" ? (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                {phase === "processing" ? (
                  <Download className="h-6 w-6" />
                ) : (
                  <LoaderCircle className="h-6 w-6 animate-spin" />
                )}
              </div>
              <CardTitle className="text-xl">
                {phase === "processing"
                  ? "Building your full-page image"
                  : "Capturing the page"}
              </CardTitle>
              <CardDescription>
                {phase === "processing"
                  ? "The page is captured. Preparing the preview and downloads now."
                  : "Keep the original page tab active while OSBE scrolls through it."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                aria-label="Capture progress"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progress}
                className="h-2 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>
                  {frameCount
                    ? `${frameCount} screen${frameCount === 1 ? "" : "s"} captured`
                    : "Starting capture"}
                </span>
                <span>{progress}%</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {phase === "ready" ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
              <div className="flex min-w-0 items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-medium">
                  {metadata?.title || "Full-page capture"}
                </span>
              </div>
              <span className="text-muted-foreground">
                {formatDimensions(segments)}
              </span>
            </div>

            {segments.length > 1 ? (
              <Alert className="mb-4">
                <FileImage />
                <AlertTitle>Extra-tall page</AlertTitle>
                <AlertDescription>
                  PNG download is split into {segments.length} lossless parts
                  inside one ZIP file to stay within browser image limits. PDF
                  download remains a single document.
                </AlertDescription>
              </Alert>
            ) : null}

            <section
              aria-label="Full-page capture preview"
              className="mx-auto w-fit max-w-full overflow-hidden rounded-sm border bg-background shadow-sm"
            >
              {segments.map((segment, index) => (
                <img
                  alt={
                    segments.length === 1
                      ? `Full-page capture of ${metadata?.title || "the page"}`
                      : `Full-page capture part ${index + 1} of ${segments.length}`
                  }
                  className="block h-auto max-w-full"
                  key={segment.startY}
                  src={segment.url}
                />
              ))}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}

function getDisplayHost(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatDimensions(segments: CaptureSegment[]) {
  if (!segments.length) return ""
  const width = segments[0].width
  const height = segments.reduce(
    (total, segment) => total + segment.height,
    0
  )
  return `${width.toLocaleString()} × ${height.toLocaleString()} px`
}

export default CaptureResultPage
