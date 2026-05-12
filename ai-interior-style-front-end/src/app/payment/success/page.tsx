"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tx_ref = searchParams.get("tx_ref");
  const sessionId = searchParams.get("session");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!tx_ref) {
      setStatus("error");
      setErrorMessage("No transaction reference found in the URL.");
      return;
    }

    const verifyTransaction = async () => {
      try {
        const res = await apiClient.verifyPayment(tx_ref, sessionId || undefined);
        const data = (res as any).data || res;

        if (data.success || data.status === "success" || data.status === "held_in_escrow") {
          setStatus("success");
          // Auto-redirect back to the AI session so user sees their unlocked designs
          if (sessionId) {
            setTimeout(() => {
              router.push(`/dashboard/ai?session=${sessionId}`);
            }, 2500);
          }
        } else {
          setStatus("error");
          setErrorMessage("Payment verification failed or payment was cancelled.");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.error || err.message || "An error occurred while verifying the payment.");
      }
    };

    verifyTransaction();
  }, [tx_ref, sessionId, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-surface-card border border-surface-border rounded-2xl p-8 text-center shadow-lg">

        {status === "loading" && (
          <div className="space-y-4 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
            <h2 className="text-2xl font-bold text-white">Verifying Payment...</h2>
            <p className="text-text-muted">Please wait while we confirm your transaction with Chapa.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-5 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
            <p className="text-text-muted">
              Your transaction has been verified. Your premium AI designs have been saved to your library.
              {sessionId && " Redirecting you back to your designs..."}
            </p>
            <div className="pt-4 w-full flex flex-col gap-3">
              {sessionId ? (
                <Link href={`/dashboard/ai?session=${sessionId}`}>
                  <Button fullWidth size="lg">
                    View My Designs <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/my-designs">
                  <Button fullWidth size="lg">
                    Go to My Design Library <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant="ghost" fullWidth>
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Payment Failed</h2>
            <p className="text-text-muted">{errorMessage}</p>
            <div className="pt-4 w-full flex gap-3">
              <Button variant="outline" fullWidth onClick={() => window.history.back()}>
                Go Back
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button fullWidth>Dashboard</Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
