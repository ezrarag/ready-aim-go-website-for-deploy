export const DEFAULT_ADMIN_REDIRECT = "/dashboard/transportation"
export const DEFAULT_CLIENT_REDIRECT = "/dashboard/client"

export function isAdminRoute(pathname: string) {
  return pathname.startsWith("/admin") || (pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/client"))
}
