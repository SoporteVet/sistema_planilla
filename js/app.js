// ============================================
// SISTEMA DE PLANILLAS COSTA RICA
// ============================================

// Clase principal del sistema
class SistemaPlanillas {
    constructor() {
        this.empleados = [];
        this.asistencias = [];
        this.bonos = [];
        this.feriados = [];
        this.historialPlanillas = [];
        this.ultimaPlanilla = null;
        this.config = {
            ccss: 10.67,
            incapacidadCCSS: 50,
            incapacidadINS: 0
        };
        this.init();
    }

    init() {
        this.cargarDatos();
        this.initEventListeners();
        this.actualizarFecha();
        this.cargarFeriadosDefecto();
    }

    // ============================================
    // GESTIÓN DE DATOS (localStorage)
    // ============================================

    cargarDatos() {
        const empleadosGuardados = localStorage.getItem('empleados');
        const asistenciasGuardadas = localStorage.getItem('asistencias');
        const bonosGuardados = localStorage.getItem('bonos');
        const feriadosGuardados = localStorage.getItem('feriados');
        const configGuardada = localStorage.getItem('config');
        const historialGuardado = localStorage.getItem('historialPlanillas');

        if (empleadosGuardados) {
            this.empleados = JSON.parse(empleadosGuardados);
        }
        if (asistenciasGuardadas) {
            this.asistencias = JSON.parse(asistenciasGuardadas);
        }
        if (bonosGuardados) {
            this.bonos = JSON.parse(bonosGuardados);
        }
        if (feriadosGuardados) {
            this.feriados = JSON.parse(feriadosGuardados);
        }
        if (configGuardada) {
            this.config = JSON.parse(configGuardada);
        }
        if (historialGuardado) {
            this.historialPlanillas = JSON.parse(historialGuardado);
        }
    }

    guardarDatos() {
        localStorage.setItem('empleados', JSON.stringify(this.empleados));
        localStorage.setItem('asistencias', JSON.stringify(this.asistencias));
        localStorage.setItem('bonos', JSON.stringify(this.bonos));
        localStorage.setItem('feriados', JSON.stringify(this.feriados));
        localStorage.setItem('config', JSON.stringify(this.config));
        localStorage.setItem('historialPlanillas', JSON.stringify(this.historialPlanillas));
    }

    // ============================================
    // GESTIÓN DE EMPLEADOS
    // ============================================

    agregarEmpleado(empleado) {
        empleado.id = Date.now().toString();
        this.empleados.push(empleado);
        this.guardarDatos();
        this.renderEmpleados();
        this.actualizarSelectsEmpleados();
    }

    editarEmpleado(id, datosActualizados) {
        const index = this.empleados.findIndex(e => e.id === id);
        if (index !== -1) {
            this.empleados[index] = { ...this.empleados[index], ...datosActualizados };
            this.guardarDatos();
            this.renderEmpleados();
        }
    }

    eliminarEmpleado(id) {
        if (confirm('¿Está seguro de eliminar este empleado? Se eliminarán también sus registros de asistencia y bonos.')) {
            this.empleados = this.empleados.filter(e => e.id !== id);
            this.asistencias = this.asistencias.filter(a => a.empleadoId !== id);
            this.bonos = this.bonos.filter(b => b.empleadoId !== id);
            this.guardarDatos();
            this.renderEmpleados();
            this.actualizarSelectsEmpleados();
        }
    }

    buscarEmpleado(termino) {
        return this.empleados.filter(e => 
            e.nombre.toLowerCase().includes(termino.toLowerCase()) ||
            e.cedula.includes(termino)
        );
    }

    aplicarFiltrosEmpleados() {
        const textoBusqueda = document.getElementById('searchEmpleado').value.toLowerCase();
        const empresaFiltro = document.getElementById('filtroEmpresa').value;
        
        let empleadosFiltrados = this.empleados;
        
        // Filtro por texto (nombre o cédula)
        if (textoBusqueda) {
            empleadosFiltrados = empleadosFiltrados.filter(emp => 
                emp.nombre.toLowerCase().includes(textoBusqueda) ||
                emp.cedula.includes(textoBusqueda)
            );
        }
        
        // Filtro por empresa
        if (empresaFiltro) {
            empleadosFiltrados = empleadosFiltrados.filter(emp => 
                emp.empresa === empresaFiltro
            );
        }
        
        this.renderEmpleados(empleadosFiltrados);
    }

