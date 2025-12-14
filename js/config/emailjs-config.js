// Configuración de EmailJS
// Reemplaza estos valores con tus credenciales de EmailJS
const EMAILJS_CONFIG = {
    // Tu User ID de EmailJS (Public Key)
    USER_ID: 'ld-bX87wyBkLDCYoc',
    
    // ID del servicio de email (Service ID)
    SERVICE_ID: 'service_aupbtwq',
    
    // ID de la plantilla de email para comprobantes (Template ID)
    TEMPLATE_ID: 'template_t0p0r4w',
    
    // ID de la plantilla de email para cumpleaños (Template ID)
    // IMPORTANTE: Crea una nueva plantilla en EmailJS y reemplaza este valor
    TEMPLATE_ID_CUMPLEANOS: 'template_qag1084',
    
    // URL base para descarga de PDFs (puede ser tu servidor o un servicio de almacenamiento)
    PDF_DOWNLOAD_BASE_URL: window.location.origin
};

// Inicializar EmailJS cuando esté disponible
function initializeEmailJS() {
    if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.USER_ID) {
        try {
            emailjs.init(EMAILJS_CONFIG.USER_ID);
            console.log('EmailJS inicializado correctamente');
            return true;
        } catch (error) {
            console.error('Error inicializando EmailJS:', error);
            return false;
        }
    }
    return false;
}

// Intentar inicializar inmediatamente
if (typeof emailjs !== 'undefined') {
    initializeEmailJS();
}

// También intentar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeEmailJS, 1000);
});

// Función para verificar si EmailJS está configurado
function isEmailJSConfigured() {
    return EMAILJS_CONFIG.USER_ID !== 'user_xxxxxxxxxxxxx' && 
           EMAILJS_CONFIG.SERVICE_ID !== 'service_xxxxxxxxxxxxx' && 
           EMAILJS_CONFIG.TEMPLATE_ID !== 'template_xxxxxxxxxxxxx' &&
           EMAILJS_CONFIG.USER_ID && 
           EMAILJS_CONFIG.SERVICE_ID && 
           EMAILJS_CONFIG.TEMPLATE_ID &&
           typeof emailjs !== 'undefined';
}

// Función para generar un enlace de descarga temporal del PDF
function generatePDFDownloadLink(pdfBlob, fileName) {
    // Crear un objeto URL temporal para el blob
    const url = URL.createObjectURL(pdfBlob);
    
    // Crear un enlace de descarga temporal
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Simular click para descargar
    link.click();
    
    // Limpiar después de un tiempo
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 1000);
    
    // Para EmailJS, retornamos un enlace que funcione en el email
    // En un entorno de producción, esto debería ser un enlace a un servidor
    return `data:application/pdf;base64,${btoa(String.fromCharCode(...new Uint8Array(pdfBlob)))}`;
}

// Función alternativa para generar un enlace de descarga que funcione en emails
function generateEmailDownloadLink(pdfBlob, fileName) {
    // Para evitar el error 413, no enviamos el PDF completo
    // En su lugar, retornamos un mensaje informativo
    return Promise.resolve('El comprobante se descargará automáticamente. Si no se descarga, contacte al departamento de recursos humanos.');
}

// Función para crear un PDF más pequeño para envío por email
function createSmallPDF(empleado, calculos, planilla) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Configurar fuente
    pdf.setFont('helvetica');
    
    // Título
    pdf.setFontSize(16);
    pdf.text('COMPROBANTE DE PAGO', 20, 20);
    
    // Línea separadora
    pdf.line(20, 25, 190, 25);
    
    // Información del empleado
    pdf.setFontSize(12);
    pdf.text(`Empleado: ${empleado.nombre}`, 20, 35);
    pdf.text(`Cédula: ${empleado.cedula}`, 20, 42);
    pdf.text(`Período: ${planilla.periodo}`, 20, 49);
    
    // Resumen de pago
    pdf.text('RESUMEN DE PAGO:', 20, 65);
    pdf.text(`Salario Base: ₡ ${calculos.salarioBase || 0}`, 20, 75);
    pdf.text(`Horas Extras: ₡ ${calculos.montoHorasExtra || 0}`, 20, 82);
    pdf.text(`Bonificaciones: ₡ ${calculos.bonificaciones || 0}`, 20, 89);
    pdf.text(`CCSS: ₡ ${calculos.ccss || 0}`, 20, 96);
    pdf.text(`Deducciones: ₡ ${calculos.rebajos || 0}`, 20, 103);
    
    // Línea separadora
    pdf.line(20, 110, 190, 110);
    
    // Total
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`SALARIO NETO: ₡ ${calculos.salarioNeto || 0}`, 20, 120);
    
    // Nota
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Este es un resumen. El comprobante completo se enviará por separado.', 20, 140);
    
    return pdf;
}

// Función para subir PDF a un servicio de almacenamiento temporal (opcional)
// Esta función puede ser implementada si quieres subir el PDF a un servidor
async function uploadPDFToStorage(pdfBlob, fileName) {
    // Aquí puedes implementar la lógica para subir el PDF a tu servidor
    // o a un servicio como Firebase Storage, AWS S3, etc.
    // Por ahora, retornamos null para usar el método de descarga directa
    return null;
}

// Exportar configuración
window.EMAILJS_CONFIG = EMAILJS_CONFIG;
window.isEmailJSConfigured = isEmailJSConfigured;
window.generatePDFDownloadLink = generatePDFDownloadLink;
window.generateEmailDownloadLink = generateEmailDownloadLink;
window.createSmallPDF = createSmallPDF;
window.uploadPDFToStorage = uploadPDFToStorage;




