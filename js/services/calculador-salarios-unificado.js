// ============================================
// SISTEMA UNIFICADO DE CÁLCULO DE SALARIOS CR
// Corrige los problemas de cálculo según jornadas laborales
// ============================================

/**
 * Sistema unificado para cálculos de salarios según legislación costarricense
 */
export class CalculadorSalariosUnificado {
    constructor() {
        // Configuración de jornadas laborales según legislación CR
        this.configuracionJornadas = {
            diurna: {
                horasTrabajadas: 8,    // Horas físicas trabajadas
                horasPagadas: 8,      // Horas que se pagan
                horasMaximasDiarias: 8,
                horasMaximasSemanales: 48,
                diasTrabajo: 6,
                diasDescanso: 1
            },
            diurna_acumulativa: {
                horasTrabajadas: 10,   // Horas físicas trabajadas
                horasPagadas: 8,       // Horas que se pagan (beneficio de la acumulación)
                horasMaximasDiarias: 10,
                horasMaximasSemanales: 48,
                diasTrabajo: 5,
                diasDescanso: 2
            },
            nocturna: {
                horasTrabajadas: 6,    // Horas físicas trabajadas
                horasPagadas: 8,       // Horas que se pagan (beneficio de la jornada nocturna)
                horasMaximasDiarias: 6,
                horasMaximasSemanales: 36,
                diasTrabajo: 6,
                diasDescanso: 1
            },
            mixta: {
                horasTrabajadas: 7,    // Horas físicas trabajadas
                horasPagadas: 7,       // Horas que se pagan
                horasMaximasDiarias: 7,
                horasMaximasSemanales: 42,
                diasTrabajo: 6,
                diasDescanso: 1
            },
            mixta_ampliada: {
                horasTrabajadas: 8,    // Horas físicas trabajadas
                horasPagadas: 8,       // Horas que se pagan
                horasMaximasDiarias: 8,
                horasMaximasSemanales: 48,
                diasTrabajo: 6,
                diasDescanso: 1
            },
            mixta_acumulativa: {
                horasTrabajadas: 8,    // Horas físicas trabajadas (entre 8-9)
                horasPagadas: 8,       // Horas que se pagan (máximo 8)
                horasMaximasDiarias: 8,
                horasMaximasSemanales: 40, // 8h × 5 días
                diasTrabajo: 5,        // Trabaja 5 días a la semana
                diasDescanso: 2        // 2 días libres
            },
            parcial: {
                horasTrabajadas: 4,    // Variable según contrato
                horasPagadas: 4,       // Variable según contrato
                horasMaximasDiarias: 4,
                horasMaximasSemanales: 24,
                diasTrabajo: 6,
                diasDescanso: 1
            },
            medio_tiempo: {
                horasTrabajadas: 4,    // Horas físicas trabajadas
                horasPagadas: 4,       // Horas que se pagan
                horasMaximasDiarias: 4,
                horasMaximasSemanales: 24,
                diasTrabajo: 6,
                diasDescanso: 1
            }
        };

        // Constantes de cálculo
        this.constantes = {
            RECARGO_HORA_EXTRA_DIURNA: 1.5,      // 50% de recargo
            RECARGO_HORA_EXTRA_NOCTURNA: 1.5,    // 50% de recargo
            RECARGO_HORA_EXTRA_FERIADO: 2.0,     // 100% de recargo
            CCSS_PORCENTAJE: 10.67,              // 10.67% del salario bruto
            BANCO_POPULAR_PORCENTAJE: 0.25,      // 0.25% del salario bruto
            MAXIMO_HORAS_EXTRA_DIARIAS: 4,       // Máximo 4 horas extra por día
            MAXIMO_HORAS_EXTRA_MENSUALES: 120,   // Máximo 120 horas extra por mes
            HORAS_MENSUALES_ESTANDAR: 240        // 8 horas × 30 días
        };
    }

    /**
     * Obtiene la configuración de una jornada específica
     * @param {string} jornada - Tipo de jornada
     * @returns {Object} Configuración de la jornada
     */
    getConfiguracionJornada(jornada) {
        return this.configuracionJornadas[jornada] || this.configuracionJornadas.diurna;
    }

