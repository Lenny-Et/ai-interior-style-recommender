"use client";
import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Shield, CheckCircle, X, Edit, AlertTriangle, Flag, Eye, Search, Clock, History, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

type ReviewStatus = "Pending" | "Approved" | "Rejected" | "Edit Requested";

interface PendingContent {
  _id: string;
  title: string;
  description: string;
  images: string[];
  designerId: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    profilePicture?: string;
  };
  metadata: {
    roomType: string;
    styles: string[];
    style?: string;
  };
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  editRequestedAt?: string;
  rejectedAt?: string;
  editRequestNote?: string;
  rejectionReason?: string;
}

  interface Report {
  _id: string;
  targetType: string;
  targetId: string;
  reporterId: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    email: string;
  };
  reason: string;
  details?: string;
  createdAt: string;
  status: string;
}

export default function ModerationPage() {
  const [items, setItems] = useState<PendingContent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [history, setHistory] = useState<PendingContent[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reports' | 'history'>('pending');
  const [contentType, setContentType] = useState<'portfolio' | 'inspiration'>('portfolio');
  const [filter, setFilter] = useState<ReviewStatus | "All">("All");
  const [historyFilter, setHistoryFilter] = useState<"All" | "Approved" | "Rejected" | "Edit Requested">("All");
  const [editNote, setEditNote] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Load pending content from API
  const loadPendingContent = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPendingContent({ type: contentType, limit: 50 });
      const data = (response as any).data || response;
      setItems(data.content || []);
    } catch (error) {
      console.error('Failed to load pending content:', error);
      toast.error('Failed to load pending content');
    } finally {
      setLoading(false);
    }
  };

  // Load reports from API
  const loadReports = async () => {
    try {
      setReportsLoading(true);
      const response = await apiClient.getReports(1, 50, 'pending');
      const data = (response as any).data || response;
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  // Load history from API
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      let status: string | undefined = undefined;
      if (historyFilter === "Approved") status = "approved";
      if (historyFilter === "Rejected") status = "rejected";
      if (historyFilter === "Edit Requested") status = "edit_requested";

      const response = await apiClient.getModerationHistory({ 
        type: contentType, 
        status,
        limit: 50 
      });
      const data = (response as any).data || response;
      setHistory(data.content || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load content on mount or when contentType changes
  useEffect(() => {
    if (activeTab === 'pending') loadPendingContent();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'history') loadHistory();
  }, [contentType, activeTab, historyFilter]);

  useEffect(() => {
    loadPendingContent();
    loadReports();
  }, []);

  // Get status for an item
  const getItemStatus = (item: PendingContent): ReviewStatus => {
    if (item.editRequestedAt) return "Edit Requested";
    if (item.rejectedAt) return "Rejected";
    if (item.isApproved) return "Approved";
    return "Pending";
  };

  // Get designer name
  const getDesignerName = (item: PendingContent): string => {
    if (!item.designerId && !(item as any).userId) return "Unknown User";
    const user = item.designerId || (item as any).userId;
    const { firstName, lastName } = user.profile || {};
    return `${firstName || ''} ${lastName || ''}`.trim() || "Unknown User";
  };

  // Get primary image
  const getPrimaryImage = (item: PendingContent): string => {
    return item.images?.[0] || (item as any).imageUrl || "https://picsum.photos/seed/fallback/400/280";
  };

  // Get primary style
  const getPrimaryStyle = (item: PendingContent): string => {
    return item.metadata?.style || item.metadata?.styles?.[0] || "Modern";
  };

  const filtered = items.filter((i) => {
    const status = getItemStatus(i);
    if (filter !== "All" && status !== filter) return false;
    const designerName = getDesignerName(i);
    if (search && !designerName.toLowerCase().includes(search.toLowerCase()) && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Moderation action handlers
  const handleApprove = async (item: PendingContent) => {
    try {
      setActionLoading(prev => ({ ...prev, [item._id]: true }));
      await apiClient.approveContent(contentType, item._id);
      toast.success('Content approved successfully');
      await loadPendingContent(); // Refresh data
    } catch (error) {
      console.error('Failed to approve content:', error);
      toast.error('Failed to approve content');
    } finally {
      setActionLoading(prev => ({ ...prev, [item._id]: false }));
    }
  };

  const handleReject = async (item: PendingContent, reason?: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [item._id]: true }));
      await apiClient.rejectContent(contentType, item._id, reason);
      toast.success('Content rejected successfully');
      await loadPendingContent(); // Refresh data
    } catch (error) {
      console.error('Failed to reject content:', error);
      toast.error('Failed to reject content');
    } finally {
      setActionLoading(prev => ({ ...prev, [item._id]: false }));
    }
  };

  const handleRequestEdit = async (item: PendingContent) => {
    try {
      setActionLoading(prev => ({ ...prev, [item._id]: true }));
      const note = editNote[item._id] || 'Please review and update this content';
      await apiClient.requestEditContent(contentType, item._id, note);
      toast.success('Edit request sent successfully');
      await loadPendingContent(); // Refresh data
      // Clear the edit note for this item
      setEditNote(prev => {
        const newNotes = { ...prev };
        delete newNotes[item._id];
        return newNotes;
      });
    } catch (error) {
      console.error('Failed to request edit:', error);
      toast.error('Failed to request edit');
    } finally {
      setActionLoading(prev => ({ ...prev, [item._id]: false }));
    }
  };

  const handleRemove = async (item: PendingContent) => {
    try {
      setActionLoading(prev => ({ ...prev, [item._id]: true }));
      await apiClient.removeContent(contentType, item._id, 'Content removed by moderator');
      toast.success('Content removed successfully');
      await loadPendingContent(); // Refresh data
    } catch (error) {
      console.error('Failed to remove content:', error);
      toast.error('Failed to remove content');
    } finally {
      setActionLoading(prev => ({ ...prev, [item._id]: false }));
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [reportId]: true }));
      await apiClient.resolveReport(reportId, 'Resolved by moderator');
      toast.success('Report marked as resolved');
      await loadReports();
    } catch (error) {
      console.error('Failed to resolve report:', error);
      toast.error('Failed to resolve report');
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [reportId]: true }));
      await apiClient.dismissReport(reportId);
      toast.success('Report dismissed');
      await loadReports();
    } catch (error) {
      console.error('Failed to dismiss report:', error);
      toast.error('Failed to dismiss report');
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-7 h-7 text-brand-400" /> Moderation Hub
          </h1>
          <p className="text-text-muted text-sm">Review designer uploads before they go live</p>
        </div>
        <div className="flex gap-2 text-xs text-text-muted">
          <Badge variant="gold">Pending: {items.filter(i => getItemStatus(i) === "Pending").length}</Badge>
          <Badge variant="green">Approved: {items.filter(i => getItemStatus(i) === "Approved").length}</Badge>
          <Badge variant="red">Edit Requested: {items.filter(i => getItemStatus(i) === "Edit Requested").length}</Badge>
        </div>
      </div>

      {/* Content Type Switcher */}
      <div className="flex items-center justify-between border-b border-surface-border">
        <div className="flex gap-4">
          <button 
            onClick={() => setContentType('portfolio')}
            className={cn(
              "pb-3 text-sm font-medium transition-all relative",
              contentType === 'portfolio' ? "text-brand-400" : "text-text-muted hover:text-white"
            )}
          >
            Portfolio Items
            {contentType === 'portfolio' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400" />}
          </button>
          <button 
            onClick={() => setContentType('inspiration')}
            className={cn(
              "pb-3 text-sm font-medium transition-all relative",
              contentType === 'inspiration' ? "text-brand-400" : "text-text-muted hover:text-white"
            )}
          >
            Inspiration Posts
            {contentType === 'inspiration' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400" />}
          </button>
        </div>

        <div className="flex gap-2 mb-2">
          <Button 
            variant={activeTab === 'pending' ? 'brand' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('pending')}
            className="text-xs"
          >
            <Shield className="w-3.5 h-3.5 mr-1" /> Pending
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'brand' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('history')}
            className="text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> History
          </Button>
          <Button 
            variant={activeTab === 'reports' ? 'brand' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('reports')}
            className="text-xs"
          >
            <Flag className="w-3.5 h-3.5 mr-1" /> Reports
          </Button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search by title or designer..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-card border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {(["All", "Pending", "Approved", "Edit Requested", "Rejected"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap",
                    filter === f 
                      ? "bg-brand-500/10 border-brand-500 text-brand-400" 
                      : "bg-surface-card border-surface-border text-text-muted hover:border-brand-500/40"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Pending Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading pending items...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500/40 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-1">Queue is clear!</h3>
              <p className="text-text-muted text-sm">No items currently matching your filters.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => {
                const status = getItemStatus(item);
                const designerName = getDesignerName(item);
                
                return (
                  <Card key={item._id} className="group overflow-hidden border-surface-border hover:border-brand-500/40 transition-all">
                    <div className="relative aspect-video">
                      <img src={getPrimaryImage(item)} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge variant={
                          status === "Approved" ? "green" : 
                          status === "Edit Requested" ? "orange" : 
                          status === "Rejected" ? "red" : "gold"
                        }>
                          {status}
                        </Badge>
                        <Badge variant="brand">{getPrimaryStyle(item)}</Badge>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-text-muted mt-1">by {designerName}</p>
                      </div>

                      {status === "Edit Requested" && item.editRequestNote && (
                        <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-2">
                          <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Current Edit Note</p>
                          <p className="text-xs text-orange-200/70 italic line-clamp-2">{item.editRequestNote}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <textarea 
                          placeholder="Add a feedback note for the designer..."
                          value={editNote[item._id] || ''}
                          onChange={(e) => setEditNote(prev => ({ ...prev, [item._id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-brand-500 transition-all resize-none"
                          rows={2}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Button 
                            size="sm" 
                            variant="brand" 
                            className="text-[10px] py-1 h-8"
                            onClick={() => handleApprove(item)}
                            disabled={actionLoading[item._id]}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-[10px] py-1 h-8 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                            onClick={() => handleRequestEdit(item)}
                            disabled={actionLoading[item._id]}
                          >
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="text-[10px] py-1 h-8"
                            onClick={() => handleReject(item, editNote[item._id])}
                            disabled={actionLoading[item._id]}
                          >
                            <X className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {/* History Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(["All", "Approved", "Rejected", "Edit Requested"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap",
                  historyFilter === f 
                    ? "bg-brand-500/10 border-brand-500 text-brand-400" 
                    : "bg-surface-card border-surface-border text-text-muted hover:border-brand-500/40"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* History Grid */}
          {historyLoading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading moderation history...</p>
            </div>
          ) : history.length === 0 ? (
            <Card className="p-12 text-center">
              <Shield className="w-12 h-12 text-text-muted/40 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-1">No history found</h3>
              <p className="text-text-muted text-sm">Previously moderated items will appear here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((item) => {
                const status = getItemStatus(item);
                const designerName = getDesignerName(item);
                
                return (
                  <Card key={item._id} className="group overflow-hidden border-surface-border">
                    <div className="relative aspect-video grayscale-[0.5] group-hover:grayscale-0 transition-all">
                      <img src={getPrimaryImage(item)} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge variant={
                          status === "Approved" ? "green" : 
                          status === "Edit Requested" ? "orange" : 
                          status === "Rejected" ? "red" : "gold"
                        }>
                          {status}
                        </Badge>
                        <Badge variant="brand">{getPrimaryStyle(item)}</Badge>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-white line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-text-muted mt-1 flex justify-between">
                          <span>by {designerName}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>

                      {item.editRequestNote && (
                        <div className="bg-surface-card border border-surface-border rounded-lg p-2">
                          <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Moderator Note</p>
                          <p className="text-xs text-text-muted italic line-clamp-2">{item.editRequestNote}</p>
                        </div>
                      )}
                      
                      {item.rejectionReason && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                          <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Rejection Reason</p>
                          <p className="text-xs text-red-200/70 italic line-clamp-2">{item.rejectionReason}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="flex-1 text-[10px] py-1 h-8"
                          onClick={() => handleApprove(item)}
                          disabled={status === "Approved"}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> {status === "Approved" ? "Approved" : "Re-approve"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="text-[10px] py-1 h-8"
                          onClick={() => handleRemove(item)}
                        >
                          <X className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Community Reports
            </h2>
            <Badge variant="red">{reports.length} New</Badge>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-surface-border text-[10px] text-text-muted uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Report ID</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Reporter</th>
                  <th className="px-6 py-4 font-semibold">Target ID</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {reportsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading reports...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                      <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                      All clear! No pending reports.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => {
                    const reporterName = r.reporterId?.profile 
                      ? `${r.reporterId.profile.firstName || ''} ${r.reporterId.profile.lastName || ''}`.trim() 
                      : r.reporterId?.email || 'Unknown';
                      
                    return (
                      <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-[10px] text-brand-300">{r._id}</td>
                        <td className="px-6 py-4"><Badge variant="red" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />{r.targetType}</Badge></td>
                        <td className="px-6 py-4 text-xs text-text-muted">{reporterName}</td>
                        <td className="px-6 py-4 text-[10px] font-mono text-purple-100/60">{r.targetId}</td>
                        <td className="px-6 py-4 text-xs text-text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleResolveReport(r._id)}
                              disabled={actionLoading[r._id]}
                              title="Resolve Report"
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleDismissReport(r._id)}
                              disabled={actionLoading[r._id]}
                              title="Dismiss Report"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
