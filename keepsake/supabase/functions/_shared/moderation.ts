/**
 * Upload moderation decisions, kept pure so they can be tested without any vendor.
 * The edge function (moderate-photo/index.ts) gathers the signals; this decides what happens.
 *
 * Order matters: a known child-abuse hash match is handled first and differently from everything else:
 * the file is removed from view, kept as evidence for the legally required report, and never shown to
 * a human reviewer inside Keepsake.
 */
export type Signals = {
  /** Matched a known child sexual abuse imagery hash list (PhotoDNA, Cloudflare CSAM tool, Thorn Safer). */
  csamHashMatch: boolean;
  /** 0..1 likelihood scores from a general image classifier (Hive, Sightengine, Rekognition...). */
  nudity: number;
  sexualMinor: number;
  violence: number;
  selfHarm: number;
  /** The classifier could not be reached or returned an error. */
  classifierUnavailable: boolean;
};

export type Decision =
  | {state: 'removed'; escalate: 'ncmec-report'; reason: string}
  | {state: 'rejected'; reason: string}
  | {state: 'pending'; reason: string}
  | {state: 'approved'};

/** Thresholds are deliberately cautious for a 13+ audience; tune with real data and a reviewer. */
export const THRESHOLDS = {
  rejectNudity: 0.85,
  reviewNudity: 0.4,
  reviewSexualMinor: 0.2,
  rejectViolence: 0.9,
  reviewViolence: 0.5,
  reviewSelfHarm: 0.3,
};

export function decide(s: Signals): Decision {
  if (s.csamHashMatch)
    return {state: 'removed', escalate: 'ncmec-report', reason: 'known abuse imagery hash match'};
  if (s.sexualMinor >= THRESHOLDS.reviewSexualMinor)
    return {state: 'pending', reason: 'possible minor in sexual context: urgent human review'};
  if (s.classifierUnavailable)
    return {state: 'pending', reason: 'classifier unavailable: hold until checked'};
  if (s.nudity >= THRESHOLDS.rejectNudity) return {state: 'rejected', reason: 'nudity'};
  if (s.violence >= THRESHOLDS.rejectViolence) return {state: 'rejected', reason: 'graphic violence'};
  if (s.selfHarm >= THRESHOLDS.reviewSelfHarm)
    return {state: 'pending', reason: 'possible self-harm: review and offer support links'};
  if (s.nudity >= THRESHOLDS.reviewNudity) return {state: 'pending', reason: 'possible nudity'};
  if (s.violence >= THRESHOLDS.reviewViolence) return {state: 'pending', reason: 'possible violence'};
  return {state: 'approved'};
}

/** Owner decisions on upload limits. The client checks these too, but the server is the authority. */
export const UPLOAD_LIMITS = {
  maxBytes: 25 * 1024 * 1024,
  maxEdge: 2048,
  maxPhotosPerAccount: 500,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'],
};
export function checkUpload(file: {bytes: number; type: string}, photosOwned: number): string | null {
  if (!UPLOAD_LIMITS.allowedTypes.includes(file.type)) return 'That file type is not supported.';
  if (file.bytes > UPLOAD_LIMITS.maxBytes) return 'Photos can be up to 25 MB.';
  if (photosOwned >= UPLOAD_LIMITS.maxPhotosPerAccount)
    return 'Your archive holds up to 500 photos. Remove some to add more.';
  return null;
}
