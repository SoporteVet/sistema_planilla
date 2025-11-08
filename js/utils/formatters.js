/**
 * Formatters - Sistema de Planillas Costa Rica
 * Funciones de formateo de datos para display
 */

const Formatters = {
    /**
     * Formatea monto en colones costarricenses
     * @param {number} monto - Monto a formatear
     * @returns {string} Monto formateado
     */
    formatearMoneda(monto) {
        if (monto === null || monto === undefined || isNaN(monto)) {
            return '₡0.00';
        }
        
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: 'CRC',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(monto);
    },

    /**
     * Formatea monto con más decimales (para salario horario)
     * @param {number} monto - Monto a formatear
     * @param {number} decimales - Cantidad de decimales (por defecto 7)
     * @returns {string} Monto formateado
     */
    formatearMonedaPrecisa(monto, decimales = 7) {
        if (monto === null || monto === undefined || isNaN(monto)) {
            return '₡0.00';
        }
        
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: 'CRC',
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales
        }).format(monto);
    },

    /**
     * Formatea número con separadores de miles
     * @param {number} numero - Número a formatear
     * @param {number} decimales - Cantidad de decimales
     * @returns {string} Número formateado
     */
    formatearNumero(numero, decimales = 2) {
        if (numero === null || numero === undefined || isNaN(numero)) {
            return '0';
        }
        
        return new Intl.NumberFormat('es-CR', {
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales
        }).format(numero);
    },

    /**
     * Formatea fecha en formato DD/MM/YYYY
     * @param {Date|string|number} fecha - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    formatearFecha(fecha) {
        if (!fecha) return '-';
        
        let fechaObj;
        if (fecha instanceof Date) {
            fechaObj = fecha;
        } else if (typeof fecha === 'number') {
            // Si es un timestamp, crear Date y usar métodos locales
            fechaObj = new Date(fecha);
        } else {
            fechaObj = new Date(fecha);
        }
        
        if (isNaN(fechaObj.getTime())) return '-';
        
        // Usar métodos locales para evitar problemas de zona horaria
        const dia = String(fechaObj.getDate()).padStart(2, '0');
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const ano = fechaObj.getFullYear();
        
        return `${dia}/${mes}/${ano}`;
    },

    /**
     * Formatea fecha en formato largo (DD de MMMM, YYYY)
     * @param {Date|string|number} fecha - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    formatearFechaLarga(fecha) {
        if (!fecha) return '-';
        
        let fechaObj;
        if (fecha instanceof Date) {
            fechaObj = fecha;
        } else if (typeof fecha === 'number') {
            // Si es un timestamp, crear Date y usar métodos locales
            fechaObj = new Date(fecha);
        } else {
            fechaObj = new Date(fecha);
        }
        
        if (isNaN(fechaObj.getTime())) return '-';
        
        const meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        // Usar métodos locales para evitar problemas de zona horaria
        const dia = fechaObj.getDate();
        const mes = meses[fechaObj.getMonth()];
        const ano = fechaObj.getFullYear();
        
        return `${dia} de ${mes}, ${ano}`;
    },

    /**
     * Formatea fecha para input date (YYYY-MM-DD)
     * @param {Date|string|number} fecha - Fecha a formatear
     * @returns {string} Fecha en formato YYYY-MM-DD
     */
    formatearFechaInput(fecha) {
        if (!fecha) return '';
        
        let fechaObj;
        if (fecha instanceof Date) {
            fechaObj = fecha;
        } else if (typeof fecha === 'number') {
            // Si es un timestamp, crear Date y usar métodos locales
            fechaObj = new Date(fecha);
        } else {
            fechaObj = new Date(fecha);
        }
        
        if (isNaN(fechaObj.getTime())) return '';
        
        // Usar métodos locales para evitar problemas de zona horaria
        const ano = fechaObj.getFullYear();
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaObj.getDate()).padStart(2, '0');
        
        return `${ano}-${mes}-${dia}`;
    },

    /**
     * Formatea fecha para Firebase (YYYYMMDD)
     * @param {Date|string} fecha - Fecha a formatear
     * @returns {string} Fecha en formato YYYYMMDD
     */
    formatearFechaFirebase(fecha) {
        if (!fecha) return '';
        
        const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
        
        if (isNaN(fechaObj.getTime())) return '';
        
        const ano = fechaObj.getFullYear();
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaObj.getDate()).padStart(2, '0');
        
        return `${ano}${mes}${dia}`;
    },

    /**
     * Formatea mes y año (MM/YYYY)
     * @param {Date|string|number} fecha - Fecha a formatear
     * @returns {string} Mes y año formateado
     */
    formatearMesAno(fecha) {
        if (!fecha) return '-';
        
        const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
        
        if (isNaN(fechaObj.getTime())) return '-';
        
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const ano = fechaObj.getFullYear();
        
        return `${mes}/${ano}`;
    },

    /**
     * Formatea cédula con guiones (9-XXXX-XXXX)
     * @param {string} cedula - Cédula sin formato
     * @returns {string} Cédula formateada
     */
    formatearCedula(cedula) {
        if (!cedula) return '-';
        
        const cedulaLimpia = cedula.replace(/[-\s]/g, '');
        
        if (cedulaLimpia.length !== 9) return cedula;
        
        return `${cedulaLimpia[0]}-${cedulaLimpia.slice(1, 5)}-${cedulaLimpia.slice(5)}`;
    },

    /**
     * Formatea teléfono con guiones (XXXX-XXXX)
     * @param {string} telefono - Teléfono sin formato
     * @returns {string} Teléfono formateado
     */
    formatearTelefono(telefono) {
        if (!telefono) return '-';
        
        const telefonoLimpio = telefono.replace(/[-\s]/g, '');
        
        if (telefonoLimpio.length !== 8) return telefono;
        
        return `${telefonoLimpio.slice(0, 4)}-${telefonoLimpio.slice(4)}`;
    },

    /**
     * Formatea porcentaje
     * @param {number} porcentaje - Porcentaje a formatear
     * @param {number} decimales - Cantidad de decimales
     * @returns {string} Porcentaje formateado
     */
    formatearPorcentaje(porcentaje, decimales = 2) {
        if (porcentaje === null || porcentaje === undefined || isNaN(porcentaje)) {
            return '0%';
        }
        
        return `${this.formatearNumero(porcentaje, decimales)}%`;
    },

    /**
     * Formatea estado con badge HTML
     * @param {string} estado - Estado a formatear
     * @param {object} config - Configuración de estados
     * @returns {string} HTML del badge
     */
    formatearEstadoBadge(estado, config = {}) {
        const defaultConfig = {
            activo: { class: 'badge-success', text: 'Activo' },
            inactivo: { class: 'badge-secondary', text: 'Inactivo' },
            suspendido: { class: 'badge-warning', text: 'Suspendido' },
            pendiente: { class: 'badge-warning', text: 'Pendiente' },
            aprobado: { class: 'badge-success', text: 'Aprobado' },
            rechazado: { class: 'badge-danger', text: 'Rechazado' },
            generada: { class: 'badge-info', text: 'Generada' },
            pagada: { class: 'badge-success', text: 'Pagada' },
            anulada: { class: 'badge-danger', text: 'Anulada' }
        };
        
        const finalConfig = { ...defaultConfig, ...config };
        const estadoConfig = finalConfig[estado] || { class: 'badge-secondary', text: estado };
        
        return `<span class="badge ${estadoConfig.class}">${estadoConfig.text}</span>`;
    },

    /**
     * Formatea nombre de jornada
     * @param {string} codigoJornada - Código de jornada
     * @returns {string} Nombre de jornada
     */
    formatearJornada(codigoJornada) {
        const jornada = CONFIG.getJornadaByCodigo(codigoJornada);
        return jornada ? jornada.nombre : codigoJornada;
    },

    /**
     * Formatea horas con singular/plural
     * @param {number} horas - Cantidad de horas
     * @returns {string} Horas formateadas
     */
    formatearHoras(horas) {
        if (horas === null || horas === undefined || isNaN(horas)) {
            return '0 horas';
        }
        
        const horasRedondeadas = Math.round(horas * 100) / 100;
        return `${horasRedondeadas} ${horasRedondeadas === 1 ? 'hora' : 'horas'}`;
    },

    /**
     * Formatea días con singular/plural
     * @param {number} dias - Cantidad de días
     * @returns {string} Días formateados
     */
    formatearDias(dias) {
        if (dias === null || dias === undefined || isNaN(dias)) {
            return '0 días';
        }
        
        const diasRedondeados = Math.round(dias * 10) / 10;
        return `${diasRedondeados} ${diasRedondeados === 1 ? 'día' : 'días'}`;
    },

    /**
     * Trunca texto largo
     * @param {string} texto - Texto a truncar
     * @param {number} maxLength - Longitud máxima
     * @returns {string} Texto truncado
     */
    truncarTexto(texto, maxLength = 50) {
        if (!texto) return '-';
        
        if (texto.length <= maxLength) return texto;
        
        return texto.substring(0, maxLength) + '...';
    },

    /**
     * Formatea tipo de día de asistencia
     * @param {string} tipoDia - Tipo de día
     * @returns {string} Texto descriptivo
     */
    formatearTipoDia(tipoDia) {
        const tipos = {
            normal: 'Día Normal',
            incompleto: 'Horas Incompletas',
            permiso: 'Permiso Sin Goce',
            ccss: 'Incapacidad CCSS',
            ins: 'Incapacidad INS',
            festivo: 'Feriado Trabajado',
            dia_libre: 'Día Libre Trabajado',
            libre: 'Día Libre (Pagado)',
            extras: 'Horas Extra'
        };
        
        return tipos[tipoDia] || tipoDia;
    },

    /**
     * Formatea rol de usuario
     * @param {string} rol - Rol
     * @returns {string} Texto descriptivo
     */
    formatearRol(rol) {
        const roles = {
            admin: 'Administrador',
            gerente_rrhh: 'Gerente RRHH',
            supervisor: 'Supervisor',
            contador: 'Contador',
            empleado: 'Empleado'
        };
        
        return roles[rol] || rol;
    },

    /**
     * Genera iniciales de un nombre
     * @param {string} nombre - Nombre completo
     * @returns {string} Iniciales
     */
    generarIniciales(nombre) {
        if (!nombre) return '??';
        
        const palabras = nombre.trim().split(/\s+/);
        
        if (palabras.length === 1) {
            return palabras[0].substring(0, 2).toUpperCase();
        }
        
        return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
    },

    /**
     * Formatea tamaño de archivo
     * @param {number} bytes - Tamaño en bytes
     * @returns {string} Tamaño formateado
     */
    formatearTamanoArchivo(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Capitaliza primera letra
     * @param {string} texto - Texto a capitalizar
     * @returns {string} Texto capitalizado
     */
    capitalizar(texto) {
        if (!texto) return '';
        
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    },

    /**
     * Formatea período de planilla
     * @param {Date} inicio - Fecha inicio
     * @param {Date} fin - Fecha fin
     * @returns {string} Período formateado
     */
    formatearPeriodoPlanilla(inicio, fin) {
        return `${this.formatearFecha(inicio)} - ${this.formatearFecha(fin)}`;
    },

    /**
     * Formatea timestamp relativo (hace X tiempo)
     * @param {Date|string|number} fecha - Fecha
     * @returns {string} Tiempo relativo
     */
    formatearTiempoRelativo(fecha) {
        if (!fecha) return '-';
        
        const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
        
        if (isNaN(fechaObj.getTime())) return '-';
        
        const ahora = new Date();
        const diferencia = ahora - fechaObj;
        const segundos = Math.floor(diferencia / 1000);
        const minutos = Math.floor(segundos / 60);
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);
        
        if (segundos < 60) return 'Hace un momento';
        if (minutos < 60) return `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
        if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
        if (dias < 30) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
        
        return this.formatearFecha(fechaObj);
    }
};

// Export to window
window.Formatters = Formatters;

