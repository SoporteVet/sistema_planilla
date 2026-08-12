/**
 * Liquidaciones Module - Sistema de Planillas Costa Rica
 * Cálculo de liquidaciones laborales según normativa costarricense
 */

const LiquidacionesModule = {
    empleados: [],
    planillas: [],
    liquidaciones: [],
    liquidacionesRef: null,

    // Tabla de cesantía según antigüedad (Código de Trabajo Costa Rica)
    // Nota: Para menos de 1 año, son días fijos. Para 1+ años, son días POR CADA AÑO que se suman.
    CESANTIA_MENOS_1_ANIO: [
        { desdeMeses: 0, hastaMeses: 3, dias: 0 },     // Menos de 3 meses: 0 días
        { desdeMeses: 3, hastaMeses: 6, dias: 7 },     // 3-6 meses: 7 días
        { desdeMeses: 6, hastaMeses: 12, dias: 14 }    // 6-12 meses: 14 días
    ],
    
    // Días de cesantía POR CADA AÑO trabajado (se suman)
    // Ejemplo: 3 años = 19.5 (año 1) + 20 (año 2) + 20.5 (año 3) = 60 días
    CESANTIA_POR_ANIO: [
        { anio: 1, dias: 19.5 },    // 1 año: 19.5 días
        { anio: 2, dias: 20 },      // 2 años: 20 días
        { anio: 3, dias: 20.5 },    // 3 años: 20.5 días
        { anio: 4, dias: 21 },      // 4 años: 21 días
        { anio: 5, dias: 21.5 },    // 5 años: 21.5 días
        { anio: 6, dias: 22 },      // 6 años: 22 días
        { anio: 7, dias: 22 },      // 7 años: 22 días
        { anio: 8, dias: 22 }       // 8 años o más: 22 días (tope máximo reconocido)
    ],

    // Tabla de preaviso según antigüedad
    TABLA_PREAVISO: [
        { desde: 0, hasta: 3, dias: 0 },           // Menos de 3 meses: 0 días
        { desde: 3, hasta: 6, dias: 7 },           // 3-6 meses: 1 semana
        { desde: 6, hasta: 12, dias: 15 },         // 6-12 meses: 15 días
        { desde: 12, hasta: Infinity, dias: 30 }   // Más de 1 año: 1 mes
    ],

    init() {
        // No cargar datos aquí - se cargarán cuando se renderice la vista
    },

    async cargarDatos() {
        try {
            this.empleados = await FirebaseHelpers.getEmpleados();
            
            // Escuchar planillas para obtener datos salariales
            FirebaseHelpers.listenPlanillas((planillas) => {
                this.planillas = planillas.sort((a, b) => b.fechaGeneracion - a.fechaGeneracion);
            });

            // Escuchar liquidaciones
            this.suscribirseLiquidaciones();
            this.render();
        } catch (error) {
            console.error('Error cargando datos de liquidaciones:', error);
            Utils.showToast('No se pudieron cargar los datos', 'error');
        }
    },

    suscribirseLiquidaciones() {
        if (this.liquidacionesRef) {
            this.liquidacionesRef.off();
        }

        this.liquidacionesRef = FirebaseHelpers.onValue(CONFIG.DB_PATHS.LIQUIDACIONES, (data) => {
            this.liquidaciones = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    this.liquidaciones.push({ id: key, ...data[key] });
                });
                this.liquidaciones.sort((a, b) => b.fechaGeneracion - a.fechaGeneracion);
            }
            this.render();
        });
    },

    /**
     * Parsea una fecha desde string (YYYY-MM-DD) sin problemas de zona horaria
     * @param {string|Date|number} fecha - Fecha a parsear
     * @returns {Date} Objeto Date en zona horaria local
     */
    parsearFechaLocal(fecha) {
        if (fecha instanceof Date) {
            return fecha;
        }
        
        if (typeof fecha === 'number') {
            return new Date(fecha);
        }
        
        // Si es string en formato YYYY-MM-DD, parsear manualmente para evitar problemas de zona horaria
        if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
            const partes = fecha.split('-');
            const año = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10) - 1; // Mes es 0-indexed
            const dia = parseInt(partes[2], 10);
            return new Date(año, mes, dia);
        }
        
        // Fallback: intentar parsear normalmente
        return new Date(fecha);
    },

    /**
     * Calcula la antigüedad en meses
     */
    calcularAntiguedadMeses(fechaIngreso, fechaSalida) {
        const ingreso = this.parsearFechaLocal(fechaIngreso);
        const salida = this.parsearFechaLocal(fechaSalida);
        
        const diffTime = salida - ingreso;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = diffDays / 30.4167; // Promedio días por mes
        
        return Math.max(0, diffMonths);
    },

    /**
     * Obtiene los días de cesantía según antigüedad
     * La cesantía se calcula sumando los días correspondientes a cada año trabajado
     * Máximo 8 años reconocidos por ley
     */
    getDiasCesantia(mesesAntiguedad) {
        // Menos de 3 meses: no hay cesantía
        if (mesesAntiguedad < 3) {
            return 0;
        }
        
        // Entre 3 meses y menos de 1 año: días fijos según rango
        if (mesesAntiguedad < 12) {
            for (const tramo of this.CESANTIA_MENOS_1_ANIO) {
                if (mesesAntiguedad >= tramo.desdeMeses && mesesAntiguedad < tramo.hastaMeses) {
                    return tramo.dias;
                }
            }
            return 14; // 6-12 meses
        }
        
        // 1 año o más: sumar los días de cada año trabajado
        // Se reconocen máximo 8 años (96 meses)
        const añosCompletos = Math.min(Math.floor(mesesAntiguedad / 12), 8);
        
        let totalDias = 0;
        for (let i = 0; i < añosCompletos; i++) {
            // Obtener los días correspondientes a este año (índice i = año i+1)
            const configuracion = this.CESANTIA_POR_ANIO[i] || this.CESANTIA_POR_ANIO[this.CESANTIA_POR_ANIO.length - 1];
            totalDias += configuracion.dias;
        }
        
        console.log(`📊 Cesantía: ${añosCompletos} años completos = ${totalDias} días`);
        return totalDias;
    },

    /**
     * Obtiene los días de preaviso según antigüedad
     */
    getDiasPreaviso(mesesAntiguedad) {
        for (const tramo of this.TABLA_PREAVISO) {
            if (mesesAntiguedad >= tramo.desde && mesesAntiguedad < tramo.hasta) {
                return tramo.dias;
            }
        }
        return 30; // Máximo (1 mes)
    },

    /**
     * Obtiene el promedio salarial de los últimos 6 meses desde las planillas
     */
    async obtenerPromedioSalarial(empleadoId, fechaSalida) {
        try {
            const fechaSalidaMs = this.parsearFechaLocal(fechaSalida).getTime();
            const seisMesesAtras = fechaSalidaMs - (6 * 30 * 24 * 60 * 60 * 1000);

            // Filtrar planillas del empleado en los últimos 6 meses
            const planillasEmpleado = this.planillas
                .filter(p => {
                    const fechaPlanilla = p.fechaGeneracion || p.periodoFin;
                    return fechaPlanilla >= seisMesesAtras && 
                           fechaPlanilla <= fechaSalidaMs &&
                           p.empleados && 
                           p.empleados[empleadoId];
                })
                .sort((a, b) => b.fechaGeneracion - a.fechaGeneracion);

            if (planillasEmpleado.length === 0) {
                // Si no hay planillas, usar el salario base del empleado
                const empleado = this.empleados.find(e => e.id === empleadoId);
                return {
                    promedio: empleado?.salarioMensual || 0,
                    cantidadPlanillas: 0,
                    detalle: []
                };
            }

            // Sumar salarios brutos de las planillas
            let totalSalarios = 0;
            const detalle = [];

            planillasEmpleado.forEach(planilla => {
                const datosEmpleado = planilla.empleados[empleadoId];
                if (datosEmpleado) {
                    const salarioBruto = datosEmpleado.salarioBruto || 0;
                    totalSalarios += salarioBruto;
                    detalle.push({
                        periodo: `${Formatters.formatearFecha(planilla.periodoInicio)} - ${Formatters.formatearFecha(planilla.periodoFin)}`,
                        salarioBruto: salarioBruto
                    });
                }
            });

            // Calcular promedio (dividir entre número de planillas o 6 si son más)
            const divisor = Math.min(planillasEmpleado.length, 12); // Máximo 12 quincenas (6 meses)
            const promedio = totalSalarios / divisor;

            // Si es quincenal, multiplicar por 2 para obtener el promedio mensual
            const promedioMensual = divisor <= 6 ? promedio : promedio * 2;

            return {
                promedio: promedioMensual,
                cantidadPlanillas: planillasEmpleado.length,
                detalle: detalle
            };
        } catch (error) {
            console.error('Error obteniendo promedio salarial:', error);
            const empleado = this.empleados.find(e => e.id === empleadoId);
            return {
                promedio: empleado?.salarioMensual || 0,
                cantidadPlanillas: 0,
                detalle: []
            };
        }
    },

    /**
     * Calcula el aguinaldo proporcional
     * Período: 1 de diciembre del año anterior al 30 de noviembre del año actual
     */
    calcularAguinaldoProporcional(empleadoId, fechaSalida) {
        const salida = this.parsearFechaLocal(fechaSalida);
        const añoSalida = salida.getFullYear();
        const mesSalida = salida.getMonth(); // 0-11
        
        // Inicio del período de aguinaldo
        let inicioPeriodo;
        if (mesSalida >= 11) { // Diciembre
            inicioPeriodo = new Date(añoSalida, 11, 1); // 1 dic del año actual
        } else {
            inicioPeriodo = new Date(añoSalida - 1, 11, 1); // 1 dic del año anterior
        }

        // Contar meses trabajados en el período
        let mesesTrabajados = 0;
        const fechaTemp = new Date(inicioPeriodo);
        
        while (fechaTemp <= salida) {
            mesesTrabajados++;
            fechaTemp.setMonth(fechaTemp.getMonth() + 1);
        }
        mesesTrabajados = Math.min(mesesTrabajados, 12);

        return {
            mesesTrabajados,
            inicioPeriodo,
            finPeriodo: salida
        };
    },

    /**
     * Calcula las vacaciones pendientes
     * Según Código de Trabajo: 14 días por año completo trabajado
     * Si el usuario especifica días de vacaciones pendientes, usar ese valor
     */
    calcularVacacionesPendientes(fechaIngreso, fechaSalida, diasTomados = 0, diasVacacionesPendientesManual = null) {
        // Si se especifica manualmente, usar ese valor
        if (diasVacacionesPendientesManual !== null && diasVacacionesPendientesManual !== undefined) {
            return {
                diasAcumulados: diasVacacionesPendientesManual + diasTomados,
                diasTomados,
                diasPendientes: diasVacacionesPendientesManual,
                diasTrabajados: 0,
                añosCompletos: 0
            };
        }

        const ingreso = this.parsearFechaLocal(fechaIngreso);
        const salida = this.parsearFechaLocal(fechaSalida);
        
        // Calcular días totales trabajados
        const diffTime = salida - ingreso;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Calcular años completos trabajados
        const añosCompletos = Math.floor(diffDays / 365.25);
        
        // Vacaciones: 14 días por año completo (según Código de Trabajo)
        // Si trabajó menos de un año, no acumula vacaciones
        const diasAcumulados = añosCompletos * 14;
        const diasPendientes = Math.max(0, diasAcumulados - diasTomados);

        return {
            diasAcumulados: diasAcumulados,
            diasTomados,
            diasPendientes: diasPendientes,
            diasTrabajados: diffDays,
            añosCompletos: añosCompletos
        };
    },

    /**
     * Calcula la liquidación completa
     */
    async calcularLiquidacion(empleadoId, datosLiquidacion) {
        const {
            fechaSalida,
            tipoSalida,
            huboPreaviso = false,
            diasVacacionesTomadas = 0,
            diasVacacionesPendientes = null,
            observaciones = '',
            usarSalarioManual = false,
            salarioManual = 0,
            usarSalarios6Meses = false,
            salariosManual6Meses = []
        } = datosLiquidacion;

        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) {
            throw new Error('Empleado no encontrado');
        }

        // Calcular antigüedad
        const mesesAntiguedad = this.calcularAntiguedadMeses(empleado.fechaIngreso, fechaSalida);
        const añosAntiguedad = Math.floor(mesesAntiguedad / 12);
        const mesesRestantes = Math.round(mesesAntiguedad % 12);

        // Determinar salario base a usar para la liquidación
        let salarioPromedio = 0;
        let fuenteSalario = 'planillas'; // planillas | manual | salario_base | manual_6meses
        let datosSalariales = null; // Para guardar datos de planillas si se usan

        const salarioManualNumero = parseFloat(salarioManual) || 0;

        // Opción 1: salarios manuales de los últimos 6 meses (PRIORIDAD MÁXIMA - NO MEZCLAR CON PLANILLAS)
        // Convertir a números y filtrar valores válidos
        const salarios6 = Array.isArray(salariosManual6Meses)
            ? salariosManual6Meses
                .map(v => {
                    // Si es string, convertir a número
                    if (typeof v === 'string') {
                        const num = parseFloat(v);
                        return isNaN(num) ? null : num;
                    }
                    // Si ya es número, verificar que sea válido
                    return (typeof v === 'number' && v > 0) ? v : null;
                })
                .filter(v => v !== null && v > 0)
            : [];

        if (usarSalarios6Meses && salarios6.length > 0) {
            // MÉTODO MTSS: Normalizar mes parcial a equivalente de 30 días, luego promediar entre 6
            const fechaSalidaDate = this.parsearFechaLocal(fechaSalida);
            const diaSalida = fechaSalidaDate.getDate();
            const diasEnMesSalida = new Date(fechaSalidaDate.getFullYear(), fechaSalidaDate.getMonth() + 1, 0).getDate();
            const DIAS_MES_BASE = 30;
            
            // El mes es completo solo si sale el último día del mes
            const esMesCompleto = diaSalida >= diasEnMesSalida;
            
            let sumaTotal = 0;
            console.log('🔵 MÉTODO MTSS - Desglose (normalización a 30 días):');
            for (let i = 0; i < salarios6.length; i++) {
                if (i === salarios6.length - 1 && !esMesCompleto) {
                    // Mes parcial: normalizar al equivalente de 30 días (método MTSS)
                    // salario_normalizado = salario_real × 30 / días_trabajados
                    const salarioNormalizado = (salarios6[i] * DIAS_MES_BASE) / diaSalida;
                    sumaTotal += salarioNormalizado;
                    console.log(`  Mes ${i + 1} (parcial ${diaSalida} días → normalizado): ₡${salarios6[i].toLocaleString()} × 30 ÷ ${diaSalida} = ₡${salarioNormalizado.toLocaleString('es-CR', {maximumFractionDigits: 2})}`);
                } else {
                    sumaTotal += salarios6[i];
                    console.log(`  Mes ${i + 1}: ₡${salarios6[i].toLocaleString()}`);
                }
            }
            
            // Promedio = suma de los 6 salarios normalizados / 6 (método MTSS)
            salarioPromedio = sumaTotal / salarios6.length;
            fuenteSalario = 'manual_6meses';
            
            console.log('  ─────────────────────────────');
            console.log(`  Día de salida: ${diaSalida} de ${diasEnMesSalida} días del mes (${esMesCompleto ? 'MES COMPLETO' : 'MES PARCIAL - normalizado'})`);
            console.log(`  Suma normalizada: ₡${sumaTotal.toLocaleString('es-CR', {maximumFractionDigits: 2})}`);
            console.log(`  Promedio mensual: ₡${sumaTotal.toLocaleString('es-CR', {maximumFractionDigits: 2})} ÷ ${salarios6.length} = ₡${salarioPromedio.toLocaleString('es-CR', {maximumFractionDigits: 2})}`);
            console.log(`  Salario diario: ₡${salarioPromedio.toLocaleString('es-CR', {maximumFractionDigits: 2})} ÷ 30 = ₡${(salarioPromedio / 30).toLocaleString('es-CR', {maximumFractionDigits: 2})}`);
        } else if (usarSalarioManual && salarioManualNumero > 0) {
            // Opción 2: salario manual mensual fijo (NO MEZCLAR CON PLANILLAS)
            salarioPromedio = salarioManualNumero;
            fuenteSalario = 'manual';
        } else {
            // Opción 3: Obtener promedio salarial de últimos 6 meses desde planillas (AUTOMÁTICO)
            datosSalariales = await this.obtenerPromedioSalarial(empleadoId, fechaSalida);
            salarioPromedio = datosSalariales.promedio;
            
            // Si no hay planillas, usar salario base del empleado como fallback
            if ((!salarioPromedio || salarioPromedio === 0) && empleado.salarioMensual) {
                salarioPromedio = empleado.salarioMensual;
                fuenteSalario = 'salario_base';
            } else {
                fuenteSalario = 'planillas';
            }
        }

        // Salario diario = promedio mensual / 30 (según normativa costarricense)
        const salarioDiario = salarioPromedio / 30;
        
        // Debug: mostrar valores calculados
        console.log('📊 Cálculo de Liquidación:');
        console.log('  - Salario Promedio:', salarioPromedio, 'Fuente:', fuenteSalario);
        console.log('  - Salario Diario:', salarioDiario);
        console.log('  - Antigüedad:', mesesAntiguedad, 'meses');

        // Determinar si aplica cesantía y preaviso según tipo de salida
        const aplicaCesantia = tipoSalida === 'despido_responsabilidad';
        // Preaviso: solo aplica si NO se dio preaviso trabajado
        // Si huboPreaviso = true, significa que se dio preaviso trabajado, entonces NO se paga en dinero
        const aplicaPreaviso = tipoSalida === 'despido_responsabilidad' && !huboPreaviso;

        // Calcular preaviso (0 si se dio preaviso trabajado)
        const diasPreaviso = aplicaPreaviso ? this.getDiasPreaviso(mesesAntiguedad) : 0;
        const montoPreaviso = diasPreaviso * salarioDiario;
        console.log('  - Preaviso:', diasPreaviso, 'días =', montoPreaviso, '(aplica:', aplicaPreaviso, ', huboPreaviso:', huboPreaviso, ')');

        // Calcular cesantía
        const diasCesantia = aplicaCesantia ? this.getDiasCesantia(mesesAntiguedad) : 0;
        const montoCesantia = diasCesantia * salarioDiario;
        console.log('  - Cesantía:', diasCesantia, 'días =', montoCesantia);

        // Calcular vacaciones pendientes
        // Si el usuario especificó días de vacaciones pendientes manualmente, usar ese valor
        const vacaciones = this.calcularVacacionesPendientes(
            empleado.fechaIngreso, 
            fechaSalida, 
            diasVacacionesTomadas,
            diasVacacionesPendientes
        );
        const montoVacaciones = vacaciones.diasPendientes * salarioDiario;

        // Calcular aguinaldo proporcional
        const datosAguinaldo = this.calcularAguinaldoProporcional(empleadoId, fechaSalida);
        
        // MÉTODO MTSS: Aguinaldo = suma de salarios reales del período (1 dic al 30 nov) / 12
        // Esto coincide con lo que calcula la calculadora oficial del MTSS
        let montoAguinaldo;
        if (usarSalarios6Meses && salarios6.length > 0) {
            const fechaSalidaDate = this.parsearFechaLocal(fechaSalida);
            const mesSalida = fechaSalidaDate.getMonth(); // 0=Ene, 11=Dic
            // Meses del período de aguinaldo (Dic 1 a fecha salida) que están en salarios6
            // Si sale en Dic: 1 mes, si en Ene: 2 meses, si en Feb: 3 meses, etc.
            const mesesEnPeriodoAguinaldo = (mesSalida === 11) ? 1 : mesSalida + 2;
            
            if (mesesEnPeriodoAguinaldo <= salarios6.length) {
                // Sumar los salarios reales de los últimos N meses del array (período aguinaldo)
                const salariosAguinaldo = salarios6.slice(salarios6.length - mesesEnPeriodoAguinaldo);
                const sumaAguinaldo = salariosAguinaldo.reduce((sum, s) => sum + s, 0);
                montoAguinaldo = sumaAguinaldo / 12;
                console.log(`  - Aguinaldo MTSS: [${salariosAguinaldo.map(s => s.toLocaleString()).join(' + ')}] = ${sumaAguinaldo.toLocaleString()} ÷ 12 = ${montoAguinaldo.toFixed(2)}`);
            } else {
                // Fallback si el período de aguinaldo supera los 6 meses disponibles
                montoAguinaldo = (salarioPromedio * datosAguinaldo.mesesTrabajados) / 12;
                console.log(`  - Aguinaldo (fallback): ${datosAguinaldo.mesesTrabajados} meses = ${montoAguinaldo}`);
            }
        } else {
            montoAguinaldo = (salarioPromedio * datosAguinaldo.mesesTrabajados) / 12;
        }
        console.log('  - Aguinaldo:', datosAguinaldo.mesesTrabajados, 'meses =', montoAguinaldo);
        console.log('  - Vacaciones:', vacaciones.diasPendientes, 'días =', montoVacaciones);

        // Calcular total
        const totalBruto = montoPreaviso + montoCesantia + montoVacaciones + montoAguinaldo;
        console.log('  - TOTAL:', totalBruto);

        return {
            empleadoId,
            empleado: {
                nombre: empleado.nombre,
                cedula: empleado.cedula,
                cargo: empleado.cargo,
                departamento: empleado.departamento,
                fechaIngreso: empleado.fechaIngreso
            },
            fechaSalida: this.parsearFechaLocal(fechaSalida).getTime(),
            tipoSalida,
            tipoSalidaTexto: this.getTipoSalidaTexto(tipoSalida),
            huboPreaviso,
            antiguedad: {
                meses: Math.round(mesesAntiguedad * 100) / 100,
                años: añosAntiguedad,
                mesesRestantes
            },
            salarios: {
                promedioMensual: salarioPromedio,
                diario: salarioDiario,
                fuente: fuenteSalario,
                manual6Meses: usarSalarios6Meses ? salarios6 : [],
                cantidadPlanillasAnalizadas: datosSalariales ? datosSalariales.cantidadPlanillas : 0,
                detallePlanillas: datosSalariales ? datosSalariales.detalle : []
            },
            preaviso: {
                aplica: aplicaPreaviso,
                dias: diasPreaviso,
                monto: montoPreaviso
            },
            cesantia: {
                aplica: aplicaCesantia,
                dias: diasCesantia,
                monto: montoCesantia
            },
            vacaciones: {
                diasAcumulados: vacaciones.diasAcumulados,
                diasTomados: vacaciones.diasTomados,
                diasPendientes: vacaciones.diasPendientes,
                monto: montoVacaciones
            },
            aguinaldo: {
                mesesTrabajados: datosAguinaldo.mesesTrabajados,
                monto: montoAguinaldo
            },
            totalBruto,
            observaciones,
            fechaGeneracion: firebase.database.ServerValue.TIMESTAMP,
            generadaPor: FirebaseHelpers.currentUser?.uid || 'system'
        };
    },

    getTipoSalidaTexto(tipo) {
        const tipos = {
            'renuncia': 'Renuncia Voluntaria',
            'despido_responsabilidad': 'Despido con Responsabilidad Patronal',
            'despido_sin_responsabilidad': 'Despido sin Responsabilidad Patronal (Justa Causa)',
            'fin_contrato': 'Fin de Contrato',
            'mutuo_acuerdo': 'Mutuo Acuerdo',
            'fallecimiento': 'Fallecimiento',
            'jubilacion': 'Jubilación'
        };
        return tipos[tipo] || tipo;
    },

    /**
     * Actualiza las etiquetas de los meses en el formulario según la fecha de salida
     * Muestra los nombres de los meses correspondientes (6 meses hacia atrás)
     */
    actualizarEtiquetasMeses(fechaSalida) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const fecha = this.parsearFechaLocal(fechaSalida);
        const diaSalida = fecha.getDate();
        const diasEnMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
        
        // Calcular los 6 meses (desde 5 meses atrás hasta el mes de salida)
        for (let i = 1; i <= 6; i++) {
            const label = document.getElementById(`labelMes${i}`);
            if (label) {
                // Mes i: contar desde 5 meses atrás (i=1) hasta el mes actual (i=6)
                const mesesAtras = 6 - i;
                const fechaMes = new Date(fecha.getFullYear(), fecha.getMonth() - mesesAtras, 1);
                const nombreMes = meses[fechaMes.getMonth()];
                const año = fechaMes.getFullYear();
                
                if (i === 6) {
                    // Mes de salida (parcial)
                    label.textContent = `${nombreMes} ${año} (${diaSalida}/${diasEnMes} días)`;
                    label.classList.add('text-orange-600', 'font-medium');
                } else {
                    label.textContent = `${nombreMes} ${año}`;
                    label.classList.remove('text-orange-600', 'font-medium');
                }
            }
        }
    },

    render() {
        // Cargar datos si aún no se han cargado
        if (this.empleados.length === 0) {
            this.cargarDatos();
            return; // Esperar a que se carguen los datos
        }
        
        const container = document.getElementById('mainContent');
        if (!container) return;

        // Filtrar solo empleados activos (no SP)
        const empleadosActivos = this.empleados.filter(e => 
            e.estado === 'activo' && 
            e.tipoEmpleado !== 'SP'
        );

        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Liquidaciones Laborales</h1>
                        <p class="text-sm text-gray-600 mt-1">Cálculo de liquidaciones según normativa costarricense</p>
                    </div>
                    <button onclick="LiquidacionesModule.mostrarModalNueva()" class="btn btn-primary">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Nueva Liquidación
                    </button>
                </div>

                <!-- Estadísticas -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="stat-card">
                        <div class="stat-value">${empleadosActivos.length}</div>
                        <div class="stat-label">Empleados Activos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.liquidaciones.length}</div>
                        <div class="stat-label">Liquidaciones Generadas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.liquidaciones.filter(l => new Date(l.fechaGeneracion).getFullYear() === new Date().getFullYear()).length}</div>
                        <div class="stat-label">Este Año</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Formatters.formatearMoneda(this.liquidaciones.reduce((sum, l) => sum + (l.totalBruto || 0), 0))}</div>
                        <div class="stat-label">Total Liquidado</div>
                    </div>
                </div>

                <!-- Información Legal -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold text-blue-800 mb-2">📋 Información Legal - Código de Trabajo Costa Rica</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                        <div>
                            <strong>Preaviso:</strong>
                            <ul class="list-disc list-inside ml-2 mt-1">
                                <li>3-6 meses: 7 días</li>
                                <li>6-12 meses: 15 días</li>
                                <li>Más de 1 año: 30 días</li>
                            </ul>
                        </div>
                        <div>
                            <strong>Cesantía (días por año):</strong>
                            <ul class="list-disc list-inside ml-2 mt-1">
                                <li>3-6 meses: 7 días</li>
                                <li>6-12 meses: 14 días</li>
                                <li>1 año: 19.5 días</li>
                                <li>2 años: 20 días</li>
                                <li>3 años: 20.5 días</li>
                                <li>4 años: 21 días</li>
                                <li>5 años: 21.5 días</li>
                                <li>6-8 años: 22 días</li>
                            </ul>
                            <p class="text-xs mt-1 text-blue-600">Máximo 8 años reconocidos</p>
                        </div>
                        <div>
                            <strong>¿Qué se paga?</strong>
                            <ul class="list-disc list-inside ml-2 mt-1">
                                <li><strong>Con responsabilidad:</strong> Preaviso + Cesantía + Aguinaldo + Vacaciones</li>
                                <li><strong>Renuncia/Sin responsabilidad:</strong> Solo Aguinaldo + Vacaciones</li>
                            </ul>
                            <p class="text-xs mt-2 text-blue-600">Salario diario = Promedio 6 meses ÷ 30</p>
                        </div>
                    </div>
                </div>

                <!-- Historial de Liquidaciones -->
                <div class="card">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Historial de Liquidaciones</h3>
                    ${this.liquidaciones.length > 0 ? this.renderHistorial() : this.renderSinLiquidaciones()}
                </div>
            </div>
        `;

        container.innerHTML = html;
        Utils.updateBreadcrumb(['Liquidaciones']);
    },

    renderHistorial() {
        return `
            <div class="space-y-4">
                ${this.liquidaciones.map(liq => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="flex items-center space-x-3 mb-2">
                                    <h4 class="text-lg font-semibold text-gray-800">${liq.empleado?.nombre || 'Empleado'}</h4>
                                    <span class="px-2 py-1 rounded text-xs font-medium ${this.getBadgeClass(liq.tipoSalida)}">
                                        ${liq.tipoSalidaTexto || liq.tipoSalida}
                                    </span>
                                </div>
                                <p class="text-sm text-gray-600">
                                    Cédula: ${Formatters.formatearCedula(liq.empleado?.cedula)} · 
                                    Fecha Salida: ${Formatters.formatearFecha(liq.fechaSalida)}
                                </p>
                                <p class="text-sm text-gray-600">
                                    Antigüedad: ${liq.antiguedad?.años || 0} años, ${liq.antiguedad?.mesesRestantes || 0} meses
                                </p>
                                <div class="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                    <div>
                                        <span class="text-gray-600">Preaviso:</span>
                                        <span class="font-semibold ml-1 ${liq.preaviso?.aplica ? 'text-green-600' : 'text-gray-400'}">
                                            ${liq.preaviso?.aplica ? Formatters.formatearMoneda(liq.preaviso?.monto) : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600">Cesantía:</span>
                                        <span class="font-semibold ml-1 ${liq.cesantia?.aplica ? 'text-green-600' : 'text-gray-400'}">
                                            ${liq.cesantia?.aplica ? Formatters.formatearMoneda(liq.cesantia?.monto) : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600">Vacaciones:</span>
                                        <span class="font-semibold ml-1 text-green-600">${Formatters.formatearMoneda(liq.vacaciones?.monto || 0)}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600">Aguinaldo:</span>
                                        <span class="font-semibold ml-1 text-green-600">${Formatters.formatearMoneda(liq.aguinaldo?.monto || 0)}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600">Total:</span>
                                        <span class="font-bold ml-1 text-blue-600">${Formatters.formatearMoneda(liq.totalBruto || 0)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="LiquidacionesModule.verDetalle('${liq.id}')" 
                                    class="btn btn-outline btn-sm">Ver Detalle</button>
                                <button onclick="LiquidacionesModule.generarPDF('${liq.id}')" 
                                    class="btn btn-secondary btn-sm">PDF</button>
                                <button onclick="LiquidacionesModule.eliminar('${liq.id}')" 
                                    class="btn btn-danger btn-sm" title="Eliminar">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    getBadgeClass(tipo) {
        const clases = {
            'renuncia': 'bg-yellow-100 text-yellow-700',
            'despido_responsabilidad': 'bg-red-100 text-red-700',
            'despido_sin_responsabilidad': 'bg-orange-100 text-orange-700',
            'fin_contrato': 'bg-blue-100 text-blue-700',
            'mutuo_acuerdo': 'bg-purple-100 text-purple-700',
            'fallecimiento': 'bg-gray-100 text-gray-700',
            'jubilacion': 'bg-green-100 text-green-700'
        };
        return clases[tipo] || 'bg-gray-100 text-gray-700';
    },

    renderSinLiquidaciones() {
        return `
            <div class="text-center py-12">
                <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-700 mb-2">No hay liquidaciones registradas</h3>
                <p class="text-sm text-gray-500">Genere una nueva liquidación para un empleado</p>
            </div>
        `;
    },

    mostrarModalNueva() {
        const empleadosActivos = this.empleados.filter(e => 
            e.estado === 'activo' && 
            e.tipoEmpleado !== 'SP'
        );

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalLiquidacion">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 class="text-2xl font-bold">Nueva Liquidación</h2>
                        <button onclick="LiquidacionesModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <form id="formLiquidacion" class="p-6 space-y-4">
                        <div class="form-group">
                            <label class="form-label">Empleado *</label>
                            <select id="empleadoId" class="form-control" required>
                                <option value="">Seleccione un empleado...</option>
                                ${empleadosActivos.map(e => `
                                    <option value="${e.id}" data-fecha-ingreso="${e.fechaIngreso}" data-salario="${e.salarioMensual}">
                                        ${e.nombre} - ${Formatters.formatearCedula(e.cedula)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div id="infoEmpleado" class="hidden bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-700 mb-2">Información del Empleado</h4>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="text-gray-600">Fecha Ingreso:</span> <span id="empleadoFechaIngreso" class="font-medium">-</span></div>
                                <div><span class="text-gray-600">Salario Base:</span> <span id="empleadoSalario" class="font-medium">-</span></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Salario mensual para liquidación (opcional)</label>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                <div class="md:col-span-2">
                                    <input type="number" id="salarioManual" class="form-control" min="0" step="0.01" placeholder="Ej: 500000">
                                </div>
                                <div class="flex items-center space-x-2">
                                    <input type="checkbox" id="usarSalarioManual" class="rounded border-gray-300">
                                    <span class="text-sm text-gray-700">Usar este salario en lugar del promedio por planillas</span>
                                </div>
                            </div>
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Si marcas la casilla, la liquidación se calculará con este salario mensual fijo. Si no, se usará el promedio de los últimos meses (o el salario base del empleado).
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="flex items-center space-x-2 mb-2">
                                <input type="checkbox" id="usarSalarios6Meses" class="rounded border-gray-300">
                                <label class="form-label m-0">Ingresar salarios de los últimos 6 meses (método MTSS)</label>
                            </div>
                            <div id="contenedorSalarios6Meses" class="space-y-2">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    ${[1,2,3,4,5,6].map(i => `
                                        <div>
                                            <label class="text-xs text-gray-600" id="labelMes${i}">Mes ${i}</label>
                                            <input type="number" id="salarioMes${i}" class="form-control" min="0" step="0.01" placeholder="₡ Salario bruto">
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                                    <strong>📋 Método MTSS:</strong> Ingrese los salarios brutos de los últimos 6 meses. 
                                    El <strong>Mes 6</strong> es el mes de salida (puede ser parcial). El sistema calculará 
                                    automáticamente el proporcional según los días trabajados en el mes de salida.
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Fecha de Salida *</label>
                            <input type="date" id="fechaSalida" class="form-control" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Tipo de Salida *</label>
                            <select id="tipoSalida" class="form-control" required>
                                <option value="">Seleccione...</option>
                                <option value="renuncia">Renuncia Voluntaria</option>
                                <option value="despido_responsabilidad">Despido con Responsabilidad Patronal</option>
                                <option value="despido_sin_responsabilidad">Despido sin Responsabilidad Patronal (Justa Causa)</option>
                                <option value="fin_contrato">Fin de Contrato</option>
                                <option value="mutuo_acuerdo">Mutuo Acuerdo</option>
                                <option value="jubilacion">Jubilación</option>
                            </select>
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Solo "Despido con Responsabilidad Patronal" genera preaviso y cesantía
                            </div>
                        </div>

                        <div id="campoPreaviso" class="form-group hidden">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" id="huboPreaviso" class="rounded border-gray-300">
                                <span class="form-label">¿Se dio preaviso al empleado?</span>
                            </label>
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Si el empleador dio aviso previo con tiempo suficiente, no se paga preaviso en dinero
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Días de Vacaciones Pendientes (opcional)</label>
                            <input type="number" id="diasVacacionesPendientes" class="form-control" min="0" step="0.01" placeholder="Ej: 14">
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Si ingresa este valor, se usará directamente. Si no, se calculará automáticamente (14 días por año completo)
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Días de Vacaciones Ya Tomadas</label>
                            <input type="number" id="diasVacacionesTomadas" class="form-control" min="0" value="0">
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Ingrese los días de vacaciones que el empleado ya disfrutó (solo si no especificó días pendientes arriba)
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Observaciones</label>
                            <textarea id="observaciones" class="form-control" rows="3" placeholder="Observaciones adicionales..."></textarea>
                        </div>

                        <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                            <strong>Nota:</strong> El sistema calculará automáticamente:
                            <ul class="list-disc list-inside mt-1">
                                <li>Preaviso y Cesantía (si aplica según tipo de salida)</li>
                                <li>Vacaciones pendientes según antigüedad</li>
                                <li>Aguinaldo proporcional del período</li>
                                <li>Promedio salarial de los últimos 6 meses basado en planillas</li>
                            </ul>
                        </div>

                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onclick="LiquidacionesModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="button" onclick="LiquidacionesModule.previsualizarLiquidacion()" class="btn btn-secondary">
                                Previsualizar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Generar Liquidación
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        this.setupModalEventListeners();
    },

    setupModalEventListeners() {
        const form = document.getElementById('formLiquidacion');
        const empleadoSelect = document.getElementById('empleadoId');
        const tipoSalidaSelect = document.getElementById('tipoSalida');
        const fechaSalidaInput = document.getElementById('fechaSalida');
        const salarioManualInput = document.getElementById('salarioManual');

        // Establecer fecha actual por defecto
        const hoy = new Date();
        fechaSalidaInput.value = hoy.toISOString().split('T')[0];
        
        // Actualizar etiquetas de meses al cargar
        this.actualizarEtiquetasMeses(hoy);
        
        // Actualizar etiquetas cuando cambia la fecha de salida
        fechaSalidaInput.addEventListener('change', (e) => {
            if (e.target.value) {
                // Pasar el string directamente para que parsearFechaLocal lo maneje correctamente
                this.actualizarEtiquetasMeses(e.target.value);
            }
        });

        // Mostrar info del empleado al seleccionarlo
        empleadoSelect.addEventListener('change', (e) => {
            const option = e.target.selectedOptions[0];
            const infoDiv = document.getElementById('infoEmpleado');
            
            if (option && option.value) {
                const fechaIngreso = option.dataset.fechaIngreso;
                const salario = option.dataset.salario;
                
                document.getElementById('empleadoFechaIngreso').textContent = 
                    fechaIngreso ? Formatters.formatearFecha(parseInt(fechaIngreso)) : '-';
                document.getElementById('empleadoSalario').textContent = 
                    salario ? Formatters.formatearMoneda(parseFloat(salario)) : '-';

                // Prefijar el campo de salario manual con el salario base del empleado (sin obligar a usarlo)
                if (salario && salarioManualInput) {
                    salarioManualInput.value = parseFloat(salario);
                }
                
                infoDiv.classList.remove('hidden');
            } else {
                infoDiv.classList.add('hidden');
            }
        });

        // Mostrar campo de preaviso solo si es despido con responsabilidad
        tipoSalidaSelect.addEventListener('change', (e) => {
            const campoPreaviso = document.getElementById('campoPreaviso');
            if (e.target.value === 'despido_responsabilidad') {
                campoPreaviso.classList.remove('hidden');
            } else {
                campoPreaviso.classList.add('hidden');
                document.getElementById('huboPreaviso').checked = false;
            }
        });

        // Submit del formulario
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.guardarLiquidacion();
        });
    },

    async previsualizarLiquidacion() {
        const empleadoId = document.getElementById('empleadoId').value;
        const fechaSalida = document.getElementById('fechaSalida').value;
        const tipoSalida = document.getElementById('tipoSalida').value;
        const huboPreaviso = document.getElementById('huboPreaviso').checked;
        const diasVacacionesPendientes = document.getElementById('diasVacacionesPendientes').value ? parseFloat(document.getElementById('diasVacacionesPendientes').value) : null;
        const diasVacacionesTomadas = parseInt(document.getElementById('diasVacacionesTomadas').value) || 0;
        const usarSalarioManual = document.getElementById('usarSalarioManual').checked;
        const salarioManual = document.getElementById('salarioManual').value;
        const usarSalarios6Meses = document.getElementById('usarSalarios6Meses').checked;
        const salariosManual6Meses = [1,2,3,4,5,6].map(i => {
            const valor = document.getElementById(`salarioMes${i}`).value;
            return valor && parseFloat(valor) > 0 ? parseFloat(valor) : null;
        }).filter(v => v !== null);

        // Debug: mostrar valores capturados
        console.log('📝 Valores capturados del formulario:');
        console.log('  - usarSalarios6Meses:', usarSalarios6Meses);
        console.log('  - salariosManual6Meses:', salariosManual6Meses);
        console.log('  - usarSalarioManual:', usarSalarioManual);
        console.log('  - salarioManual:', salarioManual);
        console.log('  - huboPreaviso:', huboPreaviso);
        console.log('  - diasVacacionesPendientes:', diasVacacionesPendientes);

        if (!empleadoId || !fechaSalida || !tipoSalida) {
            Utils.showToast('Complete todos los campos obligatorios', 'warning');
            return;
        }

        try {
            Utils.showLoading('Calculando liquidación...');

            const liquidacion = await this.calcularLiquidacion(empleadoId, {
                fechaSalida,
                tipoSalida,
                huboPreaviso,
                diasVacacionesTomadas,
                diasVacacionesPendientes: diasVacacionesPendientes,
                usarSalarioManual,
                salarioManual,
                usarSalarios6Meses,
                salariosManual6Meses
            });

            Utils.hideLoading();
            this.mostrarPrevisualizacion(liquidacion);

        } catch (error) {
            console.error('Error calculando liquidación:', error);
            Utils.showToast('Error al calcular: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    mostrarPrevisualizacion(liquidacion) {
        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalPrevisualizacion">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 class="text-2xl font-bold">Previsualización de Liquidación</h2>
                        <button onclick="document.getElementById('modalPrevisualizacion').remove()" class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <div class="p-6 space-y-6">
                        <!-- Datos del empleado -->
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h3 class="font-semibold text-gray-800 mb-3">Datos del Empleado</h3>
                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div><span class="text-gray-600">Nombre:</span> <span class="font-medium">${liquidacion.empleado.nombre}</span></div>
                                <div><span class="text-gray-600">Cédula:</span> <span class="font-medium">${Formatters.formatearCedula(liquidacion.empleado.cedula)}</span></div>
                                <div><span class="text-gray-600">Cargo:</span> <span class="font-medium">${liquidacion.empleado.cargo}</span></div>
                                <div><span class="text-gray-600">Fecha Ingreso:</span> <span class="font-medium">${Formatters.formatearFecha(liquidacion.empleado.fechaIngreso)}</span></div>
                                <div><span class="text-gray-600">Fecha Salida:</span> <span class="font-medium">${Formatters.formatearFecha(liquidacion.fechaSalida)}</span></div>
                                <div><span class="text-gray-600">Tipo Salida:</span> <span class="font-medium">${liquidacion.tipoSalidaTexto}</span></div>
                            </div>
                        </div>

                        <!-- Antigüedad y Salario -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-blue-50 rounded-lg p-4">
                                <h3 class="font-semibold text-blue-800 mb-2">Antigüedad</h3>
                                <p class="text-2xl font-bold text-blue-600">${liquidacion.antiguedad.años} años, ${liquidacion.antiguedad.mesesRestantes} meses</p>
                                <p class="text-sm text-blue-600">(${liquidacion.antiguedad.meses.toFixed(2)} meses totales)</p>
                            </div>
                            <div class="bg-green-50 rounded-lg p-4">
                                <h3 class="font-semibold text-green-800 mb-2">Salario Promedio (6 meses)</h3>
                                <p class="text-2xl font-bold text-green-600">${Formatters.formatearMoneda(liquidacion.salarios.promedioMensual)}</p>
                                <p class="text-sm text-green-600">Diario: ${Formatters.formatearMoneda(liquidacion.salarios.diario)}</p>
                            <p class="text-xs text-green-700 mt-1">
                                Fuente: ${
                                    liquidacion.salarios.fuente === 'manual'
                                        ? 'Salario mensual ingresado manualmente'
                                        : liquidacion.salarios.fuente === 'manual_6meses'
                                            ? 'Promedio ingresado manualmente (últimos 6 meses)'
                                            : liquidacion.salarios.fuente === 'salario_base'
                                            ? 'Salario base registrado en el expediente del empleado'
                                            : 'Promedio calculado a partir de las últimas planillas'
                                }
                            </p>
                            </div>
                        </div>

                        <!-- Desglose de Liquidación -->
                        <div class="border rounded-lg overflow-hidden">
                            <table class="w-full">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="text-left p-3 font-semibold">Concepto</th>
                                        <th class="text-center p-3 font-semibold">Días</th>
                                        <th class="text-right p-3 font-semibold">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="border-t ${!liquidacion.preaviso.aplica ? 'bg-gray-50 text-gray-400' : ''}">
                                        <td class="p-3">
                                            Preaviso
                                            ${!liquidacion.preaviso.aplica ? '<span class="text-xs ml-2">(No aplica)</span>' : ''}
                                        </td>
                                        <td class="text-center p-3">${liquidacion.preaviso.dias}</td>
                                        <td class="text-right p-3 font-medium">${Formatters.formatearMoneda(liquidacion.preaviso.monto)}</td>
                                    </tr>
                                    <tr class="border-t ${!liquidacion.cesantia.aplica ? 'bg-gray-50 text-gray-400' : ''}">
                                        <td class="p-3">
                                            Auxilio de Cesantía
                                            ${!liquidacion.cesantia.aplica ? '<span class="text-xs ml-2">(No aplica)</span>' : ''}
                                        </td>
                                        <td class="text-center p-3">${liquidacion.cesantia.dias.toFixed(2)}</td>
                                        <td class="text-right p-3 font-medium">${Formatters.formatearMoneda(liquidacion.cesantia.monto)}</td>
                                    </tr>
                                    <tr class="border-t">
                                        <td class="p-3">
                                            Vacaciones Pendientes
                                            <span class="text-xs text-gray-500 ml-2">(${liquidacion.vacaciones.diasPendientes.toFixed(2)} días)</span>
                                        </td>
                                        <td class="text-center p-3">${liquidacion.vacaciones.diasPendientes.toFixed(2)}</td>
                                        <td class="text-right p-3 font-medium">${Formatters.formatearMoneda(liquidacion.vacaciones.monto)}</td>
                                    </tr>
                                    <tr class="border-t">
                                        <td class="p-3">
                                            Aguinaldo Proporcional
                                            <span class="text-xs text-gray-500 ml-2">(${liquidacion.aguinaldo.mesesTrabajados} meses)</span>
                                        </td>
                                        <td class="text-center p-3">-</td>
                                        <td class="text-right p-3 font-medium">${Formatters.formatearMoneda(liquidacion.aguinaldo.monto)}</td>
                                    </tr>
                                </tbody>
                                <tfoot class="bg-blue-100">
                                    <tr>
                                        <td colspan="2" class="p-3 font-bold text-blue-800">TOTAL LIQUIDACIÓN</td>
                                        <td class="text-right p-3 font-bold text-blue-800 text-lg">${Formatters.formatearMoneda(liquidacion.totalBruto)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button onclick="document.getElementById('modalPrevisualizacion').remove()" class="btn btn-outline">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modal);
    },

    async guardarLiquidacion() {
        const empleadoId = document.getElementById('empleadoId').value;
        const fechaSalida = document.getElementById('fechaSalida').value;
        const tipoSalida = document.getElementById('tipoSalida').value;
        const huboPreaviso = document.getElementById('huboPreaviso').checked;
        const diasVacacionesPendientes = document.getElementById('diasVacacionesPendientes').value ? parseFloat(document.getElementById('diasVacacionesPendientes').value) : null;
        const diasVacacionesTomadas = parseInt(document.getElementById('diasVacacionesTomadas').value) || 0;
        const observaciones = document.getElementById('observaciones').value;
        const usarSalarioManual = document.getElementById('usarSalarioManual').checked;
        const salarioManual = document.getElementById('salarioManual').value;
        const usarSalarios6Meses = document.getElementById('usarSalarios6Meses').checked;
        const salariosManual6Meses = [1,2,3,4,5,6].map(i => {
            const valor = document.getElementById(`salarioMes${i}`).value;
            return valor && parseFloat(valor) > 0 ? parseFloat(valor) : null;
        }).filter(v => v !== null);

        // Debug: mostrar valores capturados
        console.log('📝 Valores capturados del formulario (guardar):');
        console.log('  - usarSalarios6Meses:', usarSalarios6Meses);
        console.log('  - salariosManual6Meses:', salariosManual6Meses);

        if (!empleadoId || !fechaSalida || !tipoSalida) {
            Utils.showToast('Complete todos los campos obligatorios', 'warning');
            return;
        }

        try {
            Utils.showLoading('Generando liquidación...');

            const liquidacion = await this.calcularLiquidacion(empleadoId, {
                fechaSalida,
                tipoSalida,
                huboPreaviso,
                diasVacacionesTomadas,
                diasVacacionesPendientes: diasVacacionesPendientes,
                observaciones,
                usarSalarioManual,
                salarioManual,
                usarSalarios6Meses,
                salariosManual6Meses
            });

            // Guardar en Firebase
            await FirebaseHelpers.push(CONFIG.DB_PATHS.LIQUIDACIONES, liquidacion);

            Utils.hideLoading();
            Utils.showToast('Liquidación generada exitosamente', 'success');
            this.cerrarModal();

        } catch (error) {
            console.error('Error guardando liquidación:', error);
            Utils.showToast('Error al guardar: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    verDetalle(liquidacionId) {
        const liquidacion = this.liquidaciones.find(l => l.id === liquidacionId);
        if (!liquidacion) return;

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalDetalleLiquidacion">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 class="text-2xl font-bold">Detalle de Liquidación</h2>
                        <button onclick="LiquidacionesModule.cerrarModalDetalle()" class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <div class="p-6 space-y-6">
                        <!-- Encabezado -->
                        <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
                            <h3 class="text-xl font-bold">${liquidacion.empleado?.nombre}</h3>
                            <p class="text-blue-200">Cédula: ${Formatters.formatearCedula(liquidacion.empleado?.cedula)}</p>
                            <p class="text-blue-200">${liquidacion.empleado?.cargo} - ${liquidacion.empleado?.departamento}</p>
                            <div class="mt-4 flex justify-between items-end">
                                <div>
                                    <p class="text-sm text-blue-200">Tipo de Salida</p>
                                    <p class="font-semibold">${liquidacion.tipoSalidaTexto}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-blue-200">Total Liquidación</p>
                                    <p class="text-3xl font-bold">${Formatters.formatearMoneda(liquidacion.totalBruto)}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Fechas y Antigüedad -->
                        <div class="grid grid-cols-3 gap-4">
                            <div class="bg-gray-50 rounded-lg p-4 text-center">
                                <p class="text-gray-600 text-sm">Fecha de Ingreso</p>
                                <p class="font-bold text-lg">${Formatters.formatearFecha(liquidacion.empleado?.fechaIngreso)}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-4 text-center">
                                <p class="text-gray-600 text-sm">Fecha de Salida</p>
                                <p class="font-bold text-lg">${Formatters.formatearFecha(liquidacion.fechaSalida)}</p>
                            </div>
                            <div class="bg-blue-50 rounded-lg p-4 text-center">
                                <p class="text-blue-600 text-sm">Antigüedad</p>
                                <p class="font-bold text-lg text-blue-800">${liquidacion.antiguedad?.años} años, ${liquidacion.antiguedad?.mesesRestantes} meses</p>
                            </div>
                        </div>

                        <!-- Base de Cálculo -->
                        <div class="bg-green-50 rounded-lg p-4">
                            <h4 class="font-semibold text-green-800 mb-2">Base de Cálculo</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-green-600 text-sm">Salario Promedio Mensual (6 meses)</p>
                                    <p class="font-bold text-green-800">${Formatters.formatearMoneda(liquidacion.salarios?.promedioMensual)}</p>
                                </div>
                                <div>
                                    <p class="text-green-600 text-sm">Salario Diario</p>
                                    <p class="font-bold text-green-800">${Formatters.formatearMoneda(liquidacion.salarios?.diario)}</p>
                                </div>
                            </div>
                            <p class="text-xs text-green-700 mt-2">
                                Fuente: ${
                                    liquidacion.salarios?.fuente === 'manual'
                                        ? 'Salario mensual ingresado manualmente'
                                        : liquidacion.salarios?.fuente === 'manual_6meses'
                                            ? 'Promedio ingresado manualmente (últimos 6 meses)'
                                            : liquidacion.salarios?.fuente === 'salario_base'
                                            ? 'Salario base registrado en el expediente del empleado'
                                            : 'Promedio calculado a partir de las últimas planillas'
                                }
                            </p>
                            ${liquidacion.salarios?.cantidadPlanillasAnalizadas > 0 ? `
                                <p class="text-xs text-green-600 mt-2">Basado en ${liquidacion.salarios.cantidadPlanillasAnalizadas} planilla(s) encontrada(s)</p>
                            ` : ''}
                        </div>

                        <!-- Desglose -->
                        <div class="border rounded-lg overflow-hidden">
                            <table class="w-full">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="text-left p-4 font-semibold">Concepto</th>
                                        <th class="text-center p-4 font-semibold">Días/Detalle</th>
                                        <th class="text-right p-4 font-semibold">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="border-t ${!liquidacion.preaviso?.aplica ? 'bg-gray-50 text-gray-400' : ''}">
                                        <td class="p-4">
                                            <div class="font-medium">Preaviso</div>
                                            <div class="text-xs text-gray-500">${liquidacion.preaviso?.aplica ? 'Aplica por despido con responsabilidad' : liquidacion.huboPreaviso ? 'Se dio preaviso trabajado' : 'No aplica según tipo de salida'}</div>
                                        </td>
                                        <td class="text-center p-4">${liquidacion.preaviso?.dias || 0} días</td>
                                        <td class="text-right p-4 font-medium">${Formatters.formatearMoneda(liquidacion.preaviso?.monto || 0)}</td>
                                    </tr>
                                    <tr class="border-t ${!liquidacion.cesantia?.aplica ? 'bg-gray-50 text-gray-400' : ''}">
                                        <td class="p-4">
                                            <div class="font-medium">Auxilio de Cesantía</div>
                                            <div class="text-xs text-gray-500">${liquidacion.cesantia?.aplica ? 'Según tabla de antigüedad (máx. 8 años)' : 'No aplica según tipo de salida'}</div>
                                        </td>
                                        <td class="text-center p-4">${(liquidacion.cesantia?.dias || 0).toFixed(2)} días</td>
                                        <td class="text-right p-4 font-medium">${Formatters.formatearMoneda(liquidacion.cesantia?.monto || 0)}</td>
                                    </tr>
                                    <tr class="border-t">
                                        <td class="p-4">
                                            <div class="font-medium">Vacaciones Pendientes</div>
                                            <div class="text-xs text-gray-500">Acumuladas: ${(liquidacion.vacaciones?.diasAcumulados || 0).toFixed(2)} - Tomadas: ${liquidacion.vacaciones?.diasTomados || 0}</div>
                                        </td>
                                        <td class="text-center p-4">${(liquidacion.vacaciones?.diasPendientes || 0).toFixed(2)} días</td>
                                        <td class="text-right p-4 font-medium">${Formatters.formatearMoneda(liquidacion.vacaciones?.monto || 0)}</td>
                                    </tr>
                                    <tr class="border-t">
                                        <td class="p-4">
                                            <div class="font-medium">Aguinaldo Proporcional</div>
                                            <div class="text-xs text-gray-500">Meses trabajados en período: ${liquidacion.aguinaldo?.mesesTrabajados || 0}</div>
                                        </td>
                                        <td class="text-center p-4">${liquidacion.aguinaldo?.mesesTrabajados || 0}/12</td>
                                        <td class="text-right p-4 font-medium">${Formatters.formatearMoneda(liquidacion.aguinaldo?.monto || 0)}</td>
                                    </tr>
                                </tbody>
                                <tfoot class="bg-blue-600 text-white">
                                    <tr>
                                        <td colspan="2" class="p-4 font-bold text-lg">TOTAL LIQUIDACIÓN</td>
                                        <td class="text-right p-4 font-bold text-2xl">${Formatters.formatearMoneda(liquidacion.totalBruto)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        ${liquidacion.observaciones ? `
                            <div class="bg-yellow-50 rounded-lg p-4">
                                <h4 class="font-semibold text-yellow-800 mb-2">Observaciones</h4>
                                <p class="text-yellow-700">${liquidacion.observaciones}</p>
                            </div>
                        ` : ''}

                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button onclick="LiquidacionesModule.generarPDF('${liquidacion.id}')" class="btn btn-secondary">
                                Descargar PDF
                            </button>
                            <button onclick="LiquidacionesModule.cerrarModalDetalle()" class="btn btn-outline">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
    },

    /**
     * Formatea un monto para PDF con símbolo de colones y separadores de miles
     * @param {number} monto - Monto a formatear
     * @param {boolean} incluirDecimales - Si incluir decimales (por defecto true)
     * @returns {string} Monto formateado (ej: "¢480 000,00")
     */
    formatearMonedaPDF(monto, incluirDecimales = true) {
        // Usar símbolo de centavos para colones costarricenses
        const simboloColones = '¢'; // Símbolo de centavos
        
        if (monto === null || monto === undefined || isNaN(monto) || monto === 0) {
            return incluirDecimales ? `${simboloColones}0,00` : `${simboloColones}0`;
        }
        
        const numero = parseFloat(monto);
        
        // Formatear con separadores de miles y decimales
        if (incluirDecimales) {
            const partes = numero.toFixed(2).split('.');
            // Agregar separadores de miles (espacios cada 3 dígitos desde la derecha)
            let parteEntera = partes[0];
            let parteEnteraFormateada = '';
            let contador = 0;
            for (let i = parteEntera.length - 1; i >= 0; i--) {
                if (contador > 0 && contador % 3 === 0) {
                    parteEnteraFormateada = ' ' + parteEnteraFormateada;
                }
                parteEnteraFormateada = parteEntera[i] + parteEnteraFormateada;
                contador++;
            }
            return `${simboloColones}${parteEnteraFormateada},${partes[1]}`;
        } else {
            // Sin decimales, solo parte entera
            const parteEntera = Math.round(numero).toString();
            let parteEnteraFormateada = '';
            let contador = 0;
            for (let i = parteEntera.length - 1; i >= 0; i--) {
                if (contador > 0 && contador % 3 === 0) {
                    parteEnteraFormateada = ' ' + parteEnteraFormateada;
                }
                parteEnteraFormateada = parteEntera[i] + parteEnteraFormateada;
                contador++;
            }
            return `${simboloColones}${parteEnteraFormateada}`;
        }
    },

    async generarPDF(liquidacionId) {
        const liquidacion = this.liquidaciones.find(l => l.id === liquidacionId);
        if (!liquidacion) {
            Utils.showToast('Liquidación no encontrada', 'error');
            return;
        }

        try {
            Utils.showLoading('Generando PDF...');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configurar para soportar caracteres especiales (UTF-8)
            // Nota: jsPDF por defecto usa Helvetica que soporta caracteres latinos básicos
            
            // Determinar qué logo usar según el departamento del empleado
            let rutaLogo = 'img/vete.jpg'; // Logo por defecto
            const departamento = (liquidacion.empleado?.departamento || '').toLowerCase();
            
            if (departamento.includes('instituto')) {
                rutaLogo = 'img/insti.jpg';
            } else if (departamento.includes('veterinaria')) {
                rutaLogo = 'img/vete.jpg';
            } else if (departamento.includes('grupo empresarial')) {
                rutaLogo = 'img/vete.jpg';
            }
            
            // Cargar y agregar logo en la esquina superior izquierda
            try {
                const rutasPosibles = [rutaLogo, `./${rutaLogo}`, `/${rutaLogo}`];
                let imgData = null;
                let logoWidth = 0;
                let logoHeight = 0;
                
                for (const ruta of rutasPosibles) {
                    try {
                        const response = await fetch(ruta);
                        if (response.ok) {
                            const blob = await response.blob();
                            imgData = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            });
                            
                            // Obtener dimensiones de la imagen
                            const logoImg = new Image();
                            await new Promise((resolve, reject) => {
                                logoImg.onload = () => {
                                    // Tamaño del logo en la esquina superior izquierda
                                    logoWidth = 25; // mm
                                    logoHeight = (logoImg.height * logoWidth) / logoImg.width;
                                    resolve();
                                };
                                logoImg.onerror = reject;
                                logoImg.src = imgData;
                            });
                            break; // Si se cargó exitosamente, salir del loop
                        }
                    } catch (error) {
                        console.warn(`Error al cargar logo desde ${ruta}:`, error);
                        continue; // Intentar siguiente ruta
                    }
                }
                
                // Si se cargó exitosamente, agregarlo al PDF en la esquina superior izquierda
                if (imgData && logoWidth > 0) {
                    const x = 15; // 15mm desde el borde izquierdo
                    const y = 10; // 10mm desde arriba
                    doc.addImage(imgData, 'JPEG', x, y, logoWidth, logoHeight);
                    console.log('Logo agregado exitosamente en esquina superior izquierda');
                }
            } catch (error) {
                console.warn('Error al cargar logo:', error);
                // Continuar sin logo si hay error
            }
            
            // Calcular tiempo laborado en años, meses y días de forma precisa
            const fechaIngreso = new Date(liquidacion.empleado?.fechaIngreso);
            const fechaSalida = new Date(liquidacion.fechaSalida);
            
            // Calcular años completos
            let años = fechaSalida.getFullYear() - fechaIngreso.getFullYear();
            let meses = fechaSalida.getMonth() - fechaIngreso.getMonth();
            let dias = fechaSalida.getDate() - fechaIngreso.getDate();
            
            // Ajustar si los días son negativos
            if (dias < 0) {
                meses--;
                // Obtener días del mes anterior
                const mesAnterior = new Date(fechaSalida.getFullYear(), fechaSalida.getMonth(), 0);
                dias += mesAnterior.getDate();
            }
            
            // Ajustar si los meses son negativos
            if (meses < 0) {
                años--;
                meses += 12;
            }

            // ===== TÍTULO =====
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('LIQUIDACION LABORAL', 105, 25, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('BOLETA PARA CALCULO DE LIQUIDACION LABORAL', 105, 32, { align: 'center' });

            // ===== DATOS DEL TRABAJADOR =====
            let y = 42;
            doc.setFontSize(9);
            
            // Líneas de datos del empleado con bordes
            const lineHeight = 6;
            const col1 = 20;
            const col2 = 60;
            const col3 = 120;
            const col4 = 150;
            
            // NOMBRE
            doc.setFont('helvetica', 'bold');
            doc.text('NOMBRE:', col1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(liquidacion.empleado?.nombre || '', col2, y);
            
            y += lineHeight;
            // CEDULA
            doc.setFont('helvetica', 'bold');
            doc.text('CEDULA:', col1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(Formatters.formatearCedula(liquidacion.empleado?.cedula) || '', col2, y);
            
            y += lineHeight;
            // PUESTO
            doc.setFont('helvetica', 'bold');
            doc.text('PUESTO:', col1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(liquidacion.empleado?.cargo || '', col2, y);
            
            y += lineHeight;
            // RAZON SOCIAL
            doc.setFont('helvetica', 'bold');
            doc.text('RAZON SOCIAL:', col1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(liquidacion.empleado?.departamento || '', col2, y);
            
            y += lineHeight;
            // MOTIVO DE SALIDA
            doc.setFont('helvetica', 'bold');
            doc.text('MOTIVO DE SALIDA:', col1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(liquidacion.tipoSalidaTexto || '', col2, y);
            
            y += lineHeight;
            // RENUNCIA / CON RESPONSABILIDAD
            const esResponsabilidad = liquidacion.tipoSalida === 'despido_responsabilidad';
            doc.setFont('helvetica', 'bold');
            doc.text('RENUNCIA:', col1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(liquidacion.tipoSalida === 'renuncia' ? 'SI' : 'NO', col2, y);
            
            doc.setFont('helvetica', 'bold');
            doc.text('FECHA INGRESO:', col3, y);
            doc.setFont('helvetica', 'normal');
            doc.text(Formatters.formatearFecha(liquidacion.empleado?.fechaIngreso) || '', col4, y);
            
            y += lineHeight;
            doc.setFont('helvetica', 'bold');
            doc.text('CON RESPONSABILIDAD:', col1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(esResponsabilidad ? 'SI' : 'NO', col2, y);
            
            doc.setFont('helvetica', 'bold');
            doc.text('FECHA DE SALIDA:', col3, y);
            doc.setFont('helvetica', 'normal');
            doc.text(Formatters.formatearFecha(liquidacion.fechaSalida) || '', col4, y);

            // ===== CUADROS DE CÁLCULOS =====
            y += 12;
            
            // --- CÁLCULO TIEMPO LABORADO ---
            doc.setFillColor(240, 240, 240);
            doc.rect(20, y, 80, 25, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('CALCULO TIEMPO LABORADO', 60, y + 5, { align: 'center' });
            
            doc.setFont('helvetica', 'normal');
            doc.text('AÑOS', 33, y + 12, { align: 'center' });
            doc.text('MESES', 60, y + 12, { align: 'center' });
            doc.text('DIAS', 87, y + 12, { align: 'center' });
            
            doc.setFont('helvetica', 'bold');
            doc.text(años.toString(), 33, y + 20, { align: 'center' });
            doc.text(meses.toString(), 60, y + 20, { align: 'center' });
            doc.text(dias.toString(), 87, y + 20, { align: 'center' });
            
            // --- CÁLCULO DÍAS VACACIONES ---
            doc.setFillColor(240, 240, 240);
            doc.rect(105, y, 85, 25, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('CALCULO DIAS VACACIONES CORRESPONDEN', 147, y + 5, { align: 'center' });
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('VACACIONES CORRESPONDEN', 110, y + 11);
            doc.text('14', 185, y + 11, { align: 'right' });
            doc.text('(+) VACACIONES AÑOS ANTERIORES', 110, y + 15);
            doc.text('0', 185, y + 15, { align: 'right' });
            doc.text('(-) VACACIONES DISFRUTADAS', 110, y + 19);
            doc.text((liquidacion.vacaciones?.diasTomados || 0).toString(), 185, y + 19, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.text('(=) VACACIONES A PAGAR', 110, y + 23);
            doc.text((liquidacion.vacaciones?.diasPendientes || 0).toFixed(2), 185, y + 23, { align: 'right' });
            
            y += 30;
            
            // --- CÁLCULO PROMEDIOS SALARIOS ---
            doc.setFillColor(240, 240, 240);
            doc.rect(20, y, 80, 20, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('CALCULO PROMEDIOS SALARIOS', 60, y + 5, { align: 'center' });
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('PERIODO', 25, y + 11);
            doc.text('MENSUAL', 65, y + 11, { align: 'right' });
            doc.text('DIARIO', 95, y + 11, { align: 'right' });
            
            doc.text('ULTIMOS 6 MESES', 25, y + 16);
            // Formatear montos y colocarlos en las columnas correspondientes
            const montoMensual = this.formatearMonedaPDF(liquidacion.salarios?.promedioMensual || 0);
            const montoDiario = this.formatearMonedaPDF(liquidacion.salarios?.diario || 0);
            // Columna MENSUAL: alinear a la derecha en x=65
            doc.text(montoMensual, 65, y + 16, { align: 'right' });
            // Columna DIARIO: alinear a la derecha en x=95 (borde derecho del cuadro)
            doc.text(montoDiario, 95, y + 16, { align: 'right' });
            
            // --- CÁLCULO DÍAS CESANTÍA ---
            doc.setFillColor(240, 240, 240);
            doc.rect(105, y, 85, 20, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('CALCULO DIAS CESANTIA CORRESPONDEN', 147, y + 5, { align: 'center' });
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('DIAS CESANTIA CORRESPONDEN', 110, y + 11);
            doc.text(esResponsabilidad ? (liquidacion.cesantia?.dias || 0).toFixed(2) : 'N/A', 185, y + 11, { align: 'right' });
            doc.text('(X) AÑOS A PAGAR SEGÚN LEY', 110, y + 15);
            doc.text(Math.min(años, 8).toString(), 185, y + 15, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.text('(=) DIAS CESANTIA POR PAGAR', 110, y + 19);
            doc.text(esResponsabilidad ? (liquidacion.cesantia?.dias || 0).toFixed(2) : '0', 185, y + 19, { align: 'right' });
            
            y += 25;
            
            // --- DÍAS PREAVISO ---
            doc.setFillColor(240, 240, 240);
            doc.rect(105, y, 85, 10, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('DIAS PREAVISO CORRESPONDEN', 147, y + 4, { align: 'center' });
            doc.text(esResponsabilidad && liquidacion.preaviso?.aplica ? (liquidacion.preaviso?.dias || 0).toString() : '0', 185, y + 8, { align: 'right' });

            // ===== TABLA DE RUBROS =====
            y += 18;
            
            doc.autoTable({
                startY: y,
                head: [['RUBRO', 'MONTO', 'DIAS / MESES', 'TOTAL']],
                body: [
                    [
                        'PREAVISO',
                        this.formatearMonedaPDF(liquidacion.salarios?.diario || 0, true),
                        (liquidacion.preaviso?.aplica ? liquidacion.preaviso?.dias : 0).toFixed(2),
                        this.formatearMonedaPDF(liquidacion.preaviso?.monto || 0, true)
                    ],
                    [
                        'CESANTIA',
                        this.formatearMonedaPDF(liquidacion.salarios?.diario || 0, true),
                        (esResponsabilidad ? liquidacion.cesantia?.dias : 0).toFixed(2),
                        this.formatearMonedaPDF(liquidacion.cesantia?.monto || 0, true)
                    ],
                    [
                        'VACACIONES',
                        this.formatearMonedaPDF(liquidacion.salarios?.diario || 0, true),
                        (liquidacion.vacaciones?.diasPendientes || 0).toFixed(2),
                        this.formatearMonedaPDF(liquidacion.vacaciones?.monto || 0, true)
                    ],
                    [
                        'AGUINALDO',
                        this.formatearMonedaPDF(liquidacion.salarios?.promedioMensual || 0, true),
                        (liquidacion.aguinaldo?.mesesTrabajados || 0).toFixed(2),
                        this.formatearMonedaPDF(liquidacion.aguinaldo?.monto || 0, true)
                    ]
                ],
                foot: [['', '', 'TOTAL', this.formatearMonedaPDF(liquidacion.totalBruto, true)]],
                theme: 'grid',
                headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 8 },
                footStyles: { 
                    fillColor: [30, 64, 175], 
                    textColor: 255, 
                    fontStyle: 'bold', 
                    fontSize: 9,
                    halign: 'right'
                },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 50, halign: 'right' },
                    2: { cellWidth: 35, halign: 'center' },
                    3: { cellWidth: 35, halign: 'right' }
                },
                margin: { left: 20, right: 20 },
                tableWidth: 170
            });

            // ===== OBSERVACIONES =====
            let finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('OBSERVACIONES:', 20, finalY);
            doc.setFont('helvetica', 'normal');
            if (liquidacion.observaciones) {
                doc.text(liquidacion.observaciones, 20, finalY + 6, { maxWidth: 170 });
                finalY += 15;
            } else {
                finalY += 10;
            }

            // ===== FIRMAS =====
            const firmasY = finalY + 20;
            
            // Línea 1 - Confecciono
            doc.line(20, firmasY, 60, firmasY);
            doc.setFontSize(8);
            doc.text('CONFECCIONO', 40, firmasY + 5, { align: 'center' });
            
            // Línea 2 - Dirección General
            doc.line(80, firmasY, 130, firmasY);
            doc.text('DIRECCION GENERAL', 105, firmasY + 5, { align: 'center' });
            
            // Línea 3 - Recibido Conforme
            doc.line(145, firmasY, 190, firmasY);
            doc.text('RECIBIDO CONFORME', 167, firmasY + 5, { align: 'center' });

            // ===== PIE DE PÁGINA =====
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text(`Documento generado el ${new Date().toLocaleString('es-CR')}`, 105, 285, { align: 'center' });
            doc.text('Sistema de Planillas - Costa Rica', 105, 290, { align: 'center' });

            // Descargar
            const nombreArchivo = `Liquidacion_${liquidacion.empleado?.nombre.replace(/\s+/g, '_')}_${Formatters.formatearFechaKey(liquidacion.fechaSalida)}.pdf`;
            doc.save(nombreArchivo);

            Utils.hideLoading();
            Utils.showToast('PDF generado exitosamente', 'success');

        } catch (error) {
            console.error('Error generando PDF:', error);
            Utils.showToast('Error al generar PDF: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    async eliminar(liquidacionId) {
        const liquidacion = this.liquidaciones.find(l => l.id === liquidacionId);
        if (!liquidacion) return;

        const mensaje = `¿Está seguro de eliminar la liquidación de ${liquidacion.empleado?.nombre}?\n\nEsta acción no se puede deshacer.`;

        if (!confirm(mensaje)) {
            return;
        }

        try {
            Utils.showLoading('Eliminando liquidación...');
            await FirebaseHelpers.remove(`${CONFIG.DB_PATHS.LIQUIDACIONES}/${liquidacionId}`);
            Utils.showToast('Liquidación eliminada exitosamente', 'success');
            Utils.hideLoading();
        } catch (error) {
            console.error('Error eliminando liquidación:', error);
            Utils.showToast('Error al eliminar: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    cerrarModal() {
        document.getElementById('modalContainer').innerHTML = '';
    },

    cerrarModalDetalle() {
        document.getElementById('modalContainer').innerHTML = '';
    }
};

// Export to window
window.LiquidacionesModule = LiquidacionesModule;
