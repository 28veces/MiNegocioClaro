# Arquitectura de MiNegocioClaro

## Overview

MiNegocioClaro es una aplicación Nuxt 3 SPA que utiliza un patrón de **Repository + Adapter** para abstraer el almacenamiento de datos. Esto permite cambiar entre diferentes backends (IndexedDB local para desarrollo, Firebase para producción) sin modificar la lógica de negocio.

## Arquitectura General

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nuxt Pages    │    │    Pinia        │    │  Repositories   │
│   & Components  │◄──►│    Stores       │◄──►│   Interface     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Local Adapter   │    │ Firebase        │    │ Future Adapter  │
│ (IndexedDB)     │    │ Adapter         │    │ (PostgreSQL)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Componentes Principales

### 1. Repositories (`lib/repositories/`)

Los repositories definen la interfaz de acceso a datos. Cada repository corresponde a un dominio de negocio:

- `AuthRepository`: Autenticación y gestión de usuarios
- `BusinessRepository`: CRUD de negocios y socios
- `FinanceRepository`: Gestión de entradas financieras
- `PersonRepository`: Gestión de personas
- `AuditRepository`: Timeline de auditoría

**Ejemplo de interfaz:**
```typescript
interface BusinessRepository {
  listBusinesses(session: AuthSession): Promise<Business[]>
  createBusiness(input: CreateBusinessInput): Promise<Business>
  // ... más métodos
}
```

### 2. Adapters (`lib/adapters/`)

Los adapters implementan los repositories para diferentes backends:

#### Local Adapter (`lib/adapters/local/indexeddb.ts`)
- Usa IndexedDB del navegador
- Persistencia local (sin servidor)
- Ideal para desarrollo offline
- Incluye datos de demo

#### Firebase Adapter (`lib/adapters/firebase/client.ts`)
- Usa Firestore Database
- Autenticación con Firebase Auth
- Almacenamiento en la nube
- Reglas de seguridad granular

### 3. Stores Pinia (`stores/`)

Los stores manejan el estado de la aplicación y llaman a los repositories:

- `auth.ts`: Estado de autenticación
- `businesses.ts`: Estado de negocios y operaciones CRUD
- `persons.ts`: Estado de personas
- `audit.ts`: Estado de timeline de auditoría
- `toast.ts`: Estado de notificaciones

### 4. Configuración (`nuxt.config.ts`)

La configuración determina qué adapter usar:

```typescript
runtimeConfig: {
  public: {
    dataMode: process.env.NUXT_PUBLIC_DATA_MODE ?? 'firebase' // 'local' | 'firebase'
  }
}
```

## Flujo de Datos

### Lectura de Datos
1. Componente/Página llama a store action
2. Store llama a `useRepositories()` para obtener el adapter correcto
3. Repository ejecuta la consulta en el backend apropiado
4. Datos regresan por la misma cadena

### Escritura de Datos
1. Componente/Página llama a store action con datos
2. Store valida datos localmente
3. Store llama a repository para persistir
4. Repository ejecuta la operación en el backend
5. Store actualiza estado local si es necesario
6. Se generan eventos de auditoría automáticamente

## Modos de Operación

### Modo Local (`NUXT_PUBLIC_DATA_MODE=local`)
- ✅ Desarrollo offline
- ✅ Sin configuración de backend
- ✅ Datos de demo incluidos
- ✅ Rápido para desarrollo
- ❌ No hay persistencia real
- ❌ No hay usuarios reales
- ❌ No hay colaboración

### Modo Firebase (`NUXT_PUBLIC_DATA_MODE=firebase`)
- ✅ Persistencia en la nube
- ✅ Autenticación real
- ✅ Colaboración multi-usuario
- ✅ Seguridad granular
- ✅ Escalabilidad
- ❌ Requiere configuración
- ❌ Dependencia de internet
- ❌ Costos de Firebase

## Seguridad

### En Modo Local
- Sin autenticación real (solo simulación)
- Datos almacenados localmente en IndexedDB
- No hay validaciones de permisos

### En Modo Firebase
- Autenticación con Firebase Auth
- Reglas de seguridad en Firestore
- Validación de permisos por rol (admin, user, partner)
- Encriptación en tránsito y reposo

## Migración de Datos

Para migrar datos del modo local al modo Firebase:

1. Exportar datos desde IndexedDB
2. Transformar al formato de Firestore
3. Importar a Firebase usando scripts de migración
4. Actualizar referencias de IDs si es necesario

## Testing

### Unit Tests
- Repositories: Mock adapters para testing
- Stores: Test lógica de estado
- Components: Test UI y interacciones

### Integration Tests
- End-to-end con Playwright
- Test flujos completos (login → crear negocio → agregar socio)
- Test en ambos modos (local y firebase)

## Deployment

### Desarrollo
- Modo local por defecto
- Hot reload con `npm run dev`
- IndexedDB persiste entre sesiones

### Staging
- Modo Firebase con proyecto de staging
- Deploy automático desde branch `develop`
- Netlify previews para PRs

### Producción
- Modo Firebase con proyecto de producción
- Deploy automático desde branch `main`
- CDN global con Netlify

## Extensibilidad

Para agregar un nuevo backend (ej: PostgreSQL):

1. Crear nuevo adapter en `lib/adapters/postgresql/`
2. Implementar todos los repositories
3. Agregar case en `useRepositories()`
4. Configurar nueva variable de entorno
5. Actualizar documentación

## Consideraciones de Performance

### IndexedDB (Local)
- ✅ Muy rápido para operaciones locales
- ✅ Sin latencia de red
- ❌ Limitado por almacenamiento del navegador
- ❌ No escalable

### Firestore (Firebase)
- ✅ Bajo latencia global
- ✅ Auto-escalable
- ✅ Offline-first con sync
- ❌ Costos por uso
- ❌ Dependencia de Google Cloud

## Monitoreo y Observabilidad

### En Desarrollo
- Vue DevTools para estado
- Browser DevTools para IndexedDB
- Console logs para debugging

### En Producción
- Firebase Console para métricas
- Sentry para error tracking
- Google Analytics para uso
- Netlify Analytics para performance