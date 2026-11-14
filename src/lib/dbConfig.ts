/**
 * Database configuration — Neon Postgres connection string.
 * 
 * NEON DATABASE_URL (provided):
 * postgresql://neondb_owner:npg_nLVm1U7gAiYl@ep-lucky-poetry-bewcmcfc-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
 * 
 * This is used by the @neondatabase/serverless pool and the pg Pool for tests.
 * Set as DATABASE_URL environment variable in Vercel or .env file.
 */
export const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_nLVm1U7gAiYl@ep-lucky-poetry-bewcmcfc-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';