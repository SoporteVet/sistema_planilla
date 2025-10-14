// Sistema de Autenticación con Firebase Auth
import { firebaseConfig } from './firebase/config.js';

let auth = null;
let currentUser = null;

// Inicializar Firebase Auth
async function initAuth() {
  try {
    const [{ initializeApp }, { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    ]);

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Exportar funciones de autenticación
    window._authFunctions = {
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      createUserWithEmailAndPassword
    };

    return auth;
  } catch (error) {
    console.error('Error al inicializar Firebase Auth:', error);
    throw error;
  }
}

// Iniciar sesión
export async function login(email, password) {
  if (!auth) {
    await initAuth();
  }

  try {
    const { signInWithEmailAndPassword } = window._authFunctions;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    
    // Guardar en localStorage
    localStorage.setItem('userEmail', email);
    
    return {
      success: true,
      user: currentUser
    };
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    
    let message = 'Error al iniciar sesión';
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'El correo electrónico no es válido';
        break;
      case 'auth/user-disabled':
        message = 'Este usuario ha sido deshabilitado';
        break;
      case 'auth/user-not-found':
        message = 'No existe un usuario con este correo';
        break;
      case 'auth/wrong-password':
        message = 'La contraseña es incorrecta';
        break;
      case 'auth/invalid-credential':
        message = 'Credenciales inválidas. Verifica tu correo y contraseña';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos fallidos. Intenta más tarde';
        break;
    }
    
    return {
      success: false,
      error: message
    };
  }
}

// Cerrar sesión
export async function logout() {
  if (!auth) {
    await initAuth();
  }

  try {
    const { signOut } = window._authFunctions;
    await signOut(auth);
    currentUser = null;
    localStorage.removeItem('userEmail');
    
    // Recargar la página para mostrar el login
    window.location.reload();
    
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return {
      success: false,
      error: 'Error al cerrar sesión'
    };
  }
}

// Registrar nuevo usuario
export async function register(email, password) {
  if (!auth) {
    await initAuth();
  }

  try {
    const { createUserWithEmailAndPassword } = window._authFunctions;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    
    localStorage.setItem('userEmail', email);
    
    return {
      success: true,
      user: currentUser
    };
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    
    let message = 'Error al registrar usuario';
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este correo ya está registrado';
        break;
      case 'auth/invalid-email':
        message = 'El correo electrónico no es válido';
        break;
      case 'auth/weak-password':
        message = 'La contraseña debe tener al menos 6 caracteres';
        break;
    }
    
    return {
      success: false,
      error: message
    };
  }
}

// Verificar estado de autenticación
export async function checkAuthState() {
  if (!auth) {
    await initAuth();
  }

  return new Promise((resolve) => {
    const { onAuthStateChanged } = window._authFunctions;
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      resolve(user);
    });
  });
}

// Obtener usuario actual
export function getCurrentUser() {
  return currentUser;
}

// Verificar si el usuario está autenticado
export function isAuthenticated() {
  return currentUser !== null;
}



