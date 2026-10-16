export class CmsOutcomeUnknown extends Error {
  constructor() {
    super('The request did not finish in time. Its outcome is not confirmed. Reload this record to check the saved revision before trying another change.');
    this.name = 'CmsOutcomeUnknown';
  }
}

/** No retry: a timed-out write may still have committed at the server. */
export function withCmsDeadline(request, milliseconds = 20000, timers = globalThis) {
  return new Promise((resolve, reject) => {
    const timer = timers.setTimeout(() => reject(new CmsOutcomeUnknown()), milliseconds);
    Promise.resolve(request).then(resolve, reject).finally(() => timers.clearTimeout(timer));
  });
}
