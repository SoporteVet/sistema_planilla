import { storage } from '../storage/index.js';
import { Modal } from '../components/Modal.js';
import { ConfirmModal } from '../components/ConfirmModal.js';
import { calculateAguinaldoFromHistory } from '../services/payroll.js';

function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(num);
}

function employeeRowTemplate(emp) {
  return `
    <tr data-id="${emp.id}">
      <td>${emp.nombre}</td>
      <td>${emp.cedula}</td>
      <td>${emp.puesto || ''}</td>
      <td><span class="badge info">${emp.jornada}</span></td>
      <td>${formatCurrency(emp.salarioHora)}</td>
      <td>${emp.fechaIngreso || ''}</td>
      <td style="text-align:right;">
        <button class="btn" data-action="edit">Editar</button>
        <button class="btn danger" data-action="delete">Eliminar</button>
      </td>
    </tr>
  `;
}

function renderTable(container, employees, filterText) {
  const normalized = (filterText || '').toLowerCase();
  const filtered = !normalized
    ? employees
    : employees.filter(e => [e.nombre, e.cedula, e.puesto].filter(Boolean).some(v => String(v).toLowerCase().includes(normalized)));

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Cédula</th>
          <th>Puesto</th>
          <th>Jornada</th>
          <th>₡/Hora</th>
          <th>Ingreso</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(employeeRowTemplate).join('') || '<tr><td colspan="7">Sin registros</td></tr>'}
      </tbody>
    </table>
  `;
}

function readForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return {
    nombre: data.nombre?.trim(),
    cedula: data.cedula?.trim(),
    puesto: data.puesto?.trim(),
    jornada: data.jornada,
    salarioHora: Number(data.salarioHora || 0),
    fechaIngreso: data.fechaIngreso,
  };
}

function validateEmployee(emp) {
  const errors = [];
  if (!emp.nombre) errors.push('Nombre es requerido');
  if (!emp.cedula) errors.push('Cédula es requerida');
  if (!emp.jornada) errors.push('Jornada es requerida');
  if (!emp.salarioHora || emp.salarioHora <= 0) errors.push('Salario por hora debe ser mayor a 0');
  return errors;
}

export async function renderEmployeesView(root, { showToast }) {
  root.innerHTML = `
    <div class="panel-title">Empleados</div>
    
    <div class="tabs" style="margin-bottom: 20px;">
      <button class="tab-btn active" data-tab="list">Lista de Empleados</button>
      <button class="tab-btn" data-tab="history">Historial de Salarios</button>
    </div>

    <div id="tab-content">
      <div id="tab-list" class="tab-panel active">
        <div class="toolbar">
          <input id="search" type="text" placeholder="Buscar por nombre, cédula o puesto" style="min-width:280px" />
          <div class="spacer"></div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <form id="employee-form" class="grid cols-4" autocomplete="off">
            <div>
              <label>Nombre</label>
              <input name="nombre" type="text" placeholder="Nombre completo" required />
            </div>
            <div>
              <label>Cédula</label>
              <input name="cedula" type="text" placeholder="Ej: 1-2345-6789" required />
            </div>
            <div>
              <label>Puesto</label>
              <input name="puesto" type="text" placeholder="Puesto" />
            </div>
            <div>
              <label>Jornada</label>
              <select name="jornada" required>
                <option value="diurna">Diurna (máx 8h)</option>
                <option value="nocturna">Nocturna (máx 6h, paga como 8h)</option>
                <option value="mixta">Mixta (máx 7h)</option>
                <option value="acumulativa">Acumulativa (48h/sem: 10,10,10,10,8)</option>
              </select>
            </div>
            <div>
              <label>₡/Hora</label>
              <input name="salarioHora" type="number" step="0.00000001" min="0" placeholder="0" required />
            </div>
            <div>
              <label>Fecha ingreso</label>
              <input name="fechaIngreso" type="date" />
            </div>
            <div>
              <label>&nbsp;</label>
              <button class="btn" type="submit">Agregar</button>
            </div>
          </form>
        </div>

        <div id="table-container"></div>
      </div>

      <div id="tab-history" class="tab-panel">
        <div class="toolbar">
          <label>Empleado</label>
          <select id="history-employee-select" style="min-width:280px">
            <option value="">Todos los empleados</option>
          </select>
          <div class="spacer"></div>
        </div>
        <div id="history-container"></div>
      </div>
    </div>
  `;

  // Tab switching logic
  const tabBtns = root.querySelectorAll('.tab-btn');
  const tabPanels = root.querySelectorAll('.tab-panel');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      root.querySelector(`#tab-${targetTab}`).classList.add('active');

      if (targetTab === 'history') {
        renderHistoryTab();
      }
    });
  });

  const tableContainer = root.querySelector('#table-container');
  const searchInput = root.querySelector('#search');
  const form = root.querySelector('#employee-form');

  let employees = await storage.listEmployees();
  renderTable(tableContainer, employees, '');

  // Subscribe to real-time updates
  const unsubscribeEmployees = await storage.subscribeToEmployees((updatedEmployees) => {
    employees = updatedEmployees;
    renderTable(tableContainer, employees, searchInput.value);
  });

  // Store unsubscribe function for cleanup
  root.dataset.unsubscribe = 'employees';
  if (!window._unsubscribeFunctions) window._unsubscribeFunctions = {};
  window._unsubscribeFunctions.employees = unsubscribeEmployees;

  searchInput.addEventListener('input', () => {
    renderTable(tableContainer, employees, searchInput.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emp = readForm(form);
    const errors = validateEmployee(emp);
    if (errors.length) { showToast(errors[0]); return; }
    await storage.createEmployee(emp);
    form.reset();
    showToast('Empleado agregado');
  });

  tableContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('tr[data-id]');
    const id = row?.dataset?.id;
    const action = btn.dataset.action;
    if (!id) return;

    if (action === 'delete') {
      const employee = await storage.getEmployee(id);
      const employeeName = employee?.nombre || 'este empleado';
      
      ConfirmModal.show(
        'Eliminar Empleado',
        `¿Estás seguro de que deseas eliminar a ${employeeName}? Esta acción no se puede deshacer.`,
        'Eliminar',
        'Cancelar'
      ).then(async (confirmed) => {
        if (confirmed) {
          await storage.deleteEmployee(id);
          showToast('Empleado eliminado');
        }
      });
      return;
    }

    if (action === 'edit') {
      const current = await storage.getEmployee(id);
      if (!current) return;

      const modal = new Modal();
      modal.createModal(
        'Editar Empleado',
        'Modifica los datos del empleado'
      );

      modal.setFormContent(`
        <div class="form-group">
          <label for="nombre">Nombre *</label>
          <input type="text" name="nombre" id="nombre" placeholder="Nombre completo" required />
        </div>
        <div class="form-group">
          <label for="cedula">Cédula *</label>
          <input type="text" name="cedula" id="cedula" placeholder="Ej: 1-2345-6789" required />
        </div>
        <div class="form-group">
          <label for="puesto">Puesto</label>
          <input type="text" name="puesto" id="puesto" placeholder="Puesto" />
        </div>
        <div class="form-group">
          <label for="jornada">Jornada *</label>
          <select name="jornada" id="jornada" required>
            <option value="diurna">Diurna (máx 8h)</option>
            <option value="nocturna">Nocturna (máx 6h, paga como 8h)</option>
            <option value="mixta">Mixta (máx 7h)</option>
            <option value="acumulativa">Acumulativa (48h/sem: 10,10,10,10,8)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="salarioHora">₡/Hora *</label>
          <input type="number" name="salarioHora" id="salarioHora" step="0.00000001" min="0" placeholder="0" required />
        </div>
        <div class="form-group">
          <label for="fechaIngreso">Fecha ingreso</label>
          <input type="date" name="fechaIngreso" id="fechaIngreso" />
        </div>
      `);

      // Set current values
      modal.setFormData({
        nombre: current.nombre,
        cedula: current.cedula,
        puesto: current.puesto || '',
        jornada: current.jornada,
        salarioHora: current.salarioHora,
        fechaIngreso: current.fechaIngreso || ''
      });

      // Handle save
      modal.onSave(async (data) => {
        const updates = {
          nombre: data.nombre?.trim(),
          cedula: data.cedula?.trim(),
          puesto: data.puesto?.trim(),
          jornada: data.jornada,
          salarioHora: Number(data.salarioHora || 0),
          fechaIngreso: data.fechaIngreso,
        };

        const errors = validateEmployee(updates);
        if (errors.length) {
          showToast(errors[0]);
          return;
        }

        await storage.updateEmployee(id, updates);
        modal.close();
        showToast('Empleado actualizado');
      });
    }
  });

  // Render History Tab
  async function renderHistoryTab() {
    const historyContainer = root.querySelector('#history-container');
    const employeeSelect = root.querySelector('#history-employee-select');
    
    // Populate employee select
    const currentOptions = [...employeeSelect.querySelectorAll('option:not([value=""])')];
    if (currentOptions.length === 0) {
      employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.nombre;
        employeeSelect.appendChild(opt);
      });
    }

    async function renderHistory(employeeId) {
      const history = employeeId 
        ? await storage.listPayrollHistory(employeeId)
        : await storage.listPayrollHistory();
      
      if (history.length === 0) {
        historyContainer.innerHTML = '<div class="card"><p style="text-align:center; color: var(--color-text-secondary);">No hay registros de planillas guardadas. Guarda una planilla desde la sección de Planillas.</p></div>';
        return;
      }

      // Ordenar por fecha más reciente primero
      history.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

      // Calcular aguinaldo si hay un empleado seleccionado
      let aguinaldoSummary = '';
      if (employeeId) {
        const aguinaldoData = calculateAguinaldoFromHistory(history);
        aguinaldoSummary = `
          <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h3 style="margin-bottom: 15px;">📊 Resumen de Aguinaldo</h3>
            <div class="grid cols-4" style="gap: 20px;">
              <div>
                <div style="opacity: 0.9; font-size: 13px; margin-bottom: 5px;">Período</div>
                <div style="font-weight: 600; font-size: 16px;">${aguinaldoData.periodStart} al ${aguinaldoData.periodEnd}</div>
              </div>
              <div>
                <div style="opacity: 0.9; font-size: 13px; margin-bottom: 5px;">Planillas Procesadas</div>
                <div style="font-weight: 600; font-size: 16px;">${aguinaldoData.periodCount} períodos</div>
              </div>
              <div>
                <div style="opacity: 0.9; font-size: 13px; margin-bottom: 5px;">Total Bruto Acumulado</div>
                <div style="font-weight: 600; font-size: 16px;">${formatCurrency(aguinaldoData.totalBruto)}</div>
              </div>
              <div>
                <div style="opacity: 0.9; font-size: 13px; margin-bottom: 5px;">Aguinaldo Calculado</div>
                <div style="font-weight: 700; font-size: 20px;">${formatCurrency(aguinaldoData.aguinaldoAcumulado)}</div>
              </div>
            </div>
          </div>
        `;
      }

      historyContainer.innerHTML = `
        ${aguinaldoSummary}
        <div class="card">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha Guardado</th>
                <th>Empleado</th>
                <th>Período</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Horas Base</th>
                <th>Horas Extra</th>
                <th>Bruto</th>
                <th>CCSS</th>
                <th>Neto</th>
                <th>Aguinaldo</th>
                <th>Vacaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(record => `
                <tr>
                  <td>${new Date(record.savedAt).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>${record.employeeName}</td>
                  <td><span class="badge info">${record.period}</span></td>
                  <td>${record.periodStart}</td>
                  <td>${record.periodEnd}</td>
                  <td>${record.baseHoursTotal || 0}h</td>
                  <td>${record.overtimeHoursTotal || 0}h</td>
                  <td>${formatCurrency(record.bruto)}</td>
                  <td>${formatCurrency(record.ccss)}</td>
                  <td>${formatCurrency(record.neto)}</td>
                  <td>${formatCurrency(record.aguinaldo)}</td>
                  <td>${record.vacaciones} días</td>
                  <td>
                    <button class="btn danger small" data-action="delete" data-id="${record.id}">Eliminar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Handle delete
      historyContainer.querySelectorAll('button[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (confirm('¿Estás seguro de eliminar este registro?')) {
            await storage.deletePayrollRecord(id);
            await renderHistory(employeeSelect.value);
            showToast('Registro eliminado');
          }
        });
      });
    }

    employeeSelect.addEventListener('change', () => {
      renderHistory(employeeSelect.value);
    });

    await renderHistory('');
  }
}