    /**
     * Calcula las horas ordinarias y extra para un día específico
     * @param {Object} datos - Datos del cálculo
     * @returns {Object} Resultado del cálculo diario
     */
    calcularDia(datos) {
        const { jornada, horasTrabajadas, esFeriado = false, esNocturno = false } = datos;
        
        const config = this.getConfiguracionJornada(jornada);
        
        // Calcular horas ordinarias (las que se pagan normalmente)
        const horasOrdinarias = Math.min(horasTrabajadas, config.horasMaximasDiarias);
        
        // Calcular horas extra
        const horasExtra = Math.max(0, horasTrabajadas - config.horasMaximasDiarias);
        
        // Validar límites legales de horas extra
        if (horasExtra > this.constantes.MAXIMO_HORAS_EXTRA_DIARIAS) {
            console.warn(`⚠️ Las horas extra (${horasExtra}) exceden el máximo legal diario (${this.constantes.MAXIMO_HORAS_EXTRA_DIARIAS})`);
        }

        return {
            horasTrabajadas,
            horasOrdinarias,
            horasExtra,
            configuracion: config
        };
    }

    /**
     * Calcula el salario de un empleado para un período específico
     * @param {Object} datosEmpleado - Datos del empleado y período
     * @returns {Object} Cálculo completo del salario
     */
    calcularSalarioEmpleado(datosEmpleado) {
        const { 
            empleado, 
            diasTrabajados, 
            bonificaciones = 0, 
            rebajos = 0,
            esFeriado = false 
        } = datosEmpleado;

        const config = this.getConfiguracionJornada(empleado.jornada);
        const salarioHora = parseFloat(empleado.salarioHora || 0);
        
        let totalHorasTrabajadas = 0;
        let totalHorasOrdinarias = 0;
        let totalHorasExtra = 0;
        let salarioBase = 0;
        let montoHorasExtra = 0;

        // Calcular para cada día trabajado
        diasTrabajados.forEach(dia => {
            const horasDia = parseFloat(dia.horas || 0);
            const calculoDia = this.calcularDia({
                jornada: empleado.jornada,
                horasTrabajadas: horasDia,
                esFeriado: dia.esFeriado || false
            });

            totalHorasTrabajadas += calculoDia.horasTrabajadas;
            totalHorasOrdinarias += calculoDia.horasOrdinarias;
            totalHorasExtra += calculoDia.horasExtra;
        });

        // Calcular salario base (horas ordinarias × salario por hora)
        salarioBase = totalHorasOrdinarias * salarioHora;

        // Calcular horas extra con recargo
        if (totalHorasExtra > 0) {
            const multiplicadorRecargo = esFeriado ? 
                this.constantes.RECARGO_HORA_EXTRA_FERIADO : 
                this.constantes.RECARGO_HORA_EXTRA_DIURNA;
            
            montoHorasExtra = totalHorasExtra * salarioHora * multiplicadorRecargo;
        }

        // Calcular salario bruto
        const salarioBruto = salarioBase + montoHorasExtra + bonificaciones - rebajos;

        // Calcular descuentos obligatorios
        const ccss = salarioBruto * (this.constantes.CCSS_PORCENTAJE / 100);
        const bancoPopular = salarioBruto * (this.constantes.BANCO_POPULAR_PORCENTAJE / 100);
        const totalDescuentos = ccss + bancoPopular;

        // Calcular salario neto
        const salarioNeto = salarioBruto - totalDescuentos;

        // Validaciones
        const alertas = [];
        const advertencias = [];

        // Validar límites mensuales de horas extra
        if (totalHorasExtra > this.constantes.MAXIMO_HORAS_EXTRA_MENSUALES) {
            advertencias.push(`⚠️ Las horas extra mensuales (${totalHorasExtra}) exceden el máximo legal (${this.constantes.MAXIMO_HORAS_EXTRA_MENSUALES})`);
        }

        // Validar salario mínimo
        const salarioMensualCalculado = salarioHora * this.constantes.HORAS_MENSUALES_ESTANDAR;
        const categoriaInfo = this.obtenerCategoriaInfo(empleado.categoria);
        if (categoriaInfo && salarioMensualCalculado < categoriaInfo.salarioMensual) {
            alertas.push(`🚨 ALERTA: El salario mensual (₡${this.formatearMoneda(salarioMensualCalculado)}) está por debajo del mínimo legal (₡${this.formatearMoneda(categoriaInfo.salarioMensual)}) para la categoría ${categoriaInfo.categoria}`);
        }

        return {
            // Resumen del empleado
            empleado: {
                nombre: empleado.nombre,
                cedula: empleado.cedula,
                jornada: empleado.jornada,
                categoria: empleado.categoria,
                salarioHora: salarioHora
            },

            // Período trabajado
            periodo: {
                diasTrabajados: diasTrabajados.length,
                totalHorasTrabajadas,
                totalHorasOrdinarias,
                totalHorasExtra
            },

            // Cálculos
            calculos: {
                salarioBase,
                montoHorasExtra,
                bonificaciones,
                rebajos,
                salarioBruto,
                ccss,
                bancoPopular,
                totalDescuentos,
                salarioNeto
            },

            // Configuración de jornada
            configuracionJornada: config,

            // Validaciones
            validaciones: {
                alertas,
                advertencias
            }
        };
    }

