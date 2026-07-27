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
  canCreateSingleCanvas,
  createDownloadBaseName,
  createPdfSlices
} from "~/lib/capture-math"
import type {
  CaptureChunk,
  CaptureMessage,
  CaptureMetadata
} from "~/lib/capture-types"

const MAX_SEGMENT_HEIGHT = 16_000
const MAX_SEGMENT_AREA = 64_000_000

interface CaptureSegment {
  blob: Blob
  height: number
  startY: number
  url: string
  width: number
}

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
        setError(message.message)
        setPhase("error")
        return
      }

      if (message.type === "capture-complete") {
        complete = true
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
      if (segments.length === 1) {
        downloadBlob(segments[0].blob, `${baseName}.png`)
        return
      }

      const { default: JSZip } = await import("jszip")
      const zip = new JSZip()
      const digits = String(segments.length).length

      for (const [index, segment] of segments.entries()) {
        zip.file(
          `${baseName}-part-${String(index + 1).padStart(digits, "0")}.png`,
          segment.blob
        )
      }

      const blob = await zip.generateAsync({ type: "blob" })
      downloadBlob(blob, `${baseName}-png-parts.zip`)
    } finally {
      setExporting(null)
    }
  }

  const downloadPdf = async () => {
    if (!segments.length) return
    setExporting("pdf")

    try {
      await exportPdf(segments, baseName)
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
              className="mx-auto w-fit max-w-full overflow-hidden rounded-sm border bg-background shadow-xl"
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

async function assembleCapture(
  chunks: CaptureChunk[],
  metadata: CaptureMetadata,
  finalDocumentHeight: number
) {
  if (!chunks.length) {
    throw new Error("No page images were received.")
  }

  const frames = await Promise.all(
    chunks.map(async (chunk) => {
      const blob = await fetch(chunk.dataUrl).then((response) =>
        response.blob()
      )
      const bitmap = await createImageBitmap(blob)
      return { bitmap, chunk }
    })
  )

  try {
    const outputWidth = frames[0].bitmap.width
    const scale = outputWidth / metadata.viewportWidth
    const outputHeight = Math.max(
      1,
      Math.round(finalDocumentHeight * scale)
    )
    const segmentHeight = getSafeSegmentHeight(
      outputWidth,
      outputHeight
    )
    const segments: CaptureSegment[] = []

    for (
      let segmentStart = 0;
      segmentStart < outputHeight;
      segmentStart += segmentHeight
    ) {
      const height = Math.min(
        segmentHeight,
        outputHeight - segmentStart
      )
      const canvas = document.createElement("canvas")
      canvas.width = outputWidth
      canvas.height = height
      const context = canvas.getContext("2d", { alpha: false })

      if (!context) {
        throw new Error("This browser could not create the capture image.")
      }

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, outputWidth, height)

      for (const { bitmap, chunk } of frames) {
        const frameStart = Math.round(chunk.scrollY * scale)
        const frameEnd = Math.min(
          outputHeight,
          frameStart + bitmap.height
        )
        const overlapStart = Math.max(segmentStart, frameStart)
        const overlapEnd = Math.min(segmentStart + height, frameEnd)

        if (overlapStart >= overlapEnd) continue

        const sourceY = overlapStart - frameStart
        const overlapHeight = overlapEnd - overlapStart
        context.drawImage(
          bitmap,
          0,
          sourceY,
          bitmap.width,
          overlapHeight,
          0,
          overlapStart - segmentStart,
          outputWidth,
          overlapHeight
        )
      }

      const blob = await canvasToBlob(canvas, "image/png")
      const url = URL.createObjectURL(blob)
      segments.push({
        blob,
        height,
        startY: segmentStart,
        url,
        width: outputWidth
      })
      canvas.width = 1
      canvas.height = 1
    }

    return segments
  } finally {
    for (const { bitmap } of frames) {
      bitmap.close()
    }
  }
}

function getSafeSegmentHeight(width: number, totalHeight: number) {
  if (width <= 0 || width > 32_767) {
    throw new Error("The captured page is too wide for a browser image.")
  }

  if (canCreateSingleCanvas(width, totalHeight)) {
    return totalHeight
  }

  return Math.max(
    1,
    Math.min(
      MAX_SEGMENT_HEIGHT,
      32_767,
      Math.floor(MAX_SEGMENT_AREA / width)
    )
  )
}

async function exportPdf(
  segments: CaptureSegment[],
  baseName: string
) {
  const { jsPDF } = await import("jspdf")
  const outputWidth = segments[0].width
  const outputHeight = segments.reduce(
    (height, segment) => height + segment.height,
    0
  )
  const pdf = new jsPDF({
    compress: true,
    format: "a4",
    orientation: "portrait",
    unit: "pt"
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const slices = createPdfSlices(
    outputWidth,
    outputHeight,
    pageWidth,
    pageHeight
  )
  const bitmaps = await Promise.all(
    segments.map((segment) => createImageBitmap(segment.blob))
  )

  try {
    for (const [pageIndex, slice] of slices.entries()) {
      if (pageIndex > 0) pdf.addPage()

      const canvas = document.createElement("canvas")
      canvas.width = outputWidth
      canvas.height = slice.sourceHeight
      const context = canvas.getContext("2d", { alpha: false })

      if (!context) {
        throw new Error("This browser could not create a PDF page.")
      }

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)

      for (const [segmentIndex, segment] of segments.entries()) {
        const segmentEnd = segment.startY + segment.height
        const sliceEnd = slice.sourceY + slice.sourceHeight
        const overlapStart = Math.max(segment.startY, slice.sourceY)
        const overlapEnd = Math.min(segmentEnd, sliceEnd)

        if (overlapStart >= overlapEnd) continue

        const overlapHeight = overlapEnd - overlapStart
        context.drawImage(
          bitmaps[segmentIndex],
          0,
          overlapStart - segment.startY,
          outputWidth,
          overlapHeight,
          0,
          overlapStart - slice.sourceY,
          outputWidth,
          overlapHeight
        )
      }

      const renderedHeight =
        (slice.sourceHeight / outputWidth) * pageWidth
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        pageWidth,
        renderedHeight,
        undefined,
        "FAST"
      )
      canvas.width = 1
      canvas.height = 1
    }

    pdf.save(`${baseName}.pdf`)
  } finally {
    for (const bitmap of bitmaps) {
      bitmap.close()
    }
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The capture image could not be encoded.")),
      type,
      quality
    )
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.download = filename
  anchor.href = url
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
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
