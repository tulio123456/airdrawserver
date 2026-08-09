# AirDraw Server — Cloudflare R2

Este servidor mantém os mesmos endpoints do AirDraw, mas **não usa mais Vercel Blob**.
Capturas, gravações e partes temporárias são salvas em um bucket privado do **Cloudflare R2**.

## 1. Crie o bucket no Cloudflare R2

No Cloudflare Dashboard:

1. Abra **R2 Object Storage**.
2. Crie um bucket, por exemplo `airdraw-media`.
3. Mantenha o bucket privado.
4. Crie uma credencial R2/S3 com permissão de leitura e escrita nesse bucket.

Você receberá:

- Account ID
- Access Key ID
- Secret Access Key

## 2. Variáveis na Vercel

Em **Vercel > projeto do Server > Settings > Environment Variables**, configure:

```env
ADMIN_PASSWORD=SUA_SENHA
ALLOWED_ORIGINS=https://SEU-CLIENT.vercel.app
R2_ACCOUNT_ID=SEU_ACCOUNT_ID_CLOUDFLARE
R2_ACCESS_KEY_ID=SUA_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=SUA_SECRET_ACCESS_KEY
R2_BUCKET_NAME=airdraw-media
```

`BLOB_READ_WRITE_TOKEN` não é mais necessário.

## 3. CORS do bucket R2

O Admin usa URLs temporárias assinadas para carregar as mídias diretamente do R2. Por isso o bucket precisa permitir `GET`/`HEAD` vindos do domínio do Admin.

Abra **R2 > seu bucket > Settings > CORS Policy** e cole o conteúdo de `r2-cors.json`.

Antes, troque:

```text
https://airdrawserver.vercel.app
```

pelo domínio real onde o seu AirDraw Server/Admin está publicado.

## 4. Deploy

Faça deploy/redeploy do Server na Vercel depois de adicionar as variáveis.

Abra:

```text
https://SEU-SERVER.vercel.app/api/health
```

O retorno deve conter:

```json
{
  "storage": "cloudflare-r2",
  "r2Configured": true
}
```

## Estrutura no R2

```text
captures/
  ...jpg

recordings/
  ...webm
  ...mp4

recording-parts/
  <id-da-gravacao>/
    ...part
```

As partes temporárias são removidas quando o vídeo final é concluído.

## Endpoints mantidos

- `POST /api/captures`
- `POST /api/recordings`
- `POST /api/recording-chunk`
- `POST /api/recording-finalize`
- `GET /api/admin-list`
- `GET /api/admin-file`
- `DELETE /api/admin-delete`
- `GET /api/admin-check`
- `GET /api/health`

O Client continua usando `SERVER_URL` normalmente e não recebe nenhuma chave secreta do R2.
