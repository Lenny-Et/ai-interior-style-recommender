"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Link, Briefcase, FileText, Building2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";

interface WorkHistoryEntry {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface DesignerProfile {
  email: string;
  createdAt: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    portfolioUrl?: string;
    workHistory?: WorkHistoryEntry[];
    cvUrl?: string;
    profilePicture?: string;
  };
}

interface DesignerDetailsModalProps {
  userId: string | null;
  show: boolean;
  onClose: () => void;
}

export default function DesignerDetailsModal({ userId, show, onClose }: DesignerDetailsModalProps) {
  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show && userId) {
      const fetchDesignerDetails = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await apiClient.getProfile(userId);
          setDesigner(response as DesignerProfile); // Corrected: use response directly
        } catch (err: any) {
          console.error("Failed to fetch designer details:", err);
          setError(err?.error || "Failed to load designer details.");
          toast.error(err?.error || "Failed to load designer details.");
        } finally {
          setLoading(false);
        }
      };
      fetchDesignerDetails();
    } else {
      setDesigner(null);
      setLoading(true);
      setError(null);
    }
  }, [show, userId]);

  const getUserName = (d: DesignerProfile | null) => {
    if (!d) return "Loading...";
    if (d.profile?.firstName || d.profile?.lastName) {
      return `${d.profile?.firstName || ''} ${d.profile?.lastName || ''}`.trim();
    }
    return d.profile?.company || 'Unknown Designer';
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-surface-card rounded-2xl border border-surface-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                Designer Details
              </h2>
              <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400 mr-2" />
                <span className="text-text-muted">Loading designer details...</span>
              </div>
            )}

            {!loading && error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-400 text-sm mb-2">{error}</p>
              </div>
            )}

            {!loading && designer && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar src={designer.profile?.profilePicture} name={getUserName(designer)} size="lg" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">{getUserName(designer)}</h3>
                    <p className="text-text-muted">{designer.email}</p>
                    <p className="text-text-muted text-sm">Joined: {formatDate(designer.createdAt)}</p>
                  </div>
                </div>

                {designer.profile?.company && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <Building2 className="w-5 h-5" />
                    <span>Company: {designer.profile.company}</span>
                  </div>
                )}

                {designer.profile?.portfolioUrl && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <Link className="w-5 h-5" />
                    <span>Portfolio: </span>
                    <a href={designer.profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                      {designer.profile.portfolioUrl}
                    </a>
                  </div>
                )}

                {designer.profile?.cvUrl && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <FileText className="w-5 h-5" />
                    <span>CV: </span>
                    <a href={designer.profile.cvUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                      View CV
                    </a>
                  </div>
                )}

                {designer.profile?.workHistory && designer.profile.workHistory.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Briefcase className="w-5 h-5" /> Work History
                    </h4>
                    <div className="space-y-4">
                      {designer.profile.workHistory.map((job, index) => (
                        <div key={index} className="bg-surface p-4 rounded-lg border border-surface-border">
                          <h5 className="font-medium text-white">{job.title}</h5>
                          <p className="text-text-muted text-sm">{formatDate(job.startDate)} - {job.endDate ? formatDate(job.endDate) : 'Present'}</p>
                          <p className="text-text-muted text-sm mt-1">{job.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
