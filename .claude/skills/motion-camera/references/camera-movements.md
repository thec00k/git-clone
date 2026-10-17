# Camera Movements Reference

Comprehensive cinematography techniques for virtual camera systems.

## Movement Types

### Pan (Horizontal Rotation)

Camera rotates on its vertical axis.

```javascript
class PanCamera {
  constructor(fov = 60) {
    this.rotation = 0; // degrees
    this.fov = fov;
  }

  pan(degrees, duration, ease = 'easeOut') {
    const startRotation = this.rotation;
    const endRotation = startRotation + degrees;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.ease(progress, ease);

      this.rotation = startRotation + (endRotation - startRotation) * eased;
      this.applyTransform();

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  applyTransform() {
    document.querySelector('.scene').style.transform =
      `perspective(1000px) rotateY(${-this.rotation}deg)`;
  }

  ease(t, type) {
    switch (type) {
      case 'easeIn': return t * t;
      case 'easeOut': return 1 - Math.pow(1 - t, 2);
      case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default: return t;
    }
  }
}
```

### Tilt (Vertical Rotation)

Camera rotates on its horizontal axis.

```javascript
class TiltCamera {
  constructor() {
    this.tilt = 0; // degrees
  }

  tiltTo(degrees, duration) {
    return gsap.to(this, {
      tilt: degrees,
      duration: duration / 1000,
      ease: 'power2.out',
      onUpdate: () => this.applyTransform()
    });
  }

  applyTransform() {
    document.querySelector('.scene').style.transform =
      `perspective(1000px) rotateX(${this.tilt}deg)`;
  }
}

// Dutch angle (roll) variant
class DutchAngle {
  constructor() {
    this.roll = 0;
  }

  dutch(degrees, duration) {
    return gsap.to(this, {
      roll: degrees,
      duration: duration / 1000,
      ease: 'power2.inOut',
      onUpdate: () => {
        document.querySelector('.scene').style.transform =
          `rotate(${this.roll}deg)`;
      }
    });
  }
}
```

### Dolly (Forward/Back Movement)

Camera moves along its z-axis.

```javascript
class DollyCamera {
  constructor() {
    this.z = 0;
  }

  dollyIn(distance, duration) {
    return this.dolly(distance, duration);
  }

  dollyOut(distance, duration) {
    return this.dolly(-distance, duration);
  }

  dolly(distance, duration) {
    const startZ = this.z;
    const endZ = startZ + distance;
    const startTime = performance.now();

    const animate = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.z = startZ + (endZ - startZ) * eased;
      this.applyTransform();

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  applyTransform() {
    // Using scale to simulate dolly in 2D
    const scale = 1 + (this.z / 500);
    document.querySelector('.scene').style.transform = `scale(${scale})`;
  }
}
```

### Truck (Lateral Movement)

Camera moves sideways (left/right).

```javascript
class TruckCamera {
  constructor() {
    this.x = 0;
  }

  truck(distance, duration) {
    return gsap.to(this, {
      x: this.x + distance,
      duration: duration / 1000,
      ease: 'power2.out',
      onUpdate: () => {
        document.querySelector('.scene').style.transform =
          `translateX(${-this.x}px)`;
      }
    });
  }

  truckLeft(distance, duration) {
    return this.truck(-distance, duration);
  }

  truckRight(distance, duration) {
    return this.truck(distance, duration);
  }
}
```

### Pedestal (Vertical Movement)

Camera moves up/down without tilting.

```javascript
class PedestalCamera {
  constructor() {
    this.y = 0;
  }

  pedestal(distance, duration) {
    return gsap.to(this, {
      y: this.y + distance,
      duration: duration / 1000,
      ease: 'power2.inOut',
      onUpdate: () => {
        document.querySelector('.scene').style.transform =
          `translateY(${-this.y}px)`;
      }
    });
  }

  pedestalUp(distance, duration) {
    return this.pedestal(-distance, duration);
  }

  pedestalDown(distance, duration) {
    return this.pedestal(distance, duration);
  }
}
```

