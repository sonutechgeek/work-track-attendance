import { configureStore } from '@reduxjs/toolkit';
import authReducer       from './slices/auth.slice';
import attendanceReducer from './slices/attendance.slice';
import leaveReducer      from './slices/leave.slice';

const store = configureStore({
  reducer: {
    auth:       authReducer,
    attendance: attendanceReducer,
    leave:      leaveReducer,
  },
});

export default store;
