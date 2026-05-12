"use client";
import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import {
  Ticket, Clock, CheckCircle, Upload, Eye,
  MessageCircle, X, AlertCircle, Send, Paperclip, Image as ImageIcon
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";

type Status = "Pending" | "In-Progress" | "Review" | "Completed" | "Cancelled";

interface CustomRequest {
  _id: string;
  title: string;
  description: string;
  roomType: string;
  budget: number;
  currency: string;
  urgency: string;
  status: Status;
  homeownerId: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    email: string;
  };
  designerId?: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    filename: string;
    originalName: string;
    url: string;
  }>;
  messages: Array<{
    sender: string;
    message: string;
    createdAt: string;
  }>;
}

const STATUS_META: Record<Status, { variant: "blue"|"gold"|"brand"|"green"|"gray"; label: string }> = {
  Pending:      { variant: "gold",  label: "New Request" },
  "In-Progress":{ variant: "brand", label: "In Progress" },
  Review:       { variant: "blue",  label: "Review" },
  Completed:    { variant: "green", label: "Completed" },
  Cancelled:    { variant: "gray",  label: "Cancelled" },
};

export default function DesignerRequestsPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [availableRequests, setAvailableRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAvailable, setShowAvailable] = useState(false);
  const [appliedSet, setAppliedSet] = useState<Set<string>>(new Set());
  const [applyNote, setApplyNote] = useState("");
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    loadAvailableRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCustomRequests(1, 20);
      const requestsData = (response as any).data || response;
      setRequests(requestsData.requests || []);
      if (requestsData.requests?.length > 0) {
        setActive(requestsData.requests[0]._id);
      }
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRequests = async () => {
    try {
      const response = await apiClient.getAvailableCustomRequests(1, 20);
      const availableData = (response as any).data || response;
      setAvailableRequests(availableData.requests || []);
    } catch (error: any) {
      console.error("Failed to load available requests:", error);
    }
  };

  const applyForRequest = async (requestId: string) => {
    try {
      const { user } = useAppStore.getState();
      if (!user || user.role !== 'designer') {
        toast.error("Only designers can apply for requests");
        return;
      }
      await apiClient.applyToRequest(requestId, applyNote.trim() || undefined);
      toast.success("Application submitted! The homeowner will review and choose a designer.");
      setAppliedSet(prev => new Set(prev).add(requestId));
      setShowNoteFor(null);
      setApplyNote("");
    } catch (error: any) {
      if (error?.status === 409) {
        toast.error("You have already applied to this request.");
        setAppliedSet(prev => new Set(prev).add(requestId));
      } else {
        toast.error(error.error || error.message || "Failed to apply");
      }
    }
  };

  const updateStatus = async (requestId: string, status: string) => {
    try {
      await apiClient.updateCustomRequestStatus(requestId, status);
      toast.success("Status updated successfully!");
      loadRequests();
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to update status");
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !active) return;
    
    try {
      let uploadedFiles: any[] = [];
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach(file => {
          formData.append('files', file);
        });
        const uploadResponse = await apiClient.uploadFiles(formData);
        const uploadData = (uploadResponse as any).data || uploadResponse;
        uploadedFiles = uploadData.files || [];
      }

      await apiClient.addCustomRequestMessage(active, message || "Sent an attachment", uploadedFiles);
      setMessage("");
      setAttachments([]);
      toast.success("Message sent successfully!");
      loadRequests();
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to send message");
    }
  };

  const allRequests = showAvailable ? availableRequests : requests;
  const ticket = allRequests.find((r) => r._id === active);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Client Requests</h1>
        <p className="text-text-muted text-sm">Manage incoming and active design commissions</p>
      </div>

      {/* Toggle between assigned and available requests */}
      <div className="flex gap-2">
        <Button 
          variant={!showAvailable ? "brand" : "ghost"} 
          size="sm"
          onClick={() => setShowAvailable(false)}
        >
          My Requests ({requests.length})
        </Button>
        <Button 
          variant={showAvailable ? "brand" : "ghost"} 
          size="sm"
          onClick={() => setShowAvailable(true)}
        >
          Available ({availableRequests.length})
        </Button>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 flex-wrap">
        {["Pending", "In-Progress", "Review", "Completed"].map((status) => {
          const count = allRequests.filter((r) => r.status === status).length;
          return count > 0 ? (
            <Badge key={status} variant={STATUS_META[status as Status].variant as any}>
              {STATUS_META[status as Status].label}: {count}
            </Badge>
          ) : null;
        })}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-text-muted">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm">Loading requests...</p>
            </div>
          ) : allRequests.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Ticket className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-white">No requests found</p>
              <p className="text-xs mt-1">
                {showAvailable ? "No available requests at the moment" : "You haven't accepted any requests yet"}
              </p>
            </div>
          ) : (
            allRequests.map((r) => {
              const { variant } = STATUS_META[r.status];
              return (
                <button key={r._id} onClick={() => setActive(r._id)}
                  className={cn("w-full text-left p-4 rounded-2xl border transition-all",
                    active === r._id ? "border-brand-500 bg-brand-600/10 shadow-glow-sm" : "border-surface-border bg-surface-card hover:border-brand-500/40"
                  )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-text-muted">{r._id.slice(-6)}</span>
                    <Badge variant={variant}>{STATUS_META[r.status].label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar 
                      name={`${r.homeownerId.profile.firstName} ${r.homeownerId.profile.lastName}`} 
                      size="xs" 
                    />
                    <p className="text-sm font-semibold text-white">
                      {r.homeownerId.profile.firstName} {r.homeownerId.profile.lastName}
                    </p>
                  </div>
                  <p className="text-xs text-text-muted">{r.roomType} · ${r.budget.toLocaleString()}</p>
                  <p className="text-[10px] text-text-muted mt-1">
                    <Clock className="w-3 h-3 inline mr-0.5" />{formatDate(r.createdAt)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Detail */}
        {ticket ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar 
                    name={`${ticket.homeownerId.profile.firstName} ${ticket.homeownerId.profile.lastName}`} 
                    size="md" 
                  />
                  <div>
                    <p className="font-semibold text-white">
                      {ticket.homeownerId.profile.firstName} {ticket.homeownerId.profile.lastName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {ticket._id.slice(-6)} · {ticket.roomType} · ${ticket.budget.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {showAvailable && ticket && ticket.status === "Pending" && (
                    appliedSet.has(ticket._id) ? (
                      <Badge variant="green"><CheckCircle className="w-3 h-3" /> Applied</Badge>
                    ) : showNoteFor === ticket._id ? (
                      <div className="flex flex-col gap-2 w-full">
                        <textarea
                          value={applyNote}
                          onChange={(e) => setApplyNote(e.target.value)}
                          placeholder="Add a short cover note (optional)…"
                          rows={2}
                          maxLength={500}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 resize-none transition-all"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setShowNoteFor(null); setApplyNote(""); }}>Cancel</Button>
                          <Button size="sm" onClick={() => applyForRequest(ticket._id)}>
                            <Send className="w-3.5 h-3.5" /> Submit Application
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setShowNoteFor(ticket._id)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Apply
                      </Button>
                    )
                  )}
                  {!showAvailable && ticket && ticket.status === "In-Progress" && (
                    <Button size="sm" onClick={() => updateStatus(ticket._id, "Review")}>
                      <Upload className="w-3.5 h-3.5" /> Submit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Client Brief</p>
                <p className="text-sm text-purple-100 leading-relaxed">{ticket.description}</p>
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Client Room Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {ticket.attachments.map((attachment, i) => (
                      <img key={i} src={attachment.url} alt={attachment.originalName} className="w-32 h-24 object-cover rounded-xl border border-surface-border hover:opacity-80 cursor-pointer transition-opacity" />
                    ))}
                  </div>
                </div>
              )}

              {ticket.status === "Review" && (
                <div className="p-3 rounded-xl border border-gold-500/20 bg-gold-500/5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gold-300">Awaiting Client Approval</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Funds will be released once client approves.</p>
                  </div>
                </div>
              )}

              {/* Messages */}
              {ticket.messages && ticket.messages.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Messages</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {ticket.messages.map((msg, i) => (
                      <div key={i} className="text-xs mb-3">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-1 mt-1">
                            {msg.attachments.map((file, idx) => (
                              <img key={idx} src={file.url} alt="attachment" className="w-20 h-20 object-cover rounded-md border border-surface-border" />
                            ))}
                          </div>
                        )}
                        <span className="font-medium text-white">{msg.sender}:</span> {msg.message}
                        <span className="text-text-muted ml-2">{formatDate(msg.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick message */}
              {ticket.status !== "Completed" && ticket.status !== "Cancelled" && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Quick Message</p>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-surface-border text-xs text-white">
                          <ImageIcon className="w-3 h-3 text-brand-400" />
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-text-muted hover:text-red-400 ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="designer-chat-upload"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
                        }
                      }}
                    />
                    <label htmlFor="designer-chat-upload" className="flex items-center justify-center px-3 rounded-xl bg-surface border border-surface-border hover:border-brand-500/50 cursor-pointer transition-colors text-text-muted hover:text-white shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </label>
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Message ${ticket.homeownerId.profile.firstName}…`}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button size="sm" onClick={sendMessage} disabled={!message.trim() && attachments.length === 0}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-surface-border text-text-muted">
            <p className="text-sm">Select a request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
