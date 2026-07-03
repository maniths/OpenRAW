# OpenRAW Design System Guidelines

## 1. Layout & Architecture
- **Viewport:** 100% VH, strictly no vertical scroll on the `body`.
- **Responsiveness:** Fully mobile responsive (panels must collapse or slide in on smaller viewports).
- **Structure:**
  - **Top Navbar:** Thin, containing global app states and export controls.
  - **Left Hand Side (LHS) Panel:** Presets, Version History, Metadata.
  - **Right Hand Side (RHS) Panel:** Main adjustment modules (Scopes, Basics, Tone Curve).
  - **Bottom Navbar:** Image timeline / horizontal filmstrip scroll.
  - **Center Canvas:** Main image viewer (WebGPU context).
- **Component Alignment:** Slider, Label, and Input fields MUST occupy a single horizontal line.

## 2. Color Palette
| Element | Hex Code | Description |
| :--- | :--- | :--- |
| **Canvas Background** | `#191919` | The workspace behind the photo. |
| **Panel Background** | `#2D2D2D` | Navbars, LHS, and RHS backgrounds. |
| **Panel Borders** | `#1E1E1E` | Dividers between panels and structural elements. |
| **Accent Color** | `#4E99A3` | Active states, primary buttons, active tabs. |
| **Input Background** | `#232323` | Background for text inputs and dropdowns. |
| **Icons** | `#9FA0A0` | Default state for SVG icons. |
| **Text Primary** | `#C3C3C3` | Default text color for labels and settings. |

## 3. Typography
- **Global Font Family:** 'DM Sans', sans-serif
- **Main Settings Group (Collapsible):**
  - Font Size: 14px
  - Text Transform: Capitalize first letter
  - Color: `#C3C3C3`
- **Individual Slider Labels:**
  - Font Size: 12px
  - Text Transform: Capitalize first letter
  - Color: `#C3C3C3`
- **RHS Panel Switchable Tabs:**
  - Font Size: 12px
  - Text Transform: UPPERCASE
  - Default Color: `#C3C3C3`
  - Active Color: `#4E99A3`

## 4. Component Standards (Kobalt UI)
- Use **only** Kobalt UI core components.
- Standardize spacing using a 4px/8px grid system.
- All collapsibles (except "Basics") default to a closed state.
- Numeric inputs must validate on blur and step in appropriate increments (e.g., integers for Kelvin, floats for Exposure).

## 5. Performance Constraints
- UI updates must not block the main thread; intense calculations must be offloaded to Web Workers or WebGPU.
- Real-time scope updates (Waveform/Histogram) must read directly from GPU buffers to maintain zero-lag hover sync.
