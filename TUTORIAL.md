# Setup Tutorial

## Step 1: Supabase database
Reuse an existing Supabase project or create a free one at https://supabase.com.
Click **Connect → ORMs → Prisma** and copy `DATABASE_URL` (port 6543, ends in `?pgbouncer=true`) and `DIRECT_URL` (port 5432), with your database password filled in.

The pgvector extension and tables are created automatically on every build by `scripts/setup-db.js`. To do it by hand instead, paste `sql/enable-pgvector.sql` into Supabase → **SQL Editor** and click **Run**.

## Step 2: Gemini API key (embeddings, free)
1. Go to https://aistudio.google.com/apikey and sign in with Google.
2. Click **Create API key** and put it in `GEMINI_API_KEY`.

## Step 3: Groq API key (answers, free)
Create one at https://console.groq.com/keys and put it in `GROQ_API_KEY`.

## Step 4: Deploy to Vercel
1. Import the repo at https://vercel.com/new.
2. Add `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY` and `GROQ_API_KEY` under **Environment Variables**.
3. Click **Deploy**. Then open the site and click **Try the sample document** to check everything works.
