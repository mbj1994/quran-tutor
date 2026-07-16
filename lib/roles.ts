export type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

export function getRoleCode(profile: ProfileRole | null) {
  const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  return role?.code ?? null;
}
