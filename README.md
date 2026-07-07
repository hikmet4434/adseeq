# WinningHunter MVP

WinningHunter klonu için çalışan MVP:

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

Demo hesaplar:

```txt
Demo:
demo@winninghunter.local / demo1234

Admin:
admin@winninghunter.local / admin1234
```

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
docker compose exec app npm run db:seed
```

## Coolify deploy

1. Yeni proje oluştur.
2. Git repo veya ZIP kaynak olarak bu klasörü bağla.
3. Build type: Dockerfile.
4. Domain: `winninghunter.your-domain.com`.
5. Env:

```env
NEXT_PUBLIC_APP_URL=https://winninghunter.your-domain.com
DATABASE_URL=postgresql://...
AUTH_COOKIE_NAME=wh_session
AUTH_SESSION_DAYS=30
ADMIN_EMAILS=admin@winninghunter.local
```

6. İlk deploy sonrası terminal:

```bash
npx prisma db push
npm run db:seed
```

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
