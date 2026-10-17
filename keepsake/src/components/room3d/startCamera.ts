import * as THREE from 'three';

type Point = [number, number, number];

/**
 * Canvas camera options for the very first frame. React Three Fiber aims any camera without a
 * rotation at (0,0,0), the floor; giving it the view's own rotation makes the room open already
 * facing that view instead of tilting up from the floor.
 */
export function startCamera(view: {position: Point; target: Point}) {
  const aim = new THREE.Matrix4().lookAt(
    new THREE.Vector3(...view.position),
    new THREE.Vector3(...view.target),
    new THREE.Vector3(0, 1, 0),
  );
  const turn = new THREE.Euler().setFromRotationMatrix(aim);
  return {position: view.position, rotation: [turn.x, turn.y, turn.z] as Point};
}
