import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type UserWithAvatarUrl = Doc<"users"> & { avatarUrl: string | null };

type StorageCtx = Pick<QueryCtx, "storage"> | Pick<MutationCtx, "storage">;

export async function docWithAvatarUrl(
  ctx: StorageCtx,
  user: Doc<"users">,
): Promise<UserWithAvatarUrl> {
  const avatarUrl =
    user.avatarStorageId != null
      ? await ctx.storage.getUrl(user.avatarStorageId)
      : null;
  return { ...user, avatarUrl };
}

export async function userWithAvatarUrl(
  ctx: StorageCtx,
  user: Doc<"users"> | null | undefined,
): Promise<UserWithAvatarUrl | null> {
  if (!user) return null;
  return docWithAvatarUrl(ctx, user);
}
