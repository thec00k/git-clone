---
name: motion-depth
description: Depth and 3D space animations including z-axis translation, perspective, parallax layers, and depth-of-field effects. Use when creating layered interfaces, 3D card effects, or spatial UI hierarchies. Provides tokens for depth values, perspective, and layer ordering.
---

# Depth

3D space and depth animations for layered interfaces.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| CSS Transform 3D | developer.mozilla.org/CSS/transform |
| CSS perspective | developer.mozilla.org/CSS/perspective |

## Quick Reference

Load from: `tokens.json (in this skill folder)`

### Z-Translation Values

| Token | Value | Use |
|-------|-------|-----|
| `z.near` | 50px | Slightly forward |
| `z.medium` | 100px | Moderate depth |
| `z.far` | 200px | Distant layer |
| `z.background` | -100px | Behind plane |

### Perspective Values

| Token | Value | Use |
|-------|-------|-----|
| `perspective.subtle` | 1000px | Subtle 3D |
| `perspective.medium` | 600px | Moderate distortion |
| `perspective.dramatic` | 300px | Strong 3D effect |

### Layer Depth

| Token | Value | Use |
|-------|-------|-----|
| `layer.background` | -3 | Furthest back |
| `layer.mid` | 0 | Base layer |
| `layer.foreground` | 3 | Front elements |

## Selection Guide

```
What depth effect?
│
├── Z-AXIS MOVEMENT → translateZ
│   ├── Hover lift → z.near (50px)
│   ├── Card pop → z.medium (100px)
│   └── Full emerge → z.far (200px)
│
├── PERSPECTIVE CONTAINER
│   ├── Subtle 3D → perspective.subtle (1000px)
│   ├── Medium → perspective.medium (600px)
│   └── Dramatic → perspective.dramatic (300px)
│
├── PARALLAX LAYERS
│   ├── Background → layer.background (slowest)
│   ├── Mid → layer.mid (base speed)
│   └── Foreground → layer.foreground (fastest)
│
└── DEPTH OF FIELD
    ├── Focus → blur(0)
    ├── Near blur → blur(2px)
    └── Far blur → blur(5px)
```

## Patterns

### Z-Axis Hover

**CSS:**
```css
.depth-container {
  perspective: 600px; /* {motion.depth.perspective.medium} */
}

.depth-card {
  transition: transform 300ms ease-out;
  transform-style: preserve-3d;
}

.depth-card:hover {
  transform: translateZ(100px); /* {motion.depth.z.medium} */
}
```

**Framer Motion:**
```tsx
<motion.div
  style={{ perspective: 600 }}
>
  <motion.div
    whileHover={{ z: 100 }} // {motion.depth.z.medium}
    transition={{ duration: 0.3 }}
    style={{ transformStyle: 'preserve-3d' }}
  />
</motion.div>
```

### Parallax Layers

**CSS + JavaScript:**
```javascript
const layers = document.querySelectorAll('.parallax-layer');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;

  layers.forEach((layer) => {
    const depth = parseFloat(layer.dataset.depth); // -3 to 3
    const movement = scrollY * (depth * 0.1);
    layer.style.transform = `translateY(${movement}px)`;
  });
});
```

**Framer Motion:**
```tsx
import { useScroll, useTransform, motion } from 'framer-motion';

const ParallaxLayer = ({ depth, children }) => {
  const { scrollYProgress } = useScroll();

  // depth: -3 (background) to 3 (foreground)
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [0, depth * 100]
  );

  return <motion.div style={{ y }}>{children}</motion.div>;
};
```

### 3D Card Flip

**CSS:**
```css
.flip-container {
  perspective: 600px;
}

.flip-card {
  transform-style: preserve-3d;
  transition: transform 600ms ease-out;
}

.flip-card.flipped {
  transform: rotateY(180deg);
}

.flip-front,
.flip-back {
  backface-visibility: hidden;
}

.flip-back {
  transform: rotateY(180deg);
}
```

### Depth of Field

**CSS:**
```css
.dof-container {
  perspective: 600px;
}

.layer-back {
  transform: translateZ(-100px); /* {motion.depth.z.background} */
  filter: blur(5px); /* Out of focus */
}

.layer-focus {
  transform: translateZ(0);
  filter: blur(0); /* In focus */
}

.layer-front {
  transform: translateZ(50px); /* {motion.depth.z.near} */
  filter: blur(2px); /* Slight blur */
}
```

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Z-axis animation | Opacity or scale change |
| Parallax scroll | Fixed layers |
| 3D perspective | Flat 2D fallback |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .depth-card:hover {
    transform: none;
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
  }

  .parallax-layer {
    transform: none !important;
  }
}
```

## Cross-References

- See `3d-transforms/` for full 3D rotations
- See `blur/` for depth-of-field effects
- See `camera/` for perspective movements
- See `parallax/` in scrollytelling skill
- See `compositing/` for layer blending

## References

- No additional references needed for this skill
