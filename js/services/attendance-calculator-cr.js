// ============================================
// CALCULADOR DE ASISTENCIAS COSTA RICA
// Sistema unificado y corregido para el cálculo de horarios
// ============================================

/**
 * Calculador unificado de asistencias para Costa Rica
 * Corrige todos los problemas de cálculo de horarios y jornadas
 */
export class AttendanceCalculatorCR {
    constructor() {
        // Configuración de jornadas laborales según legislación CR
        this.jornadasConfig = {
            diurna: {
                nombre: 'Diurna',
                descripcion: 'Jornada diurna estándar',
                horasTrabajadas: 8,
                horasPagadas: 8,
                horasMaximasDiarias: 8,
                horasMaximasSemanales: 48,
                diasTrabajo: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
                diasDescanso: [0] // Domingo
            },
            diurna_acumulativa: {
                nombre: 'Diurna Acumulativa',
                descripcion: 'Jornada acumulativa: L-V 10h trabajadas, 8h pagadas',
                horasTrabajadas: 10,
                horasPagadas: 8,
                horasMaximasDiarias: 10,
                horasMaximasSemanales: 48,
                diasTrabajo: [1, 2, 3, 4, 5], // Lunes a Viernes
                diasDescanso: [0, 6], // Sábado y Domingo
                // Horas específicas por día
                horasPorDia: {
                    1: 10, // Lunes
                    2: 10, // Martes
                    3: 10, // Miércoles
                    4: 10, // Jueves
                    5: 10, // Viernes
                    6: 0,  // Sábado
                    0: 0   // Domingo
                }
            },
            nocturna: {
                nombre: 'Nocturna',
                descripcion: 'Jornada nocturna: 6h trabajadas, 8h pagadas',
                horasTrabajadas: 6,
                horasPagadas: 8,
                horasMaximasDiarias: 6,
                horasMaximasSemanales: 36,
                diasTrabajo: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
                diasDescanso: [0] // Domingo
            },
            mixta: {
                nombre: 'Mixta',
                descripcion: 'Jornada mixta: 7h trabajadas y pagadas',
                horasTrabajadas: 7,
                horasPagadas: 7,
                horasMaximasDiarias: 7,
                horasMaximasSemanales: 42,
                diasTrabajo: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
                diasDescanso: [0] // Domingo
            },
            mixta_acumulativa: {
                nombre: 'Mixta Acumulativa',
                descripcion: 'Jornada mixta acumulativa: L-V 9h trabajadas, 8h pagadas',
                horasTrabajadas: 9,
                horasPagadas: 8,
                horasMaximasDiarias: 9,
                horasMaximasSemanales: 48,
                diasTrabajo: [1, 2, 3, 4, 5], // Lunes a Viernes
                diasDescanso: [0, 6], // Sábado y Domingo
                // Horas específicas por día
                horasPorDia: {
                    1: 9, // Lunes
                    2: 9, // Martes
                    3: 9, // Miércoles
                    4: 9, // Jueves
                    5: 9, // Viernes
                    6: 0, // Sábado
                    0: 0  // Domingo
                }
            },
            mixta_ampliada: {
                nombre: 'Mixta Ampliada',
                descripcion: 'Jornada mixta ampliada: 8h trabajadas y pagadas',
                horasTrabajadas: 8,
                horasPagadas: 8,
                horasMaximasDiarias: 8,
                horasMaximasSemanales: 48,
                diasTrabajo: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
                diasDescanso: [0] // Domingo
            },
            parcial: {
                nombre: 'Parcial',
                descripcion: 'Jornada parcial: 4h trabajadas y pagadas',
                horasTrabajadas: 4,
                horasPagadas: 4,
                horasMaximasDiarias: 4,
                horasMaximasSemanales: 24,
                diasTrabajo: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
                diasDescanso: [0] // Domingo
            },
            medio_tiempo: {
                nombre: 'Medio Tiempo',
                descripcion: 'Medio tiempo: 4h trabajadas y pagadas',
                horasTrabajadas: 4,
                horasPagadas: 4,
                horasMaximasDiarias: 4,
                horasMaximasSemanales: 24,
                diasTrabajo: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
                diasDescanso: [0] // Domingo
            }
        };

        // Constantes legales
        this.constantes = {
            MAXIMO_HORAS_EXTRA_DIARIAS: 4,
            MAXIMO_HORAS_EXTRA_SEMANALES: 12,
            MAXIMO_HORAS_EXTRA_MENSUALES: 120
        };
    }

