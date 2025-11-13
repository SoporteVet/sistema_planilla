/**
 * Validators - Sistema de Planillas Costa Rica
 * Validaciones de datos según normativa costarricense
 */

const Validators = {
    /**
     * Valida cédula (sin restricciones - acepta cualquier valor)
     * @param {string} cedula - Cédula a validar
     * @returns {boolean} Es válida
     */
    validarCedula(cedula) {
        // Sin restricciones - solo verificar que no esté vacía
        return cedula && cedula.trim() !== '';
    },

    /**
     * Formatea cédula con guiones (9-XXXX-XXXX)
     * @param {string} cedula - Cédula sin formato
     * @returns {string} Cédula formateada
     */
    formatearCedula(cedula) {
        if (!cedula) return '';
        
        const cedulaLimpia = cedula.replace(/[-\s]/g, '');
        
        if (cedulaLimpia.length !== 9) return cedula;
        
        return `${cedulaLimpia[0]}-${cedulaLimpia.slice(1, 5)}-${cedulaLimpia.slice(5)}`;
    },

    /**
     * Valida formato de email
     * @param {string} email - Email a validar
     * @returns {boolean} Es válido
     */
    validarEmail(email) {
        if (!email) return false;
        
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Valida teléfono costarricense (8 dígitos)
     * @param {string} telefono - Teléfono a validar
     * @returns {boolean} Es válido
     */
    validarTelefono(telefono) {
        if (!telefono) return true; // Opcional
        
        const telefonoLimpio = telefono.replace(/[-\s]/g, '');
        return /^\d{8}$/.test(telefonoLimpio);
    },

    /**
     * Valida IBAN costarricense
     * @param {string} iban - IBAN a validar
     * @returns {boolean} Es válido
     */
    validarIBAN(iban) {
        if (!iban) return false;
        
        const ibanLimpio = iban.replace(/\s/g, '').toUpperCase();
        
        // IBAN CR tiene 22 caracteres: CR + 2 dígitos verificadores + 18 dígitos
        if (!/^CR\d{20}$/.test(ibanLimpio)) return false;
        
        return true;
    },

    /**
     * Valida monto numérico positivo
     * @param {number|string} monto - Monto a validar
     * @returns {boolean} Es válido
     */
    validarMonto(monto) {
        const numero = typeof monto === 'string' ? parseFloat(monto) : monto;
        return !isNaN(numero) && numero >= 0 && isFinite(numero);
    },

    /**
     * Valida rango de horas (0-24)
     * @param {number} horas - Horas a validar
     * @returns {boolean} Es válido
     */
    validarHoras(horas) {
        return typeof horas === 'number' && horas >= 0 && horas <= 24;
    },

    /**
     * Valida que horas trabajadas no excedan la jornada (sin ser extras)
     * @param {number} horasTrabajadas - Horas trabajadas
     * @param {string} codigoJornada - Código de jornada
     * @param {boolean} esExtra - Si son horas extra
     * @returns {object} { valido, mensaje }
     */
    validarHorasJornada(horasTrabajadas, codigoJornada, esExtra = false) {
        const jornada = CONFIG.getJornadaByCodigo(codigoJornada);
        
        if (esExtra) {
            return { valido: true, mensaje: '' };
        }
        
        if (horasTrabajadas > jornada.horasPorDia) {
            return {
                valido: false,
                mensaje: `Las horas trabajadas (${horasTrabajadas}) exceden las horas de jornada (${jornada.horasPorDia}). Marque como horas extra si corresponde.`
            };
        }
        
        return { valido: true, mensaje: '' };
    },

    /**
     * Valida porcentaje (0-100)
     * @param {number} porcentaje - Porcentaje a validar
     * @returns {boolean} Es válido
     */
    validarPorcentaje(porcentaje) {
        return typeof porcentaje === 'number' && porcentaje >= 0 && porcentaje <= 100;
    },

    /**
     * Valida fecha (no futura para asistencias)
     * @param {string|Date} fecha - Fecha a validar
     * @param {boolean} permitirFutura - Si permite fechas futuras
     * @returns {object} { valido, mensaje }
     */
    validarFecha(fecha, permitirFutura = false) {
        let fechaObj;
        
        if (fecha instanceof Date) {
            fechaObj = fecha;
        } else if (typeof fecha === 'string') {
            // Si es formato YYYYMMDD (8 dígitos)
            if (/^\d{8}$/.test(fecha)) {
                const ano = parseInt(fecha.substring(0, 4));
                const mes = parseInt(fecha.substring(4, 6)) - 1; // Mes es 0-indexed
                const dia = parseInt(fecha.substring(6, 8));
                fechaObj = new Date(ano, mes, dia);
            } else {
                // Intentar parsear como fecha estándar
                fechaObj = new Date(fecha);
            }
        } else {
            return { valido: false, mensaje: 'Fecha inválida' };
        }
        
        if (isNaN(fechaObj.getTime())) {
            return { valido: false, mensaje: 'Fecha inválida' };
        }
        
        if (!permitirFutura && fechaObj > new Date()) {
            return { valido: false, mensaje: 'No se permiten fechas futuras' };
        }
        
        return { valido: true, mensaje: '' };
    },

    /**
     * Valida que un período de fechas sea coherente
     * @param {Date} fechaInicio - Fecha de inicio
     * @param {Date} fechaFin - Fecha fin
     * @returns {object} { valido, mensaje }
     */
    validarPeriodo(fechaInicio, fechaFin) {
        if (!(fechaInicio instanceof Date) || !(fechaFin instanceof Date)) {
            return { valido: false, mensaje: 'Fechas inválidas' };
        }
        
        if (fechaInicio > fechaFin) {
            return { valido: false, mensaje: 'La fecha de inicio no puede ser posterior a la fecha fin' };
        }
        
        return { valido: true, mensaje: '' };
    },

    /**
     * Valida datos de empleado
     * @param {object} empleado - Datos del empleado
     * @returns {object} { valido, errores }
     */
    validarEmpleado(empleado) {
        const errores = {};
        
        if (!empleado.nombre || empleado.nombre.trim().length < 3) {
            errores.nombre = 'El nombre es obligatorio (mínimo 3 caracteres)';
        }
        
        if (!this.validarCedula(empleado.cedula)) {
            errores.cedula = 'La cédula es requerida';
        }
        
        if (!this.validarEmail(empleado.correo)) {
            errores.correo = 'Email inválido';
        }
        
        if (empleado.telefono && !this.validarTelefono(empleado.telefono)) {
            errores.telefono = 'Teléfono inválido (8 dígitos)';
        }
        
        if (!empleado.fechaIngreso) {
            errores.fechaIngreso = 'Fecha de ingreso es obligatoria';
        }
        
        if (!this.validarMonto(empleado.salarioMensual) || empleado.salarioMensual <= 0) {
            errores.salarioMensual = 'Salario mensual debe ser un número positivo';
        }
        
        if (!empleado.jornada) {
            errores.jornada = 'Jornada laboral es obligatoria';
        }
        
        if (!empleado.cargo || empleado.cargo.trim().length < 2) {
            errores.cargo = 'Cargo es obligatorio';
        }
        
        if (!empleado.departamento || empleado.departamento.trim().length < 2) {
            errores.departamento = 'Departamento es obligatorio';
        }
        
        return {
            valido: Object.keys(errores).length === 0,
            errores
        };
    },

    /**
     * Valida datos de asistencia
     * @param {object} asistencia - Datos de asistencia
     * @param {boolean} permitirFutura - Si permite fechas futuras (útil para períodos quincenales)
     * @returns {object} { valido, errores }
     */
    validarAsistencia(asistencia, permitirFutura = false) {
        const errores = {};
        
        if (!asistencia.empleadoId) {
            errores.empleadoId = 'Debe seleccionar un empleado';
        }
        
        if (!asistencia.fecha) {
            errores.fecha = 'Fecha es obligatoria';
        } else {
            const validacionFecha = this.validarFecha(asistencia.fecha, permitirFutura);
            if (!validacionFecha.valido) {
                errores.fecha = validacionFecha.mensaje;
            }
        }
        
        if (!asistencia.tipoDia) {
            errores.tipoDia = 'Tipo de día es obligatorio';
        }
        
        if (asistencia.horasTrabajadas !== undefined && !this.validarHoras(asistencia.horasTrabajadas)) {
            errores.horasTrabajadas = 'Horas trabajadas debe estar entre 0 y 24';
        }
        
        if (asistencia.horasExtra !== undefined && asistencia.horasExtra > 0) {
            if (!this.validarHoras(asistencia.horasExtra)) {
                errores.horasExtra = 'Horas extra debe estar entre 0 y 24';
            }
            if (asistencia.horasExtra > CONFIG.HORAS_EXTRA.MAX_DIARIAS) {
                errores.horasExtra = `Máximo ${CONFIG.HORAS_EXTRA.MAX_DIARIAS} horas extra por día (informativo)`;
            }
        }
        
        if (asistencia.diasCCSSEmpresa > CONFIG.CCSS.DIAS_EMPRESA_MAX) {
            errores.diasCCSSEmpresa = `Máximo ${CONFIG.CCSS.DIAS_EMPRESA_MAX} días de incapacidad CCSS para empresa`;
        }
        
        if (asistencia.diasINSEmpresa > CONFIG.INS.DIAS_EMPRESA_MAX) {
            errores.diasINSEmpresa = `Máximo ${CONFIG.INS.DIAS_EMPRESA_MAX} día de incapacidad INS para empresa`;
        }
        
        return {
            valido: Object.keys(errores).length === 0,
            errores
        };
    },

    /**
     * Valida datos de bono/rebajo
     * @param {object} bonoRebajo - Datos de bono/rebajo
     * @returns {object} { valido, errores }
     */
    validarBonoRebajo(bonoRebajo) {
        const errores = {};
        
        if (!bonoRebajo.empleadoId) {
            errores.empleadoId = 'Debe seleccionar un empleado';
        }
        
        if (!bonoRebajo.tipo) {
            errores.tipo = 'Tipo (Bono/Rebajo) es obligatorio';
        }
        
        if (!bonoRebajo.concepto || bonoRebajo.concepto.trim().length < 3) {
            errores.concepto = 'Concepto es obligatorio';
        }
        
        if (!bonoRebajo.monto && !bonoRebajo.porcentaje) {
            errores.monto = 'Debe ingresar monto o porcentaje';
        }
        
        if (bonoRebajo.monto && !this.validarMonto(bonoRebajo.monto)) {
            errores.monto = 'Monto debe ser un número positivo';
        }
        
        if (bonoRebajo.porcentaje && !this.validarPorcentaje(bonoRebajo.porcentaje)) {
            errores.porcentaje = 'Porcentaje debe estar entre 0 y 100';
        }
        
        if (!bonoRebajo.fechaAplicacion) {
            errores.fechaAplicacion = 'Fecha de aplicación es obligatoria';
        }
        
        if (!bonoRebajo.fechaVigencia) {
            errores.fechaVigencia = 'Fecha de vigencia es obligatoria';
        }
        
        return {
            valido: Object.keys(errores).length === 0,
            errores
        };
    },

    /**
     * Valida datos de planilla
     * @param {object} planilla - Datos de planilla
     * @returns {object} { valido, errores }
     */
    validarPlanilla(planilla) {
        const errores = {};
        
        if (!planilla.periodoInicio) {
            errores.periodoInicio = 'Fecha de inicio es obligatoria';
        }
        
        if (!planilla.periodoFin) {
            errores.periodoFin = 'Fecha fin es obligatoria';
        }
        
        if (planilla.periodoInicio && planilla.periodoFin) {
            const validacionPeriodo = this.validarPeriodo(
                new Date(planilla.periodoInicio),
                new Date(planilla.periodoFin)
            );
            if (!validacionPeriodo.valido) {
                errores.periodo = validacionPeriodo.mensaje;
            }
        }
        
        if (!planilla.tipoPeriodo) {
            errores.tipoPeriodo = 'Tipo de período es obligatorio';
        }
        
        return {
            valido: Object.keys(errores).length === 0,
            errores
        };
    },

    /**
     * Valida que no existan duplicados de cédula
     * @param {string} cedula - Cédula a verificar
     * @param {string} empleadoIdExcluir - ID del empleado a excluir (para edición)
     * @param {array} empleadosExistentes - Array de empleados existentes
     * @returns {boolean} Es único
     */
    validarCedulaUnica(cedula, empleadoIdExcluir, empleadosExistentes) {
        const cedulaLimpia = cedula.replace(/[-\s]/g, '');
        
        return !empleadosExistentes.some(emp => 
            emp.cedula.replace(/[-\s]/g, '') === cedulaLimpia && 
            emp.id !== empleadoIdExcluir
        );
    },

    /**
     * Sanitiza input de texto
     * @param {string} texto - Texto a sanitizar
     * @returns {string} Texto sanitizado
     */
    sanitizarTexto(texto) {
        if (!texto) return '';
        
        return texto
            .trim()
            .replace(/[<>]/g, '') // Prevenir XSS básico
            .substring(0, 1000); // Limitar longitud
    },

    /**
     * Sanitiza input numérico
     * @param {string|number} numero - Número a sanitizar
     * @returns {number} Número sanitizado
     */
    sanitizarNumero(numero) {
        const num = typeof numero === 'string' ? parseFloat(numero) : numero;
        return isNaN(num) ? 0 : Math.max(0, num);
    }
};

// Export to window
window.Validators = Validators;

