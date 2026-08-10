# AdSeeQ

Meta reklamları, TikTok Shop ürünleri, trendler ve rakip markalar için çalışan reklam zekâsı platformu:

- Next.js 16 + React 19
- Prisma + PostgreSQL
- Email/password auth
- Plan/subscription/kota altyapısı
- Meta Ads search
- Store explorer + store detail
- Store tracker
- Saved ads/folders
- Pricing
- Admin data panel

## Lokal kurulum

```bash
npm install
cp .env.example .env
createdb winninghunter
npm run db:push
npm run db:seed
npm run dev
```

Üretimde hazır demo hesabı oluşturulmaz. Yalnızca yerel geliştirmede bilinçli olarak
`ENABLE_DEMO_ACCOUNTS=true` ayarlanırsa seed hesapları korunur.

## Production build

```bash
npm run build
PORT=3001 npm run start
```

Doğrulama:

```bash
curl http://localhost:3001/
curl http://localhost:3001/login
```

## Docker ile çalıştırma

```bash
cp .env.production.example .env
docker compose up -d --build
```

## Production operations

- Health endpoint: `GET /api/health`
- Daily intelligence: `POST /api/cron/daily-intelligence` with `Authorization: Bearer $CRON_SECRET`
- PostgreSQL backup: `npm run backup` (default retention: 14 days)
- External monitor check: `npm run health:check`; optional `ALERT_WEBHOOK_URL` receives failures
- Stripe webhook: `POST /api/billing/webhook`

## Coolify deploy

1. Yeni proje oluştur.
2. Git repo veya ZIP kaynak olarak bu klasörü bağla.
3. Build type: Dockerfile.
4. Domain: `adseeq.com`.
5. Env:

```env
NEXT_PUBLIC_APP_URL=https://adseeq.com
DATABASE_URL=postgresql://...
AUTH_COOKIE_NAME=wh_session
AUTH_SESSION_DAYS=30
ADMIN_EMAILS=owner@example.com
```

6. Uygulama başlangıcında şema, plan seed'i ve `ADMIN_EMAILS` yetkileri otomatik uygulanır.

## Vercel deploy

1. Vercel projesi oluştur.
2. PostgreSQL sağlayıcısı bağla: Neon/Supabase/Vercel Postgres.
3. `DATABASE_URL` ve diğer env değerlerini gir.
4. Build command:

```bash
prisma generate && next build
```

5. İlk deploy sonrası lokalden:

```bash
DATABASE_URL="production-url" npx prisma db push
DATABASE_URL="production-url" npm run db:seed
```

## Kalan V1 işleri

- Brand Tracker UI ve AI tagging job worker
- Magic AI embedding search
- TikTok Shop Explorer
- Trends
- MCP server/API credit dashboard
- Stripe checkout gerçek entegrasyonu
- OpenSearch/pg_trgm ile gelişmiş arama
