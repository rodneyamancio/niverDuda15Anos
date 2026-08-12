import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "admin_session";
const SESSION_HOURS = 24 * 7; // 7 dias

export type Role = "admin" | "superadmin";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não definido no .env");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionToken(role: Role): string {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${exp}.${role}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): Role | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [exp, role, signature] = parts;
  if (role !== "admin" && role !== "superadmin") return null;
  const expected = sign(`${exp}.${role}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) <= Date.now()) return null;
  return role;
}

export async function getRole(): Promise<Role | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function isAdmin(): Promise<boolean> {
  return (await getRole()) !== null;
}

export async function isSuperAdmin(): Promise<boolean> {
  return (await getRole()) === "superadmin";
}

export async function setSessionCookie(role: Role): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ---------- Senhas com hash no banco (fallback: senha em texto no .env) ----------

const PASSWORD_HASH_KEY: Record<Role, string> = {
  admin: "passwordHash:admin",
  superadmin: "passwordHash:superadmin",
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  return safeEqual(candidate, key);
}

async function getStoredHash(role: Role): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: PASSWORD_HASH_KEY[role] } });
  return row?.value ?? null;
}

/** Salva uma nova senha (hash scrypt) para o papel informado. */
export async function setPassword(role: Role, password: string): Promise<void> {
  const key = PASSWORD_HASH_KEY[role];
  const value = hashPassword(password);
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** Verifica se a senha bate com a do papel (hash do banco ou, na falta, .env). */
export async function verifyRolePassword(role: Role, password: string): Promise<boolean> {
  const hash = await getStoredHash(role);
  if (hash) return verifyHash(password, hash);
  const envPw = role === "superadmin" ? process.env.SUPER_ADMIN_PASSWORD : process.env.ADMIN_PASSWORD;
  return Boolean(envPw && safeEqual(password, envPw));
}

/** Retorna o papel correspondente à senha, ou null se não bater com nenhuma. */
export async function checkPassword(password: string): Promise<Role | null> {
  if (await verifyRolePassword("superadmin", password)) return "superadmin";
  if (await verifyRolePassword("admin", password)) return "admin";
  return null;
}
