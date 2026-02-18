import createIntlMiddleware from "next-intl/middleware"
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { routing } from "@/i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

const authPages = ["/login", "/register"]

/**
 * Guard against open-redirect attacks: only allow callbackUrl values that are
 * relative paths starting with "/" and do not contain "//", which browsers
 * would interpret as a protocol-relative external URL.
 */
function isSafeCallbackPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Let intl middleware handle paths without a locale prefix (e.g. "/")
  if (!pathname.match(/^\/(en|de)/)) {
    return intlMiddleware(req)
  }

  const pathnameWithoutLocale = pathname.replace(/^\/(en|de)/, "") || "/"
  const isAuthPage = authPages.some((p) => pathnameWithoutLocale === p)
  const locale =
    pathname.match(/^\/(en|de)/)?.[1] || routing.defaultLocale

  const token = await getToken({ req })

  // Redirect authenticated users away from auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL(`/${locale}`, req.url))
  }

  // Redirect unauthenticated users to login for protected pages
  if (!isAuthPage && !token) {
    const loginUrl = new URL(`/${locale}/login`, req.url)
    // Only attach callbackUrl when it is a safe relative path; this prevents
    // an attacker from crafting a URL like /en/login?callbackUrl=//evil.com
    if (isSafeCallbackPath(pathname)) {
      loginUrl.searchParams.set("callbackUrl", pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
