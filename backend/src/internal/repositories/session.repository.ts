import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db/client";
import { NewSession, Session, sessions } from "../entities/session.entity";

export interface SessionRepository {
  create(session: NewSession): Promise<Session>;
  findActiveByTokenHash(tokenHash: string, now: Date): Promise<Session | undefined>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
}

export class DrizzleSessionRepository implements SessionRepository {
  async create(session: NewSession) {
    const [created] = await db.insert(sessions).values(session).returning();
    return created;
  }

  async findActiveByTokenHash(tokenHash: string, now: Date) {
    const [session] = await db.select().from(sessions).where(and(
      eq(sessions.tokenHash, tokenHash),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, now),
    ));
    return session;
  }

  async revokeByTokenHash(tokenHash: string) {
    await db.update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
  }
}
