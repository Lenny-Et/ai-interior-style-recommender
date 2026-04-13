"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Plus, FolderHeart, Trash2, Share2, Download, MoreHorizontal, X, Check, Edit, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

interface Board {
  _id: string;
  name: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  coverImage?: string;
  saveCount: number;
  sampleItems: Array<{
    imageUrl: string;
    metadata: {
      style: string;
      roomType: string;
      colorPalette: string[];
      materials: string[];
      mood: string;
      complexity: number;
      priceRange: string;
      aiTags: string[];
      visualElements: {
        hasNaturalLight: boolean;
        hasMinimalistElements: boolean;
        hasVintageElements: boolean;
        hasModernElements: boolean;
        hasIndustrialElements: boolean;
      };
    };
    savedAt: string;
    userNotes?: string;
  }>;
  aiInsights: {
    dominantStyles: string[];
    colorPreferences: string[];
    styleEvolution: string;
    recommendedStyles: string[];
    compatibilityScore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function StyleBoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [newBoardTags, setNewBoardTags] = useState<string[]>([]);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [boardPrivacy, setBoardPrivacy] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [selectedBoardForAI, setSelectedBoardForAI] = useState<Board | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [stylePreferences, setStylePreferences] = useState<any>(null);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBoards(1, 20);
      const boardsData = (response as any).data || response;
      setBoards(boardsData.boards || []);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    if (!newBoardName.trim()) {
      toast.error("Board name is required");
      return;
    }

    try {
      const response = await apiClient.createBoard({
        name: newBoardName,
        description: newBoardDescription,
        tags: newBoardTags,
        isPublic: false
      });

      const newBoard = (response as any).data || response;
      setBoards(prev => [newBoard.board, ...prev]);
      
      // Reset form
      setNewBoardName("");
      setNewBoardDescription("");
      setNewBoardTags([]);
      setShowNew(false);
      
      toast.success("Board created successfully!");
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to create board");
    }
  };

  const deleteBoard = async (boardId: string) => {
    try {
      await apiClient.deleteBoard(boardId);
      setBoards(prev => prev.filter(board => board._id !== boardId));
      toast.success("Board deleted successfully!");
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to delete board");
    }
  };

  const startEditBoard = (board: Board) => {
    setEditingBoard(board);
    setNewBoardName(board.name);
    setNewBoardDescription(board.description || "");
    setNewBoardTags(board.tags);
    setBoardPrivacy(board.isPublic);
    setShowEdit(true);
  };

  const showBoardDetails = (board: Board) => {
    setSelectedBoard(board);
    setShowDetails(true);
  };

