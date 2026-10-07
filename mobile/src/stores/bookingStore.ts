import { create } from 'zustand';
import { GeoPoint } from '../types';

export type PackageDraft = {
  package_type: string;
  package_size: string;
  description: string;
  quantity: number;
  weight_kg?: number;
  instructions: string;
  fragile: boolean;
};

type BookingDraft = {
  pickup: GeoPoint | null;
  dropoff: GeoPoint | null;
  pkg: PackageDraft;
  setPickup: (point: GeoPoint | null) => void;
  setDropoff: (point: GeoPoint | null) => void;
  setPkg: (patch: Partial<PackageDraft>) => void;
  reset: () => void;
};

const emptyPkg: PackageDraft = {
  package_type: 'parcel',
  package_size: 'small',
  description: '',
  quantity: 1,
  weight_kg: undefined,
  instructions: '',
  fragile: false,
};

export const useBookingStore = create<BookingDraft>((set) => ({
  pickup: null,
  dropoff: null,
  pkg: { ...emptyPkg },
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setPkg: (patch) => set((state) => ({ pkg: { ...state.pkg, ...patch } })),
  reset: () => set({ pickup: null, dropoff: null, pkg: { ...emptyPkg } }),
}));
