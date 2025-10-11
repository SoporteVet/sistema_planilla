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

  const employees = storage.listEmployees();
  empSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  // For disabilities section
  const disEmpSel = root.querySelector('#disEmp');
  disEmpSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

  function renderRows() {
    const empId = empSel.value;
    const rows = empId ? storage.listAttendance(empId) : [];
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
  root.querySelector('#save').addEventListener('click', () => {
    const empId = empSel.value;
    if (!empId) { showToast('Seleccione un empleado'); return; }
    const rec = { employeeId: empId, date: dateIn.value, hours: Number(hoursIn.value || 0), type: typeSel.value };
    storage.upsertAttendance(rec);
    showToast('Asistencia guardada');
    renderRows();
  });

  // Manejar eliminación de asistencias
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;
    
    const row = btn.closest('tr[data-id]');
    const attendanceId = row?.dataset?.id;
    if (!attendanceId) return;

    const attendance = storage.listAttendance(empSel.value).find(a => a.id === attendanceId);
    const attendanceDate = attendance?.date || 'esta asistencia';

    ConfirmModal.show(
      'Eliminar Asistencia',
      `¿Estás seguro de que deseas eliminar la asistencia del ${attendanceDate}?`,
      'Eliminar',
      'Cancelar'
    ).then((confirmed) => {
      if (confirmed) {
        deleteAttendance(attendanceId);
        showToast('Asistencia eliminada');
        renderRows();
      }
    });
  });

  // Función para eliminar asistencia usando el storage
  function deleteAttendance(id) {
    storage.deleteAttendance(id);
  }

  renderRows();

  // Holidays management
  const holidayTbody = root.querySelector('#holidayTable tbody');
  function renderHolidays() {
    const list = storage.listHolidays();
    holidayTbody.innerHTML = list.map(h => `
      <tr data-id="${h.id}"><td>${h.date}</td><td style="text-align:right;"><button class="btn danger" data-action="del">Eliminar</button></td></tr>
    `).join('');
  }
  root.querySelector('#addHoliday').addEventListener('click', () => {
    const date = root.querySelector('#holidayDate').value;
    if (!date) { showToast('Seleccione fecha de feriado'); return; }
    storage.upsertHoliday({ date }); showToast('Feriado agregado'); renderHolidays();
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
    ).then((confirmed) => {
      if (confirmed) {
        storage.deleteHoliday(id); 
        showToast('Feriado eliminado'); 
        renderHolidays();
      }
    });
  });
  renderHolidays();

  // Disabilities management
  const disTbody = root.querySelector('#disTable tbody');
  function renderDisabilities() {
    const list = storage.listDisabilities();
    disTbody.innerHTML = list.map(d => {
      const emp = employees.find(e => e.id === d.employeeId);
      return `<tr data-id="${d.id}"><td>${emp?.nombre || '-'}</td><td>${d.date}</td><td>${d.type}</td><td style="text-align:right;"><button class=\"btn danger\" data-action=\"del\">Eliminar</button></td></tr>`;
    }).join('');
  }
  root.querySelector('#addDis').addEventListener('click', () => {
    const employeeId = disEmpSel.value; if (!employeeId) { showToast('Seleccione empleado'); return; }
    const date = root.querySelector('#disDate').value; if (!date) { showToast('Seleccione fecha'); return; }
    const type = root.querySelector('#disType').value;
    storage.upsertDisability({ employeeId, date, type }); showToast('Incapacidad agregada'); renderDisabilities();
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
    ).then((confirmed) => {
      if (confirmed) {
        storage.deleteDisability(id); 
        showToast('Incapacidad eliminada'); 
        renderDisabilities();
      }
    });
  });
  renderDisabilities();
}


