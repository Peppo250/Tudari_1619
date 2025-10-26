import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Award, Flame, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Productivity {
  score: number;
  streak: number;
  tasks_completed: number;
  notes_count: number;
  logs_intensity_total: number;
  quiz_score: number;
  date: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  type: string;
  unlocked_at: string;
}

const Productivity = () => {
  const navigate = useNavigate();
  const [productivity, setProductivity] = useState<Productivity | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load today's productivity
      const today = new Date().toISOString().split('T')[0];
      const { data: prodData, error: prodError } = await supabase
        .from('productivity')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (prodError && prodError.code !== 'PGRST116') {
        throw prodError;
      }

      setProductivity(prodData);

      // Load rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (rewardsError) throw rewardsError;
      setRewards(rewardsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load productivity data");
    } finally {
      setLoading(false);
    }
  };

  const calculateProductivity = async () => {
    try {
      const { error } = await supabase.functions.invoke('calculate-productivity');
      
      if (error) throw error;
      
      toast.success("Productivity calculated!");
      loadData();
    } catch (error) {
      console.error("Error calculating productivity:", error);
      toast.error("Failed to calculate productivity");
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
              <h1 className="text-2xl font-bold">Productivity</h1>
              <p className="text-xs text-muted-foreground">Track your progress and rewards</p>
            </div>
          </div>
          <Button onClick={calculateProductivity} className="shadow-medium">
            <TrendingUp className="w-4 h-4 mr-2" />
            Calculate Score
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-primary" />
                  <span className="text-3xl font-bold">{productivity?.score || 0}</span>
                </div>
                <h3 className="font-semibold">Productivity Score</h3>
                <p className="text-sm text-muted-foreground">Today's score</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Flame className="w-8 h-8 text-orange-500" />
                  <span className="text-3xl font-bold">{productivity?.streak || 0}</span>
                </div>
                <h3 className="font-semibold">Day Streak</h3>
                <p className="text-sm text-muted-foreground">Keep it going!</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-green-500" />
                  <span className="text-3xl font-bold">{productivity?.tasks_completed || 0}</span>
                </div>
                <h3 className="font-semibold">Tasks Done</h3>
                <p className="text-sm text-muted-foreground">Completed tasks</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                  <span className="text-3xl font-bold">{productivity?.notes_count || 0}</span>
                </div>
                <h3 className="font-semibold">Notes Created</h3>
                <p className="text-sm text-muted-foreground">Study notes</p>
              </Card>
            </div>

            {/* Rewards Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Your Rewards</h2>
              </div>

              {rewards.length === 0 ? (
                <Card className="p-8 text-center">
                  <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Rewards Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep studying to unlock rewards!
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => (
                    <Card key={reward.id} className="p-6">
                      <div className="flex items-start gap-3">
                        <Award className="w-6 h-6 text-primary flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold mb-1">{reward.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {reward.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Unlocked {new Date(reward.unlocked_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Productivity;
