/**
 * Sistema de Modales Centrados
 * Asegura que todos los modales aparezcan perfectamente centrados
 */

class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        // Agregar event listeners para todos los modales
        document.addEventListener('click', (e) => {
            // Cerrar modal al hacer clic en el fondo
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }

            // Cerrar modal con botón X
            if (e.target.classList.contains('close') || e.target.closest('.close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal);
                }
            }

            // Cerrar modal con botón cancelar
            if (e.target.hasAttribute('data-close')) {
                const modalId = e.target.getAttribute('data-close');
                const modal = document.getElementById(modalId);
                if (modal) {
                    this.closeModal(modal);
                }
            }
        });

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
            }
        });

        // Asegurar que los modales estén centrados al cargar
        this.centerAllModals();
        
        // Inicializar sidebar responsive
        this.initResponsiveSidebar();
    }

    /**
     * Mostrar modal centrado
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.activeModal = modal;
        
        // Remover clases anteriores
        modal.classList.remove('show');
        
        // Forzar reflow
        modal.offsetHeight;
        
        // Agregar clase show
        modal.classList.add('show');
        
        // Asegurar centrado
        this.centerModal(modal);
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
        
        // Focus en el primer input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * Cerrar modal
     */
    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (!modal) return;

        this.activeModal = null;
        
        // Remover clase show
        modal.classList.remove('show');
        
        // Restaurar scroll del body
        document.body.style.overflow = '';
        
        // Limpiar formularios
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }

    /**
     * Centrar un modal específico
     */
    centerModal(modal) {
        if (!modal) return;
        
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return;

        // Forzar centrado con JavaScript si es necesario
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        
        // Asegurar que el contenido esté centrado
        modalContent.style.margin = '0';
        modalContent.style.transform = 'none';
    }

    /**
     * Centrar todos los modales
     */
    centerAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            this.centerModal(modal);
        });
    }

    /**
     * Obtener modal activo
     */
    getActiveModal() {
        return this.activeModal;
    }

    /**
     * Verificar si hay un modal abierto
     */
    isModalOpen() {
        return this.activeModal !== null;
    }

    /**
     * Inicializar sidebar responsive para móviles
     */
    initResponsiveSidebar() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.createElement('div');
        
        // Crear overlay para móviles
        sidebarOverlay.className = 'sidebar-overlay';
        document.body.appendChild(sidebarOverlay);

        // Toggle sidebar en móviles
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    // En móviles, mostrar/ocultar sidebar con overlay
                    sidebar.classList.toggle('open');
                    sidebarOverlay.classList.toggle('show');
                } else {
                    // En desktop, solo colapsar
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        // Cerrar sidebar al hacer clic en overlay
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('show');
        });

        // Cerrar sidebar al hacer clic en item del menú en móviles
        document.querySelectorAll('.sidebar .menu-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('show');
                }
            });
        });

        // Manejar resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('show');
            }
        });
    }
}

// Crear instancia global
window.modalManager = new ModalManager();

// Función de ayuda para mostrar modales
window.showModal = function(modalId) {
    window.modalManager.showModal(modalId);
};

// Función de ayuda para cerrar modales
window.closeModal = function(modalId) {
    window.modalManager.closeModal(modalId);
};

// Asegurar centrado en resize
window.addEventListener('resize', () => {
    if (window.modalManager.isModalOpen()) {
        window.modalManager.centerModal(window.modalManager.getActiveModal());
    }
});
