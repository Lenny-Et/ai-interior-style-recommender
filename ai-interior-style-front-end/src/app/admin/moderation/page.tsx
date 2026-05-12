"use client";
import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { Shield, CheckCircle, X, Edit, AlertTriangle, Flag, Eye, Search } from "lucide-react";
import { cn, STYLE_TAGS } from "@/lib/utils";
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
  };
  isApproved: boolean;
  createdAt: string;
  editRequestedAt?: string;
  rejectedAt?: string;
  editRequestNote?: string;
  rejectionReason?: string;
}

interface Report {
  _id: string;
  type: string;
  reporterId: string;
  targetId: string;
  reason: string;
  createdAt: string;
  status: string;
}

export default function ModerationPage() {
  const [items, setItems] = useState<PendingContent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | "All">("All");
  const [editNote, setEditNote] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Load pending content from API
  const loadPendingContent = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPendingContent({ type: 'portfolio', limit: 50 });
      const data = (response as any).data || response;
      setItems(data.content || []);
    } catch (error) {
      console.error('Failed to load pending content:', error);
      toast.error('Failed to load pending content');
    } finally {
      setLoading(false);
    }
  };

  // Load content on mount
  useEffect(() => {
    loadPendingContent();
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
    if (!item.designerId) return "Unknown Designer";
    const { firstName, lastName } = item.designerId.profile || {};
    return `${firstName || ''} ${lastName || ''}`.trim() || "Unknown Designer";
  };

  // Get primary image
  const getPrimaryImage = (item: PendingContent): string => {
    return item.images?.[0] || "https://picsum.photos/seed/fallback/400/280";
  };

  // Get primary style
  const getPrimaryStyle = (item: PendingContent): string => {
    return item.metadata?.styles?.[0] || "Modern";
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
      await apiClient.approveContent('portfolio', item._id);
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
      await apiClient.rejectContent('portfolio', item._id, reason);
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
      await apiClient.requestEditContent('portfolio', item._id, note);
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
      await apiClient.removeContent('portfolio', item._id, 'Content removed by moderator');
      toast.success('Content removed successfully');
      await loadPendingContent(); // Refresh data
    } catch (error) {
      console.error('Failed to remove content:', error);
      toast.error('Failed to remove content');
    } finally {
      setActionLoading(prev => ({ ...prev, [item._id]: false }));
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by designer or title…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" />
        </div>
        <div className="flex gap-2">
          {(["All","Pending","Approved","Edit Requested","Rejected"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap",
                filter === s ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Approval queue */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Loading pending content...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted">No content found matching your filters</p>
          </div>
        ) : (
          filtered.map((item) => {
            const status = getItemStatus(item);
            const designerName = getDesignerName(item);
            const primaryImage = getPrimaryImage(item);
            const primaryStyle = getPrimaryStyle(item);
            const roomType = item.metadata?.roomType || "Living Room";
            
            return (
              <Card key={item._id} className="overflow-hidden">
                <div className="grid md:grid-cols-[280px_1fr] gap-0">
                  <div className="relative">
                    <img src={primaryImage} alt={item.title} className="w-full h-48 md:h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <Badge
                      variant={status === "Approved" ? "green" : status === "Pending" ? "gold" : status === "Edit Requested" ? "orange" : "red"}
                      className="absolute top-3 left-3"
                    >
                      {status}
                    </Badge>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar src={item.designerId?.profilePicture} name={designerName} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-white">{designerName}</p>
                          <p className="text-xs text-text-muted font-mono">{item._id}</p>
                        </div>
                      </div>
                      <p className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-white mb-1">{item.title}</p>
                      <div className="flex gap-2">
                        <Badge variant="brand">{primaryStyle}</Badge>
                        <Badge variant="gray">{roomType}</Badge>
                      </div>
                    </div>

                    {/* Edit note input */}
                    {status === "Pending" && (
                      <textarea
                        value={editNote[item._id] ?? ""}
                        onChange={(e) => setEditNote({ ...editNote, [item._id]: e.target.value })}
                        placeholder="Optional: Add an edit request note for the designer…"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none"
                      />
                    )}

                    <div className="flex gap-2 flex-wrap mt-auto">
                      <Button size="sm"><Eye className="w-3.5 h-3.5" /> Full Preview</Button>
                      {status === "Pending" && (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" 
                            onClick={() => handleApprove(item)}
                            disabled={actionLoading[item._id]}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> 
                            {actionLoading[item._id] ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-gold-400 border-gold-500/30 hover:bg-gold-500/10" 
                            onClick={() => handleRequestEdit(item)}
                            disabled={actionLoading[item._id]}
                          >
                            <Edit className="w-3.5 h-3.5" /> 
                            {actionLoading[item._id] ? 'Processing...' : 'Request Edit'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleReject(item)}
                            disabled={actionLoading[item._id]}
                          >
                            <X className="w-3.5 h-3.5" /> 
                            {actionLoading[item._id] ? 'Processing...' : 'Reject'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Report center */}
      <div>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-400" /> Report Center
          <Badge variant="red">{reports.length}</Badge>
        </h2>
        <Card>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <Flag className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No reports at this time</p>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Report ID</th><th>Type</th><th>Reporter</th><th>Target</th><th>Time</th><th>Actions</th></tr></thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r._id}>
                    <td className="font-mono text-xs">{r._id}</td>
                    <td><Badge variant="red"><AlertTriangle className="w-3 h-3" />{r.type}</Badge></td>
                    <td className="text-xs text-text-muted">{r.reporterId}</td>
                    <td className="text-xs text-purple-100">{r.targetId}</td>
                    <td className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost"><Eye className="w-3 h-3" /></Button>
                        <Button size="sm" variant="destructive"><X className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
