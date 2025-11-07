/**
 * Salary Calculations - Sistema de Planillas Costa Rica
 * Cálculos precisos según normativa costarricense
 */

const Calculations = {
    /**
     * Calcula el salario diario basado en la jornada del empleado
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} horasTrabajadasDia - Horas trabajadas ese día específico (opcional, para jornadas acumulativas)
     * @returns {number} Salario diario
     */
    calcularSalarioDiario(salarioMensual, codigoJornada, horasTrabajadasDia = null) {
        const jornada = CONFIG.getJornadaByCodigo(codigoJornada);
        // Una jornada es acumulativa si tiene horasPorDiaMin definido (incluso si horasPorDiaMax es null)
        const esAcumulativa = jornada.horasPorDiaMin !== undefined && jornada.horasPorDiaMin !== null;
        
        // Si se especifican horas trabajadas del día (jornadas acumulativas), usar esas horas
        if (horasTrabajadasDia !== null && horasTrabajadasDia > 0) {
            const salarioHorario = salarioMensual / jornada.horasPorMes;
            return salarioHorario * horasTrabajadasDia;
        }
        
        // Para jornadas acumulativas, el salario diario se calcula como 8 horas
        // porque aunque trabajen 10 horas/día, tienen 2 días libres, entonces el equivalente diario es 8 horas
        // (240 horas/mes / 30 días = 8 horas/día promedio incluyendo días libres)
        if (esAcumulativa) {
            // Calcular como si fueran 8 horas/día (equivalente diario considerando días libres)
            const salarioHorario = salarioMensual / jornada.horasPorMes;
            return salarioHorario * 8; // Siempre mostrar como 8 horas/día
        }
        
        // Para jornadas normales: Salario Diario = Salario Mensual / Horas Mensuales * Horas Diarias
        return (salarioMensual / jornada.horasPorMes) * jornada.horasPorDia;
    },

    /**
     * Calcula el salario horario basado en la jornada del empleado
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} salarioHorarioDirecto - Salario horario directo (opcional, si está disponible)
     * @returns {number} Salario horario
     */
    calcularSalarioHorario(salarioMensual, codigoJornada, salarioHorarioDirecto = null) {
        // Si se proporciona salario horario directo, usarlo
        if (salarioHorarioDirecto && salarioHorarioDirecto > 0) {
            return salarioHorarioDirecto;
        }
        
        // Si no, calcular desde el salario mensual
        const jornada = CONFIG.getJornadaByCodigo(codigoJornada);
        return salarioMensual / jornada.horasPorMes;
    },

    /**
     * Calcula el pago por horas trabajadas incompletas
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} horasTrabajadas - Horas trabajadas en el día
     * @returns {object} { salarioPagado, descuento }
     */
    calcularHorasIncompletas(salarioMensual, codigoJornada, horasTrabajadas) {
        const jornada = CONFIG.getJornadaByCodigo(codigoJornada);
        const salarioDiario = this.calcularSalarioDiario(salarioMensual, codigoJornada);
        
        if (horasTrabajadas >= jornada.horasPorDia) {
            return { salarioPagado: salarioDiario, descuento: 0 };
        }
        
        const salarioPagado = salarioDiario * (horasTrabajadas / jornada.horasPorDia);
        const descuento = salarioDiario - salarioPagado;
        
        return { salarioPagado, descuento };
    },

    /**
     * Calcula el pago por horas extra (1.5x)
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} horasExtra - Número de horas extra
     * @returns {number} Monto a pagar por horas extra
     */
    calcularHorasExtra(salarioMensual, codigoJornada, horasExtra) {
        if (horasExtra <= 0) return 0;
        
        const salarioHorario = this.calcularSalarioHorario(salarioMensual, codigoJornada);
        return horasExtra * salarioHorario * CONFIG.HORAS_EXTRA.MULTIPLICADOR;
    },

    /**
     * Calcula el pago por horas adicionales (1x - pago normal)
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} horasAdicionales - Número de horas adicionales
     * @returns {number} Monto a pagar por horas adicionales
     */
    calcularHorasAdicionales(salarioMensual, codigoJornada, horasAdicionales) {
        if (horasAdicionales <= 0) return 0;
        
        const salarioHorario = this.calcularSalarioHorario(salarioMensual, codigoJornada);
        return horasAdicionales * salarioHorario; // Pago normal (1x)
    },

    /**
     * Calcula el pago por día libre trabajado (pago extraordinario)
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} horasTrabajadas - Horas trabajadas en el día libre
     * @returns {number} Monto a pagar (se paga como horas extra: 1.5x)
     */
    calcularDiaLibreTrabajado(salarioMensual, codigoJornada, horasTrabajadas) {
        if (horasTrabajadas <= 0) return 0;
        
        // Los días libres trabajados se pagan como horas extra (1.5x)
        const salarioHorario = this.calcularSalarioHorario(salarioMensual, codigoJornada);
        return horasTrabajadas * salarioHorario * CONFIG.HORAS_EXTRA.MULTIPLICADOR;
    },

    /**
     * Calcula el pago por feriados trabajados (2x)
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} diasFeriado - Número de días feriados trabajados
     * @returns {number} Monto a pagar por feriados
     */
    calcularFeriadosTrabajados(salarioMensual, codigoJornada, diasFeriado, asistenciasFeriados = []) {
        if (diasFeriado <= 0) return 0;
        
        const jornada = CONFIG.getJornadaByCodigo(codigoJornada);
        const salarioHorario = this.calcularSalarioHorario(salarioMensual, codigoJornada);
        
        // Si hay asistencias con horas específicas, calcular con horas reales
        if (asistenciasFeriados && asistenciasFeriados.length > 0) {
            let totalFeriados = 0;
            asistenciasFeriados.forEach(asist => {
                const horasDia = asist.horasTrabajadas || jornada.horasPorDia;
                // Feriado trabajado: pago doble (2x)
                totalFeriados += (salarioHorario * horasDia) * CONFIG.FERIADO_TRABAJADO.MULTIPLICADOR;
            });
            return totalFeriados;
        }
        
        // Si no hay horas específicas, usar cálculo tradicional
        const salarioDiario = this.calcularSalarioDiario(salarioMensual, codigoJornada);
        return salarioDiario * CONFIG.FERIADO_TRABAJADO.MULTIPLICADOR * diasFeriado;
    },

    /**
     * Calcula el pago de incapacidad CCSS (primeros 3 días al 50%)
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} diasCCSSEmpresa - Días que cubre la empresa (máx 3)
     * @returns {number} Monto que paga la empresa
     */
    calcularIncapacidadCCSS(salarioMensual, codigoJornada, diasCCSSEmpresa) {
        if (diasCCSSEmpresa <= 0) return 0;
        
        const diasACubrir = Math.min(diasCCSSEmpresa, CONFIG.CCSS.DIAS_EMPRESA_MAX);
        const salarioDiario = this.calcularSalarioDiario(salarioMensual, codigoJornada);
        
        return salarioDiario * CONFIG.CCSS.PORCENTAJE_INCAPACIDAD_EMPRESA * diasACubrir;
    },

    /**
     * Calcula el pago de incapacidad INS (primer día al 50%)
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} diasINSEmpresa - Días que cubre la empresa (máx 1)
     * @returns {number} Monto que paga la empresa
     */
    calcularIncapacidadINS(salarioMensual, codigoJornada, diasINSEmpresa) {
        if (diasINSEmpresa <= 0) return 0;
        
        const diasACubrir = Math.min(diasINSEmpresa, CONFIG.INS.DIAS_EMPRESA_MAX);
        const salarioDiario = this.calcularSalarioDiario(salarioMensual, codigoJornada);
        
        return salarioDiario * CONFIG.INS.PORCENTAJE_INCAPACIDAD_EMPRESA * diasACubrir;
    },

    /**
     * Calcula el descuento por permisos sin goce de salario
     * @param {number} salarioMensual - Salario mensual base
     * @param {string} codigoJornada - Código de la jornada
     * @param {number} diasPermiso - Días de permiso sin goce
     * @returns {number} Monto a descontar
     */
    calcularDescuentoPermiso(salarioMensual, codigoJornada, diasPermiso) {
        if (diasPermiso <= 0) return 0;
        
        const salarioDiario = this.calcularSalarioDiario(salarioMensual, codigoJornada);
        return salarioDiario * diasPermiso;
    },

    /**
     * Calcula el descuento de CCSS del empleado (10.67%)
     * @param {number} salarioBruto - Salario bruto
     * @returns {number} Monto de descuento CCSS
     */
    calcularDescuentoCCSS(salarioBruto) {
        return salarioBruto * CONFIG.CCSS.EMPLEADO;
    },

    /**
     * Calcula el impuesto de renta según tabla de tramos progresivos
     * @param {number} salarioBruto - Salario bruto mensual
     * @returns {number} Impuesto de renta bruto (antes de créditos)
     */
    calcularImpuestoRentaBruto(salarioBruto) {
        let impuesto = 0;
        
        // Tramo 1: 0 - 922,000 (0%)
        if (salarioBruto <= 922000) {
            return 0;
        }
        
        // Tramo 2: 922,001 - 1,352,000 (10%)
        if (salarioBruto <= 1352000) {
            impuesto = (salarioBruto - 922000) * 0.10;
            return impuesto;
        }
        
        // Tramo 3: 1,352,001 - 2,373,000 (15%)
        impuesto = 922000 * 0.10; // Del tramo anterior
        if (salarioBruto <= 2373000) {
            impuesto += (salarioBruto - 1352000) * 0.15;
            return impuesto;
        }
        
        // Tramo 4: 2,373,001 - 4,745,000 (20%)
        impuesto += (1352000 - 922000) * 0.10; // Tramo 2
        impuesto += (2373000 - 1352000) * 0.15; // Tramo 3
        if (salarioBruto <= 4745000) {
            impuesto += (salarioBruto - 2373000) * 0.20;
            return impuesto;
        }
        
        // Tramo 5: 4,745,001+ (25%)
        impuesto += (1352000 - 922000) * 0.10; // Tramo 2
        impuesto += (2373000 - 1352000) * 0.15; // Tramo 3
        impuesto += (4745000 - 2373000) * 0.20; // Tramo 4
        impuesto += (salarioBruto - 4745000) * 0.25;
        
        return impuesto;
    },

    /**
     * Calcula los créditos fiscales
     * @param {number} cantidadHijos - Cantidad de hijos
     * @param {boolean} tieneConyuge - Si tiene cónyuge
     * @returns {object} { creditoHijos, creditoConyuge, totalCreditos }
     */
    calcularCreditosFiscales(cantidadHijos, tieneConyuge) {
        const creditoHijos = CONFIG.CREDITOS_FISCALES.HIJO * Math.min(cantidadHijos, CONFIG.CREDITOS_FISCALES.MAX_HIJOS);
        const creditoConyuge = tieneConyuge ? CONFIG.CREDITOS_FISCALES.CONYUGE : 0;
        
        return {
            creditoHijos,
            creditoConyuge,
            totalCreditos: creditoHijos + creditoConyuge
        };
    },

    /**
     * Calcula el impuesto de renta neto (con créditos aplicados)
     * @param {number} salarioBruto - Salario bruto mensual
     * @param {number} cantidadHijos - Cantidad de hijos
     * @param {boolean} tieneConyuge - Si tiene cónyuge
     * @returns {object} { rentaBruta, creditos, rentaNeta }
     */
    calcularImpuestoRentaNeto(salarioBruto, cantidadHijos = 0, tieneConyuge = false) {
        const rentaBruta = this.calcularImpuestoRentaBruto(salarioBruto);
        const creditos = this.calcularCreditosFiscales(cantidadHijos, tieneConyuge);
        const rentaNeta = Math.max(0, rentaBruta - creditos.totalCreditos);
        
        return {
            rentaBruta,
            creditos,
            rentaNeta
        };
    },

    /**
     * Calcula el aguinaldo (8.33% del salario anual o salario mensual promedio / 12)
     * @param {array} salariosAnuales - Array de salarios brutos de los últimos 12 meses
     * @returns {number} Monto de aguinaldo
     */
    calcularAguinaldo(salariosAnuales) {
        if (!salariosAnuales || salariosAnuales.length === 0) return 0;
        
        const sumaAnual = salariosAnuales.reduce((sum, salario) => sum + salario, 0);
        return sumaAnual / 12;
    },

    /**
     * Calcula días de vacaciones acumulados
     * @param {Date} fechaIngreso - Fecha de ingreso del empleado
     * @param {number} diasTomados - Días de vacaciones ya tomados
     * @returns {object} { diasAcumulados, diasDisponibles, anosServicio }
     */
    calcularVacaciones(fechaIngreso, diasTomados = 0) {
        const ahora = new Date();
        const ingreso = new Date(fechaIngreso);
        const milisegundosPorAno = 1000 * 60 * 60 * 24 * 365.25;
        const anosServicio = (ahora - ingreso) / milisegundosPorAno;
        
        const diasAcumulados = anosServicio * CONFIG.VACACIONES.DIAS_POR_ANO;
        const diasDisponibles = Math.max(0, diasAcumulados - diasTomados);
        
        return {
            diasAcumulados: Math.floor(diasAcumulados * 10) / 10, // Redondear a 1 decimal
            diasDisponibles: Math.floor(diasDisponibles * 10) / 10,
            anosServicio: Math.floor(anosServicio * 10) / 10
        };
    },

    /**
     * Calcula el salario bruto consolidando todos los conceptos
     * @param {object} datos - Objeto con todos los datos del período
     * @returns {number} Salario bruto
     */
    calcularSalarioBruto(datos) {
        const {
            salarioMensual,
            codigoJornada,
            diasTrabajados = 0,
            horasExtra = 0,
            horasAdicionales = 0,
            diasFeriados = 0,
            diasLibresTrabajados = 0,
            horasDiasLibres = 0,
            diasCCSSEmpresa = 0,
            diasINSEmpresa = 0,
            diasPermiso = 0,
            bonos = 0,
            rebajos = 0,
            asistencias = []
        } = datos;

        const jornada = CONFIG.getJornadaByCodigo(codigoJornada);
        // Si hay salario horario directo en los datos, usarlo
        const salarioHorarioDirecto = datos.salarioHorario || null;
        const salarioHorario = this.calcularSalarioHorario(salarioMensual, codigoJornada, salarioHorarioDirecto);
        
        // PASO 1: Calcular salario quincenal base basado en las horas esperadas de la jornada
        const horasEsperadasQuincenales = jornada.horasPorQuincena; // Ej: 105 para mixta, 90 para nocturna, etc.
        const salarioQuincenalBase = (salarioMensual / jornada.horasPorMes) * horasEsperadasQuincenales;
        
        // PASO 2: Sumar las horas realmente trabajadas de las asistencias
        let horasLaboradas = 0; // Total de horas realmente trabajadas
        let diasIncapacidadCCSS = 0; // Contador de días de incapacidad CCSS
        let horasIncapacidadCCSSTotal = 0; // Total de horas de incapacidad CCSS (todas, para restar del salario)
        let horasIncapacidadCCSSPrimeros3Dias = 0; // Horas de incapacidad CCSS solo de los primeros 3 días (para calcular el 50% que paga CCSS)
        let pagoDiasLibresTrabajados = 0; // Días libres trabajados (pago extraordinario)
        
        if (asistencias && asistencias.length > 0) {
            asistencias.forEach(asist => {
                if (asist.tipoDia === CONFIG.TIPOS_DIA.NORMAL) {
                    // Días normales: sumar las horas trabajadas registradas
                    if (asist.horasTrabajadas !== undefined && asist.horasTrabajadas !== null) {
                        horasLaboradas += asist.horasTrabajadas;
                    } else {
                        // Si no está definido, usar las horas esperadas de la jornada
                        horasLaboradas += jornada.horasPorDia;
                    }
                } else if (asist.tipoDia === CONFIG.TIPOS_DIA.DIA_LIBRE) {
                    // Días libres: no se suman horas (ya están contempladas en el salario quincenal base)
                    // No hacer nada
                } else if (asist.tipoDia === CONFIG.TIPOS_DIA.INCOMPLETO && asist.horasTrabajadas !== undefined && asist.horasTrabajadas !== null) {
                    // Días incompletos: sumar las horas realmente trabajadas
                    horasLaboradas += asist.horasTrabajadas;
                } else if (asist.tipoDia === CONFIG.TIPOS_DIA.DIA_LIBRE_TRABAJADO && asist.horasTrabajadas) {
                    // Días libres trabajados: se pagan como extraordinario (1.5x), no se suman a horasLaboradas
                    pagoDiasLibresTrabajados += this.calcularDiaLibreTrabajado(
                        salarioMensual,
                        codigoJornada,
                        asist.horasTrabajadas
                    );
                } else if (asist.tipoDia === CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS) {
                    // Incapacidad CCSS: NO se suman a horasLaboradas
                    // Las horas de incapacidad se deben RESTAR del salario (son horas faltantes)
                    diasIncapacidadCCSS++;
                    const horasIncapacidad = asist.horasTrabajadas || jornada.horasPorDia;
                    horasIncapacidadCCSSTotal += horasIncapacidad; // Sumar todas las horas de incapacidad para restarlas
                    
                    // Solo los primeros 3 días tienen el 50% que paga CCSS
                    // Del día 4 en adelante, es 100% empresa (no se suma nada de CCSS)
                    if (diasIncapacidadCCSS <= CONFIG.CCSS.DIAS_EMPRESA_MAX) {
                        horasIncapacidadCCSSPrimeros3Dias += horasIncapacidad;
                    }
                } else if (asist.tipoDia === CONFIG.TIPOS_DIA.PERMISO_SIN_GOCE) {
                    // Permisos sin goce: NO se suman horas (se restarán del salario base)
                    // No hacer nada aquí, se calculará la ausencia al final
                }
                // NOTA: Los feriados trabajados se calculan por separado con pago doble
            });
        } else {
            // Si no hay asistencias detalladas, asumir que trabajó todas las horas esperadas
            horasLaboradas = horasEsperadasQuincenales;
        }
        
        // PASO 3: Calcular horas faltantes (diferencia entre esperadas y trabajadas)
        // IMPORTANTE: Las horas de incapacidad CCSS también son horas faltantes que se deben restar
        let horasAusencia = 0;
        const horasEsperadasMenosIncapacidad = horasEsperadasQuincenales - horasIncapacidadCCSSTotal;
        if (horasLaboradas < horasEsperadasMenosIncapacidad) {
            horasAusencia = horasEsperadasMenosIncapacidad - horasLaboradas;
        }
        // Sumar las horas de incapacidad CCSS a las horas de ausencia para que se resten del salario
        horasAusencia += horasIncapacidadCCSSTotal;
        
        // PASO 4: Calcular salario ordinario = salario quincenal base - rebajo por horas faltantes
        const rebajoPorHoras = horasAusencia * salarioHorario;
        const salarioOrdinario = salarioQuincenalBase - rebajoPorHoras;
        
        // Calcular el 50% de incapacidad CCSS que paga CCSS (solo para los primeros 3 días)
        // Del día 4 en adelante, es 100% empresa, por lo que no se suma nada de CCSS
        let montoCCSSCCSS = 0;
        if (horasIncapacidadCCSSPrimeros3Dias > 0) {
            // Solo calcular el 50% que paga CCSS para los primeros 3 días
            const horasCCSSCCSS = horasIncapacidadCCSSPrimeros3Dias * CONFIG.CCSS.PORCENTAJE_INCAPACIDAD_EMPRESA;
            montoCCSSCCSS = horasCCSSCCSS * salarioHorario;
        }
        
        // PASO 5: Sumar horas extras, horas adicionales, feriados, etc. para obtener Salario Bruto
        const pagoHorasExtra = this.calcularHorasExtra(salarioMensual, codigoJornada, horasExtra);
        
        // Calcular horas adicionales desde asistencias si no se proporciona directamente o si el valor es 0
        let horasAdicionalesTotal = horasAdicionales || 0;
        // Siempre verificar en asistencias para asegurar que se capturen todas las horas adicionales
        if (asistencias && asistencias.length > 0) {
            const horasAdicionalesDesdeAsistencias = asistencias.reduce((sum, a) => {
                const horas = parseFloat(a.horasAdicionales) || 0;
                return sum + horas;
            }, 0);
            // Usar el valor mayor entre el proporcionado y el calculado desde asistencias
            horasAdicionalesTotal = Math.max(horasAdicionalesTotal, horasAdicionalesDesdeAsistencias);
            if (horasAdicionalesDesdeAsistencias > 0) {
                console.log(`[Calculations] Horas adicionales desde asistencias: ${horasAdicionalesDesdeAsistencias}, total usado: ${horasAdicionalesTotal}`);
            }
        }
        const pagoHorasAdicionales = this.calcularHorasAdicionales(salarioMensual, codigoJornada, horasAdicionalesTotal);
        if (horasAdicionalesTotal > 0) {
            console.log(`[Calculations] Pago horas adicionales (${horasAdicionalesTotal} horas): ${pagoHorasAdicionales}`);
        }
        
        // Feriados trabajados
        const asistenciasFeriados = asistencias.filter(a => a.tipoDia === CONFIG.TIPOS_DIA.FERIADO_TRABAJADO);
        const pagoFeriados = this.calcularFeriadosTrabajados(salarioMensual, codigoJornada, diasFeriados, asistenciasFeriados);
        
        // Incapacidad INS
        const pagoINS = this.calcularIncapacidadINS(salarioMensual, codigoJornada, diasINSEmpresa);
        
        // Permisos sin goce (se restan del salario base)
        const descuentoPermisos = this.calcularDescuentoPermiso(salarioMensual, codigoJornada, diasPermiso);
        
        // Salario Bruto = Salario Ordinario + Horas Extras + Horas Adicionales + otros conceptos
        // NOTA: Los rebajos (bonos/rebajos) NO se restan aquí, se restarán DESPUÉS de calcular CCSS
        const salarioBruto = salarioOrdinario
            + pagoHorasExtra
            + pagoHorasAdicionales
            + pagoFeriados
            + pagoDiasLibresTrabajados
            + pagoINS
            - descuentoPermisos
            + bonos;
            // - rebajos; // Los rebajos se restarán DESPUÉS de CCSS
        
        // Retornar información para el cálculo de salario neto
        return {
            salarioBruto: Math.max(0, salarioBruto),
            salarioOrdinario: salarioOrdinario,
            montoCCSSCCSS: montoCCSSCCSS,
            pagoHorasAdicionales: pagoHorasAdicionales, // Pago por horas adicionales (1x)
            horasAdicionales: horasAdicionalesTotal, // Total de horas adicionales
            subtotalQuincenal: salarioQuincenalBase, // Salario quincenal base (antes de rebajos)
            rebajosPorHoras: {
                total: rebajoPorHoras,
                horasFaltantes: horasAusencia,
                horasIncapacidadCCSS: horasIncapacidadCCSSTotal, // Horas de incapacidad CCSS
                diasIncapacidadCCSS: diasIncapacidadCCSS, // Días de incapacidad CCSS
                esIncapacidadCCSS: horasIncapacidadCCSSTotal > 0, // Indica si el rebajo es por incapacidad CCSS
                detalles: horasAusencia > 0 ? [`${horasAusencia.toFixed(2)} horas de ausencia`] : []
            },
            horasLaboradas: horasLaboradas,
            horasAusencia: horasAusencia,
            rebajos: rebajos // Incluir rebajos para que se pasen al cálculo de salario neto
        };
    },

    /**
     * Calcula el salario neto final
     * @param {object} datos - Objeto con todos los datos
     * @returns {object} Desglose completo de cálculo
     */
    calcularSalarioNeto(datos) {
        const {
            salarioMensual,
            codigoJornada,
            cantidadHijos = 0,
            tieneConyuge = false,
            impuestoRentaManual = null,
            otrosDescuentos = 0,
            diasCCSSEmpresa = 0,
            tipoPeriodo = 'quincenal' // Por defecto quincenal, si no se especifica
        } = datos;

        // Calcular salario bruto (ahora retorna un objeto con más información)
        const resultadoBruto = this.calcularSalarioBruto(datos);
        const salarioBruto = typeof resultadoBruto === 'object' ? resultadoBruto.salarioBruto : resultadoBruto;
        const subtotalQuincenal = typeof resultadoBruto === 'object' ? resultadoBruto.subtotalQuincenal : 0;
        const rebajosPorHoras = typeof resultadoBruto === 'object' ? resultadoBruto.rebajosPorHoras : { total: 0, horasFaltantes: 0, detalles: [] };
        const montoCCSSCCSS = typeof resultadoBruto === 'object' ? resultadoBruto.montoCCSSCCSS : 0;
        const salarioOrdinario = typeof resultadoBruto === 'object' ? resultadoBruto.salarioOrdinario : subtotalQuincenal;
        const horasAdicionales = typeof resultadoBruto === 'object' ? resultadoBruto.horasAdicionales : 0;
        const pagoHorasAdicionales = typeof resultadoBruto === 'object' ? resultadoBruto.pagoHorasAdicionales : 0;
        const rebajosDelBruto = typeof resultadoBruto === 'object' ? resultadoBruto.rebajos : 0;
        // Los rebajos del bruto son los rebajos (bonos/rebajos) que se deben restar DESPUÉS de CCSS
        
        // PASO 3: Calcular CCSS (10.67%) sobre el salario bruto
        let descuentoCCSS = this.calcularDescuentoCCSS(salarioBruto);
        
        // PASO 4: Restar CCSS del salario bruto
        let salarioDespuesCCSS = salarioBruto - descuentoCCSS;
        
        // PASO 5: Sumar el 50% de incapacidad CCSS que paga CCSS directamente
        // (Este monto no se descuenta del empleado, CCSS lo paga directamente)
        salarioDespuesCCSS = salarioDespuesCCSS + montoCCSSCCSS;
        
        // PASO 6: Impuesto de renta (solo se aplica en planillas mensuales, no en quincenales)
        let impuestoRenta;
        let creditosRenta;
        
        // El impuesto de renta solo se aplica al fin de mes (planillas mensuales)
        const esPlanillaMensual = tipoPeriodo === 'mensual';
        
        if (!esPlanillaMensual) {
            // En planillas quincenales, no se aplica impuesto de renta
            impuestoRenta = 0;
            creditosRenta = { creditoHijos: 0, creditoConyuge: 0, totalCreditos: 0 };
        } else if (impuestoRentaManual !== null && impuestoRentaManual !== undefined) {
            // Usar el impuesto manual ingresado por el usuario (solo en mensuales)
            impuestoRenta = impuestoRentaManual;
            creditosRenta = { creditoHijos: 0, creditoConyuge: 0, totalCreditos: 0 };
        } else {
            // Calcular automáticamente sobre el salario después de CCSS + 50% incapacidad CCSS (solo en mensuales)
            const resultadoRenta = this.calcularImpuestoRentaNeto(salarioDespuesCCSS, cantidadHijos, tieneConyuge);
            impuestoRenta = resultadoRenta.rentaNeta;
            creditosRenta = resultadoRenta.creditos;
        }
        
        // PASO 7: Salario neto = salario después de CCSS + 50% incapacidad CCSS - impuesto de renta - rebajos (bonos/rebajos) - otros descuentos
        // NOTA: El rebajo por horas NO se resta aquí porque ya está reflejado en el salario ordinario
        // (el salario ordinario se calcula con las horas realmente trabajadas, no con las horas esperadas)
        // El rebajo por horas solo se muestra como información en el comprobante
        // NOTA: Los rebajos (de bonos/rebajos) se deben restar DESPUÉS de calcular CCSS, no antes
        // Orden correcto:
        // 1. Salario Bruto = Salario Ordinario + Horas Extras + Horas Adicionales + bonos (SIN restar rebajos)
        // 2. Restar CCSS (10.67%) del salario bruto
        // 3. Sumar 50% incapacidad CCSS (si aplica)
        // 4. Restar Impuesto de Renta (solo mensual)
        // 5. Restar Rebajos (bonos/rebajos) - DESPUÉS de CCSS
        // 6. Restar Otros descuentos
        const salarioNeto = salarioDespuesCCSS - impuestoRenta - rebajosDelBruto - otrosDescuentos;
        
        return {
            salarioBruto,
            salarioOrdinario, // Salario ordinario (antes de horas extras)
            montoCCSSCCSS, // El 50% que paga CCSS (para mostrar en comprobante)
            pagoHorasAdicionales, // Pago por horas adicionales (1x)
            horasAdicionales, // Total de horas adicionales
            subtotalQuincenal, // Salario ordinario
            rebajosPorHoras,
            descuentoCCSS,
            impuestoRenta,
            creditosRenta,
            otrosDescuentos: otrosDescuentos, // Otros descuentos (sin incluir rebajos porque ya se restaron en salario bruto)
            rebajos: rebajosDelBruto, // Rebajos separados para referencia (ya restados en salario bruto)
            salarioNeto: Math.max(0, salarioNeto)
        };
    },

    /**
     * Calcula estadísticas de un período de planilla
     * @param {array} empleados - Array de objetos de empleados con sus cálculos
     * @returns {object} Totales y estadísticas
     */
    calcularTotalesPlanilla(empleados) {
        const totales = {
            cantidadEmpleados: empleados.length,
            totalSalariosBrutos: 0,
            totalDescuentosCCSS: 0,
            totalImpuestosRenta: 0,
            totalOtrosDescuentos: 0,
            totalSalariosNetos: 0,
            totalHorasExtra: 0,
            totalBonos: 0,
            totalRebajos: 0
        };

        empleados.forEach(emp => {
            totales.totalSalariosBrutos += emp.salarioBruto || 0;
            totales.totalDescuentosCCSS += emp.descuentoCCSS || 0;
            totales.totalImpuestosRenta += emp.impuestoRenta || 0;
            totales.totalOtrosDescuentos += emp.otrosDescuentos || 0;
            totales.totalSalariosNetos += emp.salarioNeto || 0;
            totales.totalHorasExtra += emp.horasExtra || 0;
            totales.totalBonos += emp.bonos || 0;
            totales.totalRebajos += emp.rebajos || 0;
        });

        return totales;
    },

    /**
     * Obtiene el tramo de renta correspondiente a un salario
     * @param {number} salarioBruto - Salario bruto
     * @returns {object} Tramo correspondiente
     */
    obtenerTramoRenta(salarioBruto) {
        return CONFIG.TRAMOS_RENTA.find(tramo => 
            salarioBruto >= tramo.desde && salarioBruto <= tramo.hasta
        );
    }
};

// Export to window
window.Calculations = Calculations;

