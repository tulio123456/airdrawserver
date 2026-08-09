# AirDraw Server

Servidor Vercel para o AirDraw com suporte a gravações curtas e capturas antigas.

## Variáveis na Vercel

```env
ADMIN_PASSWORD=SUA_SENHA
ALLOWED_ORIGINS=https://URL-DO-CLIENT.vercel.app
```

Conecte o Vercel Blob ao mesmo projeto para obter `BLOB_READ_WRITE_TOKEN`.

## Endpoints

- `POST /api/recordings` recebe clipes `video/webm` ou `video/mp4`.
- `POST /api/captures` continua disponível apenas para compatibilidade.
- `/admin.html` lista gravações e capturas antigas.

## Client

No `config.js` do Client:

```js
SERVER_URL: "https://SEU-SERVER.vercel.app",
RECORDING_INTERVAL_MS: 172800000,
RECORDING_DURATION_MS: 20000,
RECORDING_VIDEO_BITS_PER_SECOND: 400000
```

`172800000` ms = 48 horas. O navegador precisa estar aberto para gravar; não existe gravação em segundo plano com a página fechada.

Depois de alterar Environment Variables, faça Redeploy.