    /**
     * Obtiene la configuración de una jornada específica
     * @param {string} jornada - Tipo de jornada
     * @returns {Object} Configuración de la jornada
     */
    getJornadaConfig(jornada) {
        return this.jornadasConfig[jornada] || this.jornadasConfig.diurna;
    }

    /**
     * Obtiene el día de la semana como número (0=domingo, 1=lunes, etc.)
     * @param {string|Date} fecha - Fecha en formato YYYY-MM-DD o objeto Date
     * @returns {number} Día de la semana (0-6)
     */
    getDiaSemana(fecha) {
        const fechaObj = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
        return fechaObj.getDay();
    }

    /**
     * Obtiene el nombre del día de la semana
     * @param {string|Date} fecha - Fecha en formato YYYY-MM-DD o objeto Date
     * @returns {string} Nombre del día
     */
    getNombreDia(fecha) {
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const diaSemana = this.getDiaSemana(fecha);
        return dias[diaSemana];
    }

    /**
     * Verifica si un día es día de trabajo según el horario personalizado del empleado
     * @param {Object} empleado - Datos del empleado con horario personalizado
     * @param {string|Date} fecha - Fecha a verificar
     * @returns {boolean} True si es día de trabajo
     */
    esDiaTrabajo(empleado, fecha) {
        if (!empleado.horario) {
            // Si no tiene horario definido, usar configuración por defecto
            const config = this.getJornadaConfig(empleado.jornada);
            const diaSemana = this.getDiaSemana(fecha);
            return config.diasTrabajo.includes(diaSemana);
        }
        
        // Extraer días de trabajo del horario personalizado
        const diasTrabajo = this.extraerDiasTrabajo(empleado.horario);
        const diaSemana = this.getNombreDia(fecha).toLowerCase();
        return diasTrabajo.includes(diaSemana);
    }

    /**
     * Extrae los días de trabajo del horario personalizado del empleado
     * @param {string} horario - Horario en texto del empleado
     * @returns {Array} Array de días de trabajo
     */
    extraerDiasTrabajo(horario) {
        const dias = [];
        const horarioLower = horario.toLowerCase();
        
        const mapeoDias = {
            'lunes': 'lunes', 'monday': 'lunes',
            'martes': 'martes', 'tuesday': 'martes',
            'miercoles': 'miercoles', 'wednesday': 'miercoles',
            'jueves': 'jueves', 'thursday': 'jueves',
            'viernes': 'viernes', 'friday': 'viernes',
            'sabado': 'sabado', 'saturday': 'sabado',
            'domingo': 'domingo', 'sunday': 'domingo'
        };

        Object.keys(mapeoDias).forEach(dia => {
            if (horarioLower.includes(dia)) {
                dias.push(mapeoDias[dia]);
            }
        });

        // Buscar rangos como "lunes a viernes"
        const rangos = horarioLower.match(/(\w+)\s+a\s+(\w+)/g);
        if (rangos) {
            rangos.forEach(rango => {
                const match = rango.match(/(\w+)\s+a\s+(\w+)/);
                if (match) {
                    const diaInicio = mapeoDias[match[1].toLowerCase()];
                    const diaFin = mapeoDias[match[2].toLowerCase()];
                    if (diaInicio && diaFin) {
                        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                        const indiceInicio = diasSemana.indexOf(diaInicio);
                        const indiceFin = diasSemana.indexOf(diaFin);
                        
                        if (indiceInicio !== -1 && indiceFin !== -1) {
                            for (let i = indiceInicio; i <= indiceFin; i++) {
                                if (!dias.includes(diasSemana[i])) {
                                    dias.push(diasSemana[i]);
                                }
                            }
                        }
                    }
                }
            });
        }

        return dias;
    }

