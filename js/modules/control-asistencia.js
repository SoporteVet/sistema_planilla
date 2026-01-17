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
                            <div class="flex gap-2">
                                <select id="empleadoSelect" class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base">
                                    <option value="">-- Seleccione un colaborador --</option>
                                    ${this.empleadosSP.map(emp => `
                                        <option value="${emp.id}">${emp.nombre} - ${emp.cedula}</option>
                                    `).join('')}
                                </select>
                                <button id="btnResetEmpleado" class="hidden px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm">
                                    Cambiar
                                </button>
                            </div>
                        </div>

                        <!-- Estado del empleado -->
                        <div id="estadoEmpleado" class="hidden bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-700">Empleado seleccionado:</p>
                                    <p id="nombreEmpleadoActual" class="text-lg font-semibold text-gray-900"></p>
                                </div>
                                <div id="estadoActual" class="text-right">
                                    <p class="text-sm text-gray-600">Estado actual:</p>
                                    <p id="estadoTexto" class="text-lg font-semibold"></p>
                                </div>
                            </div>
                        </div>

                        <div id="botonesContainer" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button id="btnEntrada" class="px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md flex items-center justify-center space-x-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                                </svg>
                                <span>ENTRADA</span>
                            </button>
                            
                            <button id="btnSalida" class="px-6 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition shadow-md flex items-center justify-center space-x-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                <span>SALIDA</span>
                            </button>
                        </div>
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
        const btnResetEmpleado = document.getElementById('btnResetEmpleado');

        if (empleadoSelect) {
            empleadoSelect.addEventListener('change', async (e) => {
                this.empleadoSeleccionado = e.target.value;

                if (this.empleadoSeleccionado) {
                    await this.cargarRegistrosHoy();
                    await this.actualizarEstadoEmpleado();
                    document.getElementById('botonesContainer').classList.remove('hidden');
                    document.getElementById('estadoEmpleado').classList.remove('hidden');
                    document.getElementById('btnResetEmpleado').classList.remove('hidden');
                    
                    // Deshabilitar el select para evitar cambios accidentales
                    empleadoSelect.disabled = true;
                } else {
                    document.getElementById('botonesContainer').classList.add('hidden');
                    document.getElementById('estadoEmpleado').classList.add('hidden');
                    document.getElementById('btnResetEmpleado').classList.add('hidden');
                }
            });
        }

        if (btnResetEmpleado) {
            btnResetEmpleado.addEventListener('click', () => {
                this.resetearSeleccion();
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
     * Resetea la selección de empleado
     */
    resetearSeleccion() {
        this.empleadoSeleccionado = null;
        this.registrosHoy = [];
        
        const empleadoSelect = document.getElementById('empleadoSelect');
        if (empleadoSelect) {
            empleadoSelect.value = '';
            empleadoSelect.disabled = false;
        }
        
        document.getElementById('botonesContainer').classList.add('hidden');
        document.getElementById('estadoEmpleado').classList.add('hidden');
        document.getElementById('btnResetEmpleado').classList.add('hidden');
    },

    /**
     * Actualiza el estado visual del empleado seleccionado
     */
    async actualizarEstadoEmpleado() {
        const empleado = this.empleadosSP.find(e => e.id === this.empleadoSeleccionado);
        if (!empleado) return;

        // Actualizar nombre del empleado
        document.getElementById('nombreEmpleadoActual').textContent = empleado.nombre;

        // Determinar estado actual
        const entradas = this.registrosHoy.filter(r => r.tipo === 'entrada');
        const salidas = this.registrosHoy.filter(r => r.tipo === 'salida');
        
        const estadoTextoEl = document.getElementById('estadoTexto');
        const btnEntrada = document.getElementById('btnEntrada');
        const btnSalida = document.getElementById('btnSalida');

        if (entradas.length > salidas.length) {
            // Hay una entrada sin salida
            estadoTextoEl.textContent = 'En el edificio';
            estadoTextoEl.className = 'text-lg font-semibold text-green-600';
            btnEntrada.disabled = true;
            btnSalida.disabled = false;
        } else {
            // No hay entrada sin salida
            estadoTextoEl.textContent = 'Fuera del edificio';
            estadoTextoEl.className = 'text-lg font-semibold text-gray-600';
            btnEntrada.disabled = false;
            btnSalida.disabled = true;
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

        console.log('=== INICIO REGISTRO DE ASISTENCIA ===');
        console.log('Empleado seleccionado:', this.empleadoSeleccionado);
        console.log('Tipo de registro:', tipo);

        try {
            Utils.showLoading(`Registrando ${tipo}...`);

            // Obtener nombre del empleado para el mensaje
            const empleado = this.empleadosSP.find(e => e.id === this.empleadoSeleccionado);
            const nombreEmpleado = empleado ? empleado.nombre : 'empleado';

            console.log('Datos del empleado:', empleado);

            const registro = await FirebaseHelpers.registrarControlAsistencia(
                this.empleadoSeleccionado,
                tipo
            );

            console.log('Registro completado:', registro);
            console.log('=== FIN REGISTRO DE ASISTENCIA ===');

            // Recargar los registros del día y actualizar estado
            await this.cargarRegistrosHoy();
            await this.actualizarEstadoEmpleado();

            Utils.hideLoading();
            Utils.showToast(
                `${tipo.toUpperCase()} registrada exitosamente para ${nombreEmpleado} a las ${registro.hora}`, 
                'success'
            );

        } catch (error) {
            Utils.hideLoading();
            console.error('=== ERROR EN REGISTRO DE ASISTENCIA ===');
            console.error('Error completo:', error);
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
            Utils.showToast(error.message || `Error al registrar ${tipo}`, 'error');
        }
    },

};

// Export to window
window.ControlAsistenciaModule = ControlAsistenciaModule;
