import { create } from 'zustand';

export type AppView = 'dashboard' | 'employees' | 'sites' | 'attendance' | 'notifications' | 'admins' | 'leave_requests' | 'cancellation_requests' | 'uniform_registry' | 'accounts' | 'consolidated_salary' | 'profile';

interface AppState {
  currentView: AppView;
  sidebarOpen: boolean;
  pendingIdleFilter: boolean;
  setCurrentView: (view: AppView) => void;
  setSidebarOpen: (open: boolean) => void;
  setPendingIdleFilter: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  sidebarOpen: true,
  pendingIdleFilter: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCurrentView: (currentView) => set({ currentView }),
  setPendingIdleFilter: (pendingIdleFilter) => set({ pendingIdleFilter }),
}));
