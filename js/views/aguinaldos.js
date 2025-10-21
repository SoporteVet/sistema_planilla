import { storage } from '../storage/index.js';
import { exportTableToXLSX, exportPayrollToPDF } from '../utils/export.js';

function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(num);
}

function getMonthName(monthNumber) {
  const months = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthNumber] || '';
}

export async function renderAguinaldosView(root, { showToast }) {
  root.innerHTML = `
    <div class="panel-title">Cálculo de Aguinaldos</div>
    
    <div class="toolbar">
      <label>Empleado</label>
      <select id="filtro-empleado" style="min-width: 200px;">
        <option value="">Todos los empleados</option>
      </select>
      <label>Año</label>
      <select id="filtro-ano">
        <option value="2024">2024</option>
        <option value="2023">2023</option>
        <option value="2022">2022</option>
      </select>
      <button id="btn-agregar-salario" class="btn">Agregar Salario Mensual</button>
      <button id="btn-calcular" class="btn" style="background: var(--color-success);">Calcular Aguinaldos</button>
      <div class="spacer"></div>
      <button id="btn-export-excel" class="btn secondary">Exportar Excel</button>
      <button id="btn-export-pdf" class="btn secondary">Exportar PDF</button>
    </div>

    <div id="resumen-aguinaldos" class="card" style="display: none; margin-bottom: 20px;">
      <h3>Resumen de Aguinaldos</h3>
      <div class="grid cols-3">
        <div class="summary-item">
          <span class="label">Total Salarios Brutos:</span>
          <span class="value" id="total-bruto">₡0.00</span>
        </div>
        <div class="summary-item">
          <span class="label">Aguinaldo Calculado:</span>
          <span class="value" id="total-aguinaldo">₡0.00</span>
        </div>
        <div class="summary-item">
          <span class="label">Empleados Procesados:</span>
          <span class="value" id="total-empleados">0</span>
        </div>
      </div>
    </div>

    <div class="card">
      <table class="table" id="tabla-aguinaldos">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Enero</th>
            <th>Febrero</th>
            <th>Marzo</th>
            <th>Abril</th>
            <th>Mayo</th>
            <th>Junio</th>
            <th>Julio</th>
            <th>Agosto</th>
            <th>Septiembre</th>
            <th>Octubre</th>
            <th>Noviembre</th>
            <th>Diciembre</th>
            <th>Total Bruto</th>
            <th>Aguinaldo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const filtroEmpleado = root.querySelector('#filtro-empleado');
  const filtroAno = root.querySelector('#filtro-ano');
  const btnAgregarSalario = root.querySelector('#btn-agregar-salario');
  const btnCalcular = root.querySelector('#btn-calcular');
  const btnExportExcel = root.querySelector('#btn-export-excel');
  const btnExportPDF = root.querySelector('#btn-export-pdf');
  const tablaAguinaldos = root.querySelector('#tabla-aguinaldos tbody');
  const resumenAguinaldos = root.querySelector('#resumen-aguinaldos');

  let empleados = [];
  let salariosMensuales = [];
  let aguinaldosCalculados = [];

  // Cargar datos iniciales
  async function cargarDatos() {
    empleados = await storage.listEmployees();
    salariosMensuales = await storage.listAguinaldoSalarios() || [];
    
    // Llenar dropdown de empleados
    filtroEmpleado.innerHTML = '<option value="">Todos los empleados</option>' +
      empleados.map(emp => `<option value="${emp.id}">${emp.nombre}</option>`).join('');
    
    renderizarTabla();
  }

  // Renderizar tabla de aguinaldos
  function renderizarTabla() {
    const empleadoFiltro = filtroEmpleado.value;
    const anoFiltro = filtroAno.value;
    
    // Filtrar empleados
    let empleadosFiltrados = empleados;
    if (empleadoFiltro) {
      empleadosFiltrados = empleados.filter(emp => emp.id === empleadoFiltro);
    }

    // Crear datos de aguinaldos para cada empleado
    const datosAguinaldos = empleadosFiltrados.map(empleado => {
      const salariosDelAno = salariosMensuales.filter(s => 
        s.employeeId === empleado.id && s.ano === parseInt(anoFiltro)
      );

      // Crear objeto con salarios por mes
      const salariosPorMes = {};
      for (let i = 1; i <= 12; i++) {
        const salario = salariosDelAno.find(s => s.mes === i);
        salariosPorMes[i] = salario ? Number(salario.salarioBruto) : 0;
      }

      // Calcular total bruto y aguinaldo
      const totalBruto = Object.values(salariosPorMes).reduce((sum, salario) => sum + salario, 0);
      const aguinaldo = totalBruto / 12;

      return {
        empleado,
        salariosPorMes,
        totalBruto,
        aguinaldo,
        tieneSalarios: totalBruto > 0
      };
    });

    // Renderizar tabla
    tablaAguinaldos.innerHTML = datosAguinaldos.map(dato => {
      const fila = `
        <tr data-empleado-id="${dato.empleado.id}">
          <td>${dato.empleado.nombre}</td>
          ${Array.from({length: 12}, (_, i) => {
            const mes = i + 1;
            const salario = dato.salariosPorMes[mes];
            return `<td class="salario-mes" data-mes="${mes}" data-empleado="${dato.empleado.id}">
              ${salario > 0 ? formatCurrency(salario) : '<span class="text-muted">-</span>'}
            </td>`;
          }).join('')}
          <td class="total-bruto">${formatCurrency(dato.totalBruto)}</td>
          <td class="aguinaldo">${formatCurrency(dato.aguinaldo)}</td>
          <td>
            <button class="btn small" data-action="edit" data-empleado="${dato.empleado.id}">
              Editar
            </button>
            <button class="btn small danger" data-action="delete" data-empleado="${dato.empleado.id}">
              Eliminar
            </button>
          </td>
        </tr>
      `;
      return fila;
    }).join('') || '<tr><td colspan="16" style="text-align: center; color: #666;">No hay datos para mostrar</td></tr>';

    // Actualizar resumen
    actualizarResumen(datosAguinaldos);
  }

  // Actualizar resumen de aguinaldos
  function actualizarResumen(datosAguinaldos) {
    const totalBruto = datosAguinaldos.reduce((sum, dato) => sum + dato.totalBruto, 0);
    const totalAguinaldo = datosAguinaldos.reduce((sum, dato) => sum + dato.aguinaldo, 0);
    const empleadosConSalarios = datosAguinaldos.filter(dato => dato.tieneSalarios).length;

    root.querySelector('#total-bruto').textContent = formatCurrency(totalBruto);
    root.querySelector('#total-aguinaldo').textContent = formatCurrency(totalAguinaldo);
    root.querySelector('#total-empleados').textContent = empleadosConSalarios;

    if (totalBruto > 0) {
      resumenAguinaldos.style.display = 'block';
    } else {
      resumenAguinaldos.style.display = 'none';
    }
  }

  // Mostrar modal para agregar/editar salario
  function mostrarModalSalario(empleadoId = null, mes = null, ano = null) {
    const modal = document.getElementById('modalAguinaldo');
    const form = document.getElementById('formAguinaldo');
    
    // Llenar dropdown de empleados
    const selectEmpleado = document.getElementById('aguinaldoEmpleado');
    selectEmpleado.innerHTML = empleados.map(emp => 
      `<option value="${emp.id}">${emp.nombre}</option>`
    ).join('');

    // Si es edición, cargar datos existentes
    if (empleadoId && mes && ano) {
      const salarioExistente = salariosMensuales.find(s => 
        s.employeeId === empleadoId && s.mes === mes && s.ano === ano
      );
      
      if (salarioExistente) {
        document.getElementById('aguinaldoId').value = salarioExistente.id || '';
        document.getElementById('aguinaldoEmpleado').value = empleadoId;
        document.getElementById('aguinaldoAno').value = ano;
        document.getElementById('aguinaldoMes').value = mes;
        document.getElementById('aguinaldoSalarioBruto').value = salarioExistente.salarioBruto;
        document.getElementById('aguinaldoObservaciones').value = salarioExistente.observaciones || '';
      }
    } else {
      // Nuevo salario
      form.reset();
      document.getElementById('aguinaldoAno').value = filtroAno.value;
    }

    modal.style.display = 'block';
  }

  // Guardar salario mensual
  async function guardarSalario(formData) {
    const salarioData = {
      employeeId: formData.employeeId,
      ano: parseInt(formData.ano),
      mes: parseInt(formData.mes),
      salarioBruto: parseFloat(formData.salarioBruto),
      observaciones: formData.observaciones || '',
      fechaCreacion: new Date().toISOString()
    };

    if (formData.id) {
      // Actualizar existente
      await storage.updateAguinaldoSalario(formData.id, salarioData);
      showToast('Salario mensual actualizado');
    } else {
      // Crear nuevo
      await storage.createAguinaldoSalario(salarioData);
      showToast('Salario mensual agregado');
    }

    // Recargar datos
    await cargarDatos();
  }

  // Eliminar salario mensual
  async function eliminarSalario(empleadoId, mes, ano) {
    const salario = salariosMensuales.find(s => 
      s.employeeId === empleadoId && s.mes === mes && s.ano === ano
    );

    if (salario && confirm('¿Estás seguro de eliminar este salario mensual?')) {
      await storage.deleteAguinaldoSalario(salario.id);
      showToast('Salario mensual eliminado');
      await cargarDatos();
    }
  }

  // Event listeners
  filtroEmpleado.addEventListener('change', renderizarTabla);
  filtroAno.addEventListener('change', renderizarTabla);

  btnAgregarSalario.addEventListener('click', () => {
    mostrarModalSalario();
  });

  btnCalcular.addEventListener('click', () => {
    renderizarTabla();
    showToast('Aguinaldos calculados');
  });

  btnExportExcel.addEventListener('click', () => {
    const tabla = root.querySelector('#tabla-aguinaldos');
    exportTableToXLSX(tabla, `aguinaldos_${filtroAno.value}.xlsx`);
  });

  btnExportPDF.addEventListener('click', () => {
    const filas = [...tablaAguinaldos.querySelectorAll('tr')].map(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 16) return null;
      
      return {
        empleado: tds[0].textContent,
        enero: tds[1].textContent,
        febrero: tds[2].textContent,
        marzo: tds[3].textContent,
        abril: tds[4].textContent,
        mayo: tds[5].textContent,
        junio: tds[6].textContent,
        julio: tds[7].textContent,
        agosto: tds[8].textContent,
        septiembre: tds[9].textContent,
        octubre: tds[10].textContent,
        noviembre: tds[11].textContent,
        diciembre: tds[12].textContent,
        totalBruto: tds[13].textContent,
        aguinaldo: tds[14].textContent
      };
    }).filter(Boolean);

    exportPayrollToPDF(filas, { 
      title: `Aguinaldos ${filtroAno.value}`, 
      period: `Año ${filtroAno.value}` 
    }, `aguinaldos_${filtroAno.value}.pdf`);
  });

  // Event delegation para acciones en la tabla
  tablaAguinaldos.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const empleadoId = btn.dataset.empleado;
    const action = btn.dataset.action;

    if (action === 'edit') {
      // Encontrar el primer mes con salario para editar
      const fila = btn.closest('tr');
      const celdasSalario = fila.querySelectorAll('.salario-mes');
      
      // Mostrar modal para seleccionar mes a editar
      const mesesConSalario = Array.from(celdasSalario)
        .map(celda => ({
          mes: parseInt(celda.dataset.mes),
          salario: celda.textContent.trim()
        }))
        .filter(item => item.salario !== '-');

      if (mesesConSalario.length === 0) {
        showToast('No hay salarios registrados para este empleado');
        return;
      }

      // Por simplicidad, editar el primer mes encontrado
      const primerMes = mesesConSalario[0];
      mostrarModalSalario(empleadoId, primerMes.mes, parseInt(filtroAno.value));
    }

    if (action === 'delete') {
      const fila = btn.closest('tr');
      const celdasSalario = fila.querySelectorAll('.salario-mes');
      
      const mesesConSalario = Array.from(celdasSalario)
        .map(celda => parseInt(celda.dataset.mes))
        .filter(mes => {
          const celda = fila.querySelector(`[data-mes="${mes}"]`);
          return celda && celda.textContent.trim() !== '-';
        });

      if (mesesConSalario.length === 0) {
        showToast('No hay salarios registrados para este empleado');
        return;
      }

      // Eliminar todos los salarios del empleado para el año
      if (confirm(`¿Estás seguro de eliminar todos los salarios de ${filtroAno.value} para este empleado?`)) {
        const salariosAEliminar = salariosMensuales.filter(s => 
          s.employeeId === empleadoId && s.ano === parseInt(filtroAno.value)
        );

        for (const salario of salariosAEliminar) {
          await storage.deleteAguinaldoSalario(salario.id);
        }

        showToast('Salarios eliminados');
        await cargarDatos();
      }
    }
  });

  // Event listener para el formulario del modal
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'formAguinaldo') {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(e.target).entries());
      await guardarSalario(formData);
      
      // Cerrar modal
      const modal = document.getElementById('modalAguinaldo');
      modal.style.display = 'none';
    }
  });

  // Cargar datos iniciales
  await cargarDatos();
}
