import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemePreference, saveThemePreference } from '@/utils/timeGreetingTheme';

interface ThemeState {
  preference: ThemePreference;
}

const initialState: ThemeState = {
  preference: 'auto',
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemePreference: (state, action: PayloadAction<ThemePreference>) => {
      state.preference = action.payload;
      saveThemePreference(action.payload);
    },
  },
});

export const { setThemePreference } = themeSlice.actions;
export default themeSlice.reducer;

