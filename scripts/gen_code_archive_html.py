#!/usr/bin/env python3
"""Build the Malète Kits complete source archive HTML (Creative Flow pipeline).

Reads every git-tracked text file, groups it into parts, and emits a single
flowing HTML document (cover -> TOC -> code parts -> appendix) for
html2pdf-next.js --nopaged conversion.
"""
import html
import os
import subprocess
from datetime import date

ROOT = "/home/z/my-project"
OUT = "/home/z/my-project/download/malete-kits-source-archive.html"

EXCLUDED = {
    "bun.lock": "Dependency lockfile (machine-generated, ~10k lines) - intentionally omitted",
    "mini-services/.gitkeep": "Empty directory placeholder - no content to print",
}
BINARY_EXT = {".png", ".jpg", ".jpeg", ".ico", ".ttf", ".woff", ".woff2", ".webp"}

# path -> one-line description (conservative, name/verified-fact based)
DESC = {
    "README.md": "Project overview: stack, setup commands, environment variables, deployment notes and the live URL / health probe.",
    "TESTING-CHECKLIST.md": "Manual QA checklist used before each release: storefront flow, checkout, admin dashboard and API behaviour.",
    ".gitignore": "Git exclusion rules (node_modules, .next, .env secrets, derived fonts and build output).",
    "Caddyfile": "Caddy reverse-proxy configuration used by the sandbox preview environment.",
    "package.json": "Project manifest: dependencies, scripts and the Next.js/Prisma toolchain versions.",
    "next.config.ts": "Next.js configuration (App Router build settings, image handling).",
    "tsconfig.json": "TypeScript compiler configuration and path aliases.",
    "tailwind.config.ts": "Tailwind CSS theme: brand colors, fonts and plugin setup.",
    "postcss.config.mjs": "PostCSS pipeline configuration for Tailwind.",
    "eslint.config.mjs": "ESLint flat-config linting rules.",
    "components.json": "shadcn/ui generator configuration (component style, icon library, aliases).",
    "vercel.json": "Vercel deployment configuration - the production build command (prisma generate + next build).",
    "netlify.toml": "Netlify fallback deployment configuration.",
    "public/robots.txt": "Search-engine crawler rules for the live site.",
    "public/logo.svg": "Storefront logo (vector SVG).",
    "public/logo-mk.svg": "Malète Kits brand logo mark (vector SVG).",
    "prisma/schema.prisma": "Development database schema: products, orders, order items, settings and notification models.",
    "prisma/schema.prod.prisma": "Production database schema used by the Vercel build command.",
    "prisma/seed.ts": "Database seed script: initial catalog, settings and admin data.",
    "prisma/migrations/0_init/migration.sql": "Initial SQL migration generated from the Prisma schema.",
    "src/lib/db.ts": "Prisma client singleton shared by all API routes.",
    "src/lib/auth.ts": "Admin authentication helpers (session/cookie handling for the dashboard).",
    "src/lib/settings.ts": "Store settings access layer - includes the store contact details (WhatsApp number, email, OPay account).",
    "src/lib/whatsapp.ts": "Builds WhatsApp deep links used to confirm orders with the store.",
    "src/lib/email.ts": "Order confirmation and notification email sending (may include emoji in content templates).",
    "src/lib/notifications.ts": "In-app/admin notification model helpers.",
    "src/lib/orders-api-helpers.ts": None,  # placeholder, replaced below
    "src/lib/api-helpers.ts": "Shared JSON response, validation and error helpers for the API routes.",
    "src/lib/cart-store.ts": "Client-side cart state store.",
    "src/lib/client-utils.ts": "Client-side utility functions (formatting, URL helpers).",
    "src/lib/constants.ts": "Shared constants (catalog groups, brands, static labels).",
    "src/lib/money.ts": "Naira money formatting and minor-unit conversion helpers.",
    "src/lib/pricing.ts": "Price calculation helpers for products and order totals.",
    "src/lib/order-number.ts": "Human-readable order number generation.",
    "src/lib/rate-limit.ts": "In-memory rate limiting for public API endpoints.",
    "src/lib/validation.ts": "Input validation schemas/helpers for order and contact submissions.",
    "src/lib/utils.ts": "shadcn/ui class-name merge utility (cn).",
    "src/hooks/use-mobile.ts": "Responsive breakpoint hook (shadcn/ui).",
    "src/hooks/use-toast.ts": "Toast notification hook (shadcn/ui).",
    "src/app/layout.tsx": "Root layout: fonts, metadata, global providers.",
    "src/app/page.tsx": "Home page entry - renders the storefront application shell.",
    "src/app/globals.css": "Global stylesheet: Tailwind layers, CSS variables, brand typography.",
    "src/app/api/route.ts": "API root index route.",
    "src/app/api/health/route.ts": "Deployment health-check endpoint (used to verify Vercel deploys).",
    "src/app/api/meta/route.ts": "Public store metadata endpoint (name, contact channels).",
    "src/app/api/products/route.ts": "Public product catalog endpoint.",
    "src/app/api/products/[slug]/route.ts": "Single product detail endpoint.",
    "src/app/api/orders/route.ts": "Order submission endpoint (creates orders, triggers notifications).",
    "src/app/api/orders/track/route.ts": "Order tracking lookup endpoint for customers.",
    "src/app/api/admin/login/route.ts": "Admin login endpoint.",
    "src/app/api/admin/logout/route.ts": "Admin logout endpoint.",
    "src/app/api/admin/me/route.ts": "Current admin session endpoint.",
    "src/app/api/admin/orders/route.ts": "Admin order listing/management endpoint.",
    "src/app/api/admin/orders/[id]/route.ts": "Admin single-order actions endpoint.",
    "src/app/api/admin/orders/[id]/resend-email/route.ts": "Resend order confirmation email endpoint.",
    "src/app/api/admin/products/route.ts": "Admin product CRUD endpoint.",
    "src/app/api/admin/products/stock/route.ts": "Admin stock level update endpoint.",
    "src/app/api/admin/settings/route.ts": "Admin store-settings endpoint (contact info, payment details).",
    "src/app/api/admin/stats/route.ts": "Admin dashboard statistics endpoint.",
    "src/app/api/admin/notifications/route.ts": "Admin notifications endpoint.",
    "src/components/mk/meta-context.tsx": "Storefront metadata context provider (live store settings on the client).",
    "src/components/mk/header.tsx": "Storefront header/navigation bar.",
    "src/components/mk/footer.tsx": "Storefront footer - renders store contact info (WhatsApp, email, OPay).",
    "src/components/mk/product-card.tsx": "Catalog product card component.",
    "src/components/mk/views/home-view.tsx": "Landing view: hero, featured teams and catalog entry points.",
    "src/components/mk/views/catalog-view.tsx": "Catalog browsing view (club and national team kits).",
    "src/components/mk/views/product-view.tsx": "Product detail view (sizes, prices, add to cart).",
    "src/components/mk/views/cart-view.tsx": "Shopping cart view.",
    "src/components/mk/views/checkout-view.tsx": "Checkout view: customer details, OPay payment info, WhatsApp confirmation.",
    "src/components/mk/views/confirmation-view.tsx": "Order confirmation view.",
    "src/components/mk/views/track-view.tsx": "Customer order tracking view.",
    "src/components/mk/views/contact-view.tsx": "Contact page view (store contact channels).",
    "src/components/admin/admin-app.tsx": "Admin app shell/routing.",
    "src/components/admin/admin-dashboard.tsx": "Admin dashboard container (tabs, session guard).",
    "src/components/admin/orders-tab.tsx": "Admin orders management tab.",
    "src/components/admin/inventory-tab.tsx": "Admin inventory/stock tab.",
    "src/components/admin/settings-tab.tsx": "Admin settings tab - edits store contact and payment details.",
    "src/components/admin/notifications-tab.tsx": "Admin notifications tab.",
    "scripts/api-smoke-test.sh": "Shell smoke test that probes the live API endpoints.",
    "scripts/build-brand-assets.py": "Generates the brand asset pack (icons, favicon, OG cover) from the logo.",
    "scripts/process-brand-logo.py": "Processes the raw brand logo into web-ready variants.",
    "scripts/deploy-db.sh": "Database deployment helper (schema push/migrate against production).",
    "scripts/download_fonts.sh": "Downloads the brand webfonts (Archivo, Oswald).",
    "scripts/download_images.sh": "Downloads product/hero images into public/images.",
    "scripts/optimize_images.js": "Image optimization pipeline (webp conversion, resizing).",
    "scripts/preview-payment-email.ts": "Renders a local preview of the payment confirmation email template.",
    "scripts/verify-prod.ts": "Production verification script (API + settings checks against the live site).",
    "scripts/imgsearch/run_remaining.sh": "Runs the remaining image-search queries in batches.",
    "examples/websocket/frontend.tsx": "Scaffold example: WebSocket client component (template boilerplate).",
    "examples/websocket/server.ts": "Scaffold example: WebSocket server (template boilerplate).",
    "tests/database-runtime-build.sh": "CI check: build with database runtime dependencies.",
    "tests/python-runtime-build.sh": "CI check: Python runtime availability during build.",
    "tests/python-runtime-container.sh": "CI check: Python runtime inside the build container.",
}