    renderEmpleados(empleados = this.empleados) {
        const tbody = document.getElementById('tablaEmpleados');
        
        if (empleados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No hay empleados registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = empleados.map(emp => `
            <tr>
                <td>${emp.cedula}</td>
                <td>${emp.nombre}</td>
                <td>${emp.empresa || 'No asignada'}</td>
                <td>${emp.puesto}</td>
                <td><span class="badge badge-info">${this.formatJornada(emp.jornada)}</span></td>
                <td>₡${this.formatearMoneda(emp.salarioHora)}</td>
                <td>${this.formatearFecha(emp.fechaIngreso)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarEmpleado('${emp.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="sistema.eliminarEmpleado('${emp.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ============================================
    // GESTIÓN DE ASISTENCIAS
    // ============================================

    agregarAsistencia(asistencia) {
        asistencia.id = Date.now().toString();
        this.asistencias.push(asistencia);
        this.guardarDatos();
        this.renderAsistencias();
    }

    editarAsistencia(id, datosActualizados) {
        const index = this.asistencias.findIndex(a => a.id === id);
        if (index !== -1) {
            this.asistencias[index] = { ...this.asistencias[index], ...datosActualizados };
            this.guardarDatos();
            this.renderAsistencias();
        }
    }

    eliminarAsistencia(id) {
        const asistencia = this.asistencias.find(a => a.id === id);
        if (!asistencia) {
            console.error('Asistencia no encontrada para eliminar:', id);
            return;
        }

        const empleado = this.empleados.find(e => e.id === asistencia.empleadoId);
        const empleadoNombre = empleado ? empleado.nombre : 'Empleado desconocido';
        
        if (confirm(`¿Está seguro de que desea eliminar la asistencia de ${empleadoNombre} del ${asistencia.fecha}?`)) {
            this.asistencias = this.asistencias.filter(a => a.id !== id);
            this.guardarDatos();
            this.renderAsistencias();
        }
    }

    filtrarAsistencias(empleadoId, fechaInicio, fechaFin) {
        return this.asistencias.filter(a => {
            let cumple = true;
            if (empleadoId) cumple = cumple && a.empleadoId === empleadoId;
            if (fechaInicio) cumple = cumple && a.fecha >= fechaInicio;
            if (fechaFin) cumple = cumple && a.fecha <= fechaFin;
            return cumple;
        });
    }

    renderAsistencias(asistencias = this.asistencias) {
        const tbody = document.getElementById('tablaAsistencias');
        
        if (asistencias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>No hay registros de asistencia</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = asistencias.map(asist => {
            const empleado = this.empleados.find(e => e.id === asist.empleadoId);
            return `
                <tr>
                    <td>${this.formatearFecha(asist.fecha)}</td>
                    <td>${empleado ? empleado.nombre : 'N/A'}</td>
                    <td><span class="badge ${this.getBadgeClaseTipo(asist.tipo)}">${this.formatTipo(asist.tipo)}</span></td>
                    <td>${asist.horas || 0} hrs ${asist.horasExtra ? `+ ${asist.horasExtra} extra` : ''}</td>
                    <td>${asist.detalle || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarAsistencia('${asist.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="sistema.eliminarAsistencia('${asist.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================
    // GESTIÓN DE BONOS Y REBAJOS
    // ============================================

    agregarBono(bono) {
        bono.id = Date.now().toString();
        this.bonos.push(bono);
        this.guardarDatos();
        this.renderBonos();
    }

    editarBono(id, datosActualizados) {
        const index = this.bonos.findIndex(b => b.id === id);
        if (index !== -1) {
            this.bonos[index] = { ...this.bonos[index], ...datosActualizados };
            this.guardarDatos();
            this.renderBonos();
        }
    }

    eliminarBono(id) {
        if (confirm('¿Está seguro de eliminar este bono/rebajo?')) {
            this.bonos = this.bonos.filter(b => b.id !== id);
            this.guardarDatos();
            this.renderBonos();
        }
    }

    filtrarBonos(empleadoId, tipo) {
        return this.bonos.filter(b => {
            let cumple = true;
            if (empleadoId) cumple = cumple && b.empleadoId === empleadoId;
            if (tipo) cumple = cumple && b.tipo === tipo;
            return cumple;
        });
    }

    renderBonos(bonos = this.bonos) {
        const tbody = document.getElementById('tablaBonos');
        
        if (bonos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-gift"></i>
                        <p>No hay bonos o rebajos registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bonos.map(bono => {
            const empleado = this.empleados.find(e => e.id === bono.empleadoId);
            return `
                <tr>
                    <td>${empleado ? empleado.nombre : 'N/A'}</td>
                    <td><span class="badge ${bono.tipo === 'bono' ? 'badge-success' : 'badge-danger'}">${bono.tipo === 'bono' ? 'Bono' : 'Rebajo'}</span></td>
                    <td>${bono.concepto}</td>
                    <td>₡${this.formatearMoneda(bono.monto)}</td>
                    <td>${this.formatearFecha(bono.fecha)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarBono('${bono.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="sistema.eliminarBono('${bono.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================
    // CÁLCULO DE PLANILLAS
    // ============================================

    calcularPlanilla(periodo, fechaInicio, fechaFin, empresaFiltro = '') {
        const planilla = [];

        let empleadosAFiltrar = this.empleados;
        
        // Aplicar filtro por empresa si se especifica
        if (empresaFiltro) {
            empleadosAFiltrar = this.empleados.filter(emp => emp.empresa === empresaFiltro);
        }

        empleadosAFiltrar.forEach(empleado => {
            const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);
            planilla.push({
                empleado: empleado,
                ...calculos
            });
        });

        return planilla;
    }

    calcularSalarioEmpleado(empleado, fechaInicio, fechaFin) {
        // Determinar si es la segunda quincena (planilla del 30)
        const fechaFinObj = new Date(fechaFin + 'T00:00:00');
        const esSegundaQuincena = fechaFinObj.getDate() >= 15;
        
        // Obtener asistencias del empleado en el período
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleado.id &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin
        );

        // Calcular salario base según jornada
        let salarioBase = 0;
        let horasNormales = 0;
        let horasExtra = 0;
        let montoHorasExtra = 0;

        asistencias.forEach(asist => {
            if (asist.tipo === 'presente') {
                // Si no hay horas registradas o son 0, asumir jornada completa
                let horas = parseFloat(asist.horas || 0);
                if (horas === 0) {
                    horas = this.getHorasJornada(empleado.jornada);
                }
                
                const extra = parseFloat(asist.horasExtra || 0);

                // Calcular según jornada
                if (empleado.jornada === 'diurna') {
                    // Jornada diurna: 8 horas máximo
                    const horasRegulares = Math.min(horas, 8);
                    horasNormales += horasRegulares;
                    if (horas > 8) {
                        horasExtra += horas - 8;
                    }
                } else if (empleado.jornada === 'nocturna') {
                    // Jornada nocturna: 6 horas trabajadas = 8 horas pagadas
                    const horasTrabajadas = Math.min(horas, 6);
                    const horasAPagar = horasTrabajadas * (8/6);
                    horasNormales += horasAPagar;
                    if (horas > 6) {
                        horasExtra += (horas - 6) * (8/6);
                    }
                } else if (empleado.jornada === 'mixta') {
                    // Jornada mixta: 7 horas máximo
                    const horasRegulares = Math.min(horas, 7);
                    horasNormales += horasRegulares;
                    if (horas > 7) {
                        horasExtra += horas - 7;
                    }
                } else if (empleado.jornada === 'acumulativa') {
                    // Jornada acumulativa: Se pagan 8 horas por día trabajado
                    horasNormales += 8;
                }

                // Sumar horas extra registradas explícitamente
                horasExtra += extra;
            } else if (asist.tipo === 'incapacidad_ccss') {
                // CCSS paga el 50% del día
                const horasDia = this.getHorasJornada(empleado.jornada);
                horasNormales += horasDia * (this.config.incapacidadCCSS / 100);
            }
            // INS no paga (0%)
        });

        salarioBase = horasNormales * empleado.salarioHora;
        
        // Horas extra con recargo del 50% según ley costarricense
        montoHorasExtra = horasExtra * empleado.salarioHora * 1.5;

        // Obtener bonos y rebajos del período
        const bonosEmpleado = this.bonos.filter(b => 
            b.empleadoId === empleado.id &&
            b.fecha >= fechaInicio &&
            b.fecha <= fechaFin
        );

        const totalBonos = bonosEmpleado
            .filter(b => b.tipo === 'bono')
            .reduce((sum, b) => sum + parseFloat(b.monto), 0);

        const totalRebajos = bonosEmpleado
            .filter(b => b.tipo === 'rebajo')
            .reduce((sum, b) => sum + parseFloat(b.monto), 0);

        // Calcular salario bruto
        const salarioBruto = salarioBase + montoHorasExtra + totalBonos;

        // Calcular deducciones CCSS
        const ccss = salarioBruto * (this.config.ccss / 100);
        
        // Calcular impuesto de renta (solo en la segunda quincena)
        let impuestoRenta = 0;
        if (esSegundaQuincena) {
            // Calcular salario mensual estimado (quincenal x 2)
            const salarioMensualEstimado = salarioBruto * 2;
            // Calcular impuesto mensual
            const impuestoMensual = this.calcularImpuestoRenta(salarioMensualEstimado);
            // Aplicar solo la mitad del impuesto mensual en la segunda quincena
            impuestoRenta = impuestoMensual / 2;
        }

        // Calcular salario neto
        const salarioNeto = salarioBruto - ccss - impuestoRenta - totalRebajos;

        return {
            horasNormales: horasNormales.toFixed(2),
            horasExtra: horasExtra.toFixed(2),
            salarioBase: salarioBase.toFixed(2),
            montoHorasExtra: montoHorasExtra.toFixed(2),
            bonos: totalBonos.toFixed(2),
            rebajos: totalRebajos.toFixed(2),
            salarioBruto: salarioBruto.toFixed(2),
            ccss: ccss.toFixed(2),
            impuestoRenta: impuestoRenta.toFixed(2),
            salarioNeto: salarioNeto.toFixed(2)
        };
    }

    getHorasJornada(jornada) {
        switch(jornada) {
            case 'diurna': return 8;
            case 'nocturna': return 8; // Se pagan 8 aunque se trabajan 6
            case 'mixta': return 7;
            case 'acumulativa': return 8; // Se pagan 8 horas por día trabajado
            default: return 8;
        }
    }

    renderPlanilla(planilla) {
        const tbody = document.getElementById('tablaPlanilla');
        
        if (planilla.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <p>No hay datos para mostrar</p>
                    </td>
                </tr>
            `;
            document.getElementById('planillaSummary').style.display = 'none';
            document.getElementById('planillaActions').style.display = 'none';
            return;
        }

        tbody.innerHTML = planilla.map(item => `
            <tr>
                <td>${item.empleado.nombre}</td>
                <td>₡${this.formatearMoneda(item.salarioBase)}</td>
                <td>₡${this.formatearMoneda(item.montoHorasExtra)}</td>
                <td>₡${this.formatearMoneda(item.bonos)}</td>
                <td><strong>₡${this.formatearMoneda(item.salarioBruto)}</strong></td>
                <td>₡${this.formatearMoneda(item.ccss)}</td>
                <td>₡${this.formatearMoneda(item.rebajos)}</td>
                <td><strong>₡${this.formatearMoneda(item.salarioNeto)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="sistema.generarConstanciaSalarial('${item.empleado.id}')" title="Constancia Salarial">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="sistema.generarComprobantePago('${item.empleado.id}', '${document.getElementById('periodoPlanilla').value}', '${document.getElementById('fechaInicioPlanilla').value}', '${document.getElementById('fechaFinPlanilla').value}')" title="Comprobante de Pago">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Calcular totales
        const totalBruto = planilla.reduce((sum, item) => sum + parseFloat(item.salarioBruto), 0);
        const totalDeducciones = planilla.reduce((sum, item) => sum + parseFloat(item.ccss) + parseFloat(item.rebajos), 0);
        const totalNeto = planilla.reduce((sum, item) => sum + parseFloat(item.salarioNeto), 0);

        document.getElementById('totalBruto').textContent = `₡${this.formatearMoneda(totalBruto)}`;
        document.getElementById('totalDeducciones').textContent = `₡${this.formatearMoneda(totalDeducciones)}`;
        document.getElementById('totalNeto').textContent = `₡${this.formatearMoneda(totalNeto)}`;

        document.getElementById('planillaSummary').style.display = 'block';
        document.getElementById('planillaActions').style.display = 'flex';
        
        // Mostrar botón de guardar planilla
        const btnGuardar = document.getElementById('btnGuardarPlanilla');
        if (btnGuardar) {
            btnGuardar.style.display = 'inline-block';
        }

        this.ultimaPlanilla = planilla;
    }

    // ============================================
    // CÁLCULOS ESPECIALES
    // ============================================

    calcularVacaciones(empleadoId) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return 0;

        const fechaIngreso = new Date(empleado.fechaIngreso);
        const hoy = new Date();
        const meses = this.calcularMesesTrabajados(fechaIngreso, hoy);
        
        // 1 día de vacaciones por mes trabajado
        return meses;
    }

    calcularAguinaldo(empleadoId, fechaInicio, fechaFin) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return 0;

        const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);
        const aguinaldo = parseFloat(calculos.salarioBruto) / 12;
        
        return aguinaldo.toFixed(2);
    }

    calcularMesesTrabajados(fechaInicio, fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        // Calcular la diferencia de meses
        let meses = (fin.getFullYear() - inicio.getFullYear()) * 12;
        meses += fin.getMonth() - inicio.getMonth();
        
        // Si el día de la fecha final es menor al día de inicio,
        // significa que el mes actual aún no se ha completado
        if (fin.getDate() < inicio.getDate()) {
            meses -= 1;
        }
        
        return meses <= 0 ? 0 : meses;
    }

    // ============================================
    // HISTORIAL DE PLANILLAS
    // ============================================

    guardarPlanillaEnHistorial() {
        if (!this.ultimaPlanilla || this.ultimaPlanilla.length === 0) {
            alert('No hay una planilla calculada para guardar');
            return;
        }

        const periodo = document.getElementById('periodoPlanilla').value;
        const fechaInicio = document.getElementById('fechaInicioPlanilla').value;
        const fechaFin = document.getElementById('fechaFinPlanilla').value;

        // Guardar cada registro de la planilla en el historial
        this.ultimaPlanilla.forEach(item => {
            const registro = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                empleadoId: item.empleado.id,
                empleadoNombre: item.empleado.nombre,
                periodo: periodo,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                fechaGuardado: new Date().toISOString(),
                salarioBase: parseFloat(item.salarioBase),
                horasExtra: item.horasExtra || 0,
                montoHorasExtra: parseFloat(item.montoHorasExtra),
                bonos: parseFloat(item.bonos),
                rebajos: parseFloat(item.rebajos),
                salarioBruto: parseFloat(item.salarioBruto),
                ccss: parseFloat(item.ccss),
                salarioNeto: parseFloat(item.salarioNeto),
                aguinaldo: parseFloat(item.salarioBruto) / 12,
                vacaciones: this.calcularVacaciones(item.empleado.id)
            };
            this.historialPlanillas.push(registro);
        });

        this.guardarDatos();
        alert(`Planilla guardada exitosamente (${this.ultimaPlanilla.length} empleados)`);
    }

    renderHistorialPlanillas(empleadoId = '') {
        const container = document.getElementById('historialContainer');
        if (!container) return;

        let historial = this.historialPlanillas;
        
        // Filtrar por empleado si se especifica
        if (empleadoId) {
            historial = historial.filter(h => h.empleadoId === empleadoId);
        }

        if (historial.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No hay registros de planillas guardadas. Guarda una planilla desde la sección de Planillas.</p>
                </div>
            `;
            return;
        }

        // Ordenar por fecha más reciente
        historial.sort((a, b) => new Date(b.fechaGuardado) - new Date(a.fechaGuardado));

        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha Guardado</th>
                            <th>Empleado</th>
                            <th>Período</th>
                            <th>Fecha Inicio</th>
                            <th>Fecha Fin</th>
                            <th>Horas Extra</th>
                            <th>Salario Bruto</th>
                            <th>CCSS</th>
                            <th>Neto</th>
                            <th>Aguinaldo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historial.map(h => `
                            <tr>
                                <td>${new Date(h.fechaGuardado).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td>${h.empleadoNombre}</td>
                                <td><span class="badge badge-info">${h.periodo}</span></td>
                                <td>${h.fechaInicio}</td>
                                <td>${h.fechaFin}</td>
                                <td>${h.horasExtra}h</td>
                                <td>₡${this.formatearMoneda(h.salarioBruto)}</td>
                                <td>₡${this.formatearMoneda(h.ccss)}</td>
                                <td>₡${this.formatearMoneda(h.salarioNeto)}</td>
                                <td>₡${this.formatearMoneda(h.aguinaldo)}</td>
                                <td>
                                    <button class="btn btn-sm btn-danger" onclick="sistema.eliminarRegistroHistorial('${h.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    calcularAguinaldoDelHistorial(historial) {
        const currentYear = new Date().getFullYear();
        const periodStart = new Date(currentYear - 1, 11, 1); // 1 diciembre año anterior
        const periodEnd = new Date(currentYear, 10, 30); // 30 noviembre año actual

        // Filtrar registros dentro del período de aguinaldo
        const registrosRelevantes = historial.filter(h => {
            const fecha = new Date(h.fechaFin || h.fechaGuardado);
            return fecha >= periodStart && fecha <= periodEnd;
        });

        const totalBruto = registrosRelevantes.reduce((sum, h) => sum + h.salarioBruto, 0);
        const aguinaldo = totalBruto / 12;

        return {
            periodStart: periodStart.toLocaleDateString('es-CR'),
            periodEnd: periodEnd.toLocaleDateString('es-CR'),
            periodCount: registrosRelevantes.length,
            totalBruto: totalBruto,
            aguinaldo: aguinaldo
        };
    }

    eliminarRegistroHistorial(id) {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        
        this.historialPlanillas = this.historialPlanillas.filter(h => h.id !== id);
        this.guardarDatos();
        
        const filtroEmpleado = document.getElementById('filtroEmpleadoHistorial');
        this.renderHistorialPlanillas(filtroEmpleado ? filtroEmpleado.value : '');
    }

    // ============================================
    // GESTIÓN DE FERIADOS
    // ============================================

    cargarFeriadosDefecto() {
        if (this.feriados.length === 0) {
            const anioActual = new Date().getFullYear();
            this.feriados = [
                { id: '1', fecha: `${anioActual}-01-01`, descripcion: 'Año Nuevo', recargo: 50 },
                { id: '2', fecha: `${anioActual}-04-11`, descripcion: 'Día de Juan Santamaría', recargo: 50 },
                { id: '3', fecha: `${anioActual}-05-01`, descripcion: 'Día Internacional del Trabajo', recargo: 50 },
                { id: '4', fecha: `${anioActual}-07-25`, descripcion: 'Anexión del Partido de Nicoya', recargo: 50 },
                { id: '5', fecha: `${anioActual}-08-02`, descripcion: 'Día de la Virgen de los Ángeles', recargo: 50 },
                { id: '6', fecha: `${anioActual}-08-15`, descripcion: 'Día de la Madre', recargo: 50 },
                { id: '7', fecha: `${anioActual}-09-15`, descripcion: 'Día de la Independencia', recargo: 50 },
                { id: '8', fecha: `${anioActual}-12-25`, descripcion: 'Navidad', recargo: 50 }
            ];
            this.guardarDatos();
        }
    }

    agregarFeriado(feriado) {
        feriado.id = Date.now().toString();
        this.feriados.push(feriado);
        this.guardarDatos();
        this.renderFeriados();
    }

    editarFeriado(id, datosActualizados) {
        const index = this.feriados.findIndex(f => f.id === id);
        if (index !== -1) {
            this.feriados[index] = { ...this.feriados[index], ...datosActualizados };
            this.guardarDatos();
            this.renderFeriados();
        }
    }

    eliminarFeriado(id) {
        if (confirm('¿Está seguro de eliminar este feriado?')) {
            this.feriados = this.feriados.filter(f => f.id !== id);
            this.guardarDatos();
            this.renderFeriados();
        }
    }

    renderFeriados() {
        const tbody = document.getElementById('tablaFeriados');
        
        if (this.feriados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-calendar-alt"></i>
                        <p>No hay feriados registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.feriados.map(feriado => `
            <tr>
                <td>${this.formatearFecha(feriado.fecha)}</td>
                <td>${feriado.descripcion}</td>
                <td>${feriado.recargo}%</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarFeriado('${feriado.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="sistema.eliminarFeriado('${feriado.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ============================================
    // REPORTES
    // ============================================

    generarReporteVacaciones() {
        const reporte = this.empleados.map(emp => {
            const diasAcumulados = this.calcularVacaciones(emp.id);
            const diasUsados = this.asistencias.filter(a => 
                a.empleadoId === emp.id && a.tipo === 'vacaciones'
            ).length;
            const diasDisponibles = diasAcumulados - diasUsados;

            return {
                empleado: emp.nombre,
                fechaIngreso: this.formatearFecha(emp.fechaIngreso),
                mesesTrabajados: this.calcularMesesTrabajados(emp.fechaIngreso, new Date()),
                diasAcumulados,
                diasUsados,
                diasDisponibles
            };
        });

        this.mostrarReporteTabla(
            'Reporte de Vacaciones',
            ['Empleado', 'Fecha Ingreso', 'Meses Trabajados', 'Días Acumulados', 'Días Usados', 'Días Disponibles'],
            reporte.map(r => [r.empleado, r.fechaIngreso, r.mesesTrabajados, r.diasAcumulados, r.diasUsados, r.diasDisponibles])
        );
    }

    generarReporteAguinaldo() {
        const anioActual = new Date().getFullYear();
        
        // Ocultar las tarjetas de reportes
        const reportsGrid = document.querySelector('.reports-grid');
        const reporteDetalle = document.getElementById('reporteDetalle');
        
        if (reportsGrid) reportsGrid.style.display = 'none';
        
        // Calcular aguinaldo basado en el historial real de planillas
        const reporte = this.empleados.map(emp => {
            const historialEmpleado = this.historialPlanillas.filter(h => h.empleadoId === emp.id);
            const aguinaldoData = this.calcularAguinaldoDelHistorial(historialEmpleado);
            
            return {
                empleado: emp.nombre,
                cedula: emp.cedula,
                planillasProcesadas: aguinaldoData.periodCount,
                totalBruto: aguinaldoData.totalBruto,
                aguinaldo: aguinaldoData.aguinaldo
            };
        });

        // Crear tabla personalizada con más detalles
        const reporteTitulo = document.getElementById('reporteTitulo');
        const reporteTableHead = document.getElementById('reporteTableHead');
        const reporteTableBody = document.getElementById('reporteTableBody');

        reporteTitulo.textContent = `Reporte de Aguinaldo ${anioActual}`;
        
        reporteTableHead.innerHTML = `
            <tr>
                <th>Empleado</th>
                <th>Cédula</th>
                <th>Planillas Procesadas</th>
                <th>Total Bruto Acumulado</th>
                <th>Aguinaldo (Bruto/12)</th>
            </tr>
        `;
        
        reporteTableBody.innerHTML = reporte.map(r => `
            <tr>
                <td>${r.empleado}</td>
                <td>${r.cedula}</td>
                <td>${r.planillasProcesadas}</td>
                <td>₡${this.formatearMoneda(r.totalBruto)}</td>
                <td><strong>₡${this.formatearMoneda(r.aguinaldo)}</strong></td>
            </tr>
        `).join('');

        // Agregar resumen total
        const totalAguinaldo = reporte.reduce((sum, r) => sum + r.aguinaldo, 0);
        reporteTableBody.innerHTML += `
            <tr style="background: var(--gray-200); font-weight: bold;">
                <td colspan="4" style="text-align: right;">TOTAL A PAGAR:</td>
                <td>₡${this.formatearMoneda(totalAguinaldo)}</td>
            </tr>
        `;

        // Agregar nota sobre el período
        const periodStart = new Date(anioActual - 1, 11, 1).toLocaleDateString('es-CR');
        const periodEnd = new Date(anioActual, 10, 30).toLocaleDateString('es-CR');
        reporteTableBody.innerHTML += `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; background: var(--gray-100);">
                    <i class="fas fa-info-circle"></i> 
                    <strong>Período de cálculo:</strong> ${periodStart} al ${periodEnd}<br>
                    <small>Basado en las planillas guardadas en el sistema</small>
                </td>
            </tr>
        `;

        // Mostrar el reporte en la misma sección
        reporteDetalle.style.display = 'block';
    }

    generarReporteIncapacidades() {
        const incapacidades = this.asistencias.filter(a => 
            a.tipo === 'incapacidad_ccss' || a.tipo === 'incapacidad_ins'
        );

        const reporte = incapacidades.map(inc => {
            const empleado = this.empleados.find(e => e.id === inc.empleadoId);
            return {
                empleado: empleado ? empleado.nombre : 'N/A',
                fecha: this.formatearFecha(inc.fecha),
                tipo: inc.tipo === 'incapacidad_ccss' ? 'CCSS' : 'INS',
                detalle: inc.detalle || '-'
            };
        });

        this.mostrarReporteTabla(
            'Reporte de Incapacidades',
            ['Empleado', 'Fecha', 'Tipo', 'Detalle'],
            reporte.map(r => [r.empleado, r.fecha, r.tipo, r.detalle])
        );
    }

    mostrarReporteTabla(titulo, headers, data) {
        document.getElementById('reporteTitulo').textContent = titulo;
        
        const thead = document.getElementById('reporteTableHead');
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        
        const tbody = document.getElementById('reporteTableBody');
        tbody.innerHTML = data.map(row => 
            `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
        ).join('');

        document.getElementById('reporteDetalle').style.display = 'block';
        document.querySelector('.reports-grid').style.display = 'none';
    }

    cerrarReporte() {
        document.getElementById('reporteDetalle').style.display = 'none';
        document.querySelector('.reports-grid').style.display = 'grid';
    }

    // ============================================
    // EXPORTACIÓN
    // ============================================

    exportarExcel(planilla) {
        const data = planilla.map(item => ({
            'Empleado': item.empleado.nombre,
            'Cédula': item.empleado.cedula,
            'Salario Base': parseFloat(item.salarioBase),
            'Horas Extra': parseFloat(item.montoHorasExtra),
            'Bonos': parseFloat(item.bonos),
            'Salario Bruto': parseFloat(item.salarioBruto),
            'CCSS (10.67%)': parseFloat(item.ccss),
            'Rebajos': parseFloat(item.rebajos),
            'Salario Neto': parseFloat(item.salarioNeto)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Planilla");
        
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `planilla_${fecha}.xlsx`);
    }

    exportarPDF(planilla) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('Planilla de Salarios', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Fecha: ${this.formatearFecha(new Date().toISOString().split('T')[0])}`, 14, 30);

        const tableData = planilla.map(item => [
            item.empleado.nombre,
            `₡${this.formatearMoneda(item.salarioBase)}`,
            `₡${this.formatearMoneda(item.montoHorasExtra)}`,
            `₡${this.formatearMoneda(item.bonos)}`,
            `₡${this.formatearMoneda(item.salarioBruto)}`,
            `₡${this.formatearMoneda(item.ccss)}`,
            `₡${this.formatearMoneda(item.rebajos)}`,
            `₡${this.formatearMoneda(item.salarioNeto)}`
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Empleado', 'Salario Base', 'H. Extra', 'Bonos', 'S. Bruto', 'CCSS', 'Rebajos', 'S. Neto']],
            body: tableData,
            styles: { fontSize: 8 }
        });

        const fecha = new Date().toISOString().split('T')[0];
        doc.save(`planilla_${fecha}.pdf`);
    }

    generarConstanciaSalarial(empleadoId) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('CONSTANCIA SALARIAL', 105, 30, { align: 'center' });

        doc.setFontSize(12);
        const y = 60;
        doc.text(`La empresa certifica que ${empleado.nombre}, cédula ${empleado.cedula},`, 20, y);
        doc.text(`se desempeña como ${empleado.puesto} desde el ${this.formatearFecha(empleado.fechaIngreso)}.`, 20, y + 10);
        doc.text(``, 20, y + 20);
        doc.text(`Jornada laboral: ${this.formatJornada(empleado.jornada)}`, 20, y + 30);
        doc.text(`Salario por hora: ₡${this.formatearMoneda(empleado.salarioHora)}`, 20, y + 40);
        doc.text(``, 20, y + 50);
        doc.text(`Se extiende la presente constancia a solicitud del interesado,`, 20, y + 60);
        doc.text(`para los fines que estime conveniente.`, 20, y + 70);
        doc.text(``, 20, y + 80);
        doc.text(`Fecha: ${this.formatearFecha(new Date().toISOString().split('T')[0])}`, 20, y + 100);

        doc.save(`constancia_${empleado.nombre.replace(/\s/g, '_')}.pdf`);
    }

    generarComprobantePago(empleadoId, periodo, fechaInicio, fechaFin) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) {
            alert('Empleado no encontrado');
            return;
        }

        // Calcular los datos de la planilla para este empleado
        const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);

        // Crear un contenedor temporal para el comprobante
        const comprobanteHTML = document.createElement('div');
        comprobanteHTML.id = 'comprobante-temp';
        comprobanteHTML.style.position = 'fixed';
        comprobanteHTML.style.left = '-9999px';
        comprobanteHTML.style.top = '0';
        comprobanteHTML.style.width = '210mm';
        comprobanteHTML.style.background = 'white';
        comprobanteHTML.style.padding = '20px';
        comprobanteHTML.style.fontFamily = 'Arial, sans-serif';

        // Calcular fechas formateadas
        const fechaInicioObj = new Date(fechaInicio + 'T00:00:00');
        const fechaFinObj = new Date(fechaFin + 'T00:00:00');
        const nombreMes = fechaFinObj.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

        // Calcular valores
        const salarioDiario = parseFloat(empleado.salarioHora) * this.getHorasJornada(empleado.jornada);
        const diasLaborados = this.contarDiasLaborados(empleado.id, fechaInicio, fechaFin);
        const subtotalQuincenal = parseFloat(calculos.salarioBase);
        const salarioMensual = subtotalQuincenal * 2; // Salario quincenal x 2
        
        const horasFeriado = this.calcularHorasFeriado(empleado.id, fechaInicio, fechaFin);
        const totalFeriado = horasFeriado * parseFloat(empleado.salarioHora) * 2;
        
        const horasExtraFeriado = this.calcularHorasExtraFeriado(empleado.id, fechaInicio, fechaFin);
        const totalExtraFeriado = horasExtraFeriado * parseFloat(empleado.salarioHora) * 3;
        
        const horasExtras = parseFloat(calculos.horasExtra || 0);
        const totalExtras = parseFloat(calculos.montoHorasExtra || 0);
        
        const subtotalPagado = parseFloat(calculos.salarioBase) + totalFeriado + totalExtraFeriado + totalExtras;
        const salarioBruto = parseFloat(calculos.salarioBruto);
        
        const ccss = parseFloat(calculos.ccss);
        const impuestoRenta = parseFloat(calculos.impuestoRenta || 0);
        const otrasDedu = parseFloat(calculos.rebajos);
        const totalDeducciones = ccss + impuestoRenta + otrasDedu;
        
        const salarioNeto = parseFloat(calculos.salarioNeto);

        // Obtener todos los detalles de asistencias del período
        const asistenciasConDetalle = this.asistencias.filter(a => 
            a.empleadoId === empleado.id &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            a.detalle && a.detalle.trim() !== ''
        );

        // Formatear detalles para mostrar en observaciones
        let observacionesTexto = '';
        if (asistenciasConDetalle.length > 0) {
            observacionesTexto = asistenciasConDetalle.map(a => {
                const fechaFormateada = this.formatearFecha(a.fecha);
                return `${fechaFormateada}: ${a.detalle}`;
            }).join('\n');
        } else {
            observacionesTexto = 'Sin observaciones especiales';
        }

        // Construir el HTML del comprobante
        comprobanteHTML.innerHTML = `
            <style>
                #comprobante-temp {
                    font-size: 11px;
                    line-height: 1.4;
                }
                #comprobante-temp .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                }
                #comprobante-temp .logo {
                    width: 120px;
                    height: 120px;
                    margin-left: -20px;
                }
                #comprobante-temp .logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                #comprobante-temp .title {
                    text-align: center;
                    background: #007bff;
                    color: white;
                    padding: 8px 20px;
                    border-radius: 15px;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 15px;
                }
                #comprobante-temp table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    margin-bottom: 15px;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                #comprobante-temp table.info-table th {
                    background: #007bff;
                    color: white;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    border: none;
                }
                #comprobante-temp table.info-table td {
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                #comprobante-temp table.info-table tr:nth-child(even) {
                    background: #f9f9f9;
                }
                #comprobante-temp .section-title {
                    background: #007bff;
                    color: white;
                    padding: 8px;
                    font-weight: bold;
                    text-align: center;
                    margin-top: 15px;
                    margin-bottom: 10px;
                    border-radius: 10px;
                }
                #comprobante-temp table.detail-table {
                    border: 2px solid #007bff;
                }
                #comprobante-temp table.detail-table thead {
                    background: #007bff;
                    color: white;
                }
                #comprobante-temp table.detail-table th {
                    padding: 8px;
                    border: 1px solid white;
                    font-weight: bold;
                    text-align: center;
                    border-radius: 5px;
                }
                #comprobante-temp table.detail-table td {
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    text-align: right;
                    border-radius: 5px;
                }
                #comprobante-temp table.detail-table td:first-child {
                    text-align: left;
                }
                #comprobante-temp .deductions-header {
                    background: #E74C3C !important;
                    color: white;
                }
                #comprobante-temp .salary-net {
                    background: #007bff;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: center;
                    padding: 12px;
                    margin-top: 15px;
                    border-radius: 15px;
                }
                #comprobante-temp .notes {
                    margin-top: 20px;
                    padding: 10px;
                    background: #f0f8ff;
                    border-left: 4px solid #007bff;
                    font-size: 10px;
                    border-radius: 10px;
                }
            </style>
            
            <div class="header">
                <div class="logo">
                    <img src="${empleado.empresa === 'Instituto Veterinario San Martin de Porres' ? 'images/empresa.png' : 'images/empresa.jpg'}" alt="Logo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%232C2C54%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22%3ELogo%3C/text%3E%3C/svg%3E'">
                </div>
                <div style="flex: 1; text-align: right;">
                    <h2 style="margin: 0; color: #007bff;">${empleado.empresa || 'Veterinaria San Martín de Porres'}</h2>
                    <p style="margin: 5px 0; color: #666;">San Rafael Abajo de Desamparados</p>
                    <p style="margin: 5px 0; color: #666;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                </div>
            </div>

            <div class="title">Comprobante de Pago</div>

            <table class="info-table">
                <tr>
                    <th colspan="2">DATOS DEL COLABORADOR</th>
                </tr>
                <tr>
                    <td><strong>Nombre del colaborador</strong></td>
                    <td>${empleado.nombre}</td>
                </tr>
                <tr>
                    <td><strong>Identificación</strong></td>
                    <td>${empleado.cedula}</td>
                </tr>
                <tr>
                    <td><strong>Departamento</strong></td>
                    <td>${empleado.departamento || 'Operativo'}</td>
                </tr>
                <tr>
                    <td><strong>Puesto</strong></td>
                    <td>${empleado.puesto}</td>
                </tr>
                <tr>
                    <td><strong>Periodo de pago</strong></td>
                    <td>${nombreMes}</td>
                </tr>
                <tr>
                    <td><strong>Depositado en</strong></td>
                    <td>${empleado.depositadoEn || 'Bac San José'}</td>
                </tr>
                <tr>
                    <td><strong>Cuenta</strong></td>
                    <td></td>
                </tr>
            </table>

            <div class="section-title">Detalle de Ingresos en el mes</div>

            <table class="detail-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">INGRESOS</th>
                        <th style="width: 25%;"></th>
                        <th style="width: 25%;" class="deductions-header">DEDUCCIONES</th>
                        <th style="width: 25%;"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Salario Mensual</td>
                        <td>₡ ${this.formatearMoneda(salarioMensual)}</td>
                        <td>C.C.S.S. ${this.config.ccss}%</td>
                        <td>₡ ${this.formatearMoneda(ccss)}</td>
                    </tr>
                    <tr>
                        <td>Salario diario</td>
                        <td>₡ ${this.formatearMoneda(salarioDiario)}</td>
                        <td>Impuesto de Renta</td>
                        <td>₡ ${this.formatearMoneda(impuestoRenta)}</td>
                    </tr>
                    <tr>
                        <td>Salario x hora</td>
                        <td>₡ ${this.formatearMoneda(empleado.salarioHora)}</td>
                        <td>Otras deducciones</td>
                        <td>₡ ${this.formatearMoneda(otrasDedu)}</td>
                    </tr>
                    <tr>
                        <td>Días laborados</td>
                        <td>${diasLaborados}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Subtotal quincenal</td>
                        <td>₡ ${this.formatearMoneda(subtotalQuincenal)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Horas laboradas feriado</td>
                        <td>${horasFeriado.toFixed(2)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>₡ ${this.formatearMoneda(totalFeriado)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Horas extras feriado</td>
                        <td>${horasExtraFeriado.toFixed(2)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>₡ ${this.formatearMoneda(totalExtraFeriado)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Horas extras</td>
                        <td>${horasExtras}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>₡ ${this.formatearMoneda(totalExtras)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Sub-total Pagado</td>
                        <td>₡ ${this.formatearMoneda(subtotalPagado)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr style="font-weight: bold; background: #e8f4f8;">
                        <td>SALARIO BRUTO</td>
                        <td>₡ ${this.formatearMoneda(salarioBruto)}</td>
                        <td>Total de Deducciones</td>
                        <td>₡ ${this.formatearMoneda(totalDeducciones)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="salary-net">
                SALARIO NETO: ₡ ${this.formatearMoneda(salarioNeto)}
            </div>

            <div class="notes">
                <strong>Observaciones:</strong><br>
                ${observacionesTexto}
            </div>
        `;

        document.body.appendChild(comprobanteHTML);

        // Generar el PDF con html2canvas
        setTimeout(() => {
            html2canvas(comprobanteHTML, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const imgWidth = 190;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
                const y = 5;

                pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

                const fileName = `Comprobante_${empleado.nombre.replace(/\s/g, '_')}_${nombreMes.replace(/\s/g, '_')}.pdf`;
                pdf.save(fileName);

                // Eliminar el elemento temporal
                document.body.removeChild(comprobanteHTML);
            }).catch(error => {
                console.error('Error al generar el comprobante:', error);
                alert('Error al generar el comprobante: ' + error.message);
                document.body.removeChild(comprobanteHTML);
            });
        }, 100);
    }

    contarDiasLaborados(empleadoId, fechaInicio, fechaFin) {
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleadoId &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            a.tipo === 'presente'
        );
        return asistencias.length;
    }

    calcularHorasFeriado(empleadoId, fechaInicio, fechaFin) {
        let horasFeriado = 0;
        const feriadosFechas = this.feriados.map(f => f.fecha);
        
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleadoId &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            a.tipo === 'presente' &&
            feriadosFechas.includes(a.fecha)
        );
        
        asistencias.forEach(a => {
            horasFeriado += parseFloat(a.horas || 0);
        });
        
        return horasFeriado;
    }

    calcularHorasExtraFeriado(empleadoId, fechaInicio, fechaFin) {
        let horasExtraFeriado = 0;
        const feriadosFechas = this.feriados.map(f => f.fecha);
        
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleadoId &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            feriadosFechas.includes(a.fecha)
        );
        
        asistencias.forEach(a => {
            horasExtraFeriado += parseFloat(a.horasExtra || 0);
        });
        
        return horasExtraFeriado;
    }

    exportarReportePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const titulo = document.getElementById('reporteTitulo').textContent;
        doc.setFontSize(16);
        doc.text(titulo, 14, 20);

        const thead = document.getElementById('reporteTableHead');
        const tbody = document.getElementById('reporteTableBody');

        const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent);
        const data = Array.from(tbody.querySelectorAll('tr')).map(tr => 
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
        );

        doc.autoTable({
            startY: 30,
            head: [headers],
            body: data
        });

        const fecha = new Date().toISOString().split('T')[0];
        doc.save(`reporte_${fecha}.pdf`);
    }


    // ============================================
    // REGISTRO AUTOMÁTICO DE ASISTENCIAS
    // ============================================

    registrarAsistenciasAutomaticas(empleadoId, fechaInicio, fechaFin) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado || !empleado.horario) {
            alert('El empleado no tiene horario definido');
            return;
        }

        const diasTrabajo = this.extraerDiasTrabajo(empleado.horario);
        const fechas = this.generarFechasEntre(fechaInicio, fechaFin);
        let registrosCreados = 0;

        fechas.forEach(fecha => {
            const diaSemana = this.getDiaSemana(fecha);
            const asistenciaExistente = this.asistencias.find(a => 
                a.empleadoId === empleadoId && a.fecha === fecha
            );

            if (!asistenciaExistente) {
                if (diasTrabajo.includes(diaSemana)) {
                    const horas = this.calcularHorasSegunJornada(empleado.jornada, diaSemana, empleado.horario);
                    
                    this.agregarAsistencia({
                        empleadoId: empleadoId,
                        fecha: fecha,
                        tipo: 'presente',
                        horas: horas,
                        horasExtra: 0,
                        detalle: `Registro automático - ${diaSemana}`
                    });
                    registrosCreados++;
                } else {
                    this.agregarAsistencia({
                        empleadoId: empleadoId,
                        fecha: fecha,
                        tipo: 'libre',
                        horas: 0,
                        horasExtra: 0,
                        detalle: `Día libre - ${diaSemana}`
                    });
                    registrosCreados++;
                }
            }
        });

        alert(`Se crearon ${registrosCreados} registros de asistencia automática`);
        this.renderAsistencias();
    }

