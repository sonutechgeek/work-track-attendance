import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as attApi from '../../api/attendance.api';

export const fetchLiveTimer   = createAsyncThunk('attendance/liveTimer', async () => {
  const { data } = await attApi.getLiveTimer();
  return data.data;
});
export const fetchToday       = createAsyncThunk('attendance/today', async () => {
  const { data } = await attApi.getToday();
  return data.data;
});
export const checkInAsync     = createAsyncThunk('attendance/checkIn', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await attApi.checkIn(payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Check-in failed');
  }
});
export const checkOutAsync    = createAsyncThunk('attendance/checkOut', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await attApi.checkOut(payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Check-out failed');
  }
});
export const fetchMyHistory   = createAsyncThunk('attendance/myHistory', async (params) => {
  const { data } = await attApi.getMyHistory(params);
  return data.data;
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    today: null,
    timer: null,       // { active, checkInTime, elapsedMs }
    history: { records: [], pagination: {} },
    loading: false,
    error: null,
  },
  reducers: {
    clearAttError: (s) => { s.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLiveTimer.fulfilled,   (s, a) => { s.timer = a.payload; })
      .addCase(fetchToday.fulfilled,       (s, a) => {
        s.today = a.payload;
        // Seed timer from today's record so CheckInOutCard works after page refresh
        if (a.payload?.checkInTime && !a.payload?.checkOutTime) {
          const elapsed = Date.now() - new Date(a.payload.checkInTime).getTime();
          s.timer = { active: true, checkInTime: a.payload.checkInTime, elapsedMs: Math.max(0, elapsed) };
        } else if (!a.payload?.checkInTime) {
          s.timer = { active: false };
        }
      })
      .addCase(checkInAsync.pending,       (s)    => { s.loading = true; s.error = null; })
      .addCase(checkInAsync.fulfilled,     (s, a) => { s.loading = false; s.today = a.payload; s.timer = { active: true, checkInTime: a.payload.checkInTime, elapsedMs: 0 }; })
      .addCase(checkInAsync.rejected,      (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(checkOutAsync.pending,      (s)    => { s.loading = true; s.error = null; })
      .addCase(checkOutAsync.fulfilled,    (s, a) => { s.loading = false; s.today = a.payload; s.timer = { active: false }; })
      .addCase(checkOutAsync.rejected,     (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchMyHistory.fulfilled,   (s, a) => { s.history = a.payload; });
  },
});

export const { clearAttError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
