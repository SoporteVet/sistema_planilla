/**
 * Authentication Module - Sistema de Planillas Costa Rica
 * Gestión de autenticación y sesiones de usuario
 */

const Auth = {
    /**
     * Inicializa el módulo de autenticación
     */
    init() {
        this.setupAuthStateListener();
        this.setupLoginForm();
        this.setupLogoutButton();
    },

    /**
     * Configura el listener de estado de autenticación
     */
    setupAuthStateListener() {
        CONFIG.auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Usuario autenticado
                await this.handleUserLoggedIn(user);
            } else {
                // Usuario no autenticado
                this.handleUserLoggedOut();
            }
        });
    },

    /**
     * Maneja usuario autenticado
     * @param {object} user - Usuario de Firebase
     */
    async handleUserLoggedIn(user) {
        try {
            // Guardar usuario actual
            FirebaseHelpers.currentUser = user;

            // Obtener perfil de usuario
            const userProfile = await FirebaseHelpers.getUserProfile(user.uid);

            if (!userProfile) {
                // Si no existe perfil, crear uno por defecto
                await FirebaseHelpers.setUserProfile(user.uid, {
                    nombre: user.email.split('@')[0],
                    correo: user.email,
                    rol: CONFIG.ROLES.EMPLEADO,
                    activo: true,
                    fechaCreacion: new Date().getTime()
                });

                // Recargar perfil
                const newProfile = await FirebaseHelpers.getUserProfile(user.uid);
                FirebaseHelpers.currentUserRole = newProfile.rol;
            } else {
                FirebaseHelpers.currentUserRole = userProfile.rol;
            }

            // Mostrar aplicación
            this.showApp();

            // Actualizar UI con datos de usuario
            this.updateUserUI(user, userProfile || { rol: CONFIG.ROLES.EMPLEADO });

            // Cargar dashboard
            if (window.AppRouter) {
                window.AppRouter.navigate('dashboard');
            }

        } catch (error) {
            console.error('Error handling user login:', error);
            this.showError('Error al cargar perfil de usuario');
        }
    },

    /**
     * Maneja usuario no autenticado
     */
    handleUserLoggedOut() {
        FirebaseHelpers.currentUser = null;
        FirebaseHelpers.currentUserRole = null;
        this.showLogin();
    },

    /**
     * Configura el formulario de login
     */
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
    },

    /**
     * Maneja el proceso de login
     */
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        // Limpiar errores previos
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';

        try {
            // Mostrar loading
            this.showLoading('Iniciando sesión...');

            // Autenticar con Firebase
            await CONFIG.auth.signInWithEmailAndPassword(email, password);

            // El listener onAuthStateChanged manejará el resto

        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Error al iniciar sesión';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuario no encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Usuario deshabilitado';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Demasiados intentos. Intente más tarde';
                    break;
                default:
                    errorMessage = error.message;
            }

            errorDiv.textContent = errorMessage;
            errorDiv.classList.remove('hidden');

            this.hideLoading();
        }
    },

    /**
     * Configura el botón de logout
     */
    setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.handleLogout();
            });
        }
    },

    /**
     * Maneja el proceso de logout
     */
    async handleLogout() {
        try {
            await CONFIG.auth.signOut();
            Utils.showToast('Sesión cerrada exitosamente', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            Utils.showToast('Error al cerrar sesión', 'error');
        }
    },

    /**
     * Muestra la pantalla de login
     */
    showLogin() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    },

    /**
     * Muestra la aplicación
     */
    showApp() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
    },

    /**
     * Muestra pantalla de carga
     * @param {string} message - Mensaje de carga
     */
    showLoading(message = 'Cargando...') {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.querySelector('p').textContent = message;
        loadingScreen.classList.remove('hidden');
    },

    /**
     * Oculta pantalla de carga
     */
    hideLoading() {
        document.getElementById('loadingScreen').classList.add('hidden');
    },

    /**
     * Actualiza UI con datos del usuario
     * @param {object} user - Usuario de Firebase
     * @param {object} profile - Perfil del usuario
     */
    updateUserUI(user, profile) {
        const nameElement = document.getElementById('currentUserName');
        const roleElement = document.getElementById('currentUserRole');

        if (nameElement) {
            nameElement.textContent = profile.nombre || user.email;
        }

        if (roleElement) {
            roleElement.textContent = Formatters.formatearRol(profile.rol);
        }
    },

    /**
     * Muestra error
     * @param {string} message - Mensaje de error
     */
    showError(message) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    },

    /**
     * Registra nuevo usuario (solo admin)
     * @param {string} email - Email
     * @param {string} password - Contraseña
     * @param {object} userData - Datos adicionales del usuario
     */
    async registerUser(email, password, userData) {
        try {
            // Crear usuario en Firebase Auth
            const userCredential = await CONFIG.auth.createUserWithEmailAndPassword(email, password);
            
            // Crear perfil de usuario
            await FirebaseHelpers.setUserProfile(userCredential.user.uid, {
                ...userData,
                correo: email,
                activo: true,
                fechaCreacion: new Date().getTime()
            });

            return userCredential.user;

        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    },

    /**
     * Cambia contraseña del usuario actual
     * @param {string} newPassword - Nueva contraseña
     */
    async changePassword(newPassword) {
        try {
            const user = CONFIG.auth.currentUser;
            if (!user) throw new Error('No hay usuario autenticado');

            await user.updatePassword(newPassword);
            return true;

        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    },

    /**
     * Envía email de recuperación de contraseña
     * @param {string} email - Email del usuario
     */
    async resetPassword(email) {
        try {
            await CONFIG.auth.sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            console.error('Error sending password reset:', error);
            throw error;
        }
    },

    /**
     * Verifica si el usuario actual es admin
     * @returns {boolean}
     */
    isAdmin() {
        return FirebaseHelpers.currentUserRole === CONFIG.ROLES.ADMIN;
    },

    /**
     * Verifica si el usuario tiene un rol específico
     * @param {string} rol - Rol a verificar
     * @returns {boolean}
     */
    hasRole(rol) {
        return FirebaseHelpers.currentUserRole === rol;
    },

    /**
     * Verifica si el usuario tiene acceso a un módulo
     * @param {string} modulo - Módulo a verificar
     * @returns {boolean}
     */
    hasAccess(modulo) {
        return FirebaseHelpers.tienePermiso(modulo);
    }
};

// Export to window
window.Auth = Auth;



