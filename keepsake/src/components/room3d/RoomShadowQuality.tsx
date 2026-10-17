import {useLayoutEffect} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import type * as THREE from 'three';

/**
 * Graphics quality without a freeze.
 *
 * three.js builds every material's shader around "are shadows on?" and "how many lights cast shadows?". Turning
 * the renderer's shadow map or a light's castShadow on and off at runtime therefore rebuilds every shader in the
 * room at once, which blocks the page. So the Canvas keeps shadows switched on in every quality, and Balanced
 * instead:
 * - sets each shadow-casting light's shadow strength to 0 (a shader value, not part of the shader itself). The
 *   shader then multiplies the light by exactly 1, the same result as having no shadow code at all;
 * - stops redrawing the shadow map, so Balanced keeps saving the work of the extra shadow pass.
 */
export function RoomShadowQuality({enabled}: {enabled: boolean}) {
  const get = useThree(s => s.get);
  useLayoutEffect(() => {
    const {gl, invalidate} = get();
    gl.shadowMap.autoUpdate = enabled;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [get, enabled]);
  useFrame(({scene}) => {
    // Checked every frame, before the room is drawn, because lights can mount later (a new room, a late Suspense).
    // Only lights that are visible take part in shading, so only those need the right strength.
    const strength = enabled ? 1 : 0;
    scene.traverseVisible(object => {
      const light = object as THREE.Light & {shadow?: THREE.LightShadow};
      if (!light.isLight || !light.castShadow || !light.shadow) return;
      // With strength 0 an undrawn or old shadow map is ignored (three.js binds a blank one), so Balanced never
      // needs to draw it.
      if (light.shadow.intensity !== strength) light.shadow.intensity = strength;
    });
  });
  return null;
}
