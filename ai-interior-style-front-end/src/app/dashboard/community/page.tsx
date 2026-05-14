"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import {
  Search, Plus, Heart, MessageCircle, Share2,
  Filter, X, Image as ImageIcon, Sparkles, FolderHeart, UserPlus, UserMinus
} from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, cn, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";

interface InspirationPost {
  _id: string;
  userId: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
    role: string;
    isFollowing?: boolean;
  };
  imageUrl: string;
  description?: string;
  metadata: {
    style: string;
    roomType: string;
    title: string;
    tags: string[];
  };
  likesCount: number;
  savesCount: number;
  createdAt: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<InspirationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [styleFilter, setStyleFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Boards & Saving
  const [boards, setBoards] = useState<any[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<InspirationPost | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);

  // Create Post Form State
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostPreview, setNewPostPreview] = useState<string | null>(null);
  const [newPostDescription, setNewPostDescription] = useState("");
  const [newPostStyle, setNewPostStyle] = useState("Modern");
  const [newPostRoomType, setNewPostRoomType] = useState("Living Room");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAppStore();

  useEffect(() => {
    loadPosts(1);
    loadBoards();
  }, [styleFilter, roomFilter]);

  const loadPosts = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.getInspirationPosts(pageNum, 12, {
        style: styleFilter || undefined,
        roomType: roomFilter || undefined
      });

      const data = response as any;
      const newPosts = data.posts || [];

      if (pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMore(newPosts.length === 12);
      setPage(pageNum);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load inspiration posts");
    } finally {
      setLoading(false);
    }
  };

  const loadBoards = async () => {
    try {
      const response = await apiClient.getBoards(1, 50);
      const data = (response as any).data || response;
      setBoards(data.boards || []);
    } catch (error) {
      console.error("Failed to load boards:", error);
    }
  };

  const toggleLike = async (post: InspirationPost) => {
    if (!user) {
      toast.error("Please login to like posts");
      return;
    }

    try {
      if (post.isLiked) {
        await apiClient.unlikeContent('inspiration', post._id);
        setPosts(prev => prev.map(p =>
          p._id === post._id ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p
        ));
      } else {
        await apiClient.likeContent('inspiration', post._id);
        setPosts(prev => prev.map(p =>
          p._id === post._id ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p
        ));
      }
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to update like");
    }
  };

  const openSaveModal = (post: InspirationPost) => {
    if (!user) {
      toast.error("Please login to save posts");
      return;
    }
    setSelectedPost(post);
    setShowSaveModal(true);
  };

  const handleSaveToBoard = async () => {
    if (!selectedPost || !selectedBoard) {
      toast.error("Please select a board");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.addItemToBoard(selectedBoard, 'inspiration', selectedPost._id);

      toast.success("Saved to board!");
      setPosts(prev => prev.map(p =>
        p._id === selectedPost._id ? { ...p, isSaved: true, savesCount: p.savesCount + 1 } : p
      ));

      setShowSaveModal(false);
      setSelectedPost(null);
      setSelectedBoard(null);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to save to board");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async (post: InspirationPost) => {
    try {
      // Create share record in backend
      await apiClient.shareContent('inspiration', post._id);
      
      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/dashboard/community?post=${post._id}`;
      await navigator.clipboard.writeText(shareUrl);
      
      toast.success("Link copied to clipboard!");
    } catch (error: any) {
      toast.error("Failed to share post");
    }
  };

  const toggleFollow = async (designerId: string, currentlyFollowing: boolean) => {
    if (!user) {
      toast.error("Please login to follow designers");
      return;
    }

    try {
      if (currentlyFollowing) {
        await apiClient.unfollowDesigner(designerId);
        toast.success("Unfollowed designer");
      } else {
        await apiClient.followDesigner(designerId);
        toast.success("Following designer!");
      }
      
      setPosts(prev => prev.map(p => 
        p.userId._id === designerId 
          ? { ...p, userId: { ...p.userId, isFollowing: !currentlyFollowing } }
          : p
      ));
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to update follow status");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostImage) {
      toast.error("Please select an image");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiClient.createInspirationPost({
        description: newPostDescription,
        style: newPostStyle,
        roomType: newPostRoomType,
        title: newPostTitle || 'Inspiration',
      }, newPostImage);

      toast.success("Inspiration shared with community!");
      setShowCreateModal(false);
      resetForm();
      loadPosts(1); // Refresh feed
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewPostImage(null);
    setNewPostPreview(null);
    setNewPostDescription("");
    setNewPostStyle("Modern");
    setNewPostRoomType("Living Room");
    setNewPostTitle("");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            Community Inspiration
          </h1>
          <p className="text-text-muted mt-1">See what others are dreaming of and share your own inspiration</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          Share Inspiration
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-surface-card p-4 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-2 text-text-muted pr-4 border-r border-surface-border">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter by:</span>
        </div>

        <select
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value)}
          className="bg-surface border border-surface-border text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500 transition-all"
        >
          <option value="">All Styles</option>
          {STYLE_TAGS.map(style => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>

        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="bg-surface border border-surface-border text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500 transition-all"
        >
          <option value="">All Rooms</option>
          {ROOM_TYPES.map(room => (
            <option key={room} value={room}>{room}</option>
          ))}
        </select>

        {(styleFilter || roomFilter) && (
          <button
            onClick={() => { setStyleFilter(""); setRoomFilter(""); }}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium ml-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Posts Grid */}
      {loading && page === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-surface-card animate-pulse border border-surface-border" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-surface-card rounded-3xl border border-dashed border-surface-border">
          <ImageIcon className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-semibold text-white mb-2">No inspiration posts yet</h3>
          <p className="text-text-muted mb-6">Be the first to share something inspiring with the community!</p>
          <Button onClick={() => setShowCreateModal(true)} variant="brand">Share Now</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {posts.map((post) => (
            <Card key={post._id} className="overflow-hidden group hover:border-brand-500/50 transition-all duration-300 flex flex-col h-full">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt={post.metadata.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="eager"
                  priority={posts.indexOf(post) < 4}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex gap-2">
                    <Badge variant="brand" className="backdrop-blur-md bg-brand-500/20 border-brand-500/30">{post.metadata.style}</Badge>
                  </div>
                </div>
              </div>
              <CardBody className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={`${post.userId.profile.firstName} ${post.userId.profile.lastName}`}
                        src={post.userId.profile.profilePicture}
                        size="xs"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white leading-none">
                          {post.userId.profile.firstName} {post.userId.profile.lastName}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">{formatDate(post.createdAt)}</p>
                      </div>
                    </div>
                    {user?.id !== post.userId._id && post.userId.role === 'designer' && (
                      <button 
                        onClick={() => toggleFollow(post.userId._id, !!post.userId.isFollowing)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          post.userId.isFollowing 
                            ? "bg-brand-500/20 text-brand-400 border border-brand-500/30" 
                            : "bg-surface-hover text-text-muted hover:text-white"
                        )}
                        title={post.userId.isFollowing ? "Unfollow" : "Follow"}
                      >
                        {post.userId.isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  {post.description && (
                    <p className="text-sm text-purple-100/80 line-clamp-2 mb-4 leading-relaxed">
                      {post.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-surface-border">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post)}
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        post.isLiked ? "text-red-500" : "text-text-muted hover:text-red-400"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", post.isLiked && "fill-current")} />
                      <span className="text-xs">{post.likesCount}</span>
                    </button>
                    <button
                      onClick={() => openSaveModal(post)}
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        post.isSaved ? "text-brand-400" : "text-text-muted hover:text-brand-400"
                      )}
                    >
                      <FolderHeart className={cn("w-4 h-4", post.isSaved && "fill-current")} />
                      <span className="text-xs">{post.savesCount}</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => handleShare(post)}
                    className="text-text-muted hover:text-white transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            onClick={() => loadPosts(page + 1)}
            className="px-8"
          >
            Load More Inspiration
          </Button>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass rounded-3xl border border-surface-border w-full max-w-2xl overflow-hidden animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-brand-400" />
                Share Inspiration
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-muted hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 flex flex-col md:flex-row gap-8 max-h-[75vh] overflow-y-auto">
              {/* Left: Image Upload */}
              <div className="flex-1 space-y-4">
                <div
                  className={cn(
                    "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all group",
                    newPostPreview ? "border-brand-500" : "border-surface-border hover:border-brand-500/50"
                  )}
                >
                  {newPostPreview ? (
                    <>
                      <Image src={newPostPreview} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label htmlFor="image-upload" className="cursor-pointer bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/30 transition-all">
                          Change Image
                        </label>
                      </div>
                    </>
                  ) : (
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-8 h-8 text-brand-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Click to upload design</p>
                        <p className="text-xs text-text-muted mt-1">High quality images work best</p>
                      </div>
                    </label>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Right: Form Details */}
              <div className="flex-1 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={newPostDescription}
                    onChange={(e) => setNewPostDescription(e.target.value)}
                    placeholder="What makes this design special?"
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-500 min-h-[120px] resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Style</label>
                    <select
                      value={newPostStyle}
                      onChange={(e) => setNewPostStyle(e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
                    >
                      {STYLE_TAGS.map(style => (
                        <option key={style} value={style}>{style}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Room Type</label>
                    <select
                      value={newPostRoomType}
                      onChange={(e) => setNewPostRoomType(e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
                    >
                      {ROOM_TYPES.map(room => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-surface-border flex gap-4">
              <Button
                variant="ghost"
                className="flex-1 h-12"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 bg-brand-600 hover:bg-brand-500"
                onClick={handleCreatePost}
                disabled={isSubmitting || !newPostImage}
              >
                {isSubmitting ? "Sharing..." : "Share with Community"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save to Board Modal */}
      {showSaveModal && selectedPost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass rounded-3xl border border-surface-border w-full max-w-md overflow-hidden animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderHeart className="w-6 h-6 text-brand-400" />
                Save to Board
              </h2>
              <button
                onClick={() => { setShowSaveModal(false); setSelectedPost(null); }}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors text-text-muted hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-surface-border">
                  <Image src={selectedPost.imageUrl} alt="Design" fill className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Save this inspiration</p>
                  <p className="text-xs text-text-muted mt-1">{selectedPost.metadata.style} · {selectedPost.metadata.roomType}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Select a Style Board</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {boards.length === 0 ? (
                    <div className="text-center py-8 bg-surface/50 rounded-xl border border-dashed border-surface-border">
                      <p className="text-xs text-text-muted">No boards found. Create one first!</p>
                    </div>
                  ) : (
                    boards.map(board => (
                      <button
                        key={board._id}
                        onClick={() => setSelectedBoard(board._id)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                          selectedBoard === board._id
                            ? "bg-brand-600/20 border-brand-500 text-brand-300"
                            : "bg-surface border-surface-border text-text-muted hover:border-brand-500/50 hover:text-white"
                        )}
                      >
                        <span className="text-sm font-medium">{board.name}</span>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          selectedBoard === board._id ? "border-brand-400 bg-brand-500" : "border-surface-border group-hover:border-brand-500/50"
                        )}>
                          {selectedBoard === board._id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-surface-border">
              <Button
                className="w-full h-12 bg-brand-600 hover:bg-brand-500"
                onClick={handleSaveToBoard}
                disabled={isSubmitting || !selectedBoard}
              >
                {isSubmitting ? "Saving..." : "Save Design"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
