/**
 * Ejemplos de uso del Sistema de Notificaciones
 * Este archivo contiene funciones de ayuda y ejemplos de cómo usar las notificaciones
 */

// ==================================================
// EJEMPLOS DE NOTIFICACIONES (TOAST)
// ==================================================

/**
 * Notificación de éxito
 * Usar cuando una operación se completa correctamente
 */
function showSuccessNotification(message) {
    notify.success(message);
}

/**
 * Notificación de error
 * Usar cuando ocurre un error
 */
function showErrorNotification(message) {
    notify.error(message);
}

/**
 * Notificación de advertencia
 * Usar para alertar al usuario sobre algo importante
 */
function showWarningNotification(message) {
    notify.warning(message);
}

/**
 * Notificación de información
 * Usar para mensajes informativos generales
 */
function showInfoNotification(message) {
    notify.info(message);
}

// ==================================================
// EJEMPLOS DE DIÁLOGOS DE CONFIRMACIÓN
// ==================================================

/**
 * Confirmar antes de eliminar
 * Retorna una promesa que resuelve true si el usuario confirma
 */
async function confirmarEliminacion(nombreItem) {
    const confirmado = await confirmDialog.confirmDelete(nombreItem);
    return confirmado;
}

/**
 * Confirmar una acción genérica
 */
async function confirmarAccion(mensaje, titulo = '¿Continuar?') {
    const confirmado = await confirmDialog.confirmAction(mensaje, titulo);
    return confirmado;
}

/**
 * Diálogo de confirmación personalizado
 */
async function confirmarPersonalizado(mensaje, titulo, tipo, opciones) {
    const confirmado = await confirmDialog.show(mensaje, titulo, tipo, opciones);
    return confirmado;
}

// ==================================================
// EJEMPLOS PRÁCTICOS DE USO
// ==================================================

/**
 * Ejemplo: Guardar empleado
 */
async function ejemploGuardarEmpleado() {
    try {
        loadingOverlay.show();
        
        // Simulación de guardado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        loadingOverlay.hide();
        notify.success('Empleado guardado exitosamente');
    } catch (error) {
        loadingOverlay.hide();
        notify.error('Error al guardar el empleado: ' + error.message);
    }
}

/**
 * Ejemplo: Eliminar empleado con confirmación
 */
async function ejemploEliminarEmpleado(nombre) {
    const confirmado = await confirmDialog.confirmDelete(`el empleado ${nombre}`);
    
    if (confirmado) {
        try {
            loadingOverlay.show();
            
            // Simulación de eliminación
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            loadingOverlay.hide();
            notify.success(`Empleado ${nombre} eliminado correctamente`);
        } catch (error) {
            loadingOverlay.hide();
            notify.error('Error al eliminar el empleado: ' + error.message);
        }
    }
}

/**
 * Ejemplo: Validación de formulario
 */
function ejemploValidarFormulario() {
    const nombre = document.getElementById('empleadoNombre')?.value;
    
    if (!nombre || nombre.trim() === '') {
        notify.warning('Por favor, complete el campo de nombre');
        return false;
    }
    
    notify.info('Formulario validado correctamente');
    return true;
}

/**
 * Ejemplo: Operación múltiple
 */
async function ejemploOperacionMultiple() {
    const confirmado = await confirmDialog.confirmAction(
        '¿Desea generar la planilla para todos los empleados activos?',
        'Generar Planilla'
    );
    
    if (confirmado) {
        loadingOverlay.show();
        
        try {
            // Simulación de procesamiento
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            loadingOverlay.hide();
            notify.success('Planilla generada correctamente para 15 empleados');
        } catch (error) {
            loadingOverlay.hide();
            notify.error('Error al generar la planilla: ' + error.message);
        }
    }
}

/**
 * Ejemplo: Exportar datos
 */
async function ejemploExportarDatos() {
    try {
        notify.info('Preparando archivo para exportar...');
        
        // Simulación de exportación
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        notify.success('Archivo exportado correctamente');
    } catch (error) {
        notify.error('Error al exportar los datos');
    }
}

/**
 * Ejemplo: Importar datos con validación
 */
async function ejemploImportarDatos(archivo) {
    const confirmado = await confirmDialog.show(
        'Al importar este archivo, se sobrescribirán los datos actuales. ¿Desea continuar?',
        'Importar Datos',
        'warning',
        {
            confirmText: 'Importar',
            cancelText: 'Cancelar',
            confirmClass: 'btn-warning'
        }
    );
    
    if (confirmado) {
        try {
            loadingOverlay.show();
            
            // Simulación de importación
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            loadingOverlay.hide();
            notify.success('Datos importados correctamente');
        } catch (error) {
            loadingOverlay.hide();
            notify.error('Error al importar los datos: ' + error.message);
        }
    }
}

/**
 * Ejemplo: Múltiples notificaciones secuenciales
 */
async function ejemploMultiplesNotificaciones() {
    notify.info('Iniciando proceso...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    notify.info('Verificando datos...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    notify.info('Procesando información...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    notify.success('¡Proceso completado!');
}

/**
 * Ejemplo: Notificación persistente (no se cierra automáticamente)
 */
function ejemploNotificacionPersistente() {
    notify.show('Esta notificación permanecerá hasta que la cierres manualmente', 'info', 0);
}

/**
 * Ejemplo: Limpiar todas las notificaciones
 */
function ejemploLimpiarNotificaciones() {
    notify.clear();
    notify.info('Todas las notificaciones han sido limpiadas');
}

// ==================================================
// INTEGRACIONES COMUNES
// ==================================================

/**
 * Wrapper para operaciones CRUD con notificaciones automáticas
 */
async function ejecutarConNotificaciones(operacion, mensajeExito, mensajeError) {
    try {
        loadingOverlay.show();
        await operacion();
        loadingOverlay.hide();
        notify.success(mensajeExito);
        return true;
    } catch (error) {
        loadingOverlay.hide();
        notify.error(mensajeError + (error.message ? ': ' + error.message : ''));
        return false;
    }
}

/**
 * Wrapper para operaciones con confirmación
 */
async function ejecutarConConfirmacion(mensaje, operacion, mensajeExito) {
    const confirmado = await confirmDialog.confirmAction(mensaje);
    
    if (confirmado) {
        return await ejecutarConNotificaciones(
            operacion,
            mensajeExito,
            'Error al ejecutar la operación'
        );
    }
    
    return false;
}

// Exportar funciones de ayuda
window.notificationHelpers = {
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
    confirmarEliminacion,
    confirmarAccion,
    confirmarPersonalizado,
    ejecutarConNotificaciones,
    ejecutarConConfirmacion
};

console.log('✨ Sistema de notificaciones cargado correctamente');
console.log('📝 Usa notify.success(), notify.error(), notify.warning(), notify.info()');
console.log('❓ Usa confirmDialog.confirmDelete() o confirmDialog.confirmAction()');
console.log('⏳ Usa loadingOverlay.show() y loadingOverlay.hide()');

