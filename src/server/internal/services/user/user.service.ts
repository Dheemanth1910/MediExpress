import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NewUser, User } from "../../entities/user.entity";
import { CreateUserRequest, UpdateUserRequest, UserResponse } from "../../../shared/dtos/user.dto";
import { DrizzleUserRepository, UserRepository } from "../../repositories/user.repository";

const scryptAsync = promisify(scrypt);

export class UserServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "UserServiceError";
  }
}

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  name: user.name,
  subTenant: user.subTenant,
  email: user.email,
  roles: user.roles,
});

const hashPassword = async (password: string, salt = randomBytes(16).toString("hex")) => {
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return { passwordHash: derivedKey.toString("hex"), salt };
};

export class UserService {
  constructor(private readonly repository: UserRepository = new DrizzleUserRepository()) {}

  async create(input: CreateUserRequest): Promise<UserResponse> {
    if (await this.repository.findByEmail(input.email)) {
      throw new UserServiceError(409, "A user with this email already exists");
    }

    const password = await hashPassword(input.password);
    const newUser: NewUser = {
      name: input.name,
      subTenant: input.subTenant,
      email: input.email,
      passwordHash: password.passwordHash,
      salt: password.salt,
      roles: input.roles,
    };

    try {
      return toUserResponse(await this.repository.create(newUser));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserServiceError(409, "A user with this email already exists");
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserRequest): Promise<UserResponse> {
    const updates: Partial<NewUser> = {
      name: input.name,
      subTenant: input.subTenant,
      email: input.email,
      roles: input.roles,
    };

    if (input.password !== undefined) {
      const password = await hashPassword(input.password);
      updates.passwordHash = password.passwordHash;
      updates.salt = password.salt;
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key as keyof NewUser] === undefined) delete updates[key as keyof NewUser];
    });

    try {
      const updated = await this.repository.update(id, updates);
      if (!updated) throw new UserServiceError(404, "User not found");
      return toUserResponse(updated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserServiceError(409, "A user with this email already exists");
      }
      throw error;
    }
  }

  async info(id: string): Promise<UserResponse> {
    const user = await this.repository.findById(id);
    if (!user) throw new UserServiceError(404, "User not found");
    return toUserResponse(user);
  }
}

export const verifyPassword = async (password: string, user: User) => {
  const derivedKey = (await scryptAsync(password, user.salt, 64)) as Buffer;
  const expected = Buffer.from(user.passwordHash, "hex");
  return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
};

const isUniqueViolation = (error: unknown): error is { code: string } =>
  typeof error === "object" && error !== null && "code" in error && error.code === "23505";
