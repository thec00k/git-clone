<script>
    import { onMount } from "svelte";

    /** @type {HTMLCanvasElement} */
    let canvas;

    /** @type {string} */
    export let status = "Starting the scene…";

    onMount(async () => {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { buildKsScene, CUBE_NAME, SPHERE_NAME, SPHERE_RINGS, SPHERE_SEGMENTS } = await import("$lib/ksScene.js");

        const { scene } = buildKsScene(THREE);
        const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 50);
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias : true,
        });
        const controls = new OrbitControls(camera, renderer.domElement);
        const cube = scene.getObjectByName(CUBE_NAME);
        const sphere = scene.getObjectByName(SPHERE_NAME);

        let frame = 0;
        let running = true;

        camera.position.set(0.95, 0.55, 1.15);
        camera.lookAt(0.2, 0, 0);
        renderer.shadowMap.enabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        controls.target.set(0.2, 0, 0);
        controls.enableDamping = true;

        const resize = () => {
            const { clientWidth, clientHeight } = canvas.parentElement ?? canvas;
            const width = Math.max(1, clientWidth);
            const height = Math.max(1, clientHeight);

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(width, height, false);
        };

        const tick = () => {
            if(!running) {
                return;
            }

            controls.update();
            renderer.render(scene, camera);
            frame = requestAnimationFrame(tick);
        };

        resize();
        window.addEventListener("resize", resize);
        tick();

        const sphereMesh = /** @type {import("three").Mesh | undefined} */ (sphere);
        const sphereGeom = /** @type {import("three").SphereGeometry | undefined} */ (sphereMesh?.geometry);
        const params = sphereGeom?.parameters;

        let sphereLabel = "sphere missing";

        if(sphere && params) {
            sphereLabel = `${SPHERE_NAME} UV sphere ${params.widthSegments}×${params.heightSegments}`;
        }

        status = `${cube ? `${CUBE_NAME} cube at origin` : "cube missing"} · ${sphereLabel}`;

        if(params && (params.widthSegments !== SPHERE_SEGMENTS || params.heightSegments !== SPHERE_RINGS)) {
            status += " (unexpected segment count)";
        }

        return () => {
            running = false;
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", resize);
            controls.dispose();
            renderer.dispose();
            scene.traverse((obj) => {
                if(!(obj instanceof THREE.Mesh)) {
                    return;
                }

                obj.geometry.dispose();

                const materials = Array.isArray(obj.material) ? obj.material : [ obj.material ];

                for(const mat of materials) {
                    mat.map?.dispose?.();
                    mat.dispose();
                }
            });
        };
    });
</script>

<canvas
    bind:this={canvas}
    class="block h-full w-full"
    data-testid="ks-scene-canvas"
></canvas>
