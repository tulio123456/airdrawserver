# AirDraw Server FINAL

Versão simplificada para Vercel.

## O que foi removido

- Sem cookies de sessão.
- Sem SESSION_SECRET.
- Sem rewrite para /admin.
- Sem pasta lib.
- Sem multipart/form-data.

Isso reduz bastante os pontos de falha.

## Variáveis

No projeto Server da Vercel:

```env
ADMIN_PASSWORD=SUA_SENHA
ALLOWED_ORIGINS=https://URL-DO-CLIENT.vercel.app
```

O Blob precisa estar conectado ao MESMO projeto. A variável
`BLOB_READ_WRITE_TOKEN` deve aparecer automaticamente no deployment.

## Teste 1

Abra:

```text
https://SEU-SERVER.vercel.app/api/health
```

Você precisa ver:

```json
{
  "ok": true,
  "blobConfigured": true,
  "adminConfigured": true,
  "originsConfigured": true
}
```

## Teste 2

Abra diretamente:

```text
https://SEU-SERVER.vercel.app/admin.html
```

Não use `/admin` nesta versão.

## Client

No `config.js` do Client:

```js
PHOTO_SERVER_URL: "https://SEU-SERVER.vercel.app"
```

No Server:

```env
ALLOWED_ORIGINS=https://URL-DO-CLIENT.vercel.app
```

Depois de mudar Environment Variables, faça Redeploy.
