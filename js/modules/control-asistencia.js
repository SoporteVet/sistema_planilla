/**
 * Control de Asistencia Module - Sistema de Planillas Costa Rica
 * Módulo para control de entrada/salida de Servicios Profesionales
 */

const ControlAsistenciaModule = {
    empleadosSP: [],
    registrosHoy: [],
    empleadoSeleccionado: null,

    /**
     * Inicializa el módulo
     */
    init() {
        console.log('Control de Asistencia Module initialized');
    },

    /**
     * Carga empleados de tipo SP
     */
    async cargarEmpleadosSP() {
        const empleados = await FirebaseHelpers.getEmpleados();
        this.empleadosSP = empleados.filter(e =>
            e.tipoEmpleado === 'SP' && e.estado === 'activo'
        );
        console.log(`Empleados SP cargados: ${this.empleadosSP.length}`);
    },

    /**
     * Carga registros del día actual
     */
    async cargarRegistrosHoy() {
        if (!this.empleadoSeleccionado) {
            this.registrosHoy = [];
            return;
        }

        const fecha = Formatters.formatearFechaKey(new Date());
        this.registrosHoy = await FirebaseHelpers.obtenerRegistrosAsistenciaDia(
            this.empleadoSeleccionado,
            fecha
        );
    },

    /**
     * Renderiza la vista principal
     */
    async render() {
        Utils.updateBreadcrumb(['Control de Acceso']);

        await this.cargarEmpleadosSP();

        const html = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 class="text-2xl lg:text-3xl font-bold text-gray-800">Control de Acceso</h1>
                        <p class="text-sm text-gray-600 mt-1">Ingreso / Salida del Edificio</p>
                    </div>
                    <div class="text-sm lg:text-base text-gray-600">
                        <span class="font-medium">Fecha:</span> ${Formatters.formatearFecha(new Date())}
                    </div>
                </div>

                <!-- Disclaimer Legal -->
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <div class="flex items-start">
                        <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-sm text-blue-800">
                            <strong>Nota importante:</strong> Este registro no constituye control de jornada ni supervisión laboral. 
                            Únicamente se administra el ingreso a las instalaciones por motivos de seguridad, control interno y trazabilidad.
                        </p>
                    </div>
                </div>

                <!-- Selector de empleado y botones -->
                <div class="card">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Seleccionar Colaborador</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Nombre del Colaborador
                            </label>
                            <select id="empleadoSelect" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base">
                                <option value="">-- Seleccione un colaborador --</option>
                                ${this.empleadosSP.map(emp => `
                                    <option value="${emp.id}">${emp.nombre} - ${emp.cedula}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div id="botonesContainer" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button id="btnEntrada" class="px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md flex items-center justify-center space-x-2 text-lg">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                                </svg>
                                <span>ENTRADA</span>
                            </button>
                            
                            <button id="btnSalida" class="px-6 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-md flex items-center justify-center space-x-2 text-lg">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                <span>SALIDA</span>
                            </button>
                        </div>


           
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        this.setupEventListeners();
    },

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        const empleadoSelect = document.getElementById('empleadoSelect');
        const btnEntrada = document.getElementById('btnEntrada');
        const btnSalida = document.getElementById('btnSalida');

        if (empleadoSelect) {
            empleadoSelect.addEventListener('change', async (e) => {
                this.empleadoSeleccionado = e.target.value;

                if (this.empleadoSeleccionado) {
                    document.getElementById('botonesContainer').classList.remove('hidden');
                    document.getElementById('registrosContainer').classList.remove('hidden');
                    await this.cargarRegistrosHoy();
                    this.actualizarEstado();
                    this.renderRegistros();
                } else {
                    document.getElementById('botonesContainer').classList.add('hidden');
                    document.getElementById('registrosContainer').classList.add('hidden');
                    document.getElementById('estadoActual').classList.add('hidden');
                }
            });
        }

        if (btnEntrada) {
            btnEntrada.addEventListener('click', () => this.registrarAsistencia('entrada'));
        }

        if (btnSalida) {
            btnSalida.addEventListener('click', () => this.registrarAsistencia('salida'));
        }
    },

    /**
     * Registra entrada o salida
     */
    async registrarAsistencia(tipo) {
        if (!this.empleadoSeleccionado) {
            Utils.showToast('Debe seleccionar un empleado', 'warning');
            return;
        }

        try {
            Utils.showLoading(`Registrando ${tipo}...`);

            const registro = await FirebaseHelpers.registrarControlAsistencia(
                this.empleadoSeleccionado,
                tipo
            );

            Utils.hideLoading();
            Utils.showToast(`${tipo.toUpperCase()} registrada exitosamente`, 'success');

            // Recargar registros y actualizar estado
            await this.cargarRegistrosHoy();
            this.actualizarEstado();
            this.renderRegistros();

        } catch (error) {
            Utils.hideLoading();
            console.error('Error registrando asistencia:', error);
            Utils.showToast(error.message || `Error al registrar ${tipo}`, 'error');
        }
    },

    /**
     * Actualiza el estado actual del empleado
     */
    actualizarEstado() {
        const estadoDiv = document.getElementById('estadoActual');
        if (!estadoDiv) return;

        const ultimaEntrada = this.registrosHoy
            .filter(r => r.tipo === 'entrada')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        const ultimaSalida = this.registrosHoy
            .filter(r => r.tipo === 'salida')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        const tieneEntradaSinSalida = ultimaEntrada && (!ultimaSalida || ultimaEntrada.timestamp > ultimaSalida.timestamp);

        estadoDiv.classList.remove('hidden');

        if (tieneEntradaSinSalida) {
            estadoDiv.className = 'p-4 rounded-lg bg-green-50 border border-green-200';
            estadoDiv.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                        <p class="text-green-800 font-semibold">Entrada Registrada</p>
                        <p class="text-green-600 text-sm">Hora: ${ultimaEntrada.hora}</p>
                    </div>
                </div>
            `;
        } else if (ultimaSalida) {
            estadoDiv.className = 'p-4 rounded-lg bg-gray-50 border border-gray-200';
            estadoDiv.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <div>
                        <p class="text-gray-700 font-semibold">Última Salida</p>
                        <p class="text-gray-600 text-sm">Hora: ${ultimaSalida.hora}</p>
                    </div>
                </div>
            `;
        } else {
            estadoDiv.className = 'p-4 rounded-lg bg-blue-50 border border-blue-200';
            estadoDiv.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <div>
                        <p class="text-blue-700 font-semibold">Sin Entrada Registrada</p>
                        <p class="text-blue-600 text-sm">Presione el botón ENTRADA para registrar</p>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Renderiza la tabla de registros
     */
    renderRegistros() {
        const container = document.getElementById('tablaRegistros');
        if (!container) return;

        if (this.registrosHoy.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p class="text-lg">No hay registros para hoy</p>
                </div>
            `;
            return;
        }

        const html = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tipo
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hora
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha/Hora Exacta
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${this.registrosHoy.map(registro => `
                            <tr>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span class="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${registro.tipo === 'entrada'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }">
                                        ${registro.tipo.toUpperCase()}
                                    </span>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-base font-medium text-gray-900">
                                    ${registro.hora}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    ${new Date(registro.timestamp).toLocaleString('es-CR')}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }
};

// Export to window
window.ControlAsistenciaModule = ControlAsistenciaModule;
