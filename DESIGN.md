---
version: 1.0
name: Paciga-design-system
description: "A near-black, monochrome scrollytelling canvas for a premium Slovak funeral & stonemasonry brand. Built on graphite #0c0d0f with warm off-white #f5f5f5 as the ONLY chromatic voice — no color accents anywhere. The historical accent was gold; it was deliberately replaced by white, but CSS variables keep the --gold naming. The system reads as quiet luxury: large Archivo variable type set wide (wdth 110–125), hairline-bordered charcoal panels, desaturated photography under dark gradients, and restrained cinematic motion (Lenis + GSAP ScrollTrigger). Tone is dignified and warm, never salesy — the audience is grieving families, often older, sometimes in crisis at 3 a.m. looking for a phone number."

colors:
  canvas: "#0c0d0f"                       # --bg, page background
  canvas-alt: "#111214"                   # --bg2, alternating sections (nonstop, branches)
  surface-1: "#16181c"                    # --panel, cards
  surface-2: "#191b1e"                    # --panel2, card hover
  hairline: "rgba(255,255,255,0.08)"      # --line, all borders & separators
  hairline-hover: "rgba(245,245,245,0.40)" # card border on hover (0.35–0.45 range)
  ink: "#f5f5f5"                          # --text, primary text AND the accent
  ink-muted: "rgba(245,245,245,0.55)"     # --muted, leads, paragraphs
  ink-dim: "rgba(245,245,245,0.35)"       # --dim, micro-labels, dates
  accent: "#f5f5f5"                       # --gold (name is legacy; value is white)
  accent-soft: "rgba(245,245,245,0.55)"   # --gold-soft
  accent-dim: "rgba(245,245,245,0.18)"    # --gold-dim, quote marks, ghosted marks
  hover-bright: "#ffffff"                 # pure white only as hover state of accent
  on-accent: "#0d0b07"                    # text on white buttons

typography:
  fontFamily: "'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif"
  # Archivo variable, self-hosted woff2 (weight 400–700, width 62.5%–125%).
  # Headings always carry font-variation-settings 'wdth' 110 (--wide);
  # oversized stat numbers use 'wdth' 125 (--xwide). Letter-spacing -0.01em on headings.
  hero-h1:
    fontSize: clamp(40px, 6.4vw, 88px)
    fontWeight: 660
    lineHeight: 1.08
    maxWidth: 13ch
  h2:
    fontSize: clamp(30px, 4.4vw, 54px)
    fontWeight: 640
    lineHeight: 1.08
  h3:
    fontSize: 20-24px
    fontWeight: 640
  quote:
    fontSize: clamp(24px, 3.2vw, 40px)
    fontWeight: 560
    lineHeight: 1.35
  stat-number:
    fontSize: clamp(54px, 7vw, 96px)
    fontWeight: 680
    fontVariation: "'wdth' 125"
    lineHeight: 1
  body:
    fontSize: 16px
    lineHeight: 1.6
  lead:
    fontSize: clamp(16px, 1.4vw, 19px)
    color: ink-muted
    maxWidth: 46-54ch
  eyebrow:
    fontSize: 12px
    letterSpacing: 0.22em
    textTransform: uppercase
    fontWeight: 600
    color: accent
  micro-label:
    fontSize: 11px
    letterSpacing: 0.2em
    textTransform: uppercase
    color: ink-dim

layout:
  container: "min(1240px, calc(100% - 48px)), centered"
  section-padding-y: "clamp(100px, 14vh, 170px)  # hero/quote/CTA up to 190–200px"
  grid-gap: 22px
  card-padding: 26px
  section-head-margin-bottom: 60px

radii:
  card: 18-20px
  pill: 999px          # all buttons and badges are pills
  circle: 50%          # memoriam portraits, pulsing dot
  media-frame: 22px    # fleet video clip-path frame

