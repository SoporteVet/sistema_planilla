import { storage } from '../storage/index.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export async function renderAttendanceView(root, { showToast }) {
  root.innerHTML = `
    <div class="panel-title">Asistencias</div>
    <div class="toolbar">
      <select id="emp">
        <option value="">Seleccione empleado</option>
      </select>
      <input id="date" type="date" />
      <input id="hours" type="number" min="0" max="24" step="0.25" placeholder="Horas" />
      <select id="type">
        <option value="presente">Presente</option>
        <option value="ausencia">Ausencia</option>
        <option value="tardanza">Tardanza</option>
        <option value="permiso">Permiso</option>
      </select>
      <button id="save" class="btn">Guardar</button>
    </div>

    <div class="card">
      <table class="table" id="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Horas</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <div class="grid cols-2" style="margin-top:12px;">
      <div class="card">
        <div class="panel-title">Feriados</div>
        <div class="toolbar">
          <input id="holidayDate" type="date" />
          <button id="addHoliday" class="btn">Agregar feriado</button>
        </div>
        <table class="table" id="holidayTable">
          <thead><tr><th>Fecha</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="card">
        <div class="panel-title">Incapacidades</div>
        <div class="toolbar">
          <select id="disEmp"><option value="">Empleado</option></select>
          <input id="disDate" type="date" />
          <select id="disType"><option value="CCSS">CCSS (50%)</option><option value="INS">INS (0%)</option></select>
          <button id="addDis" class="btn">Agregar</button>
        </div>
        <table class="table" id="disTable">
          <thead><tr><th>Empleado</th><th>Fecha</th><th>Tipo</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const empSel = root.querySelector('#emp');
  const dateIn = root.querySelector('#date');
  const hoursIn = root.querySelector('#hours');
  const typeSel = root.querySelector('#type');
  const tableBody = root.querySelector('#table tbody');

  let employees = await storage.listEmployees();
  let allAttendance = [];
  empSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  // For disabilities section
  const disEmpSel = root.querySelector('#disEmp');
  disEmpSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

  // Subscribe to real-time updates for employees
  const unsubscribeEmployees = await storage.subscribeToEmployees((updatedEmployees) => {
    employees = updatedEmployees;
    empSel.innerHTML = '<option value="">Seleccione empleado</option>' + 
      employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    disEmpSel.innerHTML = '<option value="">Empleado</option>' + 
      employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  });

  // Subscribe to real-time updates for attendance
  const unsubscribeAttendance = await storage.subscribeToAttendance((updatedAttendance) => {
    allAttendance = updatedAttendance;
    renderRows();
  });

  // Store unsubscribe functions for cleanup
  if (!window._unsubscribeFunctions) window._unsubscribeFunctions = {};
  window._unsubscribeFunctions.attendance_employees = unsubscribeEmployees;
  window._unsubscribeFunctions.attendance = unsubscribeAttendance;

  function renderRows() {
    const empId = empSel.value;
    const rows = empId ? allAttendance.filter(x => x.employeeId === empId) : [];
    tableBody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td>${r.date}</td>
        <td>${r.type}</td>
        <td>${r.hours ?? '-'}</td>
        <td style="text-align:right;">
          <button class="btn danger" data-action="delete" style="padding: 6px 12px; font-size: 12px;">Eliminar</button>
        </td>
      </tr>
    `).join('');
  }

  empSel.addEventListener('change', renderRows);
  root.querySelector('#save').addEventListener('click', async () => {
    const empId = empSel.value;
    if (!empId) { showToast('Seleccione un empleado'); return; }
    const rec = { employeeId: empId, date: dateIn.value, hours: Number(hoursIn.value || 0), type: typeSel.value };
    await storage.upsertAttendance(rec);
    showToast('Asistencia guardada');
  });

  // Manejar eliminación de asistencias
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;
    
    const row = btn.closest('tr[data-id]');
    const attendanceId = row?.dataset?.id;
    if (!attendanceId) return;

    const attendance = allAttendance.find(a => a.id === attendanceId);
    const attendanceDate = attendance?.date || 'esta asistencia';

    ConfirmModal.show(
      'Eliminar Asistencia',
      `¿Estás seguro de que deseas eliminar la asistencia del ${attendanceDate}?`,
      'Eliminar',
      'Cancelar'
    ).then(async (confirmed) => {
      if (confirmed) {
        await storage.deleteAttendance(attendanceId);
        showToast('Asistencia eliminada');
      }
    });
  });

  renderRows();

  // Holidays management
  const holidayTbody = root.querySelector('#holidayTable tbody');
  let allHolidays = [];
  
  // Subscribe to real-time updates for holidays
  const unsubscribeHolidays = await storage.subscribeToHolidays((updatedHolidays) => {
    allHolidays = updatedHolidays;
    renderHolidays();
  });
  
  window._unsubscribeFunctions.holidays = unsubscribeHolidays;
  
  function renderHolidays() {
    holidayTbody.innerHTML = allHolidays.map(h => `
      <tr data-id="${h.id}"><td>${h.date}</td><td style="text-align:right;"><button class="btn danger" data-action="del">Eliminar</button></td></tr>
    `).join('');
  }
  root.querySelector('#addHoliday').addEventListener('click', async () => {
    const date = root.querySelector('#holidayDate').value;
    if (!date) { showToast('Seleccione fecha de feriado'); return; }
    await storage.upsertHoliday({ date }); 
    showToast('Feriado agregado');
  });
  root.querySelector('#holidayTable').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="del"]'); 
    if (!btn) return;
    const id = btn.closest('tr')?.dataset?.id; 
    if (!id) return;

    ConfirmModal.show(
      'Eliminar Feriado',
      '¿Estás seguro de que deseas eliminar este feriado?',
      'Eliminar',
      'Cancelar'
    ).then(async (confirmed) => {
      if (confirmed) {
        await storage.deleteHoliday(id); 
        showToast('Feriado eliminado');
      }
    });
  });
  renderHolidays();

  // Disabilities management
  const disTbody = root.querySelector('#disTable tbody');
  let allDisabilities = [];
  
  // Subscribe to real-time updates for disabilities
  const unsubscribeDisabilities = await storage.subscribeToDisabilities((updatedDisabilities) => {
    allDisabilities = updatedDisabilities;
    renderDisabilities();
  });
  
  window._unsubscribeFunctions.disabilities = unsubscribeDisabilities;
  
  function renderDisabilities() {
    disTbody.innerHTML = allDisabilities.map(d => {
      const emp = employees.find(e => e.id === d.employeeId);
      return `<tr data-id="${d.id}"><td>${emp?.nombre || '-'}</td><td>${d.date}</td><td>${d.type}</td><td style="text-align:right;"><button class=\"btn danger\" data-action=\"del\">Eliminar</button></td></tr>`;
    }).join('');
  }
  root.querySelector('#addDis').addEventListener('click', async () => {
    const employeeId = disEmpSel.value; if (!employeeId) { showToast('Seleccione empleado'); return; }
    const date = root.querySelector('#disDate').value; if (!date) { showToast('Seleccione fecha'); return; }
    const type = root.querySelector('#disType').value;
    await storage.upsertDisability({ employeeId, date, type }); 
    showToast('Incapacidad agregada');
  });
  root.querySelector('#disTable').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="del"]'); 
    if (!btn) return;
    const id = btn.closest('tr')?.dataset?.id; 
    if (!id) return;

    ConfirmModal.show(
      'Eliminar Incapacidad',
      '¿Estás seguro de que deseas eliminar este registro de incapacidad?',
      'Eliminar',
      'Cancelar'
    ).then(async (confirmed) => {
      if (confirmed) {
        await storage.deleteDisability(id); 
        showToast('Incapacidad eliminada');
      }
    });
  });
  renderDisabilities();
}


