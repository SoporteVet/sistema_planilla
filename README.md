# Sistema de Planillas - Costa Rica

Sistema completo de gestión de nómina para empresas costarricenses. Desarrollado con JavaScript vanilla, Firebase Realtime Database y Tailwind CSS.

## 🚀 Características Principales

- **Gestión de Empleados**: CRUD completo con validación de cédulas costarricenses, jornadas laborales y datos bancarios
- **Asistencias y Ausencias**: Control diario con calendario visual, horas extras, permisos, incapacidades CCSS/INS
- **Bonos y Rebajos**: Sistema de bonificaciones y descuentos con flujo de aprobación
- **Generación de Planillas**: Cálculo automático de nómina quincenal/mensual consolidando toda la información
- **Aguinaldos**: Cálculo automático del 8.33% del salario anual
- **Feriados Nacionales**: Gestión de feriados con pago doble automático
- **Reportes**: Exportación a PDF de planillas, constancias salariales y reportes
- **Control de Usuarios**: Roles y permisos (Admin, Gerente RRHH, Supervisor, Contador, Empleado)

## 📋 Requisitos Previos

- Cuenta de Firebase (gratuita)
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Editor de código (VS Code recomendado)

## 🔧 Instalación

### 1. Clonar o descargar el proyecto

```bash
git clone [URL_DEL_REPOSITORIO]
cd sistema-planilla
```

### 2. Configurar Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear un nuevo proyecto
3. En "Project Settings" > "General", copiar la configuración web
4. Habilitar **Firebase Authentication** con Email/Password
5. Habilitar **Firebase Realtime Database**
6. Habilitar **Firebase Storage** (opcional, para adjuntos)

### 3. Configurar credenciales de Firebase

Editar el archivo `js/config.js` y reemplazar con tus credenciales:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://TU_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT_ID.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};
```

### 4. Configurar Reglas de Seguridad de Firebase

#### Realtime Database Rules

En Firebase Console > Realtime Database > Rules, copiar estas reglas:

```json
{
  "rules": {
    "empleados": {
      ".read": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() !== 'empleado'",
      ".write": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() === 'admin'"
    },
    "asistencias": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('usuarios').child(auth.uid).child('rol').val() === 'admin' || root.child('usuarios').child(auth.uid).child('rol').val() === 'supervisor' || root.child('usuarios').child(auth.uid).child('rol').val() === 'gerente_rrhh')"
    },
    "planillas": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('usuarios').child(auth.uid).child('rol').val() === 'admin' || root.child('usuarios').child(auth.uid).child('rol').val() === 'contador')"
    },
    "bonos_rebajos": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() === 'admin'"
    },
    "aguinaldos": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "feriados": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() === 'admin'"
    },
    "jornadas": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() === 'admin'"
    },
    "usuarios": {
      ".read": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() === 'admin'",
      ".write": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() === 'admin'"
    },
    "auditoria": {
      ".read": "auth != null && root.child('usuarios').child(auth.uid).child('rol').val() === 'admin'",
      ".write": "auth != null"
    }
  }
}
```

### 5. Crear Usuario Administrador Inicial

En Firebase Console > Authentication > Users:

1. Click en "Add user"
2. Crear usuario con email y contraseña (ej: `admin@empresa.com` / `Admin123`)
3. Copiar el UID del usuario creado
4. Ir a Realtime Database y crear manualmente este nodo:

```json
{
  "usuarios": {
    "UID_DEL_USUARIO_ADMIN": {
      "nombre": "Administrador",
      "correo": "admin@empresa.com",
      "rol": "admin",
      "activo": true,
      "fechaCreacion": 1700000000000
    }
  }
}
```

### 6. Ejecutar la Aplicación

Opción A: Servidor local simple (Python)
```bash
python -m http.server 8000
```

Opción B: Live Server en VS Code
- Instalar extensión "Live Server"
- Click derecho en `index.html` > "Open with Live Server"

Opción C: Cualquier servidor web local

Abrir navegador en `http://localhost:8000` (o el puerto correspondiente)

## 🎯 Uso del Sistema

### Primer Inicio de Sesión

1. Usar las credenciales del usuario admin creado
2. Ir a módulo de Usuarios y crear usuarios adicionales con roles específicos
3. Ir a módulo de Empleados y crear los empleados de la empresa

### Flujo de Trabajo Recomendado

1. **Configuración Inicial**
   - Revisar jornadas laborales disponibles
   - Verificar feriados nacionales cargados
   - Crear empleados con todos sus datos

2. **Registro Diario**
   - Ingresar asistencias diarias por empleado
   - Marcar horas extras, permisos, incapacidades
   - Registrar bonos y rebajos cuando apliquen

3. **Generación de Planilla**
   - Al finalizar período (quincenal/mensual)
   - Generar planilla automática
   - Revisar cálculos
   - Aprobar y descargar PDF

4. **Fin de Año**
   - Calcular aguinaldos en diciembre
   - Generar reportes anuales

## 📊 Cálculos Implementados

### Jornadas Laborales Costarricenses

