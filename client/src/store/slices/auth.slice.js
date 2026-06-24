import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from '../../api/auth.api';

export const loginAsync = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(credentials);
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

// Called once on app mount to restore session from stored token
export const getMeAsync = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.getMe();
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const logoutAsync = createAsyncThunk('auth/logout', async () => {
  try { await authApi.logout(); } catch {}
  localStorage.removeItem('accessToken');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:            null,
    isAuthenticated: false,
    loading:         false,  // login/logout in progress
    initializing:    !!localStorage.getItem('accessToken'), // true only if token exists → wait for getMe
    error:           null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(loginAsync.pending,    (s) => { s.loading = true; s.error = null; })
      .addCase(loginAsync.fulfilled,  (s, a) => {
        s.loading = false;
        s.user = a.payload.user;
        s.isAuthenticated = true;
        s.initializing = false;
      })
      .addCase(loginAsync.rejected,   (s, a) => { s.loading = false; s.error = a.payload; })
      // getMe — restores session on app start
      .addCase(getMeAsync.pending,    (s) => { s.initializing = true; })
      .addCase(getMeAsync.fulfilled,  (s, a) => { s.initializing = false; s.user = a.payload; s.isAuthenticated = true; })
      .addCase(getMeAsync.rejected,   (s) => { s.initializing = false; s.user = null; s.isAuthenticated = false; localStorage.removeItem('accessToken'); })
      // logout
      .addCase(logoutAsync.fulfilled, (s) => { s.user = null; s.isAuthenticated = false; s.initializing = false; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
