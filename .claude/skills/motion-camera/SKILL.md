---
name: motion-camera
description: Camera movement and cinematography animations including pan, tilt, dolly, zoom, shake, orbit, parallax, and tracking shots. Use when creating cinematic sequences, 3D scene navigation, virtual camera effects, or depth-based motion.
---

# Camera

Cinematographic camera movements and virtual camera effects.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| CSS Perspective | developer.mozilla.org/CSS/perspective |
| Three.js Camera | threejs.org/docs/#api/cameras/PerspectiveCamera |

## Quick Reference

Load from: `tokens.json (in this skill folder)`

### Camera Movements

| Token | Duration | Use |
|-------|----------|-----|
| `pan.speed.slow` | 2000ms | Cinematic pan |
| `pan.speed.whip` | 150ms | Whip pan transition |
| `tilt.speed.normal` | 1000ms | Standard vertical |
| `dolly.speed.crash` | 200ms | Crash zoom |
| `zoom.speed.normal` | 800ms | Standard zoom |

### Shake Intensity

| Token | Value | Use |
|-------|-------|-----|
| `subtle` | 2px | Subtle handheld |
| `light` | 5px | Light shake |
| `medium` | 10px | Noticeable |
| `heavy` | 20px | Strong impact |
| `violent` | 40px | Extreme shake |

## Selection Guide

```
What camera movement?
│
├── PAN → Horizontal rotation
│   ├── Slow → cinematic reveal
│   ├── Normal → following action
│   └── Whip → transition/cut replacement
│
├── TILT → Vertical rotation
│   ├── Up → reveal height/power
│   └── Down → reveal ground/detail
│
├── DOLLY → Move toward/away
│   ├── In → intimacy, focus
│   ├── Out → reveal context
│   └── Crash → impact, emphasis
│
├── ZOOM → Change focal length
│   ├── In → attention, drama
│   ├── Out → disengage, broaden
│   └── With dolly → vertigo effect
│
├── ORBIT → Circle around subject
│   ├── Slow → product showcase
│   └── Fast → action, energy
│
├── TRACKING → Follow subject
│   ├── Smooth → steady follow
│   └── Lag → natural feel
│
├── CRANE → Vertical movement
│   ├── Up → reveal, establish
│   └── Down → descend into scene
│
├── SHAKE → Handheld/impact
│   ├── Subtle → documentary feel
│   ├── Medium → action sequence
│   └── Heavy → explosion, impact
│
└── PARALLAX → Depth layers
    └── Layers move at different speeds
```

## Patterns

### Pan Movement

Horizontal camera rotation.

**CSS:**
```css
.scene {
  perspective: 1000px;
  perspective-origin: center center;
}

.camera-view {
  transform-style: preserve-3d;
  transition: transform 2s ease-out; /* {motion.camera.pan.speed.slow} */
}

.camera-view.pan-left {
  transform: rotateY(-15deg);
}

.camera-view.pan-right {
  transform: rotateY(15deg);
}
```

**Framer Motion:**
```tsx
<motion.div
  style={{ perspective: 1000 }}
>
  <motion.div
    animate={{ rotateY: panAngle }}
    transition={{
      duration: 2,    // {motion.camera.pan.speed.slow}
      ease: "easeOut"
    }}
  >
    {content}
  </motion.div>
</motion.div>
```

**GSAP:**
```javascript
gsap.to('.camera-view', {
  rotateY: -15,
  duration: 2,       // {motion.camera.pan.speed.slow}
  ease: 'power2.out'
});
```

### Whip Pan Transition

Fast pan used as scene transition.

**CSS:**
```css
.whip-pan {
  animation: whip-pan-out 0.15s ease-in forwards;
  /* {motion.camera.pan.speed.whip} */
}

@keyframes whip-pan-out {
  0% {
    transform: translateX(0) rotateY(0);
    filter: blur(0);
  }
  100% {
    transform: translateX(-100%) rotateY(-30deg);
    filter: blur(8px);
  }
}

.whip-pan-in {
  animation: whip-pan-in 0.15s ease-out forwards;
}

@keyframes whip-pan-in {
  0% {
    transform: translateX(100%) rotateY(30deg);
    filter: blur(8px);
  }
  100% {
    transform: translateX(0) rotateY(0);
    filter: blur(0);
  }
}
```

### Dolly Zoom / Vertigo Effect

Combined dolly and zoom for unsettling effect.

**JavaScript (Canvas/WebGL):**
```javascript
class VertigoEffect {
  constructor(initialFov, duration) {
    this.initialFov = initialFov;
    this.duration = duration;  // {motion.camera.vertigo.speed.normal}
    this.intensity = 1.5;      // {motion.camera.vertigo.intensity.moderate}
  }

  apply(camera, targetZ, progress) {
    // Dolly in while zooming out (or vice versa)
    // Keeps subject same size, but changes perspective
    const eased = this.easeInOut(progress);

    // Move camera forward
    camera.position.z = targetZ + (100 * (1 - eased));

    // Adjust FOV to compensate
    camera.fov = this.initialFov + (30 * eased);
    camera.updateProjectionMatrix();
  }

  easeInOut(t) {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
```

