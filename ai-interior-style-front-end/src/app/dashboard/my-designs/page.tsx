"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import {
  Heart, Download, Share2, Eye, Calendar, DollarSign,
  Filter, Grid, List, Search, Star, Archive, Trash2,
  RefreshCw, ChevronDown, SortAsc, SortDesc, X, Sparkles
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAppStore } from "@/lib/store";

interface UserDesign {
  id: string;
  designId: string;
  designData: {
    name: string;
    description: string;
    style: string;
    roomType: string;
    budget: string;
    products: string[];
    imageUrl: string;
    confidence: number;
    templateType?: string;
    isPremium: boolean;
    metadata: {
      style: string;
      roomType: string;
      colorPalette?: string[];
      title?: string;
      featured?: boolean;
    };
  };
  sessionData: {
    sessionId: string;
    originalImageUrl: string;
    userPreferences: {
      roomType: string;
      styles: string[];
      budget: string;
    };
    generatedAt: string;
  };
  purchaseInfo: {
    amount: number;
    purchaseDate: string;
    paymentMethod: string;
    transactionRef: string;
  };
  userInteractions: {
    isFavorite: boolean;
    isShared: boolean;
    viewCount: number;
    lastViewed?: string;
    notes?: string;
  };
  status: 'active' | 'archived' | 'hidden';
  accessLevel: 'full' | 'basic' | 'preview';
  daysSincePurchase: number;
  isExpired: boolean;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'purchaseDate' | 'name' | 'style' | 'viewCount';
type FilterStatus = 'all' | 'active' | 'archived' | 'favorites';

export default function MyDesignsPage() {
  const { user } = useAppStore();
  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<UserDesign | null>(null);
  const [previewImgLoaded, setPreviewImgLoaded] = useState(false);
  const [stats, setStats] = useState({
    totalDesigns: 0,
    favoriteDesigns: 0,
    archivedDesigns: 0,
    totalViews: 0,
    averageConfidence: 0
  });

  // Close preview modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewDesign(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load user's design library
  const loadDesigns = async () => {
    try {
      setLoading(true);
      const userId = user?.id;
      
      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await apiClient.getUserDesigns({
        page: 1,
        limit: 50,
        status: filterStatus === 'favorites' ? 'active' : filterStatus,
        sortBy: sortBy === 'purchaseDate' ? 'createdAt' : sortBy,
        sortOrder,
        favoritesOnly: filterStatus === 'favorites',
        userId // Add userId for consistency
      });

      const data = (response as any).data || response;
      setDesigns(data.designs || []);
      
      // Update stats based on fetched data
      if (data.designs) {
        const favoriteCount = data.designs.filter((d: UserDesign) => d.userInteractions.isFavorite).length;
        const archivedCount = data.designs.filter((d: UserDesign) => d.status === 'archived').length;
        const totalViews = data.designs.reduce((acc: number, d: UserDesign) => acc + (d.userInteractions.viewCount || 0), 0);
        const avgConf = data.designs.length > 0 
          ? (data.designs.reduce((acc: number, d: UserDesign) => acc + (d.designData.confidence || 0), 0) / data.designs.length) 
          : 0;

        setStats({
          totalDesigns: data.designs.length,
          favoriteDesigns: favoriteCount,
          archivedDesigns: archivedCount,
          totalViews: totalViews,
          averageConfidence: Math.round(avgConf * 100)
        });
      }
    } catch (error: any) {
      console.error('Failed to load designs:', error);
      toast.error(error.error || error.message || 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (designId: string, isFavorite: boolean) => {
    try {
      await apiClient.updateDesignInteractions(designId, { isFavorite: !isFavorite });
      
      setDesigns(prev => prev.map(design => 
        design.designId === designId 
          ? { ...design, userInteractions: { ...design.userInteractions, isFavorite: !isFavorite } }
          : design
      ));

      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error: any) {
      toast.error(error.error || error.message || 'Failed to update favorite');
    }
  };

  // Update design notes
  const updateNotes = async (designId: string, notes: string) => {
    try {
      await apiClient.updateDesignInteractions(designId, { notes });
      
      setDesigns(prev => prev.map(design => 
        design.designId === designId 
          ? { ...design, userInteractions: { ...design.userInteractions, notes } }
          : design
      ));

      toast.success('Notes updated successfully');
    } catch (error: any) {
      toast.error(error.error || error.message || 'Failed to update notes');
    }
  };

  // Archive/unarchive design
  const updateDesignStatus = async (designId: string, status: 'active' | 'archived') => {
    try {
      await apiClient.updateDesignStatus(designId, { status });
      
      setDesigns(prev => prev.map(design => 
        design.designId === designId 
          ? { ...design, status }
          : design
      ));

      toast.success(status === 'archived' ? 'Design archived' : 'Design restored');
      loadDesigns(); // Refresh to update stats
    } catch (error: any) {
      toast.error(error.error || error.message || 'Failed to update design status');
    }
  };

  // Download design
  const downloadDesign = async (design: UserDesign) => {
    try {
      // Create download link for image
      const link = document.createElement('a');
      link.href = design.designData.imageUrl;
      link.download = `${design.designData.name.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Design downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download design');
    }
  };

  // Filter designs based on search
  const filteredDesigns = designs.filter(design => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      design.designData.name.toLowerCase().includes(query) ||
      design.designData.style.toLowerCase().includes(query) ||
      design.designData.roomType.toLowerCase().includes(query) ||
      design.designData.description.toLowerCase().includes(query)
    );
  });

  // Load designs on component mount and when filters change
  useEffect(() => {
    loadDesigns();
  }, [filterStatus, sortBy, sortOrder]);

  if (loading && designs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-1">My Design Library</h1>
            <p className="text-text-muted text-sm">Loading your AI designs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">My Design Library</h1>
          <p className="text-text-muted text-sm">Your permanently saved AI designs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={loadDesigns} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'brand' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'brand' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
            <Star className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white font-display">{stats.totalDesigns}</div>
          <div className="text-xs text-text-muted mt-0.5">Total Designs</div>
        </Card>
        <Card className="p-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <Heart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-display">{stats.favoriteDesigns}</div>
          <div className="text-xs text-text-muted mt-0.5">Favorites</div>
        </Card>
        <Card className="p-5">
          <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center mb-3">
            <Eye className="w-4 h-4 text-gold-400" />
          </div>
          <div className="text-2xl font-bold text-white font-display">{stats.totalViews}</div>
          <div className="text-xs text-text-muted mt-0.5">Total Views</div>
        </Card>
        <Card className="p-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-display">{stats.averageConfidence}%</div>
          <div className="text-xs text-text-muted mt-0.5">Avg Accuracy</div>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="appearance-none bg-surface border border-surface-border rounded-lg px-4 py-2 pr-8 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="active">Active Designs</option>
              <option value="favorites">Favorites</option>
              <option value="archived">Archived</option>
              <option value="all">All Designs</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
          
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="appearance-none bg-surface border border-surface-border rounded-lg px-4 py-2 pr-8 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="purchaseDate">Generation Date</option>
              <option value="name">Name</option>
              <option value="style">Style</option>
              <option value="viewCount">Views</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search designs..."
            className="pl-9 pr-4 py-2 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Designs Grid/List */}
      {filteredDesigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-surface border border-surface-border flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No designs found</h3>
          <p className="text-text-muted text-sm">
            {searchQuery ? 'Try adjusting your search terms' : 'Start by generating new AI designs'}
          </p>
          {!searchQuery && (
            <Link href="/dashboard/ai">
              <Button variant="brand" className="mt-4">
                Create New Design
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        )}>
          {filteredDesigns.map((design) => (
            <Card key={design.designId} className={cn(
              "group relative overflow-hidden border border-surface-border bg-surface-card hover:border-brand-500/40 transition-all duration-300",
              viewMode === 'list' && "flex gap-4 p-4"
            )}>
              {/* Design Image */}
              <div className={cn(
                "relative overflow-hidden",
                viewMode === 'grid' ? "aspect-[4/3]" : "w-24 h-24 rounded-lg flex-shrink-0"
              )}>
                <Image
                  src={design.designData.imageUrl}
                  alt={design.designData.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <Badge variant="brand" className="text-xs">
                    <Sparkles className="w-3 h-3" /> AI Design
                  </Badge>
                  {design.userInteractions.isFavorite && (
                    <Badge variant="green" className="text-xs">
                      <Heart className="w-3 h-3" /> Favorite
                    </Badge>
                  )}
                </div>

                {/* View Count */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded px-2 py-1">
                  <Eye className="w-3 h-3 text-white" />
                  <span className="text-xs text-white">{design.userInteractions.viewCount}</span>
                </div>
              </div>

              {/* Design Info */}
              <div className={cn(
                "p-4",
                viewMode === 'list' && "flex-1 flex items-center justify-between"
              )}>
                <div className={viewMode === 'grid' ? "space-y-2" : "flex-1"}>
                  <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                    {design.designData.name}
                  </h3>
                  <p className="text-xs text-text-muted line-clamp-2">
                    {design.designData.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" className="text-xs">
                      {design.designData.style}
                    </Badge>
                    <Badge variant="gray" className="text-xs">
                      {design.designData.roomType}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Generated {formatDate(design.purchaseInfo.purchaseDate)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={cn(
                  "flex gap-2 mt-3",
                  viewMode === 'list' && "flex-shrink-0 mt-0"
                )}>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Preview design"
                    onClick={() => { setPreviewDesign(design); setPreviewImgLoaded(false); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(design.designId, design.userInteractions.isFavorite)}
                    className={design.userInteractions.isFavorite ? "text-red-400" : ""}
                    title={design.userInteractions.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${design.userInteractions.isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadDesign(design)}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateDesignStatus(design.designId, design.status === 'archived' ? 'active' : 'archived')}
                    title={design.status === 'archived' ? 'Restore' : 'Archive'}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Design Preview Modal ── */}
      {previewDesign && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => { setPreviewDesign(null); setPreviewImgLoaded(false); }}
        >
          {/* Modal panel: full-bleed image, overlay on hover */}
          <div
            className="group relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            style={{ aspectRatio: '4/3' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading spinner */}
            {!previewImgLoaded && (
              <div className="absolute inset-0 bg-surface-card flex items-center justify-center z-10">
                <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
              </div>
            )}

            {/* Full-bleed image */}
            <img
              src={previewDesign.designData.imageUrl}
              alt={previewDesign.designData.name}
              onLoad={() => setPreviewImgLoaded(true)}
              onError={() => setPreviewImgLoaded(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Always-visible close button */}
            <button
              onClick={() => { setPreviewDesign(null); setPreviewImgLoaded(false); }}
              className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition-colors border border-white/20"
              aria-label="Close preview"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Hover-reveal overlay — slides up from bottom */}
            <div className="absolute inset-x-0 bottom-0 z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
              <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-16 pb-5 px-5">

                {/* Badges + title */}
                <div className="flex flex-wrap gap-2 mb-1.5">
                  <Badge variant="brand" className="text-xs">{previewDesign.designData.style}</Badge>
                  <Badge variant="gray" className="text-xs">{previewDesign.designData.roomType}</Badge>
                  <Badge variant="gold" className="text-xs"><Sparkles className="w-3 h-3" /> AI Design</Badge>
                </div>
                <h3 className="font-bold text-white text-lg leading-tight mb-0.5">{previewDesign.designData.name}</h3>
                <p className="text-white/60 text-xs mb-3">Budget: {previewDesign.designData.budget}</p>

                {/* Description */}
                <p className="text-white/75 text-xs leading-relaxed mb-3 line-clamp-2">{previewDesign.designData.description}</p>

                {/* Products */}
                {previewDesign.designData.products?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {previewDesign.designData.products.slice(0, 5).map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded text-[11px] bg-white/10 text-white/80 border border-white/10 backdrop-blur-sm">{p}</span>
                    ))}
                    {previewDesign.designData.products.length > 5 && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-white/10 text-white/60 border border-white/10">+{previewDesign.designData.products.length - 5} more</span>
                    )}
                  </div>
                )}

                {/* Meta + Actions row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-white/50 shrink-0">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {previewDesign.userInteractions.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(previewDesign.purchaseInfo.purchaseDate)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`border border-white/20 ${previewDesign.userInteractions.isFavorite ? 'text-red-400' : 'text-white hover:bg-white/10'}`}
                      onClick={() => toggleFavorite(previewDesign.designId, previewDesign.userInteractions.isFavorite)}
                    >
                      <Heart className={`w-3.5 h-3.5 ${previewDesign.userInteractions.isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadDesign(previewDesign)}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
