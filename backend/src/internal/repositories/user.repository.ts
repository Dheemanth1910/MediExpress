import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { NewUser, User, users } from "../entities/user.entity";

export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  create(user: NewUser): Promise<User>;
  update(id: string, user: Partial<NewUser>): Promise<User | undefined>;
}

export class DrizzleUserRepository implements UserRepository {
  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async create(user: NewUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async update(id: string, user: Partial<NewUser>) {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }
}