    /**
     * Calcula las horas sugeridas para un empleado en una fecha específica
     * @param {Object} empleado - Datos del empleado
     * @param {string|Date} fecha - Fecha de la asistencia
     * @param {string} tipo - Tipo de asistencia (presente, ausencia, etc.)
     * @returns {Object} Horas sugeridas y validaciones
     */
    calcularHorasSugeridas(empleado, fecha, tipo = 'presente') {
        const config = this.getJornadaConfig(empleado.jornada);
        const diaSemana = this.getDiaSemana(fecha);
        const nombreDia = this.getNombreDia(fecha);
        
        let horasTrabajadas = 0;
        let horasPagadas = 0;
        let esDiaLibre = false;
        let esValido = true;
        const alertas = [];
        const advertencias = [];

        // Verificar si es día de trabajo según el horario personalizado
        if (!this.esDiaTrabajo(empleado, fecha)) {
            esDiaLibre = true;
            if (tipo === 'presente') {
                alertas.push(`El ${nombreDia} es día libre según el horario del empleado`);
                esValido = false;
            }
        }

        if (tipo === 'presente' && !esDiaLibre) {
            // Obtener horas del horario personalizado del empleado
            const horasDelHorario = this.extraerHorasDelHorario(empleado.horario, nombreDia);
            
            if (horasDelHorario !== null) {
                // Usar las horas del horario personalizado
                horasTrabajadas = horasDelHorario;
            } else {
                // Fallback a configuración por defecto
                if (config.horasPorDia) {
                    horasTrabajadas = config.horasPorDia[diaSemana] || 0;
                } else {
                    horasTrabajadas = config.horasTrabajadas;
                }
            }

            // Calcular horas pagadas según jornada
            if (horasTrabajadas === 0) {
                // Si no trabajó horas, no se pagan horas
                horasPagadas = 0;
            } else if (empleado.jornada === 'nocturna') {
                // Jornada nocturna: se trabajan 6 horas pero se pagan 8
                horasPagadas = horasTrabajadas >= config.horasTrabajadas ? config.horasPagadas : horasTrabajadas;
            } else if (empleado.jornada === 'diurna_acumulativa') {
                // Jornada acumulativa: se trabajan 10 horas pero se pagan 8
                horasPagadas = horasTrabajadas >= config.horasTrabajadas ? config.horasPagadas : horasTrabajadas;
            } else if (empleado.jornada === 'mixta_acumulativa') {
                // Jornada mixta acumulativa: se trabajan 9 horas pero se pagan 8
                horasPagadas = horasTrabajadas >= config.horasTrabajadas ? config.horasPagadas : horasTrabajadas;
            } else {
                // Otras jornadas: se pagan las horas trabajadas
                horasPagadas = Math.min(horasTrabajadas, config.horasMaximasDiarias);
            }

        } else if (tipo === 'tardanza') {
            // Para tardanzas, calcular proporcionalmente
            const horasDelHorario = this.extraerHorasDelHorario(empleado.horario, nombreDia);
            if (horasDelHorario !== null) {
                horasTrabajadas = horasDelHorario * 0.8; // 80% por tardanza
            } else {
                if (config.horasPorDia) {
                    horasTrabajadas = (config.horasPorDia[diaSemana] || 0) * 0.8;
                } else {
                    horasTrabajadas = config.horasTrabajadas * 0.8;
                }
            }
            
            // Aplicar lógica de jornada para tardanzas
            if (horasTrabajadas === 0) {
                horasPagadas = 0;
            } else if (empleado.jornada === 'nocturna') {
                horasPagadas = horasTrabajadas >= config.horasTrabajadas ? config.horasPagadas : horasTrabajadas;
            } else if (empleado.jornada === 'diurna_acumulativa') {
                horasPagadas = horasTrabajadas >= config.horasTrabajadas ? config.horasPagadas : horasTrabajadas;
            } else if (empleado.jornada === 'mixta_acumulativa') {
                horasPagadas = horasTrabajadas >= config.horasTrabajadas ? config.horasPagadas : horasTrabajadas;
            } else {
                horasPagadas = Math.min(horasTrabajadas, config.horasMaximasDiarias);
            }

        } else if (tipo === 'permiso') {
            // Los permisos se pagan completos según la jornada
            const horasDelHorario = this.extraerHorasDelHorario(empleado.horario, nombreDia);
            if (horasDelHorario !== null) {
                horasTrabajadas = horasDelHorario;
            } else {
                if (config.horasPorDia) {
                    horasTrabajadas = config.horasPorDia[diaSemana] || 0;
                } else {
                    horasTrabajadas = config.horasTrabajadas;
                }
            }
            
            // Aplicar lógica de jornada para permisos
            if (horasTrabajadas === 0) {
                horasPagadas = 0;
            } else if (empleado.jornada === 'nocturna') {
                horasPagadas = config.horasPagadas; // Se pagan 8 horas completas
            } else if (empleado.jornada === 'diurna_acumulativa') {
                horasPagadas = config.horasPagadas; // Se pagan 8 horas completas
            } else if (empleado.jornada === 'mixta_acumulativa') {
                horasPagadas = config.horasPagadas; // Se pagan 8 horas completas
            } else {
                horasPagadas = config.horasPagadas;
            }

        } else if (tipo === 'ausencia') {
            horasTrabajadas = 0;
            horasPagadas = 0;
        }

        return {
            horasTrabajadas,
            horasPagadas,
            esDiaLibre,
            esValido,
            alertas,
            advertencias,
            configuracion: config,
            diaSemana,
            nombreDia
        };
    }

