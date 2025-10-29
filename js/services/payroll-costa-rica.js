// ============================================
// SERVICIO DE CÁLCULO DE PLANILLAS COSTA RICA
// Implementa la legislación laboral costarricense vigente
// ============================================

/**
 * TIPOS DE JORNADAS LABORALES VIGENTES EN COSTA RICA
 */
export const JORNADAS_LABORALES = {
    DIURNA: {
        nombre: 'Jornada Diurna',
        horario: '5:00 a.m. a 7:00 p.m.',
        horasMaximasDiarias: 8,
        horasMaximasSemanales: 48,
        diasTrabajo: 6,
        diasDescanso: 1,
        observacion: 'Jornada estándar más común'
    },
    DIURNA_ACUMULATIVA: {
        nombre: 'Jornada Diurna Acumulativa',
        horario: '5:00 a.m. a 7:00 p.m.',
        horasMaximasDiarias: 10,
        horasMaximasSemanales: 48,
        diasTrabajo: 5,
        diasDescanso: 2,
        restriccion: 'Solo para trabajos que NO sean insalubres, peligrosos o pesados'
    },
    NOCTURNA: {
        nombre: 'Jornada Nocturna',
        horario: '7:00 p.m. a 5:00 a.m.',
        horasMaximasDiarias: 6,
        horasMaximasSemanales: 36,
        diasTrabajo: 6,
        diasDescanso: 1,
        observacion: 'No permite acumulación'
    },
    MIXTA: {
        nombre: 'Jornada Mixta',
        horario: 'Combinación de horas diurnas y nocturnas',
        horasMaximasDiarias: 7,
        horasMaximasSemanales: 42,
        diasTrabajo: 6,
        diasDescanso: 1,
        restriccion: 'Máximo 3.5 horas en período nocturno. Si excede 3.5 horas nocturnas, se convierte en jornada nocturna'
    },
    MIXTA_AMPLIADA: {
        nombre: 'Jornada Mixta Ampliada',
        horario: 'Combinación de horas diurnas y nocturnas',
        horasMaximasDiarias: 8,
        horasMaximasSemanales: 48,
        diasTrabajo: 6,
        diasDescanso: 1,
        restriccion: 'Solo para trabajos NO insalubres o peligrosos. Máximo 3.5 horas nocturnas'
    },
    PARCIAL: {
        nombre: 'Jornada Parcial',
        horario: 'Según contrato',
        horasMaximasDiarias: 'Variable',
        horasMaximasSemanales: 'Variable',
        observacion: 'Se aplica proporción del salario mínimo'
    },
    MEDIO_TIEMPO: {
        nombre: 'Jornada de Medio Tiempo',
        horario: 'Según contrato',
        horasMaximasDiarias: 4,
        horasMaximasSemanales: 24,
        observacion: 'Equivale a la mitad de la jornada ordinaria'
    }
};

/**
 * SALARIOS MÍNIMOS 2025 COSTA RICA
 */
export const SALARIOS_MINIMOS_2025 = {
    'trabajador_no_calificado': {
        categoria: 'Trabajador No Calificado',
        salarioMensual: 367109,
        valorHora: 1530,
        horaExtra: 2295
    },
    'trabajador_semi_calificado': {
        categoria: 'Trabajador Semi-calificado',
        salarioMensual: 399203,
        valorHora: 1663,
        horaExtra: 2495
    },
    'trabajador_calificado': {
        categoria: 'Trabajador Calificado',
        salarioMensual: 413024,
        valorHora: 1721,
        horaExtra: 2582
    },
    'trabajador_especializado': {
        categoria: 'Trabajador Especializado',
        salarioMensual: 476866,
        valorHora: 1987,
        horaExtra: 2981
    },
    'tecnico_educacion_diversificada': {
        categoria: 'Técnico Educación Diversificada',
        salarioMensual: 432819,
        valorHora: 1803,
        horaExtra: 2705
    },
    'tecnico_educacion_superior': {
        categoria: 'Técnico Educación Superior',
        salarioMensual: 533402,
        valorHora: 2222,
        horaExtra: 3333
    },
    'tecnico_diplomado': {
        categoria: 'Técnico Diplomado',
        salarioMensual: 576094,
        valorHora: 2400,
        horaExtra: 3600
    },
    'bachiller_universitario': {
        categoria: 'Bachiller Universitario',
        salarioMensual: 653427,
        valorHora: 2722,
        horaExtra: 4083
    },
    'licenciado_universitario': {
        categoria: 'Licenciado Universitario',
        salarioMensual: 784140,
        valorHora: 3267,
        horaExtra: 4901
    }
};

/**
 * CONSTANTES DE CÁLCULO
 */
