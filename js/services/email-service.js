// Servicio de email mejorado para evitar el error 413
class EmailService {
    constructor() {
        this.maxEmailSize = 25 * 1024; // 25KB máximo para evitar error 413
    }

    /**
     * Envía un comprobante por email usando EmailJS con optimizaciones
     */
    async enviarComprobante(empleado, calculos, planilla, pdf) {
        try {
            // Verificar configuración
            if (!this.verificarConfiguracion()) {
                throw new Error('EmailJS no está configurado correctamente');
            }

            // Generar PDF completo para descarga local
            const pdfBlob = pdf.output('blob');
            const fileName = `Comprobante_${empleado.nombre.replace(/\s/g, '_')}_${planilla.periodo.replace(/\s/g, '_')}.pdf`;
            
            // Descargar PDF localmente primero
            this.descargarPDF(pdfBlob, fileName);
            
            // Crear un mensaje informativo para el email
            const downloadUrl = await this.crearEnlaceDescarga(pdfBlob, fileName);

            // Preparar datos optimizados para el email
            const templateParams = this.prepararDatosEmail(empleado, calculos, planilla, downloadUrl);

            // Log de los parámetros para debugging
            console.log('Enviando email con parámetros:', {
                serviceId: window.EMAILJS_CONFIG.SERVICE_ID,
                templateId: window.EMAILJS_CONFIG.TEMPLATE_ID,
                templateParams: templateParams
            });

            // Enviar email
            const response = await emailjs.send(
                window.EMAILJS_CONFIG.SERVICE_ID,
                window.EMAILJS_CONFIG.TEMPLATE_ID,
                templateParams
            );

            return {
                success: response.status === 200,
                messageId: response.text,
                fileName: fileName,
                downloadUrl: downloadUrl
            };

        } catch (error) {
            console.error('Error enviando comprobante:', error);
            console.error('Detalles del error:', {
                message: error.message,
                status: error.status,
                text: error.text,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Prepara los datos del email optimizados para evitar el error 413
     */
    prepararDatosEmail(empleado, calculos, planilla, downloadUrl) {
        // Calcular valores adicionales necesarios para la plantilla
        const salarioDiario = parseFloat(empleado.salarioHora || 0) * this.getHorasJornada(empleado.jornada);
        const diasLaboralesMensuales = 22; // 22 días laborales promedio en un mes
        const salarioMensual = salarioDiario * diasLaboralesMensuales;
        const subtotalQuincenal = salarioMensual / 2;
        
        // Asegurar que todos los valores sean strings válidos
        const safeString = (value) => {
            if (value === null || value === undefined) return '';
            
            // Convertir a string y normalizar
            let str = String(value);
            
            // Normalizar caracteres Unicode para evitar problemas de codificación
            str = str.normalize('NFC');
            
            // Permitir caracteres latinos, espacios, números y algunos símbolos básicos
            // Mantener acentos, tildes y caracteres especiales del español
            str = str.replace(/[^\w\s@.-áéíóúÁÉÍÓÚñÑüÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛãõÃÕçÇ€£$]/g, '');
            
            return str.trim();
        };
        const safeNumber = (value) => {
            const num = parseFloat(value || 0);
            return isNaN(num) ? 0 : num;
        };
        const safeEmail = (value) => {
            const email = safeString(value);
            return email.includes('@') ? email : 'test@example.com';
        };
        
        return {
            to_email: safeEmail(empleado.email),
            to_name: safeString(empleado.nombre),
            from_name: safeString(empleado.empresa || 'Sistema de Planillas'),
            subject: `Comprobante de Pago - ${safeString(planilla.periodo)}`,
            
            // Datos del empleado
            empleado_nombre: safeString(empleado.nombre),
            empleado_cedula: safeString(empleado.cedula),
            empleado_puesto: safeString(empleado.puesto),
            empleado_departamento: safeString(empleado.departamento || 'Operativo'),
            depositado_en: safeString(empleado.depositadoEn || 'Bac San José'),
            
            // Datos del período
            periodo: safeString(planilla.periodo),
            fecha_inicio: safeString(planilla.fechaInicio),
            fecha_fin: safeString(planilla.fechaFin),
            
            // Salarios
            salario_mensual: this.formatearMoneda(salarioMensual),
            salario_diario: this.formatearMoneda(salarioDiario),
            salario_hora: this.formatearMoneda(safeNumber(empleado.salarioHora)),
            subtotal_quincenal: this.formatearMoneda(subtotalQuincenal),
            salario_base: this.formatearMoneda(safeNumber(calculos.salarioBase)),
            salario_bruto: this.formatearMoneda(safeNumber(calculos.salarioBruto)),
            salario_neto: this.formatearMoneda(safeNumber(calculos.salarioNeto)),
            
            // Deducciones
            ccss: this.formatearMoneda(safeNumber(calculos.ccss)),
            ccss_porcentaje: '10.67',
            impuesto_renta: this.formatearMoneda(safeNumber(calculos.impuestoRenta)),
            rebajo_horas: this.formatearMoneda(safeNumber(calculos.rebajoHoras)),
            otras_deducciones: this.formatearMoneda(safeNumber(calculos.rebajos)),
            total_deducciones: this.formatearMoneda(safeNumber(calculos.ccss) + safeNumber(calculos.impuestoRenta) + safeNumber(calculos.rebajos) + safeNumber(calculos.rebajoHoras)),
            
            // Horas y extras
            dias_laborados: safeNumber(calculos.diasLaborados),
            horas_extras: safeNumber(calculos.horasExtra),
            monto_horas_extras: this.formatearMoneda(safeNumber(calculos.montoHorasExtra)),
            horas_feriado: safeNumber(calculos.horasFeriado),
            total_feriado: this.formatearMoneda(safeNumber(calculos.totalFeriado)),
            horas_extra_feriado: safeNumber(calculos.horasExtraFeriado),
            total_extra_feriado: this.formatearMoneda(safeNumber(calculos.totalExtraFeriado)),
            subtotal_pagado: this.formatearMoneda(safeNumber(calculos.salarioBase) + safeNumber(calculos.totalFeriado) + safeNumber(calculos.totalExtraFeriado) + safeNumber(calculos.montoHorasExtra)),
            
            // Bonificaciones
            bonificaciones: this.formatearMoneda(safeNumber(calculos.bonificaciones)),
            
            // Observaciones
            observaciones: safeString(calculos.observaciones || 'Sin observaciones especiales'),
            
            // Enlace de descarga
            download_link: safeString(downloadUrl),
            download_instructions: 'Haga clic en el botón de descarga para obtener su comprobante completo en PDF.',
            
            // Empresa
            empresa: safeString(empleado.empresa || 'Sistema de Planillas'),
            logo_url: empleado.empresa === 'Instituto Veterinario San Martin de Porres' ? './images/empresa.png' : './images/logo.jpg',
            
            // Fecha
            fecha_envio: new Date().toLocaleDateString('es-CR')
        };
    }

    /**
     * Crea un enlace de descarga temporal que funcione en emails
     */
    async crearEnlaceDescarga(pdfBlob, fileName) {
        try {
            // Verificar el tamaño del PDF
            const pdfSize = pdfBlob.size;
            console.log(`Tamaño del PDF: ${(pdfSize / 1024 / 1024).toFixed(2)} MB`);
            
            // Para evitar problemas con localStorage, usamos siempre descarga directa
            // El PDF se descarga automáticamente y el email incluye un mensaje informativo
            console.log('Usando descarga directa para evitar problemas de almacenamiento');
            return this.crearEnlaceDescargaDirecta(pdfBlob, fileName);
            
        } catch (error) {
            console.error('Error creando enlace de descarga:', error);
            // Fallback: retornar mensaje informativo
            return 'El comprobante se descargará automáticamente. Si no se descarga, contacte al departamento de recursos humanos.';
        }
    }

    /**
     * Crea un enlace de descarga directa como fallback
     */
    crearEnlaceDescargaDirecta(pdfBlob, fileName) {
        try {
            // Crear URL temporal del blob
            const url = URL.createObjectURL(pdfBlob);
            
            // Descargar automáticamente
            this.descargarPDF(pdfBlob, fileName);
            
            // Retornar mensaje informativo para el email
            return 'El comprobante se ha descargado automáticamente en su dispositivo. Si no se descargó, revise su carpeta de descargas.';
            
        } catch (error) {
            console.error('Error creando enlace de descarga directa:', error);
            return 'El comprobante se descargará automáticamente. Si no se descarga, contacte al departamento de recursos humanos.';
        }
    }

    /**
     * Descarga el PDF localmente
     */
    descargarPDF(pdfBlob, fileName) {
        try {
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // Limpiar después de un tiempo
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(url);
            }, 1000);
            
        } catch (error) {
            console.error('Error descargando PDF:', error);
        }
    }

    /**
     * Verifica la configuración de EmailJS
     */
    verificarConfiguracion() {
        return typeof window.isEmailJSConfigured !== 'undefined' && 
               window.isEmailJSConfigured() &&
               typeof emailjs !== 'undefined';
    }

    /**
     * Formatea números como moneda
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
     * Obtiene las horas de jornada según el tipo
     */
    getHorasJornada(jornada) {
        const horasJornada = {
            'diurna': 8,
            'mixta': 8,
            'nocturna': 8,
            'diurna_acumulativa': 8,
            'mixta_acumulativa': 8
        };
        return horasJornada[jornada] || 8;
    }

    /**
     * Función de prueba simple para diagnosticar errores de EmailJS
     */
    async enviarPruebaSimple() {
        try {
            console.log('Iniciando prueba simple de EmailJS...');
            
            // Datos mínimos para la prueba
            const datosPrueba = {
                to_email: 'test@example.com',
                to_name: 'Usuario de Prueba',
                from_name: 'Sistema de Planillas',
                subject: 'Prueba de EmailJS',
                empleado_nombre: 'Juan Pérez',
                empleado_cedula: '123456789',
                periodo: 'Enero 2024',
                salario_neto: '₡500,000',
                download_link: 'https://example.com/download',
                empresa: 'Sistema de Planillas',
                fecha_envio: new Date().toLocaleDateString('es-CR')
            };

            console.log('Datos de prueba:', datosPrueba);

            // Inicializar EmailJS
            emailjs.init(window.EMAILJS_CONFIG.USER_ID);

            // Enviar email de prueba
            const response = await emailjs.send(
                window.EMAILJS_CONFIG.SERVICE_ID,
                window.EMAILJS_CONFIG.TEMPLATE_ID,
                datosPrueba
            );

            console.log('Respuesta de EmailJS:', response);
            return { success: true, response };

        } catch (error) {
            console.error('Error en prueba simple:', error);
            return { success: false, error: error.message };
        }
    }
}

// Exportar el servicio
window.EmailService = EmailService;
