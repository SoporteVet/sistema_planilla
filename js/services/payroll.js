// Payroll calculation service for Costa Rica rules (per specs)

export const OVERTIME_MULTIPLIER = 1.5; // Recargo de ley (ordinario)
export const CCSS_RATE = 0.1067; // 10.67%

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function calcDiurna(hours, rate) {
  const baseHours = Math.min(hours, 8);
  const extraHours = Math.max(0, hours - 8);
  const basePay = baseHours * rate;
  const overtimePay = extraHours * rate * OVERTIME_MULTIPLIER;
  return { baseHours, extraHours, basePay, overtimePay, total: basePay + overtimePay };
}

function calcNocturna(hours, rate) {
  const dayCap = 6;
  const extraHours = Math.max(0, hours - dayCap);
  const baseHoursWorked = Math.min(hours, dayCap);
  const baseHoursToPay = hours >= dayCap ? 8 : baseHoursWorked; // paga 2 horas extra si cumple 6h
  const basePay = baseHoursToPay * rate;
  const overtimePay = extraHours * rate * OVERTIME_MULTIPLIER;
  return { baseHours: baseHoursToPay, extraHours, basePay, overtimePay, total: basePay + overtimePay };
}

function calcMixta(hours, rate) {
  const dayCap = 7;
  const baseHours = Math.min(hours, dayCap);
  const extraHours = Math.max(0, hours - dayCap);
  const basePay = baseHours * rate;
  const overtimePay = extraHours * rate * OVERTIME_MULTIPLIER;
  return { baseHours, extraHours, basePay, overtimePay, total: basePay + overtimePay };
}

function calcAcumulativa(dayIndex, hours, rate) {
  // 10h for days 0-3, 8h for day 4, weekends 0 cap (overtime if worked)
  const caps = [10,10,10,10,8,0,0];
  const cap = caps[clamp(dayIndex, 0, 6)];
  const baseHours = Math.min(hours, cap);
  const extraHours = Math.max(0, hours - cap);
  const basePay = baseHours * rate;
  const overtimePay = extraHours * rate * OVERTIME_MULTIPLIER;
  return { baseHours, extraHours, basePay, overtimePay, total: basePay + overtimePay };
}

export function calcDay({ jornada, dayIndex, hours }, rate) {
  switch (jornada) {
    case 'diurna': return calcDiurna(hours, rate);
    case 'nocturna': return calcNocturna(hours, rate);
    case 'mixta': return calcMixta(hours, rate);
    case 'acumulativa': return calcAcumulativa(dayIndex ?? 0, hours, rate);
    default: return { baseHours: 0, extraHours: 0, basePay: 0, overtimePay: 0, total: 0 };
  }
}

export function calcEmployeePayroll({ employee, days, extras = 0, deductions = 0, ccssRate = CCSS_RATE, disabilities = [], holidays = [] }) {
  // days: array of { date, dayIndex(0-6), hours }
  const rate = Number(employee.salarioHora || 0);
  let bruto = 0;
  let baseHoursTotal = 0;
  let overtimeHoursTotal = 0;

  for (let i = 0; i < days.length; i++) {
    const d = days[i];

    // Disability override
    const disability = disabilities.find(x => x.date === d.date);
    if (disability) {
      const normal = calcDay({ jornada: employee.jornada, dayIndex: d.dayIndex, hours: d.hours }, rate);
      const dayPay = disability.type === 'CCSS' ? normal.basePay * 0.5 : 0; // INS: 0
      bruto += dayPay;
      baseHoursTotal += 0; // do not count hours as worked for overtime aggregation
      continue;
    }

    // Holiday multiplier (optional): if holiday date, pay 2x for base hours
    const isHoliday = holidays.includes(d.date);
    const calc = calcDay({ jornada: employee.jornada, dayIndex: d.dayIndex, hours: d.hours }, rate);
    const basePay = isHoliday ? calc.basePay * 2 : calc.basePay;
    const total = basePay + calc.overtimePay;
    bruto += total;
    baseHoursTotal += calc.baseHours;
    overtimeHoursTotal += calc.extraHours;
  }

  bruto += Number(extras || 0);
  bruto -= Number(deductions || 0);

  const ccss = Math.max(0, bruto * ccssRate);
  const neto = bruto - ccss;
  const aguinaldo = bruto / 12;

  return {
    bruto, neto, ccss, aguinaldo,
    baseHoursTotal, overtimeHoursTotal,
  };
}

export function monthsBetween(startDateStr, endDateStr) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();
  
  // Si la fecha de fin es anterior al inicio, retorna 0
  if (end < start) return 0;
  
  // Calcular la diferencia de meses
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  
  // Si el día de la fecha final es menor al día de inicio,
  // significa que el mes actual aún no se ha completado
  if (end.getDate() < start.getDate()) {
    months -= 1;
  }
  
  return Math.max(0, months);
}

export function accruedVacationDays(employee, asOfDateStr) {
  // Calcula días de vacaciones acumuladas según ley CR: 1 día por mes trabajado
  // Solo cuenta meses completos desde la fecha de ingreso
  const months = monthsBetween(employee.fechaIngreso, asOfDateStr);
  return months; // 1 día por mes cumplido
}

/**
 * Calcula el aguinaldo acumulado basándose en el historial de planillas guardadas
 * En Costa Rica: aguinaldo = suma de salarios brutos del período / 12
 * Período: 1 diciembre año anterior al 30 noviembre año actual
 * @param {Array} payrollHistory - Historial de planillas del empleado
 * @param {string} asOfDateStr - Fecha hasta la cual calcular (YYYY-MM-DD)
 * @returns {Object} { totalBruto, aguinaldoAcumulado, periodCount, periodStart, periodEnd }
 */
export function calculateAguinaldoFromHistory(payrollHistory, asOfDateStr) {
  if (!payrollHistory || payrollHistory.length === 0) {
    return {
      totalBruto: 0,
      aguinaldoAcumulado: 0,
      periodCount: 0,
      periodStart: null,
      periodEnd: null,
    };
  }

  const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
  const currentYear = asOfDate.getFullYear();
  
  // Período de aguinaldo en Costa Rica: 1 dic año anterior - 30 nov año actual
  const periodStart = new Date(currentYear - 1, 11, 1); // 1 de diciembre año anterior
  const periodEnd = new Date(currentYear, 10, 30); // 30 de noviembre año actual
  
  // Filtrar registros dentro del período de aguinaldo
  const relevantRecords = payrollHistory.filter(record => {
    const recordDate = new Date(record.periodEnd || record.savedAt);
    return recordDate >= periodStart && recordDate <= periodEnd;
  });

  // Sumar todos los salarios brutos del período
  const totalBruto = relevantRecords.reduce((sum, record) => {
    return sum + Number(record.bruto || 0);
  }, 0);

  // Aguinaldo = total bruto / 12
  const aguinaldoAcumulado = totalBruto / 12;

  return {
    totalBruto,
    aguinaldoAcumulado,
    periodCount: relevantRecords.length,
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
  };
}


