export const PRIVATE_LOCATION: string;
export const PRIVATE_EVENT_KEYS: readonly string[];
export function assertPublicPrivateEvent(event: object): object;
export function isPublicMapEvent(event: object): boolean;
export function publicIcsLocation(event: object): string;
