---
name: motion-3d-transforms
description: 3D CSS transforms with perspective, z-positioning, and spatial motion. Use when creating card flips, page turns, depth effects, and immersive UI experiences.
---

# 3D Transforms & Depth

Creating spatial depth through CSS 3D transforms. Adds dimensionality and visual hierarchy to UI elements.

## Core Concepts

### Perspective
Distance from viewer to z-plane. Lower values = more dramatic 3D effect.

```css
.container {
  perspective: 800px;     /* Viewer 800px away */
  perspective-origin: 50% 50%; /* Looking at center */
}
```

### Transform Style
Whether children exist in 3D space or flatten.

```css
.parent {
  transform-style: preserve-3d; /* Children in 3D space */
}
```

### Backface Visibility
Show or hide element when rotated away.

```css
.card-face {
  backface-visibility: hidden; /* Hide when facing away */
}
```

## Token Reference

Load from: `tokens.json (in this skill folder)`

### Perspective Values

| Token | Value | Effect |
|-------|-------|--------|
| `shallow` | 1200px | Subtle depth, safe |
| `medium` | 800px | Standard 3D |
| `deep` | 500px | Dramatic perspective |
| `extreme` | 300px | Maximum distortion |

### Z-Offset Values

| Token | Value | Use Case |
|-------|-------|----------|
| `subtle` | 10px | Hover lifts |
| `small` | 20px | Card hovers |
| `medium` | 40px | Modals, overlays |
| `large` | 80px | Hero elements |

## Common Patterns

### Card Flip

```css
.flip-card {
  perspective: 800px;
  width: 200px;
  height: 300px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 600ms ease-in-out;
  transform-style: preserve-3d;
}

.flip-card:hover .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}
```

### 3D Hover Tilt

```css
.tilt-card {
  perspective: 1000px;
  transform-style: preserve-3d;
}

.tilt-card:hover {
  transform: rotateX(-10deg) rotateY(10deg) translateZ(20px);
  transition: transform 300ms ease-out;
}
```

### Depth Layers

```css
.layer-background { transform: translateZ(-100px) scale(1.1); }
.layer-base { transform: translateZ(0); }
.layer-elevated { transform: translateZ(30px); }
.layer-floating { transform: translateZ(60px) scale(1.02); }
.layer-overlay { transform: translateZ(100px) scale(1.05); }
```

## Performance Considerations

```css
/* Enable GPU acceleration */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* Avoid layout thrashing */
.avoid-reflow {
  transform: translate3d(0, 0, 0); /* Use 3D transform instead of top/left */
}
```

## Accessibility

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reduce 3D effects for accessibility
const perspective = prefersReducedMotion ? 'none' : '800px';
const rotation = prefersReducedMotion ? 0 : calculatedRotation;

// Use opacity transitions instead of 3D for reduced motion
const transition = prefersReducedMotion
  ? { opacity: [0, 1] }
  : { rotateY: [-90, 0], opacity: [0, 1] };
```

## Common Mistakes

1. **No perspective container** - Children need parent with perspective
2. **Wrong perspective value** - Too low = extreme distortion
3. **Forgetting backface-visibility** - Causes bleed-through on flips
4. **Mixing 2D and 3D** - Can cause unexpected flattening
5. **Performance issues** - Too many 3D elements hurts FPS

## Related Skills

- `entrance-patterns/` - 3D entrance animations
- `exit-patterns/` - 3D exit animations
- `easing/` - Easing curves for 3D motion
- `accessibility/` - Reduced motion alternatives
- `remotion/` - 3D transforms in video

See `references/` for detailed implementation guides.