    /**
     * Extrae las horas de trabajo de un día específico del horario personalizado
     * @param {string} horario - Horario en texto del empleado
     * @param {string} diaSemana - Nombre del día de la semana
     * @returns {number|null} Horas de trabajo o null si no se encuentra
     */
    extraerHorasDelHorario(horario, diaSemana) {
        if (!horario) {
            return null;
        }
        
        const horarioLower = horario.toLowerCase();
        const diaLower = diaSemana.toLowerCase();
        
        // Buscar patrones como:
        // "martes a viernes: 7:00 a 5:00" -> 10 horas
        // "sábado: 8:00 a 4:00" -> 8 horas
        // "lunes: 8:00 a 5:00" -> 9 horas
        
        // Patrón 2: "día a día: hora1 a hora2" (para rangos como "martes a viernes") - PRIORITARIO
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaIndex = diasSemana.indexOf(diaLower);
        
        if (diaIndex >= 0) {
            // Intentar encontrar múltiples rangos o días en el horario
            const patron2 = new RegExp(`(\\w+)\\s*a\\s*(\\w+)\\s*:?\\s*(\\d{1,2})(?::?(\\d{2}))?\\s*a\\s*(\\d{1,2})(?::?(\\d{2}))?`, 'gi');
            let match2;
            while ((match2 = patron2.exec(horarioLower)) !== null) {
                const diaInicio = diasSemana.indexOf(match2[1].toLowerCase());
                const diaFin = diasSemana.indexOf(match2[2].toLowerCase());
                const horaInicio = parseInt(match2[3]);
                const minInicio = parseInt(match2[4] || '0');
                const horaFin = parseInt(match2[5]);
                const minFin = parseInt(match2[6] || '0');
                
                if (diaIndex >= diaInicio && diaIndex <= diaFin) {
                    const tiempoInicio = horaInicio * 60 + minInicio;
                    const tiempoFin = horaFin * 60 + minFin;
                    const horas = (tiempoFin - tiempoInicio) / 60;
                    return Math.max(0, horas);
                }
            }
        }
        
        // Patrón 1: "día: hora1 a hora2" (días individuales) - formato original
        const patron1 = new RegExp(`${diaLower}\\s*:?\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}\\s*a\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}`, 'i');
        const match1 = horarioLower.match(patron1);
        if (match1) {
            const horaInicio = parseInt(match1[1]);
            const horaFin = parseInt(match1[2]);
            const horas = horaFin - horaInicio;
            return Math.max(0, horas);
        }
        
        // Patrón 1b: "día: hora1 AM - hora2 PM" (formato con AM/PM y guión)
        const patron1b = new RegExp(`${diaLower}\\s*:?\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}\\s*(a\\.?m\\.?)?\\s*-\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}\\s*(p\\.?m\\.?)?`, 'i');
        const match1b = horarioLower.match(patron1b);
        if (match1b) {
            let horaInicio = parseInt(match1b[1]);
            let horaFin = parseInt(match1b[3]);
            
            // Convertir a 24 horas si es necesario
            if (match1b[2] && horaInicio === 12) horaInicio = 0;
            if (match1b[4] && horaFin !== 12) horaFin += 12;
            if (match1b[4] && horaFin === 12) horaFin = 12;
            
            const horas = horaFin - horaInicio;
            return Math.max(0, horas);
        }
        
        // Patrón 3: "día: X horas" (horas explícitas)
        const patron3 = new RegExp(`${diaLower}\\s*:?\\s*(\\d+)\\s*horas?`, 'i');
        const match3 = horarioLower.match(patron3);
        if (match3) {
            const horas = parseInt(match3[1]);
            return horas;
        }
        
        // Patrón 4: "día: Libre" (día libre)
        const patron4 = new RegExp(`${diaLower}\\s*:?\\s*libre`, 'i');
        const match4 = horarioLower.match(patron4);
        if (match4) {
            return 0;
        }
        
        return null;
    }

