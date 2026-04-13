"use client";
import { useState } from "react";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { User, Mail, Lock, Bell, Palette, Globe, Trash2, Eye, EyeOff, CheckCircle, Sun, Moon } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";
import { STYLE_TAGS, ROOM_TYPES, cn } from "@/lib/utils";

const TABS = ["Profile", "Preferences", "Notifications", "Security", "Danger Zone"] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const { user, theme, setTheme } = useAppStore();
  const [tab, setTab]         = useState<Tab>("Profile");
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [styles, setStyles]   = useState<string[]>(["Minimalist", "Scandinavian"]);
  const [rooms, setRooms]     = useState<string[]>(["Living Room", "Bedroom"]);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success("Settings saved!");
  };

  const toggleStyle = (s: string) =>
    setStyles(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const toggleRoom = (r: string) =>
    setRooms(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-text-muted text-sm">Manage your account, preferences, and security</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-card border border-surface-border overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
              tab === t ? "bg-brand-600/25 text-brand-300 border border-brand-500/30" : "text-text-muted hover:text-white"
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Profile ── */}
      {tab === "Profile" && (
        <Card>
          <CardBody className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar src={user?.avatarUrl} name={user?.name} size="xl" />
              <div>
                <Button variant="ghost" size="sm">Change Photo</Button>
                <p className="text-xs text-text-muted mt-1">JPG, PNG or WEBP · max 5MB</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input id="s-name"     label="Full Name"       defaultValue={user?.name}  icon={User} />
              <Input id="s-email"    label="Email Address"   defaultValue={user?.email} icon={Mail} type="email" />
              <Input id="s-location" label="Location"        placeholder="City, Country"  icon={Globe} />
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Role</label>
                <div className="px-4 py-3 rounded-xl bg-surface border border-surface-border flex items-center justify-between">
                  <span className="text-sm text-purple-100 capitalize">{user?.role}</span>
                  <Badge variant="brand">Current</Badge>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Bio</label>
              <textarea rows={3} placeholder="Tell designers about your taste…"
                className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none" />
            </div>
            <Button loading={saving} onClick={save}><CheckCircle className="w-4 h-4" /> Save Changes</Button>
          </CardBody>
        </Card>
      )}

      {/* ── Preferences ── */}
      {tab === "Preferences" && (
        <div className="space-y-5">
          {/* Theme */}
          <Card>
            <CardBody>
              <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-brand-400" />Appearance</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["dark", "light"] as const).map(t => (
                  <button key={t} onClick={() => setTheme(t)}
                    className={cn("flex items-center gap-3 p-4 rounded-xl border transition-all",
                      theme === t ? "border-brand-500 bg-brand-600/15" : "border-surface-border hover:border-brand-500/40"
                    )}>
                    {t === "dark" ? <Moon className="w-5 h-5 text-violet-400" /> : <Sun className="w-5 h-5 text-gold-400" />}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white capitalize">{t} Mode</p>
                      <p className="text-xs text-text-muted">{t === "dark" ? "Easy on the eyes" : "Bright & clean"}</p>
                    </div>
                    {theme === t && <CheckCircle className="w-4 h-4 text-brand-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Style preferences */}
          <Card>
            <CardBody>
              <h2 className="font-semibold text-white mb-1">Preferred Styles</h2>
              <p className="text-xs text-text-muted mb-3">These improve your personalised feed and AI results</p>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAGS.map(s => (
                  <button key={s} onClick={() => toggleStyle(s)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all",
                      styles.includes(s) ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"
                    )}>{s}</button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Room preferences */}
          <Card>
            <CardBody>
              <h2 className="font-semibold text-white mb-1">Preferred Rooms</h2>
              <p className="text-xs text-text-muted mb-3">Focus your feed on the rooms you care about most</p>
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.map(r => (
                  <button key={r} onClick={() => toggleRoom(r)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all",
                      rooms.includes(r) ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-surface-border text-text-muted hover:border-gold-500/40"
                    )}>{r}</button>
                ))}
              </div>
            </CardBody>
          </Card>
          <Button loading={saving} onClick={save}><CheckCircle className="w-4 h-4" /> Save Preferences</Button>
        </div>
      )}

      {/* ── Notifications ── */}
      {tab === "Notifications" && (
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-brand-400" />Notification Preferences</h2>
            {[
              { label: "AI design ready",       desc: "When your AI recommendation finishes",        on: true  },
              { label: "New custom request",     desc: "A designer sends a reply or update",           on: true  },
              { label: "New follower",           desc: "Someone follows your profile",                 on: true  },
              { label: "Design approved",        desc: "Admin approves your portfolio upload",         on: false },
              { label: "Escrow funds released",  desc: "Payment released from escrow",                on: true  },
              { label: "Marketing & promotions", desc: "Tips, offers, and platform announcements",      on: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={item.on} className="sr-only peer" />
                  <div className="w-10 h-5 bg-surface-border rounded-full peer peer-checked:bg-brand-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            ))}
            <Button loading={saving} onClick={save}><CheckCircle className="w-4 h-4" /> Save Preferences</Button>
          </CardBody>
        </Card>
      )}

      {/* ── Security ── */}
      {tab === "Security" && (
        <Card>
          <CardBody className="space-y-5">
            <h2 className="font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-brand-400" />Change Password</h2>
            <Input id="s-current-pw" label="Current Password" type={showPw ? "text" : "password"} icon={Lock} iconRight={showPw ? EyeOff : Eye} onIconRightClick={() => setShowPw(!showPw)} />
            <Input id="s-new-pw"     label="New Password"     type="password" icon={Lock} hint="Minimum 8 characters" />
            <Input id="s-confirm-pw" label="Confirm Password" type="password" icon={Lock} />
            <Button loading={saving} onClick={save}>Update Password</Button>

            <div className="pt-4 border-t border-surface-border">
              <h3 className="font-semibold text-white mb-3">Active Sessions</h3>
              {[
                { device: "Chrome on Windows",   location: "Addis Ababa, ET", time: "Now",       current: true  },
                { device: "Safari on iPhone 15", location: "Addis Ababa, ET", time: "2 days ago", current: false },
              ].map(s => (
                <div key={s.device} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
                  <div>
                    <p className="text-sm text-white flex items-center gap-2">{s.device} {s.current && <Badge variant="green">Current</Badge>}</p>
                    <p className="text-xs text-text-muted">{s.location} · {s.time}</p>
                  </div>
                  {!s.current && <Button variant="destructive" size="sm">Revoke</Button>}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Danger Zone ── */}
      {tab === "Danger Zone" && (
        <Card className="border-red-500/30">
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-red-400 flex items-center gap-2"><Trash2 className="w-4 h-4" />Danger Zone</h2>
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <p className="text-sm font-semibold text-white mb-1">Delete Account</p>
              <p className="text-xs text-text-muted mb-3">This permanently deletes all your data, style boards, and purchase history. This cannot be undone.</p>
              <Button variant="destructive"><Trash2 className="w-4 h-4" /> Delete My Account</Button>
            </div>
            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <p className="text-sm font-semibold text-white mb-1">Export My Data</p>
              <p className="text-xs text-text-muted mb-3">Download all your data including designs, boards, and transactions as a ZIP file.</p>
              <Button variant="ghost">Request Data Export</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
