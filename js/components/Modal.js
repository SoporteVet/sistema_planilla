// Modal component for editing forms

export class Modal {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.isOpen = false;
  }

  createModal(title, subtitle = '') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <button class="close-btn" type="button">&times;</button>
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          ${subtitle ? `<p class="modal-subtitle">${subtitle}</p>` : ''}
        </div>
        <div class="modal-body">
          <form class="modal-form" id="modal-form">
            <!-- Form content will be inserted here -->
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="modal-btn secondary" data-action="cancel">Cancelar</button>
          <button type="submit" form="modal-form" class="modal-btn primary" data-action="save">Guardar</button>
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
    const closeBtn = this.overlay.querySelector('.close-btn');
    const cancelBtn = this.overlay.querySelector('[data-action="cancel"]');
    const form = this.overlay.querySelector('#modal-form');

    const closeModal = () => this.close();

    closeBtn.addEventListener('click', closeModal);
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

  setFormContent(html) {
    if (!this.overlay) return;
    const form = this.overlay.querySelector('#modal-form');
    if (form) form.innerHTML = html;
  }

  getFormData() {
    if (!this.overlay) return null;
    const form = this.overlay.querySelector('#modal-form');
    if (!form) return null;
    
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
  }

  setFormData(data) {
    if (!this.overlay) return;
    const form = this.overlay.querySelector('#modal-form');
    if (!form) return;

    Object.entries(data).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) input.value = value || '';
    });
  }

  onSave(callback) {
    if (!this.overlay) return;
    const form = this.overlay.querySelector('#modal-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = this.getFormData();
      callback(data);
    });
  }
}


