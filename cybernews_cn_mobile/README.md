# CyberNews CN — Aplicación Móvil (Android & iOS) + Push Worker

Arquitectura ultraligera (<12 MB instalada), **Zero-Login** (sin cuentas ni rastreo de usuario) y **Hardened Security** para noticias de ciberseguridad en tiempo real.

## 1. Stack Tecnológico Elegido (Rápido y Sencillo)
- **App Móvil (Android & iOS):** **React Native con Expo (TypeScript)** (`mobile/`). Un único código base compilable a APK/AAB (Android) e IPA (iOS) mediante EAS Build, con interfaz inspirada en Google Discover en modo oscuro OLED (`#0B0F19`).
- **Agregador RSS y Motor Push Sin Servidor:** **Cloudflare Workers + KV + Firebase Cloud Messaging (FCM)** (`backend-worker/`). Costo $0 en capa gratuita, sin servidores que mantener ni bases de datos de usuarios.
- **Privacidad Total (Zero-Login):** Los dispositivos se suscriben únicamente al tópico público anónimo `cybernews_global` en FCM. Los favoritos se guardan localmente en el dispositivo con `AsyncStorage`.

## 2. Lógica Exacta del Motor de Push Notifications (Regla de 3 Horas)
Implementada en `backend-worker/src/worker.ts`:
1. Un Cron Trigger ejecuta el Worker cada 10 minutos y consulta los 12 feeds RSS verificados.
2. Si **NO** hay noticias nuevas desde el último hash registrado (`last_seen_guid`), el Worker termina en silencio.
3. Si **HAY** una noticia nueva de alta prioridad:
   - Verifica el timestamp `last_push_sent_at` en Cloudflare KV.
   - **Caso A (`ahora - last_push_sent_at >= 3 horas`):** Envía inmediatamente la notificación Push al tópico `cybernews_global` y **reinicia el temporizador** (`last_push_sent_at = ahora`). Incluso si pasaron 4, 6 o 12 horas sin noticias, en cuanto sale la primera noticia nueva se envía al instante y el contador de 3 horas arranca desde ese momento.
   - **Caso B (`ahora - last_push_sent_at < 3 horas`):** No hace spam. Guarda la noticia más relevante en `pending_digest_item` para enviarla exactamente cuando se cumpla la ventana de 3 horas.

## 3. Las 12 Fuentes Oficiales de Ciberseguridad Integradas
1. **The Hacker News** (`https://feeds.feedburner.com/TheHackersNews`)
2. **BleepingComputer** (`https://www.bleepingcomputer.com/feed/`)
3. **Krebs on Security** (`https://krebsonsecurity.com/feed/`)
4. **CISA Cybersecurity Advisories** (`https://www.cisa.gov/cybersecurity-advisories/all.xml`)
5. **SecurityWeek** (`https://www.securityweek.com/feed/`)
6. **Dark Reading** (`https://www.darkreading.com/rss.xml`)
7. **The Record by Recorded Future** (`https://therecord.media/feed`)
8. **SANS Internet Storm Center (ISC)** (`https://isc.sans.edu/rssfeed.xml`)
9. **Schneier on Security** (`https://www.schneier.com/feed/atom/`)
10. **Palo Alto Networks Unit 42** (`https://unit42.paloaltonetworks.com/feed/`)
11. **Reddit r/netsec (Foro Técnico)** (`https://www.reddit.com/r/netsec/.rss`)
12. **Zero Day Initiative (ZDI)** (`https://www.zerodayinitiative.com/rss/published/`)

## 4. Seguridad (App Hardening / OWASP MASVS)
- **Sanitización Estricta de XML/HTML:** El Worker limpia cualquier etiqueta `<script>`, `<iframe>`, `onload` o payloads XSS antes de entregar el JSON a la app.
- **Validación de Esquemas de URL:** Solo se permiten enlaces `https://` cuyos dominios coincidan con la lista blanca (allowlist) de las 12 fuentes oficiales (previene ataques de `javascript:` o `intent:` spoofing).
- **Sin Almacenamiento de PII:** Cero cookies de rastreo, cero cuentas de usuario, cero tokens personales en base de datos.
- **TLS 1.3 + Certificate Pinning Ready:** Tráfico cifrado de extremo a extremo entre la app y el Worker.
