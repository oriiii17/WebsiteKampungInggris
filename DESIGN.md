---
name: Sapen English
description: A shared community workbook for learning English in Kampung Sapen.
colors:
  ink: "#20251f"
  body: "#3d4038"
  muted: "#625f54"
  forest: "#244b3a"
  forest-deep: "#183b2d"
  forest-soft: "#e6eadf"
  paper: "#f3e9d5"
  paper-light: "#fdf9f0"
  paper-shadow: "#e9ddc6"
  tomato: "#ba472f"
  tomato-deep: "#943520"
  saffron: "#e5bf4f"
  rule: "#d2c5ad"
  rule-strong: "#b8aa8e"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(3.2rem, 6.6vw, 6rem)"
    fontWeight: 650
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.2rem, 4vw, 3.6rem)"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 800
    lineHeight: 1.4
rounded:
  control: "0.55rem"
  badge: "0.45rem"
  card: "0.9rem"
  spread: "1.1rem"
spacing:
  control-height: "44px"
  index-row: "4.4rem"
  page-gutter: "clamp(1.35rem, 4.5vw, 4.4rem)"
components:
  button-primary:
    backgroundColor: "{colors.tomato}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.forest}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "48px"
  card:
    backgroundColor: "{colors.paper-light}"
    rounded: "{rounded.card}"
---

# Design System: Sapen English

## Overview

**Creative North Star: "Buku Latihan Bersama"**

Sapen English feels like a community workbook passed around Kampung Sapen. Warm paper forms the page, forest ink organizes the lesson, tomato red marks the next action, and saffron calls out a useful note. Editorial Fraunces headings give the schoolbook reference an adult, considered voice; DM Sans keeps lessons and controls clear.

The public home page opens as a two-page spread, with the offer on one leaf and a ruled index of learning routes on the other. Across the wider product, paper surfaces, page edges, printed labels, and ruled hierarchy carry that workbook language into learning and access screens. The actual admin dashboard still contains its own operational layouts and literal utility styling, so do not assume every screen is a two-page spread.

**Key Characteristics:**
- Printed workbook surfaces with clear page and section rhythm.
- Editorial display type paired with practical sans-serif interface text.
- Forest structure, restrained tomato actions, and small saffron annotations.
- Standard semantic links, buttons, and forms with visible keyboard focus.

## Colors

The palette combines warm parchment with forest green and a small amount of tomato and saffron for emphasis.

### Primary
- **Forest Ink** (`{colors.forest}`): Main structural color for navigation, headings, selected states, and secondary actions.
- **Tomato Red** (`{colors.tomato}`): Primary calls to action and selective emphasis; use white text on filled actions.
- **Saffron Note** (`{colors.saffron}`): Small highlights, underlines, and page annotations.

### Neutral
- **Warm Parchment** (`{colors.paper}`): Main page background.
- **Light Page** (`{colors.paper-light}`): Card and inner-page surface.
- **Page Edge** (`{colors.paper-shadow}`): Scroll track and supporting paper tone.
- **Forest Deep** (`{colors.forest-deep}`): Pressed and hover states for forest controls.
- **Forest Wash** (`{colors.forest-soft}`): Quiet green badge and selected surfaces.
- **Strong Ink** (`{colors.ink}`): Headings and primary text.
- **Lesson Copy** (`{colors.body}`): Paragraph text.
- **Supporting Ink** (`{colors.muted}`): Metadata and secondary copy.
- **Page Rule** (`{colors.rule}`) and **Strong Rule** (`{colors.rule-strong}`): Dividers, borders, and page edges.

**The Margin Note Rule.** Keep saffron and tomato accents selective; neither should replace the parchment or forest as a large page field.

## Typography

**Display Font:** Fraunces (with Georgia, serif fallback)  
**Body Font:** DM Sans (with system-ui, -apple-system, sans-serif fallback)

**Character:** Fraunces brings a printed editorial voice to headings, while DM Sans keeps navigation, lessons, and controls compact and readable.