**Three.js:**
```javascript
import * as THREE from 'three';
import gsap from 'gsap';

function vertigoEffect(camera, duration = 1.5) {
  const initialFov = camera.fov;
  const initialZ = camera.position.z;

  const tl = gsap.timeline();

  tl.to(camera.position, {
    z: initialZ - 50,
    duration,
    ease: 'power2.inOut',
    onUpdate: () => {
      // Adjust FOV to maintain subject size
      const distanceRatio = initialZ / camera.position.z;
      camera.fov = initialFov * distanceRatio;
      camera.updateProjectionMatrix();
    }
  });

  return tl;
}
```

### Camera Shake

Impact or handheld shake effect.

**CSS:**
```css
@keyframes camera-shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  10% { transform: translate(-5px, -5px) rotate(-0.5deg); }
  20% { transform: translate(5px, -3px) rotate(0.5deg); }
  30% { transform: translate(-3px, 5px) rotate(0deg); }
  40% { transform: translate(5px, 5px) rotate(0.5deg); }
  50% { transform: translate(-5px, 3px) rotate(-0.5deg); }
  60% { transform: translate(3px, -5px) rotate(0deg); }
  70% { transform: translate(-5px, 3px) rotate(-0.5deg); }
  80% { transform: translate(5px, -3px) rotate(0.5deg); }
  90% { transform: translate(-3px, -5px) rotate(0deg); }
}

.shake-light {
  animation: camera-shake 0.5s ease-in-out;
  /* Intensity: {motion.camera.shake.intensity.light} = 5px */
}

.shake-heavy {
  animation: camera-shake 0.3s ease-in-out;
  /* Scale up for {motion.camera.shake.intensity.heavy} = 20px */
  --shake-scale: 4;
}
```

**JavaScript (Procedural):**
```javascript
class CameraShake {
  constructor(intensity, frequency, decay) {
    this.intensity = intensity;  // {motion.camera.shake.intensity.medium}
    this.frequency = frequency;  // {motion.camera.shake.frequency.normal}
    this.decay = decay;          // {motion.camera.shake.decay.normal}
    this.time = 0;
    this.active = false;
  }

  trigger(duration) {
    this.time = 0;
    this.duration = duration;
    this.active = true;
  }

  update(deltaTime) {
    if (!this.active) return { x: 0, y: 0, rotation: 0 };

    this.time += deltaTime;

    if (this.time >= this.duration) {
      this.active = false;
      return { x: 0, y: 0, rotation: 0 };
    }

    const progress = this.time / this.duration;
    const currentIntensity = this.intensity * Math.pow(this.decay, progress * 10);

    // Perlin-like noise for natural shake
    const noiseX = Math.sin(this.time * this.frequency * 10) * Math.cos(this.time * 7);
    const noiseY = Math.cos(this.time * this.frequency * 8) * Math.sin(this.time * 11);
    const noiseRot = Math.sin(this.time * this.frequency * 6);

    return {
      x: noiseX * currentIntensity,
      y: noiseY * currentIntensity,
      rotation: noiseRot * currentIntensity * 0.1
    };
  }
}

// Usage
const shake = new CameraShake(10, 50, 0.95);
shake.trigger(500);

function animate() {
  const offset = shake.update(16.67);
  element.style.transform = `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotation}deg)`;
  requestAnimationFrame(animate);
}
```

### Parallax Layers

Depth-based movement for 2.5D effect.

**CSS:**
```css
.parallax-container {
  perspective: 1000px;
  overflow: hidden;
}

.parallax-layer {
  position: absolute;
  inset: 0;
  transition: transform 0.1s linear;
}

.layer-foreground {
  transform: translateZ(50px) scale(0.95);
  /* {motion.camera.parallax.layers.foreground} */
}

.layer-midground {
  transform: translateZ(0);
  /* {motion.camera.parallax.layers.midground} */
}

.layer-background {
  transform: translateZ(-50px) scale(1.05);
  /* {motion.camera.parallax.layers.background} */
}

.layer-distant {
  transform: translateZ(-100px) scale(1.1);
  /* {motion.camera.parallax.layers.distant} */
}
```

**JavaScript (Mouse-based):**
```javascript
class ParallaxScene {
  constructor(container) {
    this.container = container;
    this.layers = [
      { element: document.querySelector('.foreground'), depth: 1.5 },
      { element: document.querySelector('.midground'), depth: 1.0 },
      { element: document.querySelector('.background'), depth: 0.5 },
      { element: document.querySelector('.distant'), depth: 0.2 }
    ];

    this.intensity = 0.3; // {motion.camera.parallax.intensity.moderate}
    this.bind();
  }

  bind() {
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

      this.update(x, y);
    });
  }

  update(x, y) {
    this.layers.forEach(layer => {
      const moveX = x * 50 * layer.depth * this.intensity;
      const moveY = y * 50 * layer.depth * this.intensity;

      layer.element.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
  }
}
```

### Orbit Camera

Circular movement around a point.

