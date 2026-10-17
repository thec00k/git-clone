---
name: motion-rotation
description: Rotation transform animations including 2D spins, 3D flips, wobble, and pendulum effects. Use when animating element rotation, creating loading spinners, implementing card flips, or adding shake/wobble feedback animations. Supports both continuous motion and discrete angle changes.
---

# Rotation

Rotation animations for spinners, flips, wobbles, and orientation changes.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| CSS Transforms | developer.mozilla.org/CSS/transform |
| CSS 3D Transforms | developer.mozilla.org/CSS/perspective |

## Quick Reference

Load from: `tokens.json (in this skill folder)`

### Rotation Angles

| Token | Value | Use |
|-------|-------|-----|
| `subtle` | 3deg | Gentle tilt, organic feel |
| `small` | 5deg | Noticeable tilt |
| `medium` | 15deg | Clear rotation, icon turns |
| `quarter` | 90deg | Perpendicular, rotate icon |
| `half` | 180deg | Flip, invert |
| `full` | 360deg | Complete spin cycle |

### Spin Speeds

| Token | Duration | Use |
|-------|----------|-----|
| `speed-slow` | 8s | Ambient background rotation |
| `speed-medium` | 4s | Loading indicator |
| `speed-fast` | 1s | Active spinner |
| `speed-rapid` | 0.5s | Urgent loading |

## Selection Guide

```
What type of rotation?
│
├── CONTINUOUS → Loading, decorative
│   ├── Ambient → 8s (slow)
│   ├── Loading → 1-2s (fast)
│   └── Use linear easing
│
├── DISCRETE → State change
│   ├── Icon toggle → 180deg (half)
│   ├── Expand indicator → 90deg (quarter)
│   └── Use ease-out
│
├── WOBBLE → Attention, error
│   ├── Subtle → 2deg amplitude
│   ├── Clear → 5deg amplitude
│   └── Error shake → 10deg, fast frequency
│
├── FLIP (3D) → Card flip, reveal
│   ├── Horizontal → Y-axis 180deg
│   ├── Vertical → X-axis 180deg
│   └── Use perspective: 1000px
│
└── PENDULUM → Decorative, playful
    ├── Clock → 30deg amplitude, 1.5s period
    └── Hang tag → 10deg, 3s, with damping
```

## Patterns

### Loading Spinner

Continuous rotation for loading states.

**CSS:**
```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg); /* {motion.rotation.angles.full} */
  }
}

.spinner {
  animation: spin 1s linear infinite; /* {motion.rotation.spin.speed-fast} */
}
```

**Framer Motion:**
```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{
    duration: 1,
    repeat: Infinity,
    ease: "linear"
  }}
/>
```

**GSAP:**
```javascript
gsap.to(spinner, {
  rotation: 360,
  duration: 1,
  repeat: -1,
  ease: "none"
});
```

### Icon Toggle (Chevron/Arrow)

Rotate icon to indicate state change.

**CSS:**
```css
.accordion-trigger {
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
}

.accordion-trigger[aria-expanded="true"] {
  transform: rotate(180deg); /* {motion.rotation.angles.half} */
}

/* Or for 90deg rotation */
.accordion-trigger[aria-expanded="true"] {
  transform: rotate(90deg); /* {motion.rotation.angles.quarter} */
}
```

**Framer Motion:**
```tsx
<motion.div
  animate={{ rotate: isOpen ? 180 : 0 }}
  transition={{ duration: 0.2 }}
>
  <ChevronIcon />
</motion.div>
```

### 3D Card Flip

Horizontal flip to reveal back of card.

**CSS:**
```css
.card-container {
  perspective: 1000px; /* {motion.rotation.flip.perspective-medium} */
}

.card {
  transform-style: preserve-3d;
  transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card.flipped {
  transform: rotateY(180deg); /* {motion.rotation.flip.horizontal} */
}

.card-front,
.card-back {
  backface-visibility: hidden;
  position: absolute;
  width: 100%;
  height: 100%;
}

.card-back {
  transform: rotateY(180deg);
}
```

**Framer Motion:**
```tsx
const cardVariants = {
  front: { rotateY: 0 },
  back: { rotateY: 180 }
};

<motion.div
  style={{ perspective: 1000 }}
>
  <motion.div
    variants={cardVariants}
    animate={isFlipped ? "back" : "front"}
    transition={{ duration: 0.6 }}
    style={{ transformStyle: "preserve-3d" }}
  >
    <div style={{ backfaceVisibility: "hidden" }}>Front</div>
    <div style={{
      backfaceVisibility: "hidden",
      transform: "rotateY(180deg)",
      position: "absolute"
    }}>Back</div>
  </motion.div>
</motion.div>
```

