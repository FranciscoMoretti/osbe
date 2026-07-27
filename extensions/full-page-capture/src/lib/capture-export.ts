import { createPdfSlices } from "./capture-math"
import type { CaptureSegment } from "./capture-image"

export async function downloadPngCapture(
  segments: CaptureSegment[],
  baseName: string
) {
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
}

export async function downloadPdfCapture(
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.download = filename
  anchor.href = url
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
