# Predios App Demo

Identificador inteligente de predios para parqueaderos en capitales colombianas.

## Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Mapbox GL JS
- **Database**: Supabase (PostgreSQL + PostGIS)
- **ETL**: Python 3.11
- **AI**: Claude API (Anthropic)
- **Deploy**: Vercel

## Estructura
```
predios-app-demo/
├── apps/web/          # Next.js app
├── packages/etl/      # Python ingestion scripts
├── supabase/          # SQL migrations
└── .github/workflows/ # CI/CD
```

## Setup
1. Copy `.env.example` to `.env.local` in `apps/web/`
2. Fill in Supabase credentials
3. Run migrations in Supabase SQL editor
4. `cd apps/web && npm install && npm run dev`

## ETL
```bash
cd packages/etl
pip install -r requirements.txt
python demo_seed.py
```
