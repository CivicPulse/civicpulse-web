export function canonicalJson(value: unknown): string;
export function canPublishReviewedDraft(state: {
  role: string | null;
  draft?: { kind?: string | null; id?: string | null; revision?: number | null; payload?: unknown } | null;
  kind: string;
  id: string;
  expectedRevision: number;
  payloadText: string;
  conflicted?: boolean;
  busy?: boolean;
  alreadyPublished?: boolean;
}): boolean;
export function publishReviewedDraft(
  state: Parameters<typeof canPublishReviewedDraft>[0],
  publish: (kind: string, id: string, revision: number) => Promise<unknown>,
): Promise<boolean>;
