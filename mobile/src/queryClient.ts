import { QueryClient } from '@tanstack/react-query';

/**
 * Single app-wide QueryClient. Lives in its own module (not App.tsx) so
 * session lifecycle code can clear cached user data when the signed-in
 * user changes on the same device.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
