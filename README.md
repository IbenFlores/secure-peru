# 🛡️ SecurePeru

**SecurePeru** es una plataforma web interactiva y dashboard analítico desarrollado en Next.js. Permite visualizar, filtrar y analizar el historial de denuncias policiales a nivel nacional (departamentos, provincias y distritos) en el Perú, abarcando datos desde enero de 2018 hasta abril de 2026.

---

## 👥 Equipo y Roles

El desarrollo está dividido en 4 módulos principales (Feature-Driven) para un esfuerzo equitativo:

1. **Integrante 1 (Datos y Backend):** Ingesta de CSV, automatización, diseño de Base de Datos y endpoints de administración.
2. **Integrante 2 (Mapa Interactivo):** Renderizado de GeoJSON, coropletas departamentales y APIs geoespaciales.
3. **Integrante 3 (Dashboard Analítico):** Filtros globales, gráficos estadísticos (tendencias temporales y modalidades) y APIs de métricas.
4. **Integrante 4 (Navegación Local):** Rutas dinámicas por departamento, tablas de datos distritales paginadas y APIs de desglose.

---

## 💻 Requisitos Previos

Antes de clonar el proyecto, asegúrate de tener instalado en tu computadora:

* [Node.js](https://nodejs.org/) (Versión 20 LTS o superior).
* [Git](https://git-scm.com/).
* [PostgreSQL 17](https://www.postgresql.org/) (Corriendo localmente).

---

## 🚀 Configuración del Entorno Local

Sigue estos pasos estrictamente en orden para levantar el proyecto en tu máquina sin errores:

### 1. Clonar el repositorio e instalar dependencias
Abre tu terminal y ejecuta:

```bash
git clone [https://github.com/TU_USUARIO/SecurePeru.git](https://github.com/TU_USUARIO/SecurePeru.git)
cd SecurePeru
npm install
```

### 2. Configurar la Base de Datos (PostgreSQL)
Abre tu gestor de base de datos local (pgAdmin, DBeaver, o terminal) y crea una base de datos vacía llamada `secureperu_db`:

```sql
CREATE DATABASE secureperu_db;
```

### 3. Variables de Entorno
En la raíz del proyecto, crea un archivo llamado `.env` y agrega tu cadena de conexión. Reemplaza `TU_USUARIO` y `TU_CONTRASEÑA` por las credenciales de tu PostgreSQL local:

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_CONTRASEÑA@localhost:5432/secureperu_db?schema=public"
```
*(Nota para usuarios de Mac/Homebrew: Si tu Postgres no tiene contraseña, tu URL podría verse así: `postgresql://tu_usuario_mac@localhost:5432/secureperu_db?schema=public`)*

### 4. Inicializar Prisma (Migraciones y Cliente)
Ejecuta los siguientes comandos para que Prisma cree las tablas en tu base de datos y genere el cliente interno de TypeScript:

```bash
npx prisma migrate dev --name init_denuncias
npx prisma generate
```

---

## 📊 Poblado de Datos (Ingesta del CSV)

Para que los gráficos y mapas funcionen, necesitas poblar tu base de datos local con los +357,000 registros.

1. **Ubicar el archivo:** Crea una carpeta llamada `data` en la raíz del proyecto y coloca dentro el archivo exacto llamado `DATASET_Denuncias_Policiales_Ene 2018 a Abr 2026.csv`.
2. **Levantar el servidor:** ```bash
   npm run dev
   ```
3. **Disparar la ingesta:** Abre una **nueva pestaña** en tu terminal (dejando el servidor corriendo) y ejecuta:
   ```bash
   curl -X POST http://localhost:3000/api/admin/upload-csv
   ```
Verás en la consola del servidor cómo se insertan los registros por lotes. Espera a que termine (mensaje: *"Migración completada exitosamente"*).

---

## 🛠️ Flujo de Trabajo (Git Workflow)

Para evitar conflictos en el código, seguiremos estas reglas básicas:

1. **Nunca trabajes directamente en la rama `main`.**
2. Antes de empezar tu tarea, asegúrate de estar actualizado:
   ```bash
   git checkout main
   git pull origin main
   ```
3. Crea una rama para tu módulo o tarea:
   ```bash
   git checkout -b feature/nombre-de-tu-modulo
   ```
4. Sube tus cambios a tu rama:
   ```bash
   git add .
   git commit -m "feat: Agregado componente de mapa interactivo"
   git push origin feature/nombre-de-tu-modulo
   ```
5. Cuando termines, abre un **Pull Request (PR)** en GitHub para integrar tu código a `main`.

---

## 📚 Tecnologías Utilizadas

* **Framework:** Next.js (App Router)
* **Lenguaje:** TypeScript
* **Estilos:** Tailwind CSS
* **Base de Datos:** PostgreSQL 17
* **ORM:** Prisma v7 (con `@prisma/adapter-pg`)
