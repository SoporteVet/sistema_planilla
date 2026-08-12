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
            console.log('=== Usuario autenticado ===');
            console.log('Email:', user.email);
            console.log('UID:', user.uid);
            
            // Guardar usuario actual
            FirebaseHelpers.currentUser = user;

            // Verificar conexión a Firebase Database
            console.log('Verificando conexión a Firebase Database...');
            try {
                const conectado = await FirebaseHelpers.verificarConexion();
                if (!conectado) {
                    console.warn('⚠️ Advertencia: Firebase Database no está conectado');
                } else {
                    console.log('✓ Firebase Database conectado correctamente');
                }
            } catch (connError) {
                console.error('Error verificando conexión:', connError);
            }

            // Obtener perfil de usuario
            console.log('Obteniendo perfil de usuario...');
            const userProfile = await FirebaseHelpers.getUserProfile(user.uid);
            console.log('Perfil obtenido:', userProfile);

            if (!userProfile) {
                console.log('No existe perfil, creando uno por defecto...');
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
                console.log('Perfil creado con rol:', FirebaseHelpers.currentUserRole);
            } else {
                FirebaseHelpers.currentUserRole = userProfile.rol;
                console.log('Rol del usuario:', FirebaseHelpers.currentUserRole);
            }

            // Mostrar aplicación
            console.log('Mostrando aplicación...');
            this.showApp();

            // Actualizar UI con datos de usuario
            console.log('Actualizando UI...');
            this.updateUserUI(user, userProfile || { rol: CONFIG.ROLES.EMPLEADO });

            // Cargar módulo apropiado según el rol (con delay para evitar conflictos)
            console.log('Navegando al módulo apropiado...');
            setTimeout(() => {
                if (window.AppRouter) {
                    // Si es operador de asistencia, ir directo a control de asistencia
                    if (FirebaseHelpers.currentUserRole === 'operador_asistencia') {
                        console.log('Navegando a control-asistencia (operador)...');
                        // Limpiar cualquier hash en la URL que pueda interferir
                        if (window.location.hash) {
                            window.location.hash = '';
                        }
                        window.AppRouter.navigate('control-asistencia');
                    } else {
                        console.log(`Navegando a dashboard (rol: ${FirebaseHelpers.currentUserRole})...`);
                        window.AppRouter.navigate('dashboard');
                    }
                } else {
                    console.warn('AppRouter no disponible, reintentando...');
                    // Reintentar si AppRouter no está disponible
                    setTimeout(() => {
                        if (window.AppRouter && FirebaseHelpers.currentUserRole === 'operador_asistencia') {
                            console.log('Navegando a control-asistencia (reintento)...');
                            window.AppRouter.navigate('control-asistencia');
                        } else if (window.AppRouter) {
                            console.log('Navegando a dashboard (reintento)...');
                            window.AppRouter.navigate('dashboard');
                        } else {
                            console.error('AppRouter no está disponible después del reintento');
                        }
                    }, 200);
                }
            }, 300); // Delay para asegurar que todos los módulos se hayan inicializado

        } catch (error) {
            console.error('❌ Error handling user login:', error);
            console.error('Stack trace:', error.stack);
            this.showError('Error al cargar perfil de usuario: ' + error.message);
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
        const togglePasswordBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('loginPassword');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Toggle password visibility
        if (togglePasswordBtn && passwordInput) {
            togglePasswordBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // Cambiar icono
                const icon = type === 'password' 
                    ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`
                    : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>`;
                
                togglePasswordBtn.querySelector('svg').innerHTML = icon;
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
        const errorText = document.getElementById('loginErrorText');

        // Limpiar errores previos
        errorDiv.classList.add('hidden');
        if (errorText) {
            errorText.textContent = '';
        }

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
                case 'auth/invalid-credential':
                    errorMessage = 'Credenciales inválidas';
                    break;
                default:
                    errorMessage = error.message;
            }

            if (errorText) {
                errorText.textContent = errorMessage;
            } else {
                errorDiv.textContent = errorMessage;
            }
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

        // Ocultar/mostrar enlaces de navegación basado en permisos
        this.updateNavigationVisibility(profile.rol);
    },

    /**
     * Actualiza visibilidad de navegación basado en el rol
     * @param {string} rol - Rol del usuario
     */
    updateNavigationVisibility(rol) {
        const permisos = CONFIG.PERMISOS[rol] || [];
        // Mapeo de vistas a permisos
        const viewPermissions = {
            'dashboard': '*', // Todos pueden ver dashboard excepto operador_asistencia
            'empleados': 'empleados',
            'asistencias': 'asistencias',
            'bonos': 'bonos',
            'planillas': 'planillas',
            // Nuevo módulo de liquidaciones
            'liquidaciones': 'liquidaciones',
            'servicios-profesionales': 'servicios_profesionales',
            'control-asistencia': 'control_asistencia',
            'aguinaldos': 'aguinaldos',
            'feriados': 'feriados',
            'reportes': 'reportes',
            'asistente-ia': 'reportes',
            'cumpleanos': 'cumpleanos',
            'usuarios': 'usuarios',
            'autorizacion-email': '*' // Todos pueden acceder
        };

        // Filtrar enlaces de navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            const view = link.dataset.view;
            const requiredPermission = viewPermissions[view];

            // Operador de asistencia SOLO ve control-asistencia y autorizacion-email (no dashboard)
            if (rol === 'operador_asistencia') {
                if (view === 'control-asistencia' || view === 'autorizacion-email') {
                    link.parentElement.style.display = '';
                } else {
                    link.parentElement.style.display = 'none';
                }
            } else {
                // Para otros roles, validar normalmente
                // Dashboard es accesible para todos excepto operador_asistencia
                if (requiredPermission === '*' || permisos.includes(requiredPermission)) {
                    link.parentElement.style.display = '';
                } else {
                    link.parentElement.style.display = 'none';
                }
            }
        });
    },

    /**
     * Muestra error
     * @param {string} message - Mensaje de error
     */
    showError(message) {
        const errorDiv = document.getElementById('loginError');
        const errorText = document.getElementById('loginErrorText');
        
        if (errorDiv) {
            if (errorText) {
                errorText.textContent = message;
            } else {
                errorDiv.textContent = message;
            }
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





