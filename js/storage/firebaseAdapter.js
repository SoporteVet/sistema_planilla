// Firebase Realtime Database adapter (placeholder, ready to wire)
// Requires: provide a firebase config and ensure initFirebase() returns an active database instance.

// Option 1: Use CDN ESM modules in js/firebase/init.js and pass firebaseConfig
// Option 2: Replace with your bundler-based imports

import { initFirebase } from '../firebase/init.js';

export function createFirebaseAdapter(firebaseConfig) {
  const { db, api } = initFirebase(firebaseConfig);

  async function readList(path) {
    const snapshot = await api.get(api.ref(db, path));
    const value = snapshot.val();
    return value ? Object.values(value) : [];
  }

  async function writeObject(path, id, obj) {
    await api.set(api.ref(db, `${path}/${id}`), obj);
    return obj;
  }

  async function deleteById(path, id) {
    await api.remove(api.ref(db, `${path}/${id}`));
    return true;
  }

  function newId(prefix='id') {
    const rnd = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now()}_${rnd}`;
  }

  return {
    // Employees
    async listEmployees() { return await readList('employees'); },
    async getEmployee(id) {
      const snap = await api.get(api.ref(db, `employees/${id}`));
      return snap.val();
    },
    async createEmployee(employee) {
      const row = { ...employee, id: newId('emp') };
      await writeObject('employees', row.id, row);
      return row;
    },
    async updateEmployee(id, updates) {
      const ref = api.ref(db, `employees/${id}`);
      const snap = await api.get(ref);
      if (!snap.exists()) return null;
      const next = { ...snap.val(), ...updates };
      await api.set(ref, next);
      return next;
    },
    async deleteEmployee(id) { return await deleteById('employees', id); },

    // Attendance
    async listAttendance(employeeId) {
      const list = await readList('attendance');
      return employeeId ? list.filter(x => x.employeeId === employeeId) : list;
    },
    async upsertAttendance(record) {
      const id = record.id || newId('att');
      await writeObject('attendance', id, { id, ...record });
      return true;
    },

    // Extras
    async listExtras(employeeId) {
      const list = await readList('extras');
      return employeeId ? list.filter(x => x.employeeId === employeeId) : list;
    },
    async upsertExtra(extra) {
      const id = extra.id || newId('ext');
      await writeObject('extras', id, { id, ...extra });
      return true;
    },
    async deleteExtra(id) { return await deleteById('extras', id); },

    // Holidays
    async listHolidays() { return await readList('holidays'); },
    async upsertHoliday(holiday) {
      const id = holiday.id || newId('hol');
      await writeObject('holidays', id, { id, ...holiday });
      return true;
    },
    async deleteHoliday(id) { return await deleteById('holidays', id); },

    // Disabilities
    async listDisabilities(employeeId) {
      const list = await readList('disabilities');
      return employeeId ? list.filter(x => x.employeeId === employeeId) : list;
    },
    async upsertDisability(disability) {
      const id = disability.id || newId('dis');
      await writeObject('disabilities', id, { id, ...disability });
      return true;
    },
    async deleteDisability(id) { return await deleteById('disabilities', id); },

    // Payroll History
    async listPayrollHistory(employeeId) {
      const list = await readList('payrollHistory');
      return employeeId ? list.filter(x => x.employeeId === employeeId) : list;
    },
    async createPayrollRecord(record) {
      const row = { ...record, id: newId('pay') };
      await writeObject('payrollHistory', row.id, row);
      return row;
    },
    async deletePayrollRecord(id) { return await deleteById('payrollHistory', id); },
  };
}



