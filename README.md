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
* Una base de datos PostgreSQL. La forma más fácil es con [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluido en los pasos de abajo). Si prefieres, puedes usar un PostgreSQL instalado localmente.

---

## 🚀 Configuración del Entorno Local

Sigue estos pasos en orden para levantar el proyecto en tu máquina:

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/IbenFlores/secure-peru.git
cd secure-peru
npm install
```

### 2. Variables de entorno
Copia el archivo de ejemplo. Ya viene listo para la base de datos de Docker, no necesitas cambiar nada si usas la Opción A:

```bash
cp .env.example .env
```

### 3. Levantar la base de datos

**Opción A — Docker (recomendada, un solo comando):**

```bash
docker compose up -d
```
Esto crea un PostgreSQL con usuario/contraseña/base `secureperu` en el puerto `5435`.

**Opción B — PostgreSQL local:** crea una base de datos vacía llamada `secureperu` y ajusta el `DATABASE_URL` en tu `.env` con tus credenciales (ver comentarios dentro de `.env.example`).

### 4. Crear las tablas (Prisma)

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## 📊 Poblado de Datos (Ingesta del CSV)

Para que el mapa y los gráficos funcionen, necesitas poblar la base de datos con los +357,000 registros.

1. **Ubicar el archivo:** asegúrate de que el archivo `DATASET_Denuncias_Policiales_Ene 2018 a Abr 2026.csv` esté dentro de la carpeta `data/` en la raíz del proyecto.
2. **Levantar el servidor:**
```bash
npm run dev
```
3. **Disparar la ingesta:** abre una **nueva pestaña** en la terminal (deja el servidor corriendo) y ejecuta el `curl` apuntando al puerto que muestra `npm run dev` (normalmente `3000`):
   ```bash
   curl -X POST http://localhost:3000/api/admin/upload-csv
   ```
Espera a que termine (mensaje: *"Migración completada exitosamente"*). Luego abre el navegador en la URL que indica `npm run dev`.

---

## 🗺️ Cómo usar el mapa

El mapa es interactivo y tiene tres niveles de detalle:

1. Inicia mostrando el Perú coloreado **por departamento** (a más oscuro, más denuncias).
2. Haz **clic en un departamento** para ver sus **provincias**.
3. Haz **clic en una provincia** para ver sus **distritos**.
4. Usa el menú superior (Perú / Departamento / Provincia) para **volver atrás**.
5. Los filtros de **Año** y **Modalidad** aplican en cualquier nivel.

Los límites geográficos están en `public/geo/` (departamentos, provincias y distritos) y el cruce con los datos se hace por código de **ubigeo**.

---

## ✅ Pruebas

El proyecto usa [Vitest](https://vitest.dev/). Para correr todas las pruebas:

```bash
npm test
```

- Las pruebas **unitarias** (validación de la API, helpers del mapa, integridad de los GeoJSON) corren sin base de datos.
- Las pruebas de **integración** (`tests/mapa-api.integration.test.ts`) pegan al endpoint `/api/mapa` contra la base de datos. Se **saltan automáticamente** si no hay `DATABASE_URL`; para que corran, levanta la BD y carga los datos (pasos de arriba).

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
* **Mapa:** GeoJSON + d3-geo (coropletas con drill-down)
* **Base de Datos:** PostgreSQL 16+ (vía Docker o local)
* **ORM:** Prisma v7 (con `@prisma/adapter-pg`)
