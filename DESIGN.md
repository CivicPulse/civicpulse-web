---
name: Macon–Bibb community prototype
description: A neighborhood noticeboard for sample community maps and events.
colors:
  canvas: "#f6f1e7"
  paper: "#fffcf6"
  ink: "#173e34"
  muted: "#4c6159"
  sage: "#c7d0b5"
  rust: "#ae583b"
  rust-dark: "#91452e"
  line: "#b8bcb0"
  focus: "#285e4c"
typography:
  display:
    fontFamily: "Unna, Georgia, serif"
    fontSize: "clamp(42px, 6.15vw, 94px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Unna, Georgia, serif"
    fontSize: "clamp(40px, 5vw, 64px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Unna, Georgia, serif"
    fontSize: "29px"
    fontWeight: 700
    lineHeight: 1.08
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  destination:
    fontFamily: "Unna, Georgia, serif"
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.1
  date:
    fontFamily: "Unna, Georgia, serif"
    fontSize: "52px"
    fontWeight: 400
    lineHeight: 1
rounded:
  panel: "0px"
  control: "4px"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  section: "24px"
  wide: "40px"
components:
  button-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-default-hover:
    backgroundColor: "{colors.sage}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  map-destination:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.destination}"
    rounded: "{rounded.panel}"
    padding: "14px 28px"
  calendar-destination:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.paper}"
    typography: "{typography.destination}"
    rounded: "{rounded.panel}"
    padding: "14px 28px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "26px"
---

# Design System: Macon–Bibb community prototype

## Overview

**Creative North Star: "Neighborhood noticeboard"**

The neighborhood noticeboard pairs generous editorial headings with practical, readable controls. Cream paper, forest ink, sage geography and terracotta dates give the community prototype a warm, local character without implying official affiliation.

Rectangular panels and fine dividers organize content. Date columns and map-layer swatches provide useful structure; typography and restrained color carry the hierarchy.

**Key Characteristics:**
- Warm paper and forest ink.
- Unna headings with DM Sans controls and prose.
- Flat rectangular panels and fine dividing rules.
- Geographic layers and event dates remain legible alongside sample-content notices.

## Colors

The palette feels like warm stationery with natural greens and a fired-clay accent. The frontmatter records the normative values extracted from `src/styles/global.css`.

### Primary
- **Forest ink** (`ink`): headings, body text, primary links, selected calendar dates and the map destination bar.
- **Terracotta** (`rust`, `rust-dark`): calendar destination, date columns, event markers and selected-view accents; the darker shade supports hover and small accent text.

### Secondary
- **Sage** (`sage`): geographic destination header, control hover and quiet map framing.

### Neutral
- **Warm canvas** (`canvas`): page ground.
- **Paper** (`paper`): event, calendar and control surfaces; text on dark bars.
- **Muted forest** (`muted`): descriptions and supporting information.
- **Soft rule** (`line`): borders and separators.
- **Focus forest** (`focus`): keyboard outline.

**The Paper Rule.** Use canvas for the page and paper for content surfaces; use sage and rust to distinguish geographic and calendar destinations.

Voting symbology follows the visible `polling_places` and `voting_precincts` renderers from `polling_locations.qgz`, persisted in `src/data/qgis-style.json`: magenta #c51b7d, teal #1b9e77, blue #2166ac, orange #e66101 and gray #4d4d4d; early voting is gold #f5a400. Precinct fill opacity is 89/255, with #374151 outlines at 185/255 opacity. Polling locations reuse the configurable ballot-pin SVG in `styles/polling-place.svg`, sized from the QGIS symbol. Directory symbols match the geographic features. These are data encodings, not global interface accents.

Other map categories carry additional data colors in `src/data/maps.ts`: parks, community spaces, libraries, neighborhoods, trails and events. Those swatches encode feature categories rather than a new interface accent hierarchy. Sample notices use warm sand and brown for a distinct informational surface.

## Typography

**Display Font:** Unna, with Georgia and serif fallbacks; self-hosted weights (400 and 700).
**Body Font:** DM Sans, with sans-serif fallback; self-hosted weights (400, 500 and 600).

Unna gives headings and large dates the character of a printed community notice. DM Sans keeps controls and descriptions direct and readable. Headings use the bold face; date numerals and destination bars use the regular face. No Lora font is imported by the built layout.

