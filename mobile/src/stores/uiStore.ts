import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastState = {
  toasts: Toast[];
  show: (message: string, options?: Partial<Omit<Toast, 'id' | 'message'>>) => void;
  dismiss: (id: string) => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, options = {}) => {
    counter += 1;
    const toast: Toast = { id: `toast_${counter}`, message, tone: 'default', ...options } as Toast;
    set((state) => ({ toasts: [...state.toasts.slice(-2), toast] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== toast.id) }));
    }, options.tone === 'error' ? 5000 : 3500);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, options?: Partial<Omit<Toast, 'id' | 'message'>>) =>
  useToastStore.getState().show(message, options);
