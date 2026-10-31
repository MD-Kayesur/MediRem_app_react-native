import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthUser } from '@medirem/types';
import { authApi } from '../api/authApi';

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  pendingEmail: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  user: {
    id: '3a78c40e-9654-462b-b362-99bcc9516f5a',
    name: 'MD Kayesur',
    email: 'rmdkayesur@gmail.com',
  },
  token: null,
  isAuthenticated: true,
  isGuest: false,
  pendingEmail: null,
  status: 'idle',
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthUser; token?: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token || null;
      state.isAuthenticated = true;
      state.isGuest = false;
      state.pendingEmail = null;
      state.error = null;
    },
    setPendingEmail: (state, action: PayloadAction<string>) => {
      state.pendingEmail = action.payload;
    },
    setGuestUser: (state) => {
      state.user = {
        id: `guest_${Date.now()}`,
        name: 'Guest User',
        email: 'guest@medirem.app',
      };
      state.token = null;
      state.isAuthenticated = true;
      state.isGuest = true;
      state.pendingEmail = null;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.pendingEmail = null;
      state.error = null;
      state.status = 'idle';
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Automatically update state on successful Sign In
    builder.addMatcher(authApi.endpoints.signIn.matchFulfilled, (state, action) => {
      if (action.payload.user) {
        state.user = action.payload.user;
        state.token = action.payload.token || null;
        state.isAuthenticated = true;
        state.isGuest = false;
        state.error = null;
      }
    });

    // Automatically store pending email on sign up
    builder.addMatcher(authApi.endpoints.signUp.matchFulfilled, (state, action) => {
      if (action.payload.email) {
        state.pendingEmail = action.payload.email;
      }
    });

    // Automatically update user if verifySignup returns user
    builder.addMatcher(authApi.endpoints.verifySignup.matchFulfilled, (state, action) => {
      if (action.payload.user) {
        state.user = action.payload.user;
      }
    });
  },
});

export const { setCredentials, setPendingEmail, setGuestUser, logout, setError } =
  authSlice.actions;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
export const selectIsGuest = (state: { auth: AuthState }) => state.auth.isGuest;
export const selectPendingEmail = (state: { auth: AuthState }) =>
  state.auth.pendingEmail;

export default authSlice.reducer;

