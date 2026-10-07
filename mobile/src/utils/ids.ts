export const makeId = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const makeToken = (prefix: string): string => `${prefix}_${makeId('t')}`;

export const nowIso = (): string => new Date().toISOString();

export const addSeconds = (seconds: number): string => new Date(Date.now() + seconds * 1000).toISOString();
