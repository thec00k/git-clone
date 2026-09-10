/** Scene units are meters. */
export const CUBE_SIZE_M = 0.2;
export const CUBE_NAME = "ks_test";
export const SPHERE_NAME = "ks_sphere";
export const SPHERE_RADIUS_M = 0.2;
export const SPHERE_SEGMENTS = 5;
export const SPHERE_RINGS = 5;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 */
function paintWoodGrain(ctx, size) {
    ctx.fillStyle = "#8a5a32";
    ctx.fillRect(0, 0, size, size);

    for(let i = 0; i < 48; i += 1) {
        const y = (i / 48) * size;
        const wobble = Math.sin(i * 0.55) * 6;

        ctx.strokeStyle = i % 3 === 0 ? "#6e4324" : "#a56c3d";
        ctx.lineWidth = 1.2 + (i % 4) * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.3, y + wobble, size * 0.7, y - wobble, size, y + wobble * 0.4);
        ctx.stroke();
    }
}

/**
 * @param {typeof import("three")} THREE
 * @returns {import("three").CanvasTexture}
 */
export function createWoodTexture(THREE) {
    const size = 512;
    const canvas = document.createElement("canvas");

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");

    if(!ctx) {
        throw new Error("Could not create a 2D canvas for the wood grain");
    }

    paintWoodGrain(ctx, size);

    const texture = new THREE.CanvasTexture(canvas);

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

/**
 * @param {typeof import("three")} THREE
 * @returns {import("three").Mesh}
 */
export function createWoodenCube(THREE) {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE_M, CUBE_SIZE_M, CUBE_SIZE_M);
    const material = new THREE.MeshStandardMaterial({
        map       : createWoodTexture(THREE),
        roughness : 0.72,
        metalness : 0.04,
        name      : "wood",
    });
    const cube = new THREE.Mesh(geometry, material);

    cube.name = CUBE_NAME;
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.position.set(0, 0, 0);

    return cube;
}

/**
 * 5×5 UV sphere (5 longitude segments, 5 latitude rings), matching
 * Blender's `primitive_uv_sphere_add(segments=5, ring_count=5)`.
 *
 * @param {typeof import("three")} THREE
 * @returns {import("three").Mesh}
 */
export function createFiveByFiveSphere(THREE) {
    const geometry = new THREE.SphereGeometry(
        SPHERE_RADIUS_M,
        SPHERE_SEGMENTS,
        SPHERE_RINGS
    );
    const material = new THREE.MeshStandardMaterial({
        color       : 0x7ec8e3,
        flatShading : true,
        metalness   : 0.12,
        name        : "glass-ice",
        roughness   : 0.28,
    });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.name = SPHERE_NAME;
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    // Sit beside the origin cube so both objects stay visible.
    sphere.position.set(0.45, 0, 0);

    return sphere;
}

/**
 * @param {typeof import("three")} THREE
 * @param {import("three").Scene} scene
 */
function addLights(THREE, scene) {
    const hemi = new THREE.HemisphereLight(0xfff4e5, 0x2a2118, 0.7);
    const key = new THREE.DirectionalLight(0xffe6c8, 1.15);
    const fill = new THREE.DirectionalLight(0xb8d4ff, 0.35);

    key.position.set(1.2, 1.8, 1.1);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    fill.position.set(-1.4, 0.6, -0.8);
    scene.add(hemi, key, fill);
}

/**
 * @param {typeof import("three")} THREE
 * @returns {import("three").Mesh}
 */
function createFloor(THREE) {
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(1.6, 48),
        new THREE.MeshStandardMaterial({
            color     : 0x3a2f26,
            roughness : 0.9,
            metalness : 0.02,
        })
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -CUBE_SIZE_M / 2;
    floor.receiveShadow = true;

    return floor;
}

/**
 * @param {typeof import("three")} THREE
 * @returns {{ scene: import("three").Scene, cube: import("three").Mesh, sphere: import("three").Mesh }}
 */
export function buildKsScene(THREE) {
    const scene = new THREE.Scene();
    const cube = createWoodenCube(THREE);
    const sphere = createFiveByFiveSphere(THREE);

    scene.name = "ks_scene";
    scene.background = new THREE.Color(0x16120f);
    scene.add(createFloor(THREE));
    scene.add(new THREE.GridHelper(2, 20, 0x6a5848, 0x3d332c));
    scene.add(new THREE.AxesHelper(0.4));
    addLights(THREE, scene);
    scene.add(cube);
    scene.add(sphere);

    return {
        scene,
        cube,
        sphere,
    };
}