    extraerDiasTrabajo(horario) {
        const dias = [];
        const horarioLower = horario.toLowerCase();
        
        const mapeoDias = {
            'lunes': 'lunes', 'monday': 'lunes',
            'martes': 'martes', 'tuesday': 'martes',
            'miércoles': 'miércoles', 'miercoles': 'miércoles', 'wednesday': 'miércoles',
            'jueves': 'jueves', 'thursday': 'jueves',
            'viernes': 'viernes', 'friday': 'viernes',
            'sábado': 'sábado', 'sabado': 'sábado', 'saturday': 'sábado',
            'domingo': 'domingo', 'sunday': 'domingo'
        };

        Object.keys(mapeoDias).forEach(dia => {
            if (horarioLower.includes(dia)) {
                dias.push(mapeoDias[dia]);
            }
        });

        const rangos = horarioLower.match(/(\w+)\s+a\s+(\w+)/g);
        if (rangos) {
            rangos.forEach(rango => {
                const match = rango.match(/(\w+)\s+a\s+(\w+)/);
                if (match) {
                    const inicio = mapeoDias[match[1]];
                    const fin = mapeoDias[match[2]];
                    if (inicio && fin) {
                        const todosDias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                        const indiceInicio = todosDias.indexOf(inicio);
                        const indiceFin = todosDias.indexOf(fin);
                        
                        if (indiceInicio !== -1 && indiceFin !== -1) {
                            for (let i = indiceInicio; i <= indiceFin; i++) {
                                if (!dias.includes(todosDias[i])) {
                                    dias.push(todosDias[i]);
                                }
                            }
                        }
                    }
                }
            });
        }

        return [...new Set(dias)];
    }