LANG = {".ts": "TypeScript", ".tsx": "TypeScript (TSX)", ".js": "JavaScript", ".mjs": "ES Module",
        ".py": "Python", ".sh": "Shell", ".json": "JSON", ".md": "Markdown", ".css": "CSS",
        ".prisma": "Prisma schema", ".sql": "SQL", ".toml": "TOML", ".txt": "Text",
        ".svg": "SVG", ".gitignore": "Config"}


def lang_of(path):
    base = os.path.basename(path)
    if base == "Caddyfile":
        return "Caddy config"
    if base == ".gitignore":
        return "Git config"
    return LANG.get(os.path.splitext(base)[1], "Text")


def tracked():
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout
    return [l.strip() for l in out.splitlines() if l.strip()]


def read_code(path):
    full = os.path.join(ROOT, path)
    with open(full, "r", encoding="utf-8", errors="replace") as f:
        txt = f.read()
    txt = txt.replace("\t", "  ")
    lines = txt.split("\n")
    if lines and lines[-1] == "":
        lines = lines[:-1]
    return lines


def esc_line(s):
    s = "".join(ch for ch in s if ord(ch) >= 32 or ch in "\t")
    return html.escape(s, quote=False) or "\u00a0"


def stat(path):
    full = os.path.join(ROOT, path)
    return os.path.getsize(full)


def fmt_kb(n):
    return f"{n / 1024:.1f} KB" if n >= 1024 else f"{n} B"


def build_parts():
    files = tracked()
    fs = set(files)

    def glob(prefix, exts=None):
        res = sorted(f for f in files if f.startswith(prefix)
                     and (exts is None or os.path.splitext(f)[1] in exts))
        return res

    lib_files = glob("src/lib/")
    hooks_files = glob("src/hooks/")
    api_files = glob("src/app/api/")
    mk_files = glob("src/components/mk/")
    admin_files = glob("src/components/admin/")
    ui_files = glob("src/components/ui/")
    root_app = ["src/app/layout.tsx", "src/app/page.tsx", "src/app/globals.css"]
    scripts_root = sorted(f for f in files if f.startswith("scripts/") and "/" == f[len("scripts/")-1:len("scripts/")] and f.count("/") == 1)
    imgsearch = sorted(f for f in files if f.startswith("scripts/imgsearch/"))
    config_files = [".gitignore", "Caddyfile", "package.json", "next.config.ts", "tsconfig.json",
                    "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", "components.json",
                    "vercel.json", "netlify.toml", "public/robots.txt", "public/logo.svg", "public/logo-mk.svg"]
    parts = [
        ("A", "Project Documentation", "The repository readme and the manual QA checklist that govern releases of the storefront.",
         ["README.md", "TESTING-CHECKLIST.md"], True),
        ("B", "Configuration & Deployment", "Toolchain configuration, deployment settings and the static brand assets tracked at the repository root and in public/.",
         config_files, True),
        ("C", "Database - Prisma Schema & Migrations", "Data models for products, orders, order items, store settings and notifications, plus the initial SQL migration and seed script.",
         ["prisma/schema.prisma", "prisma/schema.prod.prisma", "prisma/seed.ts",
          "prisma/migrations/0_init/migration.sql"], True),
        ("D", "Core Libraries & Hooks", "Shared server-side libraries (database access, auth, settings, pricing, WhatsApp links, email, rate limiting) and the client hooks.",
         lib_files + hooks_files, True),
        ("E", "App Pages & API Routes", "The Next.js App Router entry points and every HTTP API route - public catalog/order endpoints, the health probe, and the protected admin API surface.",
         root_app + api_files, True),
        ("F", "Storefront Components", "The customer-facing single-page storefront: header, footer, catalog, product, cart, checkout (OPay + WhatsApp confirmation), tracking and contact views.",
         mk_files, True),
        ("G", "Admin Dashboard", "The owner-facing dashboard: order management, inventory/stock control, store settings (contact & payment details) and notifications.",
         admin_files, True),
        ("H", "UI Component Library (shadcn/ui)", "The pre-built, accessible UI primitives (shadcn/ui + Radix) that the storefront and dashboard are composed from. Listed in full for completeness; they are standard library boilerplate.",
         ui_files, False),
        ("I", "Build, Data & Operations Scripts", "Automation for brand assets, image optimization, font/image downloads, database deployment, API smoke tests, production verification and runtime CI checks - plus the image-search keyword datasets used to source product photography.",
         scripts_root + imgsearch + sorted(f for f in files if f.startswith("tests/")), "group"),
        ("J", "Example Integrations", "Scaffold example code shipped with the starter template (WebSocket demo).",
         ["examples/websocket/frontend.tsx", "examples/websocket/server.ts"], True),
    ]
    return files, fs, parts, imgsearch


