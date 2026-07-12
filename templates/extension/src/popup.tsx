import { Puzzle } from "lucide-react"

import "~style.css"

import { Button } from "@osbe/ui/components/button"

function IndexPopup() {
  return (
    <main className="w-[360px] bg-background p-4 text-foreground">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md border bg-card">
          <Puzzle className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-5">
            {"{{displayName}}"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Runs only when invoked.
          </p>
        </div>
      </header>

      <Button className="w-full">Ready</Button>
    </main>
  )
}

export default IndexPopup
