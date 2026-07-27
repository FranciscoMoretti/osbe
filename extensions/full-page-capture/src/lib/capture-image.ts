import { canCreateSingleCanvas } from "./capture-math"
import type { CaptureChunk, CaptureMetadata } from "./capture-types"

const MAX_SEGMENT_HEIGHT = 16_000
const MAX_SEGMENT_AREA = 64_000_000

export interface CaptureSegment {
  blob: Blob
  height: number
  startY: number
  url: string
  width: number
}

export async function assembleCapture(
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
