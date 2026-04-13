"use client";
import { useState } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Plus, FolderHeart, Trash2, Share2, Download, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const BOARDS = [
  {
    id: 1,
    name: "My Living Room Vision",
    count: 12,
    cover: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=200&fit=crop",
    ],
    tags: ["Minimalist", "Neutral"],
  },
  {
    id: 2,
    name: "Bedroom Inspo",
    count: 8,
    cover: [
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&h=200&fit=crop",
    ],
    tags: ["Cozy", "Scandinavian"],
  },
  {
    id: 3,
    name: "Kitchen Dreams",
    count: 5,
    cover: [
      "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=300&h=200&fit=crop",
    ],
    tags: ["Industrial"],
  },
];

const SAVES = [
  { id: 1, img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&h=220&fit=crop", style: "Minimalist", title: "Pure Serenity Set",   board: "My Living Room Vision" },
  { id: 2, img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=300&h=260&fit=crop", style: "Art Deco",    title: "Golden Elegance",     board:  "Bedroom Inspo" },
  { id: 3, img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=300&h=240&fit=crop", style: "Scandinavian",title: "Nordic Warmth",        board: "Bedroom Inspo" },
  { id: 4, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=220&fit=crop", style: "Coastal",     title: "Coastal Living Set",  board: "My Living Room Vision" },
];

export default function StyleBoardsPage() {
  const [activeBoard, setActiveBoard] = useState<number | null>(null);
  const saves = activeBoard ? SAVES.filter((s) => {
    const board = BOARDS.find((b) => b.id === activeBoard);
    return board && s.board === board.name;
  }) : SAVES;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Style Boards</h1>
          <p className="text-text-muted text-sm">Organize and save your favorite designs</p>
        </div>
        <Button><Plus className="w-4 h-4" /> New Board</Button>
      </div>

      {/* Boards grid */}
      <div>
        <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Your Boards</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BOARDS.map((board) => (
            <button
              key={board.id}
              onClick={() => setActiveBoard(activeBoard === board.id ? null : board.id)}
              className={cn(
                "text-left rounded-2xl border overflow-hidden transition-all duration-200",
                activeBoard === board.id
                  ? "border-brand-500 shadow-glow-sm"
                  : "border-surface-border bg-surface-card hover:border-brand-500/40 hover:-translate-y-0.5"
              )}
            >
              {/* Mosaic cover */}
              <div className="grid grid-cols-2 gap-0.5 h-36 overflow-hidden">
                {board.cover.slice(0,3).map((src, idx) => (
                  <div key={idx} className={cn("overflow-hidden", idx === 0 && board.cover.length > 1 ? "row-span-2" : "")}>
                    <Image src={src} alt="" width={300} height={200} className="w-full h-full object-cover" />
                  </div>
                ))}
                {board.cover.length === 1 && <div className="bg-surface-hover" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FolderHeart className="w-4 h-4 text-brand-400" />
                      <p className="font-semibold text-sm text-white">{board.name}</p>
                    </div>
                    <p className="text-xs text-text-muted">{board.count} saved items</p>
                  </div>
                  <div className="flex gap-1.5">
                    {board.tags.map((t) => <Badge key={t} variant="brand">{t}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="ghost" size="sm" className="flex-1"><Share2 className="w-3.5 h-3.5" /> Share</Button>
                  <Button variant="ghost" size="sm" className="flex-1"><Download className="w-3.5 h-3.5" /> PDF</Button>
                </div>
              </div>
            </button>
          ))}
          {/* Add new board */}
          <button className="flex flex-col items-center justify-center h-56 rounded-2xl border-2 border-dashed border-surface-border text-text-muted hover:border-brand-500/60 hover:text-brand-400 hover:bg-surface-hover transition-all duration-200">
            <Plus className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Create New Board</span>
          </button>
        </div>
      </div>

      {/* Saved items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
            {activeBoard ? `Items in "${BOARDS.find((b) => b.id === activeBoard)?.name}"` : "All Saved Items"}
          </h2>
          {activeBoard && (
            <Button variant="ghost" size="sm" onClick={() => setActiveBoard(null)}>Show all</Button>
          )}
        </div>
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {saves.map((item) => (
            <div key={item.id} className="break-inside-avoid group relative rounded-xl overflow-hidden border border-surface-border bg-surface-card hover:border-brand-500/40 transition-all duration-200">
              <Image src={item.img} alt={item.title} width={300} height={240} className="w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-red-500/70 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-brand-500/70 transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="brand">{item.style}</Badge>
                  <p className="text-[10px] text-text-muted">{item.board}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
