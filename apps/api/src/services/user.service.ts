import { prisma } from "../lib/prisma.js";
import { createClerkClient } from "@clerk/backend";

/**
 * Utility function to get an array of admin emails from env.
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

class UserService {
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor() {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("CLERK_SECRET_KEY is not set");
    }
    this.clerkClient = createClerkClient({ secretKey });
  }

  /**
   * Creates a user in the local database, and optionally sets admin role in Clerk if applicable.
   */
  public async createUser(clerkId: string) {
    const user = await prisma.user.create({
      data: { clerkId },
    });

    // Set admin role in Clerk if user should be admin
    await this.syncAdminRoleForClerkUser(clerkId);

    return user;
  }

  /**
   * Finds a user by Clerk ID from local DB.
   */
  public async getUserByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });
    return user;
  }

  /**
   * Gets or creates a user by Clerk ID, and syncs admin role if applicable.
   */
  public async getOrCreateUserByClerkId(clerkId: string) {
    let user = await this.getUserByClerkId(clerkId);
    if (!user) {
      user = await this.createUser(clerkId);
    } else {
      // Always ensure Clerk user metadata is synced
      await this.syncAdminRoleForClerkUser(clerkId);
    }
    return user;
  }

  /**
   * Sets Clerk public metadata role=admin if user's email is in ADMIN_EMAILS env,
   * otherwise removes admin role if not in list.
   */
  private async syncAdminRoleForClerkUser(clerkId: string) {
    const adminEmails = getAdminEmails();

    // Fetch Clerk user
    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    if (!clerkUser) return;

    // The best primary identifier on Clerk user is the primary email address
    const email = (clerkUser.emailAddresses?.[0]?.emailAddress ?? "")
      .trim()
      .toLowerCase();
    const isAdmin = adminEmails.includes(email);

    // Only update metadata if needed
    if (isAdmin && clerkUser.publicMetadata?.role !== "admin") {
      await this.clerkClient.users.updateUser(clerkId, {
        publicMetadata: { ...clerkUser.publicMetadata, role: "admin" },
      });
    } else if (!isAdmin && clerkUser.publicMetadata?.role === "admin") {
      // Remove admin role
      const { role, ...rest } = clerkUser.publicMetadata || {};
      await this.clerkClient.users.updateUser(clerkId, {
        publicMetadata: rest,
      });
    }
  }

  public async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
    });
  }

  public async isAdminClerkUser(clerkId: string) {
    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    if (!clerkUser) return false;
    return clerkUser.publicMetadata?.role === "admin";
  }
}

const userService = new UserService();

export default userService;
