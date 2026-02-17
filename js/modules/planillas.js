/**
 * Planillas Module - Sistema de Planillas Costa Rica
 * NÚCLEO DEL SISTEMA - Generación de planillas de nómina
 */

const PlanillasModule = {
    planillas: [],
    empleados: [],
    planillaActual: null,

    init() {
        // No cargar datos aquí - se cargarán cuando se renderice la vista
    },

    async cargarDatos() {
        this.empleados = await FirebaseHelpers.getEmpleados();
        FirebaseHelpers.listenPlanillas((planillas) => {
            this.planillas = planillas.sort((a, b) => b.fechaGeneracion - a.fechaGeneracion);
            this.render();
        });
    },

    render() {
        // Cargar datos si aún no se han cargado
        if (this.empleados.length === 0) {
            this.cargarDatos();
            return; // Esperar a que se carguen los datos
        }
        
        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Planillas de Nómina</h1>
                        <p class="text-sm text-gray-600 mt-1">Generación y gestión de planillas</p>
                    </div>
                    <button onclick="PlanillasModule.mostrarModalNueva()" class="btn btn-primary">
                        Generar Nueva Planilla
                    </button>
                </div>

                <!-- Estadísticas -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="stat-card">
                        <div class="stat-value">${this.planillas.length}</div>
                        <div class="stat-label">Total Planillas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.planillas.filter(p => p.estado === 'pendiente').length}</div>
                        <div class="stat-label">Pendientes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.planillas.filter(p => p.estado === 'aprobada').length}</div>
                        <div class="stat-label">Aprobadas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.planillas.filter(p => p.estado === 'pagada').length}</div>
                        <div class="stat-label">Pagadas</div>
                    </div>
                </div>

                <!-- Lista de Planillas -->
                <div class="card">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Planillas Generadas</h3>
                    <div class="space-y-4">
                        ${this.planillas.length > 0 ? this.renderListaPlanillas() : this.renderSinPlanillas()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Planillas']);
    },

    renderListaPlanillas() {
        return this.planillas.map(planilla => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center space-x-3 mb-2">
                            <h4 class="text-lg font-semibold text-gray-800">
                                Planilla ${(planilla.tipoPeriodo === 'quinzenal' ? 'quincenal' : planilla.tipoPeriodo).toUpperCase()}
                            </h4>
                            ${Formatters.formatearEstadoBadge(planilla.estado)}
                        </div>
                        <p class="text-sm text-gray-600">
                            Período: ${Formatters.formatearFecha(planilla.periodoInicio)} - ${Formatters.formatearFecha(planilla.periodoFin)}
                        </p>
                        <p class="text-sm text-gray-600">
                            Generada: ${Formatters.formatearFechaLarga(planilla.fechaGeneracion)}
                        </p>
                        <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">Empleados:</span>
                                <span class="font-semibold ml-1">${planilla.totales?.cantidadEmpleados || 0}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">Salarios Brutos:</span>
                                <span class="font-semibold ml-1 text-green-600">
                                    ${Formatters.formatearMoneda(planilla.totales?.totalSalariosBrutos || 0)}
                                </span>
                            </div>
                            <div>
                                <span class="text-gray-600">Total Deducciones:</span>
                                <span class="font-semibold ml-1 text-red-600">
                                    ${Formatters.formatearMoneda((planilla.totales?.totalDescuentosCCSS || 0) + (planilla.totales?.totalImpuestosRenta || 0))}
                                </span>
                            </div>
                            <div>
                                <span class="text-gray-600">Salarios Netos:</span>
                                <span class="font-semibold ml-1 text-blue-600">
                                    ${Formatters.formatearMoneda(planilla.totales?.totalSalariosNetos || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="PlanillasModule.verDetalle('${planilla.id}')" 
                            class="btn btn-outline btn-sm">Ver Detalle</button>
                        ${planilla.estado === 'generada' ? `
                            <button onclick="PlanillasModule.aprobar('${planilla.id}')" 
                                class="btn btn-secondary btn-sm">Aprobar</button>
                            <button onclick="PlanillasModule.eliminar('${planilla.id}')" 
                                class="btn btn-danger btn-sm" title="Eliminar planilla">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        ` : ''}
                        <button onclick="PDFGenerator.generarPlanillaPDF(${JSON.stringify(planilla).replace(/"/g, '&quot;')})" 
                            class="btn btn-outline btn-sm">PDF</button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderSinPlanillas() {
        return `
            <div class="text-center py-12">
                <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-700 mb-2">No hay planillas generadas</h3>
                <p class="text-sm text-gray-500">Genere su primera planilla de nómina</p>
            </div>
        `;
    },

    mostrarModalNueva() {
        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalPlanilla">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-2xl font-bold">Generar Nueva Planilla</h2>
                        <button onclick="PlanillasModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <form id="formPlanilla" class="p-6 space-y-4">
                        <div class="form-group">
                            <label class="form-label">Tipo de Período *</label>
                            <select id="tipoPeriodo" class="form-control" required>
                                <option value="quincenal">Quincenal (15 días)</option>
                                <option value="mensual">Mensual (1 mes completo)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mes y Año *</label>
                            <input type="month" id="mesAno" class="form-control" required>
                        </div>
                        <div id="selectorQuincena" class="form-group">
                            <label class="form-label">Quincena *</label>
                            <select id="quincena" class="form-control" required>
                                <option value="">Seleccione...</option>
                                <option value="primera">Primera quincena (1 al 15)</option>
                                <option value="segunda">Segunda quincena (16 al 30)</option>
                            </select>
                            <div class="form-help text-xs text-gray-500 mt-1">
                                La primera quincena va del día 1 al 15. La segunda quincena va del día 16 al 30.
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Fecha Inicio *</label>
                                <input type="date" id="fechaInicio" class="form-control" required readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Fecha Fin *</label>
                                <input type="date" id="fechaFin" class="form-control" required readonly>
                            </div>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                            <strong>Nota:</strong> Las fechas se calculan automáticamente:
                            <ul class="list-disc list-inside mt-1 space-y-1">
                                <li><strong>Primera quincena:</strong> Del día 1 al 15 del mes seleccionado</li>
                                <li><strong>Segunda quincena:</strong> Del día 16 al 30 del mes seleccionado</li>
                            </ul>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
                            <strong>Nota:</strong> Se generará la planilla para todos los empleados activos.
                            Los cálculos incluirán asistencias, bonos y rebajos aprobados del período seleccionado.
                        </div>
                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onclick="PlanillasModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Generar Planilla
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        this.setupModalGenerarListeners();
    },

    setupModalGenerarListeners() {
        const form = document.getElementById('formPlanilla');
        const tipoPeriodo = document.getElementById('tipoPeriodo');
        const selectorQuincena = document.getElementById('selectorQuincena');
        const mesAno = document.getElementById('mesAno');
        const quincena = document.getElementById('quincena');
        const fechaInicio = document.getElementById('fechaInicio');
        const fechaFin = document.getElementById('fechaFin');

        // Función para calcular fechas según tipo de período
        const calcularFechas = () => {
            const tipo = tipoPeriodo.value;

            if (tipo === 'quincenal') {
                if (!mesAno.value || !quincena.value) {
                    fechaInicio.value = '';
                    fechaFin.value = '';
                    return;
                }

                // Parsear mes y año
                const [ano, mes] = mesAno.value.split('-').map(Number);
                const mesIndex = mes - 1; // JavaScript usa meses 0-indexed

                if (quincena.value === 'primera') {
                    // Primera quincena: 1-15 (15 días)
                    fechaInicio.value = `${ano}-${String(mes).padStart(2, '0')}-01`;
                    fechaFin.value = `${ano}-${String(mes).padStart(2, '0')}-15`;
                } else if (quincena.value === 'segunda') {
                    // Segunda quincena: 16-30 (15 días)
                    // Siempre termina el día 30, independientemente de si el mes tiene 31 días
                    fechaInicio.value = `${ano}-${String(mes).padStart(2, '0')}-16`;
                    fechaFin.value = `${ano}-${String(mes).padStart(2, '0')}-30`;
                }
            } else {
                // Mensual: del 1 al último día del mes
                if (!mesAno.value) {
                    fechaInicio.value = '';
                    fechaFin.value = '';
                    return;
                }

                const [ano, mes] = mesAno.value.split('-').map(Number);
                const mesIndex = mes - 1;
                const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();

                fechaInicio.value = `${ano}-${String(mes).padStart(2, '0')}-01`;
                fechaFin.value = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
            }
        };

        // Configurar mes/año por defecto al mes actual
        const ahora = new Date();
        mesAno.value = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

        // Si es quincenal, seleccionar primera quincena por defecto
        if (tipoPeriodo.value === 'quincenal') {
            quincena.value = 'primera';
        }

        calcularFechas();

        // Event listeners
        tipoPeriodo.addEventListener('change', (e) => {
            const esQuincenal = e.target.value === 'quincenal';
            selectorQuincena.style.display = esQuincenal ? 'block' : 'none';
            calcularFechas();
        });

        mesAno.addEventListener('change', calcularFechas);
        quincena.addEventListener('change', calcularFechas);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.generarPlanilla();
        });
    },

    async generarPlanilla() {
        try {
            Utils.showLoading('Generando planilla...');

            const tipoPeriodo = document.getElementById('tipoPeriodo').value;
            const fechaInicioInput = document.getElementById('fechaInicio').value;
            const fechaFinInput = document.getElementById('fechaFin').value;

            // Asegurar que los empleados estén cargados
            if (!this.empleados || this.empleados.length === 0) {
                await this.cargarDatos();
            }

            // Obtener empleados activos que NO sean de tipo SP (Servicios Profesionales)
            // Los empleados SP se manejan en el módulo de Servicios Profesionales con pago por horas
            const empleadosActivos = this.empleados.filter(e =>
                e.estado === 'activo' &&
                e.tipoEmpleado !== 'SP'
            );

            if (empleadosActivos.length === 0) {
                Utils.showToast('No hay empleados activos', 'warning');
                Utils.hideLoading();
                return;
            }

            console.log(`Generando planilla para ${empleadosActivos.length} empleados activos`);
            console.log('IDs de empleados activos:', empleadosActivos.map(e => ({ id: e.id, nombre: e.nombre })));

            // Convertir fechas del input (YYYY-MM-DD) directamente a formato Firebase (YYYYMMDD)
            // Sin usar Date para evitar problemas de zona horaria
            const fechaInicioKey = fechaInicioInput.replace(/-/g, '');
            const fechaFinKey = fechaFinInput.replace(/-/g, '');

            // Crear objetos Date solo para guardar en la planilla (usando hora local)
            const [anoInicio, mesInicio, diaInicio] = fechaInicioInput.split('-').map(Number);
            const [anoFin, mesFin, diaFin] = fechaFinInput.split('-').map(Number);
            const fechaInicio = new Date(anoInicio, mesInicio - 1, diaInicio);
            const fechaFin = new Date(anoFin, mesFin - 1, diaFin);

            // Obtener bonos y rebajos aprobados
            const bonosRebajos = await FirebaseHelpers.once(CONFIG.DB_PATHS.BONOS_REBAJOS);
            const bonosRebajosArray = bonosRebajos ? Object.keys(bonosRebajos).map(k => ({ id: k, ...bonosRebajos[k] })) : [];

            // Convertir fechas de la planilla a timestamps para comparación
            const fechaInicioTimestamp = new Date(fechaInicio).getTime();
            const fechaFinTimestamp = new Date(fechaFin).getTime();

            // Filtrar bonos/rebajos aprobados cuya fecha de aplicación esté dentro del rango de la planilla
            const bonosRebajosAprobados = bonosRebajosArray.filter(br => {
                if (br.estado !== 'aprobado') return false;

                // Si tiene fechaAplicacion, verificar que esté en el rango
                if (br.fechaAplicacion) {
                    const fechaAplicacionTimestamp = typeof br.fechaAplicacion === 'number'
                        ? br.fechaAplicacion
                        : new Date(br.fechaAplicacion).getTime();
                    return fechaAplicacionTimestamp >= fechaInicioTimestamp &&
                        fechaAplicacionTimestamp <= fechaFinTimestamp;
                }

                // Si no tiene fechaAplicacion pero tiene periodoAplicacion (compatibilidad con datos antiguos)
                if (br.periodoAplicacion) {
                    return br.periodoAplicacion === tipoPeriodo;
                }

                return false;
            });

            // Procesar cada empleado
            const empleadosPlanilla = {};

            for (const empleado of empleadosActivos) {
                try {
                    console.log(`Procesando empleado: ${empleado.nombre} (${empleado.id})`);

                    // Obtener asistencias del período
                    const asistencias = await FirebaseHelpers.getAsistenciasPeriodo(
                        empleado.id,
                        fechaInicioKey,
                        fechaFinKey,
                        empleado.cedula // Pasar la cédula para búsqueda alternativa
                    );

                    console.log(`Asistencias encontradas para ${empleado.nombre}:`, asistencias.length);

                    // Verificar si hay un valor manual de días trabajados
                    let diasTrabajadosManual = null;
                    const asistenciaConDiasManual = asistencias.find(a => a.diasTrabajadosManual !== undefined && a.diasTrabajadosManual !== null);
                    if (asistenciaConDiasManual) {
                        diasTrabajadosManual = asistenciaConDiasManual.diasTrabajadosManual;
                        console.log(`Días trabajados manual encontrados para ${empleado.nombre}: ${diasTrabajadosManual}`);
                    }

                    // Calcular datos de asistencia
                    let diasTrabajados = 0;
                    let horasExtra = 0;
                    let horasExtraFeriado = 0; // Horas extras en feriado (3x)
                    let horasAdicionales = 0;
                    let diasFeriados = 0;
                    let diasCCSSEmpresa = 0;
                    let diasINSEmpresa = 0;
                    let diasPermiso = 0;

                    let diasLibresTrabajados = 0;
                    let horasDiasLibres = 0;

                    // Procesar todas las asistencias para calcular días especiales, horas extra, etc.
                    asistencias.forEach(asist => {
                        // Calcular días trabajados solo si no hay valor manual
                        if (diasTrabajadosManual === null || diasTrabajadosManual === undefined) {
                            switch (asist.tipoDia) {
                                case CONFIG.TIPOS_DIA.NORMAL:
                                    diasTrabajados++;
                                    break;
                                case CONFIG.TIPOS_DIA.DIA_LIBRE:
                                    // Los días libres también se cuentan para el cálculo (se pagan como día completo)
                                    diasTrabajados++;
                                    break;
                                case CONFIG.TIPOS_DIA.INCOMPLETO:
                                    diasTrabajados++; // Se ajusta en el cálculo
                                    break;
                            }
                        }

                        // Calcular días especiales (siempre se calculan)
                        switch (asist.tipoDia) {
                            case CONFIG.TIPOS_DIA.FERIADO_TRABAJADO:
                                diasFeriados++;
                                // Las horas extras en feriados se separan
                                if (asist.horasExtra && asist.horasExtra > 0) {
                                    horasExtraFeriado += asist.horasExtra;
                                }
                                break;
                            case CONFIG.TIPOS_DIA.DIA_LIBRE_TRABAJADO:
                                diasLibresTrabajados++;
                                horasDiasLibres += asist.horasTrabajadas || 0;
                                break;
                            case CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS:
                                // Si hay una asistencia de tipo INCAPACIDAD_CCSS, contar como 1 día
                                // a menos que diasCCSSEmpresa esté explícitamente definido
                                // IMPORTANTE: Solo contar si diasCCSSEmpresa > 0 o si no está definido (entonces usar 1)
                                let diasCCSS = 0;
                                if (asist.diasCCSSEmpresa !== undefined && asist.diasCCSSEmpresa !== null) {
                                    diasCCSS = asist.diasCCSSEmpresa > 0 ? asist.diasCCSSEmpresa : 0;
                                } else {
                                    diasCCSS = 1; // Si no está definido, asumir 1 día
                                }

                                if (diasCCSS > 0) {
                                    console.log(`Incapacidad CCSS encontrada para ${empleado.nombre} en fecha ${asist.fecha}: diasCCSSEmpresa=${asist.diasCCSSEmpresa}, usando ${diasCCSS}`);
                                    diasCCSSEmpresa += diasCCSS;
                                } else {
                                    console.warn(`Incapacidad CCSS encontrada para ${empleado.nombre} en fecha ${asist.fecha} pero diasCCSSEmpresa es 0, no se contará`);
                                }
                                break;
                            case CONFIG.TIPOS_DIA.INCAPACIDAD_INS:
                                diasINSEmpresa += asist.diasINSEmpresa || 0;
                                break;
                            case CONFIG.TIPOS_DIA.PERMISO_SIN_GOCE:
                                diasPermiso++;
                                break;
                        }

                        // Calcular horas extra y adicionales (siempre se calculan)
                        // Solo sumar horas extras si NO es un feriado (las de feriado ya se sumaron arriba)
                        if (asist.tipoDia !== CONFIG.TIPOS_DIA.FERIADO_TRABAJADO) {
                            horasExtra += asist.horasExtra || 0;
                        }
                        const horasAdicionalesDia = asist.horasAdicionales || 0;
                        horasAdicionales += horasAdicionalesDia;
                        if (horasAdicionalesDia > 0) {
                            console.log(`Horas adicionales encontradas para ${empleado.nombre} en fecha ${asist.fecha}: ${horasAdicionalesDia}`);
                        }
                    });

                    // Si hay días trabajados manual, usarlo en lugar del cálculo automático
                    if (diasTrabajadosManual !== null && diasTrabajadosManual !== undefined) {
                        diasTrabajados = diasTrabajadosManual;
                        console.log(`Usando días trabajados manual para ${empleado.nombre}: ${diasTrabajados}`);
                    }

                    console.log(`Total horas adicionales para ${empleado.nombre}: ${horasAdicionales}`);

                    // Calcular bonos y rebajos del empleado
                    const bonosEmpleado = bonosRebajosAprobados
                        .filter(br => br.empleadoId === empleado.id && br.tipo === 'bono')
                        .reduce((sum, br) => sum + br.monto, 0);

                    const rebajosEmpleado = bonosRebajosAprobados
                        .filter(br => br.empleadoId === empleado.id && br.tipo === 'rebajo')
                        .reduce((sum, br) => sum + br.monto, 0);

                    // Calcular salarios usando el módulo Calculations
                    const datosCalculos = {
                        salarioMensual: Math.round(empleado.salarioMensual),
                        salarioHorario: empleado.salarioHorario || null, // Salario horario directo si está disponible
                        codigoJornada: empleado.jornada,
                        diasTrabajados,
                        horasExtra,
                        horasExtraFeriado, // Horas extras en feriado (3x)
                        diasFeriados,
                        diasLibresTrabajados,
                        horasDiasLibres,
                        diasCCSSEmpresa,
                        diasINSEmpresa,
                        diasPermiso,
                        bonos: bonosEmpleado,
                        rebajos: rebajosEmpleado,
                        asistencias,
                        cantidadHijos: empleado.hijos || 0,
                        tieneConyuge: empleado.estadoCivil === 'casado',
                        impuestoRentaManual: null, // Se puede editar después
                        tipoPeriodo: tipoPeriodo // Pasar el tipo de período para aplicar impuesto de renta solo en mensuales
                    };

                    console.log(`Calculando salario para ${empleado.nombre}...`);
                    const resultadoCalculo = Calculations.calcularSalarioNeto(datosCalculos);
                    console.log(`Resultado del cálculo para ${empleado.nombre}:`, resultadoCalculo);

                    const jornada = CONFIG.getJornadaByCodigo(empleado.jornada);
                    const salarioMensualRedondeado = Math.round(empleado.salarioMensual);
                    const salarioDiario = Calculations.calcularSalarioDiario(salarioMensualRedondeado, empleado.jornada);

                    // Guardar datos del empleado en la planilla
                    console.log(`Guardando datos de ${empleado.nombre} en la planilla...`);
                    empleadosPlanilla[empleado.id] = {
                        nombreEmpleado: empleado.nombre,
                        cedula: empleado.cedula,
                        cargo: empleado.cargo,
                        departamento: empleado.departamento,
                        jornada: empleado.jornada,
                        horasNormalesMes: jornada.horasPorMes,
                        horasNormalesQuincena: jornada.horasPorQuincena,
                        horasDiaJornada: jornada.horasPorDia,
                        salarioBaseMensual: salarioMensualRedondeado,
                        salarioDiario,
                        diasTrabajados,
                        horasExtra,
                        pagoHorasExtra: Calculations.calcularHorasExtra(salarioMensualRedondeado, empleado.jornada, horasExtra),
                        horasExtraFeriado, // Horas extras en feriado (separadas)
                        pagoHorasExtraFeriado: Calculations.calcularHorasExtraFeriado(salarioMensualRedondeado, empleado.jornada, horasExtraFeriado),
                        horasAdicionales,
                        pagoHorasAdicionales: Calculations.calcularHorasAdicionales(salarioMensualRedondeado, empleado.jornada, horasAdicionales),
                        diasFeriadosTrabajados: diasFeriados,
                        horasFeriado: (() => {
                            // Calcular horas en feriado desde asistencias (usando jornada específica del empleado)
                            const asistenciasFeriados = asistencias.filter(a => a.tipoDia === CONFIG.TIPOS_DIA.FERIADO_TRABAJADO);
                            if (asistenciasFeriados.length > 0) {
                                return asistenciasFeriados.reduce((total, a) => {
                                    return total + (a.horasTrabajadas || jornada.horasPorDia);
                                }, 0);
                            }
                            // Si no hay asistencias, usar días * horas de la jornada
                            return diasFeriados * jornada.horasPorDia;
                        })(),
                        pagoFeriados: Calculations.calcularFeriadosTrabajados(
                            salarioMensualRedondeado,
                            empleado.jornada,
                            diasFeriados,
                            asistencias.filter(a => a.tipoDia === CONFIG.TIPOS_DIA.FERIADO_TRABAJADO)
                        ),
                        diasLibresTrabajados,
                        horasDiasLibres,
                        pagoDiasLibres: Calculations.calcularDiaLibreTrabajado(
                            salarioMensualRedondeado,
                            empleado.jornada,
                            horasDiasLibres
                        ),
                        diasCCSSEmpresa,
                        pagoCCSSEmpresa: Calculations.calcularIncapacidadCCSS(salarioMensualRedondeado, empleado.jornada, diasCCSSEmpresa),
                        diasINSEmpresa,
                        // pagoINSEmpresa: Solo informativo para comprobante (el INS se encarga según la póliza de Riesgos del Trabajo)
                        // Usar el pagoINS del resultado del cálculo que está basado en horas reales
                        pagoINSEmpresa: resultadoCalculo.pagoINS || Calculations.calcularIncapacidadINS(salarioMensualRedondeado, empleado.jornada, diasINSEmpresa),
                        diasPermisoSinGoce: diasPermiso,
                        descuentoPermisos: Calculations.calcularDescuentoPermiso(salarioMensualRedondeado, empleado.jornada, diasPermiso),
                        bonos: bonosEmpleado,
                        rebajos: rebajosEmpleado,
                        sumaAjustes: bonosEmpleado - rebajosEmpleado,
                        salarioBruto: resultadoCalculo.salarioBruto,
                        subtotalQuincenal: resultadoCalculo.subtotalQuincenal || (salarioDiario * diasTrabajados), // Usar el calculado o calcular si no está
                        rebajosPorHoras: resultadoCalculo.rebajosPorHoras || { total: 0, horasFaltantes: 0, detalles: [] },
                        descuentoCCSS: resultadoCalculo.descuentoCCSS,
                        impuestoRenta: resultadoCalculo.impuestoRenta,
                        creditosRenta: resultadoCalculo.creditosRenta,
                        otrosDescuentos: resultadoCalculo.otrosDescuentos,
                        salarioNeto: resultadoCalculo.salarioNeto,
                        metodoPago: 'transferencia',
                        banco: empleado.banco || '',
                        estado: 'generada',
                        observaciones: ''
                    };
                } catch (error) {
                    console.error(`Error procesando empleado ${empleado.nombre} (${empleado.id}):`, error);
                    console.error('Detalles del error:', error.stack);
                    // Continuar con el siguiente empleado aunque este falle
                    // Pero mostrar un mensaje al usuario
                    Utils.showToast(`Error procesando ${empleado.nombre}: ${error.message}`, 'warning');
                    continue;
                }
            }

            // Verificar si se procesaron empleados
            const empleadosProcesados = Object.keys(empleadosPlanilla).length;
            console.log(`Empleados procesados exitosamente: ${empleadosProcesados} de ${empleadosActivos.length}`);

            if (empleadosProcesados === 0) {
                Utils.hideLoading();
                Utils.showToast('No se pudo procesar ningún empleado. Revise la consola para más detalles.', 'error');
                return;
            }

            // Calcular totales
            const totales = Calculations.calcularTotalesPlanilla(Object.values(empleadosPlanilla));

            // Crear planilla
            const planilla = {
                periodoInicio: fechaInicio.getTime(),
                periodoFin: fechaFin.getTime(),
                tipoPeriodo,
                mesAño: `${fechaInicio.getFullYear()}${String(fechaInicio.getMonth() + 1).padStart(2, '0')}`,
                empleados: empleadosPlanilla,
                totales,
                estado: CONFIG.ESTADOS_PLANILLA.GENERADA,
                observaciones: '',
                fechaGeneracion: firebase.database.ServerValue.TIMESTAMP,
                generadaPor: FirebaseHelpers.currentUser?.uid || 'system'
            };

            // Guardar en Firebase
            await FirebaseHelpers.createPlanilla(planilla);

            Utils.showToast('Planilla generada exitosamente', 'success');
            Utils.hideLoading();
            this.cerrarModal();

        } catch (error) {
            console.error('Error generando planilla:', error);
            Utils.showToast('Error al generar planilla: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    async verDetalle(planillaId) {
        const planilla = this.planillas.find(p => p.id === planillaId);
        if (!planilla) return;

        const empleadosArray = Object.keys(planilla.empleados || {}).map(key => ({
            id: key,
            ...planilla.empleados[key]
        }));

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop overflow-y-auto" id="modalDetallePlanilla">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-7xl m-4 my-8">
                    <div class="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                        <div>
                            <h2 class="text-2xl font-bold">Detalle de Planilla ${(planilla.tipoPeriodo === 'quinzenal' ? 'quincenal' : planilla.tipoPeriodo).toUpperCase()}</h2>
                            <p class="text-sm text-gray-600">${Formatters.formatearFecha(planilla.periodoInicio)} - ${Formatters.formatearFecha(planilla.periodoFin)}</p>
                        </div>
                        <button onclick="PlanillasModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>

                    <div class="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                        <!-- Resumen -->
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div class="bg-blue-50 rounded-lg p-4">
                                <div class="text-2xl font-bold text-blue-700">${planilla.totales?.cantidadEmpleados || 0}</div>
                                <div class="text-sm text-blue-600">Empleados</div>
                            </div>
                            <div class="bg-green-50 rounded-lg p-4">
                                <div class="text-lg font-bold text-green-700">${Formatters.formatearMoneda(planilla.totales?.totalSalariosBrutos || 0)}</div>
                                <div class="text-sm text-green-600">Salarios Brutos</div>
                            </div>
                            <div class="bg-yellow-50 rounded-lg p-4">
                                <div class="text-lg font-bold text-yellow-700">${Formatters.formatearMoneda(planilla.totales?.totalDescuentosCCSS || 0)}</div>
                                <div class="text-sm text-yellow-600">CCSS Total</div>
                            </div>
                            <div class="bg-red-50 rounded-lg p-4">
                                <div class="text-lg font-bold text-red-700">${Formatters.formatearMoneda(planilla.totales?.totalImpuestosRenta || 0)}</div>
                                <div class="text-sm text-red-600">Impuesto Renta</div>
                            </div>
                            <div class="bg-purple-50 rounded-lg p-4">
                                <div class="text-lg font-bold text-purple-700">${Formatters.formatearMoneda(planilla.totales?.totalSalariosNetos || 0)}</div>
                                <div class="text-sm text-purple-600">Salarios Netos</div>
                            </div>
                        </div>

                        <!-- Tabla de Empleados -->
                        <div class="table-container">
                            <table class="data-table text-xs">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Jornada</th>
                                        <th>Días</th>
                                        <th>H.Extra</th>
                                        <th>Sal.Bruto</th>
                                        <th>CCSS</th>
                                        <th>Renta</th>
                                        <th>Sal.Neto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${empleadosArray.map((emp, idx) => {
            const empleadoCompleto = this.empleados.find(e => e.id === emp.id || e.cedula === emp.cedula);
            return `
                                        <tr>
                                            <td>
                                                <div class="font-medium">${emp.nombreEmpleado}</div>
                                                <div class="text-gray-500">${Formatters.formatearCedula(emp.cedula)}</div>
                                                <div class="mt-2 flex space-x-2">
                                                    <button onclick="PlanillasModule.generarComprobante('${emp.id || empleadoCompleto?.id || idx}', '${planilla.id}')" 
                                                        class="btn btn-sm btn-secondary text-xs" title="Descargar comprobante PDF">
                                                        📄 PDF
                                                    </button>
                                                    ${empleadoCompleto?.correo ? `
                                                        <button onclick="PlanillasModule.enviarComprobante('${emp.id || empleadoCompleto?.id || idx}', '${planilla.id}')" 
                                                            class="btn btn-sm btn-primary text-xs" title="Enviar comprobante por correo">
                                                            ✉️ Email
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                            <td>${Formatters.formatearJornada(emp.jornada)}</td>
                                            <td>${emp.diasTrabajados}</td>
                                            <td>${emp.horasExtra || 0}</td>
                                            <td class="font-semibold text-green-600">${Formatters.formatearMoneda(emp.salarioBruto)}</td>
                                            <td class="text-red-600">${Formatters.formatearMoneda(emp.descuentoCCSS)}</td>
                                            <td class="text-red-600">
                                                <input type="number" 
                                                    id="impuestoRenta_${emp.id || idx}" 
                                                    class="form-control text-xs w-24 text-right" 
                                                    value="${emp.impuestoRenta || 0}" 
                                                    step="0.01" 
                                                    min="0"
                                                    onchange="PlanillasModule.actualizarImpuestoRenta('${planilla.id}', '${emp.id || idx}', this.value)"
                                                    style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">
                                            </td>
                                            <td class="font-bold text-blue-600" id="salarioNeto_${emp.id || idx}">${Formatters.formatearMoneda(emp.salarioNeto)}</td>
                                        </tr>
                                    `;
        }).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Botones -->
                        <div class="flex justify-between pt-4 border-t">
                            <div>
                                ${planilla.estado === 'generada' ? `
                                    <button onclick="PlanillasModule.actualizarPlanilla('${planilla.id}')" 
                                        class="btn btn-outline btn-sm" title="Recalcular planilla con las horas actuales del registro de asistencias">
                                        🔄 Actualizar
                                    </button>
                                    <button onclick="PlanillasModule.aprobar('${planilla.id}')" 
                                        class="btn btn-secondary ml-2">
                                        Aprobar Planilla
                                    </button>
                                ` : ''}
                                <button onclick="PlanillasModule.enviarComprobantesMasivos('${planilla.id}')" 
                                    class="btn btn-primary ml-2" title="Enviar comprobantes por correo a todos los empleados">
                                    📧 Enviar Correos Masivos
                                </button>
                            </div>
                            <div class="flex space-x-4">
                                <button onclick="PDFGenerator.generarPlanillaPDF(${JSON.stringify(planilla).replace(/"/g, '&quot;')})" 
                                    class="btn btn-secondary">Descargar PDF</button>
                                <button onclick="PlanillasModule.cerrarModal()" class="btn btn-outline">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
    },

    async aprobar(planillaId) {
        if (!confirm('¿Aprobar esta planilla? Una vez aprobada no se podrá modificar.')) return;

        try {
            Utils.showLoading('Aprobando planilla...');
            await FirebaseHelpers.aprobarPlanilla(planillaId);
            Utils.showToast('Planilla aprobada exitosamente', 'success');
            Utils.hideLoading();
            this.cerrarModal();
        } catch (error) {
            console.error('Error aprobando planilla:', error);
            Utils.showToast('Error al aprobar planilla', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Genera comprobante de pago para un empleado
     */
    async generarComprobante(empleadoId, planillaId) {
        try {
            const planilla = this.planillas.find(p => p.id === planillaId);
            if (!planilla) {
                Utils.showToast('Planilla no encontrada', 'error');
                return;
            }

            // Buscar empleado completo
            const empleado = this.empleados.find(e => e.id === empleadoId);
            if (!empleado) {
                // Intentar buscar por índice si no se encuentra por ID
                const empleadosArray = Object.keys(planilla.empleados || {}).map(key => ({
                    id: key,
                    ...planilla.empleados[key]
                }));
                const datosPlanilla = empleadosArray[parseInt(empleadoId)] || empleadosArray.find(emp => emp.cedula);
                if (datosPlanilla) {
                    empleado = this.empleados.find(e => e.cedula === datosPlanilla.cedula);
                }
            }

            if (!empleado) {
                Utils.showToast('Empleado no encontrado', 'error');
                return;
            }

            // Obtener datos del empleado en la planilla
            const empleadosArray = Object.keys(planilla.empleados || {}).map(key => ({
                id: key,
                ...planilla.empleados[key]
            }));
            const datosPlanilla = empleadosArray.find(emp => emp.id === empleadoId || emp.cedula === empleado.cedula) ||
                empleadosArray[parseInt(empleadoId)] ||
                Object.values(planilla.empleados || {})[0];

            if (!datosPlanilla) {
                Utils.showToast('No se encontraron datos del empleado en esta planilla', 'error');
                return;
            }

            Utils.showLoading('Generando comprobante...');

            // Preparar datos para el comprobante
            const fechaInicio = new Date(planilla.periodoInicio);
            const fechaFin = new Date(planilla.periodoFin);
            const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
            const fechaFinStr = fechaFin.toISOString().split('T')[0];

            // Calcular subtotal quincenal si no está en datosPlanilla
            const subtotalQuincenal = datosPlanilla.subtotalQuincenal ||
                ((datosPlanilla.salarioDiario || 0) * (datosPlanilla.diasTrabajados || 0));

            // Usar rebajos por horas de datosPlanilla si está disponible
            const rebajosPorHoras = datosPlanilla.rebajosPorHoras || { total: 0, horasFaltantes: 0, detalles: [] };

            const calculos = {
                salarioBaseMensual: datosPlanilla.salarioBaseMensual || Math.round(empleado.salarioMensual),
                salarioDiario: datosPlanilla.salarioDiario || Calculations.calcularSalarioDiario(Math.round(empleado.salarioMensual), empleado.jornada),
                diasTrabajados: datosPlanilla.diasTrabajados || 0,
                salarioBase: datosPlanilla.salarioBruto || 0,
                subtotalQuincenal: subtotalQuincenal,
                horasExtra: datosPlanilla.horasExtra || 0,
                montoHorasExtra: datosPlanilla.pagoHorasExtra || 0,
                horasAdicionales: datosPlanilla.horasAdicionales || 0,
                pagoHorasAdicionales: datosPlanilla.pagoHorasAdicionales || 0,
                diasFeriadosTrabajados: datosPlanilla.diasFeriadosTrabajados || 0,
                horasFeriado: datosPlanilla.horasFeriado || 0,
                pagoFeriados: datosPlanilla.pagoFeriados || 0,
                horasExtraFeriado: datosPlanilla.horasExtraFeriado || 0,
                totalExtraFeriado: datosPlanilla.pagoHorasExtraFeriado || 0,
                pagoHorasExtraFeriado: datosPlanilla.pagoHorasExtraFeriado || 0,
                salarioBruto: datosPlanilla.salarioBruto || 0,
                descuentoCCSS: datosPlanilla.descuentoCCSS || 0,
                impuestoRenta: datosPlanilla.impuestoRenta || 0,
                otrosDescuentos: datosPlanilla.otrosDescuentos || datosPlanilla.rebajos || 0,
                rebajos: datosPlanilla.rebajos || 0,
                rebajosPorHoras: rebajosPorHoras,
                salarioNeto: datosPlanilla.salarioNeto || 0,
                observaciones: datosPlanilla.observaciones || 'Sin observaciones especiales'
            };

            // Formatear período como "IQ Mes" o "IIQ Mes"
            let periodoFormateado = '';
            if (planilla.tipoPeriodo === 'quincenal') {
                const diaInicio = fechaInicio.getDate();
                const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                const primeraLetraMayuscula = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

                if (diaInicio >= 1 && diaInicio <= 15) {
                    periodoFormateado = `IQ ${primeraLetraMayuscula}`;
                } else {
                    periodoFormateado = `IIQ ${primeraLetraMayuscula}`;
                }
            } else {
                const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                periodoFormateado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
            }

            const planillaInfo = {
                periodo: periodoFormateado,
                fechaInicio: fechaInicioStr,
                fechaFin: fechaFinStr
            };

            // Obtener asistencias del período para observaciones
            const asistencias = await FirebaseHelpers.getAsistenciasPeriodo(
                empleado.id,
                fechaInicioStr.replace(/-/g, ''),
                fechaFinStr.replace(/-/g, '')
            );

            // Generar PDF
            const pdf = await ComprobanteGenerator.generarComprobantePDF(
                empleado,
                calculos,
                planillaInfo,
                fechaInicioStr,
                fechaFinStr,
                false,
                asistencias
            );

            // Descargar
            const nombreMes = fechaFin.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
            ComprobanteGenerator.descargarComprobante(pdf, empleado.nombre, nombreMes);

            Utils.hideLoading();
            Utils.showToast('Comprobante generado exitosamente', 'success');

        } catch (error) {
            console.error('Error generando comprobante:', error);
            Utils.showToast('Error al generar comprobante: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Envía comprobante de pago por correo
     */
    async enviarComprobante(empleadoId, planillaId) {
        try {
            const planilla = this.planillas.find(p => p.id === planillaId);
            if (!planilla) {
                Utils.showToast('Planilla no encontrada', 'error');
                return;
            }

            // Buscar empleado completo
            const empleado = this.empleados.find(e => e.id === empleadoId);
            let empleadoEncontrado = empleado;

            if (!empleadoEncontrado) {
                const empleadosArray = Object.keys(planilla.empleados || {}).map(key => ({
                    id: key,
                    ...planilla.empleados[key]
                }));
                const datosPlanilla = empleadosArray[parseInt(empleadoId)] || empleadosArray.find(emp => emp.cedula);
                if (datosPlanilla) {
                    empleadoEncontrado = this.empleados.find(e => e.cedula === datosPlanilla.cedula);
                }
            }

            if (!empleadoEncontrado) {
                Utils.showToast('Empleado no encontrado', 'error');
                return;
            }

            // Recargar datos del empleado desde Firebase para obtener el correo más reciente
            try {
                const empleadoActualizado = await FirebaseHelpers.getEmpleado(empleadoEncontrado.id);
                if (empleadoActualizado && empleadoActualizado.correo) {
                    empleadoEncontrado.correo = empleadoActualizado.correo;
                }
            } catch (error) {
                console.warn('No se pudo recargar el empleado, usando datos en memoria:', error);
            }

            if (!empleadoEncontrado.correo || empleadoEncontrado.correo.trim() === '') {
                Utils.showToast('El empleado no tiene un correo electrónico registrado', 'error');
                return;
            }

            // Obtener datos del empleado en la planilla
            const empleadosArray = Object.keys(planilla.empleados || {}).map(key => ({
                id: key,
                ...planilla.empleados[key]
            }));
            const datosPlanilla = empleadosArray.find(emp => emp.id === empleadoId || emp.cedula === empleadoEncontrado.cedula) ||
                empleadosArray[parseInt(empleadoId)] ||
                Object.values(planilla.empleados || {})[0];

            if (!datosPlanilla) {
                Utils.showToast('No se encontraron datos del empleado en esta planilla', 'error');
                return;
            }

            Utils.showLoading('Enviando comprobante por correo...');

            // Verificar EmailJS
            if (typeof EmailServiceSimple === 'undefined') {
                Utils.showToast('EmailJS no está disponible. Asegúrese de que el servicio de email esté cargado.', 'error');
                Utils.hideLoading();
                return;
            }

            // Crear instancia del servicio
            const emailService = new EmailServiceSimple();

            // Verificar configuración
            if (!emailService.verificarConfiguracion()) {
                Utils.showToast('EmailJS no está configurado correctamente', 'error');
                Utils.hideLoading();
                return;
            }

            // Preparar datos
            const fechaInicio = new Date(planilla.periodoInicio);
            const fechaFin = new Date(planilla.periodoFin);
            const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
            const fechaFinStr = fechaFin.toISOString().split('T')[0];

            // Debug: Log para ver qué datos vienen de la planilla
            console.log('Datos del empleado en planilla:', datosPlanilla);
            console.log('Datos del empleado encontrado:', empleadoEncontrado);

            // Calcular salario base (salario bruto - extras - feriados)
            const salarioBase = (datosPlanilla.salarioBruto || 0) -
                (datosPlanilla.pagoHorasExtra || 0) -
                (datosPlanilla.pagoFeriados || 0);

            // Usar subtotal quincenal de datosPlanilla si está disponible, sino calcularlo
            const subtotalQuincenal = datosPlanilla.subtotalQuincenal ||
                ((datosPlanilla.salarioDiario || 0) * (datosPlanilla.diasTrabajados || 0));

            // Usar rebajos por horas de datosPlanilla si está disponible
            const rebajosPorHoras = datosPlanilla.rebajosPorHoras || { total: 0, horasFaltantes: 0, detalles: [] };

            const calculos = {
                salarioBaseMensual: datosPlanilla.salarioBaseMensual || Math.round(empleadoEncontrado.salarioMensual),
                salarioDiario: datosPlanilla.salarioDiario || Calculations.calcularSalarioDiario(Math.round(empleadoEncontrado.salarioMensual), empleadoEncontrado.jornada),
                diasTrabajados: datosPlanilla.diasTrabajados || 0,
                salarioBase: salarioBase > 0 ? salarioBase : subtotalQuincenal,
                subtotalQuincenal: subtotalQuincenal,
                horasExtra: datosPlanilla.horasExtra || 0,
                montoHorasExtra: datosPlanilla.pagoHorasExtra || 0,
                diasFeriadosTrabajados: datosPlanilla.diasFeriadosTrabajados || 0,
                horasFeriado: datosPlanilla.horasFeriado || 0,
                pagoFeriados: datosPlanilla.pagoFeriados || 0,
                horasExtraFeriado: datosPlanilla.horasExtraFeriado || 0,
                totalExtraFeriado: datosPlanilla.pagoHorasExtraFeriado || 0,
                pagoHorasExtraFeriado: datosPlanilla.pagoHorasExtraFeriado || 0,
                salarioBruto: datosPlanilla.salarioBruto || 0,
                descuentoCCSS: datosPlanilla.descuentoCCSS || 0,
                impuestoRenta: datosPlanilla.impuestoRenta || 0,
                otrosDescuentos: datosPlanilla.otrosDescuentos || datosPlanilla.rebajos || 0,
                rebajos: datosPlanilla.rebajos || 0,
                rebajosPorHoras: rebajosPorHoras,
                salarioNeto: datosPlanilla.salarioNeto || 0,
                observaciones: datosPlanilla.observaciones || 'Sin observaciones especiales'
            };

            // Formatear período como "IQ Mes" o "IIQ Mes"
            let periodoFormateado = '';
            if (planilla.tipoPeriodo === 'quincenal') {
                const diaInicio = fechaInicio.getDate();
                const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                const primeraLetraMayuscula = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

                if (diaInicio >= 1 && diaInicio <= 15) {
                    periodoFormateado = `IQ ${primeraLetraMayuscula}`;
                } else {
                    periodoFormateado = `IIQ ${primeraLetraMayuscula}`;
                }
            } else {
                const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                periodoFormateado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
            }

            const planillaInfo = {
                periodo: periodoFormateado,
                fechaInicio: fechaInicioStr,
                fechaFin: fechaFinStr
            };

            // Obtener asistencias del período para observaciones
            const asistencias = await FirebaseHelpers.getAsistenciasPeriodo(
                empleadoEncontrado.id,
                fechaInicioStr.replace(/-/g, ''),
                fechaFinStr.replace(/-/g, '')
            );

            // Generar PDF (para descarga local)
            const pdf = await ComprobanteGenerator.generarComprobantePDF(
                empleadoEncontrado,
                calculos,
                planillaInfo,
                fechaInicioStr,
                fechaFinStr,
                true,
                asistencias
            );

            // Asegurar que el correo esté disponible (usar correo o email)
            if (!empleadoEncontrado.correo && empleadoEncontrado.email) {
                empleadoEncontrado.correo = empleadoEncontrado.email;
            }
            
            // Log para debugging
            console.log('Enviando comprobante a:', {
                empleadoId: empleadoId,
                nombre: empleadoEncontrado.nombre,
                correo: empleadoEncontrado.correo,
                email: empleadoEncontrado.email,
                correoUsado: empleadoEncontrado.correo || empleadoEncontrado.email
            });
            
            // Enviar por correo (el HTML se genera dentro del servicio)
            const resultado = await emailService.enviarComprobante(
                empleadoEncontrado,
                calculos,
                planillaInfo,
                pdf,
                asistencias
            );

            Utils.hideLoading();

            if (resultado.success) {
                Utils.showToast(`Comprobante enviado exitosamente a ${empleadoEncontrado.correo}`, 'success');
            } else {
                Utils.showToast(`Error enviando comprobante: ${resultado.error}`, 'error');
            }

        } catch (error) {
            console.error('Error enviando comprobante:', error);
            Utils.showToast('Error al enviar comprobante: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Envía comprobantes por correo a todos los empleados de la planilla que tengan correo
     */
    async enviarComprobantesMasivos(planillaId) {
        try {
            const planilla = this.planillas.find(p => p.id === planillaId);
            if (!planilla) {
                Utils.showToast('Planilla no encontrada', 'error');
                return;
            }

            // Verificar EmailJS
            if (typeof EmailServiceSimple === 'undefined') {
                Utils.showToast('EmailJS no está disponible. Asegúrese de que el servicio de email esté cargado.', 'error');
                return;
            }

            // Crear instancia del servicio
            const emailService = new EmailServiceSimple();

            // Verificar configuración
            if (!emailService.verificarConfiguracion()) {
                Utils.showToast('EmailJS no está configurado correctamente', 'error');
                return;
            }

            // Obtener todos los empleados de la planilla
            const empleadosArray = Object.keys(planilla.empleados || {}).map(key => ({
                id: key,
                ...planilla.empleados[key]
            }));

            // Filtrar empleados que tienen correo
            const empleadosConCorreo = empleadosArray.filter(emp => {
                const empleadoCompleto = this.empleados.find(e => e.id === emp.id || e.cedula === emp.cedula);
                return empleadoCompleto && empleadoCompleto.correo && empleadoCompleto.correo.trim() !== '';
            });

            if (empleadosConCorreo.length === 0) {
                Utils.showToast('No hay empleados con correo electrónico registrado en esta planilla', 'warning');
                return;
            }

            // Confirmar acción
            const mensaje = `¿Desea enviar comprobantes por correo a ${empleadosConCorreo.length} empleado(s)?\n\n` +
                `Esta acción enviará un correo a cada empleado con su comprobante de pago.`;

            if (!confirm(mensaje)) {
                return;
            }

            Utils.showLoading(`Enviando correos (0/${empleadosConCorreo.length})...`);

            let exitosos = 0;
            let fallidos = 0;
            const errores = [];

            // Enviar correos uno por uno
            for (let i = 0; i < empleadosConCorreo.length; i++) {
                const emp = empleadosConCorreo[i];
                const empleadoCompleto = this.empleados.find(e => e.id === emp.id || e.cedula === emp.cedula);

                try {
                    Utils.showLoading(`Enviando correos (${i + 1}/${empleadosConCorreo.length}): ${empleadoCompleto.nombre}...`);

                    // Reutilizar la lógica de enviarComprobante pero sin mostrar toasts individuales
                    const datosPlanilla = emp;

                    // Preparar datos
                    const fechaInicio = new Date(planilla.periodoInicio);
                    const fechaFin = new Date(planilla.periodoFin);
                    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
                    const fechaFinStr = fechaFin.toISOString().split('T')[0];

                    // Calcular salario base
                    const salarioBase = (datosPlanilla.salarioBruto || 0) -
                        (datosPlanilla.pagoHorasExtra || 0) -
                        (datosPlanilla.pagoFeriados || 0);

                    const subtotalQuincenal = datosPlanilla.subtotalQuincenal ||
                        ((datosPlanilla.salarioDiario || 0) * (datosPlanilla.diasTrabajados || 0));

                    const rebajosPorHoras = datosPlanilla.rebajosPorHoras || { total: 0, horasFaltantes: 0, detalles: [] };

                    const calculos = {
                        salarioBaseMensual: datosPlanilla.salarioBaseMensual || Math.round(empleadoCompleto.salarioMensual),
                        salarioDiario: datosPlanilla.salarioDiario || Calculations.calcularSalarioDiario(Math.round(empleadoCompleto.salarioMensual), empleadoCompleto.jornada),
                        diasTrabajados: datosPlanilla.diasTrabajados || 0,
                        salarioBase: salarioBase > 0 ? salarioBase : subtotalQuincenal,
                        subtotalQuincenal: subtotalQuincenal,
                        horasExtra: datosPlanilla.horasExtra || 0,
                        montoHorasExtra: datosPlanilla.pagoHorasExtra || 0,
                        horasAdicionales: datosPlanilla.horasAdicionales || 0,
                        pagoHorasAdicionales: datosPlanilla.pagoHorasAdicionales || 0,
                        diasFeriadosTrabajados: datosPlanilla.diasFeriadosTrabajados || 0,
                        horasFeriado: datosPlanilla.horasFeriado || 0,
                        pagoFeriados: datosPlanilla.pagoFeriados || 0,
                        horasExtraFeriado: datosPlanilla.horasExtraFeriado || 0,
                        totalExtraFeriado: datosPlanilla.pagoHorasExtraFeriado || 0,
                        pagoHorasExtraFeriado: datosPlanilla.pagoHorasExtraFeriado || 0,
                        salarioBruto: datosPlanilla.salarioBruto || 0,
                        descuentoCCSS: datosPlanilla.descuentoCCSS || 0,
                        impuestoRenta: datosPlanilla.impuestoRenta || 0,
                        otrosDescuentos: datosPlanilla.otrosDescuentos || datosPlanilla.rebajos || 0,
                        rebajos: datosPlanilla.rebajos || 0,
                        rebajosPorHoras: rebajosPorHoras,
                        salarioNeto: datosPlanilla.salarioNeto || 0,
                        observaciones: datosPlanilla.observaciones || 'Sin observaciones especiales'
                    };

                    // Formatear período
                    let periodoFormateado = '';
                    if (planilla.tipoPeriodo === 'quincenal') {
                        const diaInicio = fechaInicio.getDate();
                        const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                        const primeraLetraMayuscula = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

                        if (diaInicio >= 1 && diaInicio <= 15) {
                            periodoFormateado = `IQ ${primeraLetraMayuscula}`;
                        } else {
                            periodoFormateado = `IIQ ${primeraLetraMayuscula}`;
                        }
                    } else {
                        const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                        periodoFormateado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
                    }

                    const planillaInfo = {
                        periodo: periodoFormateado,
                        fechaInicio: fechaInicioStr,
                        fechaFin: fechaFinStr
                    };

                    // Obtener asistencias del período
                    const asistencias = await FirebaseHelpers.getAsistenciasPeriodo(
                        empleadoCompleto.id,
                        fechaInicioStr.replace(/-/g, ''),
                        fechaFinStr.replace(/-/g, '')
                    );

                    // Generar PDF
                    const pdf = await ComprobanteGenerator.generarComprobantePDF(
                        empleadoCompleto,
                        calculos,
                        planillaInfo,
                        fechaInicioStr,
                        fechaFinStr,
                        true,
                        asistencias
                    );

                    // Enviar por correo
                    const resultado = await emailService.enviarComprobante(
                        empleadoCompleto,
                        calculos,
                        planillaInfo,
                        pdf,
                        asistencias
                    );

                    if (resultado.success) {
                        exitosos++;
                    } else {
                        fallidos++;
                        errores.push(`${empleadoCompleto.nombre}: ${resultado.error || 'Error desconocido'}`);
                    }

                    // Pequeña pausa entre envíos para evitar límites de rate
                    if (i < empleadosConCorreo.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                } catch (error) {
                    console.error(`Error enviando comprobante a ${empleadoCompleto?.nombre || 'empleado desconocido'}:`, error);
                    fallidos++;
                    errores.push(`${empleadoCompleto?.nombre || 'Empleado desconocido'}: ${error.message}`);
                }
            }

            Utils.hideLoading();

            // Mostrar resumen
            let mensajeResumen = `Envío masivo completado:\n\n` +
                `✓ Exitosos: ${exitosos}\n` +
                `✗ Fallidos: ${fallidos}`;

            if (errores.length > 0) {
                mensajeResumen += `\n\nErrores:\n${errores.slice(0, 5).join('\n')}`;
                if (errores.length > 5) {
                    mensajeResumen += `\n... y ${errores.length - 5} más`;
                }
            }

            if (exitosos > 0) {
                Utils.showToast(`Se enviaron ${exitosos} comprobante(s) exitosamente`, 'success');
            }

            if (fallidos > 0) {
                Utils.showToast(`Hubo ${fallidos} error(es) al enviar comprobantes. Revise la consola para más detalles.`, 'warning');
                console.log('Errores de envío masivo:', errores);
            }

            // Mostrar alerta con detalles si hay errores
            if (fallidos > 0) {
                alert(mensajeResumen);
            }

        } catch (error) {
            console.error('Error en envío masivo:', error);
            Utils.showToast('Error al enviar comprobantes masivos: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    async eliminar(planillaId) {
        const planilla = this.planillas.find(p => p.id === planillaId);
        if (!planilla) return;

        // Validar que solo se puedan eliminar planillas generadas
        if (planilla.estado !== 'generada') {
            Utils.showToast('Solo se pueden eliminar planillas en estado "Generada"', 'warning');
            return;
        }

        const mensaje = `¿Está seguro de eliminar esta planilla?\n\n` +
            `Período: ${Formatters.formatearFecha(planilla.periodoInicio)} - ${Formatters.formatearFecha(planilla.periodoFin)}\n` +
            `Tipo: ${(planilla.tipoPeriodo === 'quinzenal' ? 'quincenal' : planilla.tipoPeriodo).toUpperCase()}\n\n` +
            `Esta acción no se puede deshacer.`;

        if (!confirm(mensaje)) {
            return;
        }

        try {
            Utils.showLoading('Eliminando planilla...');
            await FirebaseHelpers.deletePlanilla(planillaId);
            Utils.showToast('Planilla eliminada exitosamente', 'success');
            Utils.hideLoading();
            this.cerrarModal();
        } catch (error) {
            console.error('Error eliminando planilla:', error);
            Utils.showToast('Error al eliminar planilla: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Actualiza/recalcula una planilla existente con las asistencias actuales
     */
    async actualizarPlanilla(planillaId) {
        const planilla = this.planillas.find(p => p.id === planillaId);
        if (!planilla) {
            Utils.showToast('Planilla no encontrada', 'error');
            return;
        }

        // Validar que solo se puedan actualizar planillas generadas
        if (planilla.estado !== 'generada') {
            Utils.showToast('Solo se pueden actualizar planillas en estado "Generada"', 'warning');
            return;
        }

        const mensaje = `¿Está seguro de actualizar esta planilla?\n\n` +
            `Período: ${Formatters.formatearFecha(planilla.periodoInicio)} - ${Formatters.formatearFecha(planilla.periodoFin)}\n\n` +
            `Se recalcularán todos los datos basándose en el registro de horas actual.`;

        if (!confirm(mensaje)) {
            return;
        }

        try {
            Utils.showLoading('Actualizando planilla...');

            // Obtener fechas de la planilla
            const fechaInicio = new Date(planilla.periodoInicio);
            const fechaFin = new Date(planilla.periodoFin);
            const tipoPeriodo = planilla.tipoPeriodo;

            // Convertir fechas a formato Firebase
            const fechaInicioInput = Formatters.formatearFechaInput(fechaInicio);
            const fechaFinInput = Formatters.formatearFechaInput(fechaFin);
            const fechaInicioKey = fechaInicioInput.replace(/-/g, '');
            const fechaFinKey = fechaFinInput.replace(/-/g, '');

            // Obtener empleados activos (los mismos que estaban en la planilla)
            const empleadosEnPlanilla = Object.keys(planilla.empleados || {});
            const empleadosActivos = this.empleados.filter(e => 
                empleadosEnPlanilla.includes(e.id) && e.estado === 'activo' && e.tipoEmpleado !== 'SP'
            );

            if (empleadosActivos.length === 0) {
                Utils.showToast('No hay empleados para actualizar', 'warning');
                Utils.hideLoading();
                return;
            }

            console.log(`Actualizando planilla para ${empleadosActivos.length} empleados`);

            // Obtener bonos y rebajos aprobados del período
            const bonosRebajos = await FirebaseHelpers.once(CONFIG.DB_PATHS.BONOS_REBAJOS);
            const bonosRebajosArray = bonosRebajos ? Object.keys(bonosRebajos).map(k => ({ id: k, ...bonosRebajos[k] })) : [];

            const fechaInicioTimestamp = new Date(fechaInicio).getTime();
            const fechaFinTimestamp = new Date(fechaFin).getTime();

            const bonosRebajosAprobados = bonosRebajosArray.filter(br => {
                if (br.estado !== 'aprobado') return false;

                if (br.fechaAplicacion) {
                    const fechaAplicacionTimestamp = typeof br.fechaAplicacion === 'number'
                        ? br.fechaAplicacion
                        : new Date(br.fechaAplicacion).getTime();
                    return fechaAplicacionTimestamp >= fechaInicioTimestamp &&
                        fechaAplicacionTimestamp <= fechaFinTimestamp;
                }

                if (br.periodoAplicacion) {
                    return br.periodoAplicacion === tipoPeriodo;
                }

                return false;
            });

            // Procesar cada empleado
            const empleadosPlanilla = {};

            for (const empleado of empleadosActivos) {
                try {
                    console.log(`Procesando empleado: ${empleado.nombre} (${empleado.id})`);

                    // Obtener asistencias del período
                    const asistencias = await FirebaseHelpers.getAsistenciasPeriodo(
                        empleado.id,
                        fechaInicioKey,
                        fechaFinKey,
                        empleado.cedula
                    );

                    console.log(`Asistencias encontradas para ${empleado.nombre}:`, asistencias.length);

                    // Verificar si hay un valor manual de días trabajados
                    let diasTrabajadosManual = null;
                    const asistenciaConDiasManual = asistencias.find(a => a.diasTrabajadosManual !== undefined && a.diasTrabajadosManual !== null);
                    if (asistenciaConDiasManual) {
                        diasTrabajadosManual = asistenciaConDiasManual.diasTrabajadosManual;
                        console.log(`Días trabajados manual encontrados para ${empleado.nombre}: ${diasTrabajadosManual}`);
                    }

                    // Calcular datos de asistencia
                    let diasTrabajados = 0;
                    let horasExtra = 0;
                    let horasExtraFeriado = 0;
                    let horasAdicionales = 0;
                    let diasFeriados = 0;
                    let diasCCSSEmpresa = 0;
                    let diasINSEmpresa = 0;
                    let diasPermiso = 0;
                    let diasLibresTrabajados = 0;
                    let horasDiasLibres = 0;

                    asistencias.forEach(asist => {
                        if (diasTrabajadosManual === null || diasTrabajadosManual === undefined) {
                            switch (asist.tipoDia) {
                                case CONFIG.TIPOS_DIA.NORMAL:
                                    diasTrabajados++;
                                    break;
                                case CONFIG.TIPOS_DIA.DIA_LIBRE:
                                    diasTrabajados++;
                                    break;
                                case CONFIG.TIPOS_DIA.INCOMPLETO:
                                    diasTrabajados++;
                                    break;
                            }
                        }

                        switch (asist.tipoDia) {
                            case CONFIG.TIPOS_DIA.FERIADO_TRABAJADO:
                                diasFeriados++;
                                if (asist.horasExtra && asist.horasExtra > 0) {
                                    horasExtraFeriado += asist.horasExtra;
                                }
                                break;
                            case CONFIG.TIPOS_DIA.DIA_LIBRE_TRABAJADO:
                                diasLibresTrabajados++;
                                horasDiasLibres += asist.horasTrabajadas || 0;
                                break;
                            case CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS:
                                let diasCCSS = 0;
                                if (asist.diasCCSSEmpresa !== undefined && asist.diasCCSSEmpresa !== null) {
                                    diasCCSS = asist.diasCCSSEmpresa > 0 ? asist.diasCCSSEmpresa : 0;
                                } else {
                                    diasCCSS = 1;
                                }
                                if (diasCCSS > 0) {
                                    diasCCSSEmpresa += diasCCSS;
                                }
                                break;
                            case CONFIG.TIPOS_DIA.INCAPACIDAD_INS:
                                diasINSEmpresa += asist.diasINSEmpresa || 0;
                                break;
                            case CONFIG.TIPOS_DIA.PERMISO_SIN_GOCE:
                                diasPermiso++;
                                break;
                        }

                        if (asist.tipoDia !== CONFIG.TIPOS_DIA.FERIADO_TRABAJADO) {
                            horasExtra += asist.horasExtra || 0;
                        }
                        const horasAdicionalesDia = asist.horasAdicionales || 0;
                        horasAdicionales += horasAdicionalesDia;
                    });

                    if (diasTrabajadosManual !== null && diasTrabajadosManual !== undefined) {
                        diasTrabajados = diasTrabajadosManual;
                        console.log(`Usando días trabajados manual para ${empleado.nombre}: ${diasTrabajados}`);
                    }

                    // Calcular bonos y rebajos del empleado
                    const bonosEmpleado = bonosRebajosAprobados
                        .filter(br => br.empleadoId === empleado.id && br.tipo === 'bono')
                        .reduce((sum, br) => sum + br.monto, 0);

                    const rebajosEmpleado = bonosRebajosAprobados
                        .filter(br => br.empleadoId === empleado.id && br.tipo === 'rebajo')
                        .reduce((sum, br) => sum + br.monto, 0);

                    // Calcular salarios usando el módulo Calculations
                    const salarioMensualRedondeado = Math.round(empleado.salarioMensual);
                    const datosCalculos = {
                        salarioMensual: salarioMensualRedondeado,
                        salarioHorario: empleado.salarioHorario || null,
                        codigoJornada: empleado.jornada,
                        diasTrabajados,
                        horasExtra,
                        horasExtraFeriado,
                        diasFeriados,
                        diasLibresTrabajados,
                        horasDiasLibres,
                        diasCCSSEmpresa,
                        diasINSEmpresa,
                        diasPermiso,
                        bonos: bonosEmpleado,
                        rebajos: rebajosEmpleado,
                        asistencias,
                        cantidadHijos: empleado.hijos || 0,
                        tieneConyuge: empleado.estadoCivil === 'casado',
                        impuestoRentaManual: null,
                        tipoPeriodo: tipoPeriodo
                    };

                    console.log(`Calculando salario para ${empleado.nombre}...`);
                    const resultadoCalculo = Calculations.calcularSalarioNeto(datosCalculos);
                    console.log(`Resultado del cálculo para ${empleado.nombre}:`, resultadoCalculo);

                    const jornada = CONFIG.getJornadaByCodigo(empleado.jornada);
                    const salarioDiario = Calculations.calcularSalarioDiario(salarioMensualRedondeado, empleado.jornada);

                    // Guardar datos del empleado en la planilla
                    empleadosPlanilla[empleado.id] = {
                        nombreEmpleado: empleado.nombre,
                        cedula: empleado.cedula,
                        cargo: empleado.cargo,
                        departamento: empleado.departamento,
                        jornada: empleado.jornada,
                        horasNormalesMes: jornada.horasPorMes,
                        horasNormalesQuincena: jornada.horasPorQuincena,
                        horasDiaJornada: jornada.horasPorDia,
                        salarioBaseMensual: salarioMensualRedondeado,
                        salarioDiario,
                        diasTrabajados,
                        horasExtra,
                        pagoHorasExtra: Calculations.calcularHorasExtra(salarioMensualRedondeado, empleado.jornada, horasExtra),
                        horasExtraFeriado,
                        pagoHorasExtraFeriado: Calculations.calcularHorasExtraFeriado(salarioMensualRedondeado, empleado.jornada, horasExtraFeriado),
                        horasAdicionales,
                        pagoHorasAdicionales: Calculations.calcularHorasAdicionales(salarioMensualRedondeado, empleado.jornada, horasAdicionales),
                        diasFeriadosTrabajados: diasFeriados,
                        horasFeriado: (() => {
                            const asistenciasFeriados = asistencias.filter(a => a.tipoDia === CONFIG.TIPOS_DIA.FERIADO_TRABAJADO);
                            if (asistenciasFeriados.length > 0) {
                                return asistenciasFeriados.reduce((total, a) => {
                                    return total + (a.horasTrabajadas || jornada.horasPorDia);
                                }, 0);
                            }
                            return diasFeriados * jornada.horasPorDia;
                        })(),
                        pagoFeriados: Calculations.calcularFeriadosTrabajados(
                            salarioMensualRedondeado,
                            empleado.jornada,
                            diasFeriados,
                            asistencias.filter(a => a.tipoDia === CONFIG.TIPOS_DIA.FERIADO_TRABAJADO)
                        ),
                        diasLibresTrabajados,
                        horasDiasLibres,
                        pagoDiasLibres: Calculations.calcularDiaLibreTrabajado(
                            salarioMensualRedondeado,
                            empleado.jornada,
                            horasDiasLibres
                        ),
                        diasCCSSEmpresa,
                        pagoCCSSEmpresa: Calculations.calcularIncapacidadCCSS(salarioMensualRedondeado, empleado.jornada, diasCCSSEmpresa),
                        diasINSEmpresa,
                        pagoINSEmpresa: resultadoCalculo.pagoINS || Calculations.calcularIncapacidadINS(salarioMensualRedondeado, empleado.jornada, diasINSEmpresa),
                        diasPermisoSinGoce: diasPermiso,
                        descuentoPermisos: Calculations.calcularDescuentoPermiso(salarioMensualRedondeado, empleado.jornada, diasPermiso),
                        bonos: bonosEmpleado,
                        rebajos: rebajosEmpleado,
                        sumaAjustes: bonosEmpleado - rebajosEmpleado,
                        salarioBruto: resultadoCalculo.salarioBruto,
                        subtotalQuincenal: resultadoCalculo.subtotalQuincenal || (salarioDiario * diasTrabajados),
                        rebajosPorHoras: resultadoCalculo.rebajosPorHoras || { total: 0, horasFaltantes: 0, detalles: [] },
                        descuentoCCSS: resultadoCalculo.descuentoCCSS,
                        impuestoRenta: resultadoCalculo.impuestoRenta,
                        creditosRenta: resultadoCalculo.creditosRenta,
                        otrosDescuentos: resultadoCalculo.otrosDescuentos,
                        salarioNeto: resultadoCalculo.salarioNeto,
                        metodoPago: 'transferencia',
                        banco: empleado.banco || '',
                        estado: 'generada',
                        observaciones: ''
                    };
                } catch (error) {
                    console.error(`Error procesando empleado ${empleado.nombre} (${empleado.id}):`, error);
                    Utils.showToast(`Error procesando ${empleado.nombre}: ${error.message}`, 'warning');
                    continue;
                }
            }

            // Calcular totales
            const totales = Calculations.calcularTotalesPlanilla(Object.values(empleadosPlanilla));

            // Actualizar planilla en Firebase
            await FirebaseHelpers.update(`${CONFIG.DB_PATHS.PLANILLAS}/${planillaId}`, {
                empleados: empleadosPlanilla,
                totales,
                fechaActualizacion: firebase.database.ServerValue.TIMESTAMP,
                actualizadaPor: FirebaseHelpers.currentUser?.uid || 'system'
            });

            Utils.showToast('Planilla actualizada exitosamente', 'success');
            Utils.hideLoading();
            this.cerrarModal();

        } catch (error) {
            console.error('Error actualizando planilla:', error);
            Utils.showToast('Error al actualizar planilla: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    cerrarModal() {
        document.getElementById('modalContainer').innerHTML = '';
    },

    /**
     * Actualiza el impuesto de renta de un empleado en la planilla
     */
    async actualizarImpuestoRenta(planillaId, empleadoId, nuevoImpuestoRenta) {
        try {
            const planilla = this.planillas.find(p => p.id === planillaId);
            if (!planilla) {
                Utils.showToast('Planilla no encontrada', 'error');
                return;
            }

            const empleado = planilla.empleados[empleadoId];
            if (!empleado) {
                Utils.showToast('Empleado no encontrado en la planilla', 'error');
                return;
            }

            // Convertir el valor a número
            const impuestoRenta = parseFloat(nuevoImpuestoRenta) || 0;

            // Recalcular el salario neto
            // Salario neto = salario después de CCSS + 50% incapacidad CCSS - impuesto de renta - otros descuentos
            const salarioDespuesCCSS = empleado.salarioBruto - empleado.descuentoCCSS;
            // El montoCCSSCCSS (50% que paga CCSS) se calcula en calcularSalarioBruto
            // Si hay días de incapacidad CCSS, calcular el monto
            let montoCCSSCCSS = 0;
            if (empleado.diasCCSSEmpresa > 0) {
                const jornada = CONFIG.getJornadaByCodigo(empleado.jornada);
                const salarioMensualRedondeado = Math.round(empleado.salarioBaseMensual || empleado.salarioMensual);
                const salarioDiario = Calculations.calcularSalarioDiario(salarioMensualRedondeado, empleado.jornada);
                const diasACubrir = Math.min(empleado.diasCCSSEmpresa, CONFIG.CCSS.DIAS_EMPRESA_MAX);
                // 50% de las horas de incapacidad CCSS (3 horas de 6 horas = 50%)
                const horasIncapacidadCCSS = jornada.horasPorDia * diasACubrir;
                const horasCCSSCCSS = horasIncapacidadCCSS * CONFIG.CCSS.PORCENTAJE_INCAPACIDAD_EMPRESA;
                const salarioHorario = salarioMensualRedondeado / jornada.horasPorMes;
                montoCCSSCCSS = horasCCSSCCSS * salarioHorario;
            }
            const salarioDespuesCCSSConIncapacidad = salarioDespuesCCSS + montoCCSSCCSS;
            const nuevoSalarioNeto = salarioDespuesCCSSConIncapacidad - impuestoRenta - (empleado.otrosDescuentos || 0);

            // Actualizar los valores en el objeto del empleado
            empleado.impuestoRenta = impuestoRenta;
            empleado.salarioNeto = Math.max(0, nuevoSalarioNeto);

            // Actualizar la visualización en la tabla
            const salarioNetoElement = document.getElementById(`salarioNeto_${empleadoId}`);
            if (salarioNetoElement) {
                salarioNetoElement.textContent = Formatters.formatearMoneda(empleado.salarioNeto);
            }

            // Guardar en Firebase
            const path = `${CONFIG.DB_PATHS.PLANILLAS}/${planillaId}/empleados/${empleadoId}`;
            await FirebaseHelpers.update(path, {
                impuestoRenta: impuestoRenta,
                salarioNeto: empleado.salarioNeto
            });

            // Recalcular totales de la planilla
            this.recalcularTotalesPlanilla(planillaId);

            Utils.showToast('Impuesto de renta actualizado', 'success');
        } catch (error) {
            console.error('Error actualizando impuesto de renta:', error);
            Utils.showToast('Error al actualizar impuesto de renta', 'error');
        }
    },

    /**
     * Recalcula los totales de la planilla después de actualizar el impuesto de renta
     */
    async recalcularTotalesPlanilla(planillaId) {
        try {
            const planilla = this.planillas.find(p => p.id === planillaId);
            if (!planilla) return;

            const empleadosArray = Object.values(planilla.empleados || {});

            const totales = {
                cantidadEmpleados: empleadosArray.length,
                totalSalariosBrutos: empleadosArray.reduce((sum, emp) => sum + (emp.salarioBruto || 0), 0),
                totalDescuentosCCSS: empleadosArray.reduce((sum, emp) => sum + (emp.descuentoCCSS || 0), 0),
                totalImpuestosRenta: empleadosArray.reduce((sum, emp) => sum + (emp.impuestoRenta || 0), 0),
                totalSalariosNetos: empleadosArray.reduce((sum, emp) => sum + (emp.salarioNeto || 0), 0)
            };

            // Actualizar en Firebase
            await FirebaseHelpers.update(`${CONFIG.DB_PATHS.PLANILLAS}/${planillaId}`, {
                totales: totales
            });

            // Actualizar en el objeto local
            planilla.totales = totales;

            // Actualizar la visualización si el modal está abierto
            const modal = document.getElementById('modalDetallePlanilla');
            if (modal) {
                // Recargar el detalle para mostrar los totales actualizados
                this.verDetalle(planillaId);
            }
        } catch (error) {
            console.error('Error recalculando totales:', error);
        }
    }
};

window.PlanillasModule = PlanillasModule;

