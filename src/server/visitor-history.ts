import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import {
  db,
  sessionSecret,
  decryptMessage,
  transaction,
  consumeRate,
} from "./db";
import { cookie, cookieValue, visitor } from "./auth";
import { AppError } from "./http";

const cookieName = "gmc_visit_history";
const duration = 12 * 60 * 60;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const keyed = (scope: string, value: string) =>
  createHmac("sha256", sessionSecret).update(`${scope}:${value}`).digest("hex");
export const visitorOwner = (id: string) => keyed("submission-owner", id);
function pinHash(pin: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pin, salt, 32, { N: 16384, r: 8, p: 1 }, (error, result) =>
      error ? reject(error) : resolve(result),
    ),
  );
}
export function currentVisitorProfile(request: Request): string | null {
  db.prepare("DELETE FROM visitor_profile_sessions WHERE expires <= ?").run(
    Date.now(),
  );
  const token = cookieValue(request, cookieName);
  if (!token || token.length > 150) return null;
  const row = db
    .prepare(
      "SELECT profile_id FROM visitor_profile_sessions WHERE token_hash=? AND expires>?",
    )
    .get(digest(token), Date.now());
  return row ? String(row.profile_id) : null;
}
export function linkVisitorLeaf(profile: string, leaf: string, owner: string) {
  if (!db.prepare("SELECT 1 FROM visitor_profiles WHERE id=?").get(profile))
    return;
  const owned = db
    .prepare(
      "SELECT 1 FROM visitor_submissions WHERE leaf_id=? AND owner_key=? AND outcome='approved'",
    )
    .get(leaf, owner);
  if (!owned)
    throw new AppError(
      "This voice cannot be connected from this browser. Use the device that submitted it.",
      403,
      "NOT_YOUR_VOICE",
    );
  const linked = db
    .prepare("SELECT profile_id FROM visitor_profile_leaves WHERE leaf_id=?")
    .get(leaf);
  if (linked && linked.profile_id !== profile)
    throw new AppError(
      "This voice is already connected to another visit history.",
      403,
      "NOT_YOUR_VOICE",
    );
  db.prepare(
    "INSERT OR IGNORE INTO visitor_profile_leaves(leaf_id,profile_id,linked_at) VALUES(?,?,?)",
  ).run(leaf, profile, new Date().toISOString());
}
export function visitorLeafLinked(profile: string, leaf: string) {
  return Boolean(
    db
      .prepare(
        "SELECT 1 FROM visitor_profile_leaves WHERE profile_id=? AND leaf_id=?",
      )
      .get(profile, leaf),
  );
}
export async function unlockVisitorHistory(
  request: Request,
  input: {
    action: "remember" | "signin";
    cid: string;
    pin: string;
    leafId?: string;
  },
) {
  const session = visitor(request),
    cidHash = keyed("cid", input.cid);
  const perCid = consumeRate(`history:cid:${cidHash}`, 6, 15 * 60 * 1000);
  const perBrowser = consumeRate(
    `history:browser:${visitorOwner(session.id)}`,
    15,
    15 * 60 * 1000,
  );
  if (!perCid.allowed || !perBrowser.allowed)
    throw new AppError(
      "Please wait a little before trying to unlock your history again.",
      429,
      "RATE_LIMITED",
    );
  const owner = visitorOwner(session.id);
  if (input.action === "remember") {
    const owned = db
      .prepare(
        "SELECT 1 FROM visitor_submissions WHERE leaf_id=? AND owner_key=? AND outcome='approved'",
      )
      .get(input.leafId || "", owner);
    if (!owned)
      throw new AppError(
        "Open the submitted voice on the browser that created it to remember this visit.",
        403,
        "NOT_YOUR_VOICE",
      );
  }
  let profile = db
    .prepare(
      "SELECT id,pin_salt,pin_hash FROM visitor_profiles WHERE cid_hash=?",
    )
    .get(cidHash);
  const salt = profile
    ? String(profile.pin_salt)
    : randomBytes(16).toString("hex");
  const hashed = await pinHash(input.pin, salt);
  if (
    profile &&
    !timingSafeEqual(hashed, Buffer.from(String(profile.pin_hash), "hex"))
  )
    throw new AppError(
      "We couldn't unlock that history. Check your CID and private PIN.",
      401,
      "HISTORY_LOCKED",
    );
  if (!profile && input.action === "signin")
    throw new AppError(
      "We couldn't unlock that history. Check your CID and private PIN.",
      401,
      "HISTORY_LOCKED",
    );
  const token = randomBytes(32).toString("base64url");
  transaction(() => {
    if (!profile) {
      // The credential hash is indexed; the national identifier itself is never stored.
      db.prepare(
        "INSERT OR IGNORE INTO visitor_profiles(id,cid_hash,pin_salt,pin_hash,created_at) VALUES(?,?,?,?,?)",
      ).run(
        randomUUID(),
        cidHash,
        salt,
        hashed.toString("hex"),
        new Date().toISOString(),
      );
      profile = db
        .prepare(
          "SELECT id,pin_salt,pin_hash FROM visitor_profiles WHERE cid_hash=?",
        )
        .get(cidHash)!;
      if (
        profile.pin_salt !== salt ||
        profile.pin_hash !== hashed.toString("hex")
      )
        throw new AppError(
          "Please try unlocking your history again.",
          409,
          "HISTORY_LOCKED",
        );
    }
    if (input.action === "remember" && input.leafId)
      linkVisitorLeaf(String(profile!.id), input.leafId, owner);
    db.prepare(
      "INSERT INTO visitor_profile_sessions(token_hash,profile_id,expires) VALUES(?,?,?)",
    ).run(digest(token), String(profile!.id), Date.now() + duration * 1000);
  });
  return {
    profile: String(profile!.id),
    cookies: [
      cookie(cookieName, token, request, duration),
      ...(session.cookie ? [session.cookie] : []),
    ],
  };
}
export function visitorHistory(profile: string, page = 1) {
  const total = Number(
    db
      .prepare(
        "SELECT count(*) AS n FROM visitor_profile_leaves p JOIN approved_leaves l ON l.id=p.leaf_id WHERE p.profile_id=?",
      )
      .get(profile)!.n,
  );
  const rows = db
    .prepare(
      `SELECT l.id,l.leaf_message,l.category,l.chamber_id,l.created_at,l.status,s.private_message,s.private_reply,s.visit_kind
    FROM visitor_profile_leaves p JOIN approved_leaves l ON l.id=p.leaf_id
    LEFT JOIN visitor_submissions s ON s.leaf_id=l.id
    WHERE p.profile_id=? ORDER BY l.created_at DESC,l.id DESC LIMIT 5 OFFSET ?`,
    )
    .all(profile, (page - 1) * 5);
  return {
    authenticated: true,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 5)),
    voices: rows.map((row) => ({
      id: String(row.id),
      leaf_message: String(row.leaf_message),
      category: row.category,
      chamber_id: row.chamber_id,
      created_at: String(row.created_at),
      status: String(row.status),
      note: row.private_message
        ? decryptMessage(String(row.private_message))
        : null,
      reply: row.private_reply
        ? decryptMessage(String(row.private_reply))
        : null,
    })),
  };
}
export function endVisitorSession(request: Request, forget = false) {
  const profile = currentVisitorProfile(request),
    token = cookieValue(request, cookieName);
  transaction(() => {
    if (forget && profile) {
      db.prepare("DELETE FROM visitor_profile_leaves WHERE profile_id=?").run(
        profile,
      );
      db.prepare("DELETE FROM visitor_profile_sessions WHERE profile_id=?").run(
        profile,
      );
      db.prepare("DELETE FROM visitor_profiles WHERE id=?").run(profile);
    } else if (token)
      db.prepare("DELETE FROM visitor_profile_sessions WHERE token_hash=?").run(
        digest(token),
      );
  });
  return cookie(cookieName, "", request, 0);
}
