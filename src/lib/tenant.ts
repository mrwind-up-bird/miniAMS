import { redirect } from "next/navigation"
import { auth } from "./auth"

export async function getTenantId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.tenantId) {
    // Redirecting prevents stack traces from leaking to the client and ensures
    // the browser lands on the login page instead of receiving an unhandled 500.
    redirect("/login")
  }
  return session.user.tenantId
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    redirect("/login")
  }
  return session
}