## Combined Movements

### Crane Shot

Combined pedestal + tilt (like a crane arm).

```javascript
class CraneCamera {
  constructor() {
    this.y = 0;
    this.tilt = 0;
  }

  craneUp(height, duration, options = {}) {
    const { tiltAngle = 10, ease = 'power2.out' } = options;

    return gsap.timeline()
      .to(this, {
        y: this.y - height,
        tilt: tiltAngle,
        duration: duration / 1000,
        ease,
        onUpdate: () => this.applyTransform()
      });
  }

  craneDown(height, duration, options = {}) {
    const { tiltAngle = -5, ease = 'power2.out' } = options;

    return gsap.timeline()
      .to(this, {
        y: this.y + height,
        tilt: tiltAngle,
        duration: duration / 1000,
        ease,
        onUpdate: () => this.applyTransform()
      });
  }

  applyTransform() {
    document.querySelector('.scene').style.transform = `
      translateY(${-this.y}px)
      perspective(1000px)
      rotateX(${this.tilt}deg)
    `;
  }
}
```

### Arc Shot

Camera moves in an arc around subject.

```javascript
class ArcCamera {
  constructor(centerX, centerY, radius) {
    this.center = { x: centerX, y: centerY };
    this.radius = radius;
    this.angle = 0;
  }

  arc(degrees, duration, options = {}) {
    const { direction = 'clockwise', ease = 'power2.inOut' } = options;
    const multiplier = direction === 'clockwise' ? 1 : -1;
    const endAngle = this.angle + (degrees * multiplier * Math.PI / 180);

    return gsap.to(this, {
      angle: endAngle,
      duration: duration / 1000,
      ease,
      onUpdate: () => {
        const x = this.center.x + Math.cos(this.angle) * this.radius;
        const y = this.center.y + Math.sin(this.angle) * this.radius;

        // Point camera at center
        const lookAngle = Math.atan2(
          this.center.y - y,
          this.center.x - x
        );

        document.querySelector('.scene').style.transform = `
          translate(${-x}px, ${-y}px)
          rotate(${lookAngle - Math.PI / 2}rad)
        `;
      }
    });
  }
}
```

### Steadicam / Gimbal

Smooth handheld-style following.

```javascript
class SteadicamCamera {
  constructor(options = {}) {
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };

    this.stiffness = options.stiffness || 0.1;
    this.damping = options.damping || 0.8;
    this.breathingAmount = options.breathing || 2;
    this.breathingSpeed = options.breathingSpeed || 0.5;
  }

  follow(targetX, targetY) {
    this.target.x = targetX;
    this.target.y = targetY;
  }

  update() {
    // Spring physics for smooth following
    const dx = this.target.x - this.position.x;
    const dy = this.target.y - this.position.y;

    this.velocity.x += dx * this.stiffness;
    this.velocity.y += dy * this.stiffness;

    this.velocity.x *= this.damping;
    this.velocity.y *= this.damping;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Add subtle breathing motion
    const time = performance.now() / 1000;
    const breathX = Math.sin(time * this.breathingSpeed) * this.breathingAmount;
    const breathY = Math.cos(time * this.breathingSpeed * 0.7) * this.breathingAmount;

    return {
      x: this.position.x + breathX,
      y: this.position.y + breathY
    };
  }
}
```

## Special Techniques

### Vertigo / Dolly Zoom

Dolly in while zooming out (or reverse).

