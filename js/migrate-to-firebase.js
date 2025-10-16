// Script de migración: LocalStorage → Firebase Realtime Database
// Ejecutar una sola vez para migrar datos existentes

import { initFirebase } from './firebase/init.js';
import { firebaseConfig } from './firebase/config.js';

async function migrateData() {
  console.log('🔄 Iniciando migración de datos a Firebase...');
  
  try {
    // Inicializar Firebase
    const firebaseInstance = initFirebase(firebaseConfig);
    const { db, api } = await firebaseInstance.ensureLoaded();
    console.log('✅ Firebase inicializado correctamente');

    // Obtener datos de localStorage
    const empleados = JSON.parse(localStorage.getItem('empleados') || '[]');
    const asistencias = JSON.parse(localStorage.getItem('asistencias') || '[]');
    const bonos = JSON.parse(localStorage.getItem('bonos') || '[]');
    const feriados = JSON.parse(localStorage.getItem('feriados') || '[]');
    const historialPlanillas = JSON.parse(localStorage.getItem('historialPlanillas') || '[]');
    const config = JSON.parse(localStorage.getItem('config') || '{}');

    console.log(`📊 Datos encontrados:
      - Empleados: ${empleados.length}
      - Asistencias: ${asistencias.length}
      - Bonos: ${bonos.length}
      - Feriados: ${feriados.length}
      - Planillas: ${historialPlanillas.length}`);

    // Migrar empleados
    if (empleados.length > 0) {
      for (const emp of empleados) {
        await api.set(api.ref(db, `employees/${emp.id}`), emp);
      }
      console.log(`✅ ${empleados.length} empleados migrados`);
    }

    // Migrar asistencias
    if (asistencias.length > 0) {
      for (const asist of asistencias) {
        const id = asist.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await api.set(api.ref(db, `attendance/${id}`), { ...asist, id });
      }
      console.log(`✅ ${asistencias.length} asistencias migradas`);
    }

    // Migrar bonos/extras
    if (bonos.length > 0) {
      for (const bono of bonos) {
        const id = bono.id || `ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await api.set(api.ref(db, `extras/${id}`), { ...bono, id });
      }
      console.log(`✅ ${bonos.length} bonos/rebajos migrados`);
    }

    // Migrar feriados
    if (feriados.length > 0) {
      for (const feriado of feriados) {
        const id = feriado.id || `hol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await api.set(api.ref(db, `holidays/${id}`), { ...feriado, id });
      }
      console.log(`✅ ${feriados.length} feriados migrados`);
    }

    // Migrar historial de planillas
    if (historialPlanillas.length > 0) {
      for (const planilla of historialPlanillas) {
        const id = planilla.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await api.set(api.ref(db, `payrollHistory/${id}`), { ...planilla, id });
      }
      console.log(`✅ ${historialPlanillas.length} planillas migradas`);
    }

    // Migrar configuración
    if (Object.keys(config).length > 0) {
      await api.set(api.ref(db, 'config'), config);
      console.log(`✅ Configuración migrada`);
    }

    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('💡 Puedes verificar los datos en Firebase Console:');
    console.log('   https://console.firebase.google.com/project/sistemaplanilla/database');
    
    // Crear respaldo de localStorage antes de limpiar
    const backup = {
      empleados,
      asistencias,
      bonos,
      feriados,
      historialPlanillas,
      config,
      migrationDate: new Date().toISOString()
    };
    localStorage.setItem('backup_before_firebase', JSON.stringify(backup));
    console.log('💾 Respaldo creado en localStorage con clave: backup_before_firebase');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('Detalles:', error.message);
  }
}

// Ejecutar migración
migrateData();



