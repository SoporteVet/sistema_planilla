// Confirmation modal component

export class ConfirmModal {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.isOpen = false;
  }

  createConfirmModal(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <p class="modal-subtitle">${message}</p>
        </div>
        <div class="modal-footer" style="margin-top: 0;">
          <button type="button" class="modal-btn secondary" data-action="cancel">${cancelText}</button>
          <button type="button" class="modal-btn primary danger" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.modal = overlay.querySelector('.modal');
    this.isOpen = true;

    // Show with animation
    setTimeout(() => overlay.classList.add('show'), 10);

    // Event listeners
    this.setupEventListeners();

    return overlay;
  }

  setupEventListeners() {
    const cancelBtn = this.overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = this.overlay.querySelector('[data-action="confirm"]');

    const closeModal = () => this.close();

    cancelBtn.addEventListener('click', closeModal);
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) closeModal();
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEscape);

    // Store cleanup function
    this.cleanup = () => {
      document.removeEventListener('keydown', handleEscape);
    };

    // Return promise for confirmation
    return new Promise((resolve) => {
      confirmBtn.addEventListener('click', () => {
        closeModal();
        resolve(true);
      });
      
      cancelBtn.addEventListener('click', () => {
        closeModal();
        resolve(false);
      });
    });
  }

  close() {
    if (!this.overlay || !this.isOpen) return;

    this.overlay.classList.remove('show');
    
    setTimeout(() => {
      if (this.cleanup) this.cleanup();
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.modal = null;
      this.isOpen = false;
    }, 300);
  }

  static async show(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    const modal = new ConfirmModal();
    const overlay = modal.createConfirmModal(title, message, confirmText, cancelText);
    return modal.setupEventListeners();
  }
}


