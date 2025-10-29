// ============================================
// SISTEMA UNIFICADO DE PLANILLAS COSTA RICA
// Reemplaza completamente la lógica anterior
// ============================================

/**
 * Sistema unificado de cálculo de planillas según legislación costarricense
 */
class SistemaPlanillasUnificado {
    constructor() {
        // Configuración de jornadas laborales según legislación CR
        this.jornadasLaborales = {
            diurna: {
                nombre: 'Jornada Diurna',
                horasTrabajadas: 8,
                horasPagadas: 8,
                horasMaximasDiarias: 8,
                horasMaximasSemanales: 48,
                diasTrabajo: 6,
                diasDescanso: 1,
                descripcion: 'Jornada estándar más común'
            },
            diurna_acumulativa: {
                nombre: 'Jornada Diurna Acumulativa',
                horasTrabajadas: 10,
                horasPagadas: 8,
                horasMaximasDiarias: 10,
                horasMaximasSemanales: 48,
                diasTrabajo: 5,
                diasDescanso: 2,
                descripcion: 'Trabaja 10h pero se pagan 8h, 2 días libres'
            },
            nocturna: {
                nombre: 'Jornada Nocturna',
                horasTrabajadas: 6,
                horasPagadas: 6,
                horasMaximasDiarias: 6,
                horasMaximasSemanales: 36,
                diasTrabajo: 6,
                diasDescanso: 1,
                descripcion: 'Trabaja 6h y se pagan 6h (jornada nocturna estándar)'
            },
            mixta: {
                nombre: 'Jornada Mixta',
                horasTrabajadas: 7,
                horasPagadas: 7,
                horasMaximasDiarias: 7,
                horasMaximasSemanales: 42,
                diasTrabajo: 6,
                diasDescanso: 1,
                descripcion: 'Combinación de horas diurnas y nocturnas'
            },
            mixta_ampliada: {
                nombre: 'Jornada Mixta Ampliada',
                horasTrabajadas: 8,
                horasPagadas: 8,
                horasMaximasDiarias: 8,
                horasMaximasSemanales: 48,
                diasTrabajo: 6,
                diasDescanso: 1,
                descripcion: 'Mixta ampliada para trabajos no insalubres'
            },
            mixta_acumulativa: {
                nombre: 'Jornada Mixta Acumulativa',
                horasTrabajadas: 9,
                horasPagadas: 8,
                horasMaximasDiarias: 9,
                horasMaximasSemanales: 45,
                diasTrabajo: 5,
                diasDescanso: 2,
                descripcion: 'Trabaja 9h pero se pagan 8h, 2 días libres (sin pago automático)'
            },
            parcial: {
                nombre: 'Jornada Parcial',
                horasTrabajadas: 4,
                horasPagadas: 4,
                horasMaximasDiarias: 4,
                horasMaximasSemanales: 24,
                diasTrabajo: 6,
                diasDescanso: 1,
                descripcion: 'Jornada reducida según contrato'
            },
            medio_tiempo: {
                nombre: 'Jornada Medio Tiempo',
                horasTrabajadas: 4,
                horasPagadas: 4,
                horasMaximasDiarias: 4,
                horasMaximasSemanales: 24,
                diasTrabajo: 6,
                diasDescanso: 1,
                descripcion: 'Jornada de medio tiempo estándar'
            }
        };

        // Salarios mínimos 2025 Costa Rica
        this.salariosMinimos = {
            trabajador_no_calificado: { categoria: 'Trabajador No Calificado', salarioMensual: 367109 },
            trabajador_semi_calificado: { categoria: 'Trabajador Semi-calificado', salarioMensual: 399203 },
            trabajador_calificado: { categoria: 'Trabajador Calificado', salarioMensual: 413024 },
            trabajador_especializado: { categoria: 'Trabajador Especializado', salarioMensual: 476866 },
            tecnico_educacion_diversificada: { categoria: 'Técnico Educación Diversificada', salarioMensual: 432819 },
            tecnico_educacion_superior: { categoria: 'Técnico Educación Superior', salarioMensual: 533402 },
            tecnico_diplomado: { categoria: 'Técnico Diplomado', salarioMensual: 576094 },
            bachiller_universitario: { categoria: 'Bachiller Universitario', salarioMensual: 653427 },
            licenciado_universitario: { categoria: 'Licenciado Universitario', salarioMensual: 784140 }
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
     */
    getJornadaConfig(jornada) {
        return this.jornadasLaborales[jornada] || this.jornadasLaborales.diurna;
    }

    /**
     * Obtiene información de la categoría del empleado
     */
    getCategoriaInfo(categoria) {
        return this.salariosMinimos[categoria] || this.salariosMinimos.trabajador_no_calificado;
    }

    /**
     * Calcula las horas ordinarias y extra para un día específico
     */
    calcularDia(asistencia, empleado) {
        const jornadaConfig = this.getJornadaConfig(empleado.jornada);
        const horasTrabajadas = parseFloat(asistencia.hours || 0);
        const tipo = asistencia.type || 'presente';
        
        let horasPagadas = 0;
        let horasExtra = 0;
        let esValido = true;
        const alertas = [];
        const advertencias = [];

        if (tipo === 'presente') {
            // Calcular horas pagadas según jornada
            if (horasTrabajadas === 0) {
                // Si no trabajó horas, no se pagan horas
                horasPagadas = 0;
            } else if (empleado.jornada === 'diurna_acumulativa') {
                // Jornada acumulativa: se trabajan 10 horas pero se pagan 8
                if (horasTrabajadas >= jornadaConfig.horasTrabajadas) {
                    horasPagadas = jornadaConfig.horasPagadas;
                } else {
                    horasPagadas = horasTrabajadas;
                }
            } else if (empleado.jornada === 'mixta_acumulativa') {
                // Jornada mixta acumulativa: se trabajan 9 horas pero se pagan 8
                if (horasTrabajadas >= jornadaConfig.horasTrabajadas) {
                    horasPagadas = jornadaConfig.horasPagadas;
                } else {
                    horasPagadas = horasTrabajadas;
                }
            } else if (empleado.jornada === 'nocturna') {
                // Jornada nocturna: se trabajan 6 horas pero se pagan 8
                if (horasTrabajadas >= jornadaConfig.horasTrabajadas) {
                    horasPagadas = jornadaConfig.horasPagadas;
                } else {
                    horasPagadas = horasTrabajadas;
                }
            } else {
                // Otras jornadas: se pagan las horas trabajadas (hasta el máximo)
                horasPagadas = Math.min(horasTrabajadas, jornadaConfig.horasMaximasDiarias);
            }

            // Calcular horas extra
            horasExtra = Math.max(0, horasTrabajadas - jornadaConfig.horasTrabajadas);
            
            // Validaciones
            if (horasExtra > this.constantes.MAXIMO_HORAS_EXTRA_DIARIAS) {
                alertas.push(`Las horas extra (${horasExtra}) exceden el máximo legal diario (${this.constantes.MAXIMO_HORAS_EXTRA_DIARIAS})`);
                esValido = false;
            }

        } else if (tipo === 'ausencia') {
            horasPagadas = 0;
            horasExtra = 0;
        } else if (tipo === 'permiso') {
            // Los permisos se pagan según la jornada
            horasPagadas = jornadaConfig.horasPagadas;
            horasExtra = 0;
        } else if (tipo === 'tardanza') {
            // Las tardanzas se pagan proporcionalmente
            horasPagadas = Math.min(horasTrabajadas, jornadaConfig.horasMaximasDiarias);
            horasExtra = Math.max(0, horasTrabajadas - jornadaConfig.horasTrabajadas);
        }

        return {
            fecha: asistencia.date,
            tipo,
            horasTrabajadas,
            horasPagadas,
            horasExtra,
            esValido,
            alertas,
            advertencias,
            jornadaConfig
        };
    }

    /**
     * Calcula la planilla completa de un empleado
     */
    calcularPlanillaEmpleado(empleado, asistencias, periodo) {
        const jornadaConfig = this.getJornadaConfig(empleado.jornada);
        const categoriaInfo = this.getCategoriaInfo(empleado.categoria);
        const salarioHora = parseFloat(empleado.salarioHora || 0);
        
        let totalHorasTrabajadas = 0;
        let totalHorasPagadas = 0;
        let totalHorasExtra = 0;
        let diasTrabajados = 0;
        
        const detallesDias = [];
        const alertas = [];
        const advertencias = [];

        // Procesar cada asistencia
        asistencias.forEach(asistencia => {
            const calculoDia = this.calcularDia(asistencia, empleado);
            
            totalHorasTrabajadas += calculoDia.horasTrabajadas;
            totalHorasPagadas += calculoDia.horasPagadas;
            totalHorasExtra += calculoDia.horasExtra;
            
            // Contar días trabajados (excluyendo solo incapacidades INS)
            if (calculoDia.tipo !== 'incapacidad_ins') {
                diasTrabajados++;
            }
            
            detallesDias.push(calculoDia);
            
            // Acumular alertas y advertencias
            alertas.push(...calculoDia.alertas);
            advertencias.push(...calculoDia.advertencias);
        });

        // Calcular salarios
        const salarioBase = totalHorasPagadas * salarioHora;
        const montoHorasExtra = totalHorasExtra * salarioHora * this.constantes.RECARGO_HORA_EXTRA_DIURNA;
        const salarioBruto = salarioBase + montoHorasExtra;

        // Calcular descuentos obligatorios
        const ccss = salarioBruto * (this.constantes.CCSS_PORCENTAJE / 100);
        const bancoPopular = salarioBruto * (this.constantes.BANCO_POPULAR_PORCENTAJE / 100);
        const totalDescuentos = ccss + bancoPopular;

        // Calcular salario neto
        const salarioNeto = salarioBruto - totalDescuentos;

        // Calcular aguinaldo (1/12 del salario bruto)
        const aguinaldo = salarioBruto / 12;

        // Validaciones adicionales
        if (totalHorasExtra > this.constantes.MAXIMO_HORAS_EXTRA_MENSUALES) {
            advertencias.push(`Las horas extra mensuales (${totalHorasExtra}) exceden el máximo legal (${this.constantes.MAXIMO_HORAS_EXTRA_MENSUALES})`);
        }

        // Validar salario mínimo
        const salarioMensualCalculado = salarioHora * this.constantes.HORAS_MENSUALES_ESTANDAR;
        if (salarioMensualCalculado < categoriaInfo.salarioMensual) {
            alertas.push(`El salario mensual (${this.formatearMoneda(salarioMensualCalculado)}) está por debajo del mínimo legal (${this.formatearMoneda(categoriaInfo.salarioMensual)}) para la categoría ${categoriaInfo.categoria}`);
        }

        return {
            // Información del empleado
            empleado: {
                id: empleado.id,
                nombre: empleado.nombre,
                cedula: empleado.cedula,
                jornada: empleado.jornada,
                categoria: empleado.categoria,
                salarioHora: salarioHora,
                jornadaConfig,
                categoriaInfo
            },

            // Información del período
            periodo: {
                fechaInicio: periodo.fechaInicio,
                fechaFin: periodo.fechaFin,
                diasTrabajados,
                totalHorasTrabajadas,
                totalHorasPagadas,
                totalHorasExtra
            },

            // Cálculos financieros
            calculos: {
                salarioBase,
                montoHorasExtra,
                salarioBruto,
                ccss,
                bancoPopular,
                totalDescuentos,
                salarioNeto,
                aguinaldo
            },

            // Detalles por día
            detallesDias,

            // Validaciones
            validaciones: {
                alertas,
                advertencias,
                esValido: alertas.length === 0
            }
        };
    }

    /**
     * Calcula la planilla completa de todos los empleados
     */
    calcularPlanillaCompleta(empleados, asistencias, periodo) {
        const resultados = [];
        let totalBruto = 0;
        let totalNeto = 0;
        let totalCCSS = 0;
        let totalBancoPopular = 0;
        let totalAguinaldo = 0;

        empleados.forEach(empleado => {
            const asistenciasEmpleado = asistencias.filter(a => a.employeeId === empleado.id);
            const resultado = this.calcularPlanillaEmpleado(empleado, asistenciasEmpleado, periodo);
            
            resultados.push(resultado);
            
            // Acumular totales
            totalBruto += resultado.calculos.salarioBruto;
            totalNeto += resultado.calculos.salarioNeto;
            totalCCSS += resultado.calculos.ccss;
            totalBancoPopular += resultado.calculos.bancoPopular;
            totalAguinaldo += resultado.calculos.aguinaldo;
        });

        return {
            resultados,
            resumen: {
                totalEmpleados: empleados.length,
                totalBruto,
                totalNeto,
                totalCCSS,
                totalBancoPopular,
                totalAguinaldo
            },
            periodo
        };
    }

    /**
     * Formatea números como moneda costarricense
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
     * Genera un reporte detallado de la planilla
     */
    generarReportePlanilla(planillaCompleta) {
        const { resultados, resumen, periodo } = planillaCompleta;
        
        let reporte = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           PLANILLA COSTA RICA                              ║
║                           SISTEMA UNIFICADO                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

📅 PERÍODO: ${periodo.fechaInicio} a ${periodo.fechaFin}
👥 EMPLEADOS: ${resumen.totalEmpleados}

📊 RESUMEN GENERAL:
   Salario Bruto Total: ${this.formatearMoneda(resumen.totalBruto)}
   Descuentos CCSS: ${this.formatearMoneda(resumen.totalCCSS)}
   Descuentos Banco Popular: ${this.formatearMoneda(resumen.totalBancoPopular)}
   Salario Neto Total: ${this.formatearMoneda(resumen.totalNeto)}
   Aguinaldo Total: ${this.formatearMoneda(resumen.totalAguinaldo)}

`;

        resultados.forEach((resultado, index) => {
            const { empleado, periodo: periodoEmp, calculos, validaciones } = resultado;
            
            reporte += `
╔══════════════════════════════════════════════════════════════════════════════╗
║ EMPLEADO ${index + 1}: ${empleado.nombre}
╚══════════════════════════════════════════════════════════════════════════════╝

👤 INFORMACIÓN:
   Cédula: ${empleado.cedula}
   Jornada: ${empleado.jornadaConfig.nombre}
   Categoría: ${empleado.categoriaInfo.categoria}
   Salario/hora: ${this.formatearMoneda(empleado.salarioHora)}

📅 PERÍODO TRABAJADO:
   Días trabajados: ${periodoEmp.diasTrabajados}
   Horas trabajadas: ${periodoEmp.totalHorasTrabajadas}
   Horas pagadas: ${periodoEmp.totalHorasPagadas}
   Horas extra: ${periodoEmp.totalHorasExtra}

💰 CÁLCULOS:
   Salario base: ${this.formatearMoneda(calculos.salarioBase)}
   Horas extra: ${this.formatearMoneda(calculos.montoHorasExtra)}
   Salario bruto: ${this.formatearMoneda(calculos.salarioBruto)}
   CCSS (${this.constantes.CCSS_PORCENTAJE}%): ${this.formatearMoneda(calculos.ccss)}
   Banco Popular (${this.constantes.BANCO_POPULAR_PORCENTAJE}%): ${this.formatearMoneda(calculos.bancoPopular)}
   Total descuentos: ${this.formatearMoneda(calculos.totalDescuentos)}
   Salario neto: ${this.formatearMoneda(calculos.salarioNeto)}
   Aguinaldo: ${this.formatearMoneda(calculos.aguinaldo)}

`;

            if (validaciones.alertas.length > 0) {
                reporte += '🚨 ALERTAS:\n';
                validaciones.alertas.forEach(alerta => {
                    reporte += `   ${alerta}\n`;
                });
                reporte += '\n';
            }

            if (validaciones.advertencias.length > 0) {
                reporte += '⚠️ ADVERTENCIAS:\n';
                validaciones.advertencias.forEach(advertencia => {
                    reporte += `   ${advertencia}\n`;
                });
                reporte += '\n';
            }
        });

        return reporte;
    }
}

// Exportar la clase
window.SistemaPlanillasUnificado = SistemaPlanillasUnificado;
