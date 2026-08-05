import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { UserPlus } from "lucide-react";

export default function SignUp() {
  const { user, loading, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setSubmitting(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password);
    if (signUpError) {
      setError(signUpError);
      setSubmitting(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-xl border border-border bg-surface p-8 shadow-lg">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <UserPlus className="h-6 w-6 text-success" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Account created!
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              You&apos;re all set — you&apos;ve been signed in automatically.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary
                         transition-all duration-150 ease-out
                         hover:bg-primary-hover active:scale-[0.97]
                         focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-foreground tracking-tight">
            Venture Compass
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Create your competitive intelligence account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-dim
                           transition-colors duration-200
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-dim
                           transition-colors duration-200
                           focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary
                         transition-all duration-150 ease-out
                         hover:bg-primary-hover
                         active:scale-[0.97]
                         focus:outline-none focus:ring-2 focus:ring-ring
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            to="/sign-in"
            className="font-medium text-primary transition-colors duration-150 hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-ring rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
