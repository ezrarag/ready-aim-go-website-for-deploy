export type AllowlistEntry = {
  email: string
  clientName: string
  clientSlug: string
  addedBy: string
  addedAt: string
  active: boolean
  notes: string
}

export function emailToDocId(email: string): string {
  return email.trim().toLowerCase().replace(/\./g, "_")
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}
