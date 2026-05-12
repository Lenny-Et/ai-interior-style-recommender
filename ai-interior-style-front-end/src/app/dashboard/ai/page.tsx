"use client";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import {
  Sparkles, Upload, X, CheckCircle, ArrowRight,
  Heart, Share2, Download, RefreshCw, Eye, Star,
} from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, BUDGET_RANGES, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface AIRecommendation {
  id: string;
  name: string;
  description: string;
  style: string;
  roomType: string;
  budget: string;
  products: string[];
  imageUrl: string;
  confidence: number;
  isPremium?: boolean;
  templateType?: string;
}

type Step = "upload" | "prefs" | "loading" | "results";

export default function AIRecommenderPage() {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [roomType, setRoomType] = useState("Living Room");
  const [budget, setBudget] = useState("$1,000–$2,500");
  const [styles, setStyles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [unlockedDesigns, setUnlockedDesigns] = useState<string[]>([]);
  const [savedRecommendations, setSavedRecommendations] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentLimitType, setCurrentLimitType] = useState<string | null>(null);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    const url = URL.createObjectURL(file);
    setPreview(url);
    setUploadedImage(file);
    setStep("prefs");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, maxFiles: 1,
  });

  const toggleStyle = (s: string) =>
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  // Check for existing premium purchases and load paid designs
  const checkPremiumPurchases = async () => {
    try {
      const userId = localStorage.getItem('userId') || '507f1f77bcf86cd799439011';

      const designsResponse = await apiClient.getUserDesigns({ status: 'active', limit: 100, userId });
      const designs = (designsResponse as any).data?.designs || (designsResponse as any).designs || [];

      // Extract original recommendation IDs stored at purchase time
      const unlockedIds = designs
        .map((d: any) => d.designData?.recommendationId)
        .filter(Boolean);

      setUnlockedDesigns(unlockedIds);

      console.log('Library designs:', designs.length);
      console.log('Unlocked recommendation IDs:', unlockedIds);
    } catch (error) {
      console.error('Failed to check premium purchases:', error);
    }
  };

  const unlockPremiumDesign = async (recommendationId: string) => {
    try {
      setIsProcessingPayment(true);

      // Get user info for payment - use mock data for testing
      const userId = localStorage.getItem('userId') || '507f1f77bcf86cd799439011'; // Mock ObjectId
      const userEmail = localStorage.getItem('userEmail') || 'customer@chapa.co';
      const userName = localStorage.getItem('userName') || 'Test User';

      // Initialize payment for premium AI design
      const response = await apiClient.initializePayment({
        amount: 2999, // $29.99 for premium AI design
        email: userEmail,
        firstName: userName.split(' ')[0],
        lastName: userName.split(' ')[1] || 'User',
        homeownerId: userId,
        designerId: 'ai-system', // Special ID for AI system
        sessionId: currentSessionId || undefined // Pass current session ID for redirect
      });

      const paymentData = (response as any).data || response;

      // Redirect to Chapa payment page
      if (paymentData.checkoutUrl) {
        window.location.href = paymentData.checkoutUrl;
      } else {
        toast.error("Payment initialization failed");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.error || error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Load saved recommendations and check premium purchases
  const loadSavedRecommendations = async (specificSessionId?: string) => {
    try {
      const userId = localStorage.getItem('userId') || '507f1f77bcf86cd799439011';

      if (specificSessionId) {
        // Load specific session (after payment redirect)
        const response = await apiClient.getSavedAIRecommendation(specificSessionId, userId);
        // Backend returns the session object directly, not wrapped in { data: ... }
        const saved = (response as any).data || response;

        if (saved) {
          setSavedRecommendations([saved]);
          setRecommendations(saved.recommendations);
          setCurrentSessionId(saved.sessionId);
          setStep("results");

          // Set preview image
          if (saved.imageUrl) {
            setPreview(saved.imageUrl);
          }

          // Set preferences from saved session
          if (saved.metadata) {
            setRoomType(saved.metadata.roomType || "Living Room");
            setBudget(saved.metadata.budget || "$1,000–$2,500");
            setStyles(saved.metadata.styles || []);
          }

          // Check premium purchases for this session
          await checkPremiumPurchases();
        }
      } else {
        // Load all saved recommendations (normal page load)
        const response = await apiClient.getSavedAIRecommendations(userId);

        const data = (response as any).data || response;
        const saved = data.recommendations || data || [];
        setSavedRecommendations(saved);

        // If there are saved recommendations, show the most recent one
        if (saved.length > 0) {
          const mostRecent = saved[0];
          setRecommendations(mostRecent.recommendations);
          setCurrentSessionId(mostRecent.sessionId);
          setStep("results");

          // Set preview image
          if (mostRecent.imageUrl) {
            setPreview(mostRecent.imageUrl);
          }

          // Set preferences from saved session
          if (mostRecent.metadata) {
            setRoomType(mostRecent.metadata.roomType || "Living Room");
            setBudget(mostRecent.metadata.budget || "$1,000–$2,500");
            setStyles(mostRecent.metadata.styles || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load saved recommendations:', error);
    }
  };

  // Check premium purchases and load recommendations when component loads
  useEffect(() => {
    // Check if there's a session parameter in URL (after payment redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session');

    if (sessionId) {
      // Load specific session after payment
      loadSavedRecommendations(sessionId);
    } else {
      // Normal page load - check premium purchases and load most recent recommendations
      checkPremiumPurchases();
      loadSavedRecommendations();
    }
  }, []);

  const runAI = async () => {
    if (!preview || !uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    setStep("loading");
    setProgress(0);

    try {
      // Upload image file to server first
      let imageUrl = preview;
      if (uploadedImage) {
        const formData = new FormData();
        formData.append('image', uploadedImage);
        
        const uploadResponse = await fetch('http://localhost:5000/api/ai/upload-image', {
          method: 'POST',
          body: formData
        });
        
        console.log('Upload response status:', uploadResponse.status);
        console.log('Upload response ok:', uploadResponse.ok);
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.imageUrl;
          console.log('Image uploaded successfully:', imageUrl);
          console.log('Upload result:', uploadResult);
        } else {
          const errorText = await uploadResponse.text();
          console.error('Image upload failed:', uploadResponse.status, errorText);
          console.error('Falling back to blob URL');
        }
      }

      // Get AI recommendations
      const userId = localStorage.getItem('userId') || '507f1f77bcf86cd799439011';
      const response = await apiClient.getAIRecommendations({
        imageUrl,
        roomType,
        styles,
        budget,
        creativity: "0.7",
        userId
      });

      const aiRecommendations = (response as any).data || response;
      const recommendationsArray = Array.isArray(aiRecommendations.recommendations)
        ? aiRecommendations.recommendations
        : Array.isArray(aiRecommendations)
          ? aiRecommendations
          : [];

      // Check if fallback was used and what type
      const fallbackUsed = aiRecommendations.metadata?.fallbackUsed;
      const limitType = aiRecommendations.metadata?.limitType;
      const retryAfter = aiRecommendations.metadata?.retryAfter;

      if (fallbackUsed) {
        let title = 'AI service temporarily unavailable';
        let description = 'Professional templates selected based on your preferences';
        let duration = 5000;

        if (limitType === 'quota') {
          title = 'AI Quota Exceeded';
          description = 'Monthly AI quota reached. Using curated templates while quota resets.';
          duration = 7000;
        } else if (limitType === 'rate_limit') {
          title = 'AI Rate Limited';
          description = 'Too many requests. Using curated templates for immediate results.';
          duration = 6000;
          if (retryAfter && retryAfter !== 'unknown') {
            description += ` Retry available in ${retryAfter} seconds.`;
          }
        }

        toast(title, {
          duration,
          icon: 'ℹ️',
          style: {
            background: '#333',
            color: '#fff',
          }
        });

        // Set limit type for UI indicators
        setCurrentLimitType(limitType);
      }

      // Mark some recommendations as premium (2 out of 4) - the backend already sets isPremium
      const enhancedRecommendations = recommendationsArray.map((rec: any, index: number) => ({
        ...rec,
        isPremium: rec.isPremium || index >= 2, // Use backend isPremium or fallback to index
        templateType: rec.templateType || 'ai-generated' // Track if it's a curated template
      }));

      setRecommendations(enhancedRecommendations);

      // Save session ID if provided
      if (aiRecommendations.sessionId) {
        setCurrentSessionId(aiRecommendations.sessionId);
      }

      setStep("results");
      toast.success("AI recommendations ready!");

      // Refresh saved recommendations to include the new one
      await loadSavedRecommendations();
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to generate AI recommendations");
      setStep("prefs");
    } finally {
      setProgress(100);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-brand-400" /> AI Recommender
        </h1>
        <p className="text-text-muted text-sm">Upload a room photo and get personalized furniture sets in seconds.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(["upload", "prefs", "loading", "results"] as Step[]).map((s, i) => {
          const stepIdx = ["upload", "prefs", "loading", "results"].indexOf(step);
          const done = i < stepIdx || (s === "loading" && step === "results");
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                done ? "bg-emerald-500 text-white" :
                  active ? "bg-brand-600 text-white shadow-glow-sm" :
                    "bg-surface-card border border-surface-border text-text-muted"
              )}>
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn("text-xs capitalize hidden sm:block", active ? "text-white" : "text-text-muted")}>
                {s === "loading" ? "Generating" : s}
              </span>
              {i < 3 && <div className={cn("w-8 h-0.5 rounded", done ? "bg-emerald-500" : "bg-surface-border")} />}
            </div>
          );
        })}
      </div>

      {/* ── STEP: Upload ── */}
      {step === "upload" && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300",
            isDragActive ? "border-brand-500 bg-brand-600/10 shadow-glow" : "border-surface-border hover:border-brand-500/60 hover:bg-surface-hover"
          )}
        >
          <input {...getInputProps()} id="room-photo-input" />
          <div className="w-16 h-16 rounded-2xl bg-brand-600/15 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="font-semibold text-white mb-2">{isDragActive ? "Drop it here!" : "Upload a room photo"}</h2>
          <p className="text-sm text-text-muted mb-4">Drag & drop or click to select · JPG, PNG, WEBP up to 20MB</p>
          <Button>Choose File</Button>
        </div>
      )}

      {/* ── STEP: Preferences ── */}
      {step === "prefs" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            {preview && (
              <div className="relative rounded-2xl overflow-hidden border border-surface-border mb-4">
                <img src={preview} alt="Room" className="w-full h-56 object-cover" />
                <button
                  onClick={() => { setPreview(null); setStep("upload"); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <Badge variant="green" className="absolute bottom-3 left-3"><CheckCircle className="w-3 h-3" /> Photo uploaded</Badge>
              </div>
            )}
          </div>
          <div className="space-y-5">
            {/* Room type */}
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Room Type</label>
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.slice(0, 6).map((r) => (
                  <button key={r} onClick={() => setRoomType(r)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      roomType === r ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"
                    )}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {/* Budget */}
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Budget Range</label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map((b) => (
                  <button key={b} onClick={() => setBudget(b)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      budget === b ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-surface-border text-text-muted hover:border-gold-500/40"
                    )}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            {/* Styles */}
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Preferred Styles (optional)</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAGS.slice(0, 10).map((s) => (
                  <button key={s} onClick={() => toggleStyle(s)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      styles.includes(s) ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button fullWidth size="lg" onClick={runAI} className="shadow-glow">
              <Sparkles className="w-4 h-4" /> Generate AI Designs
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: Loading ── */}
      {step === "loading" && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">AI is designing your space…</h2>
          <p className="text-text-muted text-sm mb-6">Analyzing style, lighting, and proportions</p>
          <div className="max-w-xs mx-auto h-1.5 rounded-full bg-surface-border overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-600 to-violet-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-text-muted mt-2">{progress}%</p>
        </div>
      )}

      {/* ── STEP: Results ── */}
      {step === "results" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">Your AI Design Sets</h2>
              <p className="text-xs text-text-muted">4 cohesive furniture sets for your {roomType}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("prefs")}>
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {recommendations.map((set: AIRecommendation) => (
              <Card key={set.id}
                className={cn("group overflow-hidden cursor-pointer", selected === set.id && "border-brand-500 shadow-glow")}
                onClick={() => setSelected(set.id)}
              >
                <div className="relative">
                  <Image src={set.imageUrl} alt={set.name} width={600} height={400} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant="brand">{set.style}</Badge>
                    {set.isPremium && (
                      <Badge variant={unlockedDesigns.includes(set.id) ? "green" : "gold"}>
                        {unlockedDesigns.includes(set.id) ? <CheckCircle className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                        {unlockedDesigns.includes(set.id) ? "UNLOCKED" : "Premium"}
                      </Badge>
                    )}
                    {set.templateType === 'curated' && (
                      <Badge variant="blue">
                        <Sparkles className="w-3 h-3" />
                        Curated Template
                      </Badge>
                    )}
                    {set.templateType === 'curated' && (currentLimitType === 'quota' || currentLimitType === 'rate_limit') && (
                      <Badge variant="orange">
                        <RefreshCw className="w-3 h-3" />
                        {currentLimitType === 'quota' ? 'Quota Limit' : 'Rate Limit'}
                      </Badge>
                    )}
                  </div>
                  {selected === set.id && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shadow-glow-sm">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="font-bold text-white">{set.name}</p>
                      <p className="text-xs text-white/70">Est. {set.budget}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {set.products.map((p: string) => (
                      <span key={p} className="px-2 py-0.5 rounded text-[11px] bg-surface text-text-muted border border-surface-border">{p}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {set.isPremium && !unlockedDesigns.includes(set.id) ? (
                      <>
                        <Button
                          variant="gold"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            unlockPremiumDesign(set.id);
                          }}
                          disabled={isProcessingPayment}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {isProcessingPayment ? 'Processing...' : 'Unlock $29.99'}
                        </Button>
                        <Button variant="ghost" size="sm"><Share2 className="w-3.5 h-3.5" /></Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="flex-1"><Heart className="w-3.5 h-3.5" /> Save</Button>
                        <Button variant="ghost" size="sm" className="flex-1"><Eye className="w-3.5 h-3.5" /> Preview</Button>
                        <Button variant="ghost" size="sm" className="flex-1"><Download className="w-3.5 h-3.5" /> Download</Button>
                        <Button variant="ghost" size="sm"><Share2 className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selected && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard/designers">
                <Button variant="ghost" size="lg">
                  Hire a Designer <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg"><Download className="w-4 h-4" /> Export PDF</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
