// Creates the pgvector extension and tables (sql/enable-pgvector.sql) before each build.
// Uses plain SQL instead of `prisma db push`, which would drop tables from other projects
// sharing the same Supabase database.
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.warn("[setup-db] No DIRECT_URL/DATABASE_URL set, skipping database setup.");
    return;
  }

  const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "enable-pgvector.sql"), "utf8");
  const statements = sql
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    for (const statement of statements) await prisma.$executeRawUnsafe(statement);
    console.log(`[setup-db] Database ready (${statements.length} statements).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[setup-db] Failed:", err.message);
  process.exit(1);
});
