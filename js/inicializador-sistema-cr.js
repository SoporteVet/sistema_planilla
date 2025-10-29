// ============================================
// INICIALIZACIÓN DEL SISTEMA COSTA RICA
// Detecta y ejecuta migración automática si es necesario
// ============================================

import MigracionDatosCR from './js/utils/migracion-datos-cr.js';

class InicializadorSistemaCR {
    constructor() {
        this.migracion = new MigracionDatosCR();
        this.migracionCompletada = false;
    }

    /**
     * Inicializa el sistema y ejecuta migración si es necesario
     */
    async inicializar() {
        console.log('🚀 Inicializando Sistema de Planillas Costa Rica...');
        
        try {
            // Verificar si se necesita migración
            const necesitaMigracion = await this.migracion.necesitaMigracion();
            
            if (necesitaMigracion) {
                console.log('🔄 Se detectaron datos que necesitan migración');
                await this.ejecutarMigracionAutomatica();
            } else {
                console.log('✅ Los datos ya están actualizados para el sistema costarricense');
                this.migracionCompletada = true;
            }

            // Mostrar mensaje de bienvenida
            this.mostrarMensajeBienvenida();
            
        } catch (error) {
            console.error('❌ Error durante la inicialización:', error);
            this.mostrarErrorInicializacion(error);
        }
    }

    /**
     * Ejecuta la migración automática sin mostrar modal
     */
    async ejecutarMigracionAutomatica() {
        console.log('🔄 Ejecutando migración automática...');
        
        try {
            const resultado = await this.migracion.migrarEmpleadosExistentes();
            
            console.log('✅ Migración completada exitosamente:', resultado);
            this.migracionCompletada = true;
            
            // Mostrar notificación de migración exitosa
            this.mostrarNotificacionMigracion(resultado);
            
        } catch (error) {
            console.error('❌ Error durante la migración:', error);
            throw error;
        }
    }

    /**
     * Muestra notificación de migración exitosa
     */
    mostrarNotificacionMigracion(resultado) {
        // Crear notificación temporal
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion-migracion';
        notificacion.innerHTML = `
            <div class="notificacion-contenido">
                <div class="notificacion-icono">✅</div>
                <div class="notificacion-texto">
                    <h4>Migración Completada</h4>
                    <p>Se actualizaron ${resultado.actualizados} empleados al sistema costarricense</p>
                </div>
                <button class="notificacion-cerrar">&times;</button>
            </div>
        `;

        // Estilos para la notificación
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notificacion);

        // Event listener para cerrar
        notificacion.querySelector('.notificacion-cerrar').addEventListener('click', () => {
            notificacion.remove();
        });

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (document.body.contains(notificacion)) {
                notificacion.remove();
            }
        }, 5000);
    }

    /**
     * Muestra mensaje de bienvenida al sistema
     */
    mostrarMensajeBienvenida() {
        const mensaje = document.createElement('div');
        mensaje.className = 'mensaje-bienvenida-cr';
        mensaje.innerHTML = `
            <div class="mensaje-contenido">
                <div class="mensaje-icono">🇨🇷</div>
                <div class="mensaje-texto">
                    <h3>Sistema de Planillas Costa Rica</h3>
                    <p>Ahora con legislación laboral costarricense completa</p>
                    <ul>
                        <li>✅ 7 tipos de jornadas laborales</li>
                        <li>✅ Cálculos según normativa CR</li>
                        <li>✅ Validaciones legales automáticas</li>
                        <li>✅ Descuentos obligatorios (CCSS + Banco Popular)</li>
                    </ul>
                </div>
                <button class="mensaje-cerrar">&times;</button>
            </div>
        `;

        // Estilos para el mensaje
        mensaje.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #3498db;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 10001;
            max-width: 500px;
            animation: fadeInScale 0.4s ease-out;
        `;

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(mensaje);

        // Event listeners
        const cerrar = () => {
            overlay.remove();
            mensaje.remove();
        };

        mensaje.querySelector('.mensaje-cerrar').addEventListener('click', cerrar);
        overlay.addEventListener('click', cerrar);

        // Auto-cerrar después de 8 segundos
        setTimeout(cerrar, 8000);
    }

    /**
     * Muestra error de inicialización
     */
    mostrarErrorInicializacion(error) {
        console.error('Error de inicialización:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-inicializacion';
        errorDiv.innerHTML = `
            <div class="error-contenido">
                <div class="error-icono">❌</div>
                <div class="error-texto">
                    <h4>Error de Inicialización</h4>
                    <p>No se pudo inicializar el sistema costarricense</p>
                    <small>Error: ${error.message}</small>
                </div>
            </div>
        `;

        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
        `;

        document.body.appendChild(errorDiv);

        // Auto-cerrar después de 10 segundos
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                errorDiv.remove();
            }
        }, 10000);
    }

    /**
     * Verifica si la migración fue completada
     */
    esMigracionCompletada() {
        return this.migracionCompletada;
    }

    /**
     * Obtiene el reporte de migración
     */
    obtenerReporteMigracion() {
        return this.migracion.generarReporteMigracion();
    }
}

// Crear instancia global
const inicializadorCR = new InicializadorSistemaCR();

// Función global para inicializar
window.inicializarSistemaCR = async () => {
    await inicializadorCR.inicializar();
};

// Auto-inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', async () => {
    // Esperar un poco para que se carguen todos los módulos
    setTimeout(async () => {
        try {
            await inicializadorCR.inicializar();
        } catch (error) {
            console.error('Error en auto-inicialización:', error);
        }
    }, 1000);
});

// Exportar para uso en otros módulos
export default InicializadorSistemaCR;
export { inicializadorCR };






