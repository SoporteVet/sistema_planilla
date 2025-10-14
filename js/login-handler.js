// Manejador de UI de Login
import { login, logout, checkAuthState, getCurrentUser } from './auth.js';

const appLoader = document.getElementById('appLoader');
const loginWrapper = document.getElementById('loginWrapper');
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const loginAlert = document.getElementById('loginAlert');
const togglePassword = document.getElementById('togglePassword');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const logoutButton = document.getElementById('logoutButton');
const userInfo = document.getElementById('userInfo');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userAvatar = document.getElementById('userAvatar');
const sidebar = document.getElementById('sidebar');
const mainContent = document.querySelector('.main-content');

// Mostrar/Ocultar contraseña
if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    const type = loginPassword.type === 'password' ? 'text' : 'password';
    loginPassword.type = type;
    togglePassword.classList.toggle('fa-eye');
    togglePassword.classList.toggle('fa-eye-slash');
  });
}

// Función para mostrar alertas
function showAlert(message, type = 'error') {
  loginAlert.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  loginAlert.className = `login-alert ${type}`;
  loginAlert.style.display = 'flex';
  
  if (type === 'success') {
    setTimeout(() => {
      loginAlert.style.display = 'none';
    }, 3000);
  }
}

// Función para ocultar alertas
function hideAlert() {
  loginAlert.style.display = 'none';
}

// Función para mostrar spinner en botón
function setButtonLoading(loading) {
  if (loading) {
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="button-spinner"></span> Iniciando sesión...';
  } else {
    loginButton.disabled = false;
    loginButton.innerHTML = 'Iniciar Sesión';
  }
}

// Manejo del formulario de login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    if (!email || !password) {
      showAlert('Por favor, completa todos los campos', 'error');
      return;
    }
    
    setButtonLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        showAlert('¡Inicio de sesión exitoso!', 'success');
        
        // Esperar un momento antes de ocultar el login
        setTimeout(async () => {
          hideLoginScreen();
          showMainApp();
          
          // Disparar evento de login exitoso para inicializar el sistema
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: result.user }));
          
          // Inicializar el sistema si está disponible
          if (window.initializeSistema) {
            await window.initializeSistema();
          }
        }, 1000);
      } else {
        showAlert(result.error, 'error');
        setButtonLoading(false);
      }
    } catch (error) {
      showAlert('Error al conectar con el servidor', 'error');
      setButtonLoading(false);
    }
  });
}

// Botón de cerrar sesión
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    showLogoutConfirmModal();
  });
}

// Función para mostrar el modal de confirmación de logout
function showLogoutConfirmModal() {
  // Crear el modal si no existe
  let modal = document.getElementById('logoutConfirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'logoutConfirmModal';
    modal.className = 'logout-confirm-modal';
    modal.innerHTML = `
      <div class="logout-confirm-content">
        <div class="logout-confirm-icon">
          <i class="fas fa-sign-out-alt"></i>
        </div>
        <h3 class="logout-confirm-title">Cerrar Sesión</h3>
        <p class="logout-confirm-message">¿Estás seguro de que deseas cerrar sesión?</p>
        <div class="logout-confirm-buttons">
          <button class="logout-confirm-btn primary" id="confirmLogout">
            <i class="fas fa-check"></i>
            Aceptar
          </button>
          <button class="logout-confirm-btn secondary" id="cancelLogout">
            <i class="fas fa-times"></i>
            Cancelar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Event listeners para los botones
    document.getElementById('confirmLogout').addEventListener('click', async () => {
      hideLogoutConfirmModal();
      await logout();
    });
    
    document.getElementById('cancelLogout').addEventListener('click', () => {
      hideLogoutConfirmModal();
    });
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideLogoutConfirmModal();
      }
    });
  }
  
  // Mostrar el modal
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Función para ocultar el modal de confirmación de logout
function hideLogoutConfirmModal() {
  const modal = document.getElementById('logoutConfirmModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // Remover el modal después de la animación
    setTimeout(() => {
      if (modal && !modal.classList.contains('show')) {
        modal.remove();
      }
    }, 300);
  }
}

// Funciones para mostrar/ocultar pantallas
export function showLoader() {
  if (appLoader) {
    appLoader.classList.remove('hidden');
    appLoader.style.display = 'flex';
  }
}

export function hideLoader() {
  if (appLoader) {
    setTimeout(() => {
      appLoader.classList.add('hidden');
      setTimeout(() => {
        appLoader.style.display = 'none';
      }, 500);
    }, 800);
  }
}

export function showLoginScreen() {
  if (loginWrapper) {
    loginWrapper.style.display = 'flex';
  }
  hideMainApp();
}

export function hideLoginScreen() {
  if (loginWrapper) {
    loginWrapper.style.display = 'none';
  }
}

export function showMainApp() {
  if (sidebar) sidebar.style.display = 'block';
  if (mainContent) mainContent.style.display = 'block';
  
  // Mostrar información del usuario
  const user = getCurrentUser();
  if (user && userInfo) {
    userInfo.style.display = 'flex';
    logoutButton.style.display = 'flex';
    
    if (userEmailDisplay) {
      userEmailDisplay.textContent = user.email;
    }
    
    if (userAvatar) {
      const initial = user.email.charAt(0).toUpperCase();
      userAvatar.textContent = initial;
    }
  }
}

export function hideMainApp() {
  if (sidebar) sidebar.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';
  if (userInfo) userInfo.style.display = 'none';
  if (logoutButton) logoutButton.style.display = 'none';
}

// Verificar autenticación al cargar
export async function initializeAuth() {
  showLoader();
  hideMainApp();
  
  try {
    const user = await checkAuthState();
    
    hideLoader();
    
    if (user) {
      // Usuario autenticado
      showMainApp();
    } else {
      // Usuario no autenticado
      showLoginScreen();
    }
  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    hideLoader();
    showLoginScreen();
  }
}

// Recuperar contraseña
document.querySelector('.forgot-password')?.addEventListener('click', (e) => {
  e.preventDefault();
  showAlert('Función de recuperación de contraseña próximamente. Contacta al administrador.', 'info');
});

// Recordar email si estaba guardado
const savedEmail = localStorage.getItem('userEmail');
const rememberMe = document.getElementById('rememberMe');

if (savedEmail && loginEmail) {
  loginEmail.value = savedEmail;
  if (rememberMe) rememberMe.checked = true;
}

// Guardar email si "Recordarme" está marcado
if (rememberMe) {
  rememberMe.addEventListener('change', (e) => {
    if (!e.target.checked) {
      localStorage.removeItem('userEmail');
    }
  });
}

