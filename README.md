# Sistema de Planillas Costa Rica 🇨🇷

Sistema completo de gestión de planillas para Costa Rica con diseño moderno, cálculos automáticos según ley y exportación de reportes.

## ✨ Características Principales

### 🎨 Diseño Moderno
- **UI/UX Profesional**: Interfaz moderna con gradientes, sombras suaves y animaciones fluidas
- **Iconos SVG**: Navegación intuitiva con iconos vectoriales
- **Responsive**: Diseño adaptable a dispositivos móviles, tablets y escritorio
- **Paleta de Colores**: Azul cielo profesional con acentos cyan y emerald
- **Efectos Visuales**: Hover effects, transiciones suaves y backdrop filters

### 👥 Gestión de Empleados
- Registro completo con cédula, nombre, puesto
- Configuración de jornada laboral (diurna, nocturna, mixta, acumulativa)
- Salario por hora configurable
- Fecha de ingreso para cálculo de vacaciones
- Búsqueda y filtros en tiempo real
- Edición y eliminación de empleados

### ⏰ Control de Asistencias
- Registro de horas trabajadas por día
- Tipos de asistencia:
  - ✅ Presente
  - ❌ Ausencia
  - ⏰ Tardanza
  - 📋 Permiso
- Gestión de feriados (pago doble)
- Incapacidades:
  - CCSS (50% del día)
  - INS (0% pago)

### 💰 Bonos y Rebajos
- Bonos
- Comisiones
- Incentivos
- Rebajos automáticos

### 📊 Cálculo Automático de Planillas

#### Jornadas según Ley CR
1. **Diurna**: Máximo 8 horas base, extras con recargo 1.5x
2. **Nocturna**: Máximo 6 horas, pero se pagan 8 horas si cumple 6h
3. **Mixta**: Máximo 7 horas, proporcional diurna/nocturna
4. **Acumulativa**: 48h semanales (10h+10h+10h+10h+8h)

#### Cálculos Automáticos
- ✅ **CCSS**: 10.67% sobre salario bruto
- ✅ **Aguinaldo**: Salarios brutos / 12
- ✅ **Vacaciones**: 1 día por mes trabajado desde ingreso
- ✅ **Horas Extra**: Recargo de ley 1.5x
- ✅ **Feriados**: Pago doble sobre horas base
- ✅ **Incapacidades**: CCSS 50%, INS 0%

### 📈 Reportes y Exportación
- **Planillas**: Semanal, quincenal, mensual
- **Constancias Salariales**: Generación en PDF
- **Exportación**:
  - Excel (.xlsx)
  - PDF con formato profesional

### 🔥 Firebase Ready
Sistema preparado para conectar con Firebase Realtime Database. Actualmente usa localStorage.

## 🚀 Cómo Usar

### Inicio Rápido
1. Abre `index.html` en tu navegador
2. No requiere instalación ni servidor

### Conectar con Firebase (Opcional)

1. **Crea un proyecto en Firebase Console**
   - Ve a [console.firebase.google.com](https://console.firebase.google.com)
   - Crea un nuevo proyecto
   - Activa Realtime Database

2. **Configura las credenciales**
   ```bash
   # Copia el archivo de ejemplo
   cp js/firebase/config.example.js js/firebase/config.js
   ```
   
   Edita `js/firebase/config.js` con tus credenciales:
   ```javascript
   export const firebaseConfig = {
     apiKey: "TU_API_KEY",
     authDomain: "tu-proyecto.firebaseapp.com",
     databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
     projectId: "tu-proyecto",
     storageBucket: "tu-proyecto.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

3. **Cambia el adaptador de almacenamiento**
   
   En `js/storage/index.js`:
   ```javascript
   // Comenta esto:
   // import { createLocalStorageAdapter } from './localStorageAdapter.js';
   // const adapter = createLocalStorageAdapter();
   
   // Descomenta esto:
   import { firebaseConfig } from '../firebase/config.js';
   import { createFirebaseAdapter } from './firebaseAdapter.js';
   const adapter = createFirebaseAdapter(firebaseConfig);
   ```

## 📁 Estructura del Proyecto

```
sistema-planilla/
├── index.html                      # Shell principal
├── css/
│   └── styles.css                  # Estilos modernos
├── js/
│   ├── main.js                     # Router y navegación
│   ├── storage/
│   │   ├── index.js                # Facade de almacenamiento
│   │   ├── localStorageAdapter.js # Adaptador localStorage
│   │   └── firebaseAdapter.js     # Adaptador Firebase
│   ├── services/
│   │   └── payroll.js              # Lógica de cálculo CR
│   ├── views/
│   │   ├── employees.js            # Vista empleados
│   │   ├── attendance.js           # Vista asistencias
│   │   ├── extras.js               # Vista bonos/rebajos
│   │   ├── payroll.js              # Vista planillas
│   │   └── reports.js              # Vista reportes
│   ├── utils/
│   │   └── export.js               # Exportación PDF/Excel
│   └── firebase/
│       ├── init.js                 # Inicialización Firebase
│       └── config.example.js       # Plantilla config
└── README.md
```

## 🎨 Paleta de Colores

- **Primario**: Sky Blue (`#0ea5e9`)
- **Secundario**: Cyan (`#06b6d4`)
- **Éxito**: Emerald (`#10b981`)
- **Advertencia**: Amber (`#f59e0b`)
- **Peligro**: Red (`#ef4444`)
- **Texto**: Slate (`#0f172a`)

## 📱 Responsive Design

- **Desktop**: Vista completa con sidebar expandido
- **Tablet**: Sidebar colapsado con iconos
- **Mobile**: Navegación adaptable y grid de 1 columna

## 🛠 Tecnologías

- **HTML5**: Estructura semántica
- **CSS3**: Variables CSS, Grid, Flexbox, Animaciones
- **JavaScript ES6+**: Módulos, async/await
- **jsPDF**: Generación de PDFs
- **XLSX.js**: Exportación a Excel
- **Firebase**: Database en tiempo real (opcional)

## 📄 Licencia

Sistema desarrollado para uso en empresas costarricenses.

## 🇨🇷 Hecho en Costa Rica

Sistema diseñado específicamente para cumplir con la legislación laboral de Costa Rica.

---

**Desarrollado con ❤️ para empresas costarricenses**