export const CONSTANTES_CALCULO = {
    RECARGO_HORA_EXTRA_DIURNA: 1.5,      // 50% de recargo
    RECARGO_HORA_EXTRA_NOCTURNA: 1.5,    // 50% de recargo
    RECARGO_HORA_EXTRA_FERIADO: 2.0,     // 100% de recargo
    CCSS_PORCENTAJE: 10.67,              // 10.67% del salario bruto
    BANCO_POPULAR_PORCENTAJE: 0.25,      // 0.25% del salario bruto
    MAXIMO_HORAS_EXTRA_DIARIAS: 4,       // Máximo 4 horas extra por día
    MAXIMO_HORAS_EXTRA_MENSUALES: 120,   // Máximo 120 horas extra por mes
    HORAS_MENSUALES_ESTANDAR: 240,       // 8 horas × 30 días
    HORAS_QUINCENALES_ESTANDAR: 120      // 8 horas × 15 días
};

/**
 * Clase principal para cálculos de planillas según legislación costarricense
 */
export class CalculadoraPlanillasCR {
    constructor() {
        this.alertas = [];
        this.advertencias = [];
    }

    /**
     * Calcula el valor de la hora ordinaria según los métodos legales
     * @param {Object} empleado - Datos del empleado
     * @param {string} tipoSalario - 'mensual', 'semanal', 'diario'
     * @returns {number} Valor de la hora ordinaria
     */
    calcularValorHoraOrdinaria(empleado, tipoSalario = 'mensual') {
        const salario = parseFloat(empleado.salario || 0);
        
        switch (tipoSalario) {
            case 'mensual':
                return salario / CONSTANTES_CALCULO.HORAS_MENSUALES_ESTANDAR;
            case 'semanal':
                const horasSemana = this.getHorasJornadaSemanal(empleado.jornada);
                return salario / horasSemana;
            case 'diario':
                const horasDia = this.getHorasJornadaDiaria(empleado.jornada);
                return salario / horasDia;
            default:
                return salario / CONSTANTES_CALCULO.HORAS_MENSUALES_ESTANDAR;
        }
    }

    /**
     * Obtiene las horas de jornada diaria según el tipo
     * @param {string} jornada - Tipo de jornada
     * @returns {number} Horas diarias
     */
    getHorasJornadaDiaria(jornada) {
        const horasJornada = {
            'diurna': 8,
            'diurna_acumulativa': 8,  // Se pagan 8 aunque se trabajen 10
            'nocturna': 8,            // Se pagan 8 aunque se trabajen 6
            'mixta': 7,
            'mixta_ampliada': 8,
            'parcial': 4,            // Variable según contrato
            'medio_tiempo': 4
        };
        return horasJornada[jornada] || 8;
    }

    /**
     * Obtiene las horas de jornada semanal según el tipo
     * @param {string} jornada - Tipo de jornada
     * @returns {number} Horas semanales
     */
    getHorasJornadaSemanal(jornada) {
        const horasSemana = {
            'diurna': 48,
            'diurna_acumulativa': 48,
            'nocturna': 36,
            'mixta': 42,
            'mixta_ampliada': 48,
            'parcial': 24,           // Variable según contrato
            'medio_tiempo': 24
        };
        return horasSemana[jornada] || 48;
    }

    /**
     * Calcula las horas extra según el tipo de jornada y horario
     * @param {Object} datos - Datos del cálculo
     * @returns {Object} Resultado del cálculo de horas extra
     */
    calcularHorasExtra(datos) {
        const { empleado, horasTrabajadas, esFeriado = false, esNocturno = false } = datos;
        
        const horasMaximasDiarias = this.getHorasMaximasDiarias(empleado.jornada);
        const horasExtra = Math.max(0, horasTrabajadas - horasMaximasDiarias);
        
        // Validar límites legales
        if (horasExtra > CONSTANTES_CALCULO.MAXIMO_HORAS_EXTRA_DIARIAS) {
            this.advertencias.push(`⚠️ Las horas extra (${horasExtra}) exceden el máximo legal diario (${CONSTANTES_CALCULO.MAXIMO_HORAS_EXTRA_DIARIAS})`);
        }

        const valorHoraOrdinaria = this.calcularValorHoraOrdinaria(empleado);
        let multiplicadorRecargo = CONSTANTES_CALCULO.RECARGO_HORA_EXTRA_DIURNA;

        // Determinar tipo de recargo
        if (esFeriado) {
            multiplicadorRecargo = CONSTANTES_CALCULO.RECARGO_HORA_EXTRA_FERIADO;
        } else if (esNocturno) {
            multiplicadorRecargo = CONSTANTES_CALCULO.RECARGO_HORA_EXTRA_NOCTURNA;
        }

        const valorHoraExtra = valorHoraOrdinaria * multiplicadorRecargo;
        const montoHorasExtra = horasExtra * valorHoraExtra;

        return {
            horasExtra,
            valorHoraOrdinaria,
            valorHoraExtra,
            multiplicadorRecargo,
            montoHorasExtra,
            tipoRecargo: esFeriado ? 'Feriado (100%)' : (esNocturno ? 'Nocturno (50%)' : 'Diurno (50%)')
        };
    }

