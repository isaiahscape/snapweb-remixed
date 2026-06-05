# Remix: Snapseed Web Pro 📷

Snapseed Web Pro is a robust, high-performance, client-side digital photo editor and **non-destructive RAW development suite** running directly inside your browser. Built using modern React and Tailwind CSS, it enables seamless professional photo editing workflows, selective adjustment masks, and non-destructive pixel state rendering.

## 🌟 Features

### 1. Camera RAW Developer (12-Bit Matrix Emulation)
Load raw digital negative files such as `.dng`, `.cr2`, `.nef`, and `.arw` formats to unlock granular, high-dynamic-range hardware-level development settings:
*   **White Balance Profiles**: Instantly correct lighting cast with fine-tuned presets:
    *   ☀️ **Sunny**: Golden warming daylight compensation.
    *   ☁️ **Cloudy**: Enhanced warm gold correction for overcast skies.
    *   🌂 **Shade**: High-warmth blue-cast correction for heavy shadow lighting.
    *   💡 **Tungsten**: Cool-blue correction for yellow indoor incandescent bulbs.
    *   🧬 **Fluorescent**: Magenta-heavy compensation for neon gas discharge tubes.
    *   ⚡ **Flash**: Natural neutral-gold correction for portrait skin tones.
*   **Creative Rendering Profiles**: Standard, Vivid, Landscape, Portrait, and Monochrome filters that adjust custom color response matrices.
*   **Exposure Baseline EV**: Fine-grained range adjustments ($\pm3.0$ EV) with precise $0.05$ increments.
*   **Highlights & Shadows Recovery**: Real-time recovery curves to reconstruct blown highlights or gracefully elevate dark shadow noise.

### 2. Precise Global & Selective Adjustments
*   **Film Simulations & Classic Looks Grouping**: Presets are divided into two clear segments—**Film Simulations** (featuring high-fidelity simulations like Portra LKP1, Moody Bronze LKP2, Fuji Superia LFP1, and Fuji Street LFS1) and **Classic Looks** for vintage/creative grades.
*   **Advanced Tonal Contrast**: Multi-band contrast adjustments mapped independently to **High Tones**, **Mid Tones**, and **Low Tones**, coupled with dedicated **Shadow Protection** and **Highlight Protection** sliders to mathematically prevent clipping.
*   **Global Filters**: Master control over Exposure, Contrast, Highlights, Shadows, Saturation, Warmth, Tint, Ambiance, Structure, Sharpening, Dehaze, Grain, and Vignette.
*   **Selective Vector Masks (Local Adjustments)**: Draw high-performance local adjustments utilizing adjustable brush sizes and edge-softening (feather) controls. Layer masks with independent exposure, brightness, and contrast curves.
*   **Interactive Cropping & Straightening**: Crop dimensions dynamically or straighten horizons with a granular $\pm45^{\circ}$ adjustment tool.

### 3. Responsive, Customizable & Touch-Optimized Layout
*   **Adjustable Desktop Sidebar**: Drag to dynamically resize the control panel sidebar (ranging from 260px up to 600px width) on desktop viewports. The resize handle includes high-contrast active states.
*   **Smart Scrollbar Autohide**: Custom-styled scrollbars elegantly fade to transparent after 3 seconds of scroll inactivity to ensure zero visual clutter, with full hover-trigger overrides.
*   **Fluid Layout**: Seamlessly shifts between standard desktop monitor viewports and compact vertical mobile grids. Defaults to the **Tune** adjustments workspace on initial load.
*   **Bottom Adjustment Tray**: Controls and toolbars dynamically reposition to the bottom of the viewport on touch interfaces, keeping the primary focus on the photograph layout without intrusive sidebars.
*   **Touch Comparison**: Hold to Compare fully supports raw touch interactions (`onTouchStart`/`onTouchEnd`), letting you quickly flip between original and processed states easily.

---

## 🛠️ Technology Stack & Architectures

*   **Frontend Library**: React 18+ with TypeScript
*   **Build Bundler**: Vite (fully optimized client-side bundles)
*   **Styling Engine**: Tailwind CSS
*   **Animation Engine**: `motion` (by Framer)
*   **Math & Rendering**: Custom high-throughput HTML5 canvas pixel-manipulation algorithms yielding 60FPS responsive performance on slider changes.

---

## 🚀 Getting Started

Ensure you have [Node.js](https://nodejs.org/) installed, then follow the setup instructions below.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

### 3. Production Build
```bash
npm run build
```
This command compiles static files cleanly into the `dist/` directory, optimized for light deployment overhead.

---

## 🔒 Security & Privacy

SnapWeb Pro processes all pixel-level translations and RAW data calculations **100% locally on the client's web browser environment**. Your private imagery is never uploaded to any remote storage system or server, keeping your workflow secure, private, and offline-accessible.
