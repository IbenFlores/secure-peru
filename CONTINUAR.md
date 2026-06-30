# Cómo continuar — Mapa de denuncias 🗺️

Guía para el siguiente integrante del equipo. Resume **qué ya está hecho**, **cómo
correrlo** y **qué falta**.

---

## 1. Qué está hecho

Mapa coroplético interactivo de Perú con **drill-down de 3 niveles** y un **panel
de datos a la derecha que se actualiza al entrar más adentro** (lo que pidió Iben):

- **Mapa SVG (D3)** que se colorea según la cantidad de denuncias, con zoom
  automático por nivel, breadcrumb, leyenda y tooltip al pasar el mouse.
- **Filtros** por año y modalidad (`/api/filtros`).
- **Panel lateral derecho** (`panel-delitos.tsx`): muestra el total, los registros
  y el desglose por modalidad de la zona en foco, además del ranking de regiones
  del nivel actual. Se actualiza al hacer clic en una zona (drill-down) o al
  cambiar filtros. En el nivel de distrito, al hacer clic se enfoca ese distrito.
- **Tests con vitest**, `docker-compose` para PostgreSQL local y README de setup.

### Archivos clave

| Archivo | Rol |
|---|---|
| `app/page.tsx` | Página principal (layout mapa + panel) |
| `app/components/mapa-peru.tsx` | Mapa SVG + estado + navegación drill-down |
| `app/components/panel-delitos.tsx` | Panel lateral de datos (total, modalidades, ranking) |
| `app/lib/geo-config.ts` | Config de los 3 niveles y helpers de código/nombre |
| `app/lib/mapa-validacion.ts` | Validación de parámetros de la API (testeable) |
| `app/api/mapa/route.ts` | Agrega denuncias por nivel (cruce por ubigeo) |
| `app/api/mapa/detalle/route.ts` | Detalle de una región para el panel |
| `app/api/filtros/route.ts` | Años y modalidades disponibles |
| `public/geo/*.geo.json` | Geometría de Perú (dep/prov/dist) |
| `tests/` | Pruebas unitarias e integración (vitest) |

### Idea clave: el cruce es por CÓDIGO de ubigeo, no por nombre

Los nombres son frágiles (acentos, "LIMA METROPOLITANA" vs "LIMA"). Por eso:

- Distrito = `ubigeo` de 6 dígitos (campo `IDDIST` del GeoJSON).
- Provincia = primeros **4** dígitos · Departamento = primeros **2**.

Como `ubigeo` se guarda como entero, **pierde el cero inicial** (Amazonas `01…` →
`1…`). En el SQL se rellena con `lpad(ubigeo::text, 6, '0')` antes de cortar el
prefijo.

---

## 2. Cómo correrlo

```bash
# 1. Dependencias
npm install

# 2. Base de datos PostgreSQL
#    Opción A — Docker (recomendado):
docker compose up -d
#    Opción B — tu propia BD: crea un .env con
#    DATABASE_URL="postgresql://usuario:password@host:5432/basedatos"

# 3. Migraciones + cliente Prisma
npx prisma migrate deploy
npx prisma generate

# 4. Cargar los datos del CSV
#    - Coloca el CSV en una carpeta 'data/' en la raíz
#    - Nombre: "DATASET_Denuncias_Policiales_Ene 2018 a Abr 2026.csv"
#    - Arranca el server y haz POST a /api/admin/upload-csv
#      curl -X POST http://localhost:3000/api/admin/upload-csv

# 5. Levantar y probar
npm run dev      # http://localhost:3000
npm test         # corre la suite de vitest
```

> Si una región sale **gris / con 0**, su `ubigeo` en la BD no coincide con el del
> GeoJSON. Verifica que el `UBIGEO_HECHO` del CSV sea el código INEI de 6 dígitos.

---

## 3. Qué falta / mejoras pendientes

- [ ] **Verificar con datos reales** que el mapa pinte y el panel muestre números
      (la suite de integración de la API se *salta* si no hay BD).
- [ ] **Gráfico de tendencia por año** en el panel (se puede agregar `porAnio` al
      endpoint `/api/mapa/detalle` y dibujarlo como mini-barras).
- [ ] **Resaltar en el mapa** la región que está en foco en el panel (hoy solo se
      resalta el distrito seleccionado en el nivel más profundo).
- [ ] **Accesibilidad**: foco por teclado en las zonas del SVG y `aria-label`.
- [ ] **Rendimiento**: `peru-distritos.geo.json` es grande; si va lento, filtrarlo
      por provincia en el servidor en vez de cargar todo y filtrar en el cliente.

---

## 4. Endpoints de la API

```
GET /api/mapa?nivel=departamento                 → todos los departamentos
GET /api/mapa?nivel=provincia&padre=15           → provincias del depto 15 (Lima)
GET /api/mapa?nivel=distrito&padre=1501          → distritos de la provincia 1501

GET /api/mapa/detalle?codigo=15                  → detalle del depto 15 (panel)
GET /api/mapa/detalle                            → detalle nacional

GET /api/filtros                                 → años y modalidades disponibles

# Filtros opcionales:  &anio=2024  &modalidad=HURTO
```

> Nota: `/api/mapa` usa el parámetro `padre` (código del nivel superior) y
> `/api/mapa/detalle` usa `codigo` (código completo de la región en foco).
