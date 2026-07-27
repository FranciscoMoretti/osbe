export interface CaptureMetadata {
  id: string
  title: string
  url: string
  documentWidth: number
  documentHeight: number
  viewportWidth: number
  viewportHeight: number
  capturedAt: string
}

export interface CaptureChunk {
  dataUrl: string
  index: number
  scrollY: number
  viewportWidth: number
  viewportHeight: number
  documentHeight: number
}

export type CaptureMessage =
  | {
      type: "capture-start"
      metadata: CaptureMetadata
    }
  | {
      type: "capture-progress"
      capturedHeight: number
      documentHeight: number
      frameCount: number
    }
  | {
      type: "capture-chunk"
      chunk: CaptureChunk
    }
  | {
      type: "capture-complete"
      documentHeight: number
      frameCount: number
    }
  | {
      type: "capture-error"
      message: string
    }
