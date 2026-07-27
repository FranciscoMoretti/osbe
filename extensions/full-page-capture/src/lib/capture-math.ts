const MAX_CANVAS_DIMENSION = 32_767
const MAX_CANVAS_AREA = 268_435_456

interface ScrollPositionInput {
  currentY: number
  documentHeight: number
  viewportHeight: number
}

export interface PdfSlice {
  sourceY: number
  sourceHeight: number
}

export function getNextScrollY({
  currentY,
  documentHeight,
  viewportHeight
}: ScrollPositionInput): number | null {
  const maximumY = Math.max(0, documentHeight - viewportHeight)
  if (currentY >= maximumY) return null

  const nextY = Math.min(currentY + viewportHeight, maximumY)
  return nextY > currentY ? nextY : null
}

export function canCreateSingleCanvas(width: number, height: number) {
  return (
    width > 0 &&
    height > 0 &&
    width <= MAX_CANVAS_DIMENSION &&
    height <= MAX_CANVAS_DIMENSION &&
    width * height <= MAX_CANVAS_AREA
  )
}

export function createPdfSlices(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number
): PdfSlice[] {
  if (
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    pageWidth <= 0 ||
    pageHeight <= 0
  ) {
    return []
  }

  const maximumSliceHeight = Math.max(
    1,
    Math.floor((imageWidth * pageHeight) / pageWidth)
  )
  const slices: PdfSlice[] = []

  for (let sourceY = 0; sourceY < imageHeight; ) {
    const sourceHeight = Math.min(
      maximumSliceHeight,
      imageHeight - sourceY
    )
    slices.push({ sourceY, sourceHeight })
    sourceY += sourceHeight
  }

  return slices
}

export function createDownloadBaseName(title: string, capturedAt: Date) {
  const safeTitle = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  const date = capturedAt.toISOString().slice(0, 10)

  return `${safeTitle || "full-page-capture"}-${date}`
}
