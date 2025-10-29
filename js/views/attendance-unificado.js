// ============================================
// VISTA DE ASISTENCIAS REESTRUCTURADA
// Funciona correctamente con jornadas costarricenses
// ============================================

import { storage } from '../storage/index.js';
import { ConfirmModal } from '../components/ConfirmModal.js';
import { AttendanceCalculatorCR } from '../services/attendance-calculator-cr.js';

export async function renderAttendanceView(root, { showToast }) {
  root.innerHTML = `
    <div class="panel-title">Asistencias Costa Rica</div>
    
    <div class="card" style="margin-bottom: 20px;">
      <div class="grid cols-4">
        <div>
          <label>Empleado</label>
          <select id="employee-select">
            <option value="">Seleccione empleado</option>
          </select>
        </div>
        <div>
          <label>Fecha</label>
          <input id="attendance-date" type="date" />
        </div>
        <div>
          <label>Horas Trabajadas</label>
          <input id="hours-worked" type="number" min="0" max="24" step="0.25" placeholder="Horas" />
        </div>
        <div>
          <label>Tipo</label>
          <select id="attendance-type">
            <option value="presente">Presente</option>
            <option value="ausencia">Ausencia</option>
            <option value="tardanza">Tardanza</option>
            <option value="permiso">Permiso</option>
            <option value="vacaciones">Vacaciones</option>
            <option value="incapacidad_ccss">Incapacidad CCSS</option>
            <option value="incapacidad_ins">Incapacidad INS</option>
          </select>
        </div>
      </div>
      
      <div class="toolbar" style="margin-top: 15px;">
        <button id="save-attendance" class="btn primary">
          <i class="fas fa-save"></i> Guardar Asistencia
        </button>
        <button id="suggest-hours" class="btn secondary">
          <i class="fas fa-lightbulb"></i> Sugerir Horas
        </button>
        <button id="validate-attendance" class="btn info">
          <i class="fas fa-check-circle"></i> Validar
        </button>
        <button id="auto-generate" class="btn success">
          <i class="fas fa-magic"></i> Generar Automático
        </button>
      </div>
    </div>

    <div class="card">
      <div class="panel-title">Registro de Asistencias</div>
      
      <!-- Controles de filtrado -->
      <div class="toolbar" style="margin-bottom: 15px;">
        <div class="grid cols-3">
          <div>
            <label>Filtrar por Empleado:</label>
            <select id="filter-employee">
              <option value="">Todos los empleados</option>
            </select>
          </div>
          <div>
            <label>Filtrar por Tipo:</label>
            <select id="filter-type">
              <option value="">Todos los tipos</option>
              <option value="presente">Presente</option>
              <option value="ausencia">Ausencia</option>
              <option value="tardanza">Tardanza</option>
              <option value="permiso">Permiso</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="incapacidad_ccss">Incapacidad CCSS</option>
              <option value="incapacidad_ins">Incapacidad INS</option>
            </select>
          </div>
          <div>
            <label>Filtrar por Fecha:</label>
            <input id="filter-date" type="date" />
          </div>
        </div>
        <div style="margin-top: 10px;">
          <button id="clear-filters" class="btn secondary">
            <i class="fas fa-times"></i> Limpiar Filtros
          </button>
          <button id="apply-filters" class="btn primary">
            <i class="fas fa-filter"></i> Aplicar Filtros
          </button>
        </div>
      </div>
      
      <div class="table-responsive">
        <table class="table" id="attendance-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Empleado</th>
              <th>Jornada</th>
              <th>Tipo</th>
              <th>Horas Trab.</th>
              <th>Horas Pag.</th>
              <th>Horas Extra</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Modal para generación automática -->
    <div id="auto-generate-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Generar Asistencias Automáticas</h3>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          <div class="grid cols-2">
            <div>
              <label>Empleado</label>
              <select id="auto-employee-select">
                <option value="">Seleccione empleado</option>
              </select>
            </div>
            <div>
              <label>Fecha Inicio</label>
              <input id="auto-start-date" type="date" />
            </div>
            <div>
              <label>Fecha Fin</label>
              <input id="auto-end-date" type="date" />
            </div>
            <div>
              <label>Incluir Feriados</label>
              <input id="include-holidays" type="checkbox" checked />
            </div>
          </div>
          <div id="auto-preview" style="margin-top: 15px; display: none;">
            <h4>Vista Previa</h4>
            <div id="auto-preview-content"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="preview-auto" class="btn secondary">Vista Previa</button>
          <button id="generate-auto" class="btn primary">Generar</button>
          <button id="cancel-auto" class="btn">Cancelar</button>
        </div>
      </div>
    </div>

    <div class="grid cols-2" style="margin-top: 20px;">
      <div class="card">
        <div class="panel-title">Feriados</div>
        <div class="toolbar">
          <input id="holiday-date" type="date" />
          <button id="add-holiday" class="btn">Agregar Feriado</button>
        </div>
        <div class="table-responsive">
          <table class="table" id="holiday-table">
            <thead><tr><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <div class="panel-title">Incapacidades</div>
        <div class="toolbar">
          <select id="disability-employee"><option value="">Empleado</option></select>
          <input id="disability-date" type="date" />
          <select id="disability-type">
            <option value="CCSS">CCSS (50%)</option>
            <option value="INS">INS (0%)</option>
          </select>
          <button id="add-disability" class="btn">Agregar</button>
        </div>
        <div class="table-responsive">
          <table class="table" id="disability-table">
            <thead><tr><th>Empleado</th><th>Fecha</th><th>Tipo</th><th>Acciones</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Variables globales
  let sistemaPlanillas = null;
  let calculadorAsistencias = null;
  let empleados = [];
  let asistencias = [];
  let feriados = [];
  let incapacidades = [];
  
  // Variables de filtrado
  let filtrosActivos = {
    empleado: '',
    tipo: '',
    fecha: ''
  };

  // Elementos del DOM
  const employeeSelect = root.querySelector('#employee-select');
  const attendanceDate = root.querySelector('#attendance-date');
  const hoursWorked = root.querySelector('#hours-worked');
  const attendanceType = root.querySelector('#attendance-type');
  const saveBtn = root.querySelector('#save-attendance');
  const suggestBtn = root.querySelector('#suggest-hours');
  const validateBtn = root.querySelector('#validate-attendance');
  const attendanceTable = root.querySelector('#attendance-table tbody');
  const holidayDate = root.querySelector('#holiday-date');
  const addHolidayBtn = root.querySelector('#add-holiday');
  const holidayTable = root.querySelector('#holiday-table tbody');
  const disabilityEmployee = root.querySelector('#disability-employee');
  const disabilityDate = root.querySelector('#disability-date');
  const disabilityType = root.querySelector('#disability-type');
  const addDisabilityBtn = root.querySelector('#add-disability');
  const disabilityTable = root.querySelector('#disability-table tbody');
  
  // Elementos de filtrado
  const filterEmployee = root.querySelector('#filter-employee');
  const filterType = root.querySelector('#filter-type');
  const filterDate = root.querySelector('#filter-date');
  const clearFiltersBtn = root.querySelector('#clear-filters');
  const applyFiltersBtn = root.querySelector('#apply-filters');
  
  // Elementos del modal de generación automática
  const autoGenerateBtn = root.querySelector('#auto-generate');
  const autoGenerateModal = root.querySelector('#auto-generate-modal');
  const autoEmployeeSelect = root.querySelector('#auto-employee-select');
  const autoStartDate = root.querySelector('#auto-start-date');
  const autoEndDate = root.querySelector('#auto-end-date');
  const includeHolidays = root.querySelector('#include-holidays');
  const previewAutoBtn = root.querySelector('#preview-auto');
  const generateAutoBtn = root.querySelector('#generate-auto');
  const cancelAutoBtn = root.querySelector('#cancel-auto');
  const autoPreview = root.querySelector('#auto-preview');
  const autoPreviewContent = root.querySelector('#auto-preview-content');

  // Inicializar sistema
  function inicializarSistema() {
    if (typeof window.SistemaPlanillasUnificado !== 'undefined') {
      sistemaPlanillas = new window.SistemaPlanillasUnificado();
      console.log('✅ Sistema de planillas unificado inicializado');
    } else {
      console.error('❌ SistemaPlanillasUnificado no está disponible');
      showToast('Error: Sistema de planillas no disponible', 'error');
    }
    
    // Inicializar calculador de asistencias
    calculadorAsistencias = new AttendanceCalculatorCR();
    console.log('✅ Calculador de asistencias inicializado');
  }

  // Cargar datos
  async function cargarDatos() {
    try {
      empleados = await storage.getEmployees();
      asistencias = await storage.getAttendance();
      feriados = await storage.getHolidays();
      incapacidades = await storage.getDisabilities();
      
      actualizarSelects();
      renderizarTablas();
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error cargando datos', 'error');
    }
  }

  // Actualizar selects
  function actualizarSelects() {
    // Actualizar select de empleados
    employeeSelect.innerHTML = '<option value="">Seleccione empleado</option>';
    empleados.forEach(emp => {
      const option = document.createElement('option');
      option.value = emp.id;
      option.textContent = `${emp.nombre} (${emp.jornada})`;
      employeeSelect.appendChild(option);
    });

    // Actualizar select de filtrado de empleados
    filterEmployee.innerHTML = '<option value="">Todos los empleados</option>';
    empleados.forEach(emp => {
      const option = document.createElement('option');
      option.value = emp.id;
      option.textContent = `${emp.nombre} (${emp.jornada})`;
      filterEmployee.appendChild(option);
    });

    // Actualizar select de incapacidades
    disabilityEmployee.innerHTML = '<option value="">Empleado</option>';
    empleados.forEach(emp => {
      const option = document.createElement('option');
      option.value = emp.id;
      option.textContent = emp.nombre;
      disabilityEmployee.appendChild(option);
    });

    // Actualizar select del modal de generación automática
    autoEmployeeSelect.innerHTML = '<option value="">Seleccione empleado</option>';
    empleados.forEach(emp => {
      const option = document.createElement('option');
      option.value = emp.id;
      option.textContent = `${emp.nombre} (${emp.jornada})`;
      autoEmployeeSelect.appendChild(option);
    });
  }

  // Configurar fecha por defecto
  function configurarFecha() {
    const hoy = new Date();
    attendanceDate.value = hoy.toISOString().slice(0, 10);
    holidayDate.value = hoy.toISOString().slice(0, 10);
    disabilityDate.value = hoy.toISOString().slice(0, 10);
  }

  // Sugerir horas según jornada
  suggestBtn.addEventListener('click', () => {
    const empleadoId = employeeSelect.value;
    const fecha = attendanceDate.value;
    const tipo = attendanceType.value;

    if (!empleadoId || !fecha) {
      showToast('Seleccione empleado y fecha', 'warning');
      return;
    }

    const empleado = empleados.find(e => e.id === empleadoId);
    if (!empleado || !calculadorAsistencias) return;

    // Usar el nuevo calculador de asistencias
    const sugerencias = calculadorAsistencias.calcularHorasSugeridas(empleado, fecha, tipo);
    
    hoursWorked.value = sugerencias.horasTrabajadas;
    
    if (sugerencias.horasTrabajadas > 0) {
      showToast(`Horas sugeridas: ${sugerencias.horasTrabajadas} (${sugerencias.configuracion.nombre})`, 'info');
    } else if (sugerencias.esDiaLibre) {
      showToast(`Día libre para jornada ${sugerencias.configuracion.nombre}`, 'info');
    } else {
      showToast('Sin horas sugeridas', 'info');
    }
    
    // Mostrar alertas si las hay
    if (sugerencias.alertas.length > 0) {
      sugerencias.alertas.forEach(alerta => {
        showToast(alerta, 'warning');
      });
    }
  });

  // Validar asistencia
  validateBtn.addEventListener('click', () => {
    const empleadoId = employeeSelect.value;
    const horas = parseFloat(hoursWorked.value || 0);
    const tipo = attendanceType.value;
    const fecha = attendanceDate.value;

    if (!empleadoId || !fecha) {
      showToast('Complete empleado y fecha', 'warning');
      return;
    }

    const empleado = empleados.find(e => e.id === empleadoId);
    if (!empleado || !calculadorAsistencias) return;

    const asistencia = {
      hours: horas,
      type: tipo,
      date: fecha
    };

    // Usar el nuevo calculador de asistencias
    const validacion = calculadorAsistencias.validarAsistencia(asistencia, empleado);
    const sugerencias = calculadorAsistencias.calcularHorasSugeridas(empleado, fecha, tipo);
    
    let mensaje = `Validación para ${empleado.nombre}:\n`;
    mensaje += `- Fecha: ${fecha} (${sugerencias.nombreDia})\n`;
    mensaje += `- Jornada: ${sugerencias.configuracion.nombre}\n`;
    mensaje += `- Horas trabajadas: ${horas}\n`;
    mensaje += `- Horas sugeridas: ${sugerencias.horasTrabajadas}\n`;
    mensaje += `- Horas pagadas: ${sugerencias.horasPagadas}\n`;
    mensaje += `- Es día libre: ${sugerencias.esDiaLibre ? 'Sí' : 'No'}\n`;
    mensaje += `- Válido: ${validacion.esValido ? 'Sí' : 'No'}\n`;
    
    if (validacion.alertas.length > 0) {
      mensaje += `\n🚨 Alertas:\n`;
      validacion.alertas.forEach(alerta => {
        mensaje += `- ${alerta}\n`;
      });
    }
    
    if (validacion.advertencias.length > 0) {
      mensaje += `\n⚠️ Advertencias:\n`;
      validacion.advertencias.forEach(advertencia => {
        mensaje += `- ${advertencia}\n`;
      });
    }

    alert(mensaje);
  });

  // Guardar asistencia
  saveBtn.addEventListener('click', async () => {
    const empleadoId = employeeSelect.value;
    const fecha = attendanceDate.value;
    const horas = parseFloat(hoursWorked.value || 0);
    const tipo = attendanceType.value;

    if (!empleadoId || !fecha) {
      showToast('Complete empleado y fecha', 'warning');
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

      const asistencia = {
        employeeId: empleadoId,
        date: fecha,
        hours: horas,
        type: tipo
      };

      const resultado = await storage.upsertAttendance(asistencia);
      
      // Limpiar formulario
      hoursWorked.value = '';
      
      showToast('Asistencia guardada', 'success');
      
      // Actualizar datos localmente sin recargar todo
      const indexExistente = asistencias.findIndex(a => a.id === resultado.id);
      if (indexExistente !== -1) {
        asistencias[indexExistente] = resultado;
      } else {
        asistencias.push(resultado);
      }
      
      // Re-renderizar solo la tabla de asistencias manteniendo filtros
      renderizarAsistencias();

    } catch (error) {
      console.error('Error guardando asistencia:', error);
      showToast('Error al guardar asistencia', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Asistencia';
    }
  });

  // Aplicar filtros a las asistencias
  function aplicarFiltros() {
    filtrosActivos.empleado = filterEmployee.value;
    filtrosActivos.tipo = filterType.value;
    filtrosActivos.fecha = filterDate.value;
    renderizarAsistencias();
  }

  // Limpiar filtros
  function limpiarFiltros() {
    filterEmployee.value = '';
    filterType.value = '';
    filterDate.value = '';
    filtrosActivos = { empleado: '', tipo: '', fecha: '' };
    renderizarAsistencias();
  }

  // Filtrar asistencias según los filtros activos
  function filtrarAsistencias() {
    return asistencias.filter(asistencia => {
      const empleado = empleados.find(e => e.id === asistencia.employeeId);
      if (!empleado) return false;

      // Filtro por empleado
      if (filtrosActivos.empleado && asistencia.employeeId !== filtrosActivos.empleado) {
        return false;
      }

      // Filtro por tipo
      if (filtrosActivos.tipo && asistencia.type !== filtrosActivos.tipo) {
        return false;
      }

      // Filtro por fecha
      if (filtrosActivos.fecha && asistencia.date !== filtrosActivos.fecha) {
        return false;
      }

      return true;
    });
  }

  // Renderizar tabla de asistencias
  function renderizarTablas() {
    renderizarAsistencias();
    renderizarFeriados();
    renderizarIncapacidades();
  }

  function renderizarAsistencias() {
    if (!calculadorAsistencias) return;

    // Aplicar filtros
    const asistenciasFiltradas = filtrarAsistencias();
    let html = '';
    
    asistenciasFiltradas.forEach(asistencia => {
      const empleado = empleados.find(e => e.id === asistencia.employeeId);
      if (!empleado) return;

      // Usar el nuevo calculador de asistencias
      const validacion = calculadorAsistencias.validarAsistencia(asistencia, empleado);
      const sugerencias = calculadorAsistencias.calcularHorasSugeridas(empleado, asistencia.date, asistencia.type);
      
      const tieneProblemas = validacion.alertas.length > 0 || validacion.advertencias.length > 0;
      const problemasTexto = [...validacion.alertas, ...validacion.advertencias].join('; ');

      // Calcular horas extra
      const horasExtra = Math.max(0, parseFloat(asistencia.hours || 0) - sugerencias.configuracion.horasMaximasDiarias);

      html += `
        <tr ${tieneProblemas ? 'style="background-color: #fff3cd;"' : ''}>
          <td>${asistencia.date}</td>
          <td>${empleado.nombre}</td>
          <td>
            <span class="badge info" title="${sugerencias.configuracion.descripcion}">
              ${sugerencias.configuracion.nombre}
            </span>
          </td>
          <td>
            <span class="badge ${getTipoBadgeClass(asistencia.type)}">
              ${asistencia.type}
            </span>
          </td>
          <td>${asistencia.hours || 0}</td>
          <td>${sugerencias.horasPagadas}</td>
          <td>${horasExtra}</td>
          <td title="${problemasTexto}">
            ${tieneProblemas ? '⚠️' : '✅'}
          </td>
          <td>
            <button class="btn btn-sm danger" onclick="eliminarAsistencia('${asistencia.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    const mensajeFiltros = Object.values(filtrosActivos).some(f => f) 
      ? ` (${asistenciasFiltradas.length} de ${asistencias.length} registros)`
      : '';
    
    attendanceTable.innerHTML = html || `<tr><td colspan="9" class="text-center">Sin asistencias registradas${mensajeFiltros}</td></tr>`;
  }

  function renderizarFeriados() {
    let html = '';
    
    feriados.forEach(feriado => {
      html += `
        <tr>
          <td>${feriado.date}</td>
          <td>
            <button class="btn btn-sm danger" onclick="eliminarFeriado('${feriado.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    holidayTable.innerHTML = html || '<tr><td colspan="2" class="text-center">Sin feriados registrados</td></tr>';
  }

  function renderizarIncapacidades() {
    let html = '';
    
    incapacidades.forEach(incapacidad => {
      const empleado = empleados.find(e => e.id === incapacidad.employeeId);
      const nombreEmpleado = empleado ? empleado.nombre : 'Empleado no encontrado';
      
      html += `
        <tr>
          <td>${nombreEmpleado}</td>
          <td>${incapacidad.date}</td>
          <td>
            <span class="badge ${incapacidad.type === 'CCSS' ? 'warning' : 'danger'}">
              ${incapacidad.type}
            </span>
          </td>
          <td>
            <button class="btn btn-sm danger" onclick="eliminarIncapacidad('${incapacidad.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });

    disabilityTable.innerHTML = html || '<tr><td colspan="4" class="text-center">Sin incapacidades registradas</td></tr>';
  }

  // Funciones auxiliares
  function getTipoBadgeClass(tipo) {
    const clases = {
      'presente': 'success',
      'ausencia': 'danger',
      'tardanza': 'warning',
      'permiso': 'info',
      'vacaciones': 'primary',
      'incapacidad_ccss': 'warning',
      'incapacidad_ins': 'danger'
    };
    return clases[tipo] || 'secondary';
  }

  // Funciones globales para eliminar registros
  window.eliminarAsistencia = async function(id) {
    const asistencia = asistencias.find(a => a.id === id);
    if (!asistencia) return;

    ConfirmModal.show(
      'Eliminar Asistencia',
      `¿Estás seguro de que deseas eliminar la asistencia del ${asistencia.date}?`,
      'Eliminar',
      'Cancelar'
    ).then(async (confirmed) => {
      if (confirmed) {
        try {
          await storage.deleteAttendance(id);
          showToast('Asistencia eliminada', 'success');
          
          // Actualizar datos localmente sin recargar todo
          asistencias = asistencias.filter(a => a.id !== id);
          
          // Re-renderizar solo la tabla de asistencias manteniendo filtros
          renderizarAsistencias();
        } catch (error) {
          console.error('Error eliminando asistencia:', error);
          showToast('Error al eliminar asistencia', 'error');
        }
      }
    });
  };

  window.eliminarFeriado = async function(id) {
    const feriado = feriados.find(f => f.id === id);
    if (!feriado) return;

    ConfirmModal.show(
      'Eliminar Feriado',
      `¿Estás seguro de que deseas eliminar el feriado del ${feriado.date}?`,
      'Eliminar',
      'Cancelar'
    ).then(async (confirmed) => {
      if (confirmed) {
        try {
          await storage.deleteHoliday(id);
          showToast('Feriado eliminado', 'success');
          await cargarDatos();
        } catch (error) {
          console.error('Error eliminando feriado:', error);
          showToast('Error al eliminar feriado', 'error');
        }
      }
    });
  };

  window.eliminarIncapacidad = async function(id) {
    const incapacidad = incapacidades.find(i => i.id === id);
    if (!incapacidad) return;

    ConfirmModal.show(
      'Eliminar Incapacidad',
      `¿Estás seguro de que deseas eliminar esta incapacidad?`,
      'Eliminar',
      'Cancelar'
    ).then(async (confirmed) => {
      if (confirmed) {
        try {
          await storage.deleteDisability(id);
          showToast('Incapacidad eliminada', 'success');
          await cargarDatos();
        } catch (error) {
          console.error('Error eliminando incapacidad:', error);
          showToast('Error al eliminar incapacidad', 'error');
        }
      }
    });
  };

  // Agregar feriado
  addHolidayBtn.addEventListener('click', async () => {
    const fecha = holidayDate.value;
    if (!fecha) {
      showToast('Seleccione una fecha', 'warning');
      return;
    }

    try {
      await storage.createHoliday({ date: fecha });
      showToast('Feriado agregado', 'success');
      await cargarDatos();
    } catch (error) {
      console.error('Error agregando feriado:', error);
      showToast('Error al agregar feriado', 'error');
    }
  });

  // Agregar incapacidad
  addDisabilityBtn.addEventListener('click', async () => {
    const empleadoId = disabilityEmployee.value;
    const fecha = disabilityDate.value;
    const tipo = disabilityType.value;

    if (!empleadoId || !fecha) {
      showToast('Complete todos los campos', 'warning');
      return;
    }

    try {
      await storage.createDisability({
        employeeId: empleadoId,
        date: fecha,
        type: tipo
      });
      showToast('Incapacidad agregada', 'success');
      await cargarDatos();
    } catch (error) {
      console.error('Error agregando incapacidad:', error);
      showToast('Error al agregar incapacidad', 'error');
    }
  });

  // Cambio de empleado - sugerir horas automáticamente
  employeeSelect.addEventListener('change', () => {
    const empleadoId = employeeSelect.value;
    const fecha = attendanceDate.value;
    
    if (empleadoId && fecha) {
      suggestBtn.click();
    }
  });

  // Cambio de fecha - sugerir horas automáticamente
  attendanceDate.addEventListener('change', () => {
    const empleadoId = employeeSelect.value;
    
    if (empleadoId) {
      suggestBtn.click();
    }
  });

  // Event listeners para filtros
  applyFiltersBtn.addEventListener('click', aplicarFiltros);
  clearFiltersBtn.addEventListener('click', limpiarFiltros);
  
  // Aplicar filtros automáticamente al cambiar valores
  filterEmployee.addEventListener('change', aplicarFiltros);
  filterType.addEventListener('change', aplicarFiltros);
  filterDate.addEventListener('change', aplicarFiltros);

  // Event listeners para generación automática
  autoGenerateBtn.addEventListener('click', () => {
    // Configurar fechas por defecto (mes actual)
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    autoStartDate.value = primerDia.toISOString().slice(0, 10);
    autoEndDate.value = ultimoDia.toISOString().slice(0, 10);
    
    autoGenerateModal.style.display = 'block';
  });

  // Cerrar modal
  const closeModal = () => {
    autoGenerateModal.style.display = 'none';
    autoPreview.style.display = 'none';
  };

  root.querySelector('.close').addEventListener('click', closeModal);
  cancelAutoBtn.addEventListener('click', closeModal);

  // Cerrar modal al hacer clic fuera
  window.addEventListener('click', (event) => {
    if (event.target === autoGenerateModal) {
      closeModal();
    }
  });

  // Vista previa de generación automática
  previewAutoBtn.addEventListener('click', () => {
    const empleadoId = autoEmployeeSelect.value;
    const fechaInicio = autoStartDate.value;
    const fechaFin = autoEndDate.value;

    if (!empleadoId || !fechaInicio || !fechaFin) {
      showToast('Complete todos los campos', 'warning');
      return;
    }

    if (fechaInicio > fechaFin) {
      showToast('La fecha de inicio debe ser anterior a la fecha fin', 'warning');
      return;
    }

    const empleado = empleados.find(e => e.id === empleadoId);
    if (!empleado || !calculadorAsistencias) return;

    // Obtener fechas de feriados si está marcado
    const fechasFeriados = includeHolidays.checked ? feriados.map(f => f.date) : [];

    // Generar asistencias automáticas
    const registros = calculadorAsistencias.generarAsistenciasAutomaticas(
      empleado, 
      fechaInicio, 
      fechaFin, 
      fechasFeriados
    );

    // Mostrar vista previa
    let previewHtml = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Día</th>
              <th>Tipo</th>
              <th>Horas Trab.</th>
              <th>Horas Pag.</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
    `;

    registros.forEach(registro => {
      const nombreDia = calculadorAsistencias.getNombreDia(registro.fecha);
      previewHtml += `
        <tr>
          <td>${registro.fecha}</td>
          <td>${nombreDia}</td>
          <td><span class="badge ${getTipoBadgeClass(registro.tipo)}">${registro.tipo}</span></td>
          <td>${registro.horas}</td>
          <td>${registro.horasPagadas}</td>
          <td>${registro.detalle}</td>
        </tr>
      `;
    });

    previewHtml += `
          </tbody>
        </table>
      </div>
      <p><strong>Total registros a generar: ${registros.length}</strong></p>
    `;

    autoPreviewContent.innerHTML = previewHtml;
    autoPreview.style.display = 'block';
  });

  // Generar asistencias automáticas
  generateAutoBtn.addEventListener('click', async () => {
    const empleadoId = autoEmployeeSelect.value;
    const fechaInicio = autoStartDate.value;
    const fechaFin = autoEndDate.value;

    if (!empleadoId || !fechaInicio || !fechaFin) {
      showToast('Complete todos los campos', 'warning');
      return;
    }

    const empleado = empleados.find(e => e.id === empleadoId);
    if (!empleado || !calculadorAsistencias) return;

    try {
      generateAutoBtn.disabled = true;
      generateAutoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

      // Obtener fechas de feriados si está marcado
      const fechasFeriados = includeHolidays.checked ? feriados.map(f => f.date) : [];

      // Generar asistencias automáticas
      const registros = calculadorAsistencias.generarAsistenciasAutomaticas(
        empleado, 
        fechaInicio, 
        fechaFin, 
        fechasFeriados
      );

      // Guardar registros
      let registrosGuardados = 0;
      for (const registro of registros) {
        try {
          await storage.upsertAttendance(registro);
          registrosGuardados++;
        } catch (error) {
          console.error('Error guardando registro:', error);
        }
      }

      showToast(`Se generaron ${registrosGuardados} registros de asistencia automática`, 'success');
      closeModal();
      
      // Actualizar datos localmente sin recargar todo
      asistencias = await storage.getAttendance();
      
      // Re-renderizar solo la tabla de asistencias manteniendo filtros
      renderizarAsistencias();

    } catch (error) {
      console.error('Error generando asistencias automáticas:', error);
      showToast('Error al generar asistencias automáticas', 'error');
    } finally {
      generateAutoBtn.disabled = false;
      generateAutoBtn.innerHTML = '<i class="fas fa-magic"></i> Generar';
    }
  });

  // Inicializar
  inicializarSistema();
  configurarFecha();
  await cargarDatos();
}