    generarFechasEntre(fechaInicio, fechaFin) {
        const fechas = [];
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
            fechas.push(fecha.toISOString().split('T')[0]);
        }
        
        return fechas;
    }

    getDiaSemana(fecha) {
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const [año, mes, dia] = fecha.split('-').map(Number);
        const fechaObj = new Date(año, mes - 1, dia);
        return dias[fechaObj.getDay()];
    }

    calcularHorasSegunJornada(jornada, diaSemana, horario) {
        if (jornada === 'acumulativa') {
            if (diaSemana === 'sábado' && horario.toLowerCase().includes('sábado')) {
                const match = horario.match(/sábado[^:]*:?\s*(\d+)/i);
                if (match) {
                    return parseInt(match[1]);
                }
                return 8;
            }
            return 10;
        }
        
        return this.getHorasJornada(jornada);
    }

    abrirModalRegistroAutomatico() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Registro Automático de Asistencias</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="formRegistroAutomatico">
                        <div class="form-group">
                            <label>Empleado *</label>
                            <select id="autoEmpleado" class="form-control" required>
                                <option value="">Seleccione un empleado</option>
                                ${this.empleados.map(emp => 
                                    `<option value="${emp.id}">${emp.nombre} - ${emp.horario ? 'Con horario' : 'Sin horario'}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fecha Inicio *</label>
                            <input type="date" id="autoFechaInicio" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha Fin *</label>
                            <input type="date" id="autoFechaFin" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <div class="alert alert-info">
                                <strong>Instrucciones:</strong><br>
                                • Seleccione un empleado que tenga horario definido<br>
                                • El sistema registrará automáticamente asistencias para los días de trabajo<br>
                                • No se sobrescribirán asistencias existentes
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                            <button type="submit" class="btn btn-success">Registrar Asistencias</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const hoy = new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
        
        document.getElementById('autoFechaInicio').value = inicioSemana.toISOString().split('T')[0];
        document.getElementById('autoFechaFin').value = hoy.toISOString().split('T')[0];

        document.getElementById('formRegistroAutomatico').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const empleadoId = document.getElementById('autoEmpleado').value;
            const fechaInicio = document.getElementById('autoFechaInicio').value;
            const fechaFin = document.getElementById('autoFechaFin').value;

            if (!empleadoId || !fechaInicio || !fechaFin) {
                alert('Por favor complete todos los campos');
                return;
            }

            this.registrarAsistenciasAutomaticas(empleadoId, fechaInicio, fechaFin);
            modal.remove();
        });
    }

    // ============================================
    // UTILIDADES
    // ============================================

    formatearMoneda(valor) {
        return parseFloat(valor).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    formatearFecha(fecha) {
        if (!fecha) return '';
        const date = new Date(fecha + 'T00:00:00');
        return date.toLocaleDateString('es-CR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    formatJornada(jornada) {
        const jornadas = {
            'diurna': 'Diurna (8h)',
            'nocturna': 'Nocturna (6h, pago 8h)',
            'mixta': 'Mixta (7h)',
            'acumulativa': 'Acumulativa'
        };
        return jornadas[jornada] || jornada;
    }

    formatTipo(tipo) {
        const tipos = {
            'presente': 'Presente',
            'ausencia': 'Ausencia',
            'tardanza': 'Tardanza',
            'permiso': 'Permiso',
            'incapacidad_ccss': 'Incapacidad CCSS',
            'incapacidad_ins': 'Incapacidad INS',
            'vacaciones': 'Vacaciones',
            'libre': 'Libre'
        };
        return tipos[tipo] || tipo;
    }

    getBadgeClaseTipo(tipo) {
        const clases = {
            'presente': 'badge-success',
            'ausencia': 'badge-danger',
            'tardanza': 'badge-warning',
            'permiso': 'badge-info',
            'incapacidad_ccss': 'badge-warning',
            'incapacidad_ins': 'badge-warning',
            'vacaciones': 'badge-info',
            'libre': 'badge-info'
        };
        return clases[tipo] || 'badge-info';
    }

    actualizarFecha() {
        const fecha = new Date().toLocaleDateString('es-CR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        document.getElementById('currentDate').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    }

    actualizarSelectsEmpleados() {
        const selects = [
            document.getElementById('asistenciaEmpleado'),
            document.getElementById('bonoEmpleado'),
            document.getElementById('filtroEmpleadoAsistencia'),
            document.getElementById('filtroEmpleadoBono')
        ];

        selects.forEach(select => {
            if (select) {
                const valorActual = select.value;
                const opciones = this.empleados.map(emp => 
                    `<option value="${emp.id}">${emp.nombre} - ${emp.cedula}</option>`
                ).join('');
                
                if (select.id.startsWith('filtro')) {
                    select.innerHTML = '<option value="">Todos los empleados</option>' + opciones;
                } else {
                    select.innerHTML = '<option value="">Seleccione un empleado</option>' + opciones;
                }
                
                select.value = valorActual;
            }
        });
    }

    // ============================================
    // MODALES
    // ============================================

    abrirModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'block';
    }

    cerrarModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'none';
    }

    abrirEditarEmpleado(id) {
        const empleado = this.empleados.find(e => e.id === id);
        if (!empleado) return;

        document.getElementById('modalEmpleadoTitulo').textContent = 'Editar Empleado';
        document.getElementById('empleadoId').value = empleado.id;
        document.getElementById('empleadoCedula').value = empleado.cedula;
        document.getElementById('empleadoNombre').value = empleado.nombre;
        document.getElementById('empleadoPuesto').value = empleado.puesto;
        document.getElementById('empleadoJornada').value = empleado.jornada;
        document.getElementById('empleadoSalarioHora').value = empleado.salarioHora;
        document.getElementById('empleadoFechaIngreso').value = empleado.fechaIngreso;
        document.getElementById('empleadoHorario').value = empleado.horario || '';
        document.getElementById('empleadoTelefono').value = empleado.telefono || '';
        document.getElementById('empleadoEmail').value = empleado.email || '';
        document.getElementById('empleadoEmpresa').value = empleado.empresa || '';
        document.getElementById('empleadoDepositadoEn').value = empleado.depositadoEn || '';
        document.getElementById('empleadoDepartamento').value = empleado.departamento || '';

        this.abrirModal('modalEmpleado');
    }

    abrirEditarAsistencia(id) {
        const asistencia = this.asistencias.find(a => a.id === id);
        if (!asistencia) return;

        document.getElementById('asistenciaId').value = asistencia.id;
        document.getElementById('asistenciaEmpleado').value = asistencia.empleadoId;
        document.getElementById('asistenciaFecha').value = asistencia.fecha;
        document.getElementById('asistenciaTipo').value = asistencia.tipo;
        document.getElementById('asistenciaHoras').value = asistencia.horas || '';
        document.getElementById('asistenciaHorasExtra').value = asistencia.horasExtra || '';
        document.getElementById('asistenciaDetalle').value = asistencia.detalle || '';

        this.abrirModal('modalAsistencia');
    }

    abrirEditarBono(id) {
        const bono = this.bonos.find(b => b.id === id);
        if (!bono) return;

        document.getElementById('bonoId').value = bono.id;
        document.getElementById('bonoEmpleado').value = bono.empleadoId;
        document.getElementById('bonoTipo').value = bono.tipo;
        document.getElementById('bonoConcepto').value = bono.concepto;
        document.getElementById('bonoMonto').value = bono.monto;
        document.getElementById('bonoFecha').value = bono.fecha;

        this.abrirModal('modalBono');
    }

    abrirEditarFeriado(id) {
        const feriado = this.feriados.find(f => f.id === id);
        if (!feriado) return;

        document.getElementById('feriadoId').value = feriado.id;
        document.getElementById('feriadoFecha').value = feriado.fecha;
        document.getElementById('feriadoDescripcion').value = feriado.descripcion;
        document.getElementById('feriadoRecargo').value = feriado.recargo;

        this.abrirModal('modalFeriado');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    initEventListeners() {
        // Navegación
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.cambiarSeccion(section);
            });
        });

        // Toggle sidebar
        document.getElementById('toggleSidebar')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });

        // Modales - cerrar
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.cerrarModal(modalId);
            });
        });

        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.close;
                this.cerrarModal(modalId);
            });
        });

        // Empleados
        document.getElementById('btnNuevoEmpleado')?.addEventListener('click', () => {
            document.getElementById('formEmpleado').reset();
            document.getElementById('empleadoId').value = '';
            document.getElementById('modalEmpleadoTitulo').textContent = 'Nuevo Empleado';
            this.abrirModal('modalEmpleado');
        });

        document.getElementById('formEmpleado')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('empleadoId').value;
            const datos = {
                cedula: document.getElementById('empleadoCedula').value,
                nombre: document.getElementById('empleadoNombre').value,
                puesto: document.getElementById('empleadoPuesto').value,
                jornada: document.getElementById('empleadoJornada').value,
                salarioHora: parseFloat(document.getElementById('empleadoSalarioHora').value),
                fechaIngreso: document.getElementById('empleadoFechaIngreso').value,
                horario: document.getElementById('empleadoHorario').value,
                telefono: document.getElementById('empleadoTelefono').value,
                email: document.getElementById('empleadoEmail').value,
                empresa: document.getElementById('empleadoEmpresa').value,
                depositadoEn: document.getElementById('empleadoDepositadoEn').value,
                departamento: document.getElementById('empleadoDepartamento').value
            };

            if (id) {
                this.editarEmpleado(id, datos);
            } else {
                this.agregarEmpleado(datos);
            }

            this.cerrarModal('modalEmpleado');
        });

        document.getElementById('searchEmpleado')?.addEventListener('input', (e) => {
            this.aplicarFiltrosEmpleados();
        });

        // Filtro por empresa en empleados
        document.getElementById('filtroEmpresa')?.addEventListener('change', () => {
            this.aplicarFiltrosEmpleados();
        });

        // Botón limpiar filtros
        document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
            document.getElementById('searchEmpleado').value = '';
            document.getElementById('filtroEmpresa').value = '';
            this.renderEmpleados();
        });

        // Asistencias
        document.getElementById('btnNuevaAsistencia')?.addEventListener('click', () => {
            document.getElementById('formAsistencia').reset();
            document.getElementById('asistenciaId').value = '';
            document.getElementById('asistenciaFecha').value = new Date().toISOString().split('T')[0];
            this.abrirModal('modalAsistencia');
        });

        document.getElementById('btnAsistenciaAutomatica')?.addEventListener('click', () => {
            this.abrirModalRegistroAutomatico();
        });

        document.getElementById('formAsistencia')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('asistenciaId').value;
            const datos = {
                empleadoId: document.getElementById('asistenciaEmpleado').value,
                fecha: document.getElementById('asistenciaFecha').value,
                tipo: document.getElementById('asistenciaTipo').value,
                horas: parseFloat(document.getElementById('asistenciaHoras').value) || 0,
                horasExtra: parseFloat(document.getElementById('asistenciaHorasExtra').value) || 0,
                detalle: document.getElementById('asistenciaDetalle').value
            };

            if (id) {
                this.editarAsistencia(id, datos);
            } else {
                this.agregarAsistencia(datos);
            }

            this.cerrarModal('modalAsistencia');
        });

        document.getElementById('btnFiltrarAsistencias')?.addEventListener('click', () => {
            const empleadoId = document.getElementById('filtroEmpleadoAsistencia').value;
            const fechaInicio = document.getElementById('filtroFechaInicio').value;
            const fechaFin = document.getElementById('filtroFechaFin').value;
            const resultados = this.filtrarAsistencias(empleadoId, fechaInicio, fechaFin);
            this.renderAsistencias(resultados);
        });

        // Bonos
        document.getElementById('btnNuevoBono')?.addEventListener('click', () => {
            document.getElementById('formBono').reset();
            document.getElementById('bonoId').value = '';
            document.getElementById('bonoFecha').value = new Date().toISOString().split('T')[0];
            this.abrirModal('modalBono');
        });

        document.getElementById('formBono')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('bonoId').value;
            const datos = {
                empleadoId: document.getElementById('bonoEmpleado').value,
                tipo: document.getElementById('bonoTipo').value,
                concepto: document.getElementById('bonoConcepto').value,
                monto: parseFloat(document.getElementById('bonoMonto').value),
                fecha: document.getElementById('bonoFecha').value,
                periodo: document.getElementById('bonoPeriodo').value
            };

            if (id) {
                this.editarBono(id, datos);
            } else {
                this.agregarBono(datos);
            }

            this.cerrarModal('modalBono');
        });

        document.getElementById('btnFiltrarBonos')?.addEventListener('click', () => {
            const empleadoId = document.getElementById('filtroEmpleadoBono').value;
            const tipo = document.getElementById('filtroTipoBono').value;
            const resultados = this.filtrarBonos(empleadoId, tipo);
            this.renderBonos(resultados);
        });

        // Planillas
        document.getElementById('btnGenerarPlanilla')?.addEventListener('click', () => {
            const periodo = document.getElementById('periodoPlanilla').value;
            const fechaInicio = document.getElementById('fechaInicioPlanilla').value;
            const fechaFin = document.getElementById('fechaFinPlanilla').value;
            const empresaFiltro = document.getElementById('filtroEmpresaPlanilla').value;

            if (!fechaInicio || !fechaFin) {
                alert('Por favor seleccione las fechas de inicio y fin');
                return;
            }

            const planilla = this.calcularPlanilla(periodo, fechaInicio, fechaFin, empresaFiltro);
            this.renderPlanilla(planilla);
        });

        document.getElementById('btnExportarExcel')?.addEventListener('click', () => {
            if (this.ultimaPlanilla) {
                this.exportarExcel(this.ultimaPlanilla);
            }
        });

        document.getElementById('btnExportarPDF')?.addEventListener('click', () => {
            if (this.ultimaPlanilla) {
                this.exportarPDF(this.ultimaPlanilla);
            }
        });

        document.getElementById('btnGuardarPlanilla')?.addEventListener('click', () => {
            this.guardarPlanillaEnHistorial();
        });

        // Pestañas de Empleados
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.tab;
                
                // Cambiar estado activo de las pestañas
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.color = 'var(--gray-600)';
                    b.style.borderBottomColor = 'transparent';
                });
                btn.classList.add('active');
                btn.style.color = 'var(--primary-color)';
                btn.style.borderBottomColor = 'var(--primary-color)';
                
                // Mostrar/ocultar contenido
                document.querySelectorAll('.tab-panel').forEach(panel => {
                    panel.style.display = 'none';
                });
                const targetPanel = document.getElementById(`tab-${tab}`);
                if (targetPanel) {
                    targetPanel.style.display = 'block';
                }
                
                // Si es la pestaña de historial, cargar empleados y renderizar
                if (tab === 'historial') {
                    const filtroEmpleado = document.getElementById('filtroEmpleadoHistorial');
                    if (filtroEmpleado && filtroEmpleado.options.length === 1) {
                        // Cargar opciones de empleados
                        this.empleados.forEach(emp => {
                            const option = document.createElement('option');
                            option.value = emp.id;
                            option.textContent = emp.nombre;
                            filtroEmpleado.appendChild(option);
                        });
                    }
                    this.renderHistorialPlanillas();
                }
            });
        });

        // Filtro de historial por empleado
        document.getElementById('filtroEmpleadoHistorial')?.addEventListener('change', (e) => {
            this.renderHistorialPlanillas(e.target.value);
        });

        // Reportes
        document.querySelectorAll('.report-card button').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const reportCard = btn.closest('.report-card');
                const reportId = reportCard.id;
                
                if (reportId === 'reporteVacaciones') {
                    this.generarReporteVacaciones();
                } else if (reportId === 'reporteAguinaldo') {
                    this.generarReporteAguinaldo();
                } else if (reportId === 'reporteConstancias') {
                    this.cambiarSeccion('reportes');
                    // Cargar la vista de constancias después de cambiar la sección
                    setTimeout(() => {
                        this.cargarVistaConstancias();
                    }, 100);
                } else if (reportId === 'reporteIncapacidades') {
                    this.generarReporteIncapacidades();
                }
            });
        });

        document.getElementById('btnCerrarReporte')?.addEventListener('click', () => {
            this.cerrarReporte();
        });

        document.getElementById('btnExportarReportePDF')?.addEventListener('click', () => {
            this.exportarReportePDF();
        });

        // Feriados
        document.getElementById('btnNuevoFeriado')?.addEventListener('click', () => {
            document.getElementById('formFeriado').reset();
            document.getElementById('feriadoId').value = '';
            this.abrirModal('modalFeriado');
        });

        document.getElementById('formFeriado')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('feriadoId').value;
            const datos = {
                fecha: document.getElementById('feriadoFecha').value,
                descripcion: document.getElementById('feriadoDescripcion').value,
                recargo: parseInt(document.getElementById('feriadoRecargo').value)
            };

            if (id) {
                this.editarFeriado(id, datos);
            } else {
                this.agregarFeriado(datos);
            }

            this.cerrarModal('modalFeriado');
        });

        // Configuración
        document.getElementById('btnGuardarConfig')?.addEventListener('click', () => {
            this.config.ccss = parseFloat(document.getElementById('configCCSS').value);
            this.config.incapacidadCCSS = parseInt(document.getElementById('configIncapCCSS').value);
            this.config.incapacidadINS = parseInt(document.getElementById('configIncapINS').value);
            this.guardarDatos();
            alert('Configuración guardada exitosamente');
        });

        document.getElementById('btnLimpiarDatos')?.addEventListener('click', () => {
            if (confirm('¿Está seguro de eliminar todos los datos? Esta acción no se puede deshacer.')) {
                localStorage.clear();
                location.reload();
            }
        });

        document.getElementById('btnExportarDatos')?.addEventListener('click', () => {
            const datos = {
                empleados: this.empleados,
                asistencias: this.asistencias,
                bonos: this.bonos,
                feriados: this.feriados,
                config: this.config
            };
            const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_planillas_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        });

        document.getElementById('btnImportarDatos')?.addEventListener('click', () => {
            document.getElementById('inputImportarDatos').click();
        });

        document.getElementById('inputImportarDatos')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const datos = JSON.parse(event.target.result);
                        this.empleados = datos.empleados || [];
                        this.asistencias = datos.asistencias || [];
                        this.bonos = datos.bonos || [];
                        this.feriados = datos.feriados || [];
                        this.config = datos.config || this.config;
                        this.guardarDatos();
                        alert('Datos importados exitosamente');
                        location.reload();
                    } catch (error) {
                        alert('Error al importar datos: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        });

        // Cargar datos iniciales
        document.getElementById('configCCSS').value = this.config.ccss;
        document.getElementById('configIncapCCSS').value = this.config.incapacidadCCSS;
        document.getElementById('configIncapINS').value = this.config.incapacidadINS;

        // Configurar fechas por defecto para planilla
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        document.getElementById('fechaInicioPlanilla').value = inicioMes.toISOString().split('T')[0];
        document.getElementById('fechaFinPlanilla').value = hoy.toISOString().split('T')[0];
    }

    cambiarSeccion(seccion) {
        // Actualizar menú
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${seccion}"]`).classList.add('active');

        // Actualizar secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`section-${seccion}`).classList.add('active');

        // Renderizar datos según la sección
        switch(seccion) {
            case 'empleados':
                this.renderEmpleados();
                break;
            case 'asistencias':
                this.renderAsistencias();
                this.actualizarSelectsEmpleados();
                break;
            case 'bonos':
                this.renderBonos();
                this.actualizarSelectsEmpleados();
                break;
            case 'feriados':
                this.renderFeriados();
                break;
            case 'reportes':
                // La sección de reportes se mantiene como está por defecto
                break;
        }
    }

    cargarVistaConstancias() {
        // Reemplazar el contenido de la sección de reportes con la vista de constancias
        const sectionReportes = document.getElementById('section-reportes');
        sectionReportes.innerHTML = `
            <style>
                .constancias-container {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .constancias-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #007bff;
                }
                .constancias-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #333;
                    margin: 0;
                }
                .constancias-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                }
                .constancias-toolbar select {
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 14px;
                    min-width: 200px;
                    background: white;
                }
                .constancias-toolbar .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .constancias-toolbar .btn-primary {
                    background: #007bff;
                    color: white;
                }
                .constancias-toolbar .btn-primary:hover {
                    background: #0056b3;
                }
                .constancias-toolbar .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                .constancias-toolbar .btn-secondary:hover {
                    background: #545b62;
                }
                .constancias-table-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .constancias-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .constancias-table thead {
                    background: #007bff;
                    color: white;
                }
                .constancias-table th,
                .constancias-table td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #dee2e6;
                }
                .constancias-table th {
                    font-weight: 600;
                    font-size: 14px;
                }
                .constancias-table tbody tr:hover {
                    background: #f8f9fa;
                }
                .constancias-table tbody tr:last-child td {
                    border-bottom: none;
                }
                .no-data {
                    text-align: center;
                    padding: 40px;
                    color: #6c757d;
                    font-style: italic;
                }
                .spacer {
                    flex: 1;
                }
            </style>
            <div class="constancias-container">
                <div class="constancias-header">
                    <h1 class="constancias-title">Constancias Salariales</h1>
                </div>
                <div class="constancias-toolbar">
                    <select id="emp">
                        <option value="">Seleccione empleado</option>
                    </select>
                    <button id="constancia" class="btn btn-primary">Constancia salarial PDF</button>
                    <div class="spacer"></div>
                    <button id="volver-reportes" class="btn btn-secondary">Volver a Reportes</button>
                </div>
                <div class="constancias-table-container">
                    <table class="constancias-table" id="emp-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cédula</th>
                                <th>Puesto</th>
                                <th>Jornada</th>
                                <th>Salario por Hora</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `;

        const empSel = sectionReportes.querySelector('#emp');
        const tbody = sectionReportes.querySelector('#emp-table tbody');

        // Cargar empleados
        const employees = this.empleados;
        
        // Verificar que hay empleados
        if (!employees || employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No hay empleados registrados</td></tr>';
            alert('No hay empleados registrados. Agrega empleados primero.');
            return;
        }

        // Llenar dropdown y tabla
        empSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        tbody.innerHTML = employees.map(e => `
            <tr>
                <td>${e.nombre}</td>
                <td>${e.cedula}</td>
                <td>${e.puesto || ''}</td>
                <td>${e.jornada}</td>
                <td>${this.formatearMoneda(e.salarioHora || 0)}</td>
            </tr>
        `).join('');

        // Event listener para generar constancia
        sectionReportes.querySelector('#constancia').addEventListener('click', () => {
            const id = empSel.value;
            if (!id) { 
                alert('Seleccione un empleado de la lista'); 
                return; 
            }
            
            const empleado = employees.find(x => x.id === id);
            if (!empleado) {
                alert('Empleado no encontrado');
                return;
            }
            
            // Llamar a la función de generar constancia
            this.generarConstanciaSalarial(empleado);
        });

        // Event listener para volver a reportes
        sectionReportes.querySelector('#volver-reportes').addEventListener('click', () => {
            location.reload(); // Recargar la página para volver a la vista original
        });
    }

    generarConstanciaSalarial(empleado) {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) { 
            alert('jsPDF no está cargado'); 
            return; 
        }

        // Obtener fecha actual
        const fechaActual = new Date();
        const dia = fechaActual.getDate();
        const mes = fechaActual.toLocaleDateString('es-ES', { month: 'long' });
        const año = fechaActual.getFullYear();
        const fechaFormateada = `${dia} de ${mes} de ${año}`;
        
        // Calcular salario mensual usando la misma lógica del sistema de planillas
        // Simular un período de quincena para obtener el salario base
        const hoy = new Date();
        const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        
        const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);
        const subtotalQuincenal = parseFloat(calculos.salarioBase);
        const salarioMensualBruto = subtotalQuincenal * 2; // Salario quincenal x 2
        
        // Calcular deducciones mensuales
        const ccssMensual = salarioMensualBruto * 0.1067; // 10.67% CCSS mensual
        const impuestoRentaMensual = this.calcularImpuestoRenta(salarioMensualBruto);
        const totalDeduccionesMensual = ccssMensual + impuestoRentaMensual;
        
        // Calcular salario neto mensual
        const salarioMensualNeto = salarioMensualBruto - totalDeduccionesMensual;
        
        // Crear elemento HTML temporal para la constancia
        const constanciaHTML = document.createElement('div');
        constanciaHTML.id = 'constancia-temp';
            constanciaHTML.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 210mm;
                height: 297mm;
                background: white;
                font-family: Arial, sans-serif;
                padding: 20mm;
                box-sizing: border-box;
                z-index: -1;
                display: flex;
                flex-direction: column;
            `;
        
        constanciaHTML.innerHTML = `
            <style>
                #constancia-temp {
                    font-family: Arial, sans-serif;
                    line-height: 1.4;
                    color: #333;
                    display: flex;
                    flex-direction: column;
                }
                
                #constancia-temp .header {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    position: relative;
                    top: 0;
                    width: 100%;
                }
                
                #constancia-temp .logo {
                    width: 120px;
                    height: 120px;
                    margin-right: -20px;
                }
                
                #constancia-temp .logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                
                #constancia-temp .company-info {
                    flex: 1;
                    text-align: left;
                }
                
                #constancia-temp .company-info h1 {
                    margin: 0;
                    font-size: 15px;
                    color: #007bff;
                    font-weight: bold;
                }
                
                #constancia-temp .company-info p {
                    margin: 2px 0;
                    font-size: 13px;
                    color: #666;
                }
                
                #constancia-temp .title {
                    text-align: center;
                    font-size: 20px;
                    font-weight: bold;
                    margin: 30px 0 20px 0;
                    color: #333;
                }
                
                #constancia-temp .subtitle {
                    text-align: center;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 30px;
                    color: #333;
                }
                
                #constancia-temp .content {
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 20px;
                    text-align: justify;
                }
                
                #constancia-temp .date {
                    font-size: 14px;
                    margin: 20px 0;
                }
                
                #constancia-temp .contact {
                    font-size: 14px;
                    margin: 20px 0;
                }
                
                #constancia-temp .signature {
                    font-size: 14px;
                    margin: 30px 0;
                }
                
                #constancia-temp .director {
                    font-size: 14px;
                    margin: 20px 0;
                    font-weight: bold;
                }
                
            </style>
            
            <div class="header">
                <div class="logo">
                    <img src="${empleado.empresa === 'Instituto Veterinario San Martin de Porres' ? 'images/empresa.png' : 'images/empresa.png'}" alt="Logo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23007bff%22 width=%22120%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22%3ELogo%3C/text%3E%3C/svg%3E'">
                </div>
                
            </div>
            
            <div class="title">CONSTANCIA SALARIAL</div>
            <div class="subtitle">A QUIEN INTERESE</div>
            
            <div class="content">
                Por medio de este documento hacemos constar que el (la) Sr. (Sra.) <strong>${empleado.nombre}</strong> con documento de identidad número <strong>${empleado.cedula}</strong>, labora en nuestra empresa en el puesto de <strong>${empleado.puesto || 'Empleado'}</strong> desde el <strong>${empleado.fechaIngreso || 'fecha de ingreso'}</strong> y hasta la actualidad. Percibiendo en el último mes un salario mensual bruto de <strong>${this.formatearMoneda(salarioMensualBruto)}</strong> (${this.salarioATexto(salarioMensualBruto)}) y salario mensual neto de <strong>${this.formatearMoneda(salarioMensualNeto)}</strong> (${this.salarioATexto(salarioMensualNeto)}).
            </div>
            
            <div class="date">
                La presente se extiende a solicitud de la persona interesada el día <strong>${fechaFormateada}</strong>.
            </div>
            
            <div class="contact">
                Si usted tiene alguna pregunta o inquietud, o si desea validar esta información; por favor contacte al departamento de Recursos Humanos<br>
                Enviando un correo electrónico a <strong>rrhh@vetsanmartin.com</strong>
            </div>
            
            <div class="signature">
                Atentamente,
            </div>
            
            <div class="director">
                <strong>Dr. Randall Azofeifa</strong><br>
                Director General
            </div>
        `;
        
        document.body.appendChild(constanciaHTML);
        
        // Generar PDF usando html2canvas
        setTimeout(() => {
            html2canvas(constanciaHTML, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const imgWidth = 190;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
                const y = 5;
                
                pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
                
                const fileName = `Constancia_Salarial_${empleado.nombre.replace(/\s/g, '_')}.pdf`;
                pdf.save(fileName);
                
                document.body.removeChild(constanciaHTML);
            }).catch(error => {
                console.error('Error al generar la constancia:', error);
                alert('Error al generar la constancia: ' + error.message);
                document.body.removeChild(constanciaHTML);
            });
        }, 100);
    }

    getHorasJornada(jornada) {
        switch(jornada) {
            case 'Tiempo completo': return 8;
            case 'Medio tiempo': return 4;
            case 'Tiempo parcial': return 6;
            default: return 8;
        }
    }
    
    calcularImpuestoRenta(salarioBruto) {
        // Nuevos tramos de impuesto de renta
        if (salarioBruto <= 922000) return 0;
        if (salarioBruto <= 1352000) return (salarioBruto - 922000) * 0.10;
        if (salarioBruto <= 2373000) return 43000 + (salarioBruto - 1352000) * 0.15;
        if (salarioBruto <= 4745000) return 196150 + (salarioBruto - 2373000) * 0.20;
        return 670450 + (salarioBruto - 4745000) * 0.25;
    }

    salarioATexto(salario) {
        const parteEntera = Math.floor(salario);
        const parteDecimal = Math.round((salario - parteEntera) * 100);
        
        let texto = this.numeroATexto(parteEntera) + ' colones';
        
        if (parteDecimal > 0) {
            texto += ' con ' + this.numeroATexto(parteDecimal) + ' céntimos';
        }
        
        return texto;
    }

    numeroATexto(numero) {
        const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
        
        if (numero === 0) return 'cero';
        if (numero < 10) return unidades[numero];
        if (numero < 20) return especiales[numero - 10];
        if (numero < 100) {
            const decena = Math.floor(numero / 10);
            const unidad = numero % 10;
            return decenas[decena] + (unidad > 0 ? ' y ' + unidades[unidad] : '');
        }
        if (numero < 1000) {
            const centena = Math.floor(numero / 100);
            const resto = numero % 100;
            let texto = '';
            if (centena === 1) {
                texto = 'ciento';
            } else if (centena === 5) {
                texto = 'quinientos';
            } else if (centena === 7) {
                texto = 'setecientos';
            } else if (centena === 9) {
                texto = 'novecientos';
            } else {
                texto = unidades[centena] + 'cientos';
            }
            if (resto > 0) {
                texto += ' ' + this.numeroATexto(resto);
            }
            return texto;
        }
        if (numero < 1000000) {
            const miles = Math.floor(numero / 1000);
            const resto = numero % 1000;
            let texto = '';
            if (miles === 1) {
                texto = 'mil';
            } else {
                texto = this.numeroATexto(miles) + ' mil';
            }
            if (resto > 0) {
                texto += ' ' + this.numeroATexto(resto);
            }
            return texto;
        }
        if (numero < 1000000000) {
            const millones = Math.floor(numero / 1000000);
            const resto = numero % 1000000;
            let texto = '';
            if (millones === 1) {
                texto = 'un millón';
            } else {
                texto = this.numeroATexto(millones) + ' millones';
            }
            if (resto > 0) {
                texto += ' ' + this.numeroATexto(resto);
            }
            return texto;
        }
        
        return numero.toString();
    }
}

// Inicializar el sistema
let sistema;
document.addEventListener('DOMContentLoaded', () => {
    sistema = new SistemaPlanillas();
    sistema.renderEmpleados();
    sistema.actualizarSelectsEmpleados();
});