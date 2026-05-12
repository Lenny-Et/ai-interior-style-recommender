"use client";
import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Globe, Briefcase, Camera, Shield, Bell, Palette, CreditCard, LogOut } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function DesignerSettingsPage() {
  const { user } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    company: '',
    website: '',
    bio: '',
    specialties: [] as string[],
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await apiClient.getCurrentProfile();
      const profile = (response as any).data || response;
      setProfileData({
        firstName: profile.profile?.firstName || '',
        lastName: profile.profile?.lastName || '',
        email: profile.email || '',
        phone: profile.profile?.phone || '',
        location: profile.profile?.location || '',
        company: profile.profile?.company || '',
        website: profile.profile?.website || '',
        bio: profile.profile?.bio || '',
        specialties: profile.profile?.specialties || [],
      });
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load profile");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.updateProfile(user?.id || '', {
        profile: profileData
      });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setProfileData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const specialties = [
    'Minimalist', 'Scandinavian', 'Japandi', 'Industrial', 
    'Bohemian', 'Modern', 'Art Deco', 'Coastal'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-text-muted text-sm">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="glass rounded-2xl border border-surface-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Avatar 
              src={user?.avatarUrl} 
              name={`${profileData.firstName} ${profileData.lastName}`} 
              size="lg" 
              verified={user?.verified}
            />
            <Button variant="ghost" size="sm" className="absolute bottom-0 right-0 p-1 rounded-full bg-surface-card border border-surface-border">
              <Camera className="w-3 h-3" />
            </Button>
          </div>
          <div>
            <h2 className="font-semibold text-white text-lg">
              {profileData.firstName} {profileData.lastName}
            </h2>
            <p className="text-text-muted text-sm">{profileData.company}</p>
            <Badge variant="brand" className="mt-1">Verified Designer</Badge>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">First Name</label>
              <input
                type="text"
                value={profileData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Last Name</label>
              <input
                type="text"
                value={profileData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                placeholder="your@email.com"
                disabled
              />
            </div>
            <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Company</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={profileData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                  placeholder="Your company name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="url"
                  value={profileData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Bio</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none"
              placeholder="Tell clients about your design style and approach..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-3">Design Specialties</label>
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => handleSpecialtyToggle(specialty)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs border transition-all",
                    profileData.specialties.includes(specialty)
                      ? "border-brand-500 bg-brand-600/20 text-brand-300"
                      : "border-surface-border text-text-muted hover:border-brand-500/40"
                  )}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <Button variant="ghost" type="button">Cancel</Button>
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Additional Settings */}
      <div className="space-y-4">
        <div className="glass rounded-2xl border border-surface-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-card">
                <Bell className="w-4 h-4 text-text-muted" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Email Notifications</h3>
                <p className="text-xs text-text-muted">Receive updates about new requests and messages</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Configure</Button>
          </div>
        </div>

        <div className="glass rounded-2xl border border-surface-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-card">
                <Shield className="w-4 h-4 text-text-muted" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Privacy & Security</h3>
                <p className="text-xs text-text-muted">Manage your privacy settings and security preferences</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Manage</Button>
          </div>
        </div>

        <div className="glass rounded-2xl border border-surface-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-card">
                <CreditCard className="w-4 h-4 text-text-muted" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Payment Settings</h3>
                <p className="text-xs text-text-muted">Update your payment methods and payout preferences</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Update</Button>
          </div>
        </div>

        <div className="glass rounded-2xl border border-red-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <LogOut className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Sign Out</h3>
                <p className="text-xs text-text-muted">Sign out of your account</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
