// Storage facade - using Firebase adapter for multi-device sync

import { createFirebaseAdapter } from './firebaseAdapter.js';
import { firebaseConfig } from '../firebase/config.js';

// Initialize Firebase adapter asynchronously
let adapterPromise = createFirebaseAdapter(firebaseConfig);
let adapter = null;

// Helper to ensure adapter is ready
async function ensureAdapter() {
  if (!adapter) {
    adapter = await adapterPromise;
  }
  return adapter;
}

export const storage = {
  // Employees
  async listEmployees() {
    const a = await ensureAdapter();
    return a.listEmployees();
  },
  async subscribeToEmployees(callback) {
    const a = await ensureAdapter();
    return a.subscribeToEmployees(callback);
  },
  async getEmployee(id) {
    const a = await ensureAdapter();
    return a.getEmployee(id);
  },
  async createEmployee(employee) {
    const a = await ensureAdapter();
    return a.createEmployee(employee);
  },
  async updateEmployee(id, updates) {
    const a = await ensureAdapter();
    return a.updateEmployee(id, updates);
  },
  async deleteEmployee(id) {
    const a = await ensureAdapter();
    return a.deleteEmployee(id);
  },

  // Attendance
  async listAttendance(employeeId) {
    const a = await ensureAdapter();
    return a.listAttendance(employeeId);
  },
  async subscribeToAttendance(callback) {
    const a = await ensureAdapter();
    return a.subscribeToAttendance(callback);
  },
  async upsertAttendance(record) {
    const a = await ensureAdapter();
    return a.upsertAttendance(record);
  },
  async deleteAttendance(id) {
    const a = await ensureAdapter();
    return a.deleteAttendance(id);
  },

  // Bonuses & deductions
  async listExtras(employeeId) {
    const a = await ensureAdapter();
    return a.listExtras(employeeId);
  },
  async subscribeToExtras(callback) {
    const a = await ensureAdapter();
    return a.subscribeToExtras(callback);
  },
  async upsertExtra(extra) {
    const a = await ensureAdapter();
    return a.upsertExtra(extra);
  },
  async deleteExtra(id) {
    const a = await ensureAdapter();
    return a.deleteExtra(id);
  },

  // Holidays and disabilities
  async listHolidays() {
    const a = await ensureAdapter();
    return a.listHolidays();
  },
  async subscribeToHolidays(callback) {
    const a = await ensureAdapter();
    return a.subscribeToHolidays(callback);
  },
  async upsertHoliday(holiday) {
    const a = await ensureAdapter();
    return a.upsertHoliday(holiday);
  },
  async deleteHoliday(id) {
    const a = await ensureAdapter();
    return a.deleteHoliday(id);
  },

  async listDisabilities(employeeId) {
    const a = await ensureAdapter();
    return a.listDisabilities(employeeId);
  },
  async subscribeToDisabilities(callback) {
    const a = await ensureAdapter();
    return a.subscribeToDisabilities(callback);
  },
  async upsertDisability(disability) {
    const a = await ensureAdapter();
    return a.upsertDisability(disability);
  },
  async deleteDisability(id) {
    const a = await ensureAdapter();
    return a.deleteDisability(id);
  },

  // Payroll History
  async listPayrollHistory(employeeId) {
    const a = await ensureAdapter();
    return a.listPayrollHistory(employeeId);
  },
  async subscribeToPayrollHistory(callback) {
    const a = await ensureAdapter();
    return a.subscribeToPayrollHistory(callback);
  },
  async createPayrollRecord(record) {
    const a = await ensureAdapter();
    return a.createPayrollRecord(record);
  },
  async deletePayrollRecord(id) {
    const a = await ensureAdapter();
    return a.deletePayrollRecord(id);
  },
};


