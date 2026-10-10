import type { RoomFace } from "../../lib/roomLayout";
type Point = [number, number, number];
export interface RoomTheme {
  study?: boolean;
  review?: boolean;
  id: string; title: string; subtitle: string; asset: string; woodland: boolean;
  views: Record<RoomFace, { position: Point; target: Point }>;
  seated: { position: Point; target: Point };
  walkBounds: { minX: number; maxX: number; minZ: number; maxZ: number; keepOut?: { minX: number; maxX: number; minZ: number } };
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
  walkBounds: { minX: -2.08, maxX: 2.08, minZ: -1.12, maxZ: 1.82, keepOut: { minX: -1.5, maxX: -.3, minZ: 1.45 } },
  budget: { maxBytes: 8 * 1024 * 1024, maxTriangles: 180000, maxMaterials: 80, maxPrimitives: 350 },
};
export const beachfrontRoom: RoomTheme = {...woodlandRoom, id: "beachfront", title: "Beachfront", subtitle: "Salt air and afternoons worth keeping.", asset: "/room/beachfront/beachfront.glb", woodland: false, walkBounds: {...woodlandRoom.walkBounds, keepOut: undefined}};
export const cyberpunkRoom: RoomTheme = {...woodlandRoom,id:'cyberpunk',title:'Neon City',subtitle:'Small memories above a city of light.',asset:'/room/cyberpunk/cyberpunk.glb',woodland:false,walkBounds:{...woodlandRoom.walkBounds,keepOut:undefined}};
export const roomThemes = { woodland: woodlandRoom, beachfront: beachfrontRoom, cyberpunk:cyberpunkRoom };

export const qualityProfiles = {
  balanced: { dpr: 1.25, shadows: false, particles: 70 },
  high: { dpr: 1.75, shadows: true, particles: 150 },
} as const;
export type RoomQuality = keyof typeof qualityProfiles;
export type RoomDeviceTier = 'phone' | 'tablet' | 'desktop';
export function roomDeviceTier(width: number): RoomDeviceTier {
  return width < 640 ? 'phone' : width < 1100 ? 'tablet' : 'desktop';
}
export function roomRenderProfile(quality: RoomQuality, device: RoomDeviceTier) {
  const base = qualityProfiles[quality];
  if (device === 'desktop') return base;
  const high = quality === 'high';
  return {...base, dpr: device === 'phone' ? (high ? 1.25 : 1) : (high ? 1.5 : 1.1),
    particles: device === 'phone' ? (high ? 70 : 35) : (high ? 100 : 50)};
}
