/**
 * Archivo de prueba para verificar que las notificaciones funcionan correctamente
 * Este archivo se puede eliminar después de verificar que todo funciona
 */

// Función de prueba para verificar las notificaciones
function testNotifications() {
    console.log('🧪 Probando sistema de notificaciones...');
    
    // Probar notificación de éxito
    setTimeout(() => {
        notify.success('Notificación de éxito funcionando correctamente');
    }, 1000);
    
    // Probar notificación de error
    setTimeout(() => {
        notify.error('Notificación de error funcionando correctamente');
    }, 2000);
    
    // Probar notificación de advertencia
    setTimeout(() => {
        notify.warning('Notificación de advertencia funcionando correctamente');
    }, 3000);
    
    // Probar notificación de información
    setTimeout(() => {
        notify.info('Notificación de información funcionando correctamente');
    }, 4000);
    
    // Probar diálogo de confirmación
    setTimeout(async () => {
        const confirmado = await confirmDialog.confirmAction(
            '¿Esta es una prueba del sistema de confirmación?',
            'Prueba de Confirmación'
        );
        
        if (confirmado) {
            notify.success('¡Confirmación funcionando correctamente!');
        } else {
            notify.info('Confirmación cancelada correctamente');
        }
    }, 5000);
    
    console.log('✅ Pruebas de notificaciones iniciadas');
}

// Función para probar el loading overlay
function testLoadingOverlay() {
    console.log('🔄 Probando loading overlay...');
    
    loadingOverlay.show();
    
    setTimeout(() => {
        loadingOverlay.hide();
        notify.success('Loading overlay funcionando correctamente');
    }, 3000);
}

// Ejecutar pruebas cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema de notificaciones cargado correctamente');
    console.log('📝 Para probar las notificaciones, ejecuta: testNotifications()');
    console.log('⏳ Para probar el loading overlay, ejecuta: testLoadingOverlay()');
    
    // Verificar que los objetos están disponibles
    if (typeof notify !== 'undefined') {
        console.log('✅ notify disponible');
    } else {
        console.error('❌ notify no está disponible');
    }
    
    if (typeof confirmDialog !== 'undefined') {
        console.log('✅ confirmDialog disponible');
    } else {
        console.error('❌ confirmDialog no está disponible');
    }
    
    if (typeof loadingOverlay !== 'undefined') {
        console.log('✅ loadingOverlay disponible');
    } else {
        console.error('❌ loadingOverlay no está disponible');
    }
});

// Hacer las funciones disponibles globalmente para pruebas
window.testNotifications = testNotifications;
window.testLoadingOverlay = testLoadingOverlay;
