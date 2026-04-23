# Evalua V1 Commerce

Base inicial para una app web + movil (Android/iOS) con:
- Autenticacion por correo (Supabase Auth)
- Inventario
- Publicaciones de venta
- Diseno inspirado en evalua_V1

## 1) Requisitos
- Node.js 20+
- npm 10+
- Cuenta de Supabase
- Cuenta Expo (para compilar/publicar)

## 2) Estructura
- `app/`: aplicacion Expo React Native (web + Android + iOS)
- `supabase/`: esquema SQL inicial con seguridad RLS

## 3) Configurar Supabase
1. Crea un proyecto en Supabase.
2. Ejecuta `supabase/schema.sql` en el SQL Editor.
3. Copia `Project URL` y una clave valida para el cliente:
   - **Recomendado:** clave **anon** JWT (`eyJ...`) en **Project Settings > API Keys > pestana «Legacy anon, service_role»** (boton **Reveal** / **Copy** en la fila `anon`). Pegala en `app/.env` como `EXPO_PUBLIC_SUPABASE_ANON_JWT=...` o reemplaza `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   - La clave **Publishable** (`sb_publishable_...`) a veces falla con **Invalid API key** si esta incompleta o el proyecto aun valida distinto; si pasa, usa siempre la **anon** `eyJ...` como arriba.
   - Verifica localmente: `cd app` y luego `npm run verify-supabase` (debe imprimir HTTP distinto de **401**).

## 4) Configurar variables de entorno
En `app/` crea `.env` con:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_JWT=eyJ...anon_legacy...
```

Opcional: si no usas `ANON_JWT`, puedes usar solo `EXPO_PUBLIC_SUPABASE_ANON_KEY` con el mismo JWT `eyJ...`.

Si publicas con **GitHub Actions**, crea **Repository secrets** con los mismos nombres y valores: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` y, si lo usas, `EXPO_PUBLIC_SUPABASE_ANON_JWT`.

## 5) Ejecutar local
```bash
cd app
npm install
npm run web
```

Para movil:
```bash
npm run android
npm run ios
```

## 6) Publicar en tiendas
- Android (Google Play): `eas build -p android`
- iOS (App Store): `eas build -p ios`

Despues subes los binarios a cada tienda desde consola de Google y App Store Connect.
