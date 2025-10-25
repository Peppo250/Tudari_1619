import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";

const Logs = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("tudari_user");
    if (!userData) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">User Logs</h1>
              <p className="text-xs text-muted-foreground">Track your study sessions</p>
            </div>
          </div>
          <Button className="shadow-medium">
            <Plus className="w-4 h-4 mr-2" />
            New Log
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h3 className="text-2xl font-bold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground">Log tracking will be available in the next update</p>
        </div>
      </main>
    </div>
  );
};

export default Logs;
