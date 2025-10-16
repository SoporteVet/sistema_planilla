/**
 * Sistema de Notificaciones Personalizadas
 * Reemplaza los alerts y confirms del navegador con versiones modernas y estilizadas
 */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Crear contenedor si no existe
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    /**
     * Muestra una notificación
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duración en ms (0 = permanente)
     */
    show(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const titles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };

        notification.innerHTML = `
            <i class="${icons[type]} notification-icon"></i>
            <div class="notification-content">
                <div class="notification-title">${titles[type]}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(notification);

        // Agregar evento de cierre
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hide(notification);
        });

        // Auto-cerrar si tiene duración
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Oculta una notificación
     */
    hide(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Muestra una notificación de éxito
     */
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Muestra una notificación de error
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Muestra una notificación de advertencia
     */
    warning(message, duration = 4500) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Muestra una notificación de información
     */
    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Limpia todas las notificaciones
     */
    clear() {
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            this.hide(notification);
        });
    }
}

/**
 * Modal de Confirmación Personalizado
 */
class ConfirmDialog {
    constructor() {
        this.modal = null;
        this.resolve = null;
        this.init();
    }

    init() {
        // Crear modal de confirmación si no existe
        if (!document.getElementById('custom-confirm-modal')) {
            this.modal = document.createElement('div');
            this.modal.id = 'custom-confirm-modal';
            this.modal.className = 'confirm-modal';
            document.body.appendChild(this.modal);
        } else {
            this.modal = document.getElementById('custom-confirm-modal');
        }
    }

    /**
     * Muestra un diálogo de confirmación
     * @param {string} message - Mensaje a mostrar
     * @param {string} title - Título del diálogo
     * @param {string} type - Tipo: 'warning', 'danger', 'info'
     * @param {object} options - Opciones adicionales
     * @returns {Promise<boolean>} - true si confirma, false si cancela
     */
    show(message, title = '¿Está seguro?', type = 'warning', options = {}) {
        return new Promise((resolve) => {
            this.resolve = resolve;

            const icons = {
                warning: 'fas fa-exclamation-triangle',
                danger: 'fas fa-exclamation-circle',
                info: 'fas fa-info-circle'
            };

            const confirmText = options.confirmText || 'Confirmar';
            const cancelText = options.cancelText || 'Cancelar';
            const confirmClass = options.confirmClass || 'btn-danger';

            this.modal.innerHTML = `
                <div class="confirm-modal-content">
                    <div class="confirm-modal-header ${type}">
                        <i class="${icons[type]} confirm-modal-icon"></i>
                        <h3 class="confirm-modal-title">${title}</h3>
                    </div>
                    <div class="confirm-modal-body">
                        <p class="confirm-modal-message">${message}</p>
                    </div>
                    <div class="confirm-modal-footer">
                        <button class="btn btn-secondary confirm-cancel">
                            <i class="fas fa-times"></i>
                            <span>${cancelText}</span>
                        </button>
                        <button class="btn ${confirmClass} confirm-accept">
                            <i class="fas fa-check"></i>
                            <span>${confirmText}</span>
                        </button>
                    </div>
                </div>
            `;

            this.modal.classList.add('show');

            // Agregar eventos
            const cancelBtn = this.modal.querySelector('.confirm-cancel');
            const acceptBtn = this.modal.querySelector('.confirm-accept');

            cancelBtn.addEventListener('click', () => {
                this.hide(false);
            });

            acceptBtn.addEventListener('click', () => {
                this.hide(true);
            });

            // Cerrar al hacer clic fuera
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide(false);
                }
            });

            // Cerrar con ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.hide(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * Oculta el modal
     */
    hide(result) {
        this.modal.classList.remove('show');
        if (this.resolve) {
            this.resolve(result);
            this.resolve = null;
        }
    }

    /**
     * Diálogo de confirmación de eliminación
     */
    confirmDelete(itemName = 'este elemento') {
        return this.show(
            `¿Está seguro que desea eliminar ${itemName}? Esta acción no se puede deshacer.`,
            'Confirmar Eliminación',
            'danger',
            {
                confirmText: 'Eliminar',
                cancelText: 'Cancelar',
                confirmClass: 'btn-danger'
            }
        );
    }

    /**
     * Diálogo de confirmación genérico
     */
    confirmAction(message, title = '¿Continuar?') {
        return this.show(
            message,
            title,
            'warning',
            {
                confirmText: 'Continuar',
                cancelText: 'Cancelar',
                confirmClass: 'btn-primary'
            }
        );
    }
}

/**
 * Loading Overlay
 */
class LoadingOverlay {
    constructor() {
        this.overlay = null;
        this.init();
    }

    init() {
        if (!document.getElementById('loading-overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'loading-overlay';
            this.overlay.className = 'loading-overlay';
            this.overlay.innerHTML = `
                <div class="loading-spinner"></div>
            `;
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.getElementById('loading-overlay');
        }
    }

    show() {
        this.overlay.classList.add('show');
    }

    hide() {
        this.overlay.classList.remove('show');
    }
}

// Instancias globales
window.notify = new NotificationSystem();
window.confirmDialog = new ConfirmDialog();
window.loadingOverlay = new LoadingOverlay();

// Alias para compatibilidad
window.toast = window.notify;

// Función de ayuda para reemplazar alert()
window.showAlert = function(message, type = 'info') {
    return window.notify.show(message, type);
};

// Función de ayuda para reemplazar confirm()
window.showConfirm = function(message, title = '¿Está seguro?') {
    return window.confirmDialog.confirmAction(message, title);
};

// Exportar para uso en módulos
// Hacer las funciones disponibles globalmente
window.showNotification = (message, type = 'info', duration = 4000) => {
    window.notify.show(message, type, duration);
};

// NOTA: No sobrescribir window.confirmDialog - ya está definido arriba como instancia de ConfirmDialog

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NotificationSystem,
        ConfirmDialog,
        LoadingOverlay
    };
}

