// Servicio de email simplificado para evitar errores de localStorage
class EmailServiceSimple {
    constructor() {
        this.maxEmailSize = 25 * 1024; // 25KB máximo para evitar error 413
    }

    /**
     * Envía un comprobante por email usando EmailJS de forma simplificada
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

            // Preparar datos optimizados para el email con TODOS los valores individuales
            const templateParams = this.prepararDatosEmail(empleado, calculos, planilla, asistencias);
            
            // Log para debugging
            console.log('=== Enviando email ===');
            console.log('Parámetros enviados:', {
                serviceId: window.EMAILJS_CONFIG.SERVICE_ID,
                templateId: window.EMAILJS_CONFIG.TEMPLATE_ID,
                templateParamsKeys: Object.keys(templateParams),
                empleado_nombre: templateParams.empleado_nombre,
                salario_neto: templateParams.salario_neto,
                empresa: templateParams.empresa
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
                fileName: fileName
            };

        } catch (error) {
            console.error('Error enviando comprobante:', error);
            throw error;
        }
    }

    /**
     * Genera el HTML del comprobante de pago para email
     * @param {Object} templateParams - Datos preparados del email (incluye empleado, calculos, planilla)
     * @returns {string} HTML del comprobante
     */
    generarHTMLComprobante(templateParams) {
        // Usar la misma función de preparación que el generador de PDF
        const empleado = templateParams.empleado || {};
        const calculos = templateParams.calculos || {};
        const planilla = templateParams.planilla || {};
        const asistencias = templateParams.asistencias || [];

        // Preparar datos usando la misma lógica que ComprobanteGenerator
        const datos = this.prepararDatosComprobante(empleado, calculos, planilla, asistencias);

        // Generar el HTML usando la misma estructura que el PDF pero con estilos inline para email
        return this.generarHTMLEmailConEstilosInline(datos);
    }

