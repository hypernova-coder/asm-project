import { create } from 'zustand';

export type AppView = 'dashboard' | 'employees' | 'sites' | 'attendance' | 'notifications' | 'admins' | 'leave_requests' | 'cancellation_requests' | 'uniform_registry' | 'accounts' | 'consolidated_salary' | 'profile';

interface AppState {
  currentView: AppView;
  sidebarOpen: boolean;
  setCurrentView: (view: AppView) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCurrentView: (currentView) => set({ currentView }),
}));
