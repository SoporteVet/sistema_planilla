// Storage facade - defaults to localStorage adapter

import { createLocalStorageAdapter } from './localStorageAdapter.js';

// In the future, we can switch to Firebase by swapping the adapter
// e.g., import { createFirebaseAdapter } from './firebaseAdapter.js'
// const adapter = createFirebaseAdapter(firebaseConfig)

const adapter = createLocalStorageAdapter();

export const storage = {
  // Employees
  listEmployees: adapter.listEmployees,
  getEmployee: adapter.getEmployee,
  createEmployee: adapter.createEmployee,
  updateEmployee: adapter.updateEmployee,
  deleteEmployee: adapter.deleteEmployee,

  // Attendance
  listAttendance: adapter.listAttendance,
  upsertAttendance: adapter.upsertAttendance,
  deleteAttendance: adapter.deleteAttendance,

  // Bonuses & deductions (stubs)
  listExtras: adapter.listExtras,
  upsertExtra: adapter.upsertExtra,
  deleteExtra: adapter.deleteExtra,

  // Holidays and disabilities (stubs)
  listHolidays: adapter.listHolidays,
  upsertHoliday: adapter.upsertHoliday,
  deleteHoliday: adapter.deleteHoliday,

  listDisabilities: adapter.listDisabilities,
  upsertDisability: adapter.upsertDisability,
  deleteDisability: adapter.deleteDisability,

  // Payroll History
  listPayrollHistory: adapter.listPayrollHistory,
  createPayrollRecord: adapter.createPayrollRecord,
  deletePayrollRecord: adapter.deletePayrollRecord,
};