### Hierarchy
- **Display:** the home title uses the fluid frontmatter role; at narrow widths it wraps, with an explicit small-screen size (45px) and line height (1.04).
- **Headline:** interior page titles use the fluid headline role. Home destination headings use a larger compact serif heading (44px), reducing with the layout.
- **Title:** event-list headings use the title role; featured events use a slightly tighter variant (27px, line height 1.05).
- **Body:** the base prose role is supplemented by supporting copy (12–18px). Introductory paragraphs use (18px) with a measure of (70ch); long prose is capped at (76ch).
- **Label:** medium-weight sans labels identify fields; navigation uses regular sans text (18px) on desktop.
- **Destination and date:** regular serif destination bars and tabular date numerals. Featured dates grow to (68px); event-list dates use the date role.

**The Two Voices Rule.** Use Unna for headings, dates and destination links; use DM Sans for prose, navigation and controls.

## Layout

The shell has a maximum outer width (1536px), horizontal padding (4.1%) and fixed wide-screen padding (63px) above that width. At (650px) and below it uses (20px) side padding. The desktop masthead is (80px) high; the narrow masthead wraps into a centered brand and a full-width navigation row.

Home destinations use equal columns with a (24px) gap, then stack at (850px) with a (32px) gap. Interior pages maintain the same shell and intro rhythm. The map workspace pairs a (285px) sidebar with flexible geography; the sidebar narrows at (800px), then stacks at (600px). The place directory changes from two columns to one. Calendar and event list form a two-column composition with a (40px) gap, tightening at (1100px) and stacking at (850px).

Recurring spacing steps are captured in frontmatter. Dates occupy an aligned narrow column beside event content. Control dimensions and responsive adjustments remain in component CSS rather than an invented universal grid.

## Elevation & Depth

Application panels are flat: paper, sage and terracotta surfaces, thin borders and separators carry depth without card shadows. The map illustration and actual Leaflet map provide visual texture. Leaflet retains its library popup/control elevation; this is distinct from application panel styling. A calendar-view underline uses an inset box shadow as a selection rule, not raised elevation.

**The Flat Surface Rule.** Use borders and changes of background to separate application panels; reserve map-library popup shadows for the map overlay.

Navigation underlines animate over (180ms) with `cubic-bezier(.16,1,.3,1)`; destination backgrounds change over (160ms ease). Reduced-motion preferences disable transitions and animations and restore automatic scrolling.

## Shapes

Panels and destination bars are rectangular. Form controls have gently eased corners from the control radius. Circular map dots, calendar event dots and the ring around today communicate location or date state. Layer swatches vary by geometry: circle for point, short stroke for line and square for area. Fine (1px) dividers separate sections and date columns.

## Components

### Buttons and destination links

Default buttons use paper, forest text and a soft-rule border; hover uses sage. Primary button links use forest and paper. Both have a minimum height (44px), control corners and the padding recorded in frontmatter. The primary link hover uses a lighter forest. Home destination bars are full-width, square-cornered serif links with a minimum height (56px), a directional inline SVG and separate forest/terracotta fills. They darken or lighten within their own color family on hover.

### Inputs and layer controls

Inputs and selects share paper fill, forest text, a thin soft-rule border and the control radius. Their minimum height is (44px). Native checkboxes use forest accent; layer labels combine a geometry swatch, category name and small description. The whole layer row has a minimum height (55px). Disabled buttons use reduced opacity; unavailable layers use native disabled state.

### Navigation

The bold Unna wordmark anchors a plain sans navigation row. Current and hovered links reveal a terracotta underline from the left. A global focus-visible outline uses focus forest (3px) with an offset (5px); the map preview places its focus outline inside the image. A skip link appears when focused.

### Calendar and event rows

Month and agenda selectors use a terracotta underline for the pressed view. Calendar cells use a forest fill for the selected date, a fine circular ring for today and a dot for sample events. Event rows place the title before category and other metadata, with terracotta date numerals, fine horizontal dividers and native disclosure for details. Downloads and map links remain ordinary readable actions.

### Panels and notices

The calendar month panel uses paper, a thin border and generous padding; the map workspace uses the same flat vocabulary. Events are separated rows rather than individual floating cards. Sample-content notices use sand fill, brown text and a fine warm border. The home map image carries an illustrative-content label; it is not the interactive map itself.

## Do's and Don'ts

### Do:
- Do preserve forest text, cream ground and the sage/terracotta relationship.
- Do keep sample and illustrative-content notices visible as readable text.
- Do use native controls, visible keyboard focus and tabular date numerals.
- Do keep geographic layer swatches consistent with the map features.

### Don't:
- Don't add decorative card shadows or pill-shaped application panels.
- Don't replace Unna headings with a system display face or the obsolete Lora specification.
- Don't imply official affiliation or present the generated preview as geographic evidence.
