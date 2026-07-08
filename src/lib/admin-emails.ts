export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isConfiguredAdminEmail(email: string) {
  return getConfiguredAdminEmails().includes(email.trim().toLowerCase());
}