  const shareBoard = async (board: Board) => {
    try {
      const shareUrl = `${window.location.origin}/boards/${board._id}`;
      
      if (navigator.share) {
        // Use native share API on mobile
        await navigator.share({
          title: board.name,
          text: board.description || `Check out my ${board.name} board`,
          url: shareUrl
        });
      } else {
        // Copy to clipboard for desktop
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Board link copied to clipboard!");
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error("Failed to share board");
    }
  };

  const exportBoardToPDF = async (board: Board) => {
    try {
      // Create a simple HTML content for PDF export
      const htmlContent = `
        <html>
          <head>
            <title>${board.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              h1 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
              .board-info { margin: 20px 0; }
              .tags { margin: 10px 0; }
              .tag { display: inline-block; background: #007bff; color: white; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 12px; }
              .items-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
              .item { text-align: center; }
              .item img { max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }
              .item-info { margin: 10px 0; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <h1>${board.name}</h1>
            <div class="board-info">
              <p><strong>Description:</strong> ${board.description || 'No description provided'}</p>
              <p><strong>Items:</strong> ${board.saveCount}</p>
              <p><strong>Visibility:</strong> ${board.isPublic ? 'Public' : 'Private'}</p>
              <div class="tags">
                ${board.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            </div>
            <h2>Saved Items</h2>
            <div class="items-grid">
              ${board.sampleItems && board.sampleItems.length > 0 ? board.sampleItems.map(item => `
                <div class="item">
                  <img src="${item.imageUrl}" alt="${item.metadata.style}" />
                  <div class="item-info">${item.metadata.style} • ${item.metadata.roomType}</div>
                </div>
              `).join('') : '<p class="text-center">No items saved to this board yet</p>'}
            </div>
          </body>
        </html>
      `;

      // Create a temporary blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${board.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Board exported successfully!");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export board");
    }
  };

  const updateBoard = async () => {
    if (!editingBoard || !newBoardName.trim()) {
      toast.error("Board name is required");
      return;
    }

    try {
      const response = await apiClient.updateBoard(editingBoard._id, {
        name: newBoardName,
        description: newBoardDescription,
        tags: newBoardTags,
        isPublic: editingBoard.isPublic
      });

      const updatedBoard = (response as any).data || response;
      setBoards(prev => prev.map(board => 
        board._id === editingBoard._id ? updatedBoard.board : board
      ));
      
      // Reset form
      setNewBoardName("");
      setNewBoardDescription("");
      setNewBoardTags([]);
      setShowEdit(false);
      setEditingBoard(null);
      
      toast.success("Board updated successfully!");
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to update board");
    }
  };

  const toggleTag = (tag: string) => {
    setNewBoardTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const loadAvailableItems = async () => {
    try {
      const response = await apiClient.getFeed(1, 50); // Get feed items
      const itemsData = (response as any).data || response;
      setAvailableItems(itemsData.items || []);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load available items");
    }
  };

  const addItemToBoard = async (targetId: string) => {
    if (!selectedBoard) return;
    
    try {
      await apiClient.addItemToBoard(selectedBoard._id, 'design', targetId);
      toast.success("Item added to board successfully!");
      
      // Refresh board data
      const updatedBoard = { ...selectedBoard };
      updatedBoard.sampleItems = [
        ...updatedBoard.sampleItems,
        availableItems.find(item => item._id === targetId)
      ].filter(Boolean);
      updatedBoard.saveCount = updatedBoard.sampleItems.length;
      setSelectedBoard(updatedBoard);
      
      // Update boards list
      setBoards(prev => prev.map(board => 
        board._id === selectedBoard._id ? updatedBoard : board
      ));
      
      // Remove from available items
      setAvailableItems(prev => prev.filter(item => item._id !== targetId));
      setSelectedItems(prev => prev.filter(id => id !== targetId));
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to add item to board");
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const addSelectedItems = async () => {
    if (!selectedBoard || selectedItems.length === 0) return;
    
    try {
      for (const itemId of selectedItems) {
        await apiClient.addItemToBoard(selectedBoard._id, 'design', itemId);
      }
      
      toast.success(`${selectedItems.length} items added to board successfully!`);
      setShowAddItems(false);
      setSelectedItems([]);
      
      // Reload board data
      const boardResponse = await apiClient.getBoards(1, 20);
      const boardsData = (boardResponse as any).data || boardResponse;
      const updatedBoards = boardsData.boards || [];
      const updatedBoard = updatedBoards.find(board => board._id === selectedBoard._id);
      if (updatedBoard) {
        setSelectedBoard(updatedBoard);
      }
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to add items to board");
    }
  };

  // AI Analysis Functions
  const analyzeBoardWithAI = async (board: Board) => {
    try {
      setLoadingAI(true);
      setSelectedBoardForAI(board);
      
      // Call AI analysis endpoint
      const response = await apiClient.analyzeStyleBoard(board._id);
      const analysisData = (response as any).data || response;
      
      // Update board with AI insights
      const updatedBoard = {
        ...board,
        aiInsights: analysisData.insights || {
          dominantStyles: [],
          colorPreferences: [],
          styleEvolution: '',
          recommendedStyles: [],
          compatibilityScore: 0
        }
      };
      
      setBoards(prev => prev.map(b => b._id === board._id ? updatedBoard : b));
      setSelectedBoard(updatedBoard);
      setShowAIInsights(true);
      
      toast.success("AI analysis completed!");
    } catch (error: any) {
      console.error('AI analysis error:', error);
      toast.error(error.error || error.message || "Failed to analyze board");
    } finally {
      setLoadingAI(false);
    }
  };

  const getAIRecommendations = async (board: Board) => {
    try {
      setLoadingAI(true);
      
      // Get AI recommendations based on board preferences
      const response = await apiClient.getBoardAIRecommendations({
        boardId: board._id,
        preferences: board.aiInsights || {},
        count: 12
      });
      
      const recommendationsData = (response as any).data || response;
      setAiRecommendations(recommendationsData.recommendations || []);
      
      toast.success("AI recommendations generated!");
    } catch (error: any) {
      console.error('AI recommendations error:', error);
      toast.error(error.error || error.message || "Failed to get recommendations");
    } finally {
      setLoadingAI(false);
    }
  };

  const saveItemToBoard = async (itemId: string, itemType: 'design' | 'ai-generated', boardId: string) => {
    try {
      await apiClient.addItemToBoard(boardId, itemType, itemId);
      toast.success("Item saved to board!");
      
      // Refresh board data
      loadBoards();
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to save item to board");
    }
  };

  const getUserStylePreferences = async () => {
    try {
      const response = await apiClient.getUserStylePreferences();
      const preferencesData = (response as any).data || response;
      setStylePreferences(preferencesData.preferences);
    } catch (error: any) {
      console.error('Get preferences error:', error);
    }
  };

  const availableTags = ["Minimalist", "Scandinavian", "Japandi", "Industrial", "Bohemian", "Modern", "Art Deco", "Coastal"];

  // Filter boards based on search term and selected tag
  const filteredBoards = boards.filter(board => {
    const matchesSearch = !searchTerm || 
      board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (board.description && board.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      board.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = !filterTag || board.tags.includes(filterTag);
    
    return matchesSearch && matchesTag;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Style Boards</h1>
          <p className="text-text-muted text-sm">Organize and save your favorite designs</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Board</Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search boards..."
            className="w-full px-4 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-text-muted mr-2">Filter:</span>
          <select
            value={filterTag || ""}
            onChange={(e) => setFilterTag(e.target.value || null)}
            className="px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white focus:outline-none focus:border-brand-500 transition-all"
          >
            <option value="">All Boards</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          {filterTag && (
            <button
              onClick={() => setFilterTag(null)}
              className="px-3 py-2 rounded-lg bg-surface-hover text-text-muted hover:text-white transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Boards grid */}
      <div>
        <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Your Boards</h2>
        {loading ? (
          <div className="text-center py-16 text-text-muted">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="font-semibold text-white">Loading boards...</p>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <FolderHeart className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-white">No boards yet</p>
            <p className="text-sm mt-1">Create your first board to start organizing designs</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBoards.map((board) => (
              <div
                key={board._id}
                onClick={() => setActiveBoard(activeBoard === board._id ? null : board._id)}
                className={cn(
                  "text-left rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer",
                  activeBoard === board._id
                    ? "border-brand-500 shadow-glow-sm"
                    : "border-surface-border bg-surface-card hover:border-brand-500/40 hover:-translate-y-0.5"
                )}
              >
                {/* Mosaic cover */}
                <div className="grid grid-cols-2 gap-0.5 h-36 overflow-hidden">
                  {board.sampleItems && board.sampleItems.length > 0 ? (
                    board.sampleItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className={cn("overflow-hidden", idx === 0 && board.sampleItems.length > 1 ? "row-span-2" : "")}>
                        <Image src={item.imageUrl} alt="" width={300} height={200} className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="bg-surface-hover h-full" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FolderHeart className="w-4 h-4 text-brand-400" />
                        <p className="font-semibold text-sm text-white">{board.name}</p>
                      </div>
                      <p className="text-xs text-text-muted">{board.saveCount} saved items</p>
                    </div>
                    <div className="flex gap-1.5">
                      {board.tags.slice(0, 2).map((t) => <Badge key={t} variant="brand">{t}</Badge>)}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => showBoardDetails(board)}><FolderHeart className="w-3.5 h-3.5" /> Details</Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => startEditBoard(board)}><Edit className="w-3.5 h-3.5" /> Edit</Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => analyzeBoardWithAI(board)} loading={loadingAI && selectedBoardForAI?._id === board._id}><Brain className="w-3.5 h-3.5" /> AI</Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => deleteBoard(board._id)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {/* Add new board */}
            <button 
              onClick={() => setShowNew(true)}
              className="flex flex-col items-center justify-center h-56 rounded-2xl border-2 border-dashed border-surface-border text-text-muted hover:border-brand-500/60 hover:text-brand-400 hover:bg-surface-hover transition-all duration-200"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Create New Board</span>
            </button>
          </div>
        )}
      </div>

      {/* New Board Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-surface-border p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Create New Board</h3>
              <button onClick={() => setShowNew(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Board Name</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                  placeholder="My Living Room Ideas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none"
                  rows={3}
                  placeholder="Describe your board..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs border transition-all",
                        newBoardTags.includes(tag)
                          ? "border-brand-500 bg-brand-600/20 text-brand-300"
                          : "border-surface-border text-text-muted hover:border-brand-500/40"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowNew(false)} className="flex-1">Cancel</Button>
                <Button onClick={createBoard} className="flex-1">Create Board</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Board Modal */}
      {showEdit && editingBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-surface-border p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Edit Board</h3>
              <button onClick={() => setShowEdit(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Board Name</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                  placeholder="My Living Room Ideas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none"
                  rows={3}
                  placeholder="Describe your board..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs border transition-all",
                        newBoardTags.includes(tag)
                          ? "border-brand-500 bg-brand-600/20 text-brand-300"
                          : "border-surface-border text-text-muted hover:border-brand-500/40"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Privacy</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="privacy"
                      checked={!boardPrivacy}
                      onChange={() => setBoardPrivacy(false)}
                      className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-white">Private</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="privacy"
                      checked={boardPrivacy}
                      onChange={() => setBoardPrivacy(true)}
                      className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm text-white">Public</span>
                  </label>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {boardPrivacy ? "Anyone can view this board" : "Only you can view this board"}
                </p>
              </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowEdit(false)} className="flex-1">Cancel</Button>
                <Button onClick={updateBoard} className="flex-1">Update Board</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board Details Modal */}
      {showDetails && selectedBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-surface-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{selectedBoard.name}</h3>
              <button onClick={() => setShowDetails(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Board Info */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Board Information</h4>
                <p className="text-sm text-text-muted mb-3">{selectedBoard.description || "No description provided"}</p>
                <div className="flex gap-2 mb-3">
                  {selectedBoard.tags.map((tag) => <Badge key={tag} variant="brand">{tag}</Badge>)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-surface border border-surface-border">
                    <p className="text-text-muted mb-1">Items</p>
                    <p className="font-semibold text-white">{selectedBoard.saveCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface border border-surface-border">
                    <p className="text-text-muted mb-1">Visibility</p>
                    <p className="font-semibold text-white">{selectedBoard.isPublic ? "Public" : "Private"}</p>
                  </div>
                </div>
              </div>

              {/* Board Items Grid */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Saved Items</h4>
                {selectedBoard.sampleItems && selectedBoard.sampleItems.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {selectedBoard.sampleItems.map((item, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border border-surface-border">
                        <Image src={item.imageUrl} alt="" width={200} height={200} className="w-full h-32 object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-xs text-white text-center px-2">{item.metadata.style} • {item.metadata.roomType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <FolderHeart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No items saved to this board yet</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => { setShowAddItems(true); loadAvailableItems(); }} className="flex-1"><Plus className="w-3.5 h-3.5" /> Add Items</Button>
                <Button variant="ghost" onClick={() => exportBoardToPDF(selectedBoard)} className="flex-1"><Download className="w-3.5 h-3.5" /> Export</Button>
                <Button variant="ghost" onClick={() => shareBoard(selectedBoard)} className="flex-1"><Share2 className="w-3.5 h-3.5" /> Share</Button>
                <Button variant="ghost" onClick={() => setShowDetails(false)} className="flex-1">Close</Button>
                <Button onClick={() => startEditBoard(selectedBoard)} className="flex-1">Edit Board</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItems && selectedBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-surface-border p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Add Items to {selectedBoard.name}</h3>
              <button onClick={() => setShowAddItems(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Available Items Grid */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Available Items</h4>
                {availableItems.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableItems.map((item) => (
                      <div 
                        key={item._id}
                        onClick={() => toggleItemSelection(item._id)}
                        className={cn(
                          "relative rounded-lg border overflow-hidden cursor-pointer transition-all",
                          selectedItems.includes(item._id)
                            ? "border-brand-500 ring-2 ring-brand-500/20"
                            : "border-surface-border hover:border-brand-500/40"
                        )}
                      >
                        <Image src={item.imageUrl} alt="" width={200} height={150} className="w-full h-32 object-cover" />
                        <div className="absolute top-2 right-2">
                          {selectedItems.includes(item._id) && (
                            <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-white font-medium truncate">{item.title || 'Untitled Design'}</p>
                          <p className="text-xs text-text-muted">{item.style || 'Modern Style'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <p className="text-sm">Loading available items...</p>
                  </div>
                )}
              </div>

              {/* Selected Items Summary */}
              {selectedItems.length > 0 && (
                <div className="border-t border-surface-border pt-4">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Selected Items ({selectedItems.length})
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItems.map(itemId => {
                      const item = availableItems.find(i => i._id === itemId);
                      return item ? (
                        <div key={itemId} className="flex items-center gap-2 bg-surface-card px-3 py-2 rounded-lg">
                          <Image src={item.imageUrl} alt="" width={40} height={40} className="w-10 h-10 object-cover rounded" />
                          <span className="text-xs text-white truncate max-w-[100px]">{item.title || 'Untitled'}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowAddItems(false)} className="flex-1">Cancel</Button>
                <Button onClick={addSelectedItems} className="flex-1" disabled={selectedItems.length === 0}>
                  Add {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Modal */}
      {showAIInsights && selectedBoardForAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-brand-500/30 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-brand-400" />
                <div>
                  <h2 className="font-semibold text-white">AI Style Analysis</h2>
                  <p className="text-xs text-text-muted">Deep insights for "{selectedBoardForAI.name}"</p>
                </div>
              </div>
              <button onClick={() => setShowAIInsights(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* AI Insights */}
              {selectedBoardForAI.aiInsights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dominant Styles */}
                  <div className="bg-surface-card rounded-xl p-4 border border-surface-border">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      Dominant Styles
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedBoardForAI.aiInsights.dominantStyles.length > 0 ? (
                        selectedBoardForAI.aiInsights.dominantStyles.map((style, index) => (
                          <Badge key={index} variant="brand" className="text-xs">{style}</Badge>
                        ))
                      ) : (
                        <p className="text-xs text-text-muted">No dominant styles detected</p>
                      )}
                    </div>
                  </div>

                  {/* Color Preferences */}
                  <div className="bg-surface-card rounded-xl p-4 border border-surface-border">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      Color Preferences
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedBoardForAI.aiInsights.colorPreferences.length > 0 ? (
                        selectedBoardForAI.aiInsights.colorPreferences.map((color, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full border border-surface-border" style={{ backgroundColor: color }} />
                            <span className="text-xs text-text-muted">{color}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-text-muted">No color preferences detected</p>
                      )}
                    </div>
                  </div>

                  {/* Style Evolution */}
                  <div className="bg-surface-card rounded-xl p-4 border border-surface-border md:col-span-2">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      Style Evolution
                    </h3>
                    <p className="text-sm text-text-muted">
                      {selectedBoardForAI.aiInsights.styleEvolution || 'Your style evolution analysis will appear here'}
                    </p>
                  </div>

                  {/* Recommended Styles */}
                  <div className="bg-surface-card rounded-xl p-4 border border-surface-border md:col-span-2">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      Recommended Styles
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedBoardForAI.aiInsights.recommendedStyles.length > 0 ? (
                        selectedBoardForAI.aiInsights.recommendedStyles.map((style, index) => (
                          <Badge key={index} variant="brand" className="text-xs bg-surface-card border-brand-500/30">{style}</Badge>
                        ))
                      ) : (
                        <p className="text-xs text-text-muted">No recommendations available</p>
                      )}
                    </div>
                  </div>

                  {/* Compatibility Score */}
                  <div className="bg-surface-card rounded-xl p-4 border border-surface-border md:col-span-2">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      Style Compatibility Score
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-surface-hover rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                          style={{ width: `${selectedBoardForAI.aiInsights.compatibilityScore || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-brand-400">
                        {selectedBoardForAI.aiInsights.compatibilityScore || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              <div className="bg-surface-card rounded-xl p-4 border border-surface-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-brand-400" />
                    AI Recommendations
                  </h3>
                  <Button 
                    size="sm" 
                    onClick={() => getAIRecommendations(selectedBoardForAI)}
                    loading={loadingAI}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Generate
                  </Button>
                </div>

                {aiRecommendations.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {aiRecommendations.map((rec, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-surface-hover">
                          <Image 
                            src={rec.imageUrl || '/placeholder-design.jpg'} 
                            alt={rec.title || 'AI Recommendation'} 
                            width={200} 
                            height={200} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-white truncate">{rec.title || 'Design ' + (index + 1)}</p>
                          <p className="text-xs text-text-muted">{rec.style || 'Modern'}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => saveItemToBoard(rec.id, 'ai-generated', selectedBoardForAI._id)}
                        >
                          <FolderHeart className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Click "Generate" to get AI recommendations based on your style preferences</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-surface-border">
                <Button variant="ghost" className="flex-1" onClick={() => setShowAIInsights(false)}>
                  Close
                </Button>
                <Button className="flex-1" onClick={() => getAIRecommendations(selectedBoardForAI)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Recommendations
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
