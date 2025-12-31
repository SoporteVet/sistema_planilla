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
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Color primario (azul)
        const primaryColor = [30, 64, 175];
        const secondaryColor = [59, 130, 246];
        const lightGray = [243, 244, 246];
        const darkGray = [107, 114, 128];

        // ========== ENCABEZADO ==========
        // Preparar información de fecha y quincena
        const periodoInicio = Formatters.formatearFecha(planilla.periodoInicio);
        const periodoFin = Formatters.formatearFecha(planilla.periodoFin);
        const tipoPeriodo = (planilla.tipoPeriodo === 'quinzenal' ? 'quincenal' : planilla.tipoPeriodo).toUpperCase();
        
        // Determinar número de quincena y mes
        const fechaInicio = new Date(planilla.periodoInicio);
        const diaInicio = fechaInicio.getDate();
        const nombreMes = fechaInicio.toLocaleDateString('es-CR', { month: 'long' });
        const mesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
        const año = fechaInicio.getFullYear();
        
        let numeroQuincena = '';
        if (planilla.tipoPeriodo === 'quincenal' || planilla.tipoPeriodo === 'quinzenal') {
            if (diaInicio >= 1 && diaInicio <= 15) {
                numeroQuincena = 'Primera Quincena';
            } else {
                numeroQuincena = 'Segunda Quincena';
            }
        } else {
            numeroQuincena = 'Mensual';
        }
        
        // Fondo del encabezado
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        
        // Título principal con quincena (formato título: primera letra mayúscula)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        const tituloCompleto = `Planilla ${numeroQuincena} - ${mesCapitalizado} ${año}`;
        doc.text(tituloCompleto, 105, 18, { align: 'center' });
        
        // Subtítulo - San Martin de Porres
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('San Martin de Porres', 105, 28, { align: 'center' });
        
        // ========== INFORMACIÓN DEL PERÍODO ==========
        let currentY = 50;
        doc.setTextColor(...darkGray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Caja de información del período (altura ajustada para que quepa todo)
        const alturaCaja = 25;
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.rect(20, currentY - 5, 170, alturaCaja, 'S');
        
        // Fondo gris claro
        doc.setFillColor(...lightGray);
        doc.rect(20, currentY - 5, 170, alturaCaja, 'F');
        doc.rect(20, currentY - 5, 170, alturaCaja, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.text('INFORMACIÓN DEL PERÍODO', 25, currentY);
        
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        
        const fechaGeneracion = Formatters.formatearFecha(new Date());
        
        doc.text(`Período: ${periodoInicio} - ${periodoFin}`, 25, currentY);
        currentY += 6;
        doc.text(`Fecha de generación: ${fechaGeneracion}`, 25, currentY);
        currentY += 6;
        doc.text(`Tipo: ${tipoPeriodo}`, 25, currentY);

        // Función auxiliar para formatear moneda en PDF (sin símbolos extraños)
        const formatearMonedaPDF = (monto) => {
            if (monto === null || monto === undefined || isNaN(monto) || monto === 0) {
                return '0.00';
            }
            const numero = parseFloat(monto);
            
            // Formatear manualmente para evitar problemas con símbolos
            const partes = numero.toFixed(2).split('.');
            let parteEntera = partes[0];
            const parteDecimal = partes[1];
            
            // Agregar separadores de miles (espacios cada 3 dígitos desde la derecha)
            let parteEnteraFormateada = '';
            let contador = 0;
            for (let i = parteEntera.length - 1; i >= 0; i--) {
                if (contador > 0 && contador % 3 === 0) {
                    parteEnteraFormateada = ' ' + parteEnteraFormateada;
                }
                parteEnteraFormateada = parteEntera[i] + parteEnteraFormateada;
                contador++;
            }
            
            return parteEnteraFormateada + '.' + parteDecimal;
        };

        // ========== TABLA DE EMPLEADOS ==========
        currentY += 8;
        const empleadosArray = [];
        if (planilla.empleados) {
            Object.keys(planilla.empleados).forEach(key => {
                const emp = planilla.empleados[key];
                // Formatear cédula si existe
                const cedulaFormateada = emp.cedula ? Formatters.formatearCedula(emp.cedula) : (emp.cédula ? Formatters.formatearCedula(emp.cédula) : '-');
                empleadosArray.push([
                    emp.nombreEmpleado || '-',
                    cedulaFormateada,
                    formatearMonedaPDF(emp.salarioBruto || 0),
                    formatearMonedaPDF(emp.descuentoCCSS || 0),
                    formatearMonedaPDF(emp.impuestoRenta || 0),
                    formatearMonedaPDF(emp.salarioNeto || 0)
                ]);
            });
        }

        doc.autoTable({
            startY: currentY,
            head: [['Empleado', 'Cédula', 'Salario Bruto (CRC)', 'CCSS (CRC)', 'Renta (CRC)', 'Salario Neto (CRC)']],
            body: empleadosArray,
            theme: 'striped',
            styles: { 
                fontSize: 7.5, 
                cellPadding: 2,
                textColor: [0, 0, 0],
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            headStyles: { 
                fillColor: primaryColor, 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7.5,
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251]
            },
            columnStyles: {
                0: { cellWidth: 40, halign: 'left', fontSize: 7 },
                1: { cellWidth: 24, halign: 'center', fontSize: 7 },
                2: { cellWidth: 32, halign: 'right', fontSize: 7 },
                3: { cellWidth: 26, halign: 'right', fontSize: 7 },
                4: { cellWidth: 24, halign: 'right', fontSize: 7 },
                5: { cellWidth: 32, halign: 'right', fontStyle: 'bold', fontSize: 7 }
            },
            margin: { left: 10, right: 10 },
            tableWidth: 190
        });

        // ========== SECCIÓN DE TOTALES ==========
        const finalY = doc.lastAutoTable.finalY + 15;
        
        // Caja de totales con fondo
        doc.setFillColor(...lightGray);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.rect(20, finalY - 5, 170, 50, 'F');
        doc.rect(20, finalY - 5, 170, 50, 'S');
        
        // Título de totales
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('RESUMEN DE TOTALES', 25, finalY + 3);
        
        // Línea separadora
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.3);
        doc.line(25, finalY + 6, 185, finalY + 6);
        
        let totalY = finalY + 12;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Total Salarios Brutos
        doc.setFont('helvetica', 'bold');
        doc.text('Total Salarios Brutos (CRC):', 25, totalY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatearMonedaPDF(planilla.totales?.totalSalariosBrutos || 0), 150, totalY, { align: 'right' });
        
        totalY += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Total Descuentos CCSS (CRC):', 25, totalY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatearMonedaPDF(planilla.totales?.totalDescuentosCCSS || 0), 150, totalY, { align: 'right' });
        
        totalY += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Total Impuestos Renta (CRC):', 25, totalY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatearMonedaPDF(planilla.totales?.totalImpuestosRenta || 0), 150, totalY, { align: 'right' });
        
        totalY += 7;
        // Línea separadora antes del total neto
        doc.setDrawColor(200, 200, 200);
        doc.line(25, totalY + 2, 185, totalY + 2);
        totalY += 6;
        
        // Total Salarios Netos (destacado)
        doc.setFillColor(...secondaryColor);
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.5);
        doc.roundedRect(25, totalY - 5, 160, 8, 2, 2, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL SALARIOS NETOS (CRC):', 30, totalY);
        doc.text(formatearMonedaPDF(planilla.totales?.totalSalariosNetos || 0), 180, totalY, { align: 'right' });
        
        totalY += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Cantidad de Empleados: ${planilla.totales?.cantidadEmpleados || 0}`, 25, totalY);

        // ========== PIE DE PÁGINA ==========
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(...darkGray);
        doc.setFont('helvetica', 'italic');
        doc.text('Documento generado automáticamente por el Sistema de Planillas', 105, pageHeight - 10, { align: 'center' });
        
        // Número de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(...darkGray);
            doc.text(`Página ${i} de ${pageCount}`, 105, pageHeight - 5, { align: 'center' });
        }

        // Guardar PDF
        const filename = `Planilla_${Formatters.formatearFechaFirebase(planilla.periodoInicio)}_${planilla.tipoPeriodo}.pdf`;
        doc.save(filename);
    },

    /**
     * Convierte un número a texto en español (colones)
     * @param {number} numero - Número a convertir
     * @returns {string} Número en texto
     */
    numeroATexto(numero) {
        const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
        const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
        
        if (numero === 0) return 'cero';
        if (numero < 0) return 'menos ' + this.numeroATexto(-numero);
        
        let texto = '';
        const millones = Math.floor(numero / 1000000);
        const miles = Math.floor((numero % 1000000) / 1000);
        const resto = numero % 1000;
        
        if (millones > 0) {
            texto += this.convertirGrupo(millones, unidades, decenas, especiales, centenas) + ' millón' + (millones > 1 ? 'es' : '') + ' ';
        }
        
        if (miles > 0) {
            if (miles === 1) {
                texto += 'mil ';
            } else {
                texto += this.convertirGrupo(miles, unidades, decenas, especiales, centenas) + ' mil ';
            }
        }
        
        if (resto > 0 || texto === '') {
            texto += this.convertirGrupo(resto, unidades, decenas, especiales, centenas);
        }
        
        return texto.trim();
    },
    
    /**
     * Convierte un grupo de 3 dígitos a texto
     */
    convertirGrupo(numero, unidades, decenas, especiales, centenas) {
        if (numero === 0) return '';
        if (numero === 100) return 'cien';
        
        let texto = '';
        const c = Math.floor(numero / 100);
        const d = Math.floor((numero % 100) / 10);
        const u = numero % 10;
        
        if (c > 0) {
            texto += centenas[c] + ' ';
        }
        
        if (d === 1) {
            texto += especiales[u] + ' ';
        } else if (d > 1) {
            texto += decenas[d];
            if (u > 0) {
                texto += ' y ' + unidades[u];
            }
            texto += ' ';
        } else if (u > 0) {
            texto += unidades[u] + ' ';
        }
        
        return texto.trim();
    },

    /**
     * Genera constancia salarial
     * @param {object} empleado - Datos del empleado
     */
    async generarConstanciaSalarial(empleado) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Cargar y agregar logo en la parte superior derecha
        try {
            // Intentar diferentes rutas posibles
            const rutasPosibles = ['img/vete.jpg', './img/vete.jpg', '/img/vete.jpg'];
            let imgData = null;
            let logoWidth = 0;
            let logoHeight = 0;
            
            for (const ruta of rutasPosibles) {
                try {
                    const response = await fetch(ruta);
                    if (response.ok) {
                        const blob = await response.blob();
                        imgData = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        
                        // Obtener dimensiones de la imagen
                        const logoImg = new Image();
                        await new Promise((resolve, reject) => {
                            logoImg.onload = () => {
                                // Tamaño del logo (ajustable)
                                logoWidth = 30; // mm
                                logoHeight = (logoImg.height * logoWidth) / logoImg.width;
                                resolve();
                            };
                            logoImg.onerror = reject;
                            logoImg.src = imgData;
                        });
                        break; // Si se cargó exitosamente, salir del loop
                    }
                } catch (error) {
                    console.warn(`Error al cargar logo desde ${ruta}:`, error);
                    continue; // Intentar siguiente ruta
                }
            }
            
            // Si se cargó exitosamente, agregarlo al PDF
            if (imgData && logoWidth > 0) {
                // Posición: parte superior derecha (margen de 10mm desde el borde derecho, 10mm desde arriba)
                const x = doc.internal.pageSize.getWidth() - logoWidth - 10;
                const y = 10;
                doc.addImage(imgData, 'JPEG', x, y, logoWidth, logoHeight);
                console.log('Logo agregado exitosamente');
            } else {
                console.warn('No se pudo cargar el logo desde ninguna ruta');
            }
        } catch (error) {
            console.warn('Error al cargar logo:', error);
        }

        // Función para formatear moneda como en el documento (¢460 000,00)
        const formatearMonedaConstancia = (monto) => {
            if (monto === null || monto === undefined || isNaN(monto) || monto === 0) {
                return '¢0,00';
            }
            const numero = parseFloat(monto);
            const partes = numero.toFixed(2).split('.');
            let parteEntera = partes[0];
            const parteDecimal = partes[1];
            
            // Agregar espacios cada 3 dígitos desde la derecha
            let parteEnteraFormateada = '';
            let contador = 0;
            for (let i = parteEntera.length - 1; i >= 0; i--) {
                if (contador > 0 && contador % 3 === 0) {
                    parteEnteraFormateada = ' ' + parteEnteraFormateada;
                }
                parteEnteraFormateada = parteEntera[i] + parteEnteraFormateada;
                contador++;
            }
            
            return '¢' + parteEnteraFormateada + ',' + parteDecimal;
        };

        // Función para convertir número a texto en español
        const numeroATexto = (numero) => {
            const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
            const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
            const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
            const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
            
            if (numero === 0) return 'cero';
            if (numero < 0) return 'menos ' + numeroATexto(-numero);
            
            let texto = '';
            const millones = Math.floor(numero / 1000000);
            const miles = Math.floor((numero % 1000000) / 1000);
            const resto = numero % 1000;
            
            if (millones > 0) {
                texto += convertirGrupo(millones, unidades, decenas, especiales, centenas) + ' millón' + (millones > 1 ? 'es' : '') + ' ';
            }
            
            if (miles > 0) {
                if (miles === 1) {
                    texto += 'mil ';
                } else {
                    texto += convertirGrupo(miles, unidades, decenas, especiales, centenas) + ' mil ';
                }
            }
            
            if (resto > 0 || texto === '') {
                texto += convertirGrupo(resto, unidades, decenas, especiales, centenas);
            }
            
            return texto.trim();
        };
        
        const convertirGrupo = (numero, unidades, decenas, especiales, centenas) => {
            if (numero === 0) return '';
            if (numero === 100) return 'cien';
            
            let texto = '';
            const c = Math.floor(numero / 100);
            const d = Math.floor((numero % 100) / 10);
            const u = numero % 10;
            
            if (c > 0) {
                texto += centenas[c] + ' ';
            }
            
            if (d === 1) {
                texto += especiales[u] + ' ';
            } else if (d > 1) {
                texto += decenas[d];
                if (u > 0) {
                    texto += ' y ' + unidades[u];
                }
                texto += ' ';
            } else if (u > 0) {
                texto += unidades[u] + ' ';
            }
            
            return texto.trim();
        };

        // Encabezado
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('CONSTANCIA SALARIAL', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('A QUIEN INTERESE', 105, 28, { align: 'center' });

        // Cuerpo de la constancia - formato exacto solicitado
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        let textoInicio = 45;
        
        // Formatear fecha de ingreso
        const fechaIngreso = empleado.fechaIngreso ? new Date(empleado.fechaIngreso) : new Date();
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const diaIngreso = fechaIngreso.getDate();
        const mesIngreso = meses[fechaIngreso.getMonth()];
        const anioIngreso = fechaIngreso.getFullYear();
        const fechaIngresoFormateada = `${diaIngreso} de ${mesIngreso} de ${anioIngreso}`;
        
        // Obtener fecha actual formateada
        const fechaActual = new Date();
        const diaActual = fechaActual.getDate();
        const mesActual = meses[fechaActual.getMonth()];
        const anioActual = fechaActual.getFullYear();
        const fechaActualFormateada = `${diaActual} de ${mesActual} de ${anioActual}`;
        
        // Preparar datos
        const nombreCompleto = (empleado.nombre || '').trim();
        const nombreSinTitulo = nombreCompleto.replace(/^(Sr\.|Sra\.|Sr\.|Sra\.)\s*/i, '').trim();
        const nombreMayusculas = nombreSinTitulo.toUpperCase();
        const cedulaFormateada = Formatters.formatearCedula(empleado.cedula);
        const puesto = empleado.cargo || 'N/A';
        
        // Calcular salarios
        const salarioBruto = Math.round(empleado.salarioMensual || 0);
        const descuentoCCSS = Math.round(salarioBruto * 0.1067);
        let salarioDespuesCCSS = salarioBruto - descuentoCCSS;
        
        let impuestoRenta = 0;
        if (salarioDespuesCCSS > 922000) {
            const exceso = salarioDespuesCCSS - 922000;
            if (exceso <= 430000) {
                impuestoRenta = Math.round(exceso * 0.10);
            } else if (exceso <= 1451000) {
                impuestoRenta = Math.round(430000 * 0.10 + (exceso - 430000) * 0.15);
            } else if (exceso <= 3823000) {
                impuestoRenta = Math.round(430000 * 0.10 + 1021000 * 0.15 + (exceso - 1451000) * 0.20);
            } else {
                impuestoRenta = Math.round(430000 * 0.10 + 1021000 * 0.15 + 2372000 * 0.20 + (exceso - 3823000) * 0.25);
            }
            const creditosHijos = Math.min(empleado.hijos || 0, 4) * 1720;
            const creditoConyuge = (empleado.estadoCivil === 'casado') ? 2600 : 0;
            const totalCreditos = creditosHijos + creditoConyuge;
            impuestoRenta = Math.max(0, impuestoRenta - totalCreditos);
        }
        
        const salarioNeto = Math.round(salarioDespuesCCSS - impuestoRenta);
        
        // Convertir salarios a texto
        const salarioBrutoTexto = numeroATexto(salarioBruto) + ' colones';
        const salarioNetoTexto = numeroATexto(salarioNeto) + ' colones';
        
        // Texto principal - formato exacto solicitado
        const textoPrincipal = `Por medio de este documento hacemos constar que el (la) Sr. (Sra.) ${nombreMayusculas}, documento de identidad número ${cedulaFormateada}, trabaja para nuestra empresa desempeñándose en la posición de ${puesto} desde el ${fechaIngresoFormateada} y hasta la actualidad.`;
        
        // Dividir texto largo en líneas
        const lineas = doc.splitTextToSize(textoPrincipal, 170);
        lineas.forEach((linea, index) => {
            doc.text(linea, 20, textoInicio + (index * 7));
        });
        textoInicio += lineas.length * 7 + 5;
        
        // Texto de salarios
        const textoSalarios = `Percibiendo en el último mes un salario mensual bruto de ${formatearMonedaConstancia(salarioBruto)} (${salarioBrutoTexto}) y un salario mensual neto de ${formatearMonedaConstancia(salarioNeto)} (${salarioNetoTexto}).`;
        const lineasSalarios = doc.splitTextToSize(textoSalarios, 170);
        lineasSalarios.forEach((linea, index) => {
            doc.text(linea, 20, textoInicio + (index * 7));
        });
        textoInicio += lineasSalarios.length * 7 + 5;
        
        // Fecha de emisión
        doc.text(`La presente se extiende a solicitud de la persona interesada el día ${fechaActualFormateada}.`, 20, textoInicio);
        textoInicio += 10;
        
        // Información de contacto
        const textoContacto = `Si usted tiene alguna pregunta o inquietud, o si desea validar esta información; por favor contacte a nuestro departamento de Recursos Humanos enviando un correo electrónico a rrhh@vetsanmartin.com, incluyendo la carta que desea validar.`;
        const lineasContacto = doc.splitTextToSize(textoContacto, 170);
        lineasContacto.forEach((linea, index) => {
            doc.text(linea, 20, textoInicio + (index * 7));
        });
        textoInicio += lineasContacto.length * 7 + 10;
        
        // Firma
        doc.text('Atentamente,', 20, textoInicio);
        textoInicio += 5;
        
        // Línea de firma
        doc.line(20, textoInicio + 10, 90, textoInicio + 10);
        
        // Nombre y cargo
        doc.setFont(undefined, 'bold');
        doc.text('Dr. Randall Azofeifa', 55, textoInicio + 20, { align: 'center' });
        doc.setFont(undefined, 'normal');
        doc.text('Director General', 55, textoInicio + 26, { align: 'center' });

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

