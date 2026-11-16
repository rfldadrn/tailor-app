import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "ADMIN" | "VIEWER";
      orgId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "OWNER" | "ADMIN" | "VIEWER";
    orgId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "OWNER" | "ADMIN" | "VIEWER";
    orgId: string;
  }
}
