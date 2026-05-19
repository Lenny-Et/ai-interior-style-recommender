"use client";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import { Upload, X, CheckCircle, Eye, Edit, Trash2, Star, Tag } from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, CURATED_COLORS, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";

interface PortfolioItem {
  _id: string;
  designerId: string;
  imageUrl: string;
  cloudinaryId: string;
  description?: string;
  isApproved: boolean;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  editRequestedAt?: string;
  editRequestNote?: string;
  metadata: {
    style: string;
    colorPalette: string[];
    roomType: string;
    title?: string;
    featured?: boolean;
    views?: number;
  };
  createdAt: string;
  updatedAt: string;
}

type UploadFile = { file: File; preview: string; style: string; room: string; title: string; colors: string[] };

export default function PortfolioManagerPage() {
  const { user } = useAppStore();
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [successIds, setSuccessIds] = useState<string[]>([]);
  const [viewingItem, setViewingItem] = useState<PortfolioItem | null>(null);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load portfolio items on mount or when user changes
  useEffect(() => {
    if (user?.id) {
      loadPortfolioItems();
    }
  }, [user?.id]);

  const loadPortfolioItems = async () => {
    try {
      setLoading(true);
      
      const designerId = user?.id;
      
      if (!designerId) {
        setLoading(false);
        return;
      }

      const response = await apiClient.getPortfolioItems(designerId);
      const items = (response as any).items || [];
      setPortfolioItems(items);
    } catch (error: any) {
      console.error('Failed to load portfolio items:', error);
      
      // Handle authentication errors specifically
      if (error.status === 401 || error.status === 403) {
        toast.error('Authentication required. Please log in again.');
      } else {
        toast.error(error.error || error.message || "Failed to load portfolio items");
      }
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: UploadFile[] = acceptedFiles.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      style: "",
      room: "",
      title: f.name.replace(/\.[^/.]+$/, ""),
      colors: [],
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/*": [] }, multiple: true });

  const updateUpload = (idx: number, key: keyof UploadFile, value: any) =>
    setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, [key]: value } : u));

  const removeUpload = (idx: number) =>
    setUploads((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (uploads.length === 0) {
      toast.error("No files to upload");
      return;
    }

    // Validate all uploads have required fields
    const invalidUploads = uploads.filter(u => !u.title.trim() || !u.style || !u.room);
    if (invalidUploads.length > 0) {
      toast.error("All items must have title, style, and room type");
      return;
    }

    setSubmitting(true);
    
    try {
      const designerId = user?.id;
      
      if (!designerId) {
        toast.error("Authentication required. Please log in to upload portfolio items.");
        return;
      }

      // Upload each file
      const uploadPromises = uploads.map(async (upload) => {
        const response = await apiClient.uploadPortfolioItem({
          designerId,
          title: upload.title,
          style: upload.style,
          roomType: upload.room,
          colors: upload.colors && upload.colors.length > 0 ? upload.colors.join(',') : undefined,
          description: '', // Optional
        }, upload.file);
        
        return (response as any).item;
      });

      const uploadedItems = await Promise.all(uploadPromises);
      
      // Add to portfolio items
      setPortfolioItems(prev => [...uploadedItems, ...prev]);
      
      // Clear uploads
      setUploads([]);
      
      toast.success(`Successfully uploaded ${uploadedItems.length} portfolio item(s)`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.error || error.message || "Failed to upload portfolio items");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFeatured = async (itemId: string) => {
    try {
      const item = portfolioItems.find(i => i._id === itemId);
      const newFeaturedStatus = !item?.metadata?.featured;
      
      const response = await apiClient.togglePortfolioFeatured(itemId, newFeaturedStatus);
      const updatedItem = (response as any).item;
      
      // Update local state
      setPortfolioItems(prev => prev.map(item => 
        item._id === itemId ? updatedItem : item
      ));
      
      toast.success(`Item ${newFeaturedStatus ? 'featured' : 'unfeatured'} successfully`);
    } catch (error: any) {
      console.error('Toggle featured error:', error);
      toast.error(error.error || error.message || "Failed to update featured status");
    }
  };

  const viewItem = async (item: PortfolioItem) => {
    try {
      // Increment view count
      await apiClient.updatePortfolioItem(item._id, {
        metadata: {
          ...item.metadata,
          views: (item.metadata.views || 0) + 1
        }
      });
      
      // Update local state with incremented view count
      setPortfolioItems(prev => prev.map(i => 
        i._id === item._id 
          ? { ...i, metadata: { ...i.metadata, views: (i.metadata.views || 0) + 1 } }
          : i
      ));
      
      // Show the item in a modal
      setViewingItem({ ...item, metadata: { ...item.metadata, views: (item.metadata.views || 0) + 1 } });
    } catch (error: any) {
      console.error('View error:', error);
      // Still show the item even if view count fails
      setViewingItem(item);
    }
  };

  const deletePortfolioItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this portfolio item?")) {
      return;
    }

    try {
      await apiClient.deletePortfolioItem(itemId);
      
      // Remove from local state
      setPortfolioItems(prev => prev.filter(item => item._id !== itemId));
      
      toast.success("Portfolio item deleted successfully");
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.error || error.message || "Failed to delete portfolio item");
    }
  };

  const saveEdit = async () => {
    if (!editingItem) return;

    try {
      setIsUpdating(true);
      const response = await apiClient.updatePortfolioItem(editingItem._id, {
        description: editingItem.description,
        metadata: editingItem.metadata
      });
      
      const updatedItem = (response as any).item;
      
      // Update local state
      setPortfolioItems(prev => prev.map(item => 
        item._id === editingItem._id ? updatedItem : item
      ));
      
      toast.success("Portfolio item updated and resubmitted for review");
      setEditingItem(null);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.error || error.message || "Failed to update portfolio item");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Portfolio Manager</h1>
          <p className="text-text-muted text-sm">Upload, organize, and manage your design portfolio</p>
        </div>
        <div className="flex gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> 
            Portfolio ({portfolioItems.length})
          </span>
        </div>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300",
          isDragActive ? "border-brand-500 bg-brand-600/10 shadow-glow" : "border-surface-border hover:border-brand-500/60 hover:bg-surface-hover"
        )}
      >
        <input {...getInputProps()} id="portfolio-upload" />
        <div className="w-14 h-14 rounded-2xl bg-brand-600/15 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-7 h-7 text-brand-400" />
        </div>
        <h2 className="font-semibold text-white mb-1">{isDragActive ? "Drop your images here!" : "Bulk upload portfolio images"}</h2>
        <p className="text-sm text-text-muted">Drag & drop multiple images · Auto-optimized by Next.js</p>
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">{uploads.length} image{uploads.length > 1 ? "s" : ""} ready to tag</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setUploads([])}>Clear all</Button>
              <Button loading={submitting} onClick={submit}>
                <Upload className="w-4 h-4" /> Submit for Approval
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {uploads.map((u, idx) => (
              <div key={idx} className="card p-4 grid sm:grid-cols-[auto_1fr] gap-4">
                <img src={u.preview} alt="" className="w-28 h-20 object-cover rounded-xl border border-surface-border" />
                <div className="flex flex-col gap-3">
                  <div className="grid sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Title *</label>
                      <input value={u.title} onChange={(e) => updateUpload(idx, "title", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Style *</label>
                      <select value={u.style} onChange={(e) => updateUpload(idx, "style", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all">
                        <option value="">Select…</option>
                        {STYLE_TAGS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Room Type *</label>
                      <select value={u.room} onChange={(e) => updateUpload(idx, "room", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all">
                        <option value="">Select…</option>
                        {ROOM_TYPES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Color Accent Picker */}
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 block">Color Accents (Select up to 4)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CURATED_COLORS.map((color) => {
                        const isSelected = u.colors.includes(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            title={color}
                            onClick={() => {
                              const nextColors = isSelected
                                ? u.colors.filter(c => c !== color)
                                : u.colors.length < 4 ? [...u.colors, color] : u.colors;
                              updateUpload(idx, "colors", nextColors);
                            }}
                            className={cn(
                              "w-6 h-6 rounded-full border transition-all duration-150 hover:scale-110",
                              isSelected
                                ? "border-brand-400 ring-2 ring-brand-400/50 scale-110"
                                : "border-surface-border hover:border-white/40"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeUpload(idx)} className="self-start sm:col-start-2 text-text-muted hover:text-red-400 transition-colors ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing portfolio */}
      <div>
        <h2 className="font-semibold text-white mb-4">Your Portfolio ({portfolioItems.length})</h2>
        {loading ? (
          <div className="text-center py-16 text-text-muted">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="font-semibold text-white">Loading portfolio...</p>
          </div>
        ) : portfolioItems.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Upload className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-white">No portfolio items yet</p>
            <p className="text-sm mt-1">Upload your first design to get started</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {portfolioItems.map((item) => (
              <Card key={item._id} className="group overflow-hidden">
                <div className="relative">
                  <img 
                    src={item.imageUrl} 
                    alt={item.metadata.title || 'Portfolio item'} 
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    {item.isApproved ? (
                      <Badge variant="green">Published</Badge>
                    ) : item.rejectedAt ? (
                      <Badge variant="red">Rejected</Badge>
                    ) : item.editRequestedAt ? (
                      <Badge variant="orange">Edit Requested</Badge>
                    ) : (
                      <Badge variant="gold">Pending Approval</Badge>
                    )}
                    {item.metadata.featured && (
                      <Badge variant="gold">
                        <Star className="w-2.5 h-2.5 fill-current" />Featured
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm text-white">
                      {item.metadata.title || 'Untitled Design'}
                    </p>
                    <div className="flex gap-1">
                      <Badge variant="brand">{item.metadata.style}</Badge>
                    </div>
                  </div>
                  
                  {item.editRequestNote && !item.isApproved && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 mb-3">
                      <p className="text-[10px] text-orange-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Edit className="w-3 h-3" /> Note from Admin
                      </p>
                      <p className="text-xs text-orange-200/80 italic line-clamp-2">{item.editRequestNote}</p>
                    </div>
                  )}

                  {item.rejectionReason && !item.isApproved && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3">
                      <p className="text-[10px] text-red-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <X className="w-3 h-3" /> Rejection Reason
                      </p>
                      <p className="text-xs text-red-200/80 italic line-clamp-2">{item.rejectionReason}</p>
                    </div>
                  )}

                  {item.description && (
                    <p className="text-xs text-text-muted mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{(item.metadata.views || 0).toLocaleString()} views</span>
                    </div>
                    {item.metadata.featured && (
                      <Badge variant="gold" className="text-xs">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => toggleFeatured(item._id)}
                    >
                      <Star className="w-3.5 h-3.5" /> 
                      {item.metadata.featured ? 'Unfeature' : 'Feature'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => viewItem(item)}
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deletePortfolioItem(item._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Item Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img 
                src={viewingItem.imageUrl} 
                alt={viewingItem.metadata.title || 'Portfolio item'} 
                className="w-full h-96 object-cover rounded-t-2xl" 
              />
              <button 
                onClick={() => setViewingItem(null)}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {viewingItem.metadata.title || 'Untitled Design'}
                  </h2>
                  <div className="flex gap-2 mb-3">
                    <Badge variant="brand">{viewingItem.metadata.style}</Badge>
                    <Badge variant="gray">{viewingItem.metadata.roomType}</Badge>
                    {viewingItem.isApproved ? (
                      <Badge variant="green">Published</Badge>
                    ) : viewingItem.rejectedAt ? (
                      <Badge variant="red">Rejected</Badge>
                    ) : viewingItem.editRequestedAt ? (
                      <Badge variant="orange">Edit Requested</Badge>
                    ) : (
                      <Badge variant="gold">Pending Approval</Badge>
                    )}
                    {viewingItem.metadata.featured && (
                      <Badge variant="gold">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-text-muted mb-2">
                    <Eye className="w-4 h-4" />
                    <span>{(viewingItem.metadata.views || 0).toLocaleString()} views</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {new Date(viewingItem.createdAt || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {viewingItem.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
                  <p className="text-text-muted">{viewingItem.description}</p>
                </div>
              )}

              {viewingItem.editRequestNote && !viewingItem.isApproved && (
                <div className="mb-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                    <Edit className="w-4 h-4" /> Admin Feedback (Edit Requested)
                  </h3>
                  <p className="text-orange-200/80 italic">{viewingItem.editRequestNote}</p>
                </div>
              )}

              {viewingItem.rejectionReason && !viewingItem.isApproved && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <X className="w-4 h-4" /> Rejection Reason
                  </h3>
                  <p className="text-red-200/80 italic">{viewingItem.rejectionReason}</p>
                </div>
              )}
              
              {viewingItem.metadata.colorPalette && viewingItem.metadata.colorPalette.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white mb-2">Color Palette</h3>
                  <div className="flex gap-2">
                    {viewingItem.metadata.colorPalette.map((color, index) => (
                      <div 
                        key={index}
                        className="w-8 h-8 rounded-lg border border-surface-border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => toggleFeatured(viewingItem._id)}
                  className="flex-1"
                >
                  <Star className="w-4 h-4 mr-2" /> 
                  {viewingItem.metadata.featured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setEditingItem(viewingItem);
                    setViewingItem(null);
                  }}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    deletePortfolioItem(viewingItem._id);
                    setViewingItem(null);
                  }}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-brand-400" /> Edit Portfolio Item
              </h2>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-text-muted hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-video rounded-xl overflow-hidden border border-surface-border">
                    <img src={editingItem.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] text-text-muted uppercase text-center">Image cannot be changed after upload</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Title *</label>
                    <input 
                      value={editingItem.metadata.title || ''} 
                      onChange={(e) => setEditingItem({
                        ...editingItem, 
                        metadata: { ...editingItem.metadata, title: e.target.value }
                      })}
                      className="w-full px-4 py-2 rounded-xl bg-surface-card border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Style *</label>
                    <select 
                      value={editingItem.metadata.style} 
                      onChange={(e) => setEditingItem({
                        ...editingItem, 
                        metadata: { ...editingItem.metadata, style: e.target.value }
                      })}
                      className="w-full px-4 py-2 rounded-xl bg-surface-card border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
                    >
                      {STYLE_TAGS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Room Type *</label>
                    <select 
                      value={editingItem.metadata.roomType} 
                      onChange={(e) => setEditingItem({
                        ...editingItem, 
                        metadata: { ...editingItem.metadata, roomType: e.target.value }
                      })}
                      className="w-full px-4 py-2 rounded-xl bg-surface-card border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
                    >
                      {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea 
                  value={editingItem.description || ''} 
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl bg-surface-card border border-surface-border text-sm text-white focus:outline-none focus:border-brand-500 transition-all resize-none"
                  placeholder="Tell us about this design..."
                />
              </div>

              {/* Color Accent Picker */}
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">Color Accents (Select up to 4)</label>
                <div className="flex flex-wrap gap-2">
                  {CURATED_COLORS.map((color) => {
                    const isSelected = editingItem.metadata.colorPalette.includes(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => {
                          const nextColors = isSelected
                            ? editingItem.metadata.colorPalette.filter(c => c !== color)
                            : editingItem.metadata.colorPalette.length < 4 
                              ? [...editingItem.metadata.colorPalette, color] 
                              : editingItem.metadata.colorPalette;
                          setEditingItem({
                            ...editingItem,
                            metadata: { ...editingItem.metadata, colorPalette: nextColors }
                          });
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full border transition-all duration-150 hover:scale-110",
                          isSelected
                            ? "border-brand-400 ring-2 ring-brand-400/50 scale-110"
                            : "border-surface-border hover:border-white/40"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
              </div>

              {(editingItem.editRequestNote || editingItem.rejectionReason) && (
                <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-4">
                  <p className="text-xs text-brand-400 font-bold uppercase mb-2">Resubmission Note</p>
                  <p className="text-xs text-text-muted italic">
                    Saving these changes will clear existing rejection/edit notes and resubmit this item for admin review.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-surface-border bg-surface-card">
              <Button 
                variant="ghost" 
                className="flex-1" 
                onClick={() => setEditingItem(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={saveEdit}
                loading={isUpdating}
              >
                Save & Resubmit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
