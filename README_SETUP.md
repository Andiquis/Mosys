# 🚀 MOSYS - Instrucciones de Ejecución

## 📋 Resumen del Sistema

**MOSYS** es un sistema web completo de gestión financiera personal desarrollado con tecnologías web puras (HTML5, CSS3, JavaScript ES6) y base de datos SQLite local.

## 🏗️ Estructura del Proyecto

```
📁 Mosys/
├── 📄 index.html          # Página principal
├── 📄 manifest.json       # Configuración PWA
├── 📄 sw.js              # Service Worker
├── 📄 README_SETUP.md    # Este archivo
├── 📁 css/
│   └── 📄 styles.css     # Estilos principales
├── 📁 js/
│   ├── 📄 app.js         # Controlador principal
│   ├── 📄 db.js          # Gestión de base de datos
│   ├── 📄 movimientos.js # Módulo de movimientos
│   ├── 📄 deudas.js      # Módulo de deudas
│   └── 📄 reportes.js    # Módulo de reportes
└── 📁 assets/            # Recursos (iconos, imágenes)
```

## 🚀 Cómo Ejecutar el Sistema

### Opción 1: Servidor Local Simple

```bash
# Navegar al directorio del proyecto
cd /home/andi/vXcode/Mosys

# Opción A: Python (si está instalado)
python3 -m http.server 8000

# Opción B: Node.js (si está instalado)
npx serve .

# Opción C: PHP (si está instalado)
php -S localhost:8000
```

Luego abre tu navegador en: `http://localhost:8000`

### Opción 2: Extensión Live Server (VS Code)

1. Instala la extensión "Live Server" en VS Code
2. Haz clic derecho en `index.html`
3. Selecciona "Open with Live Server"

### Opción 3: Abrir Directamente (Limitado)

⚠️ **Nota**: Debido a las políticas CORS, algunas funciones pueden no trabajar correctamente:

1. Abre el archivo `index.html` directamente en el navegador
2. Algunas funciones de SQLite pueden requerir servidor web

## ✨ Características Implementadas

### 🎯 Funcionalidades Principales

- ✅ **Dashboard Financiero** con resúmenes automáticos
- ✅ **Gestión de Movimientos** (Ingresos y Gastos) con CRUD completo
- ✅ **Gestión de Deudas y Créditos** con seguimiento de estados
- ✅ **Reportes Inteligentes** con gráficos interactivos
- ✅ **Base de Datos SQLite** local con persistencia
- ✅ **Interfaz Responsive** para móviles y desktop
- ✅ **PWA** (Progressive Web App) con funcionalidad offline
- ✅ **Exportar/Importar** datos en múltiples formatos

### 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6
- **Base de Datos**: SQLite (sql.js) - 100% en navegador
- **Gráficos**: Chart.js para visualizaciones
- **Iconos**: Font Awesome
- **PWA**: Service Worker para funcionamiento offline

### 📱 Compatibilidad

- ✅ **Navegadores Modernos**: Chrome, Firefox, Safari, Edge
- ✅ **Dispositivos Móviles**: Android, iOS
- ✅ **Responsive Design**: Tablet, Desktop
- ✅ **Offline**: Funcionalidad completa sin internet

## 🔧 Configuración Inicial

### Primera Ejecución

1. **Abrir la aplicación** en el navegador
2. La aplicación creará automáticamente:
   - Base de datos SQLite local
   - Categorías predeterminadas
   - Configuraciones iniciales
3. **Comenzar a usar** agregando movimientos financieros

### Categorías Predeterminadas

**Para Gastos:**

- 🍽️ Alimentación
- 🚗 Transporte
- 🏠 Vivienda
- ⚕️ Salud
- 📚 Educación
- 🎬 Entretenimiento

**Para Ingresos:**

- 💼 Salario
- 💻 Freelance
- 🏪 Negocio
- 📈 Inversiones

## 📊 Guía de Uso Rápido

### 1. Dashboard

- **Resumen**: Balance general, ingresos, gastos
- **Acciones Rápidas**: Botones para agregar movimientos
- **Gráficos**: Visualización de categorías y tendencias

### 2. Movimientos

- **Nuevo Movimiento**: Formulario para ingresos/gastos
- **Lista**: Tabla filtrable con todos los movimientos
- **Filtros**: Por tipo, categoría, fecha

### 3. Deudas/Créditos

- **Gestión**: Controla dinero que debes o te deben
- **Estados**: Pendiente, Pagado, Vencido
- **Seguimiento**: Fechas límite y recordatorios

### 4. Reportes

- **Análisis**: Gráficos automáticos por categorías
- **Tendencias**: Evolución temporal de finanzas
- **Métricas**: KPIs financieros clave

## 🔒 Privacidad y Seguridad

- ✅ **100% Local**: Todos los datos se almacenan en tu navegador
- ✅ **Sin Servidor**: No se envían datos a servidores externos
- ✅ **Privacidad Total**: Tus datos financieros nunca salen de tu dispositivo
- ✅ **Backup Local**: Exporta/importa cuando quieras

## 🛠️ Funciones Avanzadas

### Exportar/Importar Datos

- **Exportar**: Descarga tu base de datos completa
- **Importar**: Restaura desde backup previo
- **Formatos**: DB nativo, CSV para movimientos

### Configuraciones

- **Temas**: Claro, oscuro, automático
- **Moneda**: Formato de visualización
- **Backup**: Gestión de datos

## 🐛 Solución de Problemas

### Problema: No carga la aplicación

**Solución**:

- Verificar que uses un servidor web (no abrir archivo directamente)
- Verificar conexión a CDNs (Font Awesome, Chart.js, sql.js)

### Problema: Error de base de datos

**Solución**:

- Limpiar caché del navegador
- Verificar localStorage disponible
- Intentar en modo incógnito

### Problema: Funciones offline no funcionan

**Solución**:

- Verificar que el Service Worker esté registrado
- Abrir DevTools > Application > Service Workers

## 🚀 Próximos Pasos

### Mejoras Sugeridas

- 🔄 Sincronización multi-dispositivo
- 📱 App móvil nativa con Capacitor
- 🔗 Integración con APIs bancarias
- 🎯 Metas financieras y presupuestos
- 🤖 IA para análisis predictivo

## 📞 Soporte

- **Desarrollador**: [Andiquis](https://github.com/Andiquis)
- **Repositorio**: GitHub.com/Andiquis
- **Documentación**: readme.md en el proyecto

---

## 🎉 ¡Listo para Usar!

El sistema MOSYS está completamente funcional y listo para gestionar tus finanzas personales. Simplemente ejecuta uno de los métodos de servidor local y comienza a usar tu sistema financiero personal.

**¡Disfruta gestionando tus finanzas con MOSYS!** 💰✨
