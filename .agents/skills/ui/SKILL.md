---
name: ui
description: Use when building, modifying, reviewing, or polishing frontend UI code. Applies to web apps, dashboards, tools, forms, tables, layouts, and design-system work where the interface should avoid generic AI-generated aesthetics and feel practical, restrained, and human-designed.
---

# UI

You are generating frontend UI code. "Codex UI" is the default AI aesthetic: soft gradients, floating panels, eyebrow labels, decorative copy, hero sections, oversized rounded corners. Recognize these patterns, avoid them completely, and build interfaces that feel human-designed, functional, and honest. Think Linear. Think Raycast. Think Stripe. Think GitHub.

## Hard No

Ban these categorically:

- No oversized rounded corners: max 8-12px on cards, 6-8px on badges
- No floating glassmorphism shells
- No soft corporate gradients used to fake taste
- No generic dark SaaS UI composition
- No decorative sidebar blobs
- No serif headline plus system sans fallback combo
- No metric-card grid as the first instinct
- No fake charts that exist only to fill space
- No glows, blur haze, frosted panels, or conic-gradient donuts as decoration
- No "hero section" inside an internal UI
- No overpadded layouts
- No ornamental labels like "live pulse" or "night shift" unless from the product voice
- No generic startup copy
- No `<small>` eyebrow headers, no rounded `<span>` elements
- No colors going towards blue; dark muted colors are best
- No dramatic box shadows: max `0 2px 8px rgba(0, 0, 0, 0.1)`
- No transform animations on hover
- No status indicators with `::before` pseudo-elements
- No pipeline bars with gradient fills
- No KPI cards in a grid as the default dashboard layout

## Component Rules

Keep it normal:

- Sidebars: 240-260px fixed, solid background, simple border-right, no floating shells
- Headers: simple text, no eyebrows, no uppercase labels, no gradient text
- Buttons: solid fills or simple borders, 8-10px radius max, no pill shapes, no gradients
- Cards: simple containers, 8-12px radius, subtle borders, no shadows over 8px blur
- Forms: standard inputs, clear labels above fields, no floating labels
- Tables: clean rows, simple borders, subtle hover, left-aligned text
- Tabs: simple underline or border indicator, no pill backgrounds, no sliding animations
- Typography: system fonts or simple sans-serif, 14-16px body, clear hierarchy
- Spacing: consistent scale of 4, 8, 12, 16, 24, and 32px
- Transitions: 100-200ms ease, no bouncy animations, simple opacity and color changes
- Containers: max-width 1200-1400px, centered, standard padding
- Toolbars: simple horizontal layout, 48-56px height, no decorative elements

## Master Rule

If a UI choice feels like a default AI move, ban it and pick the harder, cleaner option. Try to replicate designer-made Figma components; don't invent decorative patterns.

## Color

Use existing project colors first. If none exist, pick dark muted palettes with no blues.
