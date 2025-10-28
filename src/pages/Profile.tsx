import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Save, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  free_time?: string[];
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    freeTime: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const profileData = data || { id: user.id, email: user.email, username: null, name: null, free_time: [] };
      setProfile(profileData as Profile);
      setFormData({
        username: data?.username || "",
        name: data?.name || "",
        email: data?.email || user.email || "",
        freeTime: Array.isArray(data?.free_time) ? data.free_time.join(", ") : ""
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const freeTimeArray = formData.freeTime
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          username: formData.username,
          name: formData.name,
          email: formData.email,
          free_time: freeTimeArray,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success("Profile updated!");
      loadProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Profile</h1>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Card className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{formData.name || formData.username || "User"}</h2>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Username</label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Full Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <Input
                    value={formData.email}
                    disabled
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Free Time Slots</label>
                <Input
                  value={formData.freeTime}
                  onChange={(e) => setFormData({ ...formData, freeTime: e.target.value })}
                  placeholder="e.g., Monday 2-4pm, Wednesday 6-8pm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your available time slots separated by commas
                </p>
              </div>

              <Button onClick={handleSave} className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Profile;
