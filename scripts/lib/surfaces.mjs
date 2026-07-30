const BASE_REQUIRED_FILES = [
  "README.md",
  "PRIVACY.md",
  "assets/icon-source.svg",
  "assets/icon.png",
  "extension.config.json",
  "store-assets/README.md",
  "store-assets/chrome-web-store-listing.md",
  "store-assets/store-icon-128.png",
  "submit-keys.example.json",
  "tsconfig.json"
]

const UI_FILES = [
  "components.json",
  "postcss.config.js",
  "src/style.css",
  "tailwind.config.js"
]

const UI_DEPENDENCIES = [
  "@osbe/ui",
  "lucide-react",
  "react",
  "react-dom",
  "tailwindcss",
  "@types/react",
  "@types/react-dom",
  "postcss"
]

const SURFACE_FILES = {
  popup: ["src/popup.tsx"],
  "action-result": ["src/background.ts", "src/tabs"],
  dashboard: ["src/options.tsx"],
  "content-only": ["src/contents/main.ts"]
}

export function getSurfacePolicy(surface) {
  const usesUi = surface !== "content-only"
  const surfaceFiles = SURFACE_FILES[surface]
  if (!surfaceFiles) return undefined

  return {
    forbiddenDependencies: usesUi ? [] : UI_DEPENDENCIES,
    forbiddenFiles: usesUi ? [] : UI_FILES,
    generatedDependencyRemovals: usesUi
      ? []
      : ["@osbe/extension-kit", ...UI_DEPENDENCIES],
    requiredFiles: [
      ...BASE_REQUIRED_FILES,
      ...(usesUi ? UI_FILES.filter((file) => file !== "src/style.css") : []),
      ...surfaceFiles
    ],
    requiredWorkspaceDependencies: usesUi
      ? ["@osbe/config", "@osbe/extension-kit", "@osbe/ui"]
      : ["@osbe/config"]
  }
}

export function createSurfaceDefinition(
  surface,
  displayName,
  { contentMatch, slug } = {}
) {
  const definitions = {
    popup: {
      hostPermissions: [],
      manifest: { permissions: [] },
      permissions: [],
      smoke: { page: "popup.html" }
    },
    "action-result": {
      hostPermissions: [],
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
      smoke: { page: "tabs/result.html" }
    },
    dashboard: {
      hostPermissions: [],
      manifest: { permissions: [] },
      permissions: [],
      smoke: { page: "options.html" }
    },
    "content-only": {
      contentMatch,
      hostPermissions: [
        {
          name: contentMatch,
          justification:
            "TODO: Explain why the automatic page behavior needs access to this origin."
        }
      ],
      manifest: {
        permissions: [],
        host_permissions: [contentMatch]
      },
      permissions: [],
      smoke: {
        activationSelector: `#osbe-${slug}-active`,
        page: matchPatternToSmokePage(contentMatch)
      }
    }
  }

  const definition = definitions[surface]
  if (!definition) return undefined
  return { ...definition, policy: getSurfacePolicy(surface) }
}

export function matchPatternToSmokePage(matchPattern) {
  if (!matchPattern) return undefined
  return matchPattern.replace("https://*.", "https://").replaceAll("*", "")
}