**JavaScript:**
```javascript
class OrbitCamera {
  constructor(centerX, centerY, radius) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;      // {motion.camera.orbit.radius.medium}
    this.angle = 0;
  }

  orbit(duration, arc = 360) {
    const startAngle = this.angle;
    const endAngle = startAngle + (arc * Math.PI / 180);
    const startTime = performance.now();
    const orbitDuration = duration; // {motion.camera.orbit.speed.normal}

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / orbitDuration, 1);
      const eased = this.easeInOut(progress);

      this.angle = startAngle + (endAngle - startAngle) * eased;

      const x = this.centerX + Math.cos(this.angle) * this.radius;
      const y = this.centerY + Math.sin(this.angle) * this.radius;

      this.updateCamera(x, y, this.angle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  updateCamera(x, y, angle) {
    // Apply to camera or viewport
    const view = document.querySelector('.camera-view');
    view.style.transform = `
      translate(${-x}px, ${-y}px)
      rotate(${-angle}rad)
    `;
  }

  easeInOut(t) {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
```

### Tracking Shot

Camera following a moving subject.

**JavaScript:**
```javascript
class TrackingCamera {
  constructor(options = {}) {
    this.target = { x: 0, y: 0 };
    this.position = { x: 0, y: 0 };
    this.smoothing = options.smoothing || 0.1; // {motion.camera.tracking.smoothing.light}
    this.lag = options.lag || 1.0;             // {motion.camera.tracking.speed.match}
  }

  setTarget(x, y) {
    this.target.x = x;
    this.target.y = y;
  }

  update() {
    // Smooth following with lag
    const dx = (this.target.x - this.position.x) * this.lag;
    const dy = (this.target.y - this.position.y) * this.lag;

    this.position.x += dx * this.smoothing;
    this.position.y += dy * this.smoothing;

    return {
      x: this.position.x,
      y: this.position.y
    };
  }

  apply(viewport) {
    const pos = this.update();
    viewport.style.transform = `translate(${-pos.x}px, ${-pos.y}px)`;
  }
}

// Usage with animation loop
const camera = new TrackingCamera({ smoothing: 0.1, lag: 0.8 });
const subject = document.querySelector('.subject');
const viewport = document.querySelector('.viewport');

function animate() {
  const rect = subject.getBoundingClientRect();
  camera.setTarget(rect.left + rect.width / 2, rect.top + rect.height / 2);
  camera.apply(viewport);
  requestAnimationFrame(animate);
}
```

### Crane Movement

Vertical sweeping motion.

**CSS:**
```css
.crane-up {
  animation: crane-rise 2s ease-out forwards;
  /* {motion.camera.crane.speed.normal} */
}

@keyframes crane-rise {
  0% {
    transform: translateY(0) rotateX(0);
  }
  100% {
    transform: translateY(-300px) rotateX(10deg);
    /* Height: {motion.camera.crane.height.medium} */
  }
}

.crane-down {
  animation: crane-descend 2s ease-out forwards;
}

@keyframes crane-descend {
  0% {
    transform: translateY(-300px) rotateX(10deg);
  }
  100% {
    transform: translateY(0) rotateX(-5deg);
  }
}
```

### Focus Pull

Depth of field rack focus.

**CSS (Simulated):**
```css
.scene {
  position: relative;
}

.layer {
  transition: filter 600ms ease-out;
  /* {motion.camera.focus.pull-speed.normal} */
}

/* Focus on foreground */
.focus-foreground .layer-foreground {
  filter: blur(0);
}
.focus-foreground .layer-background {
  filter: blur(8px);
}

/* Focus on background */
.focus-background .layer-foreground {
  filter: blur(8px);
}
.focus-background .layer-background {
  filter: blur(0);
}
```

**Framer Motion:**
```tsx
const FocusPull = ({ focusLayer }) => {
  const layers = ['foreground', 'midground', 'background'];

  return (
    <div className="scene">
      {layers.map(layer => (
        <motion.div
          key={layer}
          className={layer}
          animate={{
            filter: layer === focusLayer ? 'blur(0px)' : 'blur(8px)'
          }}
          transition={{
            duration: 0.6, // {motion.camera.focus.pull-speed.normal}
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
};
```

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Camera pan/tilt | Instant cut or disabled |
| Shake | Disabled |
| Parallax | Reduced or disabled |
| Vertigo effect | Disabled |
| Orbit | Static or very slow |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .camera-view {
    transition: none;
  }

  .parallax-layer {
    transform: none !important;
  }

  .shake-light,
  .shake-heavy {
    animation: none;
  }

  .crane-up,
  .crane-down {
    animation: none;
  }
}
```

```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  // Disable camera shake
  cameraShake.intensity = 0;

  // Disable parallax
  parallaxScene.intensity = 0;

  // Use instant transitions
  orbitCamera.duration = 0;
}
```

## Cross-References

- See `position/` for basic movement primitives
- See `scale/` for zoom effects
- See `blur/` for depth of field
- See `procedural/` for procedural camera shake
- See `3d-transforms/` for 3D camera space

## References

- `references/camera-movements.md` — Cinematography terminology and techniques