### Hierarchy
- **Display** (650, `clamp(3.2rem, 6.6vw, 6rem)`, 0.98 line-height): Large workbook and hero headings; the homepage title reduces to a compact mobile scale.
- **Headline** (650, `clamp(2.2rem, 4vw, 3.6rem)`, 1.08 line-height): Section titles and prominent page headings.
- **Title** (650, 1.5–2.25rem, 1.08 line-height): Local headings and page subheads.
- **Body** (400, 16px, 1.6 line-height): Main reading text in DM Sans.
- **Label** (800, 0.72rem): Compact section badges and printed-note labels; use sentence case except for utility metadata that is explicitly uppercase.

**The Two-Voice Rule.** Reserve Fraunces for headings and editorial marks; use DM Sans for reading copy and controls.

## Layout

The public workbook uses a centered wrap capped at 76rem with 1rem minimum side gutters. The desktop opening spread divides into two equal leaves; below 760px it becomes a vertical stack with a horizontal page seam. Desktop leaf padding scales from 1.35rem to 4.4rem, while phone leaves use about 1rem vertical and 1.1rem horizontal padding. Sections use generous vertical spacing that scales from 3.5rem to 7rem. Ruled index rows are at least 4.4rem on wide screens and 3.15rem on phones. Keep phone controls at least 44px high.

## Elevation & Depth

Depth is a hybrid of paper layering, visible page rules, a central book seam, and restrained soft shadows. Use shadows to lift the spread and paper cards slightly from the background; avoid hard offset shadows. The main page shadow is `0 12px 35px rgba(52, 43, 29, 0.08)`, and the spread shadow is `0 18px 42px rgba(52, 43, 29, .13)`.

**The Printed Page Rule.** Let paper contrast and page edges carry the structure; shadows stay soft and subordinate.

## Shapes

Use gently rounded workbook edges: controls around 0.55rem, badges around 0.45rem, cards around 0.9rem, and the large opening spread around 1.1rem. Inputs use a defined warm rule and a forest focus treatment; workbook index rows stay square and ruled, like entries on a printed contents page. Avoid glass effects and ornamental texture overlays.

## Components

### Buttons
- **Primary:** Tomato fill, white bold text, rounded corners, at least 44px high; hover shifts to deep tomato and lifts slightly on the homepage.
- **Secondary:** Light paper fill with forest text and border; hover fills with forest and reverses to white text where the shared outline primitive is used.
- **Focus:** A visible 3px tomato outline with 3px offset for keyboard focus.

### Cards and page spreads
- **Cards:** Light page surface, warm border, about 0.9rem radius, and a soft page shadow.
- **Opening spread:** Two paper leaves in a ruled outer frame, with a central seam on desktop and a horizontal seam on phones.

### Index rows and tabs
- **Index rows:** Ruled links with a tomato letter mark, forest route icon, and saffron-tinted hover surface. Keep a comfortable touch height and clear text hierarchy.
- **Tabs and badges:** Compact forest text on a quiet green surface with a thin border.

### Forms
- **Fields:** Light page surface, strong warm border, readable placeholder, at least 44px high, and forest focus border/ring.
- **Navigation:** Keep route changes as semantic links and actions as buttons; retain the established mobile navigation behavior.

## Do's and Don'ts

- **Do** use Fraunces for editorial headings and DM Sans for interface and lesson text.
- **Do** preserve warm paper, forest ink, and clear rules as the dominant page language.
- **Do** keep primary tomato actions legible with white text and visible hover/focus states.
- **Do** maintain 44px minimum touch targets on phone controls.
- **Do** use Lucide icons consistently for interface symbols.
- **Don't** use purple-blue neon gradients, excessive glass effects, or AI-template styling.
- **Don't** make tomato or saffron the dominant page background.
- **Don't** assume every operational screen shares the public homepage's spread layout.
- **Don't** use emoji as interface icons.
