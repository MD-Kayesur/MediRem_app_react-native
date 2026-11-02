import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';
import alarmSettingsReducer from './slices/alarmSettingsSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    alarmSettings: alarmSettingsReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(apiSlice.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export hooks, api endpoints, and slice actions
export * from './hooks';
export * from './api/apiSlice';
export * from './api/authApi';
export * from './api/userApi';
export * from './api/medicationsApi';
export * from './api/chatApi';
export * from './slices/authSlice';
export * from './slices/alarmSettingsSlice';
export * from './slices/themeSlice';