    /**
     * Prepara los datos del comprobante igual que ComprobanteGenerator
     */
    prepararDatosComprobante(empleado, calculos, planilla, asistencias = []) {
        // Contar días de incapacidad CCSS
        let diasIncapacidadCCSS = 0;
        let horasIncapacidadCCSS = 0;
        if (asistencias && asistencias.length > 0) {
            asistencias.forEach(a => {
                if (a.tipoDia === CONFIG.TIPOS_DIA.INCAPACIDAD_CCSS) {
                    diasIncapacidadCCSS++;
                    horasIncapacidadCCSS += a.horasTrabajadas || 0;
                }
            });
        }
        
        // Si no hay asistencias, usar los datos del cálculo
        if (diasIncapacidadCCSS === 0 && calculos.rebajosPorHoras?.diasIncapacidadCCSS) {
            diasIncapacidadCCSS = calculos.rebajosPorHoras.diasIncapacidadCCSS;
            horasIncapacidadCCSS = calculos.rebajosPorHoras.horasIncapacidadCCSS || 0;
        }
        
        // Formatear observaciones desde asistencias
        let observacionesTexto = 'Sin observaciones especiales';
        const observacionesArray = [];
        
        // Agregar información de incapacidad CCSS si existe
        if (diasIncapacidadCCSS > 0) {
            observacionesArray.push(`Incapacidad CCSS: ${diasIncapacidadCCSS} día${diasIncapacidadCCSS > 1 ? 's' : ''} (${horasIncapacidadCCSS.toFixed(2)} horas)`);
        }
        
        // Agregar otras observaciones desde asistencias
        if (asistencias && asistencias.length > 0) {
            const otrasObservaciones = asistencias
                .filter(a => a.observaciones && a.observaciones.trim() !== '' && !a.observaciones.includes('Registro quincenal'))
                .map(a => {
                    let fecha = '';
                    if (a.fecha) {
                        // Si la fecha está en formato YYYYMMDD (string de 8 dígitos)
                        if (typeof a.fecha === 'string' && /^\d{8}$/.test(a.fecha)) {
                            const ano = parseInt(a.fecha.substring(0, 4));
                            const mes = parseInt(a.fecha.substring(4, 6)) - 1; // Mes es 0-indexed
                            const dia = parseInt(a.fecha.substring(6, 8));
                            const fechaObj = new Date(ano, mes, dia);
                            if (!isNaN(fechaObj.getTime())) {
                                fecha = fechaObj.toLocaleDateString('es-CR');
                            }
                        } else {
                            // Intentar parsear como Date normal
                            try {
                                const fechaObj = new Date(a.fecha);
                                if (!isNaN(fechaObj.getTime())) {
                                    fecha = fechaObj.toLocaleDateString('es-CR');
                                }
                            } catch (e) {
                                fecha = '';
                            }
                        }
                    }
                    return fecha ? `${fecha}: ${a.observaciones}` : a.observaciones;
                });
            observacionesArray.push(...otrasObservaciones);
        }
        
        if (observacionesArray.length > 0) {
            observacionesTexto = observacionesArray.join('\n');
        } else if (calculos.observaciones && calculos.observaciones !== 'Sin observaciones especiales') {
            observacionesTexto = calculos.observaciones;
        }

        // Formatear período
        let periodoStr = planilla.periodo || '';
        if (!periodoStr) {
            let fechaInicio = null;
            if (planilla.periodoInicio) {
                fechaInicio = new Date(planilla.periodoInicio);
            } else if (planilla.fechaInicio) {
                fechaInicio = new Date(planilla.fechaInicio);
            }
            
            if (fechaInicio && !isNaN(fechaInicio.getTime())) {
                // Si es quincenal, formatear como "IQ Mes" o "IIQ Mes"
                if (planilla.tipoPeriodo === 'quincenal') {
                    const diaInicio = fechaInicio.getDate();
                    const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                    const primeraLetraMayuscula = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
                    
                    // Determinar si es primera (1-15) o segunda (16-30) quincena
                    if (diaInicio >= 1 && diaInicio <= 15) {
                        periodoStr = `IQ ${primeraLetraMayuscula}`;
                    } else {
                        periodoStr = `IIQ ${primeraLetraMayuscula}`;
                    }
                } else {
                    // Para mensual, mostrar el mes completo
                    const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
                    const primeraLetraMayuscula = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
                    periodoStr = primeraLetraMayuscula;
                }
            } else if (planilla.fechaInicio && planilla.fechaFin) {
                // Fallback: mostrar rango de fechas
                const inicio = new Date(planilla.fechaInicio);
                const fin = new Date(planilla.fechaFin);
                periodoStr = `${inicio.toLocaleDateString('es-CR')} - ${fin.toLocaleDateString('es-CR')}`;
            }
        }

        return {
            empleado_nombre: empleado.nombre || empleado.nombreEmpleado || '',
            empleado_cedula: Formatters.formatearCedula(empleado.cedula),
            empleado_puesto: empleado.puesto || empleado.cargo || '',
            empleado_departamento: empleado.departamento || 'Operativo',
            depositado_en: empleado.banco || empleado.depositadoEn || 'Bac San José',
            periodo: periodoStr,
            empresa: empleado.empresa || 'Sistema de Planillas',
            salario_mensual: Formatters.formatearMoneda(calculos.salarioBaseMensual || empleado.salarioMensual || 0),
            salario_diario: Formatters.formatearMoneda(calculos.salarioDiario || 0),
            salario_hora: Formatters.formatearMonedaPrecisa(empleado.salarioHora || empleado.salarioHorario || 0, 7),
            subtotal_quincenal: Formatters.formatearMoneda(calculos.subtotalQuincenal || 0),
            dias_laborados: calculos.diasLaborados || calculos.diasTrabajados || 0,
            horas_feriado: (calculos.horasFeriado || (calculos.diasFeriadosTrabajados ? calculos.diasFeriadosTrabajados * 8 : 0)).toFixed(2),
            total_feriado: Formatters.formatearMoneda(calculos.pagoFeriados || calculos.montoFeriado || 0),
            horas_extra_feriado: (calculos.horasExtraFeriado || 0).toFixed(2),
            total_extra_feriado: Formatters.formatearMoneda(calculos.totalExtraFeriado || calculos.montoExtraFeriado || 0),
            horas_extras: calculos.horasExtra || 0,
            monto_horas_extras: Formatters.formatearMoneda(calculos.montoHorasExtra || calculos.pagoHorasExtra || 0),
            horas_adicionales: (calculos.horasAdicionales || 0).toFixed(2),
            monto_horas_adicionales: Formatters.formatearMoneda(calculos.pagoHorasAdicionales || calculos.montoHorasAdicionales || 0),
            subtotal_pagado: Formatters.formatearMoneda(calculos.subtotalPagado || calculos.salarioBase || 0),
            salario_bruto: Formatters.formatearMoneda(calculos.salarioBruto || 0),
            ccss: Formatters.formatearMoneda(calculos.descuentoCCSS || calculos.ccss || 0),
            ccss_porcentaje: '10.67',
            impuesto_renta: Formatters.formatearMoneda(calculos.impuestoRenta || 0),
            rebajo_horas: Formatters.formatearMoneda(calculos.rebajosPorHoras?.total || calculos.rebajoHoras || 0),
            rebajo_horas_es_incapacidad: calculos.rebajosPorHoras?.esIncapacidadCCSS || false,
            rebajo_horas_label: calculos.rebajosPorHoras?.esIncapacidadCCSS ? 'Incapacidad CCSS' : 'Rebajo por horas',
            otras_deducciones: Formatters.formatearMoneda(calculos.otrosDescuentos || calculos.rebajos || 0),
            total_deducciones: Formatters.formatearMoneda(
                (calculos.descuentoCCSS || calculos.ccss || 0) +
                (calculos.impuestoRenta || 0) +
                (calculos.otrosDescuentos || calculos.rebajos || 0) +
                (calculos.rebajosPorHoras?.total || calculos.rebajoHoras || 0)
            ),
            salario_neto: Formatters.formatearMoneda(calculos.salarioNeto || 0),
            observaciones: observacionesTexto,
            fecha_envio: new Date().toLocaleDateString('es-CR')
        };
    }

    /**
     * Genera el HTML del comprobante con estilos inline para email
     */
    generarHTMLEmailConEstilosInline(datos) {
        // Asegurar que todos los valores son strings seguros
        const safeHTML = (val) => {
            if (val === null || val === undefined) return '';
            return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };
        
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Pago</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; margin: 0 auto; background-color: #f4f4f4;">
        <tr>
            <td>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: white; padding: 20px; border: 1px solid #ddd;">
                    <!-- Header -->
                    <tr>
                        <td style="text-align: right; padding-bottom: 15px; margin-bottom: 20px;">
                            <h2 style="margin: 0; color: #007bff; font-size: 18px; font-weight: bold;">${safeHTML(datos.empresa)}</h2>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">San Rafael Abajo de Desamparados</p>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                        </td>
            </tr>
                    
                    <!-- Title -->
            <tr>
                        <td style="text-align: center; background: #007bff; color: white; padding: 8px 20px; font-weight: bold; font-size: 14px; margin-bottom: 15px;">
                            Comprobante de Pago
                        </td>
            </tr>
                    
                    <!-- Datos del Colaborador -->
                    <tr>
                        <td>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 2px solid #007bff;">
                                <tr>
                                    <th colspan="2" style="background: #007bff; color: white; padding: 8px; text-align: left; font-weight: bold; border: 1px solid #007bff;">DATOS DEL COLABORADOR</th>
                                </tr>
                                <tr style="background: #ffffff;">
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"><strong>Nombre del colaborador</strong></td>
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${safeHTML(datos.empleado_nombre)}</td>
                                </tr>
                                <tr style="background: #f9f9f9;">
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"><strong>Identificación</strong></td>
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${safeHTML(datos.empleado_cedula)}</td>
            </tr>
                                <tr style="background: #ffffff;">
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"><strong>Departamento</strong></td>
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${safeHTML(datos.empleado_departamento)}</td>
            </tr>
                                <tr style="background: #f9f9f9;">
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"><strong>Puesto</strong></td>
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${safeHTML(datos.empleado_puesto)}</td>
            </tr>
                                <tr style="background: #ffffff;">
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"><strong>Periodo de pago</strong></td>
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${safeHTML(datos.periodo)}</td>
            </tr>
                                <tr style="background: #f9f9f9;">
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"><strong>Depositado en</strong></td>
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${safeHTML(datos.depositado_en)}</td>
            </tr>
                                <tr style="background: #ffffff;">
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"><strong>Cuenta</strong></td>
                                    <td style="padding: 6px 8px; border: 1px solid #ddd;"></td>
            </tr>
        </table>
                        </td>
                    </tr>
                    
                    <!-- Section Title -->
                    <tr>
                        <td style="background: #007bff; color: white; padding: 8px; font-weight: bold; text-align: center; margin-top: 15px; margin-bottom: 10px; border-radius: 10px;">
                            Detalle de Ingresos en el mes
                        </td>
                    </tr>
                    
                    <!-- Detalle de Ingresos -->
                    <tr>
                        <td>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border: 2px solid #007bff; border-collapse: separate; border-spacing: 0; margin-bottom: 15px; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <thead>
                <tr>
                                        <th style="width: 50%; background: #007bff; color: white; padding: 8px; border: 1px solid white; font-weight: bold; text-align: center; border-radius: 5px;">INGRESOS</th>
                                        <th style="width: 25%; background: #007bff; color: white; padding: 8px; border: 1px solid white; font-weight: bold; text-align: center; border-radius: 5px;"></th>
                                        <th style="width: 25%; background: #E74C3C; color: white; padding: 8px; border: 1px solid white; font-weight: bold; text-align: center; border-radius: 5px;">DEDUCCIONES</th>
                                        <th style="width: 25%; background: #E74C3C; color: white; padding: 8px; border: 1px solid white; font-weight: bold; text-align: center; border-radius: 5px;"></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Salario Mensual</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.salario_mensual}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">C.C.S.S. ${datos.ccss_porcentaje}%</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.ccss}</td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Salario diario</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.salario_diario}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Impuesto de Renta</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.impuesto_renta}</td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Salario x hora</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.salario_hora}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">${datos.rebajo_horas_label}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.rebajo_horas}</td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Otras deducciones</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.otras_deducciones}</td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Días laborados</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.dias_laborados}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Subtotal quincenal</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.subtotal_quincenal}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Horas laboradas feriado</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.horas_feriado}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Total</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.total_feriado}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Horas extras feriado</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.horas_extra_feriado}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Total</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.total_extra_feriado}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Horas extras</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.horas_extras}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Total</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.monto_horas_extras}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Horas adicionales</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.horas_adicionales}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Total</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.monto_horas_adicionales}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Sub-total Pagado</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.subtotal_pagado}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 5px;"></td>
                </tr>
                <tr style="font-weight: bold; background: #e8f4f8;">
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">SALARIO BRUTO</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.salario_bruto}</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; border-radius: 5px;">Total de Deducciones</td>
                                        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; border-radius: 5px;">${datos.total_deducciones}</td>
                </tr>
            </tbody>
        </table>
                        </td>
                    </tr>
                    
                    <!-- Salario Neto -->
                    <tr>
                        <td style="background: #007bff; color: white; font-size: 16px; font-weight: bold; text-align: center; padding: 12px; margin-top: 15px; border-radius: 15px;">
                            SALARIO NETO: ${datos.salario_neto}
                        </td>
                    </tr>
                    
                    <!-- Observaciones -->
                    <tr>
                        <td style="margin-top: 20px; padding: 10px; background: #f0f8ff; border-left: 4px solid #007bff; font-size: 10px; border-radius: 10px;">
            <strong>Observaciones:</strong><br>
                            ${datos.observaciones.replace(/\n/g, '<br>')}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 10px;">
                            <p style="margin: 5px 0;"><strong>${datos.empresa}</strong></p>
                            <p style="margin: 5px 0;">San Rafael Abajo de Desamparados</p>
                            <p style="margin: 5px 0;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                            <p style="margin: 5px 0;">Fecha de envío: ${datos.fecha_envio}</p>
                            <p style="margin: 5px 0; font-style: italic;">Este es un mensaje automático, por favor no responder a este correo.</p>
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
     * Prepara los datos del email optimizados
     */
    prepararDatosEmail(empleado, calculos, planilla, asistencias = []) {
        // Preparar datos usando la misma lógica que prepararDatosComprobante
        const datosComprobante = this.prepararDatosComprobante(empleado, calculos, planilla, asistencias);
        
        // Preparar datos adicionales para EmailJS
        const safeString = (value) => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            str = str.normalize('NFC');
            return str.trim();
        };
        const safeEmail = (value) => {
            const email = safeString(value);
            return email.includes('@') ? email : 'test@example.com';
        };
        
        // Combinar todos los datos
        return {
            // Datos básicos de EmailJS
            to_email: safeEmail(empleado.email),
            to_name: safeString(empleado.nombre || empleado.nombreEmpleado),
            from_name: safeString(empleado.empresa || 'Sistema de Planillas'),
            subject: `Comprobante de Pago - ${safeString(planilla.periodo)}`,
            
            // Todos los datos del comprobante (ya formateados)
            empleado_nombre: datosComprobante.empleado_nombre,
            empleado_cedula: datosComprobante.empleado_cedula,
            empleado_puesto: datosComprobante.empleado_puesto,
            empleado_departamento: datosComprobante.empleado_departamento,
            depositado_en: datosComprobante.depositado_en,
            periodo: datosComprobante.periodo,
            empresa: datosComprobante.empresa,
            salario_mensual: datosComprobante.salario_mensual,
            salario_diario: datosComprobante.salario_diario,
            salario_hora: datosComprobante.salario_hora,
            subtotal_quincenal: datosComprobante.subtotal_quincenal,
            dias_laborados: datosComprobante.dias_laborados,
            horas_feriado: datosComprobante.horas_feriado,
            total_feriado: datosComprobante.total_feriado,
            horas_extra_feriado: datosComprobante.horas_extra_feriado,
            total_extra_feriado: datosComprobante.total_extra_feriado,
            horas_extras: datosComprobante.horas_extras,
            monto_horas_extras: datosComprobante.monto_horas_extras,
            subtotal_pagado: datosComprobante.subtotal_pagado,
            salario_bruto: datosComprobante.salario_bruto,
            ccss: datosComprobante.ccss,
            ccss_porcentaje: datosComprobante.ccss_porcentaje,
            impuesto_renta: datosComprobante.impuesto_renta,
            rebajo_horas: datosComprobante.rebajo_horas,
            otras_deducciones: datosComprobante.otras_deducciones,
            total_deducciones: datosComprobante.total_deducciones,
            salario_neto: datosComprobante.salario_neto,
            observaciones: datosComprobante.observaciones.replace(/\n/g, '<br>'),
            fecha_envio: datosComprobante.fecha_envio
        };
    }
    
    /**
     * Prepara los datos del email optimizados (versión antigua - mantener por compatibilidad)
     */
    prepararDatosEmailOld(empleado, calculos, planilla) {
        // Calcular valores adicionales necesarios para la plantilla
        // Usar los mismos cálculos que el comprobante de pago
        const horasJornada = this.getHorasJornada(empleado.jornada);
        const salarioDiario = parseFloat(empleado.salarioHora || 0) * horasJornada;
        
        // Calcular días totales del período (igual que en el comprobante)
        const contarDiasTotalesPeriodo = (fechaInicio, fechaFin) => {
            const inicio = new Date(fechaInicio + 'T00:00:00');
            const fin = new Date(fechaFin + 'T00:00:00');
            let diasTotal = 0;
            for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
                diasTotal++;
            }
            return diasTotal;
        };
        
        const diasTotalesPeriodo = planilla.fechaInicio && planilla.fechaFin 
            ? contarDiasTotalesPeriodo(planilla.fechaInicio, planilla.fechaFin)
            : 15; // Valor por defecto si no hay fechas
        
        // Calcular igual que en el comprobante
        const subtotalQuincenal = salarioDiario * diasTotalesPeriodo;
        const salarioMensual = subtotalQuincenal * 2;
        
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
        
        // Calcular valores de feriados igual que en el comprobante
        const salarioHora = safeNumber(empleado.salarioHora);
        const horasFeriado = safeNumber(calculos.horasFeriado || 0);
        const montoFeriado = safeNumber(calculos.montoFeriado || 0);
        // Si montoFeriado no está disponible, calcularlo (horasFeriado * salarioHora * 2)
        const totalFeriado = montoFeriado > 0 ? montoFeriado : (horasFeriado * salarioHora * 2);
        
        const horasExtraFeriado = safeNumber(calculos.horasExtraFeriado || 0);
        const montoExtraFeriado = safeNumber(calculos.montoExtraFeriado || 0);
        // Si montoExtraFeriado no está disponible, calcularlo (horasExtraFeriado * salarioHora * 3)
        const totalExtraFeriado = montoExtraFeriado > 0 ? montoExtraFeriado : (horasExtraFeriado * salarioHora * 3);
        
        const montoHorasExtra = safeNumber(calculos.montoHorasExtra || 0);
        const salarioBase = safeNumber(calculos.salarioBase || 0);
        
        // El subtotal pagado es igual que en el comprobante: salarioBase + feriados + horas extra
        const subtotalPagado = salarioBase + totalFeriado + totalExtraFeriado + montoHorasExtra;
        
        return {
            to_email: safeEmail(empleado.email),
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
            
            // Salarios
            salario_mensual: this.formatearMoneda(salarioMensual),
            salario_diario: this.formatearMoneda(salarioDiario),
            salario_hora: this.formatearMoneda(safeNumber(empleado.salarioHora || empleado.salarioHorario)),
            subtotal_quincenal: this.formatearMoneda(subtotalQuincenal),
            salario_base: this.formatearMoneda(safeNumber(calculos.salarioBase || calculos.subtotalQuincenal)),
            salario_bruto: this.formatearMoneda(safeNumber(calculos.salarioBruto || 0)),
            salario_neto: this.formatearMoneda(safeNumber(calculos.salarioNeto || 0)),
            
            // Deducciones
            ccss: this.formatearMoneda(safeNumber(calculos.ccss || calculos.descuentoCCSS || 0)),
            ccss_porcentaje: '10.67',
            impuesto_renta: this.formatearMoneda(safeNumber(calculos.impuestoRenta || 0)),
            rebajo_horas: this.formatearMoneda(safeNumber(calculos.rebajoHoras || calculos.rebajosPorHoras?.total || 0)),
            rebajo_horas_es_incapacidad: calculos.rebajosPorHoras?.esIncapacidadCCSS || false,
            rebajo_horas_label: calculos.rebajosPorHoras?.esIncapacidadCCSS ? 'Incapacidad CCSS' : 'Rebajo por horas',
            otras_deducciones: this.formatearMoneda(safeNumber(calculos.otrosDescuentos || calculos.rebajos || calculos.rebajosEmpleado || 0)),
            total_deducciones: this.formatearMoneda(
                safeNumber(calculos.ccss || calculos.descuentoCCSS || 0) + 
                safeNumber(calculos.impuestoRenta || 0) + 
                safeNumber(calculos.otrosDescuentos || calculos.rebajos || calculos.rebajosEmpleado || 0) + 
                safeNumber(calculos.rebajoHoras || calculos.rebajosPorHoras?.total || 0)
            ),
            
            // Horas y extras
            dias_laborados: safeNumber(calculos.diasLaborados || calculos.diasTrabajados || 0),
            horas_extras: safeNumber(calculos.horasExtra || 0),
            monto_horas_extras: this.formatearMoneda(montoHorasExtra),
            horas_feriado: horasFeriado,
            total_feriado: this.formatearMoneda(totalFeriado),
            horas_extra_feriado: horasExtraFeriado,
            total_extra_feriado: this.formatearMoneda(totalExtraFeriado),
            // El subtotal pagado es igual que en el comprobante: salarioBase + feriados + horas extra
            subtotal_pagado: this.formatearMoneda(subtotalPagado),
            
            // Guardar también los objetos completos para generarHTMLComprobante
            empleado: empleado,
            calculos: calculos,
            planilla: planilla,
            
            // Bonificaciones
            bonificaciones: this.formatearMoneda(safeNumber(calculos.bonificaciones)),
            
            // Observaciones
            observaciones: safeString(calculos.observaciones || 'Sin observaciones especiales'),
            
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
