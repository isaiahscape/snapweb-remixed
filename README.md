# SnapWeb: Digital Photo Editor & Non-Destructive RAW Suite

SnapWeb is a high-performance, client-side digital photo editor and non-destructive RAW development suite running entirely in the browser. Built with React, TypeScript, and Tailwind CSS, it provides professional photo retouching tools, multi-image batch editing, selective vector masking, customizable watermark overlays, and persistent local project storage.

---

## Features

### 1. Multi-Picture Workspace & Bundle Tools
Edit multiple photographs concurrently with a tabbed session bar:
- **Workspace Tabs**: Switch between multiple open images with dedicated edit states, individual histories, and real-time thumbnail filmstrips.
- **Apply Edits to All**: Replicate your current color grading, curves, and adjustments across all active images in a single click.
- **Batch Export**: Render and package all open pictures as high-resolution JPEGs or PNGs directly to your device.
- **Batch Reset**: Revert all open photographs to their original unedited states.

### 2. Local Project Persistence & Recent Edits
- **IndexedDB Storage**: Automatically saves recent work locally in the browser so projects persist across page reloads.
- **In-Workspace Recents Browser**: Access previous edits directly from the header or tab bar to open any project into a new tab without interrupting existing sessions.
- **Metadata Inspection**: View resolution, file size, timestamps, and embedded EXIF camera details.

### 3. Custom Presets & Filters
- **Save Custom Looks**: Save any combination of tone adjustments, curves, color grades, and watermark layers into named custom presets.
- **Direct Import & Export**: Download individual presets as `.json` files or export your entire preset library as a timestamped backup pack.
- **Drag-and-Drop Presets**: Drag and drop any `.json` preset file directly onto the editor to automatically import and apply it to the active photo.
- **Curated Film Simulations**: Includes baseline emulations such as Portra, Moody Bronze, Fuji Superia, and Fuji Street, alongside classic monochrome and vintage grades.

### 4. Watermarks, Logos & Icon Overlays
- **Image Overlays**: Upload transparent PNG, SVG, WEBP, or JPEG logos and brand watermarks.
- **Vector Badges & Typography**: Built-in copyright marks, camera stamps, and styled text layers with configurable font families, size, and colors.
- **Positioning & Transform**: 9-point anchor alignment grid, position offsets, uniform scaling, rotation, opacity, and drop shadows.
- **Compositing Blend Modes**: Normal, Screen, Multiply, Overlay, and Soft Light.

### 5. Camera RAW Developer (12-Bit Matrix Emulation)
Load raw digital negative files (`.dng`, `.cr2`, `.nef`, `.arw`) to adjust sensor data:
- **White Balance Profiles**: Sunny, Cloudy, Shade, Tungsten, Fluorescent, and Flash.
- **Creative Profiles**: Standard, Vivid, Landscape, Portrait, and Monochrome matrices.
- **Exposure Baseline EV**: Fine adjustments in 0.05 EV increments (-3.0 to +3.0 EV).
- **Highlights & Shadows Recovery**: Hardware-level recovery curves to salvage clipped highlights and lift dark shadow noise.

### 6. Global & Selective Retouching Tools
- **Advanced Tonal Contrast**: Independent control over high tones, mid tones, and low tones with highlight and shadow protection to prevent clipping.
- **Curves & Color Mixer**: Per-channel RGB spline curves and 8-channel HSL color balance.
- **Selective Masks**: Brush-based local adjustment masks with feathering and opacity control.
- **Healing Brush**: Remove blemishes, dust flecks, and unwanted artifacts.
- **Lens Blur & Tilt-Shift**: Radial and linear depth-of-field simulation with adjustable focal transitions.
- **Interactive Cropping & Straightening**: Aspect ratio presets and precision horizon leveling (+/-45 degrees).

### 7. Responsive & Desktop-Optimized Interface
- **Resizable Sidebar**: Drag to resize the controls panel from 260px to 600px width.
- **Docking Toggle**: Position the tools sidebar on either the left or right side of the canvas.
- **Live Histogram**: Real-time RGB and luminance distribution graphs with clipping alerts.
- **Hold to Compare**: Instant toggle between original and processed states.

---

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Motion**: motion (Framer Motion)
- **Image Processing**: HTML5 2D Canvas pipeline with web-worker-assisted pixel operations
- **Metadata**: ExifReader for camera EXIF extraction
- **Storage**: IndexedDB for local project and preset caching

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/isaiahscape/snapweb-remixed.git
   cd snapweb-remixed
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## Privacy & Local Execution

All image rendering, RAW development, and pixel transformations execute entirely client-side within the browser. Photographs and metadata are never sent to external servers or cloud storage unless explicitly connected to Google Drive by the user.

---

## License & Attribution

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

Original concept inspired by Google Snapseed. Recreated by @isaiahscape.
All rights to the original brand belong to Google LLC.
