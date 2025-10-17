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
            
            // Crear un enlace de descarga temporal que funcione
            const downloadUrl = await this.crearEnlaceDescarga(pdfBlob, fileName);
            
            // Descargar PDF localmente también
            this.descargarPDF(pdfBlob, fileName);

            // Preparar datos optimizados para el email
            const templateParams = this.prepararDatosEmail(empleado, calculos, planilla, downloadUrl);

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
            throw error;
        }
    }

    /**
     * Prepara los datos del email optimizados para evitar el error 413
     */
    prepararDatosEmail(empleado, calculos, planilla, downloadUrl) {
        // Calcular valores adicionales necesarios para la plantilla
        const salarioDiario = parseFloat(empleado.salarioHora) * this.getHorasJornada(empleado.jornada);
        const salarioMensual = salarioDiario * 30;
        const subtotalQuincenal = salarioMensual / 2;
        
        return {
            to_email: empleado.email,
            to_name: empleado.nombre,
            from_name: empleado.empresa || 'Sistema de Planillas',
            subject: `Comprobante de Pago - ${planilla.periodo}`,
            
            // Datos del empleado
            empleado_nombre: empleado.nombre,
            empleado_cedula: empleado.cedula,
            empleado_puesto: empleado.puesto,
            empleado_departamento: empleado.departamento || 'Operativo',
            depositado_en: empleado.depositadoEn || 'Bac San José',
            
            // Datos del período
            periodo: planilla.periodo,
            fecha_inicio: planilla.fechaInicio,
            fecha_fin: planilla.fechaFin,
            
            // Salarios
            salario_mensual: this.formatearMoneda(salarioMensual),
            salario_diario: this.formatearMoneda(salarioDiario),
            salario_hora: this.formatearMoneda(parseFloat(empleado.salarioHora)),
            subtotal_quincenal: this.formatearMoneda(subtotalQuincenal),
            salario_base: this.formatearMoneda(parseFloat(calculos.salarioBase || 0)),
            salario_bruto: this.formatearMoneda(parseFloat(calculos.salarioBruto || 0)),
            salario_neto: this.formatearMoneda(parseFloat(calculos.salarioNeto || 0)),
            
            // Deducciones
            ccss: this.formatearMoneda(parseFloat(calculos.ccss || 0)),
            ccss_porcentaje: '10.67',
            impuesto_renta: this.formatearMoneda(parseFloat(calculos.impuestoRenta || 0)),
            rebajo_horas: this.formatearMoneda(parseFloat(calculos.rebajoHoras || 0)),
            otras_deducciones: this.formatearMoneda(parseFloat(calculos.rebajos || 0)),
            total_deducciones: this.formatearMoneda(parseFloat(calculos.ccss || 0) + parseFloat(calculos.impuestoRenta || 0) + parseFloat(calculos.rebajos || 0) + parseFloat(calculos.rebajoHoras || 0)),
            
            // Horas y extras
            dias_laborados: calculos.diasLaborados || 0,
            horas_extras: parseFloat(calculos.horasExtra || 0),
            monto_horas_extras: this.formatearMoneda(parseFloat(calculos.montoHorasExtra || 0)),
            horas_feriado: calculos.horasFeriado || 0,
            total_feriado: this.formatearMoneda(calculos.totalFeriado || 0),
            horas_extra_feriado: calculos.horasExtraFeriado || 0,
            total_extra_feriado: this.formatearMoneda(calculos.totalExtraFeriado || 0),
            subtotal_pagado: this.formatearMoneda(parseFloat(calculos.salarioBase || 0) + (calculos.totalFeriado || 0) + (calculos.totalExtraFeriado || 0) + parseFloat(calculos.montoHorasExtra || 0)),
            
            // Bonificaciones
            bonificaciones: this.formatearMoneda(parseFloat(calculos.bonificaciones || 0)),
            
            // Observaciones
            observaciones: calculos.observaciones || 'Sin observaciones especiales',
            
            // Enlace de descarga
            download_link: downloadUrl,
            download_instructions: 'Haga clic en el botón de descarga para obtener su comprobante completo en PDF.',
            
            // Empresa
            empresa: empleado.empresa || 'Sistema de Planillas',
            logo_url: empleado.empresa === 'Instituto Veterinario San Martin de Porres' ? './images/empresa.png' : './images/logo.jpg',
            
            // Fecha
            fecha_envio: new Date().toLocaleDateString('es-CR')
        };
    }

    /**
     * Crea un enlace de descarga temporal que funcione en emails
     */
    async crearEnlaceDescarga(pdfBlob, fileName) {
        // Crear un ID único para el archivo
        const fileId = 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Convertir el PDF a base64 y guardarlo en localStorage
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function() {
                const base64 = reader.result.split(',')[1];
                
                // Guardar el PDF en localStorage con un ID único
                const pdfData = {
                    fileName: fileName,
                    data: base64,
                    timestamp: Date.now(),
                    expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // Expira en 7 días
                };
                
                localStorage.setItem(`pdf_${fileId}`, JSON.stringify(pdfData));
                
                // Crear un enlace que funcione en el navegador
                const downloadUrl = `${window.location.origin}${window.location.pathname}#download=${fileId}`;
                resolve(downloadUrl);
            };
            reader.readAsDataURL(pdfBlob);
        });
    }

    /**
     * Descarga el PDF localmente
     */
    descargarPDF(pdfBlob, fileName) {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
            minimumFractionDigits: 2
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
}

// Exportar el servicio
window.EmailService = EmailService;
