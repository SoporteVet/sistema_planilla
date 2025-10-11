import { storage } from '../storage/index.js';
import { calcEmployeePayroll, accruedVacationDays } from '../services/payroll.js';
import { exportTableToXLSX, exportPayrollToPDF } from '../utils/export.js';

function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(num);
}

function buildDays(periodType) {
  const now = new Date();
  const start = new Date(now);
  if (periodType === 'semanal') start.setDate(now.getDate() - 6);
  if (periodType === 'quincenal') start.setDate(now.getDate() - 14);
  if (periodType === 'mensual') start.setMonth(now.getMonth() - 1);
  const days = [];
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    const dayIndex = d.getDay();
    const date = d.toISOString().slice(0,10);
    // default planned hours: read attendance later; fall back to 0
    days.push({ date, dayIndex, hours: 0 });
  }
  return days;
}

export async function renderPayrollView(root, { showToast }) {
  root.innerHTML = `
    <div class="panel-title">Planillas</div>
    <div class="toolbar">
      <label>Periodo</label>
      <select id="period">
        <option value="semanal">Semanal</option>
        <option value="quincenal">Quincenal</option>
        <option value="mensual">Mensual</option>
      </select>
      <button id="recalc" class="btn">Calcular</button>
      <button id="save-payroll" class="btn" style="background: var(--color-success);">Guardar Planilla</button>
      <div class="spacer"></div>
      <button id="export-xlsx" class="btn secondary">Exportar Excel</button>
      <button id="export-pdf" class="btn secondary">Exportar PDF</button>
    </div>

    <div class="card">
      <table class="table" id="payroll-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Vacaciones acumuladas (días)</th>
            <th>Bruto</th>
            <th>CCSS (10.67%)</th>
            <th>Neto</th>
            <th>Aguinaldo</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const tbody = root.querySelector('#payroll-table tbody');
  const periodSel = root.querySelector('#period');

  let employees = await storage.listEmployees();
  let holidays = [];
  let disabilities = [];
  let allAttendance = [];
  let allExtras = [];

  // Subscribe to real-time updates
  const unsubscribeEmployees = await storage.subscribeToEmployees((updated) => {
    employees = updated;
    recalc();
  });

  const unsubscribeHolidays = await storage.subscribeToHolidays((updated) => {
    holidays = updated;
    recalc();
  });

  const unsubscribeDisabilities = await storage.subscribeToDisabilities((updated) => {
    disabilities = updated;
    recalc();
  });

  const unsubscribeAttendance = await storage.subscribeToAttendance((updated) => {
    allAttendance = updated;
    recalc();
  });

  const unsubscribeExtras = await storage.subscribeToExtras((updated) => {
    allExtras = updated;
    recalc();
  });

  // Store unsubscribe functions for cleanup
  if (!window._unsubscribeFunctions) window._unsubscribeFunctions = {};
  window._unsubscribeFunctions.payroll_employees = unsubscribeEmployees;
  window._unsubscribeFunctions.payroll_holidays = unsubscribeHolidays;
  window._unsubscribeFunctions.payroll_disabilities = unsubscribeDisabilities;
  window._unsubscribeFunctions.payroll_attendance = unsubscribeAttendance;
  window._unsubscribeFunctions.payroll_extras = unsubscribeExtras;

  function recalc() {
    const holidayDates = holidays.map(h => h.date);
    const period = periodSel.value;
    const days = buildDays(period);

    const rows = employees.map(emp => {
      // Merge attendance into days (if any)
      const attendance = allAttendance.filter(a => a.employeeId === emp.id);
      const dayMap = Object.fromEntries(days.map(d => [d.date, { ...d }]));
      attendance.forEach(a => {
        if (dayMap[a.date]) dayMap[a.date].hours = Number(a.hours || 0);
      });
      const dayList = Object.values(dayMap);

      const disForEmp = disabilities.filter(d => d.employeeId === emp.id);
      const hol = holidayDates;
      const extrasForEmp = allExtras.filter(x => x.employeeId === emp.id);
      const extrasSum = extrasForEmp
        .filter(x => x.type === 'bono' || x.type === 'comision' || x.type === 'incentivo')
        .reduce((s,x) => s + Number(x.amount||0), 0);
      const deductionsSum = extrasForEmp
        .filter(x => x.type === 'rebajo')
        .reduce((s,x) => s + Number(x.amount||0), 0);

      const res = calcEmployeePayroll({ employee: emp, days: dayList, extras: extrasSum, deductions: deductionsSum, disabilities: disForEmp, holidays: hol });
      // Calcular vacaciones hasta la fecha del período
      const periodEndDate = days.length > 0 ? days[days.length - 1].date : new Date().toISOString().slice(0,10);
      const vac = accruedVacationDays(emp, periodEndDate);
      return { emp, ...res, vacaciones: vac };
    });

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.emp.nombre}</td>
        <td>${r.vacaciones}</td>
        <td>${formatCurrency(r.bruto)}</td>
        <td>${formatCurrency(r.ccss)}</td>
        <td>${formatCurrency(r.neto)}</td>
        <td>${formatCurrency(r.aguinaldo)}</td>
      </tr>
    `).join('');

    return rows;
  }

  let lastCalculatedRows = [];

  root.querySelector('#recalc').addEventListener('click', () => { 
    lastCalculatedRows = recalc(); 
    showToast('Planilla recalculada'); 
  });

  root.querySelector('#save-payroll').addEventListener('click', async () => {
    if (!lastCalculatedRows || lastCalculatedRows.length === 0) {
      showToast('Primero debes calcular la planilla');
      return;
    }

    const period = periodSel.value;
    const days = buildDays(period);
    const periodStartDate = days.length > 0 ? days[0].date : new Date().toISOString().slice(0,10);
    const periodEndDate = days.length > 0 ? days[days.length - 1].date : new Date().toISOString().slice(0,10);

    // Guardar cada registro de planilla para cada empleado
    for (const row of lastCalculatedRows) {
      const payrollRecord = {
        employeeId: row.emp.id,
        employeeName: row.emp.nombre,
        period: period,
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        bruto: row.bruto,
        ccss: row.ccss,
        neto: row.neto,
        aguinaldo: row.aguinaldo,
        vacaciones: row.vacaciones,
        baseHoursTotal: row.baseHoursTotal,
        overtimeHoursTotal: row.overtimeHoursTotal,
        savedAt: new Date().toISOString(),
      };
      await storage.createPayrollRecord(payrollRecord);
    }

    showToast(`Planilla guardada exitosamente (${lastCalculatedRows.length} empleados)`);
  });

  root.querySelector('#export-xlsx').addEventListener('click', () => {
    const table = root.querySelector('#payroll-table');
    exportTableToXLSX(table, 'planilla.xlsx');
  });
  root.querySelector('#export-pdf').addEventListener('click', () => {
    const rows = [...tbody.querySelectorAll('tr')].map(tr => {
      const tds = tr.querySelectorAll('td');
      return {
        nombre: tds[0].textContent,
        bruto: tds[2].textContent,
        ccss: tds[3].textContent,
        neto: tds[4].textContent,
      };
    });
    exportPayrollToPDF(rows, { title: 'Planilla', period: periodSel.value }, 'planilla.pdf');
  });

  lastCalculatedRows = recalc();
}


