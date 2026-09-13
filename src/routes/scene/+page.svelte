<script>
    import SceneCanvas from "$lib/SceneCanvas.svelte";

    let status = "Starting the scene…";

</script>

<svelte:head>
    <title>Keepsake scene</title>
</svelte:head>

<section
    class="flex min-h-[calc(100vh-5.5rem)] flex-col bg-neutral text-primary"
    data-testid="ks-scene">
    <header class="border-b border-white/10 px-4 py-3 sm:px-6">
        <p class="text-sm uppercase tracking-[0.2em] text-primary/60">Scene</p>
        <h1 class="m-0 text-2xl font-bold">ks_scene</h1>
        <p
            class="mt-1 text-sm text-primary/80"
            data-testid="ks-scene-status">
            {status}
        </p>
        <p class="mt-1 text-xs text-primary/55">
            Drag to orbit · 1 unit = 1 meter · 5×5 is the UV sphere segment count
        </p>
    </header>
    <div class="relative min-h-[28rem] flex-1">
        <SceneCanvas bind:status />
    </div>
</section>
