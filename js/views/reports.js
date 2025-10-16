import { storage } from '../storage/index.js';
import { exportTableToXLSX, exportPayrollToPDF } from '../utils/export.js';

function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(num);
}

// Función para generar constancia salarial profesional
async function generarConstanciaSalarial(empleado) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { 
    alert('jsPDF no está cargado'); 
    return; 
  }

  // Obtener fecha actual
  const fechaActual = new Date();
  const dia = fechaActual.getDate();
  const mes = fechaActual.toLocaleDateString('es-ES', { month: 'long' });
  const año = fechaActual.getFullYear();
  const fechaFormateada = `${dia} de ${mes} de ${año}`;
  
  // Calcular salarios
  const salarioHora = parseFloat(empleado.salarioHora) || 0;
  const horasJornada = getHorasJornada(empleado.jornada);
  const salarioDiario = salarioHora * horasJornada;
  const salarioMensualBruto = salarioDiario * 22; // 22 días laborales promedio
  
  // Calcular salario neto (aproximado con deducciones básicas)
  const ccss = salarioMensualBruto * 0.09; // 9% CCSS
  const impuestoRenta = calcularImpuestoRenta(salarioMensualBruto);
  const salarioMensualNeto = salarioMensualBruto - ccss - impuestoRenta;
  
  // Función para obtener horas de jornada
  function getHorasJornada(jornada) {
    switch(jornada) {
      case 'Tiempo completo': return 8;
      case 'Medio tiempo': return 4;
      case 'Tiempo parcial': return 6;
      default: return 8;
    }
  }
  
  // Función para calcular impuesto de renta (simplificado)
  function calcularImpuestoRenta(salarioBruto) {
    if (salarioBruto <= 500000) return 0;
    if (salarioBruto <= 750000) return (salarioBruto - 500000) * 0.10;
    if (salarioBruto <= 1000000) return 25000 + (salarioBruto - 750000) * 0.15;
    return 62500 + (salarioBruto - 1000000) * 0.20;
  }
  
  // Función para convertir números a texto
  function numeroATexto(numero) {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    
    if (numero === 0) return 'cero';
    if (numero < 10) return unidades[numero];
    if (numero < 20) return especiales[numero - 10];
    if (numero < 100) {
      const decena = Math.floor(numero / 10);
      const unidad = numero % 10;
      return decenas[decena] + (unidad > 0 ? ' y ' + unidades[unidad] : '');
    }
    
    // Para números más grandes, usar una versión simplificada
    return numero.toString();
  }
  
  // Función para formatear moneda
  function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }
  
  // Función para convertir salario a texto
  function salarioATexto(salario) {
    const parteEntera = Math.floor(salario);
    const parteDecimal = Math.round((salario - parteEntera) * 100);
    
    let texto = '';
    
    if (parteEntera >= 1000000) {
      const millones = Math.floor(parteEntera / 1000000);
      texto += numeroATexto(millones) + (millones === 1 ? ' millón' : ' millones');
      const resto = parteEntera % 1000000;
      if (resto > 0) {
        texto += ' ' + numeroATexto(resto) + ' colones';
      }
    } else {
      texto += numeroATexto(parteEntera) + ' colones';
    }
    
    if (parteDecimal > 0) {
      texto += ' con ' + numeroATexto(parteDecimal) + ' céntimos';
    }
    
    return texto;
  }
  
  // Crear elemento HTML temporal para la constancia
  const constanciaHTML = document.createElement('div');
  constanciaHTML.id = 'constancia-temp';
  constanciaHTML.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 210mm;
    height: 297mm;
    background: white;
    font-family: Arial, sans-serif;
    padding: 20mm;
    box-sizing: border-box;
    z-index: -1;
  `;
  
  constanciaHTML.innerHTML = `
    <style>
      #constancia-temp {
        font-family: Arial, sans-serif;
        line-height: 1.4;
        color: #333;
      }
      
      #constancia-temp .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        border-bottom: 2px solid #007bff;
        padding-bottom: 15px;
      }
      
      #constancia-temp .logo {
        width: 80px;
        height: 80px;
        margin-right: 20px;
      }
      
      #constancia-temp .logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      
      #constancia-temp .company-info {
        flex: 1;
        text-align: right;
      }
      
      #constancia-temp .company-info h1 {
        margin: 0;
        font-size: 18px;
        color: #007bff;
        font-weight: bold;
      }
      
      #constancia-temp .company-info p {
        margin: 2px 0;
        font-size: 12px;
        color: #666;
      }
      
      #constancia-temp .title {
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        margin: 30px 0 20px 0;
        color: #333;
      }
      
      #constancia-temp .subtitle {
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 30px;
        color: #333;
      }
      
      #constancia-temp .content {
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 20px;
        text-align: justify;
      }
      
      #constancia-temp .date {
        font-size: 14px;
        margin: 20px 0;
      }
      
      #constancia-temp .contact {
        font-size: 14px;
        margin: 20px 0;
      }
      
      #constancia-temp .signature {
        font-size: 14px;
        margin: 30px 0;
      }
      
      #constancia-temp .footer {
        position: absolute;
        bottom: 20mm;
        left: 20mm;
        right: 20mm;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }
      
      #constancia-temp .footer-logo {
        color: #007bff;
        font-weight: bold;
        margin-top: 10px;
      }
    </style>
    
    <div class="header">
      <div class="logo">
        <img src="images/logo.jpg" alt="Logo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23007bff%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2210%22%3ELogo%3C/text%3E%3C/svg%3E'">
      </div>
      <div class="company-info">
        <h1>Veterinaria San Martín de Porres</h1>
        <p>San Rafael Abajo de Desamparados</p>
        <p>Tel: 4000-1365 | WhatsApp: 8839-2214</p>
      </div>
    </div>
    
    <div class="title">CONSTANCIA SALARIAL</div>
    <div class="subtitle">A QUIEN INTERESE</div>
    
    <div class="content">
      Por medio de este documento hacemos constar que el (la) Sr. (Sra.) <strong>${empleado.nombre}</strong> con documento de identidad número <strong>${empleado.cedula}</strong>, labora en nuestra empresa en el puesto de <strong>${empleado.puesto || 'Empleado'}</strong> desde el <strong>${empleado.fechaIngreso || 'fecha de ingreso'}</strong> y hasta la actualidad. Percibiendo en el último mes un salario mensual bruto de <strong>${formatearMoneda(salarioMensualBruto)}</strong> (${salarioATexto(salarioMensualBruto)}) y salario mensual neto de <strong>${formatearMoneda(salarioMensualNeto)}</strong> (${salarioATexto(salarioMensualNeto)}).
    </div>
    
    <div class="date">
      La presente se extiende a solicitud de la persona interesada el día <strong>${fechaFormateada}</strong>.
    </div>
    
    <div class="contact">
      Para cualquier consulta o validación, puede contactar al departamento de Recursos Humanos<br>
      correo electrónico a <strong>rrhh@vetsanmartin.com</strong>
    </div>
    
    <div class="signature">
      Atentamente,
    </div>
    
    <div class="footer">
      <div>Veterinaria San Martín de Porres</div>
      <div>San Rafael Abajo de Desamparados</div>
      <div>Tel: 4000-1365 | WhatsApp: 8839-2214</div>
      <div>rrhh@vetsanmartin.com</div>
      <div class="footer-logo">Veterinaria San Martín de Porres</div>
    </div>
  `;
  
  document.body.appendChild(constanciaHTML);
  
  // Generar PDF usando html2canvas
  setTimeout(() => {
    html2canvas(constanciaHTML, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const y = 5;
      
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
      
      const fileName = `Constancia_Salarial_${empleado.nombre.replace(/\s/g, '_')}.pdf`;
      pdf.save(fileName);
      
      document.body.removeChild(constanciaHTML);
    }).catch(error => {
      console.error('Error al generar la constancia:', error);
      alert('Error al generar la constancia: ' + error.message);
      document.body.removeChild(constanciaHTML);
    });
  }, 100);
}

export async function renderReportsView(root, { showToast }) {
  try {
    root.innerHTML = `
      <div class="panel-title">Reportes y Constancias</div>
      <div class="toolbar">
        <select id="emp"><option value="">Seleccione empleado</option></select>
        <button id="constancia" class="btn">Constancia salarial PDF</button>
        <div class="spacer"></div>
        <button id="export-excel" class="btn secondary">Exportar tabla (Excel)</button>
      </div>
      <div class="card">
        <table class="table" id="emp-table">
          <thead>
            <tr><th>Empleado</th><th>Cédula</th><th>Puesto</th><th>Jornada</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    const empSel = root.querySelector('#emp');
    const tbody = root.querySelector('#emp-table tbody');

    // Cargar empleados
    const employees = storage.listEmployees();
    console.log('Empleados encontrados:', employees); // Debug
    
    // Verificar que hay empleados
    if (!employees || employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">No hay empleados registrados</td></tr>';
      showToast('No hay empleados registrados. Ve a "Empleados" y agrega algunos empleados primero.');
      return;
    }

    // Llenar dropdown y tabla
    empSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    tbody.innerHTML = employees.map(e => `
      <tr><td>${e.nombre}</td><td>${e.cedula}</td><td>${e.puesto || ''}</td><td>${e.jornada}</td></tr>
    `).join('');

    // Event listener para exportar Excel
    root.querySelector('#export-excel').addEventListener('click', () => {
      const table = root.querySelector('#emp-table');
      exportTableToXLSX(table, 'empleados.xlsx');
    });

    // Event listener para generar constancia
    root.querySelector('#constancia').addEventListener('click', () => {
      const id = empSel.value;
      if (!id) { 
        showToast('Seleccione un empleado de la lista'); 
        return; 
      }
      
      const empleado = employees.find(x => x.id === id);
      if (!empleado) {
        showToast('Empleado no encontrado');
        return;
      }
      
      // Llamar a la función de generar constancia
      generarConstanciaSalarial(empleado);
    });

  } catch (error) {
    console.error('Error al cargar la vista de reportes:', error);
    showToast('Error al cargar la vista de reportes');
    root.innerHTML = '<div class="panel-title">Error al cargar reportes</div>';
  }
}



