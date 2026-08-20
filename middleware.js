import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/facilitator",
  "/admin",
  "/superadmin",
  "/module-player",
  "/gradesubmissions",
  "/studentsubmissionspage",
  "/previousuploads",
  "/sor",
];

const ROLE_PREFIXES = {
  "/facilitator": ["facilitator"],
  "/admin": ["institution_admin", "superadmin"],
  "/superadmin": ["superadmin"],
  "/gradesubmissions": ["facilitator", "institution_admin", "superadmin"],
  "/studentsubmissionspage": ["facilitator", "institution_admin", "superadmin"],
  "/previousuploads": ["facilitator", "institution_admin", "superadmin"],
};

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const redirectUrl = new URL("/auth/signin", request.url);
    redirectUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, institutions(status)")
      .eq("id", user.id)
      .single();

    if (profile?.is_active === false) {
      return NextResponse.redirect(new URL("/account-suspended", request.url));
    }

    if (profile?.institutions?.status === "suspended" && profile.role !== "superadmin") {
      return NextResponse.redirect(new URL("/account-suspended", request.url));
    }

    const rolePrefix = Object.keys(ROLE_PREFIXES).find((p) => path.startsWith(p));
    if (rolePrefix) {
      const allowedRoles = ROLE_PREFIXES[rolePrefix];
      if (!profile || !allowedRoles.includes(profile.role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/facilitator/:path*",
    "/admin/:path*",
    "/module-player/:path*",
    "/gradesubmissions/:path*",
    "/studentsubmissionspage/:path*",
    "/previousuploads/:path*",
    "/sor/:path*",
  ],
};