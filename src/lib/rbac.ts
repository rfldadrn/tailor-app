import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { AppRole } from "@/nav.config";

export async function requireUser(roles?: AppRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (roles && !roles.includes(session.user.role)) redirect("/dashboard");
  return session.user;
}