    /**
     * Valida una asistencia registrada
     * @param {Object} asistencia - Datos de la asistencia
     * @param {Object} empleado - Datos del empleado
     * @returns {Object} Resultado de la validación
     */
    validarAsistencia(asistencia, empleado) {
        const config = this.getJornadaConfig(empleado.jornada);
        const horasTrabajadas = parseFloat(asistencia.hours || 0);
        const horasExtra = parseFloat(asistencia.horasExtra || 0);
        const tipo = asistencia.type || 'presente';
        const fecha = asistencia.date;
        
        const alertas = [];
        const advertencias = [];
        let esValido = true;

        // Obtener sugerencias para comparar
        const sugerencias = this.calcularHorasSugeridas(empleado, fecha, tipo);

        // Validar si es día de trabajo
        if (tipo === 'presente' && sugerencias.esDiaLibre) {
            alertas.push(`El ${sugerencias.nombreDia} es día libre para jornada ${config.nombre}`);
            esValido = false;
        }

        // Validar horas trabajadas
        if (horasTrabajadas > config.horasMaximasDiarias + this.constantes.MAXIMO_HORAS_EXTRA_DIARIAS) {
            alertas.push(`Las horas trabajadas (${horasTrabajadas}) exceden significativamente el máximo para jornada ${config.nombre}`);
            esValido = false;
        }

        // Validar horas extra
        const horasExtraCalculadas = Math.max(0, horasTrabajadas - config.horasMaximasDiarias);
        if (horasExtraCalculadas > this.constantes.MAXIMO_HORAS_EXTRA_DIARIAS) {
            advertencias.push(`Las horas extra calculadas (${horasExtraCalculadas}) exceden el máximo legal diario (${this.constantes.MAXIMO_HORAS_EXTRA_DIARIAS})`);
        }

        // Validar consistencia entre horas trabajadas y horas extra registradas
        if (horasExtra > 0 && Math.abs(horasExtra - horasExtraCalculadas) > 0.1) {
            advertencias.push(`Inconsistencia: horas extra registradas (${horasExtra}) vs calculadas (${horasExtraCalculadas})`);
        }

        // Comparar con horas sugeridas
        if (tipo === 'presente' && !sugerencias.esDiaLibre) {
            const diferencia = Math.abs(horasTrabajadas - sugerencias.horasTrabajadas);
            if (diferencia > 0.5) {
                advertencias.push(`Las horas registradas (${horasTrabajadas}) difieren de las sugeridas (${sugerencias.horasTrabajadas}) para ${config.nombre}`);
            }
        }

        return {
            esValido,
            alertas,
            advertencias,
            horasExtraCalculadas,
            sugerencias,
            configuracion: config
        };
    }

