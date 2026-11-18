import { Suspense } from "react";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

async function authenticate(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=credentials");
    throw error;
  }
}

function LoginForm({ error }: { error?: string }) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">RJ</span>
          <span><strong>Ruang Jahit</strong><small>Keuangan usaha</small></span>
        </div>
        <h1>Masuk ke buku kas</h1>
        <p className="login-intro">Catat pemasukan dan pengeluaran Tailor Bu Rina.</p>
        <form action={authenticate} className="form-stack">
          <label className="field">
            Email
            <input autoComplete="username" name="email" placeholder="nama@usaha.id" required type="email" />
          </label>
          <label className="field">
            Kata sandi
            <input autoComplete="current-password" name="password" placeholder="Masukkan kata sandi" required type="password" />
          </label>
          {error && <p className="form-error" role="alert">Email atau kata sandi tidak sesuai.</p>}
          <button className="button button-primary button-wide" type="submit">Masuk</button>
        </form>
        <p className="login-footnote">Akses hanya untuk pengguna yang terdaftar.</p>
      </section>
    </main>
  );
}

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <LoginForm error={error} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<LoginForm />}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}
