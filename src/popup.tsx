import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileText,
  Image,
  Loader2
} from "lucide-react"
import { useState } from "react"

import "~style.css"

import { Button } from "~components/ui/button"
import {
  DOWNLOAD_MESSAGE,
  type ClipPayload,
  type ExtensionResponse
} from "~lib/clip-types"
import { requestClipFromTab } from "~lib/request-clip"

function IndexPopup() {
  const [includeImages, setIncludeImages] = useState(true)
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle")
  const [message, setMessage] = useState("Ready to clip the active tab.")

  const clipWholePage = async () => {
    setStatus("busy")
    setMessage("Reading the active page...")

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!tab?.id) {
        throw new Error("No active tab found.")
      }

      const clip = await requestClipFromTab(tab.id, "page", includeImages)

      setMessage("Preparing the download...")

      const downloadResponse = await chrome.runtime.sendMessage<
        { type: typeof DOWNLOAD_MESSAGE; payload: ClipPayload },
        ExtensionResponse<{ filename: string }>
      >({
        type: DOWNLOAD_MESSAGE,
        payload: clip
      })

      if (!downloadResponse) {
        throw new Error("The download could not be created.")
      }

      if (downloadResponse.ok === false) {
        throw new Error(downloadResponse.error)
      }

      setStatus("done")
      setMessage(`Downloaded ${downloadResponse.data.filename}.`)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "The page could not be clipped.")
    }
  }

  return (
    <div className="w-[360px] bg-background p-4 text-foreground">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-5">Markdown Clipper</h1>
          <p className="text-xs text-muted-foreground">
            Save the active page as Markdown.
          </p>
        </div>
      </header>

      <div className="mb-4 rounded-md border border-border p-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            checked={includeImages}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            onChange={(event) => setIncludeImages(event.currentTarget.checked)}
            type="checkbox"
          />
          <span className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Include images
          </span>
        </label>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Image clips download as a ZIP with Markdown and local assets.
        </p>
      </div>

      <Button className="w-full" disabled={status === "busy"} onClick={clipWholePage}>
        {status === "busy" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        Clip Whole Page
      </Button>

      <div
        className="mt-4 flex min-h-10 items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground"
        role="status">
        {status === "done" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : status === "error" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        ) : null}
        <span>{message}</span>
      </div>
    </div>
  )
}

export default IndexPopup
