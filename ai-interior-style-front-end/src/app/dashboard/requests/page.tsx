"use client";
import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Link from "next/link";
import {
  Plus, Clock, CheckCircle, AlertCircle, Loader2,
  Upload, Eye, MessageCircle, X, Image as ImageIcon,
} from "lucide-react";
import { formatDate, cn, ROOM_TYPES, BUDGET_RANGES } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";

type Status = "Pending" | "In-Progress" | "Review" | "Completed" | "Cancelled";

const STATUS_CONFIG: Record<Status, { variant: "gold"|"blue"|"brand"|"green"|"red"; icon: typeof Clock }> = {
  "Pending":    { variant: "gold",  icon: Clock },
  "In-Progress":{ variant: "blue",  icon: Loader2 },
  "Review":     { variant: "brand", icon: Eye },
  "Completed":  { variant: "green", icon: CheckCircle },
  "Cancelled":  { variant: "red",   icon: X },
};

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
      profilePicture?: string;
    };
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  escrow?: {
    amount: number;
    status: string;
  };
}

const ESCROW_STAGES = ["Funds Held","Design Started","Revision Round","Client Review","Released"];

export default function RequestsPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    roomType: 'Living Room',
    budget: '$1,000–$2,500',
    urgency: 'Normal',
    attachments: [] as File[]
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    loadRequests();
    checkPaymentVerification();
  }, []);

  // Load applicants whenever the selected request changes and it's Pending with no designer
  useEffect(() => {
    if (!activeRequest) { setApplicants([]); return; }
    const req = requests.find(r => r._id === activeRequest);
    if (!req || req.designerId || req.status !== 'Pending') { setApplicants([]); return; }
    (async () => {
      try {
        setApplicantsLoading(true);
        const res = await apiClient.getRequestApplicants(activeRequest);
        setApplicants((res as any).applicants || []);
      } catch { setApplicants([]); }
      finally { setApplicantsLoading(false); }
    })();
  }, [activeRequest, requests]);

  const checkPaymentVerification = async () => {
    // Check URL parameters for payment verification
    const urlParams = new URLSearchParams(window.location.search);
    const tx_ref = urlParams.get('tx_ref');
    const status = urlParams.get('status');
    
    if (tx_ref && status === 'success') {
      try {
        // Verify payment
        const response = await apiClient.verifyPayment(tx_ref);
        const paymentData = (response as any).data || response;
        
        if (paymentData.success) {
          // Find the request associated with this payment
          const requestId = Object.keys(localStorage).find(key => key.startsWith('payment_') && localStorage.getItem(key) === tx_ref)?.replace('payment_', '');
          
          if (requestId) {
            // Update request status to Completed
            await apiClient.updateCustomRequestStatus(requestId, 'Completed');
            loadRequests(); // Refresh requests
            toast.success("Payment verified successfully! Request marked as completed.");
            localStorage.removeItem(`payment_${requestId}`);
            
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        } else {
          toast.error("Payment verification failed");
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast.error("Failed to verify payment");
      }
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCustomRequests(1, 20);
      const requestsData = (response as any).data || response;
      setRequests(requestsData.requests || []);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    try {
      // Extract numeric value from budget string (e.g., "$1,000–$2,500" -> 1750)
      let budgetValue = 1000;
      const cleanBudgetStr = newRequest.budget.replace(/,/g, '');
      const numMatches = cleanBudgetStr.match(/\d+/g);
      
      if (numMatches && numMatches.length >= 2) {
        // Calculate average of the range
        budgetValue = Math.floor((parseInt(numMatches[0]) + parseInt(numMatches[1])) / 2);
      } else if (numMatches && numMatches.length === 1) {
        budgetValue = parseInt(numMatches[0]);
      }

      // Handle file uploads
      let attachments = [];
      if (newRequest.attachments.length > 0) {
        const formData = new FormData();
        newRequest.attachments.forEach(file => {
          formData.append('files', file);
        });
        
        try {
          const uploadResponse = await apiClient.uploadFiles(formData);
          const uploadData = (uploadResponse as any).data || uploadResponse;
          attachments = uploadData.files || [];
          console.log('Files uploaded successfully:', attachments);
        } catch (error) {
          console.error('File upload error:', error);
          toast.error("Failed to upload files, but request will be created without them");
        }
      }

      const response = await apiClient.createCustomRequest({
        title: newRequest.title,
        description: newRequest.description,
        roomType: newRequest.roomType,
        budget: budgetValue,
        urgency: newRequest.urgency,
        attachments
      });

      const data = (response as any).data || response;
      const createdRequest = data.customRequest || data;
      setRequests(prev => [createdRequest, ...prev]);
      
      // Reset form
      setNewRequest({
        title: '',
        description: '',
        roomType: 'Living Room',
        budget: '$1,000–$2,500',
        urgency: 'Normal',
        attachments: []
      });
      setShowNew(false);
      
      toast.success("Request created successfully!");
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to create request");
    }
  };

  const approveAndReleasePayment = async (requestId: string, budget: number, designerId: string) => {
    try {
      setIsProcessingPayment(true);
      
      // Get authenticated user from store
      const { user } = useAppStore.getState();
      if (!user || user.role !== 'homeowner') {
        toast.error("Only homeowners can approve payments");
        return;
      }
      
      const userId = user.id;
      const userEmail = user.email;
      const userName = `${user.profile.firstName} ${user.profile.lastName}`;
      
      // Initialize payment for designer services
      const response = await apiClient.initializePayment({
        amount: budget,
        email: userEmail,
        firstName: userName.split(' ')[0],
        lastName: userName.split(' ')[1] || 'User',
        homeownerId: userId,
        designerId: designerId,
        sessionId: requestId // Use sessionId for tracking request ID
      });
      
      const paymentData = (response as any).data || response;
      
      // Redirect to Chapa payment page
      if (paymentData.checkoutUrl) {
        // Store transaction reference for verification
        localStorage.setItem(`payment_${requestId}`, paymentData.tx_ref);
        window.location.href = paymentData.checkoutUrl;
      } else {
        toast.error("Payment initialization failed - no checkout URL received");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.error || error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const selectDesigner = async (requestId: string, designerId: string) => {
    try {
      setAssigningId(designerId);
      await apiClient.assignDesignerToRequest(requestId, designerId);
      toast.success('Designer selected! The request is now In-Progress.');
      loadRequests();
      setApplicants([]);
    } catch (err: any) {
      toast.error(err?.error || 'Failed to assign designer');
    } finally {
      setAssigningId(null);
    }
  };

  const request = requests.find((r) => r._id === activeRequest);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Custom Requests</h1>
          <p className="text-text-muted text-sm">Track your designer collaboration tickets</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Request</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(() => {
          const active = requests.filter(r => r.status === 'In-Progress').length;
          const review = requests.filter(r => r.status === 'Review').length;
          const completed = requests.filter(r => r.status === 'Completed').length;
          const totalSpent = requests
            .filter(r => r.status === 'Completed')
            .reduce((sum, r) => sum + r.budget, 0);
          
          return [
            ["Active", active.toString(), "blue"],
            ["In Review", review.toString(), "brand"], 
            ["Completed", completed.toString(), "green"],
            ["Total Spent", `$${totalSpent.toLocaleString()}`, "gold"]
          ] as const;
        })().map(([l,v,c]) => (
          <Card key={l} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-text-muted">{l}</span>
              <div className={cn("w-2 h-2 rounded-full", {
                "bg-blue-500": c === "blue",
                "bg-brand-500": c === "brand", 
                "bg-emerald-500": c === "green",
                "bg-gold-500": c === "gold"
              })} />
            </div>
            <div className="text-2xl font-bold text-white">{v}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        {/* Requests list */}
        <div className="space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="text-center py-16 text-text-muted">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="font-semibold text-white">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-white">No requests yet</p>
            <p className="text-sm mt-1">Create your first custom request to get started</p>
          </div>
        ) : (
          requests.map((request) => {
            const { variant, icon: Icon } = STATUS_CONFIG[request.status];
            return (
              <button
                key={request._id}
                onClick={() => setActiveRequest(activeRequest === request._id ? null : request._id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200",
                  activeRequest === request._id
                    ? "border-brand-500 bg-brand-600/10 shadow-glow-sm"
                    : "border-surface-border bg-surface-card hover:border-brand-500/40"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-text-muted">{request._id.slice(-6)}</span>
                  <Badge variant={variant}><Icon className="w-3 h-3" />{request.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {request.designerId && (
                    <Avatar src={request.designerId.profile.profilePicture} name={`${request.designerId.profile.firstName} ${request.designerId.profile.lastName}`} size="xs" />
                  )}
                  <p className="text-sm font-semibold text-white">
                    {request.designerId ? `${request.designerId.profile.firstName} ${request.designerId.profile.lastName}` : 'Unassigned'}
                  </p>
                </div>
                <p className="text-xs text-text-muted">{request.roomType} · ${request.budget.toLocaleString()}</p>
                <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />Updated {formatDate(request.updatedAt)}</p>
                {/* Applicant count badge */}
                {request.status === 'Pending' && !request.designerId && (
                  (() => {
                    const req = request as any;
                    const count = req.applicants?.length ?? 0;
                    return count > 0 ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-brand-300 bg-brand-600/20 border border-brand-500/30 rounded-full px-2 py-0.5">
                        {count} designer{count !== 1 ? 's' : ''} applied
                      </span>
                    ) : null;
                  })()
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Detail panel */}
      {request ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {request.designerId && (
                  <Avatar 
                    src={request.designerId.profile.profilePicture} 
                    name={`${request.designerId.profile.firstName} ${request.designerId.profile.lastName}`} 
                    size="md" 
                  />
                )}
                <div>
                  <p className="font-semibold text-white">
                    {request.designerId ? `${request.designerId.profile.firstName} ${request.designerId.profile.lastName}` : 'Unassigned'}
                  </p>
                  <p className="text-xs text-text-muted">{request._id.slice(-6)} · {request.roomType}</p>
                </div>
              </div>
              <Badge variant={STATUS_CONFIG[request.status].variant}>{request.status}</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-semibold">Project Description</p>
              <p className="text-sm text-purple-100 leading-relaxed">{request.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <p className="text-text-muted mb-0.5">Budget</p>
                <p className="font-semibold text-white">${request.budget.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-surface-border">
                <p className="text-text-muted mb-0.5">Created</p>
                <p className="font-semibold text-white">{formatDate(request.createdAt)}</p>
              </div>
            </div>

            {/* Applicants panel (Pending + no designer assigned) */}
            {request.status === 'Pending' && !request.designerId && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-3 font-semibold">
                  Designer Applicants
                  {applicants.length > 0 && (
                    <span className="ml-2 text-brand-300">({applicants.length})</span>
                  )}
                </p>
                {applicantsLoading ? (
                  <div className="flex items-center gap-2 text-text-muted text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />Loading applicants…
                  </div>
                ) : applicants.length === 0 ? (
                  <p className="text-xs text-text-muted italic">No designers have applied yet. Your request is visible to all verified designers.</p>
                ) : (
                  <div className="space-y-3">
                    {applicants.map((applicant: any) => {
                      const d = applicant.designerId;
                      const dName = `${d?.profile?.firstName ?? ''} ${d?.profile?.lastName ?? ''}`.trim() || d?.profile?.company || 'Unknown';
                      return (
                        <div key={applicant._id} className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-surface-border">
                          <Link href={`/dashboard/designers/${d._id}`} className="hover:opacity-80 transition-opacity">
                            <Avatar
                              src={d?.profile?.avatarUrl || d?.profile?.profilePicture}
                              name={dName}
                              size="md"
                              verified={d?.is_verified}
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/dashboard/designers/${d._id}`} className="hover:text-brand-300 transition-colors">
                              <p className="text-sm font-semibold text-white hover:text-brand-300 transition-colors">{dName}</p>
                            </Link>
                            <p className="text-xs text-text-muted">{d?.profile?.company || 'Independent Designer'}</p>
                            {applicant.note && (
                              <p className="text-xs text-purple-200 mt-1 italic">"{applicant.note}"</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => selectDesigner(request._id, d._id)}
                            disabled={assigningId === d._id}
                          >
                            {assigningId === d._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Select
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {request.status === "Review" && (
                <>
                  <Button 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => {
                      // Request revision functionality
                      if (request.designerId) {
                        // Navigate to chat with revision request
                        window.location.href = `/dashboard/chat?designer=${request.designerId._id}&request=${request._id}&action=revision`;
                      } else {
                        toast.error("No designer assigned to this request");
                      }
                    }}
                  >
                    Request Revision
                  </Button>
                  <Button 
                    variant="gold" 
                    className="flex-1"
                    onClick={() => {
                      if (request.designerId) {
                        approveAndReleasePayment(request._id, request.budget, request.designerId._id);
                      } else {
                        toast.error("No designer assigned to this request");
                      }
                    }}
                    disabled={isProcessingPayment}
                  >
                    <CheckCircle className="w-4 h-4" /> 
                    {isProcessingPayment ? 'Processing...' : 'Approve & Release'}
                  </Button>
                </>
              )}
              {request.status === "In-Progress" && (
                <Button 
                  variant="ghost" 
                  fullWidth
                  onClick={() => {
                    if (request.designerId) {
                      // Navigate to chat with this designer
                      window.location.href = `/dashboard/chat?designer=${request.designerId._id}&request=${request._id}`;
                    } else {
                      toast.error("No designer assigned to this request");
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4" />Message Designer
                </Button>
              )}
              {request.status === "Completed" && (
                <Button 
                  variant="ghost" 
                  fullWidth
                  onClick={() => {
                    // Show final design modal or navigate to design view
                    toast.success("Final design feature coming soon!");
                    // TODO: Implement final design viewing
                    // window.location.href = `/dashboard/designs/${request._id}`;
                  }}
                >
                  <Eye className="w-4 h-4" />View Final Design
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-surface-border text-text-muted">
          <p className="text-sm">Select a request to view details</p>
        </div>
      )}
      </div>

      {/* New Request Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-surface-border p-8 max-w-lg w-full animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-white">New Custom Request</h2>
              <button onClick={() => setShowNew(false)} className="text-text-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Project Title</label>
                <input
                  type="text"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest(prev => ({...prev, title: e.target.value}))}
                  placeholder="Give your project a title..."
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Room Type</label>
                <select value={newRequest.roomType} onChange={(e) => setNewRequest(prev => ({...prev, roomType: e.target.value}))} className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white focus:outline-none focus:border-brand-500 transition-all">
                  {ROOM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Budget Range</label>
                <select value={newRequest.budget} onChange={(e) => setNewRequest(prev => ({...prev, budget: e.target.value}))} className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white focus:outline-none focus:border-brand-500 transition-all">
                  {BUDGET_RANGES.map(range => <option key={range} value={range}>{range}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Description</label>
                <textarea 
                  value={newRequest.description}
                  onChange={(e) => setNewRequest(prev => ({...prev, description: e.target.value}))}
                  placeholder="Describe your design needs..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Attachments (Optional)</label>
                <div className="border-2 border-dashed border-surface-border rounded-xl p-4 text-center hover:border-brand-500/40 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewRequest(prev => ({...prev, attachments: [...prev.attachments, ...files]}));
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                    <p className="text-sm text-text-muted">Click to upload images or documents</p>
                    <p className="text-xs text-text-muted mt-1">PNG, JPG, PDF, DOC (Max 10MB)</p>
                  </label>
                </div>
                {newRequest.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newRequest.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-surface rounded-lg">
                        <span className="text-sm text-white truncate flex-1">{file.name}</span>
                        <button
                          onClick={() => {
                            setNewRequest(prev => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-text-muted hover:text-red-400 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button className="flex-1" onClick={createRequest}>Submit Request</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