```javascript
class VertigoCamera {
  constructor(initialScale, targetDistance) {
    this.scale = initialScale;
    this.distance = 0;
    this.targetDistance = targetDistance;
  }

  /**
   * Creates the vertigo effect
   * As camera moves closer, zoom widens to keep subject same size
   * But perspective changes dramatically
   */
  execute(duration) {
    const startScale = this.scale;
    const startDistance = this.distance;
    const startTime = performance.now();

    const animate = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = this.easeInOutCubic(progress);

      this.distance = startDistance + (this.targetDistance - startDistance) * eased;

      // As distance decreases, scale increases to compensate
      // This keeps the subject the same apparent size
      const distanceFactor = 1 - (this.distance / this.targetDistance);
      this.scale = startScale * (1 + distanceFactor * 0.5);

      this.applyTransform();

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  applyTransform() {
    const scene = document.querySelector('.scene');
    scene.style.transform = `
      perspective(${1000 - this.distance * 2}px)
      scale(${this.scale})
      translateZ(${this.distance}px)
    `;
  }

  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
```

### Whip Pan

Extremely fast pan used for transitions.

```javascript
class WhipPan {
  constructor() {
    this.element = document.querySelector('.scene');
  }

  /**
   * Whip pan transition between two states
   * @param {Function} onMidpoint - Called at blur peak to swap content
   */
  transition(direction, duration, onMidpoint) {
    const distance = direction === 'left' ? -100 : 100;
    const blurPeak = 20;

    const timeline = gsap.timeline();

    // First half: accelerate and blur
    timeline.to(this.element, {
      x: distance,
      rotation: direction === 'left' ? -5 : 5,
      filter: `blur(${blurPeak}px)`,
      duration: duration / 2000,
      ease: 'power2.in',
      onComplete: onMidpoint
    });

    // Second half: decelerate from opposite side
    timeline.set(this.element, {
      x: -distance
    });

    timeline.to(this.element, {
      x: 0,
      rotation: 0,
      filter: 'blur(0px)',
      duration: duration / 2000,
      ease: 'power2.out'
    });

    return timeline;
  }
}
```

### Crash Zoom

Extremely fast dolly/zoom for dramatic effect.

```javascript
class CrashZoom {
  constructor() {
    this.scale = 1;
  }

  execute(targetScale, duration = 200) {
    return gsap.to(this, {
      scale: targetScale,
      duration: duration / 1000,
      ease: 'power4.out',
      onUpdate: () => {
        document.querySelector('.scene').style.transform =
          `scale(${this.scale})`;
      }
    });
  }

  // Crash in and hold
  crashIn(scale = 2, duration = 200) {
    return this.execute(scale, duration);
  }

  // Crash out from zoom
  crashOut(duration = 300) {
    return this.execute(1, duration);
  }
}
```

## Camera Controller

Unified camera system combining all movements.

