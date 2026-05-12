"use client";
import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import {
  MessageCircle, Send, Lock, Crown, Search, Filter,
  Plus, User, Clock, CheckCircle, AlertCircle, Paperclip, X, Image as ImageIcon
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
      profilePicture?: string;
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
    senderId: {
      _id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    message: string;
    createdAt: string;
  }>;
}

interface Designer {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
    company?: string;
  };
  role: string;
  is_verified?: boolean;
}

const STATUS_META: Record<Status, { variant: "blue"|"gold"|"brand"|"green"|"gray"; label: string }> = {
  Pending:      { variant: "gold",  label: "New Request" },
  "In-Progress":{ variant: "brand", label: "In Progress" },
  Review:       { variant: "blue",  label: "Review" },
  Completed:    { variant: "green", label: "Completed" },
  Cancelled:    { variant: "gray",  label: "Cancelled" },
};

export default function ChatPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [designersLoading, setDesignersLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<any>(null);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    checkPremiumStatus();
    loadRequests();
    loadDesigners();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      setCheckingPremium(true);
      const response = await apiClient.checkChatPremiumStatus();
      setPremiumStatus(response);
    } catch (error: any) {
      console.error("Premium status check failed:", error);
      setPremiumStatus({ hasPremiumAccess: false, message: "Failed to check premium status" });
    } finally {
      setCheckingPremium(false);
    }
  };

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

  const loadDesigners = async () => {
    try {
      setDesignersLoading(true);
      
      // Fetch real designers from backend
      const response = await apiClient.getDesigners({
        verified: true, // Only show verified designers
        limit: 20,
        sortBy: 'relevance'
      });
      
      const designersData = (response as any).data || response;
      const designers = designersData.designers || designersData || [];
      
      console.log('Loaded real designers:', designers);
      setDesigners(designers);
      
      // Fallback to mock if no real designers available
      if (designers.length === 0) {
        console.log('No real designers found, using fallback mock data');
        const fallbackDesigners: Designer[] = [
          {
            _id: "testdesigner@aura.com",
            profile: { firstName: "Test", lastName: "Designer", company: "Test Design Studio" },
            role: "designer",
            is_verified: true
          }
        ];
        setDesigners(fallbackDesigners);
      }
    } catch (error: any) {
      console.error("Failed to load designers:", error);
      // Fallback to mock data on error
      const fallbackDesigners: Designer[] = [
        {
          _id: "testdesigner@aura.com",
          profile: { firstName: "Test", lastName: "Designer", company: "Test Design Studio" },
          role: "designer",
          is_verified: true
        }
      ];
      setDesigners(fallbackDesigners);
    } finally {
      setDesignersLoading(false);
    }
  };

  const approveAndReleasePayment = async (requestId: string, budget: number, designerId: string) => {
    try {
      setIsProcessingPayment(true);
      
      const { user } = useAppStore.getState();
      if (!user || user.role !== 'homeowner') {
        toast.error("Only homeowners can approve payments");
        return;
      }
      
      const response = await apiClient.initializePayment({
        amount: budget,
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName || 'User',
        homeownerId: user.id,
        designerId: designerId,
        sessionId: requestId
      });
      
      const paymentData = (response as any).data || response;
      if (paymentData.checkoutUrl) {
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

  const createNewChat = async (designerId: string) => {
    try {
      console.log('Creating new chat with designer:', designerId);
      
      // Create a new custom request that immediately assigns the designer
      const response = await apiClient.createCustomRequest({
        title: "Design Consultation",
        description: "I would like to discuss design ideas for my space.",
        roomType: "Living Room",
        budget: 1000,
        urgency: "Normal"
      });

      console.log('Create request response:', response);
      const data = (response as any).data || response;
      const newRequest = data.customRequest || data;
      console.log('New request object:', newRequest);
      
      if (!newRequest || !newRequest._id) {
        throw new Error('Failed to create request - no valid request ID returned');
      }
      
      console.log('Assigning designer to request:', newRequest._id);
      // Assign the designer
      await apiClient.assignDesignerToRequest(newRequest._id, designerId);
      
      toast.success("Chat session started successfully!");
      setShowNewChat(false);
      loadRequests();
      
      // Set the new request as active
      setActive(newRequest._id);
    } catch (error: any) {
      console.error('Chat creation error:', error);
      toast.error(error.error || error.message || "Failed to start chat");
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
      if (error.error?.includes('Premium access required')) {
        toast.error("Premium access required for chat functionality");
      } else {
        toast.error(error.error || error.message || "Failed to send message");
      }
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.designerId?.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.designerId?.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const ticket = filteredRequests.find((r) => r._id === active);

  if (checkingPremium) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!premiumStatus?.hasPremiumAccess && premiumStatus?.isDesigner !== true) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-gold-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Premium Access Required</h2>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Chat with professional designers requires a premium subscription. Upgrade your account to unlock unlimited design consultations.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="brand" onClick={() => window.location.href = '/dashboard/payments'}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
            <Button variant="ghost" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Designer Chat</h1>
          <p className="text-text-muted text-sm">Connect with professional interior designers</p>
        </div>
        <Button onClick={() => setShowNewChat(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Start New Chat</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowNewChat(false)}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-text-muted">Choose a designer to start your consultation:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {designers.length === 0 && !designersLoading ? (
                  <div className="text-center py-8 text-text-muted">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm">Loading available designers...</p>
                  </div>
                ) : designers.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <p className="text-sm">No designers available at the moment.</p>
                    <p className="text-xs mt-1">Please try again later.</p>
                  </div>
                ) : (
                  designers.map((designer) => (
                    <button
                      key={designer._id}
                      onClick={() => createNewChat(designer._id)}
                      className="w-full text-left p-3 rounded-xl border border-surface-border hover:border-brand-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${designer.profile.firstName} ${designer.profile.lastName}`}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {designer.profile.firstName} {designer.profile.lastName}
                          </p>
                          <p className="text-xs text-text-muted">{designer.profile.company}</p>
                        </div>
                        {designer.is_verified && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-white focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Status</option>
          <option value="Pending">New</option>
          <option value="In-Progress">In Progress</option>
          <option value="Review">Review</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 flex-wrap">
        {["Pending", "In-Progress", "Review", "Completed"].map((status) => {
          const count = filteredRequests.filter((r) => r.status === status).length;
          return count > 0 ? (
            <Badge key={status} variant={STATUS_META[status as Status].variant as any}>
              {STATUS_META[status as Status].label}: {count}
            </Badge>
          ) : null;
        })}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        {/* Chat List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-text-muted">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm">Loading conversations...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-white">No conversations found</p>
              <p className="text-xs mt-1">Start a new chat with a designer</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <button
                key={request._id}
                onClick={() => setActive(request._id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all",
                  active === request._id
                    ? "border-brand-500 bg-brand-600/10 shadow-glow-sm"
                    : "border-surface-border bg-surface-card hover:border-brand-500/40"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-text-muted">{request._id.slice(-6)}</span>
                  <Badge variant={STATUS_META[request.status].variant}>
                    {STATUS_META[request.status].label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  {request.designerId ? (
                    <>
                      <Avatar
                        name={`${request.designerId.profile.firstName} ${request.designerId.profile.lastName}`}
                        size="xs"
                      />
                      <p className="text-sm font-semibold text-white">
                        {request.designerId.profile.firstName} {request.designerId.profile.lastName}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-white">Unassigned</p>
                  )}
                </div>
                <p className="text-xs text-text-muted">{request.title}</p>
                <p className="text-[10px] text-text-muted mt-1">
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {formatDate(request.updatedAt)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Chat Detail */}
        {ticket ? (
          <Card className="overflow-hidden flex flex-col h-[600px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {ticket.designerId ? (
                    <>
                      <Avatar
                        name={`${ticket.designerId.profile.firstName} ${ticket.designerId.profile.lastName}`}
                        size="md"
                      />
                      <div>
                        <p className="font-semibold text-white">
                          {ticket.designerId.profile.firstName} {ticket.designerId.profile.lastName}
                        </p>
                        <p className="text-xs text-text-muted">
                          {ticket._id.slice(-6)} · {ticket.roomType} · ${ticket.budget.toLocaleString()}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="font-semibold text-white">Waiting for Designer</p>
                      <p className="text-xs text-text-muted">
                        {ticket._id.slice(-6)} · {ticket.roomType}
                      </p>
                    </div>
                  )}
                </div>
                <Badge variant={STATUS_META[ticket.status].variant}>
                  {STATUS_META[ticket.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col space-y-4">
              {/* Project Brief */}
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Project Brief</p>
                <p className="text-sm text-purple-100 leading-relaxed">{ticket.description}</p>
              </div>

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Room Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {ticket.attachments.map((attachment, i) => (
                      <img
                        key={i}
                        src={attachment.url}
                        alt={attachment.originalName}
                        className="w-24 h-20 object-cover rounded-lg border border-surface-border hover:opacity-80 cursor-pointer transition-opacity"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Conversation</p>
                {ticket.messages && ticket.messages.length > 0 ? (
                  ticket.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        msg.sender === "homeowner" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.sender === "designer" && (
                        <Avatar
                          name={
                            msg.senderId?.profile 
                              ? `${msg.senderId.profile.firstName} ${msg.senderId.profile.lastName}`
                              : "Designer"
                          }
                          size="xs"
                        />
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          msg.sender === "homeowner"
                            ? "bg-brand-600 text-white"
                            : "bg-surface border border-surface-border text-purple-100"
                        )}
                      >
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.attachments.map((file, idx) => (
                              <img key={idx} src={file.url} alt="attachment" className="w-32 h-32 object-cover rounded-xl" />
                            ))}
                          </div>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                      {msg.sender === "homeowner" && (
                        <Avatar
                          name="You"
                          size="xs"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              {/* Review Banner */}
              {ticket.status === "Review" && ticket.designerId && (
                <div className="border-t border-surface-border pt-4 pb-2">
                  <div className="p-4 rounded-xl border border-gold-500/30 bg-gold-500/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gold-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Design Ready for Review
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        The designer has submitted the final files. If you are satisfied, approve it to release payment.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setMessage("I would like to request a revision...")}>
                        Request Revision
                      </Button>
                      <Button 
                        variant="gold" 
                        size="sm" 
                        disabled={isProcessingPayment}
                        onClick={() => approveAndReleasePayment(ticket._id, ticket.budget, ticket.designerId!._id)}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        {isProcessingPayment ? 'Processing...' : 'Approve & Release'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Input */}
              {ticket.status !== "Completed" && ticket.status !== "Cancelled" && ticket.designerId && (
                <div className="border-t border-surface-border pt-4">
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
                      id="chat-upload"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
                        }
                      }}
                    />
                    <label htmlFor="chat-upload" className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-surface-border hover:border-brand-500/50 cursor-pointer transition-colors text-text-muted hover:text-white shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </label>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500"
                    />
                    <Button size="sm" onClick={sendMessage} disabled={!message.trim() && attachments.length === 0}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!ticket.designerId && (
                <div className="text-center py-4">
                  <AlertCircle className="w-5 h-5 text-gold-400 mx-auto mb-2" />
                  <p className="text-sm text-gold-300">Waiting for designer assignment...</p>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-surface-border text-text-muted">
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
