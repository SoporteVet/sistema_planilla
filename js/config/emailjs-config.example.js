// Configuración de EmailJS - ARCHIVO DE EJEMPLO
// Copia este archivo como 'emailjs-config.js' y reemplaza los valores con tus credenciales

const EMAILJS_CONFIG = {
    // Tu User ID de EmailJS (obténlo de https://dashboard.emailjs.com/admin/integration)
    USER_ID: 'user_xxxxxxxxxxxxx',
    
    // ID del servicio de email (obténlo de https://dashboard.emailjs.com/admin)
    SERVICE_ID: 'service_xxxxxxxxxxxxx',
    
    // ID de la plantilla de email (obténlo de https://dashboard.emailjs.com/admin/templates)
    TEMPLATE_ID: 'template_xxxxxxxxxxxxx',
    
    // URL base para descarga de PDFs (puede ser tu servidor o un servicio de almacenamiento)
    PDF_DOWNLOAD_BASE_URL: window.location.origin
};

// Inicializar EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_CONFIG.USER_ID);
}

// Función para verificar si EmailJS está configurado
function isEmailJSConfigured() {
    return EMAILJS_CONFIG.USER_ID !== 'user_xxxxxxxxxxxxx' && 
           EMAILJS_CONFIG.SERVICE_ID !== 'service_xxxxxxxxxxxxx' && 
           EMAILJS_CONFIG.TEMPLATE_ID !== 'template_xxxxxxxxxxxxx';
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
    // Convertir el blob a base64
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function() {
            const base64 = reader.result.split(',')[1];
            // En un entorno real, aquí subirías el PDF a un servidor y retornarías la URL
            // Por ahora, retornamos un enlace de datos que funciona en algunos clientes de email
            resolve(`data:application/pdf;base64,${base64}`);
        };
        reader.readAsDataURL(pdfBlob);
    });
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
window.uploadPDFToStorage = uploadPDFToStorage;
