/**
 * Servicios Profesionales Module - Sistema de Planillas Costa Rica
 * Gestión de horas trabajadas y pagos para empleados SP
 */

const ServiciosProfesionalesModule = {
    empleadosSP: [],
    registrosHoras: [],
    empleadoSeleccionado: null,
    periodoInicio: null,
    periodoFin: null,
    // Filtros
    filtros: {
        empleadoId: '',
        fechaInicio: '',
        fechaFin: ''
    },

    /**
     * Inicializa el módulo
     */
    async init() {
        await this.cargarEmpleadosSP();
        await this.cargarRegistrosHoras();
    },

    /**
     * Carga empleados de tipo SP
     */
    async cargarEmpleadosSP() {
        try {
            const empleados = await FirebaseHelpers.getEmpleados();
            this.empleadosSP = empleados.filter(e =>
                e.estado === 'activo' && e.tipoEmpleado === 'SP'
            );
        } catch (error) {
            console.error('Error cargando empleados SP:', error);
            this.empleadosSP = [];
            Utils.showToast('Error al cargar empleados SP', 'error');
        }
    },

    /**
     * Carga registros de horas desde Firebase
     * Lee AMBOS: automáticos (control_asistencia) Y manuales (servicios_profesionales)
     */
    async cargarRegistrosHoras() {
        try {
            // Limpiar registros anteriores
            this.registrosHoras = [];

            // Calcular fechas de inicio y fin
            let fechaInicio, fechaFin;
            
            if (this.filtros.fechaInicio) {
                // Si hay filtro de fecha inicio, convertir de YYYY-MM-DD a YYYYMMDD
                fechaInicio = this.filtros.fechaInicio.replace(/-/g, '');
            } else {
                // Por defecto, últimos 30 días
                const fechaHace30Dias = new Date();
                fechaHace30Dias.setDate(fechaHace30Dias.getDate() - 30);
                fechaInicio = Formatters.formatearFechaKey(fechaHace30Dias);
            }
            
            if (this.filtros.fechaFin) {
                // Si hay filtro de fecha fin, convertir de YYYY-MM-DD a YYYYMMDD
                fechaFin = this.filtros.fechaFin.replace(/-/g, '');
            } else {
                // Por defecto, hoy
                fechaFin = Formatters.formatearFechaKey(new Date());
            }

            console.log(`Cargando registros desde ${fechaInicio} hasta ${fechaFin}`);

            // 1. Cargar registros AUTOMÁTICOS desde control de asistencia
            for (const empleado of this.empleadosSP) {
                try {
                    const registrosAsistencia = await FirebaseHelpers.obtenerRegistrosAsistenciaPeriodo(
                        empleado.id,
                        fechaInicio,
                        fechaFin
                    );

                    console.log(`Empleado ${empleado.nombre}: ${registrosAsistencia.length} registros de asistencia encontrados`);

                    // Calcular horas trabajadas desde los registros de entrada/salida
                    const registrosConHoras = FirebaseHelpers.calcularHorasDesdeRegistros(registrosAsistencia);

                    console.log(`Empleado ${empleado.nombre}: ${registrosConHoras.length} períodos de trabajo calculados`);

                    // Convertir a formato compatible con la tabla
                    registrosConHoras.forEach(registro => {
                        // Convertir fecha YYYYMMDD a timestamp
                        const año = parseInt(registro.fecha.substring(0, 4));
                        const mes = parseInt(registro.fecha.substring(4, 6)) - 1; // Mes es 0-indexed
                        const dia = parseInt(registro.fecha.substring(6, 8));
                        const fechaTimestamp = new Date(año, mes, dia).getTime();

                        this.registrosHoras.push({
                            id: `auto_${empleado.id}_${registro.fecha}_${registro.entrada.timestamp}`,
                            empleadoId: empleado.id,
                            fecha: fechaTimestamp,
                            fechaKey: registro.fecha, // Guardar fecha en formato YYYYMMDD para editar/eliminar
                            horaEntrada: registro.horaEntrada,
                            horaSalida: registro.horaSalida,
                            horasTrabajadas: registro.horasTrabajadas,
                            salarioHorario: this.obtenerSalarioHora(empleado),
                            totalPagar: registro.horasTrabajadas * this.obtenerSalarioHora(empleado),
                            origen: 'automatico',
                            // Guardar información de los registros originales para poder editarlos/eliminarlos
                            entradaId: registro.entrada?.id,
                            salidaId: registro.salida?.id,
                            entradaTimestamp: registro.entrada?.timestamp,
                            salidaTimestamp: registro.salida?.timestamp,
                            pendiente: registro.pendiente || false
                        });
                    });
                } catch (error) {
                    console.error(`Error cargando registros para empleado ${empleado.nombre}:`, error);
                }
            }

            // 2. Cargar registros MANUALES desde servicios_profesionales
            const registrosManuales = await FirebaseHelpers.once(CONFIG.DB_PATHS.SERVICIOS_PROFESIONALES);
            if (registrosManuales) {
                Object.keys(registrosManuales).forEach(id => {
                    const registro = registrosManuales[id];
                    // Filtrar por fechas si están establecidas
                    if (this.filtros.fechaInicio || this.filtros.fechaFin) {
                        const fechaInicioTs = this.filtros.fechaInicio ? new Date(this.filtros.fechaInicio).getTime() : 0;
                        const fechaFinTs = this.filtros.fechaFin ? new Date(this.filtros.fechaFin + 'T23:59:59').getTime() : Infinity;

                        if (registro.fecha < fechaInicioTs || registro.fecha > fechaFinTs) {
                            return; // Saltar este registro
                        }
                    }

                    this.registrosHoras.push({
                        id,
                        ...registro,
                        origen: 'manual'
                    });
                });
            }

            console.log(`Registros cargados: ${this.registrosHoras.length} (automáticos + manuales)`);
        } catch (error) {
            console.error('Error cargando registros de horas:', error);
            this.registrosHoras = [];
        }
    },

    /**
     * Renderiza la vista principal
     */
    async render() {
        await this.cargarEmpleadosSP();
        await this.cargarRegistrosHoras();

        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Servicios Profesionales (SP)</h1>
                        <p class="text-sm text-gray-600 mt-1">Bitácora de actividades y horas facturables registradas por el profesional.</p>
                    </div>
                    <button onclick="ServiciosProfesionalesModule.mostrarModalRegistro()" class="btn btn-primary">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Registrar Actividad
                    </button>
                </div>

                <!-- Disclaimer Legal -->
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <div class="flex items-start">
                        <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-sm text-blue-800">
                            <strong>Nota importante:</strong> Este módulo registra únicamente las actividades realizadas y la presencia física en las instalaciones, cuando aplica. No constituye control de jornada laboral. Los ingresos y salidas al edificio pueden generar registros de actividad para SP. Puedes editarlos o agregar actividades manualmente.
                        </p>
                    </div>
                </div>

                ${this.empleadosSP.length === 0 ? `
                    <div class="card">
                        <div class="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
                            <strong>No hay empleados SP activos.</strong> Por favor, cree empleados en el módulo de Empleados y márquelos como tipo "Servicios Profesionales (SP)".
                        </div>
                    </div>
                ` : ''}

                <!-- Filtros -->
                <div class="card">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label class="form-label">Profesional</label>
                            <select id="filtroEmpleado" class="form-control">
                                <option value="">Todos los profesionales</option>
                                ${this.empleadosSP.map(e => `
                                    <option value="${e.id}" ${this.filtros.empleadoId === e.id ? 'selected' : ''}>${e.nombre} - ${Formatters.formatearCedula(e.cedula)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Fecha Inicio</label>
                            <input type="date" id="filtroFechaInicio" class="form-control" value="${this.filtros.fechaInicio}">
                        </div>
                        <div>
                            <label class="form-label">Fecha Fin</label>
                            <input type="date" id="filtroFechaFin" class="form-control" value="${this.filtros.fechaFin}">
                        </div>
                        <div class="flex items-end">
                            <button onclick="ServiciosProfesionalesModule.aplicarFiltros()" class="btn btn-outline w-full">
                                Filtrar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Tabla de registros -->
                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Bitácora de Actividades</h3>
                    </div>
                    
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Profesional</th>
                                    <th>Inicio</th>
                                    <th>Fin</th>
                                    <th>Duración</th>
                                    <th>Tarifa SP</th>
                                    <th>Monto Estimado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderRegistrosTable()}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Resumen de pagos -->
                <div id="resumenPagosContainer">
                    ${this.renderResumenPagosContent()}
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Servicios Profesionales']);
        this.setupEventListeners();
    },

    /**
     * Renderiza la tabla de registros
     */
    renderRegistrosTable() {
        const registrosFiltrados = this.filtrarRegistros();

        if (registrosFiltrados.length === 0) {
            return `
                <tr>
                    <td colspan="8" class="text-center text-gray-500 py-8">
                        No hay actividades registradas
                    </td>
                </tr>
            `;
        }

        return registrosFiltrados.map(registro => {
            const empleado = this.empleadosSP.find(e => e.id === registro.empleadoId);
            const esPendiente = registro.pendiente || registro.horaSalida === 'Pendiente';
            const horasTrabajadas = esPendiente ? 0 : (registro.horasTrabajadas || this.calcularHoras(registro.horaEntrada, registro.horaSalida));
            const salarioHorario = this.obtenerSalarioHora(empleado);
            const totalPagar = horasTrabajadas * salarioHorario;

            return `
                <tr class="${esPendiente ? 'bg-yellow-50' : ''}">
                    <td>${this.formatearFechaDesdeTimestamp(registro.fecha)}</td>
                    <td class="font-medium">${empleado?.nombre || 'N/A'}</td>
                    <td>${registro.horaEntrada}</td>
                    <td>
                        ${esPendiente ? `
                            <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">Pendiente</span>
                        ` : registro.horaSalida}
                    </td>
                    <td class="font-semibold">
                        ${esPendiente ? `
                            <span class="text-gray-400">0.00 hrs</span>
                        ` : `${horasTrabajadas.toFixed(2)} hrs`}
                    </td>
                    <td>${Formatters.formatearMoneda(salarioHorario)}</td>
                    <td class="font-semibold ${esPendiente ? 'text-gray-400' : 'text-green-600'}">
                        ${esPendiente ? 'Pendiente' : Formatters.formatearMoneda(totalPagar)}
                    </td>
                    <td>
                        ${registro.origen === 'manual' ? `
                            <div class="flex space-x-2">
                                <button onclick="ServiciosProfesionalesModule.editarRegistro('${registro.id}')" 
                                    class="text-blue-600 hover:text-blue-800" title="Editar">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <button onclick="ServiciosProfesionalesModule.eliminarRegistro('${registro.id}')" 
                                    class="text-red-600 hover:text-red-800" title="Eliminar">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        ` : `
                            <div class="flex items-center space-x-2">
                                <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Auto</span>
                                ${esPendiente ? '<span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Sin salida</span>' : ''}
                                ${Auth.isAdmin() ? `
                                    <div class="flex space-x-1 ml-2">
                                        <button onclick="ServiciosProfesionalesModule.editarRegistroAutomatico('${registro.id}')" 
                                            class="text-blue-600 hover:text-blue-800" title="Editar (Admin)">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                            </svg>
                                        </button>
                                        <button onclick="ServiciosProfesionalesModule.eliminarRegistroAutomatico('${registro.id}')" 
                                            class="text-red-600 hover:text-red-800" title="Eliminar (Admin)">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Renderiza resumen de pagos (wrapper con contenedor)
     */
    renderResumenPagos() {
        return this.renderResumenPagosContent();
    },

    /**
     * Renderiza el contenido del resumen de pagos
     */
    renderResumenPagosContent() {
        const registrosFiltrados = this.filtrarRegistros();
        const resumenPorEmpleado = {};

        registrosFiltrados.forEach(registro => {
            const empleado = this.empleadosSP.find(e => e.id === registro.empleadoId);
            if (!empleado) return;

            if (!resumenPorEmpleado[registro.empleadoId]) {
                resumenPorEmpleado[registro.empleadoId] = {
                    empleado,
                    totalHoras: 0,
                    totalPagar: 0,
                    registros: []
                };
            }

            const esPendiente = registro.pendiente || registro.horaSalida === 'Pendiente';
            const horasTrabajadas = esPendiente ? 0 : (registro.horasTrabajadas || this.calcularHoras(registro.horaEntrada, registro.horaSalida));
            const salarioHorario = this.obtenerSalarioHora(empleado);
            const totalPagar = horasTrabajadas * salarioHorario;

            resumenPorEmpleado[registro.empleadoId].totalHoras += horasTrabajadas;
            resumenPorEmpleado[registro.empleadoId].totalPagar += totalPagar;
            resumenPorEmpleado[registro.empleadoId].registros.push(registro);
        });

        const empleadosConRegistros = Object.values(resumenPorEmpleado);

        if (empleadosConRegistros.length === 0) {
            return '';
        }

        return `
            <div class="card">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Resumen por Profesional</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${empleadosConRegistros.map(resumen => `
                        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 class="font-semibold text-gray-800 mb-2">${resumen.empleado.nombre}</h4>
                            <div class="space-y-1 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Tiempo Registrado:</span>
                                    <span class="font-medium">${resumen.totalHoras.toFixed(2)} hrs</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Monto Estimado:</span>
                                    <span class="font-semibold text-green-600">${Formatters.formatearMoneda(resumen.totalPagar)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Registros:</span>
                                    <span class="font-medium">${resumen.registros.length}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Filtra registros según los filtros aplicados
     */
    filtrarRegistros() {
        let registros = [...this.registrosHoras];

        // Usar los filtros guardados en las propiedades del módulo
        if (this.filtros.empleadoId) {
            registros = registros.filter(r => r.empleadoId === this.filtros.empleadoId);
        }

        if (this.filtros.fechaInicio) {
            const fechaInicioTimestamp = new Date(this.filtros.fechaInicio).getTime();
            registros = registros.filter(r => r.fecha >= fechaInicioTimestamp);
        }

        if (this.filtros.fechaFin) {
            const fechaFinTimestamp = new Date(this.filtros.fechaFin + 'T23:59:59').getTime();
            registros = registros.filter(r => r.fecha <= fechaFinTimestamp);
        }

        // Ordenar por fecha descendente
        registros.sort((a, b) => b.fecha - a.fecha);

        return registros;
    },

    /**
     * Aplica filtros y re-renderiza
     */
    async aplicarFiltros() {
        // Guardar los valores de los filtros antes de re-renderizar
        this.filtros.empleadoId = document.getElementById('filtroEmpleado')?.value || '';
        this.filtros.fechaInicio = document.getElementById('filtroFechaInicio')?.value || '';
        this.filtros.fechaFin = document.getElementById('filtroFechaFin')?.value || '';

        // Recargar registros con las nuevas fechas
        await this.cargarRegistrosHoras();

        // Re-renderizar la tabla y el resumen sin recargar todo
        this.renderTablaYResumen();
    },

    /**
     * Renderiza solo la tabla y el resumen (no toda la página)
     */
    renderTablaYResumen() {
        const tablaBody = document.querySelector('.data-table tbody');
        if (tablaBody) {
            tablaBody.innerHTML = this.renderRegistrosTable();
        }

        // Actualizar el resumen
        const resumenContainer = document.getElementById('resumenPagosContainer');
        if (resumenContainer) {
            resumenContainer.innerHTML = this.renderResumenPagosContent();
        }
    },

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        document.getElementById('filtroEmpleado')?.addEventListener('change', () => {
            this.aplicarFiltros();
        });

        document.getElementById('filtroFechaInicio')?.addEventListener('change', () => {
            this.aplicarFiltros();
        });

        document.getElementById('filtroFechaFin')?.addEventListener('change', () => {
            this.aplicarFiltros();
        });
    },

    /**
     * Muestra modal para registrar horas
     */
    mostrarModalRegistro(registroId = null) {
        const registro = registroId ? this.registrosHoras.find(r => r.id === registroId) : null;
        const esEdicion = !!registro;
        
        // Preparar valor de fecha para el input
        const fechaValue = registro 
            ? this.timestampAFormatoInput(registro.fecha) 
            : this.timestampAFormatoInput(new Date().getTime());

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalRegistroSP">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-800">${esEdicion ? 'Editar' : 'Nuevo'} Registro de Horas</h2>
                        <button onclick="ServiciosProfesionalesModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <form id="formRegistroSP" class="p-6 space-y-6">
                        <div class="form-group">
                            <label class="form-label">Profesional <span class="text-red-500">*</span></label>
                            <select id="empleadoId" class="form-control" required>
                                <option value="">Seleccione un profesional</option>
                                ${this.empleadosSP.map(e => `
                                    <option value="${e.id}" ${registro?.empleadoId === e.id ? 'selected' : ''}>
                                        ${e.nombre} - ${Formatters.formatearCedula(e.cedula)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Fecha <span class="text-red-500">*</span></label>
                            <input type="date" id="fecha" class="form-control" 
                                value="${fechaValue}" 
                                required>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Inicio de Actividad <span class="text-red-500">*</span></label>
                                <input type="time" id="horaEntrada" class="form-control" 
                                    value="${registro?.horaEntrada || ''}" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Fin de Actividad <span class="text-red-500">*</span></label>
                                <input type="time" id="horaSalida" class="form-control" 
                                    value="${registro?.horaSalida || ''}" required>
                            </div>
                        </div>

                        <div id="previewCalculo" class="bg-blue-50 border border-blue-200 rounded-lg p-4 hidden">
                            <h4 class="font-semibold text-blue-800 mb-2">Vista Previa del Cálculo</h4>
                            <div class="space-y-1 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Duración:</span>
                                    <span class="font-medium" id="previewHoras">0.00 hrs</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Tarifa SP:</span>
                                    <span class="font-medium" id="previewSalarioHora">₡0.00</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Monto Estimado:</span>
                                    <span class="font-semibold text-green-600" id="previewTotal">₡0.00</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                            <button type="button" onclick="ServiciosProfesionalesModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                ${esEdicion ? 'Guardar Cambios' : 'Guardar Registro'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        this.setupModalEventListeners(registroId);
    },

    /**
     * Configura event listeners del modal
     */
    setupModalEventListeners(registroId = null) {
        const form = document.getElementById('formRegistroSP');
        const empleadoSelect = document.getElementById('empleadoId');
        const horaEntrada = document.getElementById('horaEntrada');
        const horaSalida = document.getElementById('horaSalida');
        const previewDiv = document.getElementById('previewCalculo');

        // Calcular preview en tiempo real
        const calcularPreview = () => {
            const empleadoId = empleadoSelect.value;
            const entrada = horaEntrada.value;
            const salida = horaSalida.value;

            if (empleadoId && entrada && salida) {
                const empleado = this.empleadosSP.find(e => e.id === empleadoId);
                if (empleado) {
                    const horas = this.calcularHoras(entrada, salida);
                    const salarioHorario = this.obtenerSalarioHora(empleado);
                    const total = horas * salarioHorario;

                    document.getElementById('previewHoras').textContent = `${horas.toFixed(2)} hrs`;
                    document.getElementById('previewSalarioHora').textContent = Formatters.formatearMoneda(salarioHorario);
                    document.getElementById('previewTotal').textContent = Formatters.formatearMoneda(total);
                    previewDiv.classList.remove('hidden');
                }
            } else {
                previewDiv.classList.add('hidden');
            }
        };

        empleadoSelect.addEventListener('change', calcularPreview);
        horaEntrada.addEventListener('input', calcularPreview);
        horaSalida.addEventListener('input', calcularPreview);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.guardarRegistro(registroId);
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('modalRegistroSP').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.cerrarModal();
            }
        });
    },

    /**
     * Calcula horas trabajadas entre dos horas
     */
    calcularHoras(horaEntrada, horaSalida) {
        if (!horaEntrada || !horaSalida) return 0;

        const [entradaH, entradaM] = horaEntrada.split(':').map(Number);
        const [salidaH, salidaM] = horaSalida.split(':').map(Number);

        const entradaMinutos = entradaH * 60 + entradaM;
        const salidaMinutos = salidaH * 60 + salidaM;

        // Manejar caso donde la salida es al día siguiente
        let diferenciaMinutos = salidaMinutos - entradaMinutos;
        if (diferenciaMinutos < 0) {
            diferenciaMinutos += 24 * 60; // Agregar 24 horas
        }

        return diferenciaMinutos / 60;
    },

    /**
     * Obtiene la tarifa por hora del empleado
     * IMPORTANTE: Para empleados SP, la jornada NO importa ya que se les paga por hora trabajada.
     * Solo se usa la tarifa horaria directa configurada en empleado.salarioHorario
     */
    obtenerSalarioHora(empleado) {
        if (!empleado) return 0;

        // Para empleados SP, siempre usar la tarifa horaria directa
        // La jornada NO aplica para SP, se les paga por hora trabajada
        const tarifaManual = parseFloat(empleado.salarioHorario);
        if (!isNaN(tarifaManual) && tarifaManual > 0) {
            return tarifaManual;
        }

        // Si es SP pero no tiene tarifa horaria configurada, retornar 0
        if (empleado.tipoEmpleado === 'SP') {
            return 0;
        }

        // Para empleados regulares (no SP), calcular tarifa desde salario mensual y jornada
        return Calculations.calcularSalarioHorario(
            empleado.salarioMensual || 0,
            empleado.jornada || 'diurna',
            empleado.salarioHorario
        );
    },

    /**
     * Guarda registro de horas
     */
    /**
     * Convierte una fecha en formato YYYY-MM-DD a timestamp sin problemas de zona horaria
     * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
     * @returns {number} Timestamp en milisegundos
     */
    fechaStringATimestamp(fechaStr) {
        if (!fechaStr) return null;
        
        const partes = fechaStr.split('-');
        if (partes.length !== 3) return null;
        
        const año = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1; // Mes es 0-indexed
        const dia = parseInt(partes[2], 10);
        
        // Crear fecha en hora local (medianoche local)
        const fecha = new Date(año, mes, dia, 0, 0, 0, 0);
        return fecha.getTime();
    },

    /**
     * Formatea un timestamp a fecha DD/MM/YYYY sin problemas de zona horaria
     * @param {number} timestamp - Timestamp en milisegundos
     * @returns {string} Fecha formateada DD/MM/YYYY
     */
    formatearFechaDesdeTimestamp(timestamp) {
        if (!timestamp) return '-';
        
        // Crear Date desde timestamp
        const fecha = new Date(timestamp);
        
        if (isNaN(fecha.getTime())) return '-';
        
        // Usar componentes locales directamente del objeto Date
        // Estos métodos siempre devuelven valores en la zona horaria local
        const dia = fecha.getDate();
        const mes = fecha.getMonth() + 1; // getMonth() es 0-indexed
        const año = fecha.getFullYear();
        
        // Formatear con padding
        const diaStr = String(dia).padStart(2, '0');
        const mesStr = String(mes).padStart(2, '0');
        
        return `${diaStr}/${mesStr}/${año}`;
    },

    /**
     * Convierte un timestamp a formato YYYY-MM-DD para input date sin problemas de zona horaria
     * @param {number} timestamp - Timestamp en milisegundos
     * @returns {string} Fecha en formato YYYY-MM-DD
     */
    timestampAFormatoInput(timestamp) {
        if (!timestamp) return '';
        
        // Crear Date desde timestamp
        const fecha = new Date(timestamp);
        
        if (isNaN(fecha.getTime())) return '';
        
        // Usar componentes locales directamente
        const año = fecha.getFullYear();
        const mes = fecha.getMonth() + 1; // getMonth() es 0-indexed
        const dia = fecha.getDate();
        
        // Formatear con padding
        const añoStr = String(año);
        const mesStr = String(mes).padStart(2, '0');
        const diaStr = String(dia).padStart(2, '0');
        
        return `${añoStr}-${mesStr}-${diaStr}`;
    },

    async guardarRegistro(registroId) {
        try {
            const empleadoId = document.getElementById('empleadoId').value;
            const fechaInput = document.getElementById('fecha').value;
            const fecha = this.fechaStringATimestamp(fechaInput);
            const horaEntrada = document.getElementById('horaEntrada').value;
            const horaSalida = document.getElementById('horaSalida').value;

            if (!empleadoId || !fecha || !horaEntrada || !horaSalida) {
                Utils.showToast('Por favor complete todos los campos', 'error');
                return;
            }

            const horasTrabajadas = this.calcularHoras(horaEntrada, horaSalida);
            if (horasTrabajadas <= 0) {
                Utils.showToast('La hora de salida debe ser posterior a la hora de entrada', 'error');
                return;
            }

            const empleado = this.empleadosSP.find(e => e.id === empleadoId);
            const salarioHorario = this.obtenerSalarioHora(empleado);
            if (!salarioHorario || salarioHorario <= 0) {
                Utils.showToast('El empleado seleccionado no tiene configurada una tarifa por hora.', 'error');
                return;
            }
            const totalPagar = horasTrabajadas * salarioHorario;

            Utils.showLoading('Guardando registro...');

            if (registroId) {
                // Al editar, solo actualizar los campos necesarios (sin fechaCreacion)
                const datosActualizacion = {
                    empleadoId,
                    fecha,
                    horaEntrada,
                    horaSalida,
                    horasTrabajadas,
                    salarioHorario,
                    totalPagar,
                    fechaActualizacion: firebase.database.ServerValue.TIMESTAMP
                };
                await FirebaseHelpers.update(CONFIG.DB_PATHS.SERVICIOS_PROFESIONALES + '/' + registroId, datosActualizacion);
                Utils.showToast('Registro actualizado exitosamente', 'success');
            } else {
                // Al crear, incluir fechaCreacion
                const datosRegistro = {
                    empleadoId,
                    fecha,
                    horaEntrada,
                    horaSalida,
                    horasTrabajadas,
                    salarioHorario,
                    totalPagar,
                    fechaCreacion: firebase.database.ServerValue.TIMESTAMP,
                    fechaActualizacion: firebase.database.ServerValue.TIMESTAMP
                };
                const registroIdNuevo = await FirebaseHelpers.push(CONFIG.DB_PATHS.SERVICIOS_PROFESIONALES, datosRegistro);
                Utils.showToast('Registro guardado exitosamente', 'success');
            }

            this.cerrarModal();
            await this.cargarRegistrosHoras();
            this.render();
            Utils.hideLoading();

        } catch (error) {
            console.error('Error guardando registro:', error);
            Utils.showToast('Error al guardar registro: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Edita un registro
     */
    editarRegistro(registroId) {
        this.mostrarModalRegistro(registroId);
    },

    /**
     * Elimina un registro
     */
    async eliminarRegistro(registroId) {
        const registro = this.registrosHoras.find(r => r.id === registroId);
        if (!registro) return;

        const empleado = this.empleadosSP.find(e => e.id === registro.empleadoId);
        const nombreEmpleado = empleado?.nombre || 'N/A';

        if (!confirm(`¿Está seguro de eliminar el registro de ${nombreEmpleado} del ${Formatters.formatearFecha(registro.fecha)}?`)) {
            return;
        }

        try {
            Utils.showLoading('Eliminando registro...');
            const path = CONFIG.DB_PATHS.SERVICIOS_PROFESIONALES + '/' + registroId;
            await FirebaseHelpers.remove(path);
            Utils.showToast('Registro eliminado exitosamente', 'success');
            await this.cargarRegistrosHoras();
            this.render();
            Utils.hideLoading();
        } catch (error) {
            console.error('Error eliminando registro:', error);
            Utils.showToast('Error al eliminar registro', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Cierra el modal
     */
    cerrarModal() {
        document.getElementById('modalContainer').innerHTML = '';
    },

    /**
     * Edita un registro automático (solo para administradores)
     */
    async editarRegistroAutomatico(registroId) {
        if (!Auth.isAdmin()) {
            Utils.showToast('Solo los administradores pueden editar registros automáticos', 'error');
            return;
        }

        const registro = this.registrosHoras.find(r => r.id === registroId);
        if (!registro || registro.origen !== 'automatico') {
            Utils.showToast('Registro no encontrado o no es automático', 'error');
            return;
        }

        const empleado = this.empleadosSP.find(e => e.id === registro.empleadoId);
        if (!empleado) {
            Utils.showToast('Empleado no encontrado', 'error');
            return;
        }

        // Convertir horaEntrada y horaSalida a formato HH:mm para el input time
        const horaEntradaValue = registro.horaEntrada || '';
        const horaSalidaValue = registro.horaSalida === 'Pendiente' ? '' : (registro.horaSalida || '');

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalEditarAutoSP">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-800">Editar Registro Automático</h2>
                        <button onclick="ServiciosProfesionalesModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="p-6">
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
                            <p class="text-sm text-yellow-800">
                                <strong>Nota:</strong> Está editando un registro generado automáticamente desde el control de asistencia. 
                                Los cambios se aplicarán directamente a los registros de entrada/salida.
                            </p>
                        </div>

                        <div class="mb-4">
                            <p class="text-sm text-gray-600"><strong>Profesional:</strong> ${empleado.nombre}</p>
                            <p class="text-sm text-gray-600"><strong>Fecha:</strong> ${Formatters.formatearFecha(registro.fecha)}</p>
                        </div>

                        <form id="formEditarAutoSP" class="space-y-6">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="form-label">Hora de Entrada <span class="text-red-500">*</span></label>
                                    <input type="time" id="horaEntradaAuto" class="form-control" 
                                        value="${horaEntradaValue}" required>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Hora de Salida ${registro.pendiente ? '' : '<span class="text-red-500">*</span>'}</label>
                                    <input type="time" id="horaSalidaAuto" class="form-control" 
                                        value="${horaSalidaValue}" ${registro.pendiente ? '' : 'required'}>
                                    ${registro.pendiente ? '<p class="text-xs text-gray-500 mt-1">Opcional: Deje vacío si aún no hay salida</p>' : ''}
                                </div>
                            </div>

                            <div id="previewCalculoAuto" class="bg-blue-50 border border-blue-200 rounded-lg p-4 hidden">
                                <h4 class="font-semibold text-blue-800 mb-2">Vista Previa del Cálculo</h4>
                                <div class="space-y-1 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Duración:</span>
                                        <span class="font-medium" id="previewHorasAuto">0.00 hrs</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Tarifa SP:</span>
                                        <span class="font-medium" id="previewSalarioHoraAuto">₡0.00</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Monto Estimado:</span>
                                        <span class="font-semibold text-green-600" id="previewTotalAuto">₡0.00</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                <button type="button" onclick="ServiciosProfesionalesModule.cerrarModal()" class="btn btn-outline">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        this.setupModalEditarAutoEventListeners(registroId, registro);
    },

    /**
     * Configura event listeners del modal de edición automática
     */
    setupModalEditarAutoEventListeners(registroId, registro) {
        const form = document.getElementById('formEditarAutoSP');
        const horaEntrada = document.getElementById('horaEntradaAuto');
        const horaSalida = document.getElementById('horaSalidaAuto');
        const previewDiv = document.getElementById('previewCalculoAuto');
        const empleado = this.empleadosSP.find(e => e.id === registro.empleadoId);

        // Calcular preview en tiempo real
        const calcularPreview = () => {
            const entrada = horaEntrada.value;
            const salida = horaSalida.value;

            if (entrada && empleado) {
                if (salida) {
                    const horas = this.calcularHoras(entrada, salida);
                    const salarioHorario = this.obtenerSalarioHora(empleado);
                    const total = horas * salarioHorario;

                    document.getElementById('previewHorasAuto').textContent = `${horas.toFixed(2)} hrs`;
                    document.getElementById('previewSalarioHoraAuto').textContent = Formatters.formatearMoneda(salarioHorario);
                    document.getElementById('previewTotalAuto').textContent = Formatters.formatearMoneda(total);
                    previewDiv.classList.remove('hidden');
                } else {
                    // Si no hay salida, mostrar solo la tarifa
                    const salarioHorario = this.obtenerSalarioHora(empleado);
                    document.getElementById('previewHorasAuto').textContent = 'Pendiente';
                    document.getElementById('previewSalarioHoraAuto').textContent = Formatters.formatearMoneda(salarioHorario);
                    document.getElementById('previewTotalAuto').textContent = 'Pendiente';
                    previewDiv.classList.remove('hidden');
                }
            } else {
                previewDiv.classList.add('hidden');
            }
        };

        horaEntrada.addEventListener('input', calcularPreview);
        horaSalida.addEventListener('input', calcularPreview);

        // Calcular preview inicial si hay valores
        if (horaEntrada.value && horaSalida.value) {
            calcularPreview();
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.guardarRegistroAutomatico(registroId, registro);
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('modalEditarAutoSP').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.cerrarModal();
            }
        });
    },

    /**
     * Guarda los cambios en un registro automático
     */
    async guardarRegistroAutomatico(registroId, registroOriginal) {
        try {
            const horaEntrada = document.getElementById('horaEntradaAuto').value;
            const horaSalida = document.getElementById('horaSalidaAuto').value;

            if (!horaEntrada) {
                Utils.showToast('Por favor ingrese la hora de entrada', 'error');
                return;
            }

            // Si hay hora de salida, validar que sea posterior a la entrada
            if (horaSalida) {
                const horasTrabajadas = this.calcularHoras(horaEntrada, horaSalida);
                if (horasTrabajadas <= 0) {
                    Utils.showToast('La hora de salida debe ser posterior a la hora de entrada', 'error');
                    return;
                }
            }

            Utils.showLoading('Guardando cambios...');

            // Convertir horas a timestamps para actualizar los registros
            const fechaKey = registroOriginal.fechaKey;
            const [entradaH, entradaM] = horaEntrada.split(':').map(Number);
            const [salidaH, salidaM] = horaSalida.split(':').map(Number);

            // Crear objetos Date para la fecha del registro
            const año = parseInt(fechaKey.substring(0, 4));
            const mes = parseInt(fechaKey.substring(4, 6)) - 1;
            const dia = parseInt(fechaKey.substring(6, 8));

            const fechaEntrada = new Date(año, mes, dia, entradaH, entradaM);
            let fechaSalida = null;
            
            if (horaSalida) {
                fechaSalida = new Date(año, mes, dia, salidaH, salidaM);
                // Si la salida es anterior a la entrada, asumir que es del día siguiente
                if (fechaSalida < fechaEntrada) {
                    fechaSalida.setDate(fechaSalida.getDate() + 1);
                }
            }

            const entradaTimestamp = fechaEntrada.getTime();
            const salidaTimestamp = horaSalida ? fechaSalida.getTime() : null;

            // Actualizar registro de entrada
            const pathEntrada = `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${registroOriginal.empleadoId}/${fechaKey}/${registroOriginal.entradaId}`;
            await FirebaseHelpers.update(pathEntrada, {
                hora: horaEntrada,
                timestamp: entradaTimestamp
            });

            // Manejar registro de salida
            if (horaSalida) {
                // Si hay hora de salida, actualizar o crear el registro
                if (registroOriginal.salidaId) {
                    const pathSalida = `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${registroOriginal.empleadoId}/${fechaKey}/${registroOriginal.salidaId}`;
                    await FirebaseHelpers.update(pathSalida, {
                        hora: horaSalida,
                        timestamp: salidaTimestamp
                    });
                } else {
                    // Crear nuevo registro de salida
                    const nuevoRegistroSalida = {
                        empleadoId: registroOriginal.empleadoId,
                        fecha: fechaKey,
                        tipo: 'salida',
                        hora: horaSalida,
                        timestamp: salidaTimestamp,
                        registradoPor: FirebaseHelpers.currentUser?.uid || 'admin',
                        fechaRegistro: firebase.database.ServerValue.TIMESTAMP
                    };
                    await FirebaseHelpers.push(
                        `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${registroOriginal.empleadoId}/${fechaKey}`,
                        nuevoRegistroSalida
                    );
                }
            } else {
                // Si no hay hora de salida y existía un registro de salida, eliminarlo
                if (registroOriginal.salidaId) {
                    const pathSalida = `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${registroOriginal.empleadoId}/${fechaKey}/${registroOriginal.salidaId}`;
                    await FirebaseHelpers.remove(pathSalida);
                }
            }

            Utils.showToast('Registro automático actualizado exitosamente', 'success');
            this.cerrarModal();
            await this.cargarRegistrosHoras();
            this.render();
            Utils.hideLoading();

        } catch (error) {
            console.error('Error guardando registro automático:', error);
            Utils.showToast('Error al guardar cambios: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Elimina un registro automático (solo para administradores)
     */
    async eliminarRegistroAutomatico(registroId) {
        if (!Auth.isAdmin()) {
            Utils.showToast('Solo los administradores pueden eliminar registros automáticos', 'error');
            return;
        }

        const registro = this.registrosHoras.find(r => r.id === registroId);
        if (!registro || registro.origen !== 'automatico') {
            Utils.showToast('Registro no encontrado o no es automático', 'error');
            return;
        }

        const empleado = this.empleadosSP.find(e => e.id === registro.empleadoId);
        const nombreEmpleado = empleado?.nombre || 'N/A';

        if (!confirm(`¿Está seguro de eliminar el registro automático de ${nombreEmpleado} del ${Formatters.formatearFecha(registro.fecha)}?\n\nEsta acción eliminará los registros de entrada y salida del control de asistencia.`)) {
            return;
        }

        try {
            Utils.showLoading('Eliminando registro...');

            const fechaKey = registro.fechaKey;

            // Eliminar registro de entrada
            if (registro.entradaId) {
                const pathEntrada = `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${registro.empleadoId}/${fechaKey}/${registro.entradaId}`;
                await FirebaseHelpers.remove(pathEntrada);
            }

            // Eliminar registro de salida si existe
            if (registro.salidaId) {
                const pathSalida = `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${registro.empleadoId}/${fechaKey}/${registro.salidaId}`;
                await FirebaseHelpers.remove(pathSalida);
            }

            Utils.showToast('Registro automático eliminado exitosamente', 'success');
            await this.cargarRegistrosHoras();
            this.render();
            Utils.hideLoading();
        } catch (error) {
            console.error('Error eliminando registro automático:', error);
            Utils.showToast('Error al eliminar registro: ' + error.message, 'error');
            Utils.hideLoading();
        }
    }
};

// Export to window
window.ServiciosProfesionalesModule = ServiciosProfesionalesModule;

