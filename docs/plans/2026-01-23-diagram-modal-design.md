# Diagram Modal Design

## Problem

Mermaid diagrams fail to render with "Cannot read properties of null (reading 'getBoundingClientRect')" because the diagram container isn't visible when Mermaid tries to measure it.

## Solution

Render diagrams at full size but display as scaled previews. Click opens a modal with the full-size view. This fixes the bug because the diagram is always visible (just small).

## Components

### DiagramModal.tsx (new)
- Full-screen overlay with glassmorphism backdrop
- Centered diagram at full size
- Close via: X button, clicking backdrop, or Escape key
- React Portal for proper z-index layering
- Focus trap for accessibility

### ArchitectureDiagram.tsx (updated)
- Add `preview` prop for scaled-down mode
- Add `onExpand` callback for click handling
- Preview shows diagram at ~25% scale via CSS transform
- Diagram always renders (fixes visibility bug)

### Projects.tsx (updated)
- Remove toggle button, always show preview when expanded
- Manage modal state
- Pass diagram data to modal

## Visual Design

**Preview:** 150px container, 25% scale, hover brightness effect, "expand" icon
**Modal:** 90vw/90vh max, blur backdrop, fade-in animation, accessible close button
