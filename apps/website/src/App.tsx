import { ArrowRight, Check, Copy, Github, Menu, X } from "lucide-react"
import { useEffect, useState } from "react"

const repoUrl = "https://github.com/FranciscoMoretti/osbe"

type ExtensionConfig = {
  displayName: string
  hostPermissions: Array<{ name: string }>
  permissions: Array<{ name: string }>
  slug: string
  store: {
    storeId?: string
  }
  website: {
    accent: string
    data: string
    description: string
    order: number
    trigger: string
  }
}

type Product = {
  accent: string
  config: ExtensionConfig
  data: string
  description: string
  icon: string
  shortName: string
  trigger: string
}

const configModules = import.meta.glob<ExtensionConfig>(
  "../../../extensions/*/extension.config.json",
  { eager: true, import: "default" }
)
const iconModules = import.meta.glob<string>(
  "../../../extensions/*/assets/icon-source.svg",
  { eager: true, import: "default", query: "?url" }
)

const products: Product[] = Object.entries(configModules)
  .map(([configPath, config]) => {
    const iconPath = configPath.replace(
      "extension.config.json",
      "assets/icon-source.svg"
    )
    const icon = iconModules[iconPath]

    if (!icon) {
      throw new Error(`Missing canonical icon for ${config.slug}`)
    }

    return {
      accent: config.website.accent,
      config,
      data: config.website.data,
      description: config.website.description,
      icon,
      shortName: config.displayName.replace(/^OSBE /, ""),
      trigger: config.website.trigger
    }
  })
  .sort((left, right) => left.config.website.order - right.config.website.order)

function hostLabel(name: string) {
  if (name === "<all_urls>") return "all sites"

  try {
    return new URL(name).hostname
  } catch {
    return name
  }
}

function accessSummary(config: ExtensionConfig) {
  const manifest =
    config.permissions.length > 0 ? `${config.permissions.length}` : undefined
  const hosts =
    config.hostPermissions.length > 0
      ? config.hostPermissions
          .map((permission) => hostLabel(permission.name))
          .join(", ")
      : undefined

  return [manifest, hosts].filter(Boolean).join(" + ") || "None"
}

const principles = [
  {
    code: "01",
    detail: "Every line is public.",
    sample: "github.com/FranciscoMoretti/osbe",
    title: "Source"
  },
  {
    code: "02",
    detail: "Every request is explained.",
    sample: '"activeTab": only after you click',
    title: "Permissions"
  },
  {
    code: "03",
    detail: "Local unless we say otherwise.",
    sample: '"analytics": false',
    title: "Data"
  },
  {
    code: "04",
    detail: "No vague background behaviour.",
    sample: "on click / navigation / named site",
    title: "When it runs"
  }
]

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <a className="brand" href="#top" aria-label="OSBE home">
      <span className="brand-word">OSBE</span>
      {!compact && (
        <>
          <svg className="brand-node" viewBox="0 0 36 30" aria-hidden="true">
            <circle cx="8" cy="15" r="5" />
            <circle cx="28" cy="5" r="4" />
            <circle cx="28" cy="25" r="4" />
            <path d="m12 13 12-6M12 17l12 6" />
          </svg>
          <span className="brand-expansion">
            Open Source
            <br />
            Browser Extensions
          </span>
        </>
      )}
    </a>
  )
}

function ArrowLink({
  children,
  className = "",
  href
}: {
  children: React.ReactNode
  className?: string
  href: string
}) {
  return (
    <a className={`arrow-link ${className}`} href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </a>
  )
}

function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <BrandMark />
        <button
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="site-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="site-navigation"
          aria-label="Main navigation"
          className={open ? "nav nav-open" : "nav"}>
          <a href="#extensions" onClick={() => setOpen(false)}>
            Extensions
          </a>
          <a href="#principles" onClick={() => setOpen(false)}>
            Principles
          </a>
          <a href="#build" onClick={() => setOpen(false)}>
            Build your own
          </a>
          <a className="github-button" href={repoUrl}>
            <Github aria-hidden="true" />
            View on GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}

function LineGutter() {
  return (
    <div className="line-gutter" aria-hidden="true">
      <span>SRC</span>
      {Array.from({ length: 16 }, (_, index) => (
        <span key={index}>{String(index + 1).padStart(3, "0")}</span>
      ))}
    </div>
  )
}

function IconFan() {
  return (
    <div className="icon-fan" aria-label="The five OSBE extensions">
      {products.map((product, index) => (
        <a
          className="fan-item"
          href={`#${product.config.slug}`}
          key={product.config.slug}
          style={
            {
              "--accent": product.accent,
              "--fan-index": index
            } as React.CSSProperties
          }>
          <img src={product.icon} alt="" />
          <span>{product.shortName}</span>
        </a>
      ))}
    </div>
  )
}

function PermissionLedger() {
  return (
    <div className="ledger">
      <div className="ledger-title">
        <span>source &amp; permission ledger</span>
        <span>manifest.json / v3</span>
      </div>
      <div className="ledger-head" aria-hidden="true">
        <span>Extension</span>
        <span>Source</span>
        <span>Browser access</span>
        <span>Data</span>
        <span>When it runs</span>
      </div>
      {products.map((product) => (
        <div className="ledger-row" key={product.config.slug}>
          <span>
            <i style={{ background: product.accent }} />
            {product.shortName}
          </span>
          <span>Public</span>
          <span>{accessSummary(product.config)}</span>
          <span>{product.data}</span>
          <span>{product.trigger}</span>
        </div>
      ))}
    </div>
  )
}

function Hero() {
  return (
    <main id="top">
      <section className="hero shell">
        <LineGutter />
        <div className="hero-copy reveal">
          <h1>
            Small tools.
            <br />
            Open source.
            <br />
            No mystery.
          </h1>
          <p>
            OSBE makes focused browser extensions with public source,
            plain-language permissions, and no hidden business model.
          </p>
          <div className="hero-actions">
            <ArrowLink className="button-primary" href="#extensions">
              Browse the extensions
            </ArrowLink>
            <ArrowLink className="button-secondary" href={repoUrl}>
              Inspect the source
            </ArrowLink>
          </div>
        </div>
        <div className="hero-tools reveal">
          <IconFan />
          <PermissionLedger />
          <p className="ledger-note">
            [ No accounts. No analytics. No remote code. ]
          </p>
        </div>
      </section>
      <div className="manifesto shell reveal">
        <strong>Built different, on purpose.</strong>
        <p>
          Single-purpose, transparent, and under your control—so you can use the
          web, not wonder what is hiding behind the toolbar.
        </p>
      </div>
    </main>
  )
}

function Extensions() {
  return (
    <section className="section shell extension-section" id="extensions">
      <div className="section-index reveal">
        <strong>02</strong>
        <span>/ EXTENSIONS</span>
      </div>
      <div className="section-main">
        <h2 className="display-heading reveal">Five tools. Five clear jobs.</h2>
        <div className="product-list">
          {products.map((product, index) => {
            const permissions = product.config.permissions
              .map((permission) => permission.name)
              .join(", ")
            const hostPermissions = product.config.hostPermissions
              .map((permission) => hostLabel(permission.name))
              .join(", ")

            return (
              <article
                className="product-row reveal"
                id={product.config.slug}
                key={product.config.slug}
                style={
                  {
                    "--accent": product.accent,
                    "--delay": `${index * 55}ms`
                  } as React.CSSProperties
                }>
                <div className="product-identity">
                  <img src={product.icon} alt="" />
                  <div>
                    <h3>{product.shortName}</h3>
                    <p>{product.description}</p>
                    <div className="product-links">
                      {product.config.store.storeId ? (
                        <ArrowLink
                          href={`https://chromewebstore.google.com/detail/${product.config.store.storeId}`}>
                          Add to Chrome
                        </ArrowLink>
                      ) : null}
                      <a
                        className="source-link"
                        href={`${repoUrl}/tree/main/extensions/${product.config.slug}`}>
                        View source
                      </a>
                    </div>
                  </div>
                </div>
                <dl className="product-facts">
                  <div>
                    <dt>trigger</dt>
                    <dd>{product.trigger}</dd>
                  </div>
                  <div>
                    <dt>permissions</dt>
                    <dd>{permissions || "none"}</dd>
                  </div>
                  <div>
                    <dt>site access</dt>
                    <dd>{hostPermissions || "none"}</dd>
                  </div>
                  <div>
                    <dt>local data</dt>
                    <dd>{product.data}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Principles() {
  return (
    <section className="principles section shell" id="principles">
      <div className="section-index reveal">
        <strong>03</strong>
        <span>/ PRINCIPLES</span>
      </div>
      <div className="section-main">
        <h2 className="display-heading reveal">
          You shouldn’t have to trust a black box.
        </h2>
        <p className="section-intro reveal">
          Every OSBE extension publishes the facts that matter before you
          install it.
        </p>
        <div className="principle-grid">
          {principles.map((principle, index) => (
            <article
              className="principle reveal"
              key={principle.title}
              style={
                {
                  "--delay": `${index * 70}ms`,
                  "--accent": products[index]?.accent ?? "var(--ink)"
                } as React.CSSProperties
              }>
              <span className="principle-code">{principle.code}</span>
              <h3>{principle.title} —</h3>
              <p>{principle.detail}</p>
              <code>{principle.sample}</code>
            </article>
          ))}
        </div>
        <ArrowLink
          className="principle-link"
          href={`${repoUrl}/blob/main/docs/brand.md`}>
          Read the principles
        </ArrowLink>
      </div>
    </section>
  )
}

function BuildSection() {
  const command = "pnpm new:extension my-extension"
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="build-section" id="build">
      <div className="shell build-shell">
        <div className="build-index" aria-hidden="true">
          <span>OSBE</span>
          <span>// BUILD</span>
        </div>
        <div className="build-copy reveal">
          <h2>Fork one. Build your own.</h2>
          <p>
            The same foundation behind every OSBE extension is yours to inspect,
            adapt, and ship.
          </p>
        </div>
        <div className="build-workbench reveal">
          <div className="command">
            <code>
              <span aria-hidden="true">›</span> {command}
            </code>
            <button type="button" onClick={copyCommand}>
              {copied ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="build-facts">
            <span>
              <i style={{ background: "var(--markdown)" }} />
              TypeScript + Plasmo
            </span>
            <span>
              <i style={{ background: "var(--blocker)" }} />
              Shared UI and release tooling
            </span>
            <span>
              <i style={{ background: "var(--capture)" }} />
              Manifest V3 ready
            </span>
          </div>
          <div className="build-links">
            <ArrowLink href={`${repoUrl}/blob/main/docs/create-extension.md`}>
              Read the build guide
            </ArrowLink>
            <ArrowLink href={repoUrl}>Browse the repository</ArrowLink>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-main">
          <div className="footer-brand">
            <BrandMark compact />
            <p>Open-source browser extensions, built in the open.</p>
          </div>
          <div className="footer-column">
            <strong>Extensions</strong>
            <a href="#extensions">All extensions</a>
            <a href="#principles">How it works</a>
          </div>
          <div className="footer-column">
            <strong>Build</strong>
            <a href={`${repoUrl}/blob/main/docs/create-extension.md`}>
              Build guide
            </a>
            <a href={`${repoUrl}/issues`}>Suggest an extension</a>
          </div>
          <div className="footer-column">
            <strong>GitHub</strong>
            <a href={repoUrl}>Repository</a>
            <a href={`${repoUrl}/issues`}>Issues</a>
          </div>
          <div className="footer-column">
            <strong>Trust</strong>
            <a href={`${repoUrl}/blob/main/docs/brand.md`}>Principles</a>
            <a href="#principles">Permission model</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>OSBE // OPEN SOURCE</span>
          <strong>The code is the product.</strong>
          <span>BUILT IN THE OPEN</span>
        </div>
      </div>
    </footer>
  )
}

export function App() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".reveal")
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("revealed"))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Header />
      <Hero />
      <Extensions />
      <Principles />
      <BuildSection />
      <Footer />
    </>
  )
}