```javascript
class CameraController {
  constructor(scene) {
    this.scene = scene;
    this.state = {
      x: 0,
      y: 0,
      z: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      fov: 60
    };

    this.shake = {
      active: false,
      intensity: 0,
      decay: 0.95,
      offset: { x: 0, y: 0, rotation: 0 }
    };
  }

  // Movement methods
  pan(degrees, duration) {
    return gsap.to(this.state, {
      rotateY: this.state.rotateY + degrees,
      duration: duration / 1000,
      onUpdate: () => this.render()
    });
  }

  tilt(degrees, duration) {
    return gsap.to(this.state, {
      rotateX: this.state.rotateX + degrees,
      duration: duration / 1000,
      onUpdate: () => this.render()
    });
  }

  dolly(distance, duration) {
    return gsap.to(this.state, {
      z: this.state.z + distance,
      duration: duration / 1000,
      onUpdate: () => this.render()
    });
  }

  truck(distance, duration) {
    return gsap.to(this.state, {
      x: this.state.x + distance,
      duration: duration / 1000,
      onUpdate: () => this.render()
    });
  }

  pedestal(distance, duration) {
    return gsap.to(this.state, {
      y: this.state.y + distance,
      duration: duration / 1000,
      onUpdate: () => this.render()
    });
  }

  zoom(scale, duration) {
    return gsap.to(this.state, {
      scale: scale,
      duration: duration / 1000,
      onUpdate: () => this.render()
    });
  }

  // Shake effect
  triggerShake(intensity, duration) {
    this.shake.active = true;
    this.shake.intensity = intensity;

    setTimeout(() => {
      this.shake.active = false;
    }, duration);
  }

  updateShake() {
    if (!this.shake.active) {
      this.shake.offset = { x: 0, y: 0, rotation: 0 };
      return;
    }

    this.shake.offset = {
      x: (Math.random() - 0.5) * 2 * this.shake.intensity,
      y: (Math.random() - 0.5) * 2 * this.shake.intensity,
      rotation: (Math.random() - 0.5) * 2 * this.shake.intensity * 0.05
    };

    this.shake.intensity *= this.shake.decay;
  }

  // Render current state
  render() {
    this.updateShake();

    const { x, y, z, rotateX, rotateY, rotateZ, scale } = this.state;
    const shake = this.shake.offset;

    this.scene.style.transform = `
      perspective(${1000 + z}px)
      translateX(${-x + shake.x}px)
      translateY(${-y + shake.y}px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      rotateZ(${rotateZ + shake.rotation}deg)
      scale(${scale})
    `;
  }

  // Complex movements
  orbitAround(centerX, centerY, radius, degrees, duration) {
    const startAngle = Math.atan2(this.state.y - centerY, this.state.x - centerX);
    const endAngle = startAngle + (degrees * Math.PI / 180);

    return gsap.to(this, {
      angle: endAngle,
      duration: duration / 1000,
      onUpdate: () => {
        this.state.x = centerX + Math.cos(this.angle) * radius;
        this.state.y = centerY + Math.sin(this.angle) * radius;
        this.state.rotateY = -(this.angle * 180 / Math.PI) + 90;
        this.render();
      }
    }, { angle: startAngle });
  }
}
```

## Three.js Integration

Camera movements for 3D scenes.

```javascript
import * as THREE from 'three';
import gsap from 'gsap';

class ThreeCameraController {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target || new THREE.Vector3();
  }

  pan(degrees, duration) {
    const radius = this.camera.position.distanceTo(this.target);
    const startAngle = Math.atan2(
      this.camera.position.x - this.target.x,
      this.camera.position.z - this.target.z
    );
    const endAngle = startAngle + (degrees * Math.PI / 180);

    return gsap.to({ angle: startAngle }, {
      angle: endAngle,
      duration: duration / 1000,
      onUpdate: function() {
        this.camera.position.x = this.target.x + Math.sin(this.angle) * radius;
        this.camera.position.z = this.target.z + Math.cos(this.angle) * radius;
        this.camera.lookAt(this.target);
      }.bind(this)
    });
  }

  dolly(distance, duration) {
    const direction = new THREE.Vector3()
      .subVectors(this.target, this.camera.position)
      .normalize();

    return gsap.to(this.camera.position, {
      x: this.camera.position.x + direction.x * distance,
      y: this.camera.position.y + direction.y * distance,
      z: this.camera.position.z + direction.z * distance,
      duration: duration / 1000,
      ease: 'power2.out'
    });
  }

  orbit(angleX, angleY, duration) {
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(
      new THREE.Vector3().subVectors(this.camera.position, this.target)
    );

    return gsap.to(spherical, {
      phi: spherical.phi + (angleX * Math.PI / 180),
      theta: spherical.theta + (angleY * Math.PI / 180),
      duration: duration / 1000,
      onUpdate: () => {
        const pos = new THREE.Vector3().setFromSpherical(spherical);
        this.camera.position.copy(pos.add(this.target));
        this.camera.lookAt(this.target);
      }
    });
  }
}
```

## Performance Considerations

1. **Use transform instead of position** - GPU accelerated
2. **Avoid layout triggers** - Don't animate width/height
3. **Use will-change sparingly** - Only on actively animating elements
4. **Request animation frame** - Sync with display refresh
5. **Debounce mouse tracking** - Limit updates for parallax

```javascript
// Optimized render loop
class OptimizedCamera {
  constructor() {
    this.needsRender = false;
    this.startRenderLoop();
  }

  scheduleRender() {
    this.needsRender = true;
  }

  startRenderLoop() {
    const loop = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
```
