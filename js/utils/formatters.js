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
            // Si es un timestamp, crear Date
            fechaObj = new Date(fecha);
            
            // Para evitar problemas de zona horaria con fechas (sin hora específica),
            // si el timestamp representa medianoche local, usar componentes locales directamente
            // Esto es importante cuando el timestamp fue creado con new Date(año, mes, dia, 0, 0, 0, 0)
            const horas = fechaObj.getHours();
            const minutos = fechaObj.getMinutes();
            const segundos = fechaObj.getSeconds();
            const milisegundos = fechaObj.getMilliseconds();
            
            // Si es medianoche (o muy cerca), reconstruir la fecha usando componentes locales
            // para evitar desfases por zona horaria
            if (horas === 0 && minutos === 0 && segundos === 0 && milisegundos === 0) {
                fechaObj = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate());
            }
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
     * Redondea horas a 2 decimales (evita errores de punto flotante)
     * @param {number} horas
     * @param {number} decimales
     * @returns {number}
     */
    redondearHoras(horas, decimales = 2) {
        if (horas === null || horas === undefined || isNaN(horas)) return 0;
        const factor = Math.pow(10, decimales);
        return Math.round(Number(horas) * factor) / factor;
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

        const horasRedondeadas = this.redondearHoras(horas);
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
            empleado: 'Empleado',
            operador_asistencia: 'Operador Asistencia'
        };

        return roles[rol] || rol;
    },

    /**
     * Formatea fecha como clave para Firebase (YYYYMMDD)
     * @param {Date|string|number} fecha - Fecha a formatear
     * @returns {string} Fecha en formato YYYYMMDD
     */
    formatearFechaKey(fecha) {
        if (!fecha) return '';

        const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);

        if (isNaN(fechaObj.getTime())) return '';

        const ano = fechaObj.getFullYear();
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaObj.getDate()).padStart(2, '0');

        return `${ano}${mes}${dia}`;
    },

    /**
     * Parsea una hora en formato 24h (HH:mm o HH:mm:ss) o 12h con AM/PM.
     * Acepta: "08:30", "08:30:00", "8:30 AM", "2:30 PM", "14:30".
     * @param {string} texto - Cadena con la hora
     * @returns {{ horas: number, minutos: number, minutosDesdeMedianoche: number }|null} Objeto con horas (0-23), minutos (0-59) y minutos desde medianoche, o null si no se pudo parsear
     */
    parsearHoraReloj(texto) {
        if (!texto || typeof texto !== 'string') return null;
        const t = texto.trim();
        if (!t) return null;

        // Formato 24h: HH:mm o HH:mm:ss
        const match24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/);
        if (match24) {
            let h = parseInt(match24[1], 10);
            const m = parseInt(match24[2], 10);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                return { horas: h, minutos: m, minutosDesdeMedianoche: h * 60 + m };
            }
        }

        // Formato 12h con AM/PM (ej: "8:30 AM", "2:00 PM", "12:30 PM", "12:00 AM")
        const match12 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm|a\.m\.|p\.m\.|A\.M\.|P\.M\.)\s*$/);
        if (match12) {
            let h = parseInt(match12[1], 10);
            const m = parseInt(match12[2], 10);
            const ampm = match12[4].toUpperCase().replace(/\./g, '');
            if (h < 1 || h > 12 || m < 0 || m > 59) return null;
            if (ampm === 'AM') {
                if (h === 12) h = 0;
            } else {
                if (h !== 12) h += 12;
            }
            return { horas: h, minutos: m, minutosDesdeMedianoche: h * 60 + m };
        }

        return null;
    },

    /**
     * Formatea hora en formato HH:mm
     * @param {Date|string|number} fecha - Fecha/hora a formatear
     * @returns {string} Hora en formato HH:mm
     */
    formatearHora(fecha) {
        if (!fecha) return '';

        const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);

        if (isNaN(fechaObj.getTime())) return '';

        const horas = String(fechaObj.getHours()).padStart(2, '0');
        const minutos = String(fechaObj.getMinutes()).padStart(2, '0');

        return `${horas}:${minutos}`;
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
    },

    /**
     * Formatea fecha para nombres de archivo (YYYYMMDD_HHMMSS)
     * @param {Date|string|number} fecha - Fecha
     * @returns {string} Fecha formateada para archivos
     */
    formatearFechaArchivo(fecha) {
        const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);

        if (isNaN(fechaObj.getTime())) {
            return 'fecha_invalida';
        }

        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const day = String(fechaObj.getDate()).padStart(2, '0');
        const hours = String(fechaObj.getHours()).padStart(2, '0');
        const minutes = String(fechaObj.getMinutes()).padStart(2, '0');
        const seconds = String(fechaObj.getSeconds()).padStart(2, '0');

        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }
};

// Export to window
window.Formatters = Formatters;

