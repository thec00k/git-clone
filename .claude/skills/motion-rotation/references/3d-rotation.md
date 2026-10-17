# 3D Rotation Reference

Detailed guide to 3D rotation techniques and implementations.

## CSS 3D Transform Basics

### Establishing 3D Space

```css
/* Parent needs perspective */
.scene {
  perspective: 1000px; /* Distance from viewer */
  perspective-origin: center center; /* Vanishing point */
}

/* Child needs preserve-3d for nested transforms */
.object {
  transform-style: preserve-3d;
}
```

### Perspective Values

| Value | Effect |
|-------|--------|
| 400-600px | Near, dramatic distortion |
| 800-1200px | Natural, realistic |
| 1500-2000px | Far, subtle distortion |
| none | Flat, 2D appearance |

## Rotation Axes

### X-Axis (Flip Forward/Backward)

```css
/* Rotate around horizontal axis */
transform: rotateX(180deg);

/* Element flips "away" from viewer at top, "toward" at bottom */
```

**Visual:**
```
Before:     After:
┌─────┐     ┌─────┐
│     │ →   │     │ (upside down, back visible)
└─────┘     └─────┘
```

### Y-Axis (Turn Left/Right)

```css
/* Rotate around vertical axis */
transform: rotateY(180deg);

/* Element turns like a door or playing card */
```

**Visual:**
```
Before:     After:
┌─────┐     ┌─────┐
│     │ →   │     │ (mirrored, back visible)
└─────┘     └─────┘
```

### Z-Axis (Spin)

```css
/* Rotate in 2D plane */
transform: rotateZ(180deg);
/* Same as: transform: rotate(180deg); */

/* Element spins like a wheel */
```

## Card Flip Implementation

### Horizontal Flip (Y-Axis)

```html
<div class="card-container">
  <div class="card">
    <div class="card-face card-front">Front Content</div>
    <div class="card-face card-back">Back Content</div>
  </div>
</div>
```

```css
.card-container {
  perspective: 1000px;
  width: 300px;
  height: 200px;
}

.card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-front {
  background: #3b82f6;
  color: white;
}

.card-back {
  background: #ef4444;
  color: white;
  transform: rotateY(180deg);
}
```

### Vertical Flip (X-Axis)

```css
.card.flipped {
  transform: rotateX(180deg);
}

.card-back {
  transform: rotateX(180deg);
}
```

## Multi-Axis Rotation

### Tumble Effect

```css
@keyframes tumble {
  0% {
    transform: rotateX(0) rotateY(0) rotateZ(0);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg);
  }
}

.tumbling {
  animation: tumble 3s linear infinite;
}
```

### Orbit with 3D

```css
@keyframes orbit3d {
  0% {
    transform: rotateY(0deg) translateZ(100px) rotateY(0deg);
  }
  100% {
    transform: rotateY(360deg) translateZ(100px) rotateY(-360deg);
  }
}

.orbiting-element {
  animation: orbit3d 4s linear infinite;
}
```

## Framer Motion 3D

```tsx
import { motion } from 'framer-motion';

// Card flip
const cardVariants = {
  front: {
    rotateY: 0,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  },
  back: {
    rotateY: 180,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  }
};

function FlipCard({ isFlipped }) {
  return (
    <div style={{ perspective: 1000 }}>
      <motion.div
        variants={cardVariants}
        animate={isFlipped ? 'back' : 'front'}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div style={{ backfaceVisibility: 'hidden' }}>
          Front
        </motion.div>
        <motion.div
          style={{
            backfaceVisibility: 'hidden',
            rotateY: 180,
            position: 'absolute',
            inset: 0
          }}
        >
          Back
        </motion.div>
      </motion.div>
    </div>
  );
}

// 3D cube rotation
function RotatingCube() {
  return (
    <motion.div
      animate={{
        rotateX: [0, 360],
        rotateY: [0, 360]
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'linear'
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Cube faces */}
    </motion.div>
  );
}
```

## GSAP 3D

```javascript
// Card flip
gsap.to('.card', {
  rotateY: 180,
  duration: 0.6,
  ease: 'power2.inOut'
});

// 3D tumble
gsap.to('.element', {
  rotationX: 360,
  rotationY: 360,
  duration: 3,
  repeat: -1,
  ease: 'none'
});

// Orbit in 3D space
gsap.to('.satellite', {
  motionPath: {
    path: [
      { x: 100, y: 0, z: 0 },
      { x: 0, y: 0, z: 100 },
      { x: -100, y: 0, z: 0 },
      { x: 0, y: 0, z: -100 },
      { x: 100, y: 0, z: 0 }
    ]
  },
  duration: 4,
  repeat: -1,
  ease: 'none'
});
```

## Common 3D Patterns

### Door Swing

```css
.door-container {
  perspective: 1000px;
}

.door {
  transform-origin: left center;
  transition: transform 0.5s ease-out;
}

.door.open {
  transform: rotateY(-105deg);
}
```

### Page Turn

```css
.page-container {
  perspective: 2000px;
}

.page {
  transform-origin: left center;
  transition: transform 0.8s ease-in-out;
}

.page.turned {
  transform: rotateY(-180deg);
}
```

### Carousel 3D

```javascript
function create3DCarousel(container, items, radius = 200) {
  const angleStep = 360 / items.length;

  items.forEach((item, i) => {
    item.style.transform = `
      rotateY(${i * angleStep}deg)
      translateZ(${radius}px)
    `;
  });

  let currentAngle = 0;

  function rotate(direction) {
    currentAngle += direction * angleStep;
    container.style.transform = `rotateY(${currentAngle}deg)`;
  }

  return { rotate };
}
```

## Performance Optimization

1. **Use `will-change: transform`** before animation
2. **Remove `will-change`** after animation completes
3. **Limit simultaneous 3D elements** (compositing cost)
4. **Reduce perspective children** (each creates new layer)
5. **Consider `contain: layout style paint`** on containers

```css
/* Before animation */
.element {
  will-change: transform;
}

/* Remove after */
.element.animation-complete {
  will-change: auto;
}
```

## Debugging 3D

```css
/* Visualize 3D space */
.debug-3d {
  transform-style: preserve-3d;
  outline: 1px solid red;
}

.debug-3d > * {
  outline: 1px solid blue;
}

/* Show all faces (disable backface culling) */
.debug-faces {
  backface-visibility: visible !important;
}
```

## Accessibility

1. **Reduce or eliminate** 3D for `prefers-reduced-motion`
2. **Provide fallback** (fade/crossfade instead of flip)
3. **Avoid autoplay** on 3D rotations
4. **Test with screen readers** (content order matters)

```css
@media (prefers-reduced-motion: reduce) {
  .card.flipped {
    transform: none;
  }

  .card.flipped .card-front {
    opacity: 0;
  }

  .card.flipped .card-back {
    transform: none;
    opacity: 1;
  }
}
```
