export const ROLES = {
  ADMIN:    'ADMIN',
  MANAGER:  'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

// Keys match the backend enum values sent in API requests
export const LEAVE_TYPES = {
  CASUAL:      'CASUAL',
  SICK:        'SICK',
  HALF_DAY:    'HALF_DAY',
  WFH:         'WFH',
  EARLY_LEAVE: 'EARLY_LEAVE',
  FIELD_VISIT: 'FIELD_VISIT',
};

export const LEAVE_STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger'  },
  CANCELLED:{ label: 'Cancelled',variant: 'default' },
};

export const ATTENDANCE_STATUS_CONFIG = {
  PRESENT:     { label: 'Present',     variant: 'success' },
  ABSENT:      { label: 'Absent',      variant: 'danger'  },
  HALF_DAY:    { label: 'Half Day',    variant: 'warning' },
  LEAVE:       { label: 'On Leave',    variant: 'info'    },
  WFH:         { label: 'WFH',         variant: 'cyan'    },
  FIELD_VISIT: { label: 'Field Visit', variant: 'orange'  },
};

export const ROLE_CONFIG = {
  ADMIN:    { label: 'Admin',    badgeVariant: 'danger'  },
  MANAGER:  { label: 'Manager',  badgeVariant: 'warning' },
  EMPLOYEE: { label: 'Employee', badgeVariant: 'success' },
};
