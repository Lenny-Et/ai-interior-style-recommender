"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Search, SlidersHorizontal, Heart, MessageCircle, X, Filter, FolderHeart } from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

interface FeedItem {
  id: string;
  imageUrl: string;
  description?: string;
  metadata: {
    style: string;
    roomType: string;
  };
  designerId: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
  };
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

export default function FeedPage() {
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [boards, setBoards] = useState<any[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
    loadBoards();
  }, [search, styleFilter, roomFilter]);

  const loadFeed = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.getFeed(pageNum, 20);
      
      // Backend returns { feed: [...], pagination: {...} }
      // API client returns data directly, not wrapped in .data
      const feedData = response as any;
      const items = feedData.feed || [];
      const pagination = feedData.pagination || {};
      
      const itemsArray = Array.isArray(items) ? items : [];
      
      if (pageNum === 1) {
        setFeedItems(itemsArray);
      } else {
        setFeedItems(prev => [...prev, ...itemsArray]);
      }
      
      setHasMore(itemsArray.length === 20);
      setPage(pageNum);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadFeed(page + 1);
    }
  };

  const toggleLike = async (itemId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await apiClient.unlikeContent('portfolio', itemId);
      } else {
        await apiClient.likeContent('portfolio', itemId);
      }
      
      setFeedItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, isLiked: !currentlyLiked, likeCount: currentlyLiked ? item.likeCount - 1 : item.likeCount + 1 }
          : item
      ));
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to update like");
    }
  };

  const loadBoards = async () => {
    try {
      const response = await apiClient.getBoards(1, 20);
      const boardsData = (response as any).data || response;
      setBoards(boardsData.boards || []);
    } catch (error: any) {
      console.error('Failed to load boards:', error);
    }
  };

  const openSaveModal = (item: FeedItem) => {
    setSelectedItem(item);
    setShowSaveModal(true);
  };

  const saveToBoard = async () => {
    if (!selectedItem || !selectedBoard) return;
    
    try {
      await apiClient.addItemToBoard(selectedBoard, 'design', selectedItem.id);
      toast.success("Item saved to board!");
      setShowSaveModal(false);
      setSelectedItem(null);
      setSelectedBoard(null);
      
      // Update item state
      setFeedItems(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, isSaved: true }
          : item
      ));
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to save item");
    }
  };

  const toggleSave = async (itemId: string, currentlySaved: boolean) => {
    try {
      if (currentlySaved) {
        await apiClient.unsaveContent('portfolio', itemId);
      } else {
        await apiClient.saveContent('portfolio', itemId);
      }
      
      setFeedItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, isSaved: !currentlySaved }
          : item
      ));
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to update save");
    }
  };

  const filtered = feedItems.filter((item) => {
    if (styleFilter && item.metadata.style !== styleFilter) return false;
    if (roomFilter && item.metadata.roomType !== roomFilter) return false;
    if (search && !item.metadata.style.toLowerCase().includes(search.toLowerCase()) && 
        !item.metadata.roomType.toLowerCase().includes(search.toLowerCase()) && 
        !`${item.designerId.profile.firstName} ${item.designerId.profile.lastName}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Discover Feed</h1>
          <p className="text-text-muted text-sm">Personalized designs based on your style preferences</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {(styleFilter || roomFilter) && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search styles, rooms, or designers…"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="glass rounded-2xl border border-surface-border p-5 animate-slide-up">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Style</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStyleFilter("")} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", !styleFilter ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>All</button>
                {STYLE_TAGS.slice(0,8).map((s) => (
                  <button key={s} onClick={() => setStyleFilter(styleFilter === s ? "" : s)} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", styleFilter === s ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Room Type</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRoomFilter("")} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", !roomFilter ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>All</button>
                {ROOM_TYPES.slice(0,6).map((r) => (
                  <button key={r} onClick={() => setRoomFilter(roomFilter === r ? "" : r)} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", roomFilter === r ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {filtered.map((item) => {
          const designerName = `${item.designerId.profile.firstName} ${item.designerId.profile.lastName}`;
          return (
            <div key={item.id} className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-surface-border bg-surface-card hover:border-brand-500/40 hover:shadow-glow-sm transition-all duration-300">
              <Image src={item.imageUrl} alt={item.metadata.style} width={500} height={400} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">{designerName}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="brand">{item.metadata.style}</Badge>
                      <Badge variant="gray">{item.metadata.roomType}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleLike(item.id, item.isLiked)} className={cn("flex items-center gap-1 text-xs transition-colors", item.isLiked ? "text-pink-400" : "text-white/70 hover:text-pink-400")}>
                      <Heart className={cn("w-4 h-4", item.isLiked && "fill-pink-400")} />{item.likeCount}
                    </button>
                    <button onClick={() => openSaveModal(item)} className={cn("flex items-center gap-1 text-xs transition-colors", item.isSaved ? "text-blue-400" : "text-white/70 hover:text-blue-400")}>
                      <FolderHeart className={cn("w-4 h-4", item.isSaved && "fill-blue-400")} />
                    </button>
                    <button className="flex items-center gap-1 text-xs text-white/70 hover:text-blue-400 transition-colors">
                      <MessageCircle className="w-4 h-4" />{item.commentCount}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-text-muted">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-white">No results found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}

      {loading && filtered.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-semibold text-white">Loading feed...</p>
        </div>
      )}

      {filtered.length > 0 && hasMore && (
        <div className="text-center">
          <Button variant="ghost" size="lg" loading={loading} onClick={loadMore}>Load more designs</Button>
        </div>
      )}

      {filtered.length > 0 && !hasMore && (
        <div className="text-center py-8 text-text-muted">
          <p className="text-sm">You've reached the end of the feed</p>
        </div>
      )}

      {/* Save to Board Modal */}
      {showSaveModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-brand-500/30 p-6 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Save to Board</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-surface-hover">
                <Image 
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.description || 'Design'} 
                  width={400} 
                  height={300} 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Choose Board</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {boards.length > 0 ? (
                    boards.map((board) => (
                      <button
                        key={board._id}
                        onClick={() => setSelectedBoard(board._id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          selectedBoard === board._id
                            ? "border-brand-500 bg-brand-600/20"
                            : "border-surface-border bg-surface-card hover:border-brand-500/40"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <FolderHeart className="w-4 h-4 text-brand-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{board.name}</p>
                            <p className="text-xs text-text-muted">{board.saveCount} items</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-4 text-text-muted">No boards found. Create one first!</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setShowSaveModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={saveToBoard}
                  disabled={!selectedBoard}
                >
                  Save to Board
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
