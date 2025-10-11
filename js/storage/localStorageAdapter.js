// LocalStorage Adapter

const KEYS = {
  employees: 'sp.employees',
  attendance: 'sp.attendance',
  extras: 'sp.extras',
  holidays: 'sp.holidays',
  disabilities: 'sp.disabilities',
  payrollHistory: 'sp.payrollHistory',
};

function readArray(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeArray(key, arr) {
  window.localStorage.setItem(key, JSON.stringify(arr));
}

function generateId(prefix = 'id') {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rnd}`;
}

export function createLocalStorageAdapter() {
  return {
    // Employees
    listEmployees: () => readArray(KEYS.employees),
    getEmployee: (id) => readArray(KEYS.employees).find(e => e.id === id) || null,
    createEmployee: (employee) => {
      const list = readArray(KEYS.employees);
      const row = { ...employee, id: generateId('emp') };
      list.push(row);
      writeArray(KEYS.employees, list);
      return row;
    },
    updateEmployee: (id, updates) => {
      const list = readArray(KEYS.employees);
      const idx = list.findIndex(e => e.id === id);
      if (idx === -1) return null;
      const updated = { ...list[idx], ...updates };
      list[idx] = updated;
      writeArray(KEYS.employees, list);
      return updated;
    },
    deleteEmployee: (id) => {
      const list = readArray(KEYS.employees);
      const next = list.filter(e => e.id !== id);
      writeArray(KEYS.employees, next);
      return true;
    },

    // Attendance
    listAttendance: (employeeId) => {
      const all = readArray(KEYS.attendance);
      return employeeId ? all.filter(a => a.employeeId === employeeId) : all;
    },
    upsertAttendance: (attendanceRecord) => {
      const all = readArray(KEYS.attendance);
      const idx = all.findIndex(a => a.id === attendanceRecord.id);
      if (idx === -1) {
        const row = { id: generateId('att'), ...attendanceRecord };
        all.push(row);
      } else {
        all[idx] = { ...all[idx], ...attendanceRecord };
      }
      writeArray(KEYS.attendance, all);
      return true;
    },
    deleteAttendance: (id) => {
      const all = readArray(KEYS.attendance);
      writeArray(KEYS.attendance, all.filter(a => a.id !== id));
      return true;
    },

    // Extras (bonos / rebajos)
    listExtras: (employeeId) => {
      const all = readArray(KEYS.extras);
      return employeeId ? all.filter(a => a.employeeId === employeeId) : all;
    },
    upsertExtra: (extra) => {
      const all = readArray(KEYS.extras);
      const idx = all.findIndex(a => a.id === extra.id);
      if (idx === -1) {
        const row = { id: generateId('ext'), ...extra };
        all.push(row);
      } else {
        all[idx] = { ...all[idx], ...extra };
      }
      writeArray(KEYS.extras, all);
      return true;
    },
    deleteExtra: (id) => {
      const all = readArray(KEYS.extras);
      writeArray(KEYS.extras, all.filter(a => a.id !== id));
      return true;
    },

    // Holidays
    listHolidays: () => readArray(KEYS.holidays),
    upsertHoliday: (holiday) => {
      const all = readArray(KEYS.holidays);
      const idx = all.findIndex(h => h.id === holiday.id);
      if (idx === -1) {
        all.push({ id: generateId('hol'), ...holiday });
      } else {
        all[idx] = { ...all[idx], ...holiday };
      }
      writeArray(KEYS.holidays, all);
      return true;
    },
    deleteHoliday: (id) => {
      const all = readArray(KEYS.holidays);
      writeArray(KEYS.holidays, all.filter(h => h.id !== id));
      return true;
    },

    // Disabilities (incapacidades)
    listDisabilities: (employeeId) => {
      const all = readArray(KEYS.disabilities);
      return employeeId ? all.filter(d => d.employeeId === employeeId) : all;
    },
    upsertDisability: (disability) => {
      const all = readArray(KEYS.disabilities);
      const idx = all.findIndex(d => d.id === disability.id);
      if (idx === -1) {
        all.push({ id: generateId('dis'), ...disability });
      } else {
        all[idx] = { ...all[idx], ...disability };
      }
      writeArray(KEYS.disabilities, all);
      return true;
    },
    deleteDisability: (id) => {
      const all = readArray(KEYS.disabilities);
      writeArray(KEYS.disabilities, all.filter(d => d.id !== id));
      return true;
    },

    // Payroll History
    listPayrollHistory: (employeeId) => {
      const all = readArray(KEYS.payrollHistory);
      return employeeId ? all.filter(p => p.employeeId === employeeId) : all;
    },
    createPayrollRecord: (record) => {
      const all = readArray(KEYS.payrollHistory);
      const row = { id: generateId('pay'), ...record };
      all.push(row);
      writeArray(KEYS.payrollHistory, all);
      return row;
    },
    deletePayrollRecord: (id) => {
      const all = readArray(KEYS.payrollHistory);
      writeArray(KEYS.payrollHistory, all.filter(p => p.id !== id));
      return true;
    },
  };
}


