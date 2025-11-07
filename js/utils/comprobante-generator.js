/**
 * Comprobante Generator - Sistema de Planillas Costa Rica
 * Generación de comprobantes de pago en PDF usando html2canvas y jsPDF
 */

const ComprobanteGenerator = {
    /**
     * Genera un comprobante de pago en PDF
     * @param {Object} empleado - Datos del empleado
     * @param {Object} calculos - Cálculos de salario
     * @param {Object} planilla - Información de la planilla
     * @param {string} fechaInicio - Fecha inicio del período (YYYY-MM-DD)
     * @param {string} fechaFin - Fecha fin del período (YYYY-MM-DD)
     * @param {boolean} enviarPorCorreo - Si es true, prepara para enviar por correo
     * @param {Array} asistencias - Array de asistencias del período (opcional)
     * @returns {Promise<Object>} - Objeto PDF de jsPDF
     */
    async generarComprobantePDF(empleado, calculos, planilla, fechaInicio, fechaFin, enviarPorCorreo = false, asistencias = []) {
        return new Promise((resolve, reject) => {
            try {
                // Preparar datos para el HTML
                const datosComprobante = this.prepararDatos(empleado, calculos, planilla, asistencias);
                
                // Generar HTML del comprobante
                const htmlCompleto = this.generarHTML(datosComprobante);

                // Crear un contenedor temporal para el comprobante
                const comprobanteHTML = document.createElement('div');
                comprobanteHTML.id = 'comprobante-temp';
                comprobanteHTML.style.position = 'fixed';
                comprobanteHTML.style.left = '-9999px';
                comprobanteHTML.style.top = '0';
                comprobanteHTML.style.width = '210mm';
                comprobanteHTML.style.background = 'white';
                comprobanteHTML.style.padding = '20px';
                comprobanteHTML.style.fontFamily = 'Arial, sans-serif';

                // Insertar el HTML generado
                comprobanteHTML.innerHTML = htmlCompleto;

                document.body.appendChild(comprobanteHTML);

                // Generar el PDF con html2canvas
                setTimeout(() => {
                    if (typeof html2canvas === 'undefined') {
                        reject(new Error('html2canvas no está disponible. Por favor, incluya la librería en el HTML.'));
                        document.body.removeChild(comprobanteHTML);
                        return;
                    }

                    html2canvas(comprobanteHTML, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        logging: false
                    }).then(canvas => {
                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                        const { jsPDF } = window.jspdf;
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        
                        const imgWidth = 190;
                        const pageHeight = 297;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;
                        const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
                        const y = 5;

                        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

                        // Eliminar el elemento temporal
                        document.body.removeChild(comprobanteHTML);

                        resolve(pdf);
                    }).catch(error => {
                        console.error('Error al generar el comprobante:', error);
                        document.body.removeChild(comprobanteHTML);
                        reject(error);
                    });
                }, 100);
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Prepara los datos para el comprobante
     */
    prepararDatos(empleado, calculos, planilla, asistencias = []) {
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
            horas_feriado: (calculos.horasFeriado || calculos.diasFeriadosTrabajados ? calculos.diasFeriadosTrabajados * 8 : 0).toFixed(2),
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
            otras_deducciones: Formatters.formatearMoneda(calculos.otrosDescuentos || calculos.rebajos || calculos.rebajosEmpleado || 0),
            total_deducciones: Formatters.formatearMoneda(
                (calculos.descuentoCCSS || calculos.ccss || 0) +
                (calculos.impuestoRenta || 0) +
                (calculos.otrosDescuentos || calculos.rebajos || 0) +
                (calculos.rebajosPorHoras?.total || calculos.rebajoHoras || 0)
            ),
            salario_neto: Formatters.formatearMoneda(calculos.salarioNeto || 0),
            observaciones: observacionesTexto
        };
    },

    /**
     * Genera el HTML del comprobante
     */
    generarHTML(datos) {
        return `
<style>
    #comprobante-temp {
        font-size: 11px;
        line-height: 1.4;
    }
    #comprobante-temp .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 15px;
    }
    #comprobante-temp .title {
        text-align: center;
        background: #007bff;
        color: white;
        padding: 8px 20px;
        border-radius: 15px;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 15px;
    }
    #comprobante-temp table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 15px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    #comprobante-temp table.info-table th {
        background: #007bff;
        color: white;
        padding: 8px;
        text-align: left;
        font-weight: bold;
        border: none;
    }
    #comprobante-temp table.info-table td {
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 5px;
    }
    #comprobante-temp table.info-table tr:nth-child(even) {
        background: #f9f9f9;
    }
    #comprobante-temp .section-title {
        background: #007bff;
        color: white;
        padding: 8px;
        font-weight: bold;
        text-align: center;
        margin-top: 15px;
        margin-bottom: 10px;
        border-radius: 10px;
    }
    #comprobante-temp table.detail-table {
        border: 2px solid #007bff;
    }
    #comprobante-temp table.detail-table thead {
        background: #007bff;
        color: white;
    }
    #comprobante-temp table.detail-table th {
        padding: 8px;
        border: 1px solid white;
        font-weight: bold;
        text-align: center;
        border-radius: 5px;
    }
    #comprobante-temp table.detail-table td {
        padding: 6px 8px;
        border: 1px solid #ddd;
        text-align: right;
        border-radius: 5px;
    }
    #comprobante-temp table.detail-table td:first-child {
        text-align: left;
    }
    #comprobante-temp .deductions-header {
        background: #E74C3C !important;
        color: white;
    }
    #comprobante-temp .salary-net {
        background: #007bff;
        color: white;
        font-size: 16px;
        font-weight: bold;
        text-align: center;
        padding: 12px;
        margin-top: 15px;
        border-radius: 15px;
    }
    #comprobante-temp .notes {
        margin-top: 20px;
        padding: 10px;
        background: #f0f8ff;
        border-left: 4px solid #007bff;
        font-size: 10px;
        border-radius: 10px;
    }
</style>

<div class="header">
    <div style="flex: 1; text-align: right;">
        <h2 style="margin: 0; color: #007bff;">${datos.empresa}</h2>
        <p style="margin: 5px 0; color: #666;">San Rafael Abajo de Desamparados</p>
        <p style="margin: 5px 0; color: #666;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
    </div>
</div>

<div class="title">Comprobante de Pago</div>

<table class="info-table">
    <tr>
        <th colspan="2">DATOS DEL COLABORADOR</th>
    </tr>
    <tr>
        <td><strong>Nombre del colaborador</strong></td>
        <td>${datos.empleado_nombre}</td>
    </tr>
    <tr>
        <td><strong>Identificación</strong></td>
        <td>${datos.empleado_cedula}</td>
    </tr>
    <tr>
        <td><strong>Departamento</strong></td>
        <td>${datos.empleado_departamento}</td>
    </tr>
    <tr>
        <td><strong>Puesto</strong></td>
        <td>${datos.empleado_puesto}</td>
    </tr>
    <tr>
        <td><strong>Periodo de pago</strong></td>
        <td>${datos.periodo}</td>
    </tr>
    <tr>
        <td><strong>Depositado en</strong></td>
        <td>${datos.depositado_en}</td>
    </tr>
    <tr>
        <td><strong>Cuenta</strong></td>
        <td></td>
    </tr>
</table>

<div class="section-title">Detalle de Ingresos en el mes</div>

<table class="detail-table">
    <thead>
        <tr>
            <th style="width: 50%;">INGRESOS</th>
            <th style="width: 25%;"></th>
            <th style="width: 25%;" class="deductions-header">DEDUCCIONES</th>
            <th style="width: 25%;"></th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Salario Mensual</td>
            <td>${datos.salario_mensual}</td>
            <td>C.C.S.S. ${datos.ccss_porcentaje}%</td>
            <td>${datos.ccss}</td>
        </tr>
        <tr>
            <td>Salario diario</td>
            <td>${datos.salario_diario}</td>
            <td>Impuesto de Renta</td>
            <td>${datos.impuesto_renta}</td>
        </tr>
        <tr>
            <td>Salario x hora</td>
            <td>${datos.salario_hora}</td>
            <td>${datos.rebajo_horas_label}</td>
            <td>${datos.rebajo_horas}</td>
        </tr>
        <tr>
            <td></td>
            <td></td>
            <td>Otras deducciones</td>
            <td>${datos.otras_deducciones}</td>
        </tr>
        <tr>
            <td>Días laborados</td>
            <td>${datos.dias_laborados}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Subtotal quincenal</td>
            <td>${datos.subtotal_quincenal}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Horas laboradas feriado</td>
            <td>${datos.horas_feriado}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Total</td>
            <td>${datos.total_feriado}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Horas extras feriado</td>
            <td>${datos.horas_extra_feriado}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Total</td>
            <td>${datos.total_extra_feriado}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Horas extras</td>
            <td>${datos.horas_extras}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Total</td>
            <td>${datos.monto_horas_extras}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Horas adicionales</td>
            <td>${datos.horas_adicionales}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Total</td>
            <td>${datos.monto_horas_adicionales}</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Sub-total Pagado</td>
            <td>${datos.subtotal_pagado}</td>
            <td></td>
            <td></td>
        </tr>
        <tr style="font-weight: bold; background: #e8f4f8;">
            <td>SALARIO BRUTO</td>
            <td>${datos.salario_bruto}</td>
            <td>Total de Deducciones</td>
            <td>${datos.total_deducciones}</td>
        </tr>
    </tbody>
</table>

<div class="salary-net">
    SALARIO NETO: ${datos.salario_neto}
</div>

<div class="notes">
    <strong>Observaciones:</strong><br>
    ${datos.observaciones.replace(/\n/g, '<br>')}
</div>
        `.trim();
    },

    /**
     * Descarga el comprobante como PDF
     * @param {Object} pdf - Objeto PDF de jsPDF
     * @param {string} nombreEmpleado - Nombre del empleado
     * @param {string} periodo - Período de pago
     */
    descargarComprobante(pdf, nombreEmpleado, periodo) {
        const fileName = `Comprobante_${nombreEmpleado.replace(/\s/g, '_')}_${periodo.replace(/\s/g, '_')}.pdf`;
        pdf.save(fileName);
    }
};

// Export to window
window.ComprobanteGenerator = ComprobanteGenerator;