### Wobble/Shake (Error State)

Quick wobble animation for error feedback.

**CSS:**
```css
@keyframes wobble {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
  75% { transform: rotate(-5deg); }
}

.error-shake {
  animation: wobble 0.4s ease-in-out;
}

/* More intense shake */
@keyframes shake {
  0%, 100% { transform: translateX(0) rotate(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) rotate(-2deg); }
  20%, 40%, 60%, 80% { transform: translateX(5px) rotate(2deg); }
}

.intense-shake {
  animation: shake 0.5s ease-in-out;
}
```

**Framer Motion:**
```tsx
const wobbleVariants = {
  idle: { rotate: 0 },
  wobble: {
    rotate: [-5, 5, -5, 5, 0],
    transition: { duration: 0.4 }
  }
};

<motion.div
  variants={wobbleVariants}
  animate={hasError ? "wobble" : "idle"}
/>
```

**GSAP:**
```javascript
gsap.to(element, {
  rotation: 5,
  duration: 0.1,
  repeat: 5,
  yoyo: true,
  ease: "power2.inOut"
});
```

### Pendulum Swing

Swinging/hanging animation for decorative elements.

**CSS:**
```css
@keyframes pendulum {
  0%, 100% { transform: rotate(-15deg); }
  50% { transform: rotate(15deg); }
}

.hanging-element {
  transform-origin: center top; /* pivot from top */
  animation: pendulum 3s ease-in-out infinite;
}
```

**Framer Motion:**
```tsx
<motion.div
  style={{ originY: 0 }} // pivot from top
  animate={{ rotate: [-15, 15, -15] }}
  transition={{
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }}
/>
```

**Pendulum with Damping (Settles):**
```tsx
<motion.div
  style={{ originY: 0 }}
  initial={{ rotate: 45 }}
  animate={{ rotate: 0 }}
  transition={{
    type: "spring",
    stiffness: 50,
    damping: 5
  }}
/>
```

### Tilt on Hover

Subtle rotation for playful hover effect.

**CSS:**
```css
.card {
  transition: transform 200ms ease-out;
}

.card:hover {
  transform: rotate(2deg); /* {motion.rotation.angles.micro} + variance */
}
```

**Framer Motion:**
```tsx
<motion.div
  whileHover={{ rotate: 2 }}
  transition={{ duration: 0.2 }}
/>
```

### Continuous Wobble (Notification)

Gentle persistent wobble for attention.

**CSS:**
```css
@keyframes gentleWobble {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

.notification-badge {
  animation: gentleWobble 2s ease-in-out infinite;
}
```

## Rotation Origins

| Origin | Use Case |
|--------|----------|
| `center` | Spinner, flip, default |
| `top` | Pendulum, hinge from top |
| `bottom` | Pendulum from bottom |
| `left` | Door hinge left |
| `right` | Door hinge right |
| `top-left` | Corner pivot |

**Example (Door Hinge):**
```css
.door {
  transform-origin: left center;
  transition: transform 500ms ease-out;
}

.door.open {
  transform: rotateY(-90deg);
}
```

## 3D Rotation Notes

For 3D rotation effects:

1. **Set perspective** on parent container
2. **Use `preserve-3d`** on rotating element
3. **Hide backface** for card flips
4. **Near perspective** (600px) = dramatic effect
5. **Far perspective** (2000px) = subtle effect

```css
.scene {
  perspective: 1000px;
}

.object {
  transform-style: preserve-3d;
}

.object-face {
  backface-visibility: hidden;
}
```

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Continuous spin | Static or very slow (20s+) |
| Wobble/shake | Color change or border flash |
| 3D flip | Crossfade between states |
| Pendulum | Static position |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 20s; /* Very slow, less distracting */
  }

  .error-shake {
    animation: none;
    outline: 2px solid red; /* Visual alternative */
  }

  .card.flipped {
    transform: none;
    /* Use crossfade instead */
  }
}
```

## Cross-References

- See `easing/` for rotation timing curves
- See `duration/` for animation timing
- See `loading-states/` for spinner patterns
- See `3d-transforms/` for complex 3D rotations
- See `sequencing/` for staggered rotations

## References

- `references/3d-rotation.md` — 3D rotation deep dive