    /**
     * Obtiene las horas máximas diarias según el tipo de jornada
     * @param {string} jornada - Tipo de jornada
     * @returns {number} Horas máximas diarias
     */
    getHorasMaximasDiarias(jornada) {
        const horasMaximas = {
            'diurna': 8,
            'diurna_acumulativa': 10,
            'nocturna': 6,
            'mixta': 7,
            'mixta_ampliada': 8,
            'parcial': 4,
            'medio_tiempo': 4
        };
        return horasMaximas[jornada] || 8;
    }

    /**
     * Calcula los descuentos obligatorios según la legislación costarricense
     * @param {number} salarioBruto - Salario bruto (base + horas extra)
     * @returns {Object} Descuentos calculados
     */
    calcularDescuentosObligatorios(salarioBruto) {
        const ccss = salarioBruto * (CONSTANTES_CALCULO.CCSS_PORCENTAJE / 100);
        const bancoPopular = salarioBruto * (CONSTANTES_CALCULO.BANCO_POPULAR_PORCENTAJE / 100);
        const totalDescuentos = ccss + bancoPopular;

        return {
            ccss: {
                monto: ccss,
                porcentaje: CONSTANTES_CALCULO.CCSS_PORCENTAJE,
                descripcion: 'Caja Costarricense de Seguro Social'
            },
            bancoPopular: {
                monto: bancoPopular,
                porcentaje: CONSTANTES_CALCULO.BANCO_POPULAR_PORCENTAJE,
                descripcion: 'Banco Popular'
            },
            totalDescuentos
        };
    }

    /**
     * Valida si el salario cumple con el mínimo legal
     * @param {Object} empleado - Datos del empleado
     * @param {number} salarioCalculado - Salario calculado
     * @returns {Object} Resultado de la validación
     */
    validarSalarioMinimo(empleado, salarioCalculado) {
        const categoria = empleado.categoria || 'trabajador_no_calificado';
        const salarioMinimo = SALARIOS_MINIMOS_2025[categoria];
        
        if (!salarioMinimo) {
            this.advertencias.push(`⚠️ Categoría de empleado no reconocida: ${categoria}`);
            return { valido: true, mensaje: 'Categoría no reconocida' };
        }

        const salarioMensual = salarioCalculado * 30; // Asumiendo cálculo diario
        
        if (salarioMensual < salarioMinimo.salarioMensual) {
            this.alertas.push(`🚨 ALERTA: El salario mensual (₡${this.formatearMoneda(salarioMensual)}) está por debajo del mínimo legal (₡${this.formatearMoneda(salarioMinimo.salarioMensual)}) para la categoría ${salarioMinimo.categoria}`);
            return { 
                valido: false, 
                mensaje: `Salario por debajo del mínimo legal`,
                salarioMinimo: salarioMinimo.salarioMensual,
                diferencia: salarioMinimo.salarioMensual - salarioMensual
            };
        }

        return { valido: true, mensaje: 'Salario cumple con el mínimo legal' };
    }

