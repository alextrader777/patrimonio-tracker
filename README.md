# 💰 Patrimonio Tracker

App web personal para llevar el seguimiento de patrimonio mes a mes con diseño liquid glass.

## ✨ Funciones

- 📈 Seguimiento de patrimonio mes a mes y multi-año
- 🌍 Precio USD/COP en tiempo real (actualización cada 5 min)
- 🎯 Meta anual con barra de progreso
- 📍 Proyección de fin de año según tu ritmo actual
- 🍩 Gráfica donut de distribución del portafolio por mes
- 💸 Flujo mensual: ingresos, gastos y tasa de ahorro
- ⚠️ Alertas de concentración de activos (+40%)
- 📊 Histórico multi-año con comparación
- ➕ Agrega años nuevos con un clic
- 📄 Exportar resumen a PDF
- 💾 Datos guardados en el navegador (cada usuario tiene los suyos)

---

## 🚀 Publicar en Vercel — Paso a paso

### PASO 1 — Instalar Git (si no lo tienes)

Descarga Git desde: https://git-scm.com/downloads  
Instálalo con las opciones por defecto.

Para verificar que quedó instalado, abre la terminal y escribe:
```
git --version
```

---

### PASO 2 — Crear cuenta en GitHub

1. Ve a https://github.com y crea una cuenta gratuita
2. Confirma tu correo

---

### PASO 3 — Crear repositorio en GitHub

1. Inicia sesión en GitHub
2. Click en el botón verde **"New"** (arriba a la izquierda)
3. En **Repository name** escribe: `patrimonio-tracker`
4. Selecciona **Private** (recomendado) o Public
5. **NO** marques ningún checkbox adicional
6. Click **"Create repository"**
7. GitHub te mostrará una página con instrucciones — déjala abierta

---

### PASO 4 — Subir el proyecto a GitHub

Descomprime el ZIP que descargaste. Verás una carpeta llamada `patrimonio-app`.

Abre la terminal:
- **Mac**: Spotlight (⌘ + Espacio) → escribe "Terminal"
- **Windows**: Menú Inicio → busca "cmd" o "PowerShell"

Navega hasta la carpeta del proyecto:
```bash
cd ruta/hasta/patrimonio-app
```
*(ejemplo en Mac: `cd Downloads/patrimonio-app`)*
*(ejemplo en Windows: `cd C:\Users\TuNombre\Downloads\patrimonio-app`)*

Ejecuta estos comandos uno por uno:
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/patrimonio-tracker.git
git push -u origin main
```

> ⚠️ Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.  
> La primera vez te pedirá tu usuario y contraseña de GitHub.

---

### PASO 5 — Publicar en Vercel

1. Ve a https://vercel.com
2. Click en **"Sign up"** → selecciona **"Continue with GitHub"**
3. Autoriza a Vercel a acceder a tu GitHub
4. Click en **"Add New Project"**
5. Busca `patrimonio-tracker` en la lista y click **"Import"**
6. Vercel detecta automáticamente que es Create React App:
   - Framework Preset: **Create React App** ✓
   - Build Command: `npm run build` ✓
   - Output Directory: `build` ✓
7. Click **"Deploy"**
8. Espera ~2 minutos ☕

Tu app estará en vivo en una URL como:
```
https://patrimonio-tracker-tuusuario.vercel.app
```

---

### PASO 6 — Compartir

Copia esa URL y compártela. Cada persona tiene sus propios datos guardados en su navegador — nadie ve los datos de los demás.

---

## 🔄 Actualizar la app en el futuro

Cada vez que quieras hacer cambios:
```bash
git add .
git commit -m "descripción del cambio"
git push
```
Vercel re-despliega automáticamente en ~1 minuto.

---

## 📁 Estructura del proyecto

```
patrimonio-app/
├── public/
│   └── index.html          ← página base
├── src/
│   ├── App.js              ← toda la app (componentes + datos + lógica)
│   └── index.js            ← entry point
├── .gitignore
├── package.json
└── README.md
```

---

## 💡 Primeros pasos en la app

1. Al abrir, ya tienes los datos de 2025 y 2026 cargados
2. Selecciona cualquier mes y explora el portafolio
3. Para agregar datos de mayo 2026 en adelante: selecciona el mes → **✎ editar**
4. Para configurar meta del año: click en **⚙**
5. Para ver histórico y proyección: click en **Resumen**
6. Para exportar: click en **↓ PDF**
