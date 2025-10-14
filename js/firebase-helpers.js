// Helper functions to use Firebase instead of localStorage in app.js
// This maintains backward compatibility with the existing code structure

let firebaseDB = null;
let firebaseAPI = null;
let isInitialized = false;

// Initialize Firebase
export async function initializeFirebaseStorage() {
  if (isInitialized) return true;
  
  try {
    const initModule = await import('./firebase/init.js');
    const configModule = await import('./firebase/config.js');
    
    const firebaseInstance = initModule.initFirebase(configModule.firebaseConfig);
    const { db, api } = await firebaseInstance.ensureLoaded();
    
    firebaseDB = db;
    firebaseAPI = api;
    isInitialized = true;
    
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    console.warn('⚠️ Usando localStorage como respaldo');
    return false;
  }
}

// Get data from Firebase or localStorage fallback
export async function getData(key) {
  if (isInitialized && firebaseDB) {
    try {
      const snapshot = await firebaseAPI.get(firebaseAPI.ref(firebaseDB, key));
      const value = snapshot.val();
      
      // Si es un objeto con IDs como claves, convertir a array
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.values(value);
      }
      
      return value || [];
    } catch (error) {
      console.error(`Error al leer ${key} de Firebase:`, error);
      // Fallback a localStorage
      const localData = localStorage.getItem(key);
      return localData ? JSON.parse(localData) : [];
    }
  } else {
    // Usar localStorage si Firebase no está disponible
    const localData = localStorage.getItem(key);
    return localData ? JSON.parse(localData) : [];
  }
}

// Save data to Firebase or localStorage fallback
export async function saveData(key, data) {
  // Siempre guardar en localStorage como respaldo
  localStorage.setItem(key, JSON.stringify(data));
  
  if (isInitialized && firebaseDB) {
    try {
      // Si es un array, convertir a objeto con IDs como claves
      if (Array.isArray(data)) {
        const dataObject = {};
        data.forEach((item) => {
          if (item.id) {
            dataObject[item.id] = item;
          } else {
            // Generar ID si no existe
            const id = `${key}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            dataObject[id] = { ...item, id };
          }
        });
        await firebaseAPI.set(firebaseAPI.ref(firebaseDB, key), dataObject);
      } else {
        // Si es un objeto simple (como config), guardar directamente
        await firebaseAPI.set(firebaseAPI.ref(firebaseDB, key), data);
      }
      
      console.log(`✅ ${key} sincronizado con Firebase`);
      return true;
    } catch (error) {
      console.error(`Error al guardar ${key} en Firebase:`, error);
      console.warn('⚠️ Datos guardados solo en localStorage');
      return false;
    }
  }
  
  return true;
}

// Delete data from Firebase
export async function deleteData(key) {
  // También eliminar de localStorage
  localStorage.removeItem(key);
  
  if (isInitialized && firebaseDB) {
    try {
      await firebaseAPI.remove(firebaseAPI.ref(firebaseDB, key));
      console.log(`✅ ${key} eliminado de Firebase`);
      return true;
    } catch (error) {
      console.error(`Error al eliminar ${key} de Firebase:`, error);
      return false;
    }
  }
  
  return true;
}

// Check if Firebase is ready
export function isFirebaseReady() {
  return isInitialized;
}



