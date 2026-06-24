import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as leaveApi from '../../api/leave.api';

export const fetchMyBalance   = createAsyncThunk('leave/myBalance', async (params) => {
  const { data } = await leaveApi.getMyBalance(params);
  return data.data;
});
export const fetchMyLeaves    = createAsyncThunk('leave/myLeaves', async (params) => {
  const { data } = await leaveApi.getMyLeaves(params);
  return data.data;
});
export const fetchPending     = createAsyncThunk('leave/pending', async () => {
  const { data } = await leaveApi.getPending();
  return data.data;
});
export const fetchTeamLeaves  = createAsyncThunk('leave/team', async (params) => {
  const { data } = await leaveApi.getTeamLeaves(params);
  return data.data;
});
export const fetchAllLeaves   = createAsyncThunk('leave/all', async (params) => {
  const { data } = await leaveApi.getAllLeaves(params);
  return data.data;
});
export const applyLeaveAsync  = createAsyncThunk('leave/apply', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await leaveApi.applyLeave(payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to apply');
  }
});
export const approveLeaveAsync = createAsyncThunk('leave/approve', async ({ id, comments }, { rejectWithValue }) => {
  try {
    const { data } = await leaveApi.approveLeave(id, { comments });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});
export const rejectLeaveAsync = createAsyncThunk('leave/reject', async ({ id, comments }, { rejectWithValue }) => {
  try {
    const { data } = await leaveApi.rejectLeave(id, { comments });
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const leaveSlice = createSlice({
  name: 'leave',
  initialState: {
    balance:   null,
    leaves:    { records: [], pagination: {} },
    pending:   [],
    allLeaves: { records: [], pagination: {} },
    loading:   false,
    error:     null,
  },
  reducers: {
    clearLeaveError: (s) => { s.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBalance.fulfilled,    (s, a) => { s.balance   = a.payload; })
      .addCase(fetchMyLeaves.fulfilled,     (s, a) => { s.leaves    = a.payload; })
      .addCase(fetchPending.fulfilled,      (s, a) => { s.pending   = a.payload; })
      .addCase(fetchTeamLeaves.fulfilled,   (s, a) => { s.allLeaves = a.payload; })
      .addCase(fetchAllLeaves.fulfilled,    (s, a) => { s.allLeaves = a.payload; })

      .addCase(applyLeaveAsync.pending,     (s)    => { s.loading = true;  s.error = null; })
      .addCase(applyLeaveAsync.fulfilled,   (s)    => { s.loading = false; })
      .addCase(applyLeaveAsync.rejected,    (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(approveLeaveAsync.pending,   (s)    => { s.loading = true; })
      .addCase(approveLeaveAsync.fulfilled, (s, a) => {
        s.loading = false;
        const updated = a.payload;
        if (updated?.id) {
          s.pending = s.pending.filter((l) => l.id !== updated.id);
          if (s.allLeaves?.leaves) {
            s.allLeaves = { ...s.allLeaves, leaves: s.allLeaves.leaves.map((l) => l.id === updated.id ? { ...l, ...updated } : l) };
          }
        }
      })
      .addCase(approveLeaveAsync.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(rejectLeaveAsync.pending,    (s)    => { s.loading = true; })
      .addCase(rejectLeaveAsync.fulfilled,  (s, a) => {
        s.loading = false;
        const updated = a.payload;
        if (updated?.id) {
          s.pending = s.pending.filter((l) => l.id !== updated.id);
          if (s.allLeaves?.leaves) {
            s.allLeaves = { ...s.allLeaves, leaves: s.allLeaves.leaves.map((l) => l.id === updated.id ? { ...l, ...updated } : l) };
          }
        }
      })
      .addCase(rejectLeaveAsync.rejected,   (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { clearLeaveError } = leaveSlice.actions;
export default leaveSlice.reducer;
