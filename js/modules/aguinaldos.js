/**
 * Aguinaldos Module - Sistema de Planillas Costa Rica
 */

const AguinaldosModule = {
    empleados: [],
    añoActual: new Date().getFullYear(),
    empleadoSeleccionado: '',
    aguinaldosData: {},
    aguinaldosResumen: {},
    periodosConfig: [],
    aguinaldosRef: null,

    init() {
        // No cargar datos aquí - se cargarán cuando se renderice la vista
        this.periodosConfig = this.getPeriodosConfig(this.añoActual);
    },

    async cargarDatos() {
        try {
            this.empleados = await FirebaseHelpers.getEmpleados();
            this.suscribirseAguinaldos(this.añoActual);
            this.render();
        } catch (error) {
            console.error('Error cargando datos de aguinaldos:', error);
            Utils.showToast('No se pudieron cargar los datos de aguinaldos', 'error');
        }
    },

    suscribirseAguinaldos(año) {
        if (this.aguinaldosRef) {
            this.aguinaldosRef.off();
        }

        this.aguinaldosRef = FirebaseHelpers.listenAguinaldosPorAño(año, (data) => {
            this.aguinaldosData = data || {};
            this.render();
        });
    },

    getPeriodosConfig(año) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const prevYear = año - 1;
        const config = [];
        let orden = 1;

        const addConfig = (id, label, start, end) => {
            config.push({ id, label, start, end, orden: orden++ });
        };

        // Período de aguinaldo: Diciembre del año anterior a Noviembre del año actual
        const mesesSecuencia = [
            { year: prevYear, month: 11 }, // Diciembre del año anterior
            { year: año, month: 0 },       // Enero
            { year: año, month: 1 },       // Febrero
            { year: año, month: 2 },       // Marzo
            { year: año, month: 3 },       // Abril
            { year: año, month: 4 },       // Mayo
            { year: año, month: 5 },       // Junio
            { year: año, month: 6 },       // Julio
            { year: año, month: 7 },       // Agosto
            { year: año, month: 8 },       // Septiembre
            { year: año, month: 9 },       // Octubre
            { year: año, month: 10 }       // Noviembre del año actual
        ];

        mesesSecuencia.forEach(({ year, month }) => {
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            addConfig(
                `${year}-${String(month + 1).padStart(2, '0')}`,
                `${meses[month]} ${year}`,
                start,
                end
            );
        });

        return config;
    },

    construirPeriodosEmpleado(empleadoId) {
        const dataEmpleado = this.aguinaldosData?.[empleadoId] || {};
        const periodosGuardados = dataEmpleado.periodos || {};

        return this.periodosConfig
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((periodo) => {
                const guardado = periodosGuardados[periodo.id] || {};

                let manual = guardado.manual !== undefined ? parseFloat(guardado.manual) : null;
                if (manual !== null && (isNaN(manual) || manual < 0)) {
                    manual = null;
                }

                let auto = guardado.auto !== undefined ? parseFloat(guardado.auto) : 0;
                if (isNaN(auto) || auto < 0) {
                    auto = 0;
                }

                const total = manual !== null ? manual : auto;

                return {
                    ...periodo,
                    manual,
                    auto,
                    total: isNaN(total) ? 0 : total,
                    actualizadoPor: guardado.actualizadoPor || null,
                    actualizadoEn: guardado.actualizadoEn || guardado.updatedAt || null
                };
            });
    },

    obtenerRenderEmpleado(empleado) {
        const periodos = this.construirPeriodosEmpleado(empleado.id);
        const totalBruto = periodos.reduce((sum, p) => sum + (p.total || 0), 0);
        const aguinaldo = totalBruto / 12;
        const periodosConMonto = periodos.filter(p => (p.total || 0) > 0).length;

        const filas = periodos.map(periodo => {
            const rango = `${Formatters.formatearFecha(periodo.start)} - ${Formatters.formatearFecha(periodo.end)}`;
            const actualizado = periodo.actualizadoEn ? Formatters.formatearFecha(periodo.actualizadoEn) : '-';
            const inputValor = periodo.manual !== null ? periodo.manual : '';

            return `
                <tr>
                    <td class="font-medium text-gray-800">${periodo.label}</td>
                    <td class="text-sm text-gray-500">${rango}</td>
                    <td>
                        <input type="number" min="0" step="0.01"
                            class="form-control text-right aguinaldo-manual-input"
                            data-empleado-id="${empleado.id}"
                            data-periodo-id="${periodo.id}"
                            placeholder="0.00"
                            value="${inputValor}">
                    </td>
                    <td class="text-green-600 font-medium">${Formatters.formatearMoneda(periodo.auto || 0)}</td>
                    <td class="font-semibold text-blue-700">${Formatters.formatearMoneda(periodo.total || 0)}</td>
                    <td class="text-xs text-gray-500">${actualizado}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <div class="card space-y-4">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-800">${empleado.nombre}</h4>
                        <p class="text-sm text-gray-500">${Formatters.formatearCedula(empleado.cedula)} · Ingreso: ${Formatters.formatearFecha(empleado.fechaIngreso)}</p>
                    </div>
                    <div class="text-right space-y-1">
                        <div class="text-sm text-gray-500">Salarios brutos acumulados</div>
                        <div class="text-xl font-bold text-blue-700">${Formatters.formatearMoneda(totalBruto)}</div>
                        <div class="text-sm text-gray-500">Aguinaldo proyectado</div>
                        <div class="text-lg font-semibold text-green-600">${Formatters.formatearMoneda(aguinaldo)}</div>
                        <div class="text-xs text-gray-400">Periodos con monto: ${periodosConMonto}/12</div>
                        <div class="mt-3 flex gap-2 justify-end">
                            <button onclick="AguinaldosModule.generarComprobante('${empleado.id}')" 
                                class="btn btn-sm btn-secondary text-xs" title="Descargar comprobante PDF">
                                📄 Comprobante
                            </button>
                            ${empleado.correo ? `
                                <button onclick="AguinaldosModule.enviarComprobante('${empleado.id}')" 
                                    class="btn btn-sm btn-primary text-xs" title="Enviar comprobante por correo">
                                    ✉️ Enviar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table text-sm">
                        <thead>
                            <tr>
                                <th>Periodo</th>
                                <th>Rango</th>
                                <th>Salario bruto (manual)</th>
                                <th>Salario planillas</th>
                                <th>Total aplicado</th>
                                <th>Actualizado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        return {
            empleadoId: empleado.id,
            resumen: {
                totalBruto,
                montoAguinaldo: aguinaldo,
                periodos,
                periodosConMonto
            },
            html
        };
    },

    render() {
        // Cargar datos si aún no se han cargado
        if (this.empleados.length === 0) {
            this.cargarDatos();
            return; // Esperar a que se carguen los datos
        }
        
        const container = document.getElementById('mainContent');
        if (!container) return;

        // Filtrar empleados activos que NO sean de tipo SP (Servicios Profesionales)
        // Los empleados SP se pagan por horas y no participan en aguinaldos
        const empleadosActivos = this.empleados.filter(e =>
            e.estado !== CONFIG.ESTADOS_EMPLEADO.INACTIVO &&
            e.tipoEmpleado !== 'SP'
        );
        const empleadosFiltrados = this.empleadoSeleccionado
            ? empleadosActivos.filter(e => e.id === this.empleadoSeleccionado)
            : empleadosActivos;

        const tarjetas = empleadosFiltrados.map(empleado => this.obtenerRenderEmpleado(empleado));

        this.aguinaldosResumen = {};
        // Solo incluir empleados de planilla regular (no SP) en el resumen
        empleadosActivos.forEach(empleado => {
            const item = this.obtenerRenderEmpleado(empleado);
            this.aguinaldosResumen[item.empleadoId] = item.resumen;
        });

        const totalSalarios = empleadosFiltrados.length > 0
            ? tarjetas.reduce((sum, item) => sum + item.resumen.totalBruto, 0)
            : empleadosActivos.reduce((sum, emp) => {
                const item = this.obtenerRenderEmpleado(emp);
                return sum + item.resumen.totalBruto;
            }, 0);

        const totalAguinaldo = empleadosFiltrados.length > 0
            ? tarjetas.reduce((sum, item) => sum + item.resumen.montoAguinaldo, 0)
            : empleadosActivos.reduce((sum, emp) => {
                const item = this.obtenerRenderEmpleado(emp);
                return sum + item.resumen.montoAguinaldo;
            }, 0);

        const cardsHtml = tarjetas.length > 0
            ? tarjetas.map(item => item.html).join('')
            : '<div class="text-center py-12 text-gray-500">No hay empleados activos registrados.</div>';

        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Aguinaldos</h1>
                        <p class="text-sm text-gray-600 mt-1">Gestione los salarios brutos del período de aguinaldo (Dic ${this.añoActual - 1} a Nov ${this.añoActual}).</p>
                    </div>
                    <div class="flex gap-4">
                        <select id="selectEmpleado" class="form-control">
                            <option value="">Todos los empleados</option>
                            ${empleadosActivos.map(e =>
            `<option value="${e.id}" ${this.empleadoSeleccionado === e.id ? 'selected' : ''}>${e.nombre}</option>`
        ).join('')}
                        </select>
                        <select id="selectAño" class="form-control">
                            ${[this.añoActual, this.añoActual - 1, this.añoActual - 2].map(año =>
            `<option value="${año}" ${año === this.añoActual ? 'selected' : ''}>${año}</option>`
        ).join('')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="stat-card">
                        <div class="stat-value">${empleadosFiltrados.length > 0 ? empleadosFiltrados.length : empleadosActivos.length}</div>
                        <div class="stat-label">${this.empleadoSeleccionado ? 'Empleado Seleccionado' : 'Empleados Activos'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Formatters.formatearMoneda(totalSalarios)}</div>
                        <div class="stat-label">Salarios Brutos Acumulados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Formatters.formatearMoneda(totalAguinaldo)}</div>
                        <div class="stat-label">Aguinaldo Proyectado</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.añoActual}</div>
                        <div class="stat-label">Año de Cálculo</div>
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                    <strong>Nota:</strong> El aguinaldo se calcula como la suma de salarios brutos del período dividido entre 12 (equivalente al 8.33%). Puede registrar manualmente valores por periodo o dejar que el sistema sume automáticamente los salarios provenientes de las planillas.
                </div>

                ${cardsHtml}

                <div class="flex justify-end gap-3">
                    <button onclick="AguinaldosModule.enviarComprobantesMasivos()" 
                        class="btn btn-primary" title="Enviar comprobantes por correo a todos los empleados">
                        📧 Enviar Comprobantes Masivos
                    </button>
                    <button onclick="AguinaldosModule.exportarPDF()" class="btn btn-secondary">Exportar Reporte PDF</button>
                </div>
            </div>
        `;

        container.innerHTML = html;
        Utils.updateBreadcrumb(['Aguinaldos']);
        this.setupEventListeners();
    },

    setupEventListeners() {
        const selectEmpleado = document.getElementById('selectEmpleado');
        if (selectEmpleado) {
            selectEmpleado.addEventListener('change', (e) => {
                this.empleadoSeleccionado = e.target.value || '';
                this.render();
            });
        }

        const selectAño = document.getElementById('selectAño');
        if (selectAño) {
            selectAño.addEventListener('change', (e) => {
                const nuevoAño = parseInt(e.target.value, 10);
                if (!isNaN(nuevoAño)) {
                    this.cambiarAño(nuevoAño);
                }
            });
        }

        document.querySelectorAll('.aguinaldo-manual-input').forEach(input => {
            input.addEventListener('change', (event) => {
                const { empleadoId, periodoId } = event.target.dataset;
                if (!empleadoId || !periodoId) return;
                this.actualizarMontoManual(empleadoId, periodoId, event.target.value);
            });
        });
    },

    async actualizarMontoManual(empleadoId, periodoId, rawValue) {
        const valorLimpio = rawValue === '' ? null : parseFloat(rawValue);

        if (valorLimpio !== null && (isNaN(valorLimpio) || valorLimpio < 0)) {
            Utils.showToast('Ingrese un monto válido (>= 0)', 'warning');
            return;
        }

        try {
            await FirebaseHelpers.updateAguinaldoPeriodo(this.añoActual, empleadoId, periodoId, {
                manual: valorLimpio === null ? null : valorLimpio
            });
            Utils.showToast('Monto actualizado correctamente', 'success');
        } catch (error) {
            console.error('Error actualizando aguinaldo manual:', error);
            Utils.showToast('No se pudo guardar el monto', 'error');
        }
    },

    cambiarAño(nuevoAño) {
        if (this.añoActual === nuevoAño) return;
        this.añoActual = nuevoAño;
        this.periodosConfig = this.getPeriodosConfig(this.añoActual);
        this.aguinaldosData = {};
        this.aguinaldosResumen = {};
        this.suscribirseAguinaldos(this.añoActual);
        // Mantener el empleado seleccionado si existe en la lista
        if (this.empleadoSeleccionado) {
            const empleadoExiste = this.empleados.some(e => e.id === this.empleadoSeleccionado && e.estado !== CONFIG.ESTADOS_EMPLEADO.INACTIVO);
            if (!empleadoExiste) {
                this.empleadoSeleccionado = '';
            }
        }
        this.render();
    },

    exportarPDF() {
        const datos = Object.entries(this.aguinaldosResumen).map(([empleadoId, resumen]) => {
            const empleado = this.empleados.find(e => e.id === empleadoId) || {};
            return {
                id: empleadoId,
                nombreEmpleado: empleado.nombre || 'Empleado',
                cedula: empleado.cedula || '',
                mesesTrabajados: resumen.periodosConMonto,
                sumaAnual: resumen.totalBruto,
                montoAguinaldo: resumen.montoAguinaldo
            };
        });

        PDFGenerator.generarReporteAguinaldo(datos, this.añoActual);
    },

    /**
     * Genera comprobante de aguinaldo para un empleado
     */
    async generarComprobante(empleadoId) {
        try {
            const empleado = this.empleados.find(e => e.id === empleadoId);
            if (!empleado) {
                Utils.showToast('Empleado no encontrado', 'error');
                return;
            }

            // Obtener resumen del empleado
            const resumen = this.aguinaldosResumen[empleadoId];
            if (!resumen) {
                Utils.showToast('No se encontraron datos de aguinaldo para este empleado', 'error');
                return;
            }

            Utils.showLoading('Generando comprobante...');

            // Preparar datos para el comprobante
            const datosAguinaldo = {
                periodos: resumen.periodos,
                totalBruto: resumen.totalBruto,
                montoAguinaldo: resumen.montoAguinaldo,
                periodosConMonto: resumen.periodosConMonto
            };

            // Generar PDF
            const pdf = await ComprobanteAguinaldoGenerator.generarComprobantePDF(
                empleado,
                datosAguinaldo,
                this.añoActual,
                false
            );

            // Descargar
            ComprobanteAguinaldoGenerator.descargarComprobante(pdf, empleado.nombre, this.añoActual);

            Utils.hideLoading();
            Utils.showToast('Comprobante generado exitosamente', 'success');

        } catch (error) {
            console.error('Error generando comprobante:', error);
            Utils.showToast('Error al generar comprobante: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Envía comprobante de aguinaldo por correo
     */
    async enviarComprobante(empleadoId) {
        try {
            const empleado = this.empleados.find(e => e.id === empleadoId);
            if (!empleado) {
                Utils.showToast('Empleado no encontrado', 'error');
                return;
            }

            if (!empleado.correo || empleado.correo.trim() === '') {
                Utils.showToast('El empleado no tiene un correo electrónico registrado', 'error');
                return;
            }

            // Obtener resumen del empleado
            const resumen = this.aguinaldosResumen[empleadoId];
            if (!resumen) {
                Utils.showToast('No se encontraron datos de aguinaldo para este empleado', 'error');
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

            // Preparar datos para el comprobante
            const datosAguinaldo = {
                periodos: resumen.periodos,
                totalBruto: resumen.totalBruto,
                montoAguinaldo: resumen.montoAguinaldo,
                periodosConMonto: resumen.periodosConMonto
            };

            // Generar PDF
            const pdf = await ComprobanteAguinaldoGenerator.generarComprobantePDF(
                empleado,
                datosAguinaldo,
                this.añoActual,
                true
            );

            // Enviar por correo
            const resultado = await emailService.enviarComprobanteAguinaldo(
                empleado,
                datosAguinaldo,
                this.añoActual,
                pdf
            );

            Utils.hideLoading();

            if (resultado.success) {
                Utils.showToast(`Comprobante enviado exitosamente a ${empleado.correo}`, 'success');
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
     * Envía comprobantes de aguinaldo por correo a todos los empleados que tengan correo
     */
    async enviarComprobantesMasivos() {
        try {
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

            // Filtrar empleados activos que NO sean SP y que tengan correo
            const empleadosActivos = this.empleados.filter(e =>
                e.estado !== CONFIG.ESTADOS_EMPLEADO.INACTIVO &&
                e.tipoEmpleado !== 'SP'
            );

            const empleadosConCorreo = empleadosActivos.filter(emp => 
                emp.correo && emp.correo.trim() !== '' && this.aguinaldosResumen[emp.id]
            );

            if (empleadosConCorreo.length === 0) {
                Utils.showToast('No hay empleados con correo electrónico registrado para enviar aguinaldos', 'warning');
                return;
            }

            // Confirmar acción
            const mensaje = `¿Desea enviar comprobantes de aguinaldo ${this.añoActual} por correo a ${empleadosConCorreo.length} empleado(s)?\n\n` +
                `Esta acción enviará un correo a cada empleado con su comprobante de aguinaldo.`;

            if (!confirm(mensaje)) {
                return;
            }

            Utils.showLoading(`Enviando correos (0/${empleadosConCorreo.length})...`);

            let exitosos = 0;
            let fallidos = 0;
            const errores = [];

            // Enviar correos uno por uno
            for (let i = 0; i < empleadosConCorreo.length; i++) {
                const empleado = empleadosConCorreo[i];
                const resumen = this.aguinaldosResumen[empleado.id];

                try {
                    Utils.showLoading(`Enviando correos (${i + 1}/${empleadosConCorreo.length}): ${empleado.nombre}...`);

                    // Preparar datos
                    const datosAguinaldo = {
                        periodos: resumen.periodos,
                        totalBruto: resumen.totalBruto,
                        montoAguinaldo: resumen.montoAguinaldo,
                        periodosConMonto: resumen.periodosConMonto
                    };

                    // Generar PDF
                    const pdf = await ComprobanteAguinaldoGenerator.generarComprobantePDF(
                        empleado,
                        datosAguinaldo,
                        this.añoActual,
                        true
                    );

                    // Enviar por correo
                    const resultado = await emailService.enviarComprobanteAguinaldo(
                        empleado,
                        datosAguinaldo,
                        this.añoActual,
                        pdf
                    );

                    if (resultado.success) {
                        exitosos++;
                    } else {
                        fallidos++;
                        errores.push(`${empleado.nombre}: ${resultado.error || 'Error desconocido'}`);
                    }

                    // Pequeña pausa entre envíos para evitar límites de rate
                    if (i < empleadosConCorreo.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                } catch (error) {
                    console.error(`Error enviando comprobante a ${empleado.nombre}:`, error);
                    fallidos++;
                    errores.push(`${empleado.nombre}: ${error.message}`);
                }
            }

            Utils.hideLoading();

            // Mostrar resumen
            let mensajeResumen = `Envío masivo de aguinaldos completado:\n\n` +
                `✓ Exitosos: ${exitosos}\n` +
                `✗ Fallidos: ${fallidos}`;

            if (errores.length > 0) {
                mensajeResumen += `\n\nErrores:\n${errores.slice(0, 5).join('\n')}`;
                if (errores.length > 5) {
                    mensajeResumen += `\n... y ${errores.length - 5} más`;
                }
            }

            if (exitosos > 0) {
                Utils.showToast(`Se enviaron ${exitosos} comprobante(s) de aguinaldo exitosamente`, 'success');
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
            console.error('Error en envío masivo de aguinaldos:', error);
            Utils.showToast('Error al enviar comprobantes masivos: ' + error.message, 'error');
            Utils.hideLoading();
        }
    }
};

window.AguinaldosModule = AguinaldosModule;





