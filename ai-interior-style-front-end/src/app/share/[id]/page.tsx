"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ArrowRight, Home, LayoutDashboard } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";

export default function SharedRecommendationPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppStore();

  useEffect(() => {
    const fetchSharedRec = async () => {
      try {
        setLoading(true);
        const res = await apiClient.getSharedRecommendation(id as string);
        setData(res);
      } catch (err: any) {
        console.error("Failed to fetch shared recommendation:", err);
        setError(err.error || "This recommendation could not be found.");
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchSharedRec();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-white">Loading Design...</h2>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-surface-card border border-surface-border p-8 rounded-2xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Design Not Found</h2>
          <p className="text-text-muted mb-6">{error || "The link might be broken or expired."}</p>
          <Link href="/">
            <Button fullWidth>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSession = !!data.recommendations;
  const recs = isSession ? data.recommendations : [data.recommendation];
  const { sessionInfo } = data;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border bg-surface-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-sm group-hover:scale-105 transition-transform">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white">Homify</span>
          </Link>
          
          <div>
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" variant="ghost">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/auth/register">
                <Button size="sm">Get Your Own Designs <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-brand-600/20 text-brand-300 text-xs font-semibold mb-4 border border-brand-500/30">
            {isSession ? "AI Design Session" : "AI Design Recommendation"}
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-3">
            {sessionInfo.metadata.style || "Custom"} {sessionInfo.metadata.roomType || "Room"} Design
          </h1>
          <p className="text-text-muted text-lg">
            A beautiful, AI-generated interior design concept created on Homify.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {recs.map((rec: any, idx: number) => (
            <Card key={rec.id || idx} className="overflow-hidden group flex flex-col h-full bg-surface-card hover:border-brand-500/50 transition-all duration-300">
              {/* Image */}
              <div className="aspect-[4/3] w-full relative overflow-hidden bg-surface-hover">
                {rec.imageUrl ? (
                  <img
                    src={rec.imageUrl}
                    alt={rec.name || "Design Recommendation"}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    No image available
                  </div>
                )}
                {rec.isPremium && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-gold-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                    Premium
                  </div>
                )}
              </div>
              
              <CardBody className="flex-1 flex flex-col p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-xl text-white">{rec.name || "Design Concept"}</h3>
                  <div className="text-right">
                    <span className="block text-sm font-semibold text-emerald-400">{rec.price}</span>
                    <span className="block text-[10px] text-text-muted">Est. Budget</span>
                  </div>
                </div>
                
                <p className="text-text-muted text-sm mb-6 flex-1">
                  {rec.description || "A beautifully crafted interior design concept."}
                </p>

                {/* Key Elements */}
                {rec.products && rec.products.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Key Elements</h4>
                    <ul className="flex flex-wrap gap-2">
                      {rec.products.slice(0, 4).map((p: string, i: number) => (
                        <li key={i} className="px-2 py-1 bg-surface-hover text-xs text-text-muted rounded-md border border-surface-border">
                          {p}
                        </li>
                      ))}
                      {rec.products.length > 4 && (
                        <li className="px-2 py-1 bg-surface-hover text-xs text-text-muted rounded-md border border-surface-border">
                          +{rec.products.length - 4} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {!user && (
                  <Link href="/auth/register" className="mt-auto pt-4 block">
                    <Button fullWidth variant="outline" className="border-brand-500/30 text-brand-300 hover:bg-brand-600/10">
                      Sign up to customize this
                    </Button>
                  </Link>
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        {/* CTA Footer */}
        {!user && (
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-brand-600/20 to-purple-600/10 border border-brand-500/20 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Want to redesign your own room?</h2>
            <p className="text-text-muted mb-6 max-w-lg mx-auto">
              Join Homify to upload photos of your space, explore thousands of styles, and get personalized AI recommendations instantly.
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="shadow-glow">Get Started for Free</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
