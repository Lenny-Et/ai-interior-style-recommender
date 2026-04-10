"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { Sparkles, Send, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "ai"; text: string; img?: string };

const SUGGESTIONS = [
  "Swap the rug for a Persian pattern",
  "Make the palette warmer",
  "Add more natural lighting",
  "Replace sofa with a mid-century modern style",
  "Make the walls a sage green",
];

const CURRENT_IMG  = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=700&h=500&fit=crop";
const MODIFIED_IMGS = [
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&h=500&fit=crop",
  "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=700&h=500&fit=crop",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=700&h=500&fit=crop",
];

export default function AIStudioPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! I'm your Gemini-powered AI design assistant. I can modify this design based on your feedback — try asking me to change colors, swap furniture, or adjust the lighting!" },
  ]);
  const [input, setInput]         = useState("");
  const [currentImg, setCurrentImg] = useState(CURRENT_IMG);
  const [thinking, setThinking]   = useState(false);
  const [imgIdx, setImgIdx]       = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    await new Promise((r) => setTimeout(r, 1600));

    const nextIdx  = (imgIdx + 1) % MODIFIED_IMGS.length;
    const newImg   = MODIFIED_IMGS[nextIdx];
    setImgIdx(nextIdx);
    setCurrentImg(newImg);

    const aiMsg: Message = {
      role: "ai",
      text: `I've updated the design based on your request: "${text}". The new version incorporates the changes while maintaining overall cohesion. What would you like to adjust next?`,
      img: newImg,
    };
    setMessages((m) => [...m, aiMsg]);
    setThinking(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-brand-400" /> AI Modification Studio
        </h1>
        <p className="text-text-muted text-sm">Chat with Gemini AI to iterate on your design in real-time.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-4 h-[calc(100vh-13rem)]">
        {/* Left — Design preview */}
        <div className="relative rounded-2xl overflow-hidden border border-surface-border bg-surface-card flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Badge variant="brand"><Sparkles className="w-3 h-3" /> Live Preview</Badge>
              <span className="text-xs text-text-muted">Modern Living Room</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentImg(CURRENT_IMG)}>
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </Button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <Image
              key={currentImg}
              src={currentImg}
              alt="Design preview"
              fill
              className="object-cover transition-all duration-700 ease-in-out"
            />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="glass rounded-xl px-3 py-2 border border-surface-border text-xs text-text-muted flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-brand-400 shrink-0" />
                {thinking ? "Gemini is applying changes…" : "Design updated • Click chat to make more changes"}
              </div>
            </div>
          </div>
          {thinking && (
            <div className="absolute inset-0 bg-surface/40 backdrop-blur-sm flex items-center justify-center">
              <div className="glass rounded-2xl px-6 py-4 border border-brand-500/30 text-center">
                <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Gemini is redesigning…</p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Chat */}
        <div className="flex flex-col rounded-2xl border border-surface-border bg-surface-card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Gemini Design AI</p>
              <p className="text-[10px] text-text-muted">Powered by Google Gemini</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                {m.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "ai"
                    ? "bg-surface border border-surface-border text-purple-100 rounded-tl-none"
                    : "bg-brand-600/25 border border-brand-500/30 text-purple-100 rounded-tr-none"
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                </div>
                <div className="bg-surface border border-surface-border rounded-2xl rounded-tl-none px-4 py-3 flex gap-1">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => sendMessage(s)}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] border border-surface-border text-text-muted hover:border-brand-500/60 hover:text-brand-300 transition-all whitespace-nowrap">
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-surface-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="e.g. Swap the rug for a Persian pattern…"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
            />
            <Button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
