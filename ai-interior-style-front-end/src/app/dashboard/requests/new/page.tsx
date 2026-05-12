"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Card, { CardBody } from "@/components/ui/Card";
import {
  ArrowLeft, Send, Upload, X, Image as ImageIcon,
  Loader2, User,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ROOM_TYPES, BUDGET_RANGES } from "@/lib/utils";

interface Designer {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    company?: string;
    avatarUrl?: string;
    profilePicture?: string;
  };
  is_verified: boolean;
}

export default function NewRequestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const designerId = searchParams.get("designerId");

  const [designer, setDesigner]   = useState<Designer | null>(null);
  const [loadingDesigner, setLoadingDesigner] = useState(!!designerId);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    roomType: "Living Room",
    budget: "$1,000–$2,500",
    urgency: "Normal",
    attachments: [] as File[],
  });

  // Load designer info if a designerId was passed
  useEffect(() => {
    if (!designerId) return;
    (async () => {
      try {
        const res = await (apiClient as any).getDesigner(designerId);
        setDesigner((res as any).designer ?? null);
      } catch {
        // Non-fatal — request can still be created without designer context
      } finally {
        setLoadingDesigner(false);
      }
    })();
  }, [designerId]);

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const removeFile = (index: number) =>
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    try {
      setSubmitting(true);

      // Parse budget range to a midpoint number
      const clean = form.budget.replace(/,/g, "");
      const nums = clean.match(/\d+/g);
      let budget = 1000;
      if (nums && nums.length >= 2) budget = Math.floor((+nums[0] + +nums[1]) / 2);
      else if (nums && nums.length === 1) budget = +nums[0];

      // Upload attachments if any
      let attachments: any[] = [];
      if (form.attachments.length > 0) {
        try {
          const fd = new FormData();
          form.attachments.forEach(f => fd.append("files", f));
          const upRes = await apiClient.uploadFiles(fd);
          attachments = (upRes as any).files || [];
        } catch {
          toast.error("File upload failed — request will be submitted without attachments");
        }
      }

      await apiClient.createCustomRequest({
        title: form.title,
        description: form.description,
        roomType: form.roomType,
        budget,
        urgency: form.urgency,
        attachments,
        ...(designerId ? { tags: [`designer:${designerId}`] } : {}),
      });

      toast.success("Request submitted successfully!");
      router.push("/dashboard/requests");
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const designerName = designer
    ? `${designer.profile.firstName} ${designer.profile.lastName}`.trim() || designer.profile.company
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-muted hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">New Design Request</h1>
        <p className="text-text-muted text-sm">Describe your project and we'll match you with the right designer</p>
      </div>

      {/* Designer context banner */}
      {designerId && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            {loadingDesigner ? (
              <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            ) : designer ? (
              <>
                <Avatar
                  src={designer.profile?.avatarUrl || designer.profile?.profilePicture}
                  name={designerName || ""}
                  size="md"
                  verified={designer.is_verified}
                />
                <div>
                  <p className="text-sm font-semibold text-white">Sending to {designerName}</p>
                  <p className="text-xs text-text-muted">{designer.profile.company || "Independent Designer"}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center">
                  <User className="w-5 h-5 text-text-muted" />
                </div>
                <p className="text-sm text-text-muted">Sending to a specific designer</p>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardBody className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">
              Project Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Modern living room redesign"
              className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>

          {/* Room type & budget row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">
                Room Type
              </label>
              <select
                value={form.roomType}
                onChange={(e) => set("roomType", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white focus:outline-none focus:border-brand-500 transition-all"
              >
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">
                Budget Range
              </label>
              <select
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white focus:outline-none focus:border-brand-500 transition-all"
              >
                {BUDGET_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">
              Urgency
            </label>
            <div className="flex gap-2">
              {["Low", "Normal", "High", "Urgent"].map((u) => (
                <button
                  key={u}
                  onClick={() => set("urgency", u)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                    form.urgency === u
                      ? "border-brand-500 bg-brand-600/20 text-brand-300"
                      : "border-surface-border text-text-muted hover:border-brand-500/40"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">
              Project Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe your space, style preferences, must-haves, and anything else the designer should know…"
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-surface-border rounded-xl p-5 text-center hover:border-brand-500/40 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                id="req-files"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
                }}
              />
              <label htmlFor="req-files" className="cursor-pointer">
                <Upload className="w-7 h-7 mx-auto mb-2 text-text-muted" />
                <p className="text-sm text-text-muted">Click to upload room photos or documents</p>
                <p className="text-xs text-text-muted mt-1">PNG, JPG, PDF (Max 10MB each)</p>
              </label>
            </div>

            {form.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {form.attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-surface-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <ImageIcon className="w-4 h-4 text-brand-400 shrink-0" />
                      <span className="text-sm text-white truncate">{file.name}</span>
                      <span className="text-xs text-text-muted shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-text-muted hover:text-red-400 ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
              ) : (
                <><Send className="w-4 h-4" />Submit Request</>
              )}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