| Jornada | Horas/Día | Días/Semana | Horas/Mes | Horas/Quincena |
|---------|-----------|-------------|-----------|----------------|
| Diurna | 8 | 6 | 240 | 120 |
| Mixta | 7 | 5 | 210 | 105 |
| Nocturna | 6 | 5 | 180 | 90 |
| Diurna Acumulativa | 9-10 | 5 | 240 | 120 |
| Mixta Acumulativa | 8-9 | 5 | 210 | 105 |

### Deducciones Legales

- **CCSS Empleado**: 10.83% del salario bruto
- **CCSS Patrono**: 26.67% (informativo, no deducido al empleado)

### Impuesto de Renta 2025 (Tramos Progresivos)

| Salario Desde | Salario Hasta | Porcentaje | Sobre Exceso de |
|---------------|---------------|------------|-----------------|
| ₡0 | ₡922,000 | 0% | - |
| ₡922,001 | ₡1,352,000 | 10% | ₡922,000 |
| ₡1,352,001 | ₡2,373,000 | 15% | ₡1,352,000 |
| ₡2,373,001 | ₡4,745,000 | 20% | ₡2,373,000 |
| ₡4,745,001+ | ∞ | 25% | ₡4,745,000 |

**Créditos Fiscales:**
- Hijo: ₡1,720 mensual (máximo 4)
- Cónyuge: ₡2,600 mensual

### Otros Conceptos

- **Horas Extra**: 1.5x del salario horario
- **Feriados Trabajados**: 2x del salario diario
- **Aguinaldo**: Suma salarios anuales / 12
- **Vacaciones**: 12.17 días por año

## 🔐 Roles y Permisos

| Rol | Empleados | Asistencias | Bonos | Planillas | Reportes | Usuarios |
|-----|-----------|-------------|-------|-----------|----------|----------|
| Administrador | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gerente RRHH | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Supervisor | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Contador | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Empleado | ✗ | ✗ | ✗ | Solo propia | ✗ | ✗ |

## 📁 Estructura del Proyecto

```
sistema-planilla/
├── index.html              # Página principal
├── css/
│   └── custom.css         # Estilos personalizados
├── js/
│   ├── config.js          # Configuración Firebase y constantes
│   ├── auth.js            # Autenticación
│   ├── main.js            # Router y utilidades
│   ├── utils/
│   │   ├── calculations.js      # Cálculos salariales
│   │   ├── validators.js        # Validaciones
│   │   ├── formatters.js        # Formateo de datos
│   │   ├── firebase-helpers.js  # Operaciones Firebase
│   │   └── pdf-generator.js     # Generación de PDFs
│   └── modules/
│       ├── jornadas.js         # Módulo de jornadas
│       ├── empleados.js        # Módulo de empleados
│       ├── asistencias.js      # Módulo de asistencias
│       ├── bonos-rebajos.js    # Módulo de bonos/rebajos
│       ├── planillas.js        # Módulo de planillas (núcleo)
│       ├── aguinaldos.js       # Módulo de aguinaldos
│       ├── feriados.js         # Módulo de feriados
│       ├── reportes.js         # Módulo de reportes
│       └── usuarios.js         # Módulo de usuarios
└── README.md              # Este archivo
```

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, JavaScript ES6+, Tailwind CSS
- **Backend**: Firebase Realtime Database
- **Autenticación**: Firebase Authentication
- **Almacenamiento**: Firebase Storage
- **Generación PDF**: jsPDF + autoTable
- **Exportación Excel**: SheetJS (xlsx)
- **Gráficos**: Chart.js
- **Manejo de Fechas**: date-fns

## 🐛 Solución de Problemas

### Error: Firebase no está definido
- Verificar que las URLs de los CDN estén cargando correctamente
- Verificar conexión a internet

### Error: Permission denied
- Verificar que las reglas de seguridad estén configuradas correctamente
- Verificar que el usuario esté autenticado

### Los cálculos no son correctos
- Verificar que la jornada del empleado esté configurada correctamente
- Verificar que las asistencias estén registradas en el período correcto

### No puedo crear usuarios
- Solo usuarios con rol "admin" pueden crear otros usuarios
- Verificar reglas de Firebase para el nodo "usuarios"

## 📝 Notas Importantes

1. **Datos de Producción**: Este sistema maneja información sensible. Asegurar adecuadas reglas de seguridad en Firebase.

2. **Backup**: Configurar backups automáticos de Firebase Realtime Database desde la consola.

3. **Costos**: Firebase tiene un plan gratuito generoso. Para empresas medianas/grandes, revisar planes pagos.

4. **Normativa**: Los cálculos están basados en normativa costarricense vigente (2025). Actualizar según cambios legales.

5. **Impuesto de Renta**: El sistema calcula automáticamente pero permite entrada manual para casos especiales.

## 📞 Soporte

Para dudas o problemas:
- Revisar la documentación de Firebase: https://firebase.google.com/docs
- Verificar normativa costarricense vigente en el Ministerio de Trabajo

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🎉 Créditos

Desarrollado para empresas costarricenses que buscan un sistema robusto, profesional y completo de gestión de nómina.

---

**Versión**: 1.0.0  
**Fecha**: Noviembre 2025  
**País**: Costa Rica 🇨🇷





