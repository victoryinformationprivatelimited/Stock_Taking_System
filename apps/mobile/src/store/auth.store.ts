import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { clearLocalUserData } from '../lib/db';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'MANAGER' | 'COUNTER';
  tenantId: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const ACCESS_KEY = 'sts_access_token';
const REFRESH_KEY = 'sts_refresh_token';
const USER_KEY = 'sts_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  async hydrate() {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      user: userJson ? JSON.parse(userJson) : null,
      hydrated: true,
    });
  },
  async setSession(accessToken, refreshToken, user) {
    const previousUser = get().user;
    if (previousUser && previousUser.id !== user.id) {
      // Switching accounts on this device — drop any cached data from the previous account
      // so it never leaks into the new account's assignment list.
      await clearLocalUserData();
    }
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ accessToken, refreshToken, user });
  },
  async logout() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    await clearLocalUserData();
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
