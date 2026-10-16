export const REVIEWED_MOBILIZE_SHA256: string;
export const REVIEWED_MOBILIZE_COUNT: number;
export const REVIEWED_PRIVATE_COUNT: number;
export function assertLocalContentSource(source: string | undefined): void;
export function prepareReviewedMobilize(rawBytes: Uint8Array): {
  records: Record<string, unknown>[];
  sourceSha256: string;
  recordCount: number;
  privateCount: number;
};