    /**
     * Calcula la planilla completa de un empleado según la legislación costarricense
     * @param {Object} datosEmpleado - Datos del empleado y período
     * @returns {Object} Cálculo completo de la planilla
     */
    calcularPlanillaCompleta(datosEmpleado) {
        this.alertas = [];
        this.advertencias = [];

        const { empleado, horasTrabajadas, horasExtra = 0, esFeriado = false, bonificaciones = 0, rebajos = 0 } = datosEmpleado;

        // 1. Calcular salario base del período
        const valorHoraOrdinaria = this.calcularValorHoraOrdinaria(empleado);
        const horasOrdinarias = Math.min(horasTrabajadas, this.getHorasMaximasDiarias(empleado.jornada));
        const salarioBase = horasOrdinarias * valorHoraOrdinaria;

        // 2. Calcular horas extra
        const calculoHorasExtra = this.calcularHorasExtra({
            empleado,
            horasTrabajadas,
            esFeriado,
            esNocturno: empleado.jornada === 'nocturna' || empleado.jornada === 'mixta'
        });

        // 3. Calcular salario bruto
        const salarioBruto = salarioBase + calculoHorasExtra.montoHorasExtra + bonificaciones - rebajos;

        // 4. Calcular descuentos obligatorios
        const descuentos = this.calcularDescuentosObligatorios(salarioBruto);

        // 5. Calcular salario neto
        const salarioNeto = salarioBruto - descuentos.totalDescuentos;

        // 6. Validaciones legales
        const validacionSalario = this.validarSalarioMinimo(empleado, salarioBase / horasOrdinarias);

        // 7. Preparar resultado
        const resultado = {
            // Resumen del empleado
            empleado: {
                nombre: empleado.nombre,
                cedula: empleado.cedula,
                jornada: empleado.jornada,
                categoria: empleado.categoria || 'trabajador_no_calificado',
                salarioBase: empleado.salario
            },
            
            // Período trabajado
            periodo: {
                horasTrabajadas,
                horasOrdinarias,
                horasExtra: calculoHorasExtra.horasExtra,
                diasLaborados: Math.ceil(horasTrabajadas / this.getHorasJornadaDiaria(empleado.jornada))
            },

            // Cálculos paso a paso
            calculos: {
                valorHoraOrdinaria,
                salarioBase,
                horasExtra: {
                    cantidad: calculoHorasExtra.horasExtra,
                    valorHoraExtra: calculoHorasExtra.valorHoraExtra,
                    multiplicadorRecargo: calculoHorasExtra.multiplicadorRecargo,
                    tipoRecargo: calculoHorasExtra.tipoRecargo,
                    montoTotal: calculoHorasExtra.montoHorasExtra
                },
                bonificaciones,
                rebajos,
                salarioBruto,
                descuentos,
                salarioNeto
            },

            // Validaciones y alertas
            validaciones: {
                salarioMinimo: validacionSalario,
                alertas: this.alertas,
                advertencias: this.advertencias
            },

            // Información de la jornada
            jornada: JORNADAS_LABORALES[empleado.jornada.toUpperCase()] || JORNADAS_LABORALES.DIURNA
        };

        return resultado;
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
     * Genera un reporte detallado del cálculo de planilla
     * @param {Object} resultado - Resultado del cálculo de planilla
     * @returns {string} Reporte formateado
     */
    generarReporteDetallado(resultado) {
        const { empleado, periodo, calculos, validaciones, jornada } = resultado;
        
        let reporte = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           COMPROBANTE DE PAGO - COSTA RICA                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

👤 EMPLEADO:
   Nombre: ${empleado.nombre}
   Cédula: ${empleado.cedula}
   Jornada: ${jornada.nombre}
   Categoría: ${empleado.categoria}

📅 PERÍODO TRABAJADO:
   Horas trabajadas: ${periodo.horasTrabajadas} horas
   Horas ordinarias: ${periodo.horasOrdinarias} horas
   Horas extra: ${periodo.horasExtra} horas
   Días laborados: ${periodo.diasLaborados} días

💰 CÁLCULOS PASO A PASO:
   Valor hora ordinaria: ${this.formatearMoneda(calculos.valorHoraOrdinaria)}
   Salario base: ${this.formatearMoneda(calculos.salarioBase)}
   
   Horas Extra:
   ├─ Cantidad: ${calculos.horasExtra.cantidad} horas
   ├─ Tipo de recargo: ${calculos.horasExtra.tipoRecargo}
   ├─ Valor por hora: ${this.formatearMoneda(calculos.horasExtra.valorHoraExtra)}
   └─ Total horas extra: ${this.formatearMoneda(calculos.horasExtra.montoTotal)}
   
   Bonificaciones: ${this.formatearMoneda(calculos.bonificaciones)}
   Rebajos: ${this.formatearMoneda(calculos.rebajos)}
   
   SALARIO BRUTO: ${this.formatearMoneda(calculos.salarioBruto)}

📋 DESCUENTOS OBLIGATORIOS:
   CCSS (${calculos.descuentos.ccss.porcentaje}%): ${this.formatearMoneda(calculos.descuentos.ccss.monto)}
   Banco Popular (${calculos.descuentos.bancoPopular.porcentaje}%): ${this.formatearMoneda(calculos.descuentos.bancoPopular.monto)}
   Total descuentos: ${this.formatearMoneda(calculos.descuentos.totalDescuentos)}

💵 SALARIO NETO A PAGAR: ${this.formatearMoneda(calculos.salarioNeto)}

${validaciones.alertas.length > 0 ? '🚨 ALERTAS:\n' + validaciones.alertas.map(alerta => `   ${alerta}`).join('\n') + '\n' : ''}
${validaciones.advertencias.length > 0 ? '⚠️ ADVERTENCIAS:\n' + validaciones.advertencias.map(adv => `   ${adv}`).join('\n') + '\n' : ''}
`;

        return reporte;
    }
}

// Exportar la clase y constantes
export default CalculadoraPlanillasCR;






