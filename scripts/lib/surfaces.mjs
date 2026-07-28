export const SURFACE_REQUIRED_FILES = {
  popup: ["src/popup.tsx"],
  "action-result": ["src/background.ts", "src/tabs"],
  dashboard: ["src/options.tsx"]
}

export function createSurfaceDefinition(surface, displayName) {
  const definitions = {
    popup: {
      manifest: { permissions: [] },
      permissions: [],
      smokePage: "popup.html"
    },
    "action-result": {
      manifest: {
        permissions: ["activeTab"],
        action: {
          default_title: displayName
        }
      },
      permissions: [
        {
          name: "activeTab",
          justification:
            "TODO: Explain why the user-invoked action needs temporary access to the active tab."
        }
      ],
      smokePage: "tabs/result.html"
    },
    dashboard: {
      manifest: { permissions: [] },
      permissions: [],
      smokePage: "options.html"
    }
  }

  return definitions[surface]
}
