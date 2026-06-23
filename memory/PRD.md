# Fidelity Fabián Arenas — CRM

## Resumen
Aplicación CRM full-stack (React 19 + FastAPI + MongoDB) para Fidelity Fabián Arenas.
Gestión de clientes, vehículos, programa de fidelización, facturas y mailing.

## Stack
- Frontend: React 19, Tailwind, shadcn/ui, Radix UI
- Backend: FastAPI (Python 3.11), Motor (MongoDB async), bcrypt + JWT
- Base de datos: MongoDB

## Auth / Roles
- JWT en cookie HTTP-only `access_token` + Bearer header
- Roles: `admin` (gestión usuarios, mailing, bulk-delete) y `user`

## Funcionalidad principal
- **Clientes**: CRUD + import CSV + vehículos múltiples (matrícula+modelo)
- **Fidelización**: facturas con tipos `ninguno` / `acumular_2` (+2%) / `acumular_4` (+4%) / `gastar_saldo`
- **Usuarios (admin)**: crear, editar, reset password, eliminar (con guards seed/self)
- **Mailing (admin)**: listado de emails únicos para envíos
- **Bulk delete (admin)**: selección múltiple + eliminación masiva en Todos Los Clientes

## Cambios recientes (Feb 2026 — esta sesión)

### Refactor Code Quality Report
- `backend/server.py` descompuesto en helpers reutilizables:
  - `_csv_decode`, `_csv_detect_delimiter`, `_csv_build_header_map`, `_csv_validate_required_headers`,
    `_csv_split_multi`, `_csv_build_vehicle_pairs`, `_csv_parse_row`, `_csv_bulk_insert`
  - `_build_user_email_update`, `_build_user_role_update` (validaciones admin_update_user)
  - `_compute_invoice_amounts` (lógica facturas)
  - `_seed_user` (seed startup)
  - `_coerce_matricula_entry`, `_matriculas_from_legacy_string`, `_legacy_modelo`
  - `_clean_matriculas`
- Constantes CSV movidas a nivel módulo (`_CSV_BASE_HEADERS`, etc.)
- Frontend: AuthContext sin console statements, hooks con useCallback estable
- Nuevo hook `useDialogState` (separa isOpen/payload con cierre diferido 250ms)
- Páginas UsersAdmin / AllClients / Fidelizacion / Mailing refactorizadas con el hook
- AllClients: dialog body extraído a `ClientDetailBody` + `InvoicesSection`
- UsersAdmin: tabla a `UsersTable` + form a `CreateUserForm` + 3 sub-dialogs
- Ternarios anidados extraídos a funciones (`getDeleteTitle`, `getTipoButtonClass`) o IIFE
- `ImportClientsDialog`: `key={index}` → `key=${row}-${reason}` estable

### Bug fix: Radix `removeChild` error
- Patrón `useDialogState` mantiene `payload` durante animación de cierre (~250ms)
- DialogTitle/Description usan `<span>` para estabilizar text nodes (mitiga bug React 19)
- Lista actualizada vía `setTimeout(...,260)` tras cierre

### Color theme
- `<main>` y mobile tab bar cambiados a gris `#525354` (manteniendo sidebar negro)
- Cards `bg-zinc-950` se ven recessed sobre gris → buena jerarquía

### Bulk delete clientes
- Columna checkbox + "Select all filtered" en `/todos-clientes`
- Barra de acciones flotante (amarilla) con conteo + Limpiar + Eliminar seleccionados
- AlertDialog de confirmación con conteo
- Backend: endpoint preexistente `POST /api/clients/bulk-delete` (admin-only)

## Testing
- Backend pytest: **28/28 PASSED** (24 originales + 4 nuevos de invoice helpers)
- Frontend: smoke test de diálogos Edit/Cancel/Esc sin error overlay, bulk-bar verificada

## Credenciales test
Ver `/app/memory/test_credentials.md`.

## Roadmap pendiente / Backlog
- P2: Lint warnings preexistentes del React Compiler 19 (`set-state-in-effect`,
  `preserve-manual-memoization`) en data-loaders — no bloquean, no urgentes
- P2: Tests E2E Playwright para diálogos críticos + flujo bulk-delete
- P3: Exportar histórico de facturas por cliente a PDF
- P3: Audit log de eliminaciones bulk
