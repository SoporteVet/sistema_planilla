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
    }

    guardarDatos() {
        localStorage.setItem('empleados', JSON.stringify(this.empleados));
        localStorage.setItem('asistencias', JSON.stringify(this.asistencias));
        localStorage.setItem('bonos', JSON.stringify(this.bonos));
        localStorage.setItem('feriados', JSON.stringify(this.feriados));
        localStorage.setItem('config', JSON.stringify(this.config));
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

    renderEmpleados(empleados = this.empleados) {
        const tbody = document.getElementById('tablaEmpleados');
        
        if (empleados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
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
                <td>${emp.puesto}</td>
                <td><span class="badge badge-info">${this.formatJornada(emp.jornada)}</span></td>
                <td>₡${this.formatearMoneda(emp.salarioHora)}</td>
                <td>${emp.horario ? emp.horario.substring(0, 50) + (emp.horario.length > 50 ? '...' : '') : 'No definido'}</td>
                <td>${this.formatearFecha(emp.fechaIngreso)}</td>
                <td>
                    <button class="action-btn edit" onclick="sistema.abrirEditarEmpleado('${emp.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="sistema.eliminarEmpleado('${emp.id}')">
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
            // Filtrar solo la asistencia específica
            const asistenciasAntes = this.asistencias.length;
            this.asistencias = this.asistencias.filter(a => a.id !== id);
            const asistenciasDespues = this.asistencias.length;
            
            if (asistenciasAntes - asistenciasDespues === 1) {
                this.guardarDatos();
                this.renderAsistencias();
                console.log('Asistencia eliminada correctamente:', id);
            } else {
                console.error('Error: Se eliminaron múltiples asistencias o ninguna');
                alert('Error al eliminar la asistencia. Por favor, intente nuevamente.');
            }
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
                        <button class="action-btn edit" onclick="sistema.abrirEditarAsistencia('${asist.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="sistema.eliminarAsistencia('${asist.id}')">
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
                        <button class="action-btn edit" onclick="sistema.abrirEditarBono('${bono.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="sistema.eliminarBono('${bono.id}')">
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

    calcularPlanilla(periodo, fechaInicio, fechaFin) {
        const planilla = [];

        this.empleados.forEach(empleado => {
            const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);
            planilla.push({
                empleado: empleado,
                ...calculos
            });
        });

        return planilla;
    }

    calcularSalarioEmpleado(empleado, fechaInicio, fechaFin) {
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
                    // Trabajas 4 días × 10h + 1 día × 8h = 48 horas por semana
                    // Pero se pagan solo 8 horas por día trabajado = 40 horas por semana
                    // Los días libres aparecen como "Libre" y NO se pagan
                    horasNormales += 8; // Se pagan 8 horas por día trabajado
                }

                // Sumar horas extra registradas explícitamente
                horasExtra += extra;
            } else if (asist.tipo === 'incapacidad_ccss') {
                // CCSS paga el 50% del día
                const horasDia = this.getHorasJornada(empleado.jornada);
                horasNormales += horasDia * (this.config.incapacidadCCSS / 100);
            } else if (asist.tipo === 'libre') {
                // Los días libres no se pagan en ninguna jornada
                // La ventaja de la acumulativa es que tienes 2 días libres en lugar de 1
                // Pero se pagan las mismas 48 horas que la jornada diurna
            }
            // INS no paga (0%)
        });

        salarioBase = horasNormales * empleado.salarioHora;
        
        // Debug: Mostrar información del cálculo
        if (empleado.jornada === 'acumulativa') {
            console.log(`Empleado: ${empleado.nombre}`);
            console.log(`Horas normales calculadas: ${horasNormales}`);
            console.log(`Salario por hora: ${empleado.salarioHora}`);
            console.log(`Salario base: ${salarioBase}`);
            console.log(`Asistencias encontradas: ${asistencias.length}`);
        }

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

        // Calcular salario neto
        const salarioNeto = salarioBruto - ccss - totalRebajos;

        return {
            horasNormales: horasNormales.toFixed(2),
            horasExtra: horasExtra.toFixed(2),
            salarioBase: salarioBase.toFixed(2),
            montoHorasExtra: montoHorasExtra.toFixed(2),
            bonos: totalBonos.toFixed(2),
            rebajos: totalRebajos.toFixed(2),
            salarioBruto: salarioBruto.toFixed(2),
            ccss: ccss.toFixed(2),
            salarioNeto: salarioNeto.toFixed(2)
        };
    }

    getHorasJornada(jornada) {
        switch(jornada) {
            case 'diurna': return 8;
            case 'nocturna': return 8; // Se pagan 8 aunque se trabajan 6
            case 'mixta': return 7;
            case 'acumulativa': return 8; // Se pagan 8 horas por día trabajado, igual que diurna
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
                    <button class="action-btn view" onclick="sistema.generarConstanciaSalarial('${item.empleado.id}')">
                        <i class="fas fa-file-pdf"></i>
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
        // Aguinaldo = salarios brutos del período / 12
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return 0;

        const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);
        const aguinaldo = parseFloat(calculos.salarioBruto) / 12;
        
        return aguinaldo.toFixed(2);
    }

    calcularMesesTrabajados(fechaInicio, fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        let meses = (fin.getFullYear() - inicio.getFullYear()) * 12;
        meses -= inicio.getMonth();
        meses += fin.getMonth();
        
        return meses <= 0 ? 0 : meses;
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
                    <button class="action-btn edit" onclick="sistema.abrirEditarFeriado('${feriado.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="sistema.eliminarFeriado('${feriado.id}')">
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
            // Calcular días usados
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
        // Aguinaldo del año actual (diciembre 1-30)
        const anioActual = new Date().getFullYear();
        const fechaInicio = `${anioActual}-01-01`;
        const fechaFin = `${anioActual}-12-01`;

        const reporte = this.empleados.map(emp => {
            const aguinaldo = this.calcularAguinaldo(emp.id, fechaInicio, fechaFin);
            return {
                empleado: emp.nombre,
                cedula: emp.cedula,
                aguinaldo: `₡${this.formatearMoneda(aguinaldo)}`
            };
        });

        this.mostrarReporteTabla(
            `Reporte de Aguinaldo ${anioActual}`,
            ['Empleado', 'Cédula', 'Aguinaldo'],
            reporte.map(r => [r.empleado, r.cedula, r.aguinaldo])
        );
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
        console.log(`Horario del empleado: ${empleado.horario}`);
        console.log(`Días de trabajo detectados: ${diasTrabajo.join(', ')}`);
        
        const fechas = this.generarFechasEntre(fechaInicio, fechaFin);
        let registrosCreados = 0;

        fechas.forEach(fecha => {
            const diaSemana = this.getDiaSemana(fecha);
            
            // Debug: mostrar fecha y día para verificar
            console.log(`Fecha: ${fecha} -> Día: ${diaSemana}`);
            
            // Verificar si ya existe asistencia para esta fecha
            const asistenciaExistente = this.asistencias.find(a => 
                a.empleadoId === empleadoId && a.fecha === fecha
            );

            if (!asistenciaExistente) {
                if (diasTrabajo.includes(diaSemana)) {
                    // Es día de trabajo
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
                    // Es día libre - registrar como "Libre"
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
        
        // Mapeo de días
        const mapeoDias = {
            'lunes': 'lunes', 'monday': 'lunes',
            'martes': 'martes', 'tuesday': 'martes',
            'miércoles': 'miércoles', 'miercoles': 'miércoles', 'wednesday': 'miércoles',
            'jueves': 'jueves', 'thursday': 'jueves',
            'viernes': 'viernes', 'friday': 'viernes',
            'sábado': 'sábado', 'sabado': 'sábado', 'saturday': 'sábado',
            'domingo': 'domingo', 'sunday': 'domingo'
        };

        // Buscar días en el texto
        Object.keys(mapeoDias).forEach(dia => {
            if (horarioLower.includes(dia)) {
                dias.push(mapeoDias[dia]);
            }
        });

        // Buscar rangos (ej: "martes a viernes")
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

        return [...new Set(dias)]; // Eliminar duplicados
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
        // Usar UTC para evitar problemas de zona horaria
        const [año, mes, dia] = fecha.split('-').map(Number);
        const fechaObj = new Date(año, mes - 1, dia); // mes - 1 porque Date usa 0-11 para meses
        return dias[fechaObj.getDay()];
    }

    calcularHorasSegunJornada(jornada, diaSemana, horario) {
        // Para jornada acumulativa, calcular horas según el día
        if (jornada === 'acumulativa') {
            // Si es sábado y tiene horario especial, usar esas horas
            if (diaSemana === 'sábado' && horario.toLowerCase().includes('sábado')) {
                const match = horario.match(/sábado[^:]*:?\s*(\d+)/i);
                if (match) {
                    return parseInt(match[1]);
                }
                // Si no especifica horas para sábado, usar 8 horas
                return 8;
            }
            // Para otros días (martes a viernes), usar 10 horas
            return 10;
        }
        
        // Para otras jornadas, usar las horas estándar
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

        // Configurar fechas por defecto
        const hoy = new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes de esta semana
        
        document.getElementById('autoFechaInicio').value = inicioSemana.toISOString().split('T')[0];
        document.getElementById('autoFechaFin').value = hoy.toISOString().split('T')[0];

        // Event listener para el formulario
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


    // Función de prueba para verificar fechas
    probarFechas() {
        console.log('=== PRUEBA DE FECHAS ===');
        const fechasPrueba = [
            '2025-10-05', // Domingo
            '2025-10-06', // Lunes
            '2025-10-07', // Martes
            '2025-10-08', // Miércoles
            '2025-10-09', // Jueves
            '2025-10-10', // Viernes
            '2025-10-11'  // Sábado
        ];
        
        fechasPrueba.forEach(fecha => {
            const dia = this.getDiaSemana(fecha);
            console.log(`${fecha} -> ${dia}`);
        });
        console.log('=== FIN PRUEBA ===');
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
        modal.classList.add('active');
    }

    cerrarModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
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

        this.abrirModal('modalEmpleado');
    }

    abrirEditarAsistencia(id) {
        const asistencia = this.asistencias.find(a => a.id === id);
        if (!asistencia) {
            console.error('Asistencia no encontrada:', id);
            return;
        }

        console.log('Iniciando edición de asistencia:', asistencia);

        // Marcar que estamos en modo edición
        this.editandoAsistencia = true;

        // Limpiar completamente el formulario antes de poblar
        this.limpiarFormularioAsistencia();

        // Poblar el formulario con los datos existentes de manera segura
        this.poblarFormularioAsistencia(asistencia);

        // Actualizar título del modal
        const diaCorrecto = this.getDiaSemana(asistencia.fecha);
        const modalTitulo = document.querySelector('#modalAsistencia .modal-header h2');
        if (modalTitulo) {
            modalTitulo.textContent = `Editar Asistencia - ${asistencia.fecha} (${diaCorrecto})`;
        }

        this.abrirModal('modalAsistencia');
    }

    limpiarFormularioAsistencia() {
        // Limpiar todos los campos de manera segura
        const campos = [
            'asistenciaId',
            'asistenciaEmpleado', 
            'asistenciaFecha',
            'asistenciaTipo',
            'asistenciaHoras',
            'asistenciaHorasExtra',
            'asistenciaDetalle'
        ];
        
        campos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                if (elemento.type === 'number') {
                    elemento.value = id === 'asistenciaHorasExtra' ? '0' : '';
                } else {
                    elemento.value = '';
                }
            }
        });
        
        // Resetear el formulario completo también
        const form = document.getElementById('formAsistencia');
        if (form) {
            form.reset();
        }
        
        console.log('Formulario limpiado completamente');
    }

    poblarFormularioAsistencia(asistencia) {
        // Esperar un momento para asegurar que la limpieza se complete
        setTimeout(() => {
            // Poblar cada campo de manera segura y secuencial
            this.establecerCampo('asistenciaId', asistencia.id || '');
            this.establecerCampo('asistenciaEmpleado', asistencia.empleadoId || '');
            this.establecerCampo('asistenciaFecha', asistencia.fecha || '');
            this.establecerCampo('asistenciaTipo', asistencia.tipo || '');
            this.establecerCampo('asistenciaHoras', asistencia.horas || '');
            this.establecerCampo('asistenciaHorasExtra', asistencia.horasExtra || 0);
            
            // Corregir detalle si es necesario
            let detalle = asistencia.detalle || '';
            if (detalle) {
                const diaCorrecto = this.getDiaSemana(asistencia.fecha);
                if (detalle.includes('Registro automático')) {
                    detalle = `Registro automático - ${diaCorrecto}`;
                } else if (detalle.includes('Día libre')) {
                    detalle = `Día libre - ${diaCorrecto}`;
                }
            }
            this.establecerCampo('asistenciaDetalle', detalle);

            console.log('Formulario poblado correctamente:', {
                id: asistencia.id,
                empleado: asistencia.empleadoId,
                fecha: asistencia.fecha,
                tipo: asistencia.tipo,
                horas: asistencia.horas,
                detalle: detalle
            });
        }, 50); // Pequeño delay para asegurar que la limpieza se complete
    }

    establecerCampo(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.value = valor;
            // Disparar evento change para que otros listeners se actualicen
            elemento.dispatchEvent(new Event('change', { bubbles: true }));
        }
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
            document.querySelector('.main-content').classList.toggle('expanded');
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
                email: document.getElementById('empleadoEmail').value
            };

            if (id) {
                this.editarEmpleado(id, datos);
            } else {
                this.agregarEmpleado(datos);
            }

            this.cerrarModal('modalEmpleado');
        });

        document.getElementById('searchEmpleado')?.addEventListener('input', (e) => {
            const resultados = this.buscarEmpleado(e.target.value);
            this.renderEmpleados(resultados);
        });

        // Asistencias
        document.getElementById('btnNuevaAsistencia')?.addEventListener('click', () => {
            // Resetear modo de edición
            this.editandoAsistencia = false;
            
            // Limpiar completamente el formulario
            this.limpiarFormularioAsistencia();
            
            // Establecer fecha actual
            document.getElementById('asistenciaFecha').value = new Date().toISOString().split('T')[0];
            
            // Actualizar título del modal
            const modalTitulo = document.querySelector('#modalAsistencia .modal-header h2');
            if (modalTitulo) {
                modalTitulo.textContent = 'Nueva Asistencia';
            }
            
            this.abrirModal('modalAsistencia');
        });

        document.getElementById('btnAsistenciaAutomatica')?.addEventListener('click', () => {
            this.abrirModalRegistroAutomatico();
        });


        // Auto-completar horas según jornada del empleado seleccionado
        document.getElementById('asistenciaEmpleado')?.addEventListener('change', (e) => {
            // No auto-completar si estamos editando una asistencia existente
            if (this.editandoAsistencia) {
                console.log('Editando asistencia existente, no auto-completar');
                return;
            }

            const empleadoId = e.target.value;
            const empleado = this.empleados.find(emp => emp.id === empleadoId);
            if (empleado) {
                const horasJornada = this.getHorasJornada(empleado.jornada);
                // Para jornada acumulativa, no auto-completar (se registran las horas reales)
                if (empleado.jornada !== 'acumulativa') {
                    document.getElementById('asistenciaHoras').value = horasJornada;
                } else {
                    document.getElementById('asistenciaHoras').value = ''; // Dejar vacío para que se ingrese manualmente
                }
            }
        });

        // Actualizar título del modal cuando cambie la fecha
        document.getElementById('asistenciaFecha')?.addEventListener('change', (e) => {
            const fecha = e.target.value;
            if (fecha) {
                const diaSemana = this.getDiaSemana(fecha);
                const modalTitulo = document.querySelector('#modalAsistencia .modal-header h2');
                if (modalTitulo) {
                    modalTitulo.textContent = `Asistencia - ${fecha} (${diaSemana})`;
                }
            }
        });

        // Cambiar horas según tipo de asistencia
        document.getElementById('asistenciaTipo')?.addEventListener('change', (e) => {
            // No cambiar horas si estamos editando una asistencia existente
            if (this.editandoAsistencia) {
                console.log('Editando asistencia existente, no cambiar horas automáticamente');
                return;
            }

            const tipo = e.target.value;
            const empleadoId = document.getElementById('asistenciaEmpleado').value;
            const empleado = this.empleados.find(emp => emp.id === empleadoId);
            
            if (tipo === 'presente' && empleado) {
                // Para presente, poner horas de jornada (excepto acumulativa)
                if (empleado.jornada !== 'acumulativa') {
                    document.getElementById('asistenciaHoras').value = this.getHorasJornada(empleado.jornada);
                } else {
                    // Para acumulativa, dejar vacío para ingresar horas reales
                    document.getElementById('asistenciaHoras').value = '';
                }
            } else if (tipo === 'ausencia' || tipo === 'incapacidad_ccss' || tipo === 'incapacidad_ins') {
                // Para ausencias e incapacidades, poner 0
                document.getElementById('asistenciaHoras').value = 0;
            }
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

            // Resetear modo de edición
            this.editandoAsistencia = false;
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

            if (!fechaInicio || !fechaFin) {
                alert('Por favor seleccione las fechas de inicio y fin');
                return;
            }

            const planilla = this.calcularPlanilla(periodo, fechaInicio, fechaFin);
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
                    alert('Seleccione un empleado desde la planilla para generar su constancia');
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
        }
    }
}

// Inicializar el sistema
let sistema;
document.addEventListener('DOMContentLoaded', () => {
    sistema = new SistemaPlanillas();
    sistema.renderEmpleados();
    sistema.actualizarSelectsEmpleados();
});