def main():
    files, fs, parts, imgsearch = build_parts()
    today = date.today().strftime("%d %B %Y")

    covered = set()
    for _, _, _, fl, _ in parts:
        covered.update(fl)
    binaries = [f for f in files if os.path.splitext(f)[1] in BINARY_EXT]
    leftovers = [f for f in files if f not in covered and f not in binaries and f not in EXCLUDED]
    if leftovers:
        print("WARNING - files not covered by any part:", leftovers)

    total_lines = 0
    file_stats = {}
    for p in covered:
        lines = read_code(p)
        file_stats[p] = {"lines": len(lines), "size": stat(p), "lang": lang_of(p)}
        total_lines += len(lines)
    all_files = [p for _, _, _, fl, _ in parts for p in fl]
    fid = {p: f"f{i}" for i, p in enumerate(all_files)}

    # ---------- HTML ----------
    o = []
    a = o.append
    a("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Malète Kits - Complete Project Source &amp; File Archive</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap" rel="stylesheet">
<style>
@page { size: 720px 1020px; margin: 44px 0 48px 0; }
@page coverpage { size: 720px 1020px; margin: 0; }
:root {
  --page-bg: #f6f7f7; --section-bg: #eeeff0; --card-bg: #e8ebed; --stripe: #f1f2f3;
  --header-fill: #415864; --cover-block: #48616e; --border: #acc1cc; --icon: #4c89a8;
  --accent: #3391bf; --text: #1e2021; --muted: #80878a;
}
html, body { margin: 0; padding: 0; width: 720px; background: var(--page-bg); color: var(--text);
  font-family: 'Inter', 'Noto Sans SC', 'DejaVu Sans', sans-serif; line-break: strict; word-break: normal; overflow-wrap: break-word; }
@media screen {
  html { height: auto; display: flex; justify-content: center; background: #d8dcde; }
  body { margin: 20px auto; box-shadow: 0 0 40px rgba(0,0,0,.18); }
}
/* ---------- cover ---------- */
.cover { page: coverpage; width: 720px; height: 1020px; position: relative; background: var(--page-bg);
  box-sizing: border-box; break-after: page; border: none; outline: none; box-shadow: none; }
.cov-l1 { position: absolute; inset: 0; overflow: hidden; z-index: 1;
  background-image: linear-gradient(rgba(65,88,100,.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(65,88,100,.05) 1px, transparent 1px);
  background-size: 66px 66px; }
.cov-l2 { position: absolute; inset: 0; z-index: 2; }
.vline { position: absolute; left: 86px; top: 102px; bottom: 102px; width: 8px; background: var(--header-fill); }
.cov-l3 { position: absolute; inset: 0; z-index: 3; font-family: 'Inter', 'Noto Sans SC', 'DejaVu Sans', sans-serif; }
.kicker { position: absolute; left: 166px; top: 148px; max-width: 470px; font-size: 12.5px; font-weight: 500;
  letter-spacing: 4px; text-transform: uppercase; color: var(--accent); opacity: .85; }
.hero { position: absolute; left: 166px; top: 268px; max-width: 494px; font-size: 58px; font-weight: 900;
  line-height: 1.12; color: var(--text); letter-spacing: -0.5px; }
.hero-sub { position: absolute; left: 166px; top: 360px; max-width: 494px; font-size: 17px; font-weight: 600; color: var(--header-fill); letter-spacing: .3px; }
.summary { position: absolute; left: 166px; top: 470px; max-width: 440px; font-size: 13.5px; line-height: 1.7; color: var(--text); opacity: .85; }
.meta { position: absolute; left: 166px; top: 700px; max-width: 470px; }
.meta-row { margin-bottom: 17px; }
.meta-label { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
.meta-val { font-size: 13.5px; font-weight: 600; color: var(--text); }
.cov-foot { position: absolute; left: 166px; bottom: 64px; right: 60px; font-size: 10.5px; letter-spacing: 2.5px;
  text-transform: uppercase; color: var(--muted); opacity: .75; }
/* ---------- TOC ---------- */
.toc-page { padding: 0 52px; break-after: page; }
.toc-kicker { font-size: 10.5px; letter-spacing: 3px; text-transform: uppercase; color: var(--accent); font-weight: 600; margin: 10px 0 6px; }
.toc-title { font-size: 26px; font-weight: 900; margin: 0 0 6px; }
.toc-note { font-size: 11px; color: var(--muted); line-height: 1.55; margin-bottom: 14px; }
.toc-cols { display: flex; gap: 18px; align-items: flex-start; }
.toc-col { flex: 1 1 0; min-width: 0; }
.t-part { display: block; break-inside: avoid; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--header-fill); margin: 10px 0 4px; border-bottom: 1.5px solid var(--border); padding-bottom: 3px; }
.t-entry { display: flex; justify-content: space-between; gap: 6px; font-size: 10px; color: var(--text); margin-bottom: 2px; }
.t-entry .p { overflow-wrap: anywhere; }
.t-entry .n { color: var(--muted); white-space: nowrap; }
/* ---------- flowing body ---------- */
.main-content { padding: 0 52px; }
p, li, td { line-break: strict; }
.body-text { font-size: 12.8px; line-height: 1.68; color: var(--text); margin: 0 0 10px; text-align: left; }
.part-head { break-after: avoid; break-inside: avoid; margin: 26px 0 4px; }
.part-tag { display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
  color: #fff; background: var(--header-fill); padding: 4px 10px; border-radius: 3px; }
.part-title { font-size: 21px; font-weight: 800; margin: 9px 0 5px; }
.part-desc { font-size: 12.2px; line-height: 1.6; color: var(--muted); margin: 0 0 14px; }
.file-block { margin-bottom: 18px; }
.file-head { break-after: avoid; break-inside: avoid; display: flex; justify-content: space-between; align-items: baseline;
  gap: 10px; background: var(--section-bg); border-left: 3px solid var(--icon); padding: 7px 12px; border-radius: 3px 3px 0 0; }
.fpath { font-family: 'DejaVu Sans Mono', 'Sarasa Mono SC', 'Noto Color Emoji', monospace; font-size: 12px; font-weight: 700; color: var(--header-fill); overflow-wrap: anywhere; }
.fmeta { font-size: 10px; color: var(--muted); white-space: nowrap; }
.fdesc { font-size: 11.3px; line-height: 1.55; color: var(--text); background: var(--stripe);
  border-left: 3px solid var(--border); padding: 6px 12px; margin: 0; }
.code { counter-reset: l; background: var(--card-bg); border-left: 3px solid var(--header-fill);
  padding: 9px 12px 10px; border-radius: 0 0 3px 3px; }
.cl { counter-increment: l; position: relative; padding-left: 36px; white-space: pre-wrap; overflow-wrap: break-word;
  font-family: 'DejaVu Sans Mono', 'Sarasa Mono SC', 'Noto Color Emoji', monospace; font-size: 10px; line-height: 1.52; color: var(--text); }
.cl::before { content: counter(l); position: absolute; left: 0; top: 0; width: 26px; text-align: right;
  font-size: 9px; color: var(--icon); opacity: .62; }
/* ---------- appendix ---------- */
a { color: inherit; text-decoration: none; }
.bin-table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }.bin-table thead { display: table-header-group; }
.bin-table tr { break-inside: avoid; }
.bin-table th { background: var(--header-fill); color: #fff; font-size: 10.5px; letter-spacing: 1px;
  text-transform: uppercase; text-align: left; padding: 6px 10px; }
.bin-table td { font-size: 11px; padding: 5px 10px; border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
.bin-table tr:nth-child(even) td { background: var(--stripe); }
.bin-table td.mono { font-family: 'DejaVu Sans Mono', monospace; font-size: 10px; }
.note-box { background: var(--card-bg); border-left: 3px solid var(--accent); padding: 10px 14px; border-radius: 3px;
  font-size: 11.6px; line-height: 1.6; margin: 6px 0 14px; break-inside: avoid; }
</style>
</head>
<body>
<div class="cover">
  <div class="cov-l1"></div>
  <div class="cov-l2"><div class="vline"></div></div>
  <div class="cov-l3">
    <div class="kicker">Complete Project Source &amp; File Archive</div>
    <div class="hero">MALÈTE KITS</div>
    <div class="hero-sub">Online Storefront &amp; Admin Dashboard - Full Codebase</div>
    <div class="summary">Every tracked file of the Malète Kits web application, printed in full: the Next.js storefront for 25/26 club and national team jerseys, the Prisma database layer, the public API, the owner dashboard, WhatsApp order confirmation with OPay payment details, and all build, asset and deployment automation.</div>
    <div class="meta">
      <div class="meta-row"><div class="meta-label">Repository</div><div class="meta-val">github.com/Nifemi07/malete-kits</div></div>
      <div class="meta-row"><div class="meta-label">Live site</div><div class="meta-val">malete-kits.vercel.app</div></div>
      <div class="meta-row"><div class="meta-label">Archive contents</div><div class="meta-val" id="cov-stats">__STATS__</div></div>
    </div>
    <div class="cov-foot">Source archive · __DATE__ · Main branch</div>
  </div>
</div>
""")

    # ----- TOC -----
    a('<div class="toc-page">')
    a('<div class="toc-kicker">Malète Kits · Source Archive</div>')
    a('<div class="toc-title">Contents &amp; File Index</div>')
    a('<div class="toc-note">Every entry below is printed in full later in this document, in the same order. '
      'Binary assets are inventoried in the appendix rather than printed, and machine-generated or secret files are '
      'listed there as excluded. Use the PDF bookmarks panel for one-click navigation to any file.</div>')
    parts_by_key = {k: (k, t, d, fl, b) for k, t, d, fl, b in parts}
    ui_fl = parts_by_key["H"][3]
    scripts_fl = parts_by_key["I"][3]
    scripts_root_fl = [p for p in scripts_fl if not p.startswith("scripts/imgsearch/")]
    img_json = [p for p in imgsearch if p.endswith(".json")]

    def emit_part(key):
        _, title, _d, fl, _b = parts_by_key[key]
        n_lines = sum(file_stats[p]["lines"] for p in fl)
        a(f'<a class="t-part" href="#part-{key}">Part {key} · {html.escape(title)} - '
          f'{len(fl)} file{"s" if len(fl)!=1 else ""}, {n_lines:,} lines</a>')
        for p in fl:
            a(f'<a class="t-entry" href="#{fid[p]}"><span class="p">{html.escape(p)}</span>'
              f'<span class="n">{file_stats[p]["lines"]} ln</span></a>')

    a('<div class="toc-cols">')
    a('<div class="toc-col">')
    emit_part("A")
    emit_part("B")
    a('</div>')
    a('<div class="toc-col">')
    emit_part("C")
    emit_part("D")
    a('</div>')
    a('</div></div>')
    a('<div class="toc-page">')
    a('<div class="toc-cols">')
    a('<div class="toc-col">')
    emit_part("E")
    emit_part("F")
    a('</div>')
    a('<div class="toc-col">')
    emit_part("G")
    ui_lines = sum(file_stats[p]["lines"] for p in ui_fl)
    a(f'<a class="t-part" href="#part-H">Part H · UI Component Library (shadcn/ui) - '
      f'{len(ui_fl)} files, {ui_lines:,} lines</a>')
    a(f'<a class="t-entry" href="#part-H"><span class="p">src/components/ui/ … all 48 shadcn/ui components</span>'
      f'<span class="n">{ui_lines:,} ln</span></a>')
    i_lines = sum(file_stats[p]["lines"] for p in scripts_fl)
    a(f'<a class="t-part" href="#part-I">Part I · Build, Data &amp; Operations Scripts - '
      f'{len(scripts_fl)} files, {i_lines:,} lines</a>')
    for p in scripts_root_fl:
        a(f'<a class="t-entry" href="#{fid[p]}"><span class="p">{html.escape(p)}</span>'
          f'<span class="n">{file_stats[p]["lines"]} ln</span></a>')
    a(f'<a class="t-entry" href="#{fid[img_json[0]]}"><span class="p">scripts/imgsearch/ … 17 search-keyword datasets</span>'
      f'<span class="n">{sum(file_stats[p]["lines"] for p in img_json):,} ln</span></a>')
    for p in [p for p in scripts_fl if p.startswith("tests/")]:
        a(f'<a class="t-entry" href="#{fid[p]}"><span class="p">{html.escape(p)}</span>'
          f'<span class="n">{file_stats[p]["lines"]} ln</span></a>')
    emit_part("J")
    a('<span class="t-part">Appendix · Binary Assets &amp; Excluded Files</span>')
    a(f'<span class="t-entry"><span class="p">Binary asset inventory (images, icons, fonts)</span>'
      f'<span class="n">{len(binaries)} files</span></span>')
    a(f'<span class="t-entry"><span class="p">Excluded generated / secret files</span>'
      f'<span class="n">{len(EXCLUDED)} files</span></span>')
    a('</div>')
    a('</div></div>')

    # ----- body -----
    a('<div class="main-content">')
    a('<div class="part-head" style="margin-top:0"><span class="part-tag">Overview</span>'
      '<div class="part-title">What This Document Contains</div></div>')
    a('<div class="body-text">This archive is a complete, faithful snapshot of the Malète Kits codebase as it exists in the '
      'Git repository <b>Nifemi07/malete-kits</b> on the <b>main</b> branch. The project is a Next.js 16 (App Router, Turbopack) '
      'e-commerce application written in TypeScript, styled with Tailwind CSS 4 and shadcn/ui components, with data persisted '
      'through Prisma. Customers browse club and national-team jerseys, add kits to a cart, check out against the store\'s OPay '
      'payment details, and confirm orders over WhatsApp; the owner manages everything from a password-protected dashboard with '
      'order, inventory, settings and notifications tabs. Deployment targets Vercel, where the production build runs '
      '<b>prisma generate</b> followed by <b>next build</b> as defined in <b>vercel.json</b>.</div>')
    a('<div class="body-text">Each file is reproduced verbatim - every byte of source code, comments and formatting included, '
      'with line numbers in the left gutter for reference during reviews or hand-offs. Files are grouped into ten parts that '
      'mirror the architecture: documentation, configuration, database, core libraries, app routes, storefront, admin dashboard, '
      'UI library, operations scripts and examples. A one-line note above each listing explains the file\'s role in the system. '
      'The appendix inventories the binary assets (product photography, hero image, brand icons and the Archivo/Oswald webfonts) '
      'and the files deliberately excluded from printing.</div>')
    a('<div class="note-box"><b>Reading the listings.</b> Gray-shaded blocks are code; the small figures in the left gutter are '
      'line numbers, so "checkout-view.tsx, line 142" means the same thing here as in any editor. Long lines wrap; a wrapped '
      'continuation has no line number of its own. Nothing in these listings has been reformatted, truncated or abridged except '
      'for tab characters, which are shown as two spaces.</div>')

    for key, title, pdesc, fl, blurbs in parts:
        a(f'<div class="part-head" id="part-{key}"><span class="part-tag">Part {key}</span>'
          f'<div class="part-title">{html.escape(title)}</div>'
          f'<div class="part-desc">{html.escape(pdesc)}</div></div>')
        group_start = key == "I"
        for p in fl:
            st = file_stats[p]
            a(f'<div class="file-block" id="{fid[p]}">')
            a(f'<div class="file-head"><span class="fpath">{html.escape(p)}</span>'
              f'<span class="fmeta">{st["lang"]} · {st["lines"]:,} lines · {fmt_kb(st["size"])}</span></div>')
            d = DESC.get(p)
            if d and not p.startswith("scripts/imgsearch/"):
                a(f'<div class="fdesc">{html.escape(d)}</div>')
            lines = read_code(p)
            a('<div class="code">')
            a("".join(f'<div class="cl">{esc_line(l)}</div>' for l in lines))
            a('</div></div>')

    # ----- appendix -----
    a('<div class="part-head"><span class="part-tag">Appendix</span>'
      '<div class="part-title">Binary Assets &amp; Excluded Files</div>'
      '<div class="part-desc">Files tracked in the repository that are not printable text, followed by the files deliberately '
      'left out of this archive. Binary assets are shipped with the deployed site exactly as stored in Git.</div></div>')
    a('<div class="body-text"><b>Binary asset inventory.</b> The table below lists every tracked binary with its role and exact '
      'size, so nothing in the repository is unaccounted for: the hero photograph, 18 product images (one per team kit), the '
      'brand logo and icon set, the favicon/apple-touch icons, the Open Graph share cover, and the Archivo and Oswald webfont '
      'families referenced by Tailwind.</div>')
    a('<table class="bin-table"><thead><tr><th style="width:46%">File</th><th style="width:24%">Asset</th><th style="width:15%">Size</th>'
      '<th style="width:15%">Format</th></tr></thead><tbody>')
    for p in binaries:
        asset = ("Product photo" if "/products/" in p else
                 "Hero image" if "hero" in os.path.basename(p) else
                 "Webfont" if p.endswith((".woff2", ".woff", ".ttf")) else
                 "OG share cover" if "og-cover" in p else
                 "Favicon / app icon" if p.endswith((".ico",)) or "icon" in os.path.basename(p) else
                 "Brand logo" if "logo" in os.path.basename(p) else
                 "Uploaded image" if p.startswith("upload/") else "Image asset")
        a(f'<tr><td class="mono">{html.escape(p)}</td><td>{asset}</td><td>{fmt_kb(stat(p))}</td>'
          f'<td>{os.path.splitext(p)[1].lstrip(".").upper()}</td></tr>')
    a('</tbody></table>')
    a('<div class="body-text"><b>Excluded from printing.</b> Three kinds of files are intentionally not reproduced above: '
      'secrets, machine-generated lockfiles, and empty placeholders. They remain part of the project and are listed here for '
      'completeness.</div>')
    a('<table class="bin-table"><thead><tr><th style="width:46%">File</th><th style="width:54%">Reason</th></tr></thead><tbody>')
    for p, reason in sorted(EXCLUDED.items()):
        a(f'<tr><td class="mono">{html.escape(p)}</td><td>{html.escape(reason)}</td></tr>')
    a('<tr><td class="mono">.env</td><td>Git-ignored environment file containing the DATABASE_URL credential - excluded deliberately, never print secrets</td></tr>')
    a('<tr><td class="mono">node_modules/, .next/, .git/</td><td>Untracked dependency, build and version-control directories - not part of the repository</td></tr>')
    a('</tbody></table>')
    a('</div></body></html>')

    doc = "\n".join(o)
    n_files = len(covered)
    n_bin = len(binaries)
    stats = f"{n_files} source files · {total_lines:,} lines of code · {n_bin} binary assets"
    doc = doc.replace("__STATS__", html.escape(stats)).replace("__DATE__", today)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"written: {OUT}  ({os.path.getsize(OUT) / 1e6:.2f} MB)")
    print(f"parts: {len(parts)} | source files: {n_files} | total code lines: {total_lines:,} | binaries: {n_bin}")
    for key, title, _d, fl, _b in parts:
        print(f"  part {key}: {len(fl)} files, {sum(file_stats[p]['lines'] for p in fl):,} lines - {title}")


if __name__ == "__main__":
    main()
