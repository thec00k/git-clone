/**
 * Stop Vite walking into the parent git-clone Svelte app's postcss.config.cjs
 * (Tailwind v3). Keepsake styles go through @tailwindcss/vite instead.
 */
export default {
  plugins: [],
};
