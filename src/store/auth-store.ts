import { create } from 'zustand';

export type UserRole = 'super_admin' | 'admin';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  allowedMenus?: string[]; // Menu IDs accessible by admin users (super_admin has all)
}

interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  setUser: (user: UserSession | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('asm_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('asm_user');
      }
    }
    set({ user, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('asm_user');
    }
    set({ user: null, isLoading: false });
  },
  init: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('asm_user');
        if (stored) {
          const user = JSON.parse(stored) as UserSession;
          set({ user, isLoading: false });
          return;
        }
      } catch {
        // ignore parse errors
      }
    }
    set({ isLoading: false });
  },
}));
