---
name: motion-reflection
description: Reflection effects including floor reflections, water ripples, glass surfaces, and mirror effects. Use when implementing polished surface effects, water animations, glass UI elements, or product showcase reflections. Provides tokens for opacity, blur, distortion, and surface characteristics.
---

# Reflection

Animated reflection effects for various surface types.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| CSS Transform | developer.mozilla.org/CSS/transform |
| CSS Filter | developer.mozilla.org/CSS/filter |
| SVG Filters | developer.mozilla.org/SVG/Tutorial/Filter_effects |

## Quick Reference

Load from: `tokens.json (in this skill folder)`

### Floor Reflection

| Token | Value | Use |
|-------|-------|-----|
| `floor.opacity.subtle` | 0.15 | Hint of reflection |
| `floor.opacity.medium` | 0.4 | Marble/tile surface |
| `floor.blur.slight` | 2px | Polished surface |
| `floor.fade-height.medium` | 50% | Standard falloff |

### Water Reflection

| Token | Value | Use |
|-------|-------|-----|
| `water.opacity.calm` | 0.5 | Still water |
| `water.distortion.subtle` | 2px | Gentle ripples |
| `water.ripple-speed.slow` | 3s | Calm motion |

### Glass Reflection

| Token | Value | Use |
|-------|-------|-----|
| `glass.intensity.light` | 0.2 | Subtle glass |
| `glass.intensity.strong` | 0.5 | Window at angle |
| `glass.fresnel-min` | 0.05 | Direct view |
| `glass.fresnel-max` | 0.8 | Glancing angle |

## Selection Guide

```
What surface type?
│
├── FLOOR/GROUND → Vertical flip below object
│   ├── Polished wood → opacity.light + blur.slight
│   ├── Marble/tile → opacity.medium + blur.none
│   ├── Wet surface → opacity.strong + blur.none
│   └── Matte floor → opacity.subtle + blur.medium
│
├── WATER → Rippled reflection
│   ├── Still water → opacity.calm + distortion.none
│   ├── Gentle ripples → opacity.calm + distortion.subtle
│   ├── Wavy → opacity.rippled + distortion.moderate
│   └── Turbulent → opacity.turbulent + distortion.strong
│
├── GLASS → Fresnel-based reflection
│   ├── Clean window → intensity.light
│   ├── Angled view → intensity.strong
│   └── Frosted → intensity.subtle + blur
│
└── MIRROR → Perfect reflection
    ├── Modern → fidelity 1 + no tint
    ├── Antique → fidelity 1 + antique tint
    └── Artistic → edge-fade.soft
```

## Patterns

### Floor Reflection

Classic reflection below an element.

**CSS:**
```css
.floor-reflection-container {
  position: relative;
  display: inline-block;
}

.floor-reflection-source {
  position: relative;
  z-index: 1;
}

.floor-reflection {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  transform: scaleY(-1);
  transform-origin: top;

  /* Opacity and fade */
  opacity: 0.4; /* {motion.reflection.floor.opacity.medium} */
  mask-image: linear-gradient(
    to bottom,
    rgba(0,0,0,1) 0%,
    rgba(0,0,0,0) 50% /* {motion.reflection.floor.fade-height.medium} */
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(0,0,0,1) 0%,
    rgba(0,0,0,0) 50%
  );

  /* Optional blur for non-mirror surfaces */
  filter: blur(2px); /* {motion.reflection.floor.blur.slight} */

  /* Gap from object */
  margin-top: 2px; /* {motion.reflection.floor.gap.small} */
}
```

**Framer Motion (Animated):**
```tsx
import { motion } from 'framer-motion';

const FloorReflection = ({ children }) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Source */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* Reflection */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }} // {motion.reflection.floor.opacity.medium}
        transition={{ duration: 0.3 }} // {motion.reflection.animation.appear}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          transform: 'scaleY(-1)',
          transformOrigin: 'top',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 50%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 50%)',
          filter: 'blur(2px)',
          pointerEvents: 'none'
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
```

### Water Reflection

Animated rippling water effect.

**CSS + JavaScript:**
```css
.water-container {
  position: relative;
  overflow: hidden;
}

.water-reflection {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  transform: scaleY(-1);
  opacity: 0.5; /* {motion.reflection.water.opacity.calm} */
  filter: url(#water-ripple);
}

/* SVG filter for ripple effect */
```

```html
<svg style="position: absolute; width: 0; height: 0;">
  <defs>
    <filter id="water-ripple">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.01 0.05"
        numOctaves="2"
        result="noise"
      >
        <animate
          attributeName="baseFrequency"
          dur="3s"
          values="0.01 0.05;0.015 0.06;0.01 0.05"
          repeatCount="indefinite"
        />
      </feTurbulence>
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="5"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </defs>
</svg>
```

**Canvas Water Reflection:**
```javascript
class WaterReflection {
  constructor(canvas, sourceImage) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.source = sourceImage;
    this.time = 0;
    this.amplitude = 5; // {motion.reflection.water.distortion.moderate}
    this.frequency = 1; // {motion.reflection.water.ripple-frequency.medium}
    this.speed = 1.5; // derived from {motion.reflection.water.ripple-speed.medium}
  }

  render() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw flipped and distorted
    for (let y = 0; y < height; y++) {
      const wave = Math.sin((y * this.frequency * 0.1) + this.time) * this.amplitude;
      const srcY = height - y - 1; // Flip

      this.ctx.drawImage(
        this.source,
        0, srcY, width, 1, // Source slice
        wave, y, width, 1  // Dest with horizontal offset
      );
    }

    // Apply opacity fade
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0.5)'); // {motion.reflection.water.opacity.calm}
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    this.ctx.globalCompositeOperation = 'destination-in';
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.globalCompositeOperation = 'source-over';

    this.time += 0.05 / this.speed;
    requestAnimationFrame(() => this.render());
  }
}
```