    /**
     * Genera registros automáticos de asistencias para un empleado en un período
     * @param {Object} empleado - Datos del empleado
     * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
     * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
     * @param {Array} feriados - Array de fechas de feriados
     * @returns {Array} Array de registros de asistencia generados
     */
    generarAsistenciasAutomaticas(empleado, fechaInicio, fechaFin, feriados = []) {
        const registros = [];
        const config = this.getJornadaConfig(empleado.jornada);
        
        // Generar fechas entre inicio y fin
        const fechas = this.generarFechasEntre(fechaInicio, fechaFin);
        
        fechas.forEach(fecha => {
            const diaSemana = this.getDiaSemana(fecha);
            const nombreDia = this.getNombreDia(fecha);
            const esFeriado = feriados.includes(fecha);
            
            // Determinar tipo de asistencia
            let tipo = 'presente';
            let horasTrabajadas = 0;
            let horasPagadas = 0;
            let detalle = '';

            if (esFeriado) {
                tipo = 'feriado';
                detalle = 'Feriado nacional';
            } else if (!this.esDiaTrabajo(empleado, fecha)) {
                tipo = 'libre';
                detalle = `Día libre según horario - ${nombreDia}`;
            } else {
                // Día de trabajo normal - usar horario personalizado
                const sugerencias = this.calcularHorasSugeridas(empleado, fecha, 'presente');
                horasTrabajadas = sugerencias.horasTrabajadas;
                horasPagadas = sugerencias.horasPagadas;
                detalle = `${config.nombre} - ${nombreDia}`;
            }

            registros.push({
                empleadoId: empleado.id,
                fecha: fecha,
                tipo: tipo,
                horas: horasTrabajadas,
                horasPagadas: horasPagadas,
                horasExtra: 0,
                detalle: detalle,
                generadoAutomaticamente: true
            });
        });

        return registros;
    }

    /**
     * Genera un array de fechas entre dos fechas
     * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
     * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
     * @returns {Array} Array de fechas
     */
    generarFechasEntre(fechaInicio, fechaFin) {
        const fechas = [];
        const inicio = new Date(fechaInicio + 'T00:00:00');
        const fin = new Date(fechaFin + 'T00:00:00');
        
        for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
            fechas.push(fecha.toISOString().slice(0, 10));
        }
        
        return fechas;
    }

    /**
     * Obtiene un resumen de la configuración de jornadas
     * @returns {Object} Resumen de todas las jornadas
     */
    getResumenJornadas() {
        const resumen = {};
        
        Object.keys(this.jornadasConfig).forEach(jornada => {
            const config = this.jornadasConfig[jornada];
            resumen[jornada] = {
                nombre: config.nombre,
                descripcion: config.descripcion,
                diasTrabajo: config.diasTrabajo.map(dia => {
                    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    return dias[dia];
                }),
                horasTrabajadas: config.horasTrabajadas,
                horasPagadas: config.horasPagadas
            };
        });
        
        return resumen;
    }
}

// Exportar la clase
export default AttendanceCalculatorCR;
