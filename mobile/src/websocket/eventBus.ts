import { ServerEnvelope } from '../types';

type Handler = (envelope: ServerEnvelope) => void;

const handlers = new Set<Handler>();
const recent: ServerEnvelope[] = [];
const MAX_RECENT = 100;

export const publishEnvelope = (envelope: ServerEnvelope): void => {
  recent.push(envelope);
  if (recent.length > MAX_RECENT) recent.shift();
  handlers.forEach((handler) => {
    try {
      handler(envelope);
    } catch {
      // A listener must never break the event pipeline.
    }
  });
};

export const recentEnvelopes = (): ServerEnvelope[] => [...recent];

export const subscribeEnvelopes = (handler: Handler): (() => void) => {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
};