### Glass Reflection (Fresnel)

Angle-dependent reflection intensity.

**CSS:**
```css
.glass-panel {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

/* Simulated fresnel with gradient overlay */
.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3) 0%, /* Strong at edge - {motion.reflection.glass.fresnel-max} */
    rgba(255, 255, 255, 0.05) 50%, /* Weak in middle - {motion.reflection.glass.fresnel-min} */
    rgba(255, 255, 255, 0.2) 100%
  );
  pointer-events: none;
}
```

**Framer Motion (Mouse-reactive):**
```tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';

const GlassReflection = () => {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Fresnel effect based on "view angle" (simulated by mouse position)
  const reflectionOpacity = useTransform(
    [mouseX, mouseY],
    ([x, y]) => {
      // Calculate distance from center (simulating angle)
      const dx = x - 0.5;
      const dy = y - 0.5;
      const distance = Math.sqrt(dx * dx + dy * dy) * 2;

      // Interpolate between fresnel-min and fresnel-max
      const min = 0.05; // {motion.reflection.glass.fresnel-min}
      const max = 0.8;  // {motion.reflection.glass.fresnel-max}
      return min + (max - min) * distance;
    }
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <motion.div
      className="glass-panel"
      onMouseMove={handleMouseMove}
      style={{ position: 'relative' }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, white 0%, transparent 100%)',
          opacity: reflectionOpacity,
          pointerEvents: 'none'
        }}
      />
      {/* Content */}
    </motion.div>
  );
};
```

### Mirror Reflection

Perfect reflection for UI elements.

**CSS:**
```css
.mirror-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mirror-source {
  position: relative;
  z-index: 1;
}

.mirror-reflection {
  transform: scaleY(-1) scaleX(1);
  transform-origin: top center;
  opacity: 1; /* {motion.reflection.mirror.fidelity} */

  /* Antique mirror tint */
  filter: sepia(0.05) brightness(0.98);
  /* Approximates {motion.reflection.mirror.tint.antique} */

  /* Soft edge fade */
  mask-image: radial-gradient(
    ellipse 80% 50% at center top,
    black 60%,
    transparent 100%
  );
  -webkit-mask-image: radial-gradient(
    ellipse 80% 50% at center top,
    black 60%,
    transparent 100%
  );
}
```

**Three.js Mirror:**
```javascript
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

function createMirror(width, height) {
  const geometry = new THREE.PlaneGeometry(width, height);

  const mirror = new Reflector(geometry, {
    clipBias: 0.003,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    color: 0x889999 // Slight tint
  });

  mirror.rotation.x = -Math.PI / 2; // Horizontal mirror
  return mirror;
}
```

### Animated Reflection Appearance

Smooth fade-in of reflections.

**Framer Motion:**
```tsx
const AnimatedReflection = ({ children, show }) => (
  <motion.div
    initial={{ opacity: 0, scaleY: 0.9 }}
    animate={{
      opacity: show ? 0.4 : 0,
      scaleY: show ? 1 : 0.9
    }}
    transition={{
      opacity: {
        duration: show ? 0.3 : 0.2 // appear vs disappear
      },
      scaleY: {
        duration: 0.3,
        ease: [0.2, 0, 0, 1]
      }
    }}
    style={{
      transform: 'scaleY(-1)',
      transformOrigin: 'top'
    }}
  >
    {children}
  </motion.div>
);
```

## Remotion Implementation

```tsx
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export const ReflectionReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();

  // Reflection fades in
  const reflectionOpacity = interpolate(
    frame,
    [0, 15],
    [0, 0.4], // {motion.reflection.floor.opacity.medium}
    { extrapolateRight: 'clamp' }
  );

  // Water ripple animation
  const ripplePhase = (frame / 30) * Math.PI * 2; // One cycle per second at 30fps

  return (
    <div style={{ position: 'relative' }}>
      {/* Source */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* Reflection */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          transform: `scaleY(-1) translateX(${Math.sin(ripplePhase) * 2}px)`,
          transformOrigin: 'top',
          opacity: reflectionOpacity,
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 50%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 50%)',
          filter: 'blur(1px)'
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Water ripples | Static reflection |
| Animated fade-in | Instant appearance |
| Mouse-reactive fresnel | Static opacity |
| Ripple distortion | Simple blur |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .water-reflection {
    animation: none;
    filter: blur(3px); /* Static blur instead of ripple */
  }

  .glass-reflection {
    transition: none;
    opacity: 0.2; /* Fixed middle value */
  }

  .reflection-appear {
    transition: none;
  }
}
```

## Cross-References

- See `blur/` for reflection blur techniques
- See `opacity/` for fade calculations
- See `compositing/` for blend modes with reflections
- See `glow-shadow/` for reflection lighting effects
- See `distortion/` for water ripple effects
- See `cinematic/` for dramatic reflection shots

## References

- No additional references needed for this skill
