import type { UserWithAvatarUrl } from "./userAvatar";

/** Directory / peer-facing user shape (no email). */
export type PublicUserWithAvatar = Omit<UserWithAvatarUrl, "email">;

export function withoutEmail<T extends { email: string }>(
  u: T,
): Omit<T, "email"> {
  const { email: _omit, ...rest } = u;
  void _omit;
  return rest;
}
