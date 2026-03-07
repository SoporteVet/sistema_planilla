// Servicio de email simplificado para evitar errores de localStorage
class EmailServiceSimple {
    constructor() {
        this.maxEmailSize = 25 * 1024; // 25KB máximo para evitar error 413
    }

    /**
     * Envía un comprobante por email usando EmailJS de forma simplificada
     * OPTIMIZADO PARA HOTMAIL/OUTLOOK
     */
    async enviarComprobante(empleado, calculos, planilla, pdf, asistencias = []) {
        try {
            // Verificar configuración
            if (!this.verificarConfiguracion()) {
                throw new Error('EmailJS no está configurado correctamente');
            }

            // Generar PDF y descargarlo localmente
            const pdfBlob = pdf.output('blob');
            const fileName = `Comprobante_${empleado.nombre.replace(/\s/g, '_')}_${planilla.periodo.replace(/\s/g, '_')}.pdf`;
            
            // Descargar PDF localmente
            this.descargarPDF(pdfBlob, fileName);

            // Preparar datos optimizados para el email (con registro de horas para observaciones correctas)
            const templateParams = this.prepararDatosEmail(empleado, calculos, planilla, asistencias);

            // Generar HTML del comprobante (optimizado para Hotmail)
            const comprobanteHTML = this.generarHTMLComprobante(templateParams);
            
            // Generar versión de texto plano (importante para Hotmail)
            const comprobanteTexto = this.generarTextoPlano(templateParams);
            
            // Agregar ambas versiones al templateParams
            templateParams.comprobante_html = comprobanteHTML;
            templateParams.comprobante_texto = comprobanteTexto;
            
            // Obtener el correo del empleado (usar 'correo' o 'email' para compatibilidad)
            const correoEmpleado = empleado.correo || empleado.email;
            
            // Verificar si es correo Hotmail/Outlook y optimizar
            const esHotmail = this.esCorreoHotmail(correoEmpleado);
            if (esHotmail) {
                console.log('Detectado correo Hotmail/Outlook - Aplicando optimizaciones');
                // Agregar encabezados específicos para Hotmail
                templateParams.reply_to = 'noreply@sistemadeplanillas.com';
                templateParams.importance = 'normal';
            }

            // Log de los parámetros para debugging
            console.log('Enviando email con parámetros:', {
                serviceId: window.EMAILJS_CONFIG.SERVICE_ID,
                templateId: window.EMAILJS_CONFIG.TEMPLATE_ID,
                destinatario: correoEmpleado,
                esHotmail: esHotmail,
                templateParams: { ...templateParams, comprobante_html: '(HTML contenido)', comprobante_texto: '(Texto plano)' }
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
                esHotmail: esHotmail
            };

        } catch (error) {
            console.error('Error enviando comprobante:', error);
            throw error;
        }
    }

    /**
     * Genera el HTML del comprobante de pago para email
     * OPTIMIZADO PARA HOTMAIL/OUTLOOK
     * @param {Object} datos - Datos preparados del comprobante
     * @returns {string} HTML del comprobante
     */
    generarHTMLComprobante(datos) {
        // Función helper para formatear moneda (remover símbolo si ya está)
        const formatearMoneda = (valor) => {
            if (!valor || valor === '₡0.00' || valor === '0.00') return '₡0.00';
            // Si ya tiene el símbolo, retornarlo tal cual
            if (typeof valor === 'string' && valor.includes('₡')) {
                return valor;
            }
            // Si es número, formatearlo
            const num = typeof valor === 'string' ? parseFloat(valor.replace(/[₡,]/g, '')) : Number(valor);
            if (isNaN(num) || num === 0) return '₡0.00';
            return new Intl.NumberFormat('es-CR', {
                style: 'currency',
                currency: 'CRC',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num);
        };

        // Función helper para asegurar valores string
        const safeString = (val, defaultVal = '') => {
            if (val === null || val === undefined) return defaultVal;
            return String(val);
        };

        // Función helper para formatear números sin símbolo de moneda
        const formatearNumero = (valor) => {
            if (!valor || valor === 0) return '0.00';
            const num = typeof valor === 'string' ? parseFloat(valor.replace(/[₡,]/g, '')) : Number(valor);
            if (isNaN(num)) return '0.00';
            return num.toFixed(2);
        };

        // Extraer y formatear todos los valores
        const empresa = safeString(datos.empresa || datos.empleado?.empresa || 'Sistema de Planillas');
        const empleadoNombre = safeString(datos.empleado_nombre || datos.empleado?.nombre || '');
        const empleadoCedula = safeString(datos.empleado_cedula || datos.empleado?.cedula || '');
        const empleadoDepartamento = safeString(datos.empleado_departamento || datos.empleado?.departamento || 'Operativo');
        const empleadoPuesto = safeString(datos.empleado_puesto || datos.empleado?.puesto || '');
        const periodo = safeString(datos.periodo || '');
        const depositadoEn = safeString(datos.depositado_en || datos.empleado?.banco || 'Bac San José');
        const fechaEnvio = safeString(datos.fecha_envio || new Date().toLocaleDateString('es-CR'));

        // Valores monetarios (ya vienen formateados desde prepararDatosEmail)
        const salarioMensual = formatearMoneda(datos.salario_mensual || datos.calculos?.salarioBaseMensual || 0);
        const salarioDiario = formatearMoneda(datos.salario_diario || datos.calculos?.salarioDiario || 0);
        const salarioHora = formatearMoneda(datos.salario_hora || datos.empleado?.salarioHora || 0);
        const subtotalQuincenal = formatearMoneda(datos.subtotal_quincenal || datos.calculos?.subtotalQuincenal || 0);
        const ccss = formatearMoneda(datos.ccss || datos.calculos?.descuentoCCSS || 0);
        const ccssPorcentaje = safeString(datos.ccss_porcentaje || (CONFIG.CCSS.EMPLEADO * 100).toFixed(2));
        const impuestoRenta = formatearMoneda(datos.impuesto_renta || datos.calculos?.impuestoRenta || 0);
        const rebajoHoras = formatearMoneda(datos.rebajo_horas || datos.calculos?.rebajosPorHoras?.total || 0);
        const otrasDeducciones = formatearMoneda(datos.otras_deducciones || datos.calculos?.otrosDescuentos || 0);
        const totalDeducciones = formatearMoneda(datos.total_deducciones || 
            (parseFloat(ccss.replace(/[₡,]/g, '')) + 
             parseFloat(impuestoRenta.replace(/[₡,]/g, '')) + 
             parseFloat(otrasDeducciones.replace(/[₡,]/g, '')) + 
             parseFloat(rebajoHoras.replace(/[₡,]/g, ''))));
        const diasLaborados = safeString(datos.dias_laborados || datos.calculos?.diasTrabajados || 0);
        const horasFeriado = formatearNumero(datos.horas_feriado || datos.calculos?.horasFeriado || 0);
        const totalFeriado = formatearMoneda(datos.total_feriado || datos.calculos?.pagoFeriados || 0);
        const horasExtraFeriado = formatearNumero(datos.horas_extra_feriado || datos.calculos?.horasExtraFeriado || 0);
        const totalExtraFeriado = formatearMoneda(datos.total_extra_feriado || datos.calculos?.totalExtraFeriado || 0);
        const horasExtras = safeString(datos.horas_extras || datos.calculos?.horasExtra || 0);
        const montoHorasExtras = formatearMoneda(datos.monto_horas_extras || datos.calculos?.montoHorasExtra || 0);
        const subtotalPagado = formatearMoneda(datos.subtotal_pagado || datos.calculos?.subtotalPagado || 0);
        const salarioBruto = formatearMoneda(datos.salario_bruto || datos.calculos?.salarioBruto || 0);
        const salarioNeto = formatearMoneda(datos.salario_neto || datos.calculos?.salarioNeto || 0);
        const observaciones = safeString(datos.observaciones || datos.calculos?.observaciones || 'Sin observaciones especiales');

        // Generar HTML OPTIMIZADO PARA HOTMAIL/OUTLOOK
        // Usar solo estilos inline simples, sin border-radius ni sombras complejas
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Pago</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #dddddd;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 20px; text-align: right; border-bottom: 2px solid #1e3a8a;">
                            <h2 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 18px;">${empresa}</h2>
                            <p style="margin: 4px 0; color: #666666; font-size: 12px;">San Rafael Abajo de Desamparados</p>
                            <p style="margin: 4px 0; color: #666666; font-size: 12px;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                        </td>
                    </tr>
                    
                    <!-- Title -->
                    <tr>
                        <td style="padding: 15px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="background-color: #1e3a8a; color: #ffffff; padding: 10px; font-size: 16px; font-weight: bold;">
                                        Comprobante de Pago
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Employee Info -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="5" style="border: 1px solid #1e3a8a;">
                                <tr>
                                    <td colspan="2" style="background-color: #1e3a8a; color: #ffffff; padding: 8px; font-weight: bold;">DATOS DEL COLABORADOR</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 6px 8px; font-weight: bold; width: 40%;">Nombre:</td>
                                    <td style="padding: 6px 8px;">${empleadoNombre}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px; font-weight: bold;">Identificacion:</td>
                                    <td style="padding: 6px 8px;">${empleadoCedula}</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 6px 8px; font-weight: bold;">Departamento:</td>
                                    <td style="padding: 6px 8px;">${empleadoDepartamento}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px; font-weight: bold;">Puesto:</td>
                                    <td style="padding: 6px 8px;">${empleadoPuesto}</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 6px 8px; font-weight: bold;">Periodo:</td>
                                    <td style="padding: 6px 8px;">${periodo}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px; font-weight: bold;">Depositado en:</td>
                                    <td style="padding: 6px 8px;">${depositadoEn}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Section Title -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="background-color: #1e3a8a; color: #ffffff; padding: 8px; font-weight: bold;">
                                        Detalle de Ingresos
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Payment Details -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; border: 1px solid #1e3a8a;">
                                <tr style="background-color: #1e3a8a; color: #ffffff;">
                                    <th style="text-align: left; padding: 8px;">INGRESOS</th>
                                    <th style="text-align: right; padding: 8px; width: 20%;">Monto</th>
                                    <th style="text-align: left; padding: 8px; background-color: #dc3545;">DEDUCCIONES</th>
                                    <th style="text-align: right; padding: 8px; width: 20%; background-color: #dc3545;">Monto</th>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px;">Salario Mensual</td>
                                    <td style="padding: 6px 8px; text-align: right;">${salarioMensual}</td>
                                    <td style="padding: 6px 8px;">CCSS ${ccssPorcentaje}%</td>
                                    <td style="padding: 6px 8px; text-align: right;">${ccss}</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 6px 8px;">Salario diario</td>
                                    <td style="padding: 6px 8px; text-align: right;">${salarioDiario}</td>
                                    <td style="padding: 6px 8px;">Imp. Renta</td>
                                    <td style="padding: 6px 8px; text-align: right;">${impuestoRenta}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px;">Dias laborados: ${diasLaborados}</td>
                                    <td style="padding: 6px 8px; text-align: right;">${subtotalQuincenal}</td>
                                    <td style="padding: 6px 8px;">Rebajo horas</td>
                                    <td style="padding: 6px 8px; text-align: right;">${rebajoHoras}</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 6px 8px;">Hrs feriado: ${horasFeriado}</td>
                                    <td style="padding: 6px 8px; text-align: right;">${totalFeriado}</td>
                                    <td style="padding: 6px 8px;">Otras deduc.</td>
                                    <td style="padding: 6px 8px; text-align: right;">${otrasDeducciones}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px;">Hrs extra: ${horasExtras}</td>
                                    <td style="padding: 6px 8px; text-align: right;">${montoHorasExtras}</td>
                                    <td style="padding: 6px 8px;"></td>
                                    <td style="padding: 6px 8px; text-align: right;"></td>
                                </tr>
                                <tr style="background-color: #e3f2fd; font-weight: bold;">
                                    <td style="padding: 8px;">SALARIO BRUTO</td>
                                    <td style="padding: 8px; text-align: right;">${salarioBruto}</td>
                                    <td style="padding: 8px;">TOTAL DEDUCCIONES</td>
                                    <td style="padding: 8px; text-align: right;">${totalDeducciones}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Net Salary -->
                    <tr>
                        <td style="padding: 15px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="background-color: #1e3a8a; color: #ffffff; padding: 15px; font-size: 18px; font-weight: bold;">
                                        SALARIO NETO: ${salarioNeto}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Notes -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #f0f8ff; border-left: 4px solid #1e3a8a;">
                                <tr>
                                    <td style="font-size: 11px;">
                                        <strong>Observaciones:</strong><br>
                                        ${observaciones.replace(/\n/g, '<br>')}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; text-align: center; border-top: 1px solid #dddddd; font-size: 11px; color: #666666;">
                            <p style="margin: 5px 0;"><strong>${empresa}</strong></p>
                            <p style="margin: 5px 0;">San Rafael Abajo de Desamparados</p>
                            <p style="margin: 5px 0;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                            <p style="margin: 5px 0;">Fecha: ${fechaEnvio}</p>
                            <p style="margin: 10px 0 5px 0; font-style: italic; font-size: 10px;">Mensaje automatico - No responder</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    /**
     * Obtiene el texto de observaciones a partir del registro de horas (asistencias)
     * para que el comprobante por correo coincida con el PDF y la información registrada.
     */
    obtenerObservacionesDesdeAsistencias(asistencias, calculos) {
        const safeString = (value) => {
            if (value === null || value === undefined) return '';
            return String(value).trim();
        };
        const observacionesArray = [];
        if (asistencias && asistencias.length > 0) {
            let diasIncapacidadCCSS = 0;
            let horasIncapacidadCCSS = 0;
            asistencias.forEach(a => {
                if (a.tipoDia === CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS) {
                    diasIncapacidadCCSS++;
                    horasIncapacidadCCSS += a.horasTrabajadas || 0;
                }
            });
            if (diasIncapacidadCCSS > 0) {
                observacionesArray.push(`Incapacidad CCSS: ${diasIncapacidadCCSS} día${diasIncapacidadCCSS > 1 ? 's' : ''} (${horasIncapacidadCCSS.toFixed(2)} horas)`);
            }
            const otrasObservaciones = asistencias
                .filter(a => a.observaciones && a.observaciones.trim() !== '' && !a.observaciones.includes('Registro quincenal'))
                .map(a => {
                    let fecha = '';
                    if (a.fecha && typeof a.fecha === 'string' && /^\d{8}$/.test(a.fecha)) {
                        const ano = parseInt(a.fecha.substring(0, 4));
                        const mes = parseInt(a.fecha.substring(4, 6)) - 1;
                        const dia = parseInt(a.fecha.substring(6, 8));
                        const fechaObj = new Date(ano, mes, dia);
                        if (!isNaN(fechaObj.getTime())) {
                            fecha = fechaObj.toLocaleDateString('es-CR');
                        }
                    }
                    return fecha ? `${fecha}: ${a.observaciones}` : a.observaciones;
                });
            observacionesArray.push(...otrasObservaciones);
        }
        if (observacionesArray.length > 0) {
            return observacionesArray.join('\n');
        }
        return safeString(calculos?.observaciones || 'Sin observaciones especiales');
    }

    /**
     * Prepara los datos del email optimizados
     */
    prepararDatosEmail(empleado, calculos, planilla, asistencias = []) {
        const safeNumber = (value) => {
            const num = parseFloat(value || 0);
            return isNaN(num) ? 0 : num;
        };
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
        const safeEmail = (value) => {
            if (!value || value === null || value === undefined) return 'test@example.com';
            
            // Para correos, NO usar safeString que puede eliminar guiones
            // Solo limpiar espacios y caracteres realmente inválidos
            let email = String(value).trim();
            
            // Normalizar caracteres Unicode
            email = email.normalize('NFC');
            
            // Permitir caracteres válidos en correos: letras, números, @, ., -, _, +
            // El guion debe estar al final de la clase de caracteres para que se interprete literalmente
            email = email.replace(/[^\w@.+_-]/g, '');
            
            // Eliminar espacios (no son válidos en correos)
            email = email.replace(/\s/g, '');
            
            return email.includes('@') ? email : 'test@example.com';
        };

        // Usar la misma fuente que el PDF/comprobante: calculos y empleado (no recalcular salario mensual)
        const salarioBaseMensualNum = safeNumber(calculos.salarioBaseMensual) || safeNumber(empleado.salarioMensual) || 0;
        const salarioDiarioNum = safeNumber(calculos.salarioDiario) || (empleado.jornada && salarioBaseMensualNum
            ? Calculations.calcularSalarioDiario(salarioBaseMensualNum, empleado.jornada)
            : 0);
        const salarioHora = safeNumber(empleado.salarioHorario) || safeNumber(empleado.salarioHora) || (empleado.jornada && salarioBaseMensualNum
            ? Calculations.calcularSalarioHorario(salarioBaseMensualNum, empleado.jornada, empleado.salarioHorario)
            : 0);
        const subtotalQuincenalNum = safeNumber(calculos.subtotalQuincenal) || 0;
        
        // Calcular valores de feriados igual que en el comprobante
        const horasFeriado = safeNumber(calculos.horasFeriado || (calculos.diasFeriadosTrabajados ? calculos.diasFeriadosTrabajados * 8 : 0));
        const montoFeriado = safeNumber(calculos.pagoFeriados || calculos.montoFeriado || 0);
        // Si montoFeriado no está disponible, calcularlo (horasFeriado * salarioHora * 2)
        const totalFeriado = montoFeriado > 0 ? montoFeriado : (horasFeriado * salarioHora * 2);
        
        // Horas extra en feriados - usar los mismos valores que el comprobante
        const horasExtraFeriado = safeNumber(calculos.horasExtraFeriado || calculos.horasExtraFeriados || 0);
        const montoExtraFeriado = safeNumber(calculos.totalExtraFeriado || calculos.montoExtraFeriado || calculos.pagoHorasExtraFeriados || 0);
        // Si montoExtraFeriado no está disponible, calcularlo (horasExtraFeriado * salarioHora * 3)
        const totalExtraFeriado = montoExtraFeriado > 0 ? montoExtraFeriado : (horasExtraFeriado * salarioHora * 3);
        
        const montoHorasExtra = safeNumber(calculos.montoHorasExtra || 0);
        const salarioBase = safeNumber(calculos.salarioBase || 0);
        
        // El subtotal pagado es igual que en el comprobante: salarioBase + feriados + horas extra
        const subtotalPagado = salarioBase + totalFeriado + totalExtraFeriado + montoHorasExtra;
        
        // Obtener el correo del empleado (usar 'correo' o 'email' para compatibilidad)
        const correoEmpleado = empleado.correo || empleado.email;
        
        return {
            to_email: safeEmail(correoEmpleado),
            to_name: safeString(empleado.nombre),
            from_name: safeString(empleado.empresa || 'Sistema de Planillas'),
            subject: `Comprobante de Pago - ${safeString(planilla.periodo)}`,
            
            // Datos del empleado
            empleado_nombre: safeString(empleado.nombre || empleado.nombreEmpleado),
            empleado_cedula: safeString(empleado.cedula),
            empleado_puesto: safeString(empleado.puesto || empleado.cargo),
            empleado_departamento: safeString(empleado.departamento || 'Operativo'),
            depositado_en: safeString(empleado.banco || empleado.depositadoEn || 'Bac San José'),
            
            // Datos del período
            periodo: safeString(planilla.periodo),
            fecha_inicio: safeString(planilla.fechaInicio),
            fecha_fin: safeString(planilla.fechaFin),
            
            // Salarios (misma fuente que el PDF: calculos.salarioBaseMensual || empleado.salarioMensual)
            salario_mensual: this.formatearMoneda(salarioBaseMensualNum),
            salario_diario: this.formatearMoneda(salarioDiarioNum),
            salario_hora: this.formatearMoneda(salarioHora),
            subtotal_quincenal: this.formatearMoneda(subtotalQuincenalNum),
            salario_base: this.formatearMoneda(safeNumber(calculos.salarioBase || calculos.subtotalQuincenal)),
            salario_bruto: this.formatearMoneda(safeNumber(calculos.salarioBruto || 0)),
            salario_neto: this.formatearMoneda(safeNumber(calculos.salarioNeto || 0)),
            
            // Deducciones
            ccss: this.formatearMoneda(safeNumber(calculos.ccss || calculos.descuentoCCSS || 0)),
            ccss_porcentaje: (CONFIG.CCSS.EMPLEADO * 100).toFixed(2),
            impuesto_renta: this.formatearMoneda(safeNumber(calculos.impuestoRenta || 0)),
            rebajo_horas: this.formatearMoneda(safeNumber(calculos.rebajoHoras || calculos.rebajosPorHoras?.total || 0)),
            otras_deducciones: this.formatearMoneda(safeNumber(calculos.rebajos || calculos.otrosDescuentos || 0)),
            total_deducciones: this.formatearMoneda(
                safeNumber(calculos.ccss || calculos.descuentoCCSS || 0) + 
                safeNumber(calculos.impuestoRenta || 0) + 
                safeNumber(calculos.rebajos || calculos.otrosDescuentos || 0) + 
                safeNumber(calculos.rebajoHoras || calculos.rebajosPorHoras?.total || 0)
            ),
            
            // Horas y extras
            dias_laborados: safeNumber(calculos.diasLaborados || calculos.diasTrabajados || 0),
            horas_extras: safeNumber(calculos.horasExtra || 0),
            monto_horas_extras: this.formatearMoneda(montoHorasExtra),
            horas_adicionales: safeNumber(calculos.horasAdicionales || 0).toFixed(2),
            monto_horas_adicionales: this.formatearMoneda(safeNumber(calculos.pagoHorasAdicionales || calculos.montoHorasAdicionales || 0)),
            horas_feriado: horasFeriado.toFixed(2),
            total_feriado: this.formatearMoneda(totalFeriado),
            horas_extra_feriado: horasExtraFeriado.toFixed(2),
            total_extra_feriado: this.formatearMoneda(totalExtraFeriado),
            // El subtotal pagado es igual que en el comprobante: salarioBase + feriados + horas extra
            subtotal_pagado: this.formatearMoneda(subtotalPagado),
            
            // Guardar también los objetos completos para generarHTMLComprobante
            empleado: empleado,
            calculos: calculos,
            planilla: planilla,
            
            // Bonificaciones
            bonificaciones: this.formatearMoneda(safeNumber(calculos.bonificaciones)),
            
            // Observaciones (priorizar datos del registro de horas para coincidir con el comprobante PDF)
            observaciones: this.obtenerObservacionesDesdeAsistencias(asistencias, calculos),
            
            // Enlace de descarga - mensaje informativo
            download_link: 'El comprobante se ha descargado automáticamente en su dispositivo. Si no se descargó, revise su carpeta de descargas.',
            download_instructions: 'El PDF se descarga automáticamente al enviar este email.',
            
            // Empresa
            empresa: safeString(empleado.empresa || 'Sistema de Planillas'),
            logo_url: empleado.empresa === 'Instituto Veterinario San Martin de Porres' ? './images/empresa.png' : './images/logo.jpg',
            
            // Fecha
            fecha_envio: new Date().toLocaleDateString('es-CR')
        };
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
        // Verificar que EmailJS esté cargado
        if (typeof emailjs === 'undefined') {
            console.error('EmailJS no está cargado');
            return false;
        }

        // Verificar que la configuración esté disponible
        if (typeof window.EMAILJS_CONFIG === 'undefined') {
            console.error('Configuración de EmailJS no está disponible');
            return false;
        }

        // Verificar que las credenciales estén configuradas
        if (typeof window.isEmailJSConfigured === 'undefined') {
            console.error('Función de verificación no está disponible');
            return false;
        }

        // Verificar configuración
        if (!window.isEmailJSConfigured()) {
            console.error('EmailJS no está configurado correctamente');
            return false;
        }

        console.log('EmailJS está configurado correctamente');
        return true;
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
     * Envía un comprobante de aguinaldo por email usando EmailJS
     * @param {Object} empleado - Datos del empleado
     * @param {Object} datosAguinaldo - Datos del aguinaldo (periodos, totales, etc.)
     * @param {number} año - Año del aguinaldo
     * @param {Object} pdf - Objeto PDF de jsPDF
     * @returns {Promise<Object>} - Resultado del envío
     */
    async enviarComprobanteAguinaldo(empleado, datosAguinaldo, año, pdf) {
        try {
            // Verificar configuración
            if (!this.verificarConfiguracion()) {
                throw new Error('EmailJS no está configurado correctamente');
            }

            // Generar PDF y descargarlo localmente
            const pdfBlob = pdf.output('blob');
            const fileName = `Comprobante_Aguinaldo_${año}_${empleado.nombre.replace(/\s/g, '_')}.pdf`;
            
            // Descargar PDF localmente
            this.descargarPDF(pdfBlob, fileName);

            // Preparar datos para el email usando la misma lógica que el generador
            const templateParams = this.prepararDatosEmailAguinaldo(empleado, datosAguinaldo, año);

            // Generar HTML del comprobante de aguinaldo
            const comprobanteHTML = this.generarHTMLComprobanteAguinaldo(templateParams);
            
            // Agregar el HTML al templateParams
            templateParams.comprobante_html = comprobanteHTML;

            // Usar el template ID de aguinaldo si existe, sino usar el general
            const templateId = window.EMAILJS_CONFIG.TEMPLATE_ID_AGUINALDO || window.EMAILJS_CONFIG.TEMPLATE_ID;

            // Log de los parámetros para debugging
            console.log('Enviando email de aguinaldo con parámetros:', {
                serviceId: window.EMAILJS_CONFIG.SERVICE_ID,
                templateId: templateId,
                templateParams: { ...templateParams, comprobante_html: '(HTML contenido)' }
            });

            // Enviar email
            const response = await emailjs.send(
                window.EMAILJS_CONFIG.SERVICE_ID,
                templateId,
                templateParams
            );

            return {
                success: response.status === 200,
                messageId: response.text,
                fileName: fileName
            };

        } catch (error) {
            console.error('Error enviando comprobante de aguinaldo:', error);
            throw error;
        }
    }

    /**
     * Prepara los datos del email para aguinaldo
     * @param {Object} empleado - Datos del empleado
     * @param {Object} datosAguinaldo - Datos del aguinaldo
     * @param {number} año - Año del aguinaldo
     * @returns {Object} - Datos preparados para la plantilla
     */
    prepararDatosEmailAguinaldo(empleado, datosAguinaldo, año) {
        const periodos = datosAguinaldo.periodos || [];
        const totalBruto = datosAguinaldo.totalBruto || 0;
        const montoAguinaldo = datosAguinaldo.montoAguinaldo || 0;
        
        // Formatear los 12 meses del aguinaldo (Dic año-1 a Nov año)
        const mesesLabels = [
            `dic-${año - 1}`,
            `ene-${año}`,
            `feb-${año}`,
            `mar-${año}`,
            `abr-${año}`,
            `may-${año}`,
            `jun-${año}`,
            `jul-${año}`,
            `ago-${año}`,
            `sept-${año}`,
            `oct-${año}`,
            `nov-${año}`
        ];

        // Crear array de salarios mensuales basados en los periodos
        const salariosMensuales = mesesLabels.map((label, index) => {
            const periodo = periodos[index] || {};
            return {
                label: label,
                monto: periodo.total || 0
            };
        });

        // Función helper para asegurar valores string
        const safeString = (value) => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            str = str.normalize('NFC');
            str = str.replace(/[^\w\s@.-áéíóúÁÉÍÓÚñÑüÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛãõÃÕçÇ€£$]/g, '');
            return str.trim();
        };

        const safeEmail = (value) => {
            if (!value || value === null || value === undefined) return 'test@example.com';
            
            // Para correos, NO usar safeString que puede eliminar guiones
            // Solo limpiar espacios y caracteres realmente inválidos
            let email = String(value).trim();
            
            // Normalizar caracteres Unicode
            email = email.normalize('NFC');
            
            // Permitir caracteres válidos en correos: letras, números, @, ., -, _, +
            // El guion debe estar al final de la clase de caracteres para que se interprete literalmente
            email = email.replace(/[^\w@.+_-]/g, '');
            
            // Eliminar espacios (no son válidos en correos)
            email = email.replace(/\s/g, '');
            
            return email.includes('@') ? email : 'test@example.com';
        };

        // Formatear salarios mensuales para la plantilla
        const salario_dic = this.formatearMoneda(salariosMensuales[0]?.monto || 0);
        const salario_ene = this.formatearMoneda(salariosMensuales[1]?.monto || 0);
        const salario_feb = this.formatearMoneda(salariosMensuales[2]?.monto || 0);
        const salario_mar = this.formatearMoneda(salariosMensuales[3]?.monto || 0);
        const salario_abr = this.formatearMoneda(salariosMensuales[4]?.monto || 0);
        const salario_may = this.formatearMoneda(salariosMensuales[5]?.monto || 0);
        const salario_jun = this.formatearMoneda(salariosMensuales[6]?.monto || 0);
        const salario_jul = this.formatearMoneda(salariosMensuales[7]?.monto || 0);
        const salario_ago = this.formatearMoneda(salariosMensuales[8]?.monto || 0);
        const salario_sept = this.formatearMoneda(salariosMensuales[9]?.monto || 0);
        const salario_oct = this.formatearMoneda(salariosMensuales[10]?.monto || 0);
        const salario_nov = this.formatearMoneda(salariosMensuales[11]?.monto || 0);

        return {
            to_email: safeEmail(empleado.correo || empleado.email),
            to_name: safeString(empleado.nombre || empleado.nombreEmpleado),
            from_name: safeString(empleado.empresa || 'Sistema de Planillas'),
            subject: `Comprobante de Aguinaldo ${año} - ${safeString(empleado.nombre)}`,
            
            // Datos del empleado
            empleado_nombre: safeString(empleado.nombre || empleado.nombreEmpleado),
            empleado_cedula: Formatters.formatearCedula(empleado.cedula),
            empleado_puesto: safeString(empleado.puesto || empleado.cargo),
            empleado_departamento: safeString(empleado.departamento || 'Operativo'),
            
            // Datos del aguinaldo
            año: año,
            año_anterior: año - 1,
            periodo_completo: `Dic. ${año - 1} a Nov. ${año}`,
            
            // Salarios mensuales (formateados)
            salario_dic: salario_dic,
            salario_ene: salario_ene,
            salario_feb: salario_feb,
            salario_mar: salario_mar,
            salario_abr: salario_abr,
            salario_may: salario_may,
            salario_jun: salario_jun,
            salario_jul: salario_jul,
            salario_ago: salario_ago,
            salario_sept: salario_sept,
            salario_oct: salario_oct,
            salario_nov: salario_nov,
            
            // Totales
            total_salarios: this.formatearMoneda(totalBruto),
            aguinaldo: this.formatearMoneda(montoAguinaldo),
            
            // Empresa
            empresa: safeString(empleado.empresa || 'Veterinaria San Martín de Porres'),
            
            // Fecha
            fecha_envio: new Date().toLocaleDateString('es-CR')
        };
    }

    /**
     * Genera el HTML del comprobante de aguinaldo para email
     * @param {Object} datos - Datos preparados del comprobante
     * @returns {string} HTML del comprobante
     */
    generarHTMLComprobanteAguinaldo(datos) {
        // Función helper para formatear moneda (remover símbolo si ya está)
        const formatearMoneda = (valor) => {
            if (!valor || valor === '₡0.00' || valor === '0.00') return '₡0.00';
            if (typeof valor === 'string' && valor.includes('₡')) {
                return valor;
            }
            const num = typeof valor === 'string' ? parseFloat(valor.replace(/[₡,]/g, '')) : Number(valor);
            if (isNaN(num) || num === 0) return '₡0.00';
            return new Intl.NumberFormat('es-CR', {
                style: 'currency',
                currency: 'CRC',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num);
        };

        // Función helper para asegurar valores string
        const safeString = (val, defaultVal = '') => {
            if (val === null || val === undefined) return defaultVal;
            return String(val);
        };

        // Extraer y formatear todos los valores
        const empresa = safeString(datos.empresa || 'Veterinaria San Martín de Porres');
        const empleadoNombre = safeString(datos.empleado_nombre || '');
        const empleadoCedula = safeString(datos.empleado_cedula || '');
        const año = safeString(datos.año || '');
        const añoAnterior = safeString(datos.año_anterior || '');
        const periodoCompleto = safeString(datos.periodo_completo || '');
        const fechaEnvio = safeString(datos.fecha_envio || new Date().toLocaleDateString('es-CR'));

        // Salarios mensuales (ya vienen formateados)
        const salarioDic = formatearMoneda(datos.salario_dic || 0);
        const salarioEne = formatearMoneda(datos.salario_ene || 0);
        const salarioFeb = formatearMoneda(datos.salario_feb || 0);
        const salarioMar = formatearMoneda(datos.salario_mar || 0);
        const salarioAbr = formatearMoneda(datos.salario_abr || 0);
        const salarioMay = formatearMoneda(datos.salario_may || 0);
        const salarioJun = formatearMoneda(datos.salario_jun || 0);
        const salarioJul = formatearMoneda(datos.salario_jul || 0);
        const salarioAgo = formatearMoneda(datos.salario_ago || 0);
        const salarioSept = formatearMoneda(datos.salario_sept || 0);
        const salarioOct = formatearMoneda(datos.salario_oct || 0);
        const salarioNov = formatearMoneda(datos.salario_nov || 0);

        // Totales
        const totalSalarios = formatearMoneda(datos.total_salarios || 0);
        const aguinaldo = formatearMoneda(datos.aguinaldo || 0);

        // Generar HTML OPTIMIZADO PARA HOTMAIL/OUTLOOK - Aguinaldo
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Aguinaldo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px 10px;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #dddddd;">
                    <!-- Header -->
                    <tr>
                        <td style="text-align: right; padding: 20px; border-bottom: 2px solid #1e3a8a;">
                            <h2 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 18px;">${empresa}</h2>
                            <p style="margin: 4px 0; color: #666666; font-size: 12px;">San Rafael Abajo de Desamparados</p>
                            <p style="margin: 4px 0; color: #666666; font-size: 12px;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                        </td>
                    </tr>
                    
                    <!-- Title -->
                    <tr>
                        <td style="padding: 15px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="background-color: #1e3a8a; color: #ffffff; padding: 12px; font-size: 16px; font-weight: bold;">
                                        Comprobante de Aguinaldo ${año}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Información del Colaborador -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; border: 1px solid #1e3a8a;">
                                <tr>
                                    <td colspan="2" style="background-color: #1e3a8a; color: #ffffff; padding: 8px; font-weight: bold;">DATOS DEL COLABORADOR</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 6px 8px; font-weight: bold; width: 40%;">Nombre:</td>
                                    <td style="padding: 6px 8px;">${empleadoNombre}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px; font-weight: bold;">Identificacion:</td>
                                    <td style="padding: 6px 8px;">${empleadoCedula}</td>
                                </tr>
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 6px 8px; font-weight: bold;">Aguinaldo:</td>
                                    <td style="padding: 6px 8px; color: #1e3a8a; font-weight: bold;">${año}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 8px; font-weight: bold;">Periodo:</td>
                                    <td style="padding: 6px 8px;">${periodoCompleto}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Sección de Aguinaldo -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="background-color: #1e3a8a; color: #ffffff; padding: 8px; font-weight: bold;">
                                        Detalle de Salarios Mensuales
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Tabla de Salarios Mensuales -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="1" cellspacing="0" cellpadding="4" style="border-collapse: collapse; border: 1px solid #1e3a8a;">
                                <tr style="background-color: #1e3a8a; color: #ffffff;">
                                    <th style="text-align: left; padding: 6px;">Mes</th>
                                    <th style="text-align: right; padding: 6px;">Salario</th>
                                </tr>
                                <tr><td style="padding: 4px 6px;">dic-${añoAnterior}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioDic}</td></tr>
                                <tr style="background-color: #f9f9f9;"><td style="padding: 4px 6px;">ene-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioEne}</td></tr>
                                <tr><td style="padding: 4px 6px;">feb-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioFeb}</td></tr>
                                <tr style="background-color: #f9f9f9;"><td style="padding: 4px 6px;">mar-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioMar}</td></tr>
                                <tr><td style="padding: 4px 6px;">abr-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioAbr}</td></tr>
                                <tr style="background-color: #f9f9f9;"><td style="padding: 4px 6px;">may-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioMay}</td></tr>
                                <tr><td style="padding: 4px 6px;">jun-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioJun}</td></tr>
                                <tr style="background-color: #f9f9f9;"><td style="padding: 4px 6px;">jul-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioJul}</td></tr>
                                <tr><td style="padding: 4px 6px;">ago-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioAgo}</td></tr>
                                <tr style="background-color: #f9f9f9;"><td style="padding: 4px 6px;">sep-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioSept}</td></tr>
                                <tr><td style="padding: 4px 6px;">oct-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioOct}</td></tr>
                                <tr style="background-color: #f9f9f9;"><td style="padding: 4px 6px;">nov-${año}</td><td style="padding: 4px 6px; text-align: right; color: #059669;">${salarioNov}</td></tr>
                                <tr style="background-color: #e3f2fd; font-weight: bold;">
                                    <td style="padding: 6px;">TOTAL SALARIOS</td>
                                    <td style="padding: 6px; text-align: right; color: #059669;">${totalSalarios}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Aguinaldo Final -->
                    <tr>
                        <td style="padding: 15px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="background-color: #1e3a8a; color: #ffffff; padding: 15px; font-size: 18px; font-weight: bold;">
                                        AGUINALDO ${año}: ${aguinaldo}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Felicitación -->
                    <tr>
                        <td style="padding: 20px; text-align: center;">
                            <p style="margin: 10px 0; font-size: 22px; font-weight: bold; color: #dc2626; font-style: italic;">
                                ¡Felices Fiestas!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Mensaje Final -->
                    <tr>
                        <td style="padding: 10px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                                <tr>
                                    <td style="text-align: center; font-size: 12px; color: #78350f;">
                                        <strong>${empresa}</strong> le da las gracias por su esfuerzo, compromiso y apoyo en este ${año}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; text-align: center; border-top: 1px solid #dddddd; font-size: 11px; color: #666666;">
                            <p style="margin: 5px 0;"><strong>${empresa}</strong></p>
                            <p style="margin: 5px 0;">San Rafael Abajo de Desamparados</p>
                            <p style="margin: 5px 0;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                            <p style="margin: 5px 0;">Fecha: ${fechaEnvio}</p>
                            <p style="margin: 10px 0 5px 0; font-style: italic; font-size: 10px;">Mensaje automatico - No responder</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    /**
     * Verifica si un correo es de Hotmail/Outlook
     * @param {string} email - Dirección de correo electrónico
     * @returns {boolean} - True si es Hotmail/Outlook
     */
    esCorreoHotmail(email) {
        if (!email || typeof email !== 'string') return false;
        const dominiosHotmail = [
            'hotmail.com', 'hotmail.es', 'hotmail.co.uk',
            'outlook.com', 'outlook.es', 'outlook.co.uk',
            'live.com', 'live.es', 'msn.com'
        ];
        const dominio = email.toLowerCase().split('@')[1];
        return dominiosHotmail.includes(dominio);
    }

    /**
     * Genera versión de texto plano del comprobante
     * Importante para evitar filtros de spam de Hotmail
     * @param {Object} datos - Datos del comprobante
     * @returns {string} - Versión de texto plano
     */
    generarTextoPlano(datos) {
        return `
COMPROBANTE DE PAGO
${datos.empresa || 'Sistema de Planillas'}
San Rafael Abajo de Desamparados
Tel: 4000-1365 | WhatsApp: 8839-2214

=====================================
DATOS DEL COLABORADOR
=====================================
Nombre: ${datos.empleado_nombre || ''}
Identificacion: ${datos.empleado_cedula || ''}
Departamento: ${datos.empleado_departamento || ''}
Puesto: ${datos.empleado_puesto || ''}
Periodo: ${datos.periodo || ''}
Depositado en: ${datos.depositado_en || ''}

=====================================
DETALLE DE INGRESOS
=====================================
Salario Mensual: ${datos.salario_mensual || '₡0.00'}
Salario Diario: ${datos.salario_diario || '₡0.00'}
Dias laborados: ${datos.dias_laborados || 0}
Subtotal quincenal: ${datos.subtotal_quincenal || '₡0.00'}
Horas feriado: ${datos.horas_feriado || '0.00'}
Total feriado: ${datos.total_feriado || '₡0.00'}
Horas extras: ${datos.horas_extras || 0}
Total horas extras: ${datos.monto_horas_extras || '₡0.00'}

SALARIO BRUTO: ${datos.salario_bruto || '₡0.00'}

=====================================
DEDUCCIONES
=====================================
CCSS ${datos.ccss_porcentaje || (CONFIG.CCSS.EMPLEADO * 100).toFixed(2)}%: ${datos.ccss || '₡0.00'}
Impuesto Renta: ${datos.impuesto_renta || '₡0.00'}
Rebajo horas: ${datos.rebajo_horas || '₡0.00'}
Otras deducciones: ${datos.otras_deducciones || '₡0.00'}

TOTAL DEDUCCIONES: ${datos.total_deducciones || '₡0.00'}

=====================================
SALARIO NETO: ${datos.salario_neto || '₡0.00'}
=====================================

Observaciones:
${datos.observaciones || 'Sin observaciones especiales'}

------------------------------------
Fecha de envio: ${datos.fecha_envio || new Date().toLocaleDateString('es-CR')}
Mensaje automatico - No responder a este correo
${datos.empresa || 'Sistema de Planillas'}
        `.trim();
    }

    /**
     * Envía felicitación de cumpleaños por email usando EmailJS
     * @param {Object} empleado - Datos del empleado
     * @returns {Promise<Object>} - Resultado del envío
     */
    async enviarCumpleanos(empleado) {
        try {
            // Verificar configuración
            if (!this.verificarConfiguracion()) {
                throw new Error('EmailJS no está configurado correctamente');
            }

            // Preparar datos para el email
            const templateParams = this.prepararDatosEmailCumpleanos(empleado);

            // Generar HTML del email de cumpleaños
            const cumpleanosHTML = this.generarHTMLCumpleanos(templateParams);
            
            // Agregar el HTML al templateParams
            templateParams.cumpleanos_html = cumpleanosHTML;

            // Usar el template ID de cumpleaños si existe, sino usar el general
            const templateId = window.EMAILJS_CONFIG.TEMPLATE_ID_CUMPLEANOS || window.EMAILJS_CONFIG.TEMPLATE_ID;

            // Log de los parámetros para debugging
            console.log('Enviando email de cumpleaños con parámetros:', {
                serviceId: window.EMAILJS_CONFIG.SERVICE_ID,
                templateId: templateId,
                destinatario: templateParams.to_email,
                templateParams: { ...templateParams, cumpleanos_html: '(HTML contenido)' }
            });

            // Enviar email
            const response = await emailjs.send(
                window.EMAILJS_CONFIG.SERVICE_ID,
                templateId,
                templateParams
            );

            return {
                success: response.status === 200,
                messageId: response.text
            };

        } catch (error) {
            console.error('Error enviando felicitación de cumpleaños:', error);
            throw error;
        }
    }

    /**
     * Prepara los datos del email para cumpleaños
     * @param {Object} empleado - Datos del empleado
     * @returns {Object} - Datos preparados para la plantilla
     */
    prepararDatosEmailCumpleanos(empleado) {
        // Función helper para asegurar valores string
        const safeString = (value) => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            str = str.normalize('NFC');
            str = str.replace(/[^\w\s@.-áéíóúÁÉÍÓÚñÑüÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛãõÃÕçÇ€£$]/g, '');
            return str.trim();
        };

        const safeEmail = (value) => {
            if (!value || value === null || value === undefined) return 'test@example.com';
            let email = String(value).trim();
            email = email.normalize('NFC');
            email = email.replace(/[^\w@.+_-]/g, '');
            email = email.replace(/\s/g, '');
            return email.includes('@') ? email : 'test@example.com';
        };

        // Calcular edad
        const fechaNacimiento = new Date(empleado.fechaNacimiento);
        const hoy = new Date();
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        const mesCumpleaños = fechaNacimiento.getMonth();
        const diaCumpleaños = fechaNacimiento.getDate();
        
        // Ajustar edad si el cumpleaños aún no ha llegado este año
        if (hoy.getMonth() < mesCumpleaños || (hoy.getMonth() === mesCumpleaños && hoy.getDate() < diaCumpleaños)) {
            edad = edad - 1;
        }

        const nombreEmpleado = safeString(empleado.nombre || empleado.nombreEmpleado);
        const nombreEmpresa = safeString(empleado.empresa || 'Veterinaria San Martín de Porres');

        return {
            to_email: safeEmail(empleado.correo || empleado.email),
            to_name: nombreEmpleado,
            from_name: nombreEmpresa,
            subject: `🎉 ¡Feliz Cumpleaños, ${nombreEmpleado}!`,
            
            // Datos del empleado
            empleado_nombre: nombreEmpleado,
            empleado_edad: edad,
            
            // Datos de la empresa
            empresa: nombreEmpresa,
            
            // Fecha
            fecha_envio: new Date().toLocaleDateString('es-CR')
        };
    }

    /**
     * Genera el HTML del email de cumpleaños
     * @param {Object} datos - Datos preparados del email
     * @returns {string} HTML del email
     */
    generarHTMLCumpleanos(datos) {
        // Función helper para asegurar valores string
        const safeString = (val, defaultVal = '') => {
            if (val === null || val === undefined) return defaultVal;
            return String(val);
        };

        const nombreEmpleado = safeString(datos.empleado_nombre || '');
        const edad = safeString(datos.empleado_edad || '');
        const empresa = safeString(datos.empresa || 'Veterinaria San Martín de Porres');
        const fechaEnvio = safeString(datos.fecha_envio || new Date().toLocaleDateString('es-CR'));

        // Generar HTML OPTIMIZADO PARA HOTMAIL/OUTLOOK
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎉 ¡Feliz cumpleaños!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #e0f7fa; font-family: Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #e0f7fa;">
        <tr>
            <td align="center" style="padding: 30px 10px;">
                <table width="650" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #dddddd;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #b3e5fc; padding: 30px 20px; text-align: center; color: #01579b;">
                            <div style="font-size: 36px; margin-bottom: 10px;">🎉🐾🎂</div>
                            <h1 style="margin: 0; font-size: 28px; line-height: 1.2; color: #01579b;">¡Feliz cumpleaños, ${nombreEmpleado}!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px;">Hoy celebramos a alguien muy especial del equipo 💙</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 25px;">
                            <h2 style="color: #0277bd; margin: 0 0 20px 0; font-size: 20px;">Gracias por cuidar cada vida con tanto amor 🐶🐱</h2>
                            
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #333;">
                                En este día tan especial, todo el equipo de <strong>${empresa}</strong> quiere hacerte llegar un enorme abrazo lleno de gratitud y buenos deseos.
                            </p>
                            
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #333;">
                                Tu dedicación diaria no solo mejora la vida de nuestros pacientes peludos, sino también de todos los que trabajamos a tu lado. ¡Sos parte esencial de nuestra manada!
                            </p>
                            
                            <!-- Quote -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #e1f5fe; border-left: 5px solid #03a9f4; margin: 30px 0;">
                                <tr>
                                    <td style="padding: 15px 20px; font-style: italic; color: #444; font-size: 15px;">
                                        "Quienes cuidan con el corazón, merecen celebraciones con el alma."<br>
                                        ¡Hoy te celebramos a vos!
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #333;">
                                Que tengas un cumpleaños lleno de alegría, cariño, salud y muchos momentos felices humanos y peluditos por igual.
                            </p>
                            
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #333;">
                                ¡Disfrutá tu día, y gracias por ser parte de esta gran familia veterinaria! 🐾🎉
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f1f9ff; text-align: center; padding: 20px; font-size: 14px; color: #666; border-top: 1px solid #dddddd;">
                            <p style="margin: 5px 0;">Con cariño,</p>
                            <p style="margin: 5px 0;"><strong style="color: #0288d1;">Equipo de Recursos Humanos</strong></p>
                            <p style="margin: 5px 0;">${empresa}</p>
                            <p style="margin: 10px 0 5px 0; font-size: 11px; color: #999;">Fecha: ${fechaEnvio}</p>
                            <p style="margin: 10px 0 5px 0; font-style: italic; font-size: 10px; color: #999;">Mensaje automático - No responder</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
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
                subject: 'Prueba de Email LOGIN',
                empleado_nombre: 'Juan Pérez',
                empleado_cedula: '123456789',
                periodo: 'Enero 2024',
                salario_neto: '₡500,000',
                download_link: 'El comprobante se ha descargado automáticamente.',
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
window.EmailServiceSimple = EmailServiceSimple;
