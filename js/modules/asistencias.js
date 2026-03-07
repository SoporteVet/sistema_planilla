/**
 * Registro de Horas Module - Sistema de Planillas Costa Rica
 * Gestión de horas trabajadas por empleado
 */

const AsistenciasModule = {
    empleados: [],
    asistencias: {},
    empleadoSeleccionado: null,
    mesActual: new Date(),
    mesSeleccionado: null, // Guardar el mes seleccionado por el usuario
    quincenaSeleccionada: null, // Guardar la quincena seleccionada

    /**
     * Inicializa el módulo
     */
    async init() {
        // No cargar datos aquí - se cargarán cuando se renderice la vista
    },

    /**
     * Carga empleados activos
     */
    async cargarEmpleados() {
        try {
            const empleados = await FirebaseHelpers.getEmpleados();
            // Filtrar solo empleados activos de planilla regular (NO SP)
            // Los empleados SP tienen su propio módulo de Control de Asistencia
            this.empleados = empleados.filter(e =>
                e.estado === 'activo' &&
                e.tipoEmpleado !== 'SP'
            );
        } catch (error) {
            console.error('Error cargando empleados:', error);
            this.empleados = [];
            Utils.showToast('Error al cargar empleados', 'error');
        }
    },

    /**
     * Renderiza la vista principal
     */
    async render() {
        // Asegurar que los empleados estén cargados siempre
        await this.cargarEmpleados();
        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Registro de Horas</h1>
                        <p class="text-sm text-gray-600 mt-1">Registre las horas quincenales trabajadas por cada empleado</p>
                    </div>
                </div>

                <!-- Selector de Empleado y Período -->
                <div class="card">
                    ${this.empleados.length === 0 ? `
                        <div class="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-800">
                            <strong>No hay empleados activos.</strong> Por favor, cree empleados en el módulo de Empleados y asegúrese de que estén marcados como "Activo".
                        </div>
                    ` : `
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label class="form-label">Empleado <span class="text-red-500">*</span></label>
                            <select id="selectEmpleado" class="form-control" required>
                                <option value="">Seleccione un empleado</option>
                                ${this.empleados.map(e => `
                                    <option value="${e.id}" ${this.empleadoSeleccionado?.id === e.id ? 'selected' : ''}>
                                        ${e.nombre} - ${Formatters.formatearCedula(e.cedula)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Mes y Año <span class="text-red-500">*</span></label>
                            <input type="month" id="selectMes" class="form-control" 
                                value="${this.mesSeleccionado || Formatters.formatearFechaInput(this.mesActual).substring(0, 7)}" 
                                required>
                            <div class="form-help text-xs text-gray-500 mt-1">Puede seleccionar cualquier mes, incluyendo meses anteriores</div>
                        </div>
                        <div>
                            <label class="form-label">Quincena <span class="text-red-500">*</span></label>
                            <select id="selectQuincena" class="form-control" required>
                                <option value="">Seleccione...</option>
                                <option value="primera" ${this.quincenaSeleccionada === 'primera' ? 'selected' : ''}>Primera (1-15)</option>
                                <option value="segunda" ${this.quincenaSeleccionada === 'segunda' ? 'selected' : ''}>Segunda (16-30)</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button onclick="AsistenciasModule.registrarHorasQuincenales()" class="btn btn-primary w-full" ${this.empleados.length === 0 ? 'disabled' : ''}>
                                Registrar Horas
                            </button>
                        </div>
                    </div>
                    `}
                </div>

                ${this.empleadoSeleccionado ? this.renderResumenQuincenal() : this.renderMensajeSeleccion()}
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Registro de Horas']);
        this.setupEventListeners();
    },

    /**
     * Renderiza mensaje de selección
     */
    renderMensajeSeleccion() {
        return `
            <div class="card text-center py-12">
                <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-700 mb-2">Seleccione un empleado</h3>
                <p class="text-sm text-gray-500">Elija un empleado, mes y quincena para registrar las horas trabajadas</p>
            </div>
        `;
    },

    /**
     * Renderiza resumen quincenal
     */
    renderResumenQuincenal() {
        if (!this.empleadoSeleccionado) return '';

        const jornada = CONFIG.getJornadaByCodigo(this.empleadoSeleccionado.jornada);
        const mesAno = document.getElementById('selectMes')?.value || '';
        const quincena = document.getElementById('selectQuincena')?.value || '';

        if (!mesAno || !quincena) {
            return `
                <div class="card">
                    <div class="bg-blue-50 border border-blue-200 rounded p-4 text-blue-800">
                        <strong>Seleccione mes y quincena</strong> para ver o registrar las horas trabajadas.
                    </div>
                </div>
            `;
        }

        // Calcular fechas de la quincena (segunda: 16 al último día del mes; febrero 16-28 o 16-29)
        const [ano, mes] = mesAno.split('-').map(Number);
        const ultimoDiaMes = new Date(ano, mes, 0).getDate();
        const fechaInicio = quincena === 'primera' ? new Date(ano, mes - 1, 1) : new Date(ano, mes - 1, 16);
        const fechaFin = quincena === 'primera' ? new Date(ano, mes - 1, 15) : new Date(ano, mes - 1, ultimoDiaMes);

        return `
            <div class="card">
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">
                        ${this.empleadoSeleccionado.nombre} - ${quincena === 'primera' ? 'Primera' : 'Segunda'} Quincena de ${Formatters.formatearMesAno(new Date(ano, mes - 1, 1))}
                    </h3>
                    <div class="text-sm text-gray-600">
                        <strong>Jornada:</strong> ${jornada.nombre} | 
                        <strong>Horas esperadas:</strong> ${jornada.horasPorQuincena} horas quincenales
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600 mb-4">
                        <strong>Período:</strong> ${Formatters.formatearFecha(fechaInicio)} al ${Formatters.formatearFecha(fechaFin)}
                    </p>
                    <p class="text-xs text-gray-500">
                        Ingrese el total de horas trabajadas en esta quincena. El sistema calculará automáticamente si faltaron horas y las descontará del salario.
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        document.getElementById('selectEmpleado')?.addEventListener('change', async (e) => {
            const empleadoId = e.target.value;
            if (empleadoId) {
                this.empleadoSeleccionado = this.empleados.find(emp => emp.id === empleadoId);
                this.render();
            }
        });

        document.getElementById('selectMes')?.addEventListener('change', (e) => {
            // Guardar el mes seleccionado
            this.mesSeleccionado = e.target.value;
            if (e.target.value) {
                this.mesActual = new Date(e.target.value + '-01');
            }
            this.render();
        });

        document.getElementById('selectQuincena')?.addEventListener('change', (e) => {
            // Guardar la quincena seleccionada
            this.quincenaSeleccionada = e.target.value;
            this.render();
        });
    },

    /**
     * Abre modal para registrar horas quincenales
     */
    async registrarHorasQuincenales() {
        if (!this.empleadoSeleccionado) {
            Utils.showToast('Seleccione un empleado', 'warning');
            return;
        }

        const mesAno = document.getElementById('selectMes')?.value;
        const quincena = document.getElementById('selectQuincena')?.value;

        if (!mesAno || !quincena) {
            Utils.showToast('Seleccione mes y quincena', 'warning');
            return;
        }

        // Calcular fechas de la quincena (segunda: 16 al último día del mes; febrero 16-28 o 16-29)
        const [ano, mes] = mesAno.split('-').map(Number);
        const ultimoDiaMes = new Date(ano, mes, 0).getDate();
        const fechaInicio = quincena === 'primera' ? new Date(ano, mes - 1, 1) : new Date(ano, mes - 1, 16);
        const fechaFin = quincena === 'primera' ? new Date(ano, mes - 1, 15) : new Date(ano, mes - 1, ultimoDiaMes);

        const jornada = CONFIG.getJornadaByCodigo(this.empleadoSeleccionado.jornada);

        // Cargar datos existentes si los hay
        const fechaInicioKey = Formatters.formatearFechaFirebase(fechaInicio);
        const fechaFinKey = Formatters.formatearFechaFirebase(fechaFin);

        // Obtener asistencias existentes del período
        const asistenciasExistentes = await FirebaseHelpers.getAsistenciasPeriodo(
            this.empleadoSeleccionado.id,
            fechaInicioKey,
            fechaFinKey
        );

        // Calcular totales de asistencias existentes
        let horasTrabajadasExistentes = 0;
        let horasExtraExistentes = 0;
        let horasAdicionalesExistentes = 0;
        let diasCCSSExistentes = 0;
        let diasINSExistentes = 0;
        let diasPermisoExistentes = 0;
        let diasFeriadosExistentes = 0;
        let horasFeriadosExistentes = 0;
        let horasExtraFeriadosExistentes = 0;

        asistenciasExistentes.forEach(a => {
            horasTrabajadasExistentes += a.horasTrabajadas || 0;
            horasExtraExistentes += a.horasExtra || 0;
            horasAdicionalesExistentes += a.horasAdicionales || 0;
            if (a.tipoDia === CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS) {
                diasCCSSExistentes += a.diasCCSSEmpresa || 1;
            }
            if (a.tipoDia === CONFIG.TIPOS_DIA.INCAPACIDAD_INS) {
                diasINSExistentes += a.diasINSEmpresa || 1;
            }
            if (a.tipoDia === CONFIG.TIPOS_DIA.PERMISO_SIN_GOCE) {
                diasPermisoExistentes += 1;
            }
            if (a.tipoDia === CONFIG.TIPOS_DIA.FERIADO_TRABAJADO) {
                diasFeriadosExistentes += 1;
                horasFeriadosExistentes += a.horasTrabajadas || 0;
                horasExtraFeriadosExistentes += a.horasExtra || 0;
            }
        });

        // Calcular días trabajados automáticamente
        // Si hay un valor manual existente, usarlo; si no, usar 15 días por defecto (total de días en una quincena)
        const diasTrabajadosManualExistente = asistenciasExistentes.find(a => a.diasTrabajadosManual !== undefined && a.diasTrabajadosManual !== null)?.diasTrabajadosManual;
        let diasTrabajadosCalculados = '';

        if (diasTrabajadosManualExistente !== undefined && diasTrabajadosManualExistente !== null) {
            // Si ya existe un valor manual, usarlo
            diasTrabajadosCalculados = diasTrabajadosManualExistente;
        } else {
            // Por defecto, usar 15 días (total de días en una quincena)
            diasTrabajadosCalculados = '15';
        }

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalHorasQuincenales">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">Registro de Horas Quincenales</h2>
                            <p class="text-sm text-gray-600">${this.empleadoSeleccionado.nombre} - ${quincena === 'primera' ? 'Primera' : 'Segunda'} Quincena</p>
                        </div>
                        <button onclick="AsistenciasModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <form id="formHorasQuincenales" class="p-6 space-y-4">
                        <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-4">
                            <strong>Jornada:</strong> ${jornada.nombre}<br>
                            <strong>Horas esperadas quincenales:</strong> ${jornada.horasPorQuincena} horas<br>
                            <strong>Período:</strong> ${Formatters.formatearFecha(fechaInicio)} al ${Formatters.formatearFecha(fechaFin)}
                        </div>

                        <div class="form-group">
                            <label class="form-label">Total Horas Trabajadas <span class="text-red-500">*</span></label>
                            <input type="number" id="horasTrabajadasQuincena" class="form-control" step="0.25" 
                                min="0" max="${jornada.horasPorQuincena * 2}" 
                                value="${horasTrabajadasExistentes || jornada.horasPorQuincena}" required>
                            <div class="form-help">
                                Ingrese el total de horas trabajadas en esta quincena. El sistema comparará con ${jornada.horasPorQuincena} horas esperadas.
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Días Trabajados (Manual)</label>
                            <input type="number" id="diasTrabajadosQuincena" class="form-control" step="0.01" 
                                min="0" max="15" 
                                value="${diasTrabajadosCalculados}">
                            <div class="form-help">
                                Por defecto se establecen 15 días (total de días en la quincena). Puede modificarlo si es necesario.
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Horas Extra</label>
                            <input type="number" id="horasExtraQuincena" class="form-control" step="0.25" min="0" 
                                value="${horasExtraExistentes || 0}">
                            <div class="form-help">Total de horas extra trabajadas en la quincena (pago 1.5x)</div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Horas Adicionales</label>
                            <input type="number" id="horasAdicionalesQuincena" class="form-control" step="0.25" min="0" 
                                value="${asistenciasExistentes.reduce((sum, a) => sum + (a.horasAdicionales || 0), 0) || 0}">
                            <div class="form-help">Total de horas adicionales trabajadas en la quincena (pago normal 1x)</div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Días Incapacidad CCSS</label>
                                <input type="number" id="diasCCSSQuincena" class="form-control" step="0.5" min="0" 
                                    value="${diasCCSSExistentes || 0}">
                                <div class="form-help">Cantidad de días de incapacidad CCSS</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Horas Incapacidad CCSS</label>
                                <input type="number" id="horasCCSSQuincena" class="form-control" step="0.25" min="0" 
                                    value="${asistenciasExistentes.filter(a => a.tipoDia === CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS).reduce((sum, a) => sum + (a.horasTrabajadas || 0), 0) || 0}">
                                <div class="form-help">Total de horas de incapacidad CCSS (p. ej. 2 días de 10h + 1 día de 8h = 28h)</div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Días Incapacidad INS</label>
                                <input type="number" id="diasINSQuincena" class="form-control" step="0.5" min="0" 
                                    value="${diasINSExistentes || 0}">
                                <div class="form-help">Días de incapacidad INS</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Horas Incapacidad INS</label>
                                <input type="number" id="horasINSQuincena" class="form-control" step="0.25" min="0" 
                                    value="${asistenciasExistentes.filter(a => a.tipoDia === CONFIG.TIPOS_DIA.INCAPACIDAD_INS).reduce((sum, a) => sum + (a.horasTrabajadas || 0), 0) || 0}">
                                <div class="form-help">Total de horas de incapacidad INS</div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Días Permiso sin Goce</label>
                                <input type="number" id="diasPermisoQuincena" class="form-control" step="0.5" min="0" 
                                    value="${diasPermisoExistentes || 0}">
                                <div class="form-help">Días de permiso sin goce de salario</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Días Feriados Trabajados</label>
                                <input type="number" id="diasFeriadosQuincena" class="form-control" step="0.5" min="0" 
                                    value="${diasFeriadosExistentes || 0}">
                                <div class="form-help">Días feriados trabajados (pago 2x)</div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Horas en Feriado</label>
                                <input type="number" id="horasFeriadosQuincena" class="form-control" step="0.25" min="0" 
                                    value="${horasFeriadosExistentes || 0}">
                                <div class="form-help">Total de horas trabajadas en días feriados</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Horas Extra Feriados</label>
                                <input type="number" id="horasExtraFeriadosQuincena" class="form-control" step="0.25" min="0" 
                                    value="${horasExtraFeriadosExistentes || 0}">
                                <div class="form-help">Horas extra trabajadas en días feriados (pago 3x del salario horario)</div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Observaciones</label>
                            <textarea id="observacionesQuincena" class="form-control" rows="3" placeholder="Observaciones adicionales..."></textarea>
                        </div>

                        <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                            <button type="button" onclick="AsistenciasModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;

        document.getElementById('formHorasQuincenales').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.guardarHorasQuincenales(fechaInicio, fechaFin, jornada);
        });

        document.getElementById('modalHorasQuincenales').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.cerrarModal();
            }
        });
    },

    /**
     * Guarda las horas quincenales
     */
    async guardarHorasQuincenales(fechaInicio, fechaFin, jornada) {
        try {
            const horasTrabajadas = parseFloat(document.getElementById('horasTrabajadasQuincena').value) || 0;
            const horasExtra = parseFloat(document.getElementById('horasExtraQuincena').value) || 0;
            const horasAdicionales = parseFloat(document.getElementById('horasAdicionalesQuincena').value) || 0;
            const diasCCSS = parseFloat(document.getElementById('diasCCSSQuincena').value) || 0;
            const horasCCSS = parseFloat(document.getElementById('horasCCSSQuincena').value) || 0;
            const diasINS = parseFloat(document.getElementById('diasINSQuincena').value) || 0;
            const horasINS = parseFloat(document.getElementById('horasINSQuincena').value) || 0;
            const diasPermiso = parseFloat(document.getElementById('diasPermisoQuincena').value) || 0;
            const diasFeriados = parseFloat(document.getElementById('diasFeriadosQuincena').value) || 0;
            const horasFeriados = parseFloat(document.getElementById('horasFeriadosQuincena').value) || 0;
            const horasExtraFeriados = parseFloat(document.getElementById('horasExtraFeriadosQuincena').value) || 0;
            const diasTrabajadosManual = document.getElementById('diasTrabajadosQuincena').value ? parseFloat(document.getElementById('diasTrabajadosQuincena').value) : null;
            const observaciones = document.getElementById('observacionesQuincena').value || '';

            if (horasTrabajadas < 0) {
                Utils.showToast('Las horas trabajadas no pueden ser negativas', 'warning');
                return;
            }

            // Días reales del período (febrero 2ª quincena = 13 o 14; resto 15 o 16)
            const diasEnQuincena = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            const diasEspeciales = diasCCSS + diasINS + diasPermiso + diasFeriados;
            if (diasEspeciales > diasEnQuincena) {
                Utils.showToast(`Los días especiales (${diasEspeciales}) no pueden exceder los días del período (${diasEnQuincena})`, 'warning');
                return;
            }

            Utils.showLoading('Guardando horas quincenales...');

            // Calcular horas para días normales (repartir sobre los días reales del período para que la suma coincida)
            const horasParaFeriados = horasFeriados > 0 ? horasFeriados : (diasFeriados * (jornada.horasPorDia || 7));
            const horasParaDiasNormales = horasTrabajadas - horasParaFeriados;
            const diasNormales = diasEnQuincena - diasCCSS - diasINS - diasPermiso - diasFeriados;
            const horasPorDiaNormal = diasNormales > 0 ? horasParaDiasNormales / diasNormales : 0;

            // Distribuir horas extra solo en días normales (excluyendo horas extra feriados)
            const horasExtraNormales = horasExtra - horasExtraFeriados;
            const horasExtraPorDia = (diasNormales > 0 && horasExtraNormales > 0) ? horasExtraNormales / diasNormales : 0;
            
            // Distribuir horas extra feriados entre los días feriados
            const horasExtraFeriadosPorDia = (diasFeriados > 0 && horasExtraFeriados > 0) ? horasExtraFeriados / diasFeriados : 0;

            // Distribuir horas adicionales solo en días normales
            const horasAdicionalesPorDia = (diasNormales > 0 && horasAdicionales > 0) ? horasAdicionales / diasNormales : 0;

            // Distribuir horas de incapacidad CCSS entre los días de incapacidad
            // Si no se especifican horas, usar el promedio basado en jornada
            const horasCCSSPorDia = (diasCCSS > 0 && horasCCSS > 0) ? horasCCSS / diasCCSS : (jornada.horasPorDia || 7);

            // Distribuir horas de incapacidad INS entre los días de incapacidad
            const horasINSPorDia = (diasINS > 0 && horasINS > 0) ? horasINS / diasINS : (jornada.horasPorDia || 7);

            // Crear asistencias para cada día de la quincena
            const fechaActual = new Date(fechaInicio);
            const asistenciasAGuardar = [];

            // Contadores para días especiales
            let contadorCCSS = 0;
            let contadorINS = 0;
            let contadorPermiso = 0;
            let contadorFeriados = 0;

            while (fechaActual <= fechaFin) {
                const fechaKey = Formatters.formatearFechaFirebase(fechaActual);
                let tipoDia = CONFIG.TIPOS_DIA.NORMAL;
                let horasDia = 0;
                let horasExtraDia = 0;
                let diasCCSSEmpresa = 0;
                let diasINSEmpresa = 0;

                // Asignar días especiales primero
                if (contadorCCSS < diasCCSS) {
                    tipoDia = CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS;
                    // Usar las horas específicas de incapacidad CCSS (pueden variar en jornadas acumulativas)
                    // Si se especificaron horas totales, distribuir proporcionalmente
                    // Si no, usar el promedio de la jornada
                    horasDia = horasCCSSPorDia;
                    diasCCSSEmpresa = 1;
                    contadorCCSS++;
                } else if (contadorINS < diasINS) {
                    tipoDia = CONFIG.TIPOS_DIA.INCAPACIDAD_INS;
                    // Usar las horas específicas de incapacidad INS
                    horasDia = horasINSPorDia;
                    diasINSEmpresa = 1;
                    contadorINS++;
                } else if (contadorPermiso < diasPermiso) {
                    tipoDia = CONFIG.TIPOS_DIA.PERMISO_SIN_GOCE;
                    horasDia = 0; // No cuenta como horas trabajadas
                    contadorPermiso++;
                } else if (contadorFeriados < diasFeriados) {
                    tipoDia = CONFIG.TIPOS_DIA.FERIADO_TRABAJADO;
                    // Usar las horas en feriado especificadas, distribuidas proporcionalmente
                    const horasFeriadosPorDia = (diasFeriados > 0 && horasParaFeriados > 0) ? horasParaFeriados / diasFeriados : (jornada.horasPorDia || 7);
                    horasDia = horasFeriadosPorDia; // Cuenta como horas trabajadas (con pago doble)
                    horasExtraDia = horasExtraFeriadosPorDia; // Horas extra en feriado
                    contadorFeriados++;
                } else {
                    // Día normal
                    tipoDia = CONFIG.TIPOS_DIA.NORMAL;
                    horasDia = horasPorDiaNormal;
                    horasExtraDia = horasExtraPorDia;
                }

                asistenciasAGuardar.push({
                    fechaKey,
                    tipoDia,
                    horasTrabajadas: horasDia,
                    horasExtra: horasExtraDia,
                    horasAdicionales: tipoDia === CONFIG.TIPOS_DIA.NORMAL ? horasAdicionalesPorDia : 0,
                    diasCCSSEmpresa,
                    diasINSEmpresa,
                    observaciones: observaciones ? `${observaciones} (Registro quincenal)` : ''
                });

                fechaActual.setDate(fechaActual.getDate() + 1);
            }

            // Eliminar asistencias existentes del período antes de guardar las nuevas
            const fechaInicioKey = Formatters.formatearFechaFirebase(fechaInicio);
            const fechaFinKey = Formatters.formatearFechaFirebase(fechaFin);
            const asistenciasExistentes = await FirebaseHelpers.getAsistenciasPeriodo(
                this.empleadoSeleccionado.id,
                fechaInicioKey,
                fechaFinKey
            );

            // Eliminar asistencias existentes
            for (const asist of asistenciasExistentes) {
                try {
                    await FirebaseHelpers.deleteAsistencia(this.empleadoSeleccionado.id, asist.fecha);
                } catch (error) {
                    console.error(`Error eliminando asistencia ${asist.fecha}:`, error);
                }
            }

            // Guardar todas las nuevas asistencias
            // Permitir fechas futuras para períodos quincenales completos
            let guardadas = 0;
            for (let i = 0; i < asistenciasAGuardar.length; i++) {
                const asistencia = asistenciasAGuardar[i];
                try {
                    // Guardar días trabajados manual solo en la primera asistencia del período
                    const datosAsistencia = {
                        tipoDia: asistencia.tipoDia,
                        horasTrabajadas: asistencia.horasTrabajadas,
                        horasExtra: asistencia.horasExtra,
                        horasAdicionales: asistencia.horasAdicionales || 0,
                        diasCCSSEmpresa: asistencia.diasCCSSEmpresa,
                        diasINSEmpresa: asistencia.diasINSEmpresa,
                        observaciones: asistencia.observaciones,
                        jornadaEmpleado: this.empleadoSeleccionado.jornada,
                        horasNormalesEsperadas: jornada.horasPorDia
                    };

                    // Agregar días trabajados manual solo en la primera asistencia
                    if (i === 0 && diasTrabajadosManual !== null && diasTrabajadosManual !== undefined) {
                        datosAsistencia.diasTrabajadosManual = diasTrabajadosManual;
                    }

                    await FirebaseHelpers.registrarAsistencia(
                        this.empleadoSeleccionado.id,
                        asistencia.fechaKey,
                        datosAsistencia,
                        true // Permitir fechas futuras para períodos quincenales
                    );
                    guardadas++;
                } catch (error) {
                    console.error(`Error guardando asistencia para ${asistencia.fechaKey}:`, error);
                    Utils.showToast(`Error guardando asistencia para ${asistencia.fechaKey}: ${error.message}`, 'error');
                }
            }

            Utils.showToast(`Horas quincenales registradas exitosamente (${guardadas} días)`, 'success');
            Utils.hideLoading();
            this.cerrarModal();
            this.render();

        } catch (error) {
            console.error('Error guardando horas quincenales:', error);
            Utils.showToast('Error al guardar: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Cierra el modal
     */
    cerrarModal() {
        const modal = document.getElementById('modalHorasQuincenales');
        if (modal) {
            modal.remove();
        }
    }
};
