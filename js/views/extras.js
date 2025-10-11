import { storage } from '../storage/index.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export async function renderExtrasView(root, { showToast }) {
  root.innerHTML = `
    <div class="panel-title">Bonos y Rebajos</div>
    <div class="toolbar">
      <select id="emp"><option value="">Seleccione empleado</option></select>
      <select id="extraType">
        <option value="bono">Bono</option>
        <option value="rebajo">Rebajo</option>
        <option value="comision">Comisión</option>
        <option value="incentivo">Incentivo</option>
      </select>
      <input id="amount" type="number" step="0.01" placeholder="Monto" />
      <input id="note" type="text" placeholder="Nota" />
      <button id="add" class="btn">Agregar</button>
    </div>

    <div class="card">
      <table class="table" id="table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Monto</th>
            <th>Nota</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const empSel = root.querySelector('#emp');
  const typeSel = root.querySelector('#extraType');
  const amountIn = root.querySelector('#amount');
  const noteIn = root.querySelector('#note');
  const tbody = root.querySelector('#table tbody');

  const employees = storage.listEmployees();
  empSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

  function renderRows() {
    const empId = empSel.value;
    const rows = empId ? storage.listExtras(empId) : [];
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td>${r.type}</td>
        <td>${Number(r.amount || 0).toFixed(2)}</td>
        <td>${r.note || ''}</td>
        <td style="text-align:right;"><button class="btn danger" data-action="del">Eliminar</button></td>
      </tr>
    `).join('');
  }

  root.querySelector('#add').addEventListener('click', () => {
    const empId = empSel.value; if (!empId) { showToast('Seleccione empleado'); return; }
    const extra = { employeeId: empId, type: typeSel.value, amount: Number(amountIn.value || 0), note: noteIn.value };
    storage.upsertExtra(extra); showToast('Registro agregado'); renderRows();
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="del"]'); 
    if (!btn) return;
    const row = btn.closest('tr'); 
    const id = row?.dataset?.id; 
    if (!id) return;

    ConfirmModal.show(
      'Eliminar Registro',
      '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.',
      'Eliminar',
      'Cancelar'
    ).then((confirmed) => {
      if (confirmed) {
        storage.deleteExtra(id); 
        showToast('Registro eliminado'); 
        renderRows();
      }
    });
  });

  empSel.addEventListener('change', renderRows);
  renderRows();
}