components:
  button-primary:      # .btn-gold
    style: "white pill, color on-accent, weight 650, padding 16px 30px (lg: 20px 38px)"
    hover: "translateY(-2px), background #ffffff, shadow 0 14px 40px rgba(245,245,245,0.25)"
  link-underline:
    style: "muted text, 1px underline grows left→right on hover via background-size, 0.4s"
  card:
    style: "surface-1 bg, 1px hairline border, radius 18–20px"
    hover: "border brightens to rgba(245,245,245,0.35–0.45), translateY(-5px to -6px), bg surface-2"
  photo-card:          # .svc.has-photo
    style: "cover photo at 0.35 opacity under linear-gradient(180deg, rgba(12,13,15,0.25), rgba(12,13,15,0.92) 78%)"
    hover: "photo opacity 0.55, scale 1.05"
  branch-photo:
    style: "media desaturated: filter saturate(0.5) brightness(0.72); hover eases to saturate(0.85) brightness(0.85)"
  section-header:
    pattern: "eyebrow (uppercase tracked accent) + h2 + .gold-line: 72×2px rule fading right via gradient"
  nav:
    style: "transparent over hero; on scroll: rgba(12,13,15,0.82) + backdrop-blur(14px) + hairline bottom"
  hero:
    style: "100vh video, double gradient shade (90deg dark-left + 180deg fade-to-canvas bottom), left-aligned text block"
  nonstop-dot:
    style: "8px white dot, pulse keyframes (box-shadow ring 0→9px, 2.2s infinite) — the ONLY animated ornament, marks NON STOP availability"
  memoriam-card:
    style: "centered card, 84px circular portrait with hairline ring (initials on radial-gradient #22242a→#131418 when no photo), name h3 18.5px, tracked date in ink-dim"
  quote-block:
    style: "oversized ghost quote mark (130px, accent-dim), words reveal one-by-one on scroll (opacity 0.14 → 1)"
  situ-chips:      # help-center "task-first" pattern (informacie-pre-pozostalych)
    style: "band under hero with micro-label question + pill chips (panel bg, hairline border) anchor-jumping to the matching step; steps carry scroll-margin-top 90px"
  callbar:         # Apple floating-sticky-bar grafted onto Paciga tokens
    style: "fixed bottom bar, rgba(12,13,15,0.9) + blur(12px), hairline top; micro-label left, large wide-set phone right; slides in after ~500px scroll (progressive enhancement, hidden without JS); used on informacie-pre-pozostalych and pohrebne-sluzby"
  first-card-photo:  # .first-card.has-photo — photo variant of the service grid card
    style: "cover photo at 0.32 opacity under dark gradient, min-height 220px, content bottom-aligned; a.first-card variants get hover lift + reveal .fc-go arrow link"
  news-tag:
    style: "uppercase tracked pill chip (11px, hairline border, accent-soft) categorizing news items: Rada / Novinka / Spolupráca"
  memoriam-extras:
    style: "month group headers (.memoriam-month, tracked uppercase dim) and funeral info line on cards (.memoriam-rozlucka, 12.5px dim); parte pages carry schema.org Event JSON-LD, an .ics calendar data-URI link and a copy-link button"

motion:
  stack: "Lenis smooth scroll + GSAP ScrollTrigger; no video loops as decoration — movement comes from code over real photos/video (parallax, pins, reveals)"
  easing: "cubic-bezier(0.2, 0.7, 0.2, 1) for transforms, plain ease for color/opacity"
  duration: "0.3–0.45s micro, 0.5–0.6s media"
  patterns:
    - "hero h1 lines reveal through overflow-hidden line masks"
    - "services: horizontal scroll pinned section with progress hairline (scaleX)"
    - "fleet: video revealed by animating clip-path inset frame"
    - "quote: word-by-word opacity on scroll"
    - "exactly ONE marquee on the page (partners strip) — hard rule"
  accessibility: "reduced-motion and mobile fallbacks drop backdrop-filter and heavy effects"

content-rules:
  - "Slovak. The WEBSITE uses formal 'vy/vám' (vykanie) — dignified register for grieving families. Social content (IG captions, reels) uses informal 'ty/tvoj' (tykanie). Do not mix the two."
  - "No emoji in copy; only functional 📍 before an address is allowed"
  - "CTA phrase: 'Napíš nám. Radi ti poradíme.' — never 'bez záväzku' (client repeatedly deleted it)"
  - "No aggressive or salesy CTAs, no prices in hero — visitors are grieving"
  - "Phone numbers are first-class UI: large (22–42px, wide weight), always clickable"
  - "Real photography only (limuzína, priestory, žula) — no stock, no icon illustrations"

light-mode:  # sperky.html only — Apple-gallery patterns grafted onto Paciga tokens
  scope: "body.page-light; Archivo type and monochrome rule still apply — actions are dark ink pills (.btn-ink), never a hue"
  canvas: "#f9f9f9 — deliberately equals the studio-photo background so product images blend seamlessly (plus a soft radial mask on .tile-media img)"
  parchment: "#f1f0ee — warm alternate tile"
  dark-tiles: "reuse surface-1 (#16181c) for story/CTA tiles; global nav and footer stay dark on light pages"
  pattern: "edge-to-edge .tile sections, zero gap — the surface-color change IS the divider (Apple rhythm)"

hard-rules:
  - "Monochrome only: if a design element needs emphasis, use white, size, or space — never a hue"
  - "Pure #ffffff appears only as a hover state; resting accent is #f5f5f5"
  - "Pure #000000 never appears; darkest value is #0c0d0f"
  - "All borders are 1px hairlines from the rgba(255,255,255,x) family"
  - "Buttons and badges are always pills (999px)"
  - "Audience skews older: keep body ≥16px, contrast high, navigation shallow"
