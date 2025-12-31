/**
 * Comprobante Aguinaldo Generator - Sistema de Planillas Costa Rica
 * Generación de comprobantes de aguinaldo en PDF usando html2canvas y jsPDF
 */

const ComprobanteAguinaldoGenerator = {
    /**
     * Genera un comprobante de aguinaldo en PDF
     * @param {Object} empleado - Datos del empleado
     * @param {Object} datosAguinaldo - Datos del aguinaldo (periodos, totales, etc.)
     * @param {number} año - Año del aguinaldo
     * @param {boolean} enviarPorCorreo - Si es true, prepara para enviar por correo
     * @returns {Promise<Object>} - Objeto PDF de jsPDF
     */
    async generarComprobantePDF(empleado, datosAguinaldo, año, enviarPorCorreo = false) {
        return new Promise((resolve, reject) => {
            try {
                // Preparar datos para el HTML
                const datosComprobante = this.prepararDatos(empleado, datosAguinaldo, año);
                
                // Generar HTML del comprobante
                const htmlCompleto = this.generarHTML(datosComprobante);

                // Crear un contenedor temporal para el comprobante
                const comprobanteHTML = document.createElement('div');
                comprobanteHTML.id = 'comprobante-aguinaldo-temp';
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
    prepararDatos(empleado, datosAguinaldo, año) {
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

        return {
            empleado_nombre: empleado.nombre || empleado.nombreEmpleado || '',
            empleado_cedula: Formatters.formatearCedula(empleado.cedula),
            empleado_puesto: empleado.puesto || empleado.cargo || '',
            empleado_departamento: empleado.departamento || 'Operativo',
            año: año,
            año_anterior: año - 1,
            periodo_completo: `Dic. ${año - 1} a Nov. ${año}`,
            empresa: empleado.empresa || 'Veterinaria San Martín de Porres',
            salarios_mensuales: salariosMensuales,
            total_salarios: totalBruto,
            aguinaldo: montoAguinaldo
        };
    },

    /**
     * Genera el HTML del comprobante de aguinaldo
     */
    generarHTML(datos) {
        // Generar las filas de los salarios mensuales
        const filasSalarios = datos.salarios_mensuales.map(mes => {
            const montoFormateado = mes.monto > 0 
                ? Formatters.formatearMoneda(mes.monto) 
                : '-';
            
            return `
                <tr>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${mes.label}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; color: ${mes.monto > 0 ? '#059669' : '#6b7280'}; font-weight: ${mes.monto > 0 ? '600' : 'normal'};">
                        ₡ ${montoFormateado}
                    </td>
                </tr>
            `;
        }).join('');

        return `
<style>
    #comprobante-aguinaldo-temp {
        font-size: 13px;
        line-height: 1.5;
        color: #1f2937;
    }
    #comprobante-aguinaldo-temp * {
        box-sizing: border-box;
    }
    .header-comprobante {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 3px solid #1e3a8a;
    }
    .logo-section {
        flex: 0 0 auto;
    }
    .company-info {
        flex: 1;
        text-align: right;
        padding-left: 20px;
    }
    .company-info h2 {
        margin: 0 0 8px 0;
        color: #1e3a8a;
        font-size: 20px;
        font-weight: bold;
    }
    .company-info p {
        margin: 4px 0;
        color: #4b5563;
        font-size: 12px;
    }
    .title-comprobante {
        text-align: center;
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-weight: bold;
        font-size: 18px;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .info-section {
        background: #f8fafc;
        border: 2px solid #1e3a8a;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 20px;
    }
    .info-section h3 {
        margin: 0 0 12px 0;
        padding: 8px 12px;
        background: #1e3a8a;
        color: white;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        border-radius: 6px;
    }
    .info-row {
        display: flex;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
        border-bottom: none;
    }
    .info-label {
        font-weight: bold;
        color: #374151;
        min-width: 180px;
        font-size: 13px;
    }
    .info-value {
        color: #1f2937;
        font-size: 13px;
    }
    .aguinaldo-section {
        margin-top: 20px;
    }
    .section-subtitle {
        background: #1e3a8a;
        color: white;
        padding: 10px 15px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 15px;
        border-radius: 8px;
        font-size: 15px;
    }
    .salarios-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 2px solid #1e3a8a;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .salarios-table thead {
        background: #1e3a8a;
        color: white;
    }
    .salarios-table th {
        padding: 12px 15px;
        text-align: left;
        font-weight: bold;
        font-size: 14px;
    }
    .salarios-table th:last-child {
        text-align: right;
    }
    .salarios-table tbody tr:nth-child(even) {
        background: #f9fafb;
    }
    .salarios-table tbody tr:hover {
        background: #f3f4f6;
    }
    .totales-section {
        background: #f0f9ff;
        border: 2px solid #1e3a8a;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 20px;
    }
    .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        margin-bottom: 8px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }
    .total-row:last-child {
        margin-bottom: 0;
    }
    .total-label {
        font-weight: bold;
        font-size: 15px;
        color: #1e3a8a;
    }
    .total-value {
        font-size: 16px;
        font-weight: bold;
        color: #059669;
    }
    .aguinaldo-final {
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        color: white;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        padding: 18px;
        margin-top: 0;
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .felicitacion {
        text-align: center;
        margin: 25px 0 15px 0;
        font-size: 24px;
        font-weight: bold;
        color: #dc2626;
        font-style: italic;
        font-family: 'Brush Script MT', cursive, 'Arial';
    }
    .mensaje-final {
        text-align: center;
        margin-top: 20px;
        padding: 15px;
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        border-radius: 8px;
        font-size: 12px;
        color: #78350f;
        line-height: 1.6;
    }
</style>

<div class="header-comprobante">
    <div class="company-info">
        <h2>${datos.empresa}</h2>
        <p>San Rafael Abajo de Desamparados</p>
        <p>Tel: 4000-1365 | WhatsApp: 8839-2214</p>
    </div>
</div>

<div class="title-comprobante">Comprobante de Pago</div>

<div class="info-section">
    <h3>Identificación del colaborador</h3>
    <div style="padding: 0 10px;">
        <div class="info-row">
            <div class="info-label">Identificación:</div>
            <div class="info-value">${datos.empleado_cedula}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Aguinaldo:</div>
            <div class="info-value" style="font-weight: bold; color: #1e3a8a;">${datos.año}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Período:</div>
            <div class="info-value">${datos.periodo_completo}</div>
        </div>
    </div>
</div>

<div class="info-section">
    <div style="padding: 0 10px;">
        <div class="info-row">
            <div class="info-label">Nombre del colaborador:</div>
            <div class="info-value" style="font-weight: bold; font-size: 15px;">${datos.empleado_nombre}</div>
        </div>
    </div>
</div>

<div class="aguinaldo-section">
    <div class="section-subtitle">Detalle de ingresos en el mes</div>
    
    <table class="salarios-table">
        <thead>
            <tr>
                <th>Salarios Mensuales</th>
                <th style="text-align: right;">Monto</th>
            </tr>
        </thead>
        <tbody>
            ${filasSalarios}
        </tbody>
    </table>

    <div class="totales-section">
        <div class="total-row">
            <div class="total-label">Total de Salarios</div>
            <div class="total-value">${Formatters.formatearMoneda(datos.total_salarios)}</div>
        </div>
        <div class="total-row aguinaldo-final">
            <div style="flex: 1;">AGUINALDO</div>
            <div style="font-size: 24px;">${Formatters.formatearMoneda(datos.aguinaldo)}</div>
        </div>
    </div>
</div>

<div class="felicitacion">¡Felices Fiestas!</div>

<div class="mensaje-final">
    <strong>${datos.empresa}</strong> le da las gracias por su esfuerzo, compromiso y 
    apoyo en este ${datos.año}
</div>
        `.trim();
    },

    /**
     * Descarga el comprobante como PDF
     * @param {Object} pdf - Objeto PDF de jsPDF
     * @param {string} nombreEmpleado - Nombre del empleado
     * @param {number} año - Año del aguinaldo
     */
    descargarComprobante(pdf, nombreEmpleado, año) {
        const fileName = `Comprobante_Aguinaldo_${año}_${nombreEmpleado.replace(/\s/g, '_')}.pdf`;
        pdf.save(fileName);
    }
};

// Export to window
window.ComprobanteAguinaldoGenerator = ComprobanteAguinaldoGenerator;
