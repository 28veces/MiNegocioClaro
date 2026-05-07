# Guía de Deployment - MiNegocioClaro

Esta guía explica cómo desplegar MiNegocioClaro a producción usando Netlify y Firebase.

## Arquitectura de Deployment

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │    Netlify      │    │   Firebase      │
│   Repository    │───►│    Hosting      │◄──►│   Backend       │
│                 │    │                 │    │                 │
│ • main branch   │    │ • SPA Hosting   │    │ • Firestore DB  │
│ • develop       │    │ • CDN Global    │    │ • Auth          │
│ • PR previews   │    │ • Auto-deploy   │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerrequisitos

- ✅ Proyecto Firebase configurado (ver [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
- ✅ Credenciales de Firebase en variables de entorno
- ✅ Cuenta de Netlify
- ✅ Repositorio en GitHub

## Configuración de Netlify

### 1. Conectar Repositorio

1. Ve a [Netlify Dashboard](https://app.netlify.com/)
2. Haz clic en "Add new site" > "Import an existing project"
3. Selecciona "Deploy with GitHub"
4. Autoriza acceso a tu repositorio
5. Selecciona el repositorio `minegocioclaro`

### 2. Configurar Build Settings

Netlify detectará automáticamente la configuración desde `netlify.toml`, pero verifica:

- **Build command**: `npm run build`
- **Publish directory**: `.output/public`
- **Node version**: 18

### 3. Configurar Environment Variables

En Netlify Dashboard > Site settings > Environment variables:

#### Para Producción (main branch)
```
NUXT_PUBLIC_DATA_MODE=firebase
NUXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_project_id.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NUXT_PUBLIC_FIREBASE_APP_ID=your_production_app_id
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

#### Para Staging (develop branch)
Usa un proyecto Firebase separado para staging:
```
NUXT_PUBLIC_DATA_MODE=firebase
NUXT_PUBLIC_FIREBASE_API_KEY=your_staging_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-staging-project-id.firebaseapp.com
# ... otras variables para staging
```

### 4. Configurar Branch Deploys

En Netlify Dashboard > Site settings > Build & deploy > Branches:

- **Branch to deploy**: `main` (producción)
- **Branches to deploy**: Agregar `develop` (staging)

### 5. Configurar Domain (Opcional)

1. Ve a Site settings > Domain management
2. Agrega tu dominio personalizado
3. Configura DNS según las instrucciones de Netlify

## Configuración de Firebase

### 1. Proyecto de Producción

1. Crea un proyecto Firebase separado para producción
2. Configura Firestore, Auth, Storage
3. Aplica las security rules desde `lib/adapters/firebase/security-rules.txt`
4. Habilita los proveedores de autenticación necesarios

### 2. Proyecto de Staging (Recomendado)

1. Crea otro proyecto Firebase para staging
2. Usa las mismas configuraciones que producción
3. Datos de staging pueden ser eliminados/reset sin afectar producción

### 3. Variables de Entorno

Asegúrate de que las variables en Netlify coincidan exactamente con las credenciales de Firebase Console.

## Estrategia de Deployment

### Git Flow

```
main (producción) ←── merge desde develop
  ↑
develop (staging) ←── merge desde feature branches
  ↑
feature/* ←── branches de desarrollo
```

### Deploy Automático

- **Push a `develop`**: Deploy a staging automáticamente
- **PR a `main`**: Netlify crea preview deploy
- **Merge a `main`**: Deploy a producción automáticamente

### Rollback

Si hay problemas en producción:
1. Revert el commit problemático en GitHub
2. Netlify redeploy automáticamente
3. O usa Netlify Dashboard > Deploys > Trigger deploy (seleccionar commit anterior)

## Monitoreo y Troubleshooting

### Logs de Netlify

1. Ve a Netlify Dashboard > Site > Functions (si usas serverless functions)
2. O Site > Deploys > Ver logs del build

### Logs de Firebase

1. Ve a Firebase Console > Functions (si usas)
2. O Firestore > Usage para ver requests
3. Authentication > Users para ver usuarios

### Debugging Común

#### Build falla
- Verifica que `npm run build` funciona localmente
- Revisa logs de Netlify build
- Verifica variables de entorno

#### App no carga
- Verifica Firebase credentials
- Revisa browser console para errores
- Verifica Firestore security rules

#### Auth no funciona
- Verifica Firebase Auth configuration
- Revisa authorized domains en Firebase Console
- Verifica Google OAuth credentials

## Costos

### Netlify (Gratis para MVP)
- 100GB bandwidth/mes
- 100 build minutes/mes
- 1 sitio web
- Funciones serverless: 125k invocations/mes

### Firebase (Spark Plan - Gratis)
- Firestore: 1GB storage, 50k reads/día
- Auth: 3k users
- Hosting: 10GB bandwidth (pero usamos Netlify)

## Security Checklist

- [ ] Variables de entorno no expuestas en código
- [ ] Firebase security rules aplicadas
- [ ] HTTPS habilitado en Netlify
- [ ] CORS configurado correctamente
- [ ] No secrets en client-side code
- [ ] Rate limiting en Firebase (si aplica)

## Próximos Pasos

1. **Configurar CI/CD** (GitHub Actions para tests)
2. **Agregar monitoring** (Sentry, LogRocket)
3. **Configurar backups** de Firestore
4. **Documentar runbooks** para operaciones comunes
5. **Configurar alerts** para downtime/costos