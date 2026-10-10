import poses from '../../generated/woodlandStudy.json';

export type WoodlandStudyView = 'establishing' | 'desk' | 'window' | 'hearth';
export const WOODLAND_STUDY_ASSET = '/room/woodland-study/woodland-study.glb';
/** Review-only route; never writes a room ID or replaces a user's saved environment. */
export function wantsWoodlandStudy(search: string) {
  return new URLSearchParams(search).get('study') === 'woodland';
}
export function woodlandStudyPose(view: WoodlandStudyView, portrait: boolean) {
  const key = portrait ? ({establishing:'portraitEstablishing',desk:'portraitDesk',window:'portraitWindow',hearth:'portraitHearth'} as const)[view] : view;
  return poses[key];
}


/** Screenshot-only camera: ?view=hearth places the camera without turning on the review controls or overrides. */
export function queryStudyView(search: string): WoodlandStudyView | null {
  const v = new URLSearchParams(search).get('view');
  return v === 'hearth' || v === 'desk' || v === 'window' || v === 'establishing' ? v : null;
}
