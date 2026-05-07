# Firebase Setup Guide

Esta guía te ayudará a configurar Firebase para MiNegocioClaro.

## 1. Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear un proyecto" o "Add project"
3. Nombre del proyecto: `minegocioclaro` (o el nombre que prefieras)
4. Habilita Google Analytics (opcional pero recomendado)
5. Selecciona cuenta de Google Analytics
6. Haz clic en "Crear proyecto"

## 2. Configurar Firestore Database

1. En el menú lateral, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Modo de producción: Sí, comenzar en modo de producción
4. Región: `nam5 (us-central)` o la más cercana a tus usuarios
5. Haz clic en "Listo"

## 3. Configurar Authentication

1. En el menú lateral, ve a "Authentication"
2. Ve a la pestaña "Sign-in method"
3. Habilita los proveedores:
   - Email/Password: Habilitar
   - Google: Habilitar (necesitas configurar Google Cloud Console primero)

### Configurar Google OAuth (Opcional pero recomendado)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a "APIs & Services" > "Credentials"
4. Haz clic en "Create Credentials" > "OAuth 2.0 Client IDs"
5. Application type: Web application
6. Authorized JavaScript origins: `https://your-project-id.firebaseapp.com`
7. Authorized redirect URIs: `https://your-project-id.firebaseapp.com/__/auth/handler`
8. Copia el Client ID

## 4. Configurar Storage (Opcional)

1. En Firebase Console, ve a "Storage"
2. Haz clic en "Comenzar"
3. Modo de producción: Sí
4. Ubicación: Misma que Firestore
5. Haz clic en "Listo"

## 5. Obtener Credenciales Web SDK

1. En Firebase Console, ve a "Project settings" (icono de engranaje)
2. Desplázate hacia abajo a "Your apps"
3. Haz clic en el ícono de Web (`</>`)
4. App nickname: `MiNegocioClaro Web`
5. También configura Firebase Hosting: Sí
6. Copia la configuración (apiKey, authDomain, etc.)

## 6. Configurar Variables de Entorno

1. Copia `.env.example` a `.env.local`
2. Completa las variables con las credenciales de Firebase:

```bash
NUXT_PUBLIC_DATA_MODE=firebase
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NUXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## 7. Configurar Security Rules

1. En Firebase Console, ve a "Firestore Database" > "Rules"
2. Reemplaza las reglas por defecto con el contenido de `lib/adapters/firebase/security-rules.txt`
3. Haz clic en "Publicar"

## 8. Probar la Conexión

1. Ejecuta `npm run dev`
2. Cambia `NUXT_PUBLIC_DATA_MODE=firebase` en `.env.local`
3. Verifica que la app se conecte a Firebase (revisa la consola del navegador)
4. Si hay errores, verifica las credenciales y reglas de seguridad

## Troubleshooting

### Error: "Firebase: No Firebase App '[DEFAULT]' has been created"
- Verifica que todas las variables de entorno estén configuradas correctamente
- Asegúrate de que `NUXT_PUBLIC_DATA_MODE=firebase`

### Error: "Missing or insufficient permissions"
- Verifica las Security Rules de Firestore
- Asegúrate de que el usuario esté autenticado

### Error: "Invalid API key"
- Verifica que la API key sea correcta en Firebase Console
- Asegúrate de que no haya espacios extra en las variables de entorno

## Próximos Pasos

Una vez configurado Firebase:
1. Implementa el Firebase adapter (Fase 2 del plan)
2. Configura autenticación Firebase (Fase 3)
3. Agrega testing (Fase 4)
4. Configura CI/CD con Netlify (Fase 5)