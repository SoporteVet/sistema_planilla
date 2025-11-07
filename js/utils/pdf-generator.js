/**
 * PDF Generator - Sistema de Planillas Costa Rica
 * Generación de documentos PDF usando jsPDF
 */

const PDFGenerator = {
    /**
     * Genera PDF de planilla
     * @param {object} planilla - Datos de la planilla
     */
    generarPlanillaPDF(planilla) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Planilla de Nómina', 105, 15, { align: 'center' });

        // Información del período
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Período: ${Formatters.formatearFecha(planilla.periodoInicio)} - ${Formatters.formatearFecha(planilla.periodoFin)}`, 20, 25);
        doc.text(`Tipo: ${(planilla.tipoPeriodo === 'quinzenal' ? 'quincenal' : planilla.tipoPeriodo).toUpperCase()}`, 20, 31);
        doc.text(`Fecha de generación: ${Formatters.formatearFecha(new Date())}`, 20, 37);

        // Tabla de empleados
        const empleadosArray = [];
        if (planilla.empleados) {
            Object.keys(planilla.empleados).forEach(key => {
                const emp = planilla.empleados[key];
                empleadosArray.push([
                    emp.nombreEmpleado || '-',
                    emp.cédula || '-',
                    Formatters.formatearMoneda(emp.salarioBruto || 0),
                    Formatters.formatearMoneda(emp.descuentoCCSS || 0),
                    Formatters.formatearMoneda(emp.impuestoRenta || 0),
                    Formatters.formatearMoneda(emp.salarioNeto || 0)
                ]);
            });
        }

        doc.autoTable({
            startY: 45,
            head: [['Empleado', 'Cédula', 'Salario Bruto', 'CCSS', 'Renta', 'Salario Neto']],
            body: empleadosArray,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255 }
        });

        // Totales
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('TOTALES:', 20, finalY);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Salarios Brutos: ${Formatters.formatearMoneda(planilla.totales?.totalSalariosBrutos || 0)}`, 20, finalY + 6);
        doc.text(`Total Descuentos CCSS: ${Formatters.formatearMoneda(planilla.totales?.totalDescuentosCCSS || 0)}`, 20, finalY + 12);
        doc.text(`Total Impuestos Renta: ${Formatters.formatearMoneda(planilla.totales?.totalImpuestosRenta || 0)}`, 20, finalY + 18);
        doc.text(`Total Salarios Netos: ${Formatters.formatearMoneda(planilla.totales?.totalSalariosNetos || 0)}`, 20, finalY + 24);
        doc.text(`Cantidad de Empleados: ${planilla.totales?.cantidadEmpleados || 0}`, 20, finalY + 30);

        // Guardar PDF
        const filename = `Planilla_${Formatters.formatearFechaFirebase(planilla.periodoInicio)}_${planilla.tipoPeriodo}.pdf`;
        doc.save(filename);
    },

    /**
     * Genera constancia salarial
     * @param {object} empleado - Datos del empleado
     */
    generarConstanciaSalarial(empleado) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Encabezado
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('CONSTANCIA SALARIAL', 105, 20, { align: 'center' });

        // Fecha actual
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Fecha de emisión: ${Formatters.formatearFechaLarga(new Date())}`, 105, 30, { align: 'center' });

        // Cuerpo de la constancia
        doc.setFontSize(11);
        const textoInicio = 50;
        
        doc.text('Por medio de la presente, se hace constar que:', 20, textoInicio);
        
        doc.setFont(undefined, 'bold');
        doc.text(`Nombre: ${empleado.nombre}`, 20, textoInicio + 10);
        doc.text(`Cédula: ${Formatters.formatearCedula(empleado.cedula)}`, 20, textoInicio + 18);
        
        doc.setFont(undefined, 'normal');
        doc.text(`Labora en esta empresa desde el ${Formatters.formatearFechaLarga(empleado.fechaIngreso)}`, 20, textoInicio + 28);
        doc.text(`en el cargo de ${empleado.cargo}, del departamento de ${empleado.departamento}.`, 20, textoInicio + 36);
        
        doc.setFont(undefined, 'bold');
        doc.text(`Salario Mensual: ${Formatters.formatearMoneda(empleado.salarioMensual)}`, 20, textoInicio + 46);
        
        doc.setFont(undefined, 'normal');
        doc.text(`Jornada Laboral: ${Formatters.formatearJornada(empleado.jornada)}`, 20, textoInicio + 54);
        doc.text(`Estado: ${empleado.estado.toUpperCase()}`, 20, textoInicio + 62);

        doc.text('Constancia que se extiende a solicitud del interesado para los fines que estime convenientes.', 20, textoInicio + 80);

        // Firma
        doc.line(20, textoInicio + 120, 90, textoInicio + 120);
        doc.text('Firma Autorizada', 55, textoInicio + 126, { align: 'center' });

        // Guardar PDF
        const filename = `Constancia_${empleado.cedula.replace(/[-\s]/g, '')}.pdf`;
        doc.save(filename);
    },

    /**
     * Genera reporte de asistencias
     * @param {string} empleadoNombre - Nombre del empleado
     * @param {array} asistencias - Array de asistencias
     * @param {Date} fechaInicio - Fecha inicio del período
     * @param {Date} fechaFin - Fecha fin del período
     */
    generarReporteAsistencias(empleadoNombre, asistencias, fechaInicio, fechaFin) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Reporte de Asistencias', 105, 15, { align: 'center' });

        // Información
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Empleado: ${empleadoNombre}`, 20, 25);
        doc.text(`Período: ${Formatters.formatearFecha(fechaInicio)} - ${Formatters.formatearFecha(fechaFin)}`, 20, 31);

        // Tabla de asistencias
        const asistenciasArray = asistencias.map(a => [
            Formatters.formatearFecha(a.fecha),
            Formatters.formatearTipoDia(a.tipoDia),
            a.horasTrabajadas || '-',
            a.horasExtra || '-',
            a.observaciones || '-'
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Fecha', 'Tipo', 'Horas Trabajadas', 'Horas Extra', 'Observaciones']],
            body: asistenciasArray,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255 }
        });

        // Resumen
        const finalY = doc.lastAutoTable.finalY + 10;
        const totalDias = asistencias.length;
        const totalHorasExtra = asistencias.reduce((sum, a) => sum + (a.horasExtra || 0), 0);

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Resumen:', 20, finalY);
        doc.setFont(undefined, 'normal');
        doc.text(`Total de días registrados: ${totalDias}`, 20, finalY + 6);
        doc.text(`Total horas extra: ${totalHorasExtra}`, 20, finalY + 12);

        // Guardar PDF
        const filename = `Asistencias_${empleadoNombre.replace(/\s/g, '_')}_${Formatters.formatearFechaFirebase(fechaInicio)}.pdf`;
        doc.save(filename);
    },

    /**
     * Genera reporte de aguinaldo
     * @param {array} empleados - Array de empleados con datos de aguinaldo
     * @param {number} año - Año del aguinaldo
     */
    generarReporteAguinaldo(empleados, año) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(`Reporte de Aguinaldo ${año}`, 105, 15, { align: 'center' });

        // Tabla
        const empleadosArray = empleados.map(emp => [
            emp.nombreEmpleado,
            Formatters.formatearMoneda(emp.sumaAnual || 0),
            Formatters.formatearMoneda(emp.montoAguinaldo || 0),
            emp.estado || 'Pendiente'
        ]);

        doc.autoTable({
            startY: 25,
            head: [['Empleado', 'Total Salarios Anuales', 'Aguinaldo', 'Estado']],
            body: empleadosArray,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255 }
        });

        // Totales
        const totalAguinaldos = empleados.reduce((sum, emp) => sum + (emp.montoAguinaldo || 0), 0);
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Aguinaldos: ${Formatters.formatearMoneda(totalAguinaldos)}`, 20, finalY);

        // Guardar PDF
        const filename = `Aguinaldo_${año}.pdf`;
        doc.save(filename);
    },

    /**
     * Exporta listado de empleados a PDF
     * @param {array} empleados - Array de empleados
     */
    exportarEmpleadosPDF(empleados) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Listado de Empleados', 105, 15, { align: 'center' });

        // Fecha
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Fecha: ${Formatters.formatearFecha(new Date())}`, 105, 22, { align: 'center' });

        // Tabla
        const empleadosArray = empleados.map(emp => [
            emp.nombre,
            Formatters.formatearCedula(emp.cedula),
            emp.cargo,
            emp.departamento,
            Formatters.formatearJornada(emp.jornada),
            Formatters.formatearMoneda(emp.salarioMensual),
            emp.estado
        ]);

        doc.autoTable({
            startY: 30,
            head: [['Nombre', 'Cédula', 'Cargo', 'Departamento', 'Jornada', 'Salario', 'Estado']],
            body: empleadosArray,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 30 },
                5: { cellWidth: 25 },
                6: { cellWidth: 20 }
            }
        });

        // Total
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Total de empleados: ${empleados.length}`, 20, finalY);

        // Guardar PDF
        const filename = `Empleados_${Formatters.formatearFechaFirebase(new Date())}.pdf`;
        doc.save(filename);
    }
};

// Export to window
window.PDFGenerator = PDFGenerator;

