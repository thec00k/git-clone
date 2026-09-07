import type { RoomFace } from "../../lib/roomLayout";
type Point = [number, number, number];
export interface RoomTheme {
  id: string; title: string; subtitle: string; asset: string; woodland: boolean;
  views: Record<RoomFace, { position: Point; target: Point }>;
  seated: { position: Point; target: Point };
  walkBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  fov: number;
  budget: { maxBytes: number; maxTriangles: number; maxMaterials: number; maxPrimitives: number };
}
const sharedViews: RoomTheme['views'] = {
  front: { position: [.65,1.32,1.6], target: [-.15,1.25,-1.68] },
  left: { position: [.18,1.32,.22], target: [-2.22,1.42,.05] },
  right: { position: [-.18,1.32,.22], target: [2.22,1.2,-.12] },
};
export const woodlandRoom: RoomTheme = {
  id: "woodland", title: "Woodland Writing Room", subtitle: "A little room. A whole life to keep.",
  asset: "/room/woodland/woodland.glb", woodland: true,
  views: sharedViews, fov: 50,
  seated: { position: [-.34,1.26,-.58], target: [-.15,.82,-1.68] },
  walkBounds: { minX: -2.08, maxX: 2.08, minZ: -1.12, maxZ: 1.82 },
  budget: { maxBytes: 8 * 1024 * 1024, maxTriangles: 180000, maxMaterials: 80, maxPrimitives: 350 },
};
export const classicRoom: RoomTheme = {
  ...woodlandRoom, id: "classic", title: "The original room", asset: "/room/keepsake.glb", woodland: false,
  views: { ...sharedViews, front: { position: [.05,1.32,.62], target: [-.15,.88,-1.62] } }, fov: 42,
};
export const roomThemes = { woodland: woodlandRoom, classic: classicRoom };
export const activeRoom = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("theme") === "classic" ? classicRoom : woodlandRoom;
export const qualityProfiles = {
  balanced: { dpr: 1.25, shadows: false, particles: 70 },
  high: { dpr: 1.75, shadows: true, particles: 150 },
} as const;
export type RoomQuality = keyof typeof qualityProfiles;
