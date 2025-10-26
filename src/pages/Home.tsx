import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  TrendingUp, 
  User, 
  Sparkles,
  LogOut,
  Moon,
  Sun
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const modules = [
    {
      title: "Notemaking",
      description: "Create beautiful notes with canvas drawing and AI summaries",
      icon: BookOpen,
      color: "from-blue-500 to-blue-600",
      path: "/notes"
    },
    {
      title: "User Logs",
      description: "Track your study sessions and daily activities",
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
      path: "/logs"
    },
    {
      title: "Projects & Tasks",
      description: "Organize your work with Kanban boards and todos",
      icon: CheckSquare,
      color: "from-teal-500 to-teal-600",
      path: "/tasks"
    },
    {
      title: "Productivity",
      description: "View your streaks, rewards, and achievement analytics",
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      path: "/productivity"
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-medium">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                Tudari
              </h1>
              <p className="text-xs text-muted-foreground">AI Learning Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/profile")}>
              <User className="w-4 h-4 mr-2" />
              {user?.user_metadata?.username || user?.email}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.user_metadata?.username || user?.email}! 👋</h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Ready to make today productive?
          </p>
        </motion.div>

        {/* Module Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div key={index} variants={item}>
                <Card 
                  className="group cursor-pointer hover:shadow-strong transition-all duration-300 border-0 overflow-hidden h-full"
                  onClick={() => navigate(module.path)}
                >
                  <div className={`h-2 bg-gradient-to-r ${module.color}`} />
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${module.color} flex items-center justify-center shadow-medium group-hover:shadow-glow transition-all`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <CardTitle className="mt-4 group-hover:text-primary transition-colors">
                      {module.title}
                    </CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full group-hover:bg-primary/10 transition-colors">
                      Open Module →
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-medium bg-gradient-primary">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-white">
                <div className="text-center">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Notes Created</div>
                </div>
                <div className="text-center border-x border-white/20">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">0</div>
                  <div className="text-sm opacity-90">Tasks Done</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Home;
