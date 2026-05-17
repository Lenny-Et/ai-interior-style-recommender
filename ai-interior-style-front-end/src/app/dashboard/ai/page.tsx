"use client";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import {
  Sparkles, Upload, X, CheckCircle, ArrowRight,
  Heart, Share2, Download, RefreshCw, Eye, FolderHeart, Plus
} from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, BUDGET_RANGES, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
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
  const [savedRecommendations, setSavedRecommendations] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentLimitType, setCurrentLimitType] = useState<string | null>(null);
  const [previewRec, setPreviewRec] = useState<AIRecommendation | null>(null);
  
  // Board Save State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [itemToSave, setItemToSave] = useState<AIRecommendation | null>(null);
  const [userBoards, setUserBoards] = useState<any[]>([]);
  const [isSavingToBoard, setIsSavingToBoard] = useState<string | null>(null); // boardId loading state

  const { user } = useAppStore();

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

  // Share a recommendation via Web Share API, falling back to clipboard
  const shareRecommendation = async (rec: AIRecommendation) => {
    const text = `Check out this ${rec.style} ${rec.roomType} design: "${rec.name}" — ${rec.description}`;
    const url = rec.imageUrl;
    if (navigator.share) {
      try {
        await navigator.share({ title: rec.name, text, url });
        toast.success("Shared successfully!");
      } catch (_) {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Link copied to clipboard!");
    }
  };

  // Download the recommendation image
  const downloadImage = async (rec: AIRecommendation) => {
    try {
      const response = await fetch(rec.imageUrl);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${rec.name.replace(/\s+/g, "-")}.jpg`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Image downloaded!");
    } catch {
      toast.error("Download failed — try right-clicking the image.");
    }
  };

  // Boards Handling
  const openSaveModal = async (rec: AIRecommendation) => {
    setItemToSave(rec);
    setSaveModalOpen(true);
    try {
      const response = await apiClient.getBoards(1, 100);
      const boardsData = (response as any).data || response;
      setUserBoards(boardsData.boards || []);
    } catch (error) {
      console.error("Failed to load boards:", error);
      toast.error("Failed to load your style boards.");
    }
  };

  const saveToBoard = async (boardId: string) => {
    if (!itemToSave) return;
    try {
      setIsSavingToBoard(boardId);
      await apiClient.addAIItemToBoard(boardId, {
        imageUrl: itemToSave.imageUrl,
        name: itemToSave.name,
        style: itemToSave.style,
        roomType: itemToSave.roomType || roomType,
        description: itemToSave.description
      });
      toast.success(`Saved to board!`);
      setSaveModalOpen(false);
      setItemToSave(null);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to save to board");
    } finally {
      setIsSavingToBoard(null);
    }
  };



  const checkPremiumPurchases = async () => { /* no-op — all results are free */ };

  // Load saved recommendations
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

      // All recommendations are free to view — no paywall
      const enhancedRecommendations = recommendationsArray.map((rec: any) => ({
        ...rec,
        isPremium: false,
        templateType: rec.templateType || 'ai-generated'
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
              <p className="text-xs text-text-muted">{recommendations.length} design{recommendations.length !== 1 ? 's' : ''} for your {roomType}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("prefs")}>
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {recommendations.map((set: AIRecommendation) => (
              <Card key={set.id}
                className={cn("group overflow-hidden cursor-pointer transition-all duration-300", selected === set.id && "border-brand-500 shadow-glow")}
                onClick={() => setSelected(set.id === selected ? null : set.id)}
              >
                <div className="relative">
                  <Image
                    src={set.imageUrl}
                    alt={set.name}
                    width={600}
                    height={400}
                    className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <Badge variant="brand">{set.style}</Badge>
                    {set.templateType === 'curated' && (
                      <Badge variant="blue">
                        <Sparkles className="w-3 h-3" /> Curated
                      </Badge>
                    )}
                    {(currentLimitType === 'quota' || currentLimitType === 'rate_limit') && (
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
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="font-bold text-white text-sm">{set.name}</p>
                    <p className="text-xs text-white/70">Est. {set.budget}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-text-muted mb-3 leading-relaxed">{set.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {set.products.map((p: string) => (
                      <span key={p} className="px-2 py-0.5 rounded text-[11px] bg-surface text-text-muted border border-surface-border">{p}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost" size="sm" className="flex-1"
                      onClick={(e) => { e.stopPropagation(); setPreviewRec(set); }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="flex-1"
                      onClick={(e) => { e.stopPropagation(); openSaveModal(set); }}
                    >
                      <FolderHeart className="w-3.5 h-3.5" /> Save
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={(e) => { e.stopPropagation(); downloadImage(set); }}
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={(e) => { e.stopPropagation(); shareRecommendation(set); }}
                      title="Share this design"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
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
              <Button
                variant="outline" size="lg"
                onClick={() => {
                  const rec = recommendations.find(r => r.id === selected);
                  if (rec) shareRecommendation(rec);
                }}
              >
                <Share2 className="w-4 h-4" /> Share Design
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Full-screen Preview Modal ── */}
      {previewRec && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewRec(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-surface-card rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewRec(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="relative">
              <img src={previewRec.imageUrl} alt={previewRec.name} className="w-full max-h-[60vh] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <Badge variant="brand" className="mb-2">{previewRec.style}</Badge>
                <h3 className="font-bold text-white text-xl">{previewRec.name}</h3>
                <p className="text-white/70 text-sm">Est. {previewRec.budget}</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-text-muted text-sm leading-relaxed mb-4">{previewRec.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {previewRec.products.map((p) => (
                  <span key={p} className="px-2 py-1 rounded text-xs bg-surface text-text-muted border border-surface-border">{p}</span>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => openSaveModal(previewRec)}
                >
                  <FolderHeart className="w-4 h-4" /> Save to Board
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadImage(previewRec)}
                >
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => shareRecommendation(previewRec)}
                >
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save to Board Modal ── */}
      {saveModalOpen && itemToSave && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            className="glass rounded-2xl border border-surface-border p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-brand-400" /> Save to Board
              </h3>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="text-text-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4 pr-1">
              {userBoards.length === 0 ? (
                <div className="text-center py-6 text-text-muted">
                  <p className="text-sm">You don't have any boards yet.</p>
                </div>
              ) : (
                userBoards.map(board => (
                  <button
                    key={board._id}
                    onClick={() => saveToBoard(board._id)}
                    disabled={isSavingToBoard === board._id}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-surface-border bg-surface-card hover:border-brand-500 hover:bg-surface-hover transition-all text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-white text-sm">{board.name}</p>
                      <p className="text-xs text-text-muted">{board.saveCount} items</p>
                    </div>
                    {isSavingToBoard === board._id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-surface-border opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                ))
              )}
            </div>

            <Link href="/dashboard/boards" className="w-full block">
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4" /> Create New Board
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
