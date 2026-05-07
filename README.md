# MiNegocioClaro

Sistema de gestión financiera para negocios pequeños y medianos. Permite rastrear inversiones, gastos, ventas y participación de socios con análisis en tiempo real.

## 🚀 Características

- ✅ Gestión completa de negocios y socios
- ✅ Registro de entradas financieras (inversiones, gastos, ventas)
- ✅ Análisis de KPIs y ROI
- ✅ Timeline de auditoría completo
- ✅ Modo desarrollo offline (IndexedDB)
- ✅ Modo producción con Firebase
- ✅ Autenticación y control de permisos
- ✅ Interfaz responsive con Tailwind CSS

## 🛠️ Tecnologías

- **Frontend**: Nuxt 3 (Vue 3 + TypeScript)
- **Estado**: Pinia
- **UI**: Tailwind CSS + Chart.js
- **Backend**: Firebase (producción) / IndexedDB (desarrollo)
- **Testing**: Playwright (planeado)
- **Deployment**: Netlify

## 📋 Prerrequisitos

- Node.js 18+
- npm o pnpm
- Cuenta de Google (para Firebase)

## 🚀 Inicio Rápido

### 1. Clonar y Instalar

```bash
git clone <repository-url>
cd minegocioclaro
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` según el modo que quieras usar:

#### Modo Desarrollo (Offline)
```bash
NUXT_PUBLIC_DATA_MODE=local
```
- ✅ Sin configuración adicional
- ✅ Datos de demo incluidos
- ✅ Funciona sin internet

#### Modo Producción (Firebase)
```bash
NUXT_PUBLIC_DATA_MODE=firebase
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# ... completar todas las variables
```

Para configurar Firebase, sigue la [guía de setup](./FIREBASE_SETUP.md).

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## 📁 Estructura del Proyecto

```
minegocioclaro/
├── assets/css/           # Estilos globales
├── components/           # Componentes Vue reutilizables
├── composables/          # Composables de Vue
├── lib/
│   ├── adapters/         # Adaptadores de persistencia
│   │   ├── local/        # IndexedDB (desarrollo)
│   │   └── firebase/     # Firebase (producción)
│   └── repositories/     # Interfaces de datos
├── middleware/           # Middleware de Nuxt
├── pages/                # Páginas (file-based routing)
├── stores/               # Stores de Pinia
├── types/                # Definiciones TypeScript
└── utils/                # Utilidades
```

## 🔧 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run generate     # Generación estática
npm run preview      # Preview del build
npm run lint         # Linting (cuando esté configurado)
npm run test:e2e     # Tests e2e (cuando estén implementados)
```

## 🌐 Modos de Operación

### Desarrollo Offline
- Usa IndexedDB del navegador
- Incluye datos de demostración
- No requiere configuración de backend
- Ideal para desarrollo y testing local

### Producción con Firebase
- Persistencia en la nube
- Autenticación real con Firebase Auth
- Colaboración multi-usuario
- Seguridad granular con Firestore Rules

## 📚 Documentación

- [Arquitectura](./ARCHITECTURE.md) - Detalles técnicos del sistema
- [Setup de Firebase](./FIREBASE_SETUP.md) - Configuración de Firebase
- [Deployment](./DEPLOYMENT.md) - Guía de deployment (planeado)
- [Testing](./TESTING.md) - Guía de testing (planeado)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una branch para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 🙋‍♂️ Soporte

Para soporte técnico o preguntas:
- Abre un issue en GitHub
- Revisa la documentación
- Contacta al equipo de desarrollo

## 🚀 Roadmap

### Fase 1: MVP Core ✅
- Gestión de negocios y socios
- Entradas financieras
- Dashboard con KPIs
- Autenticación básica

### Fase 2: Producción (En Progreso)
- Firebase backend
- Testing automatizado
- CI/CD con Netlify
- Security audit

### Fase 3: Mejoras Futuras
- Mobile app (React Native)
- Export de reportes (PDF/Excel)
- Integraciones (bancos, contabilidad)
- Multi-tenancy
- API pública

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
