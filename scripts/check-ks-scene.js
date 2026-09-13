import * as THREE from "three";

import {
    CUBE_NAME,
    CUBE_SIZE_M,
    SPHERE_NAME,
    SPHERE_RINGS,
    SPHERE_SEGMENTS,
    createFiveByFiveSphere,
} from "../src/lib/ksScene.js";

const sphere = createFiveByFiveSphere(THREE);
const { parameters } = sphere.geometry;
const failures = [];

if(sphere.name !== SPHERE_NAME) {
    failures.push(`expected sphere name ${SPHERE_NAME}, got ${sphere.name}`);
}

if(parameters.widthSegments !== SPHERE_SEGMENTS) {
    failures.push(`expected ${SPHERE_SEGMENTS} width segments, got ${parameters.widthSegments}`);
}

if(parameters.heightSegments !== SPHERE_RINGS) {
    failures.push(`expected ${SPHERE_RINGS} height rings, got ${parameters.heightSegments}`);
}

if(sphere.position.x === 0 && sphere.position.y === 0 && sphere.position.z === 0) {
    failures.push("sphere should sit beside the origin cube, not on top of it");
}

if(CUBE_SIZE_M !== 0.2) {
    failures.push(`expected ${CUBE_NAME} to be 0.2 m, got ${CUBE_SIZE_M}`);
}

if(failures.length) {
    // eslint-disable-next-line no-console
    console.error(failures.join("\n"));
    process.exit(1);
}

// eslint-disable-next-line no-console
console.log(`${SPHERE_NAME}: UV sphere ${parameters.widthSegments}×${parameters.heightSegments} beside ${CUBE_NAME}`);