    /**
     * Obtiene información de la categoría del empleado
     * @param {string} categoria - Categoría del empleado
     * @returns {Object} Información de la categoría
     */
    obtenerCategoriaInfo(categoria) {
        const salariosMinimos = {
            'trabajador_no_calificado': { categoria: 'Trabajador No Calificado', salarioMensual: 367109 },
            'trabajador_semi_calificado': { categoria: 'Trabajador Semi-calificado', salarioMensual: 399203 },
            'trabajador_calificado': { categoria: 'Trabajador Calificado', salarioMensual: 413024 },
            'trabajador_especializado': { categoria: 'Trabajador Especializado', salarioMensual: 476866 },
            'tecnico_educacion_diversificada': { categoria: 'Técnico Educación Diversificada', salarioMensual: 432819 },
            'tecnico_educacion_superior': { categoria: 'Técnico Educación Superior', salarioMensual: 533402 },
            'tecnico_diplomado': { categoria: 'Técnico Diplomado', salarioMensual: 576094 },
            'bachiller_universitario': { categoria: 'Bachiller Universitario', salarioMensual: 653427 },
            'licenciado_universitario': { categoria: 'Licenciado Universitario', salarioMensual: 784140 }
        };

        return salariosMinimos[categoria] || null;
    }

    /**
     * Formatea números como moneda costarricense
     * @param {number} valor - Valor a formatear
     * @returns {string} Valor formateado como moneda
     */
    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: 'CRC',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    }

    /**
     * Genera un reporte detallado del cálculo
     * @param {Object} resultado - Resultado del cálculo
     * @returns {string} Reporte formateado
     */
    generarReporteDetallado(resultado) {
        const { empleado, periodo, calculos, configuracionJornada, validaciones } = resultado;
        
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           CÁLCULO DE SALARIO CORREGIDO                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

👤 EMPLEADO:
   Nombre: ${empleado.nombre}
   Cédula: ${empleado.cedula}
   Jornada: ${empleado.jornada}
   Categoría: ${empleado.categoria}

⏰ CONFIGURACIÓN DE JORNADA:
   Horas trabajadas por día: ${configuracionJornada.horasTrabajadas}
   Horas pagadas por día: ${configuracionJornada.horasPagadas}
   Horas máximas diarias: ${configuracionJornada.horasMaximasDiarias}
   Horas máximas semanales: ${configuracionJornada.horasMaximasSemanales}

📅 PERÍODO TRABAJADO:
   Días trabajados: ${periodo.diasTrabajados}
   Total horas trabajadas: ${periodo.totalHorasTrabajadas}
   Total horas ordinarias: ${periodo.totalHorasOrdinarias}
   Total horas extra: ${periodo.totalHorasExtra}

💰 CÁLCULOS:
   Salario base: ${this.formatearMoneda(calculos.salarioBase)}
   Horas extra: ${this.formatearMoneda(calculos.montoHorasExtra)}
   Bonificaciones: ${this.formatearMoneda(calculos.bonificaciones)}
   Rebajos: ${this.formatearMoneda(calculos.rebajos)}
   
   SALARIO BRUTO: ${this.formatearMoneda(calculos.salarioBruto)}

📋 DESCUENTOS OBLIGATORIOS:
   CCSS (${this.constantes.CCSS_PORCENTAJE}%): ${this.formatearMoneda(calculos.ccss)}
   Banco Popular (${this.constantes.BANCO_POPULAR_PORCENTAJE}%): ${this.formatearMoneda(calculos.bancoPopular)}
   Total descuentos: ${this.formatearMoneda(calculos.totalDescuentos)}

💵 SALARIO NETO: ${this.formatearMoneda(calculos.salarioNeto)}

${validaciones.alertas.length > 0 ? '🚨 ALERTAS:\n' + validaciones.alertas.map(alerta => `   ${alerta}`).join('\n') + '\n' : ''}
${validaciones.advertencias.length > 0 ? '⚠️ ADVERTENCIAS:\n' + validaciones.advertencias.map(adv => `   ${adv}`).join('\n') + '\n' : ''}
`;
    }
}

// Exportar la clase
export default CalculadorSalariosUnificado;






