"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await apiClient.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast.error(err.error || err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-950 to-surface items-center justify-center p-12">
        <div className="orb orb-brand w-96 h-96 -top-24 -left-24 opacity-60 absolute" />
        <div className="orb orb-violet w-72 h-72 bottom-0 right-0 opacity-40 absolute" />
        <div className="relative text-center">
          <h1 className="font-display text-5xl font-bold text-white mb-4">
            Homify<span className="gradient-text">.</span>
          </h1>
          <p className="text-text-muted text-lg leading-relaxed max-w-sm">
            AI-powered interior design that transforms your space from ordinary to extraordinary.
          </p>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="font-display font-bold text-white text-xl">
              Homify<span className="gradient-text">.</span>
            </span>
          </div>

          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-brand-400" />
                </div>
              </div>
              <h2 className="font-display text-3xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-text-muted text-sm mb-2">
                We&apos;ve sent a password reset link to
              </p>
              <p className="text-brand-400 font-medium mb-6">{email}</p>
              <p className="text-text-muted text-xs mb-8">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-brand-400 hover:text-brand-300 underline transition-colors"
                >
                  try again
                </button>
                .
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>

              <h2 className="font-display text-3xl font-bold text-white mb-1">Forgot password?</h2>
              <p className="text-text-muted text-sm mb-8">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="forgot-email"
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  className="mt-2"
                >
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
