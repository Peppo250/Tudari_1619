import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Clock, Loader2, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { offlineSupabase } from "@/lib/offlineSupabase";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Log {
  id: string;
  date: string;
  day: string;
  topic: string;
  start_time: string;
  end_time: string;
  intensity: number;
  note?: string;
  created_at: string;
}

const Logs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    topic: "",
    start_time: "",
    end_time: "",
    intensity: 5,
    note: ""
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await offlineSupabase
        .from('logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const createLog = async () => {
    if (!newLog.topic.trim() || !newLog.start_time || !newLog.end_time) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await offlineSupabase
        .from('logs')
        .insert({
          ...newLog,
          user_id: user.id
        });

      if (error) throw error;

      toast.success("Log created!");
      setNewLog({
        date: new Date().toISOString().split('T')[0],
        day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        topic: "",
        start_time: "",
        end_time: "",
        intensity: 5,
        note: ""
      });
      setIsDialogOpen(false);
      loadLogs();
    } catch (error) {
      console.error("Error creating log:", error);
      toast.error("Failed to create log");
    }
  };

  const deleteLog = async (id: string) => {
    try {
      const { error } = await offlineSupabase
        .from('logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Log deleted");
      loadLogs();
    } catch (error) {
      console.error("Error deleting log:", error);
      toast.error("Failed to delete log");
    }
  };

  const exportLogs = () => {
    const content = logs.map(log => 
      `Date: ${new Date(log.date).toLocaleDateString()} (${log.day})\nTopic: ${log.topic}\nTime: ${log.start_time} - ${log.end_time}\nIntensity: ${log.intensity}/10${log.note ? `\nNote: ${log.note}` : ''}\n${'='.repeat(50)}`
    ).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported!");
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
              <h1 className="text-2xl font-bold">Study Logs</h1>
              <p className="text-xs text-muted-foreground">Track your study sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  New Log
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Log</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  type="date"
                  value={newLog.date}
                  onChange={(e) => setNewLog({ 
                    ...newLog, 
                    date: e.target.value,
                    day: new Date(e.target.value).toLocaleDateString('en-US', { weekday: 'long' })
                  })}
                />
                <Input
                  placeholder="Topic"
                  value={newLog.topic}
                  onChange={(e) => setNewLog({ ...newLog, topic: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Start Time</label>
                    <Input
                      type="time"
                      value={newLog.start_time}
                      onChange={(e) => setNewLog({ ...newLog, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">End Time</label>
                    <Input
                      type="time"
                      value={newLog.end_time}
                      onChange={(e) => setNewLog({ ...newLog, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Intensity: {newLog.intensity}</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newLog.intensity}
                    onChange={(e) => setNewLog({ ...newLog, intensity: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <Textarea
                  placeholder="Notes (optional)"
                  value={newLog.note}
                  onChange={(e) => setNewLog({ ...newLog, note: e.target.value })}
                />
                <Button onClick={createLog} className="w-full">Create Log</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-bold mb-2">No Logs Yet</h3>
            <p className="text-muted-foreground mb-6">Start tracking your study sessions!</p>
            <Button onClick={() => setIsDialogOpen(true)} size="lg" className="shadow-medium">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Log
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="p-6 hover:shadow-strong transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg">{log.topic}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="block font-medium">Date</span>
                        {new Date(log.date).toLocaleDateString()} ({log.day})
                      </div>
                      <div>
                        <span className="block font-medium">Time</span>
                        {log.start_time} - {log.end_time}
                      </div>
                      <div>
                        <span className="block font-medium">Intensity</span>
                        {log.intensity}/10
                      </div>
                    </div>
                    {log.note && (
                      <p className="text-sm text-muted-foreground mt-2">{log.note}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteLog(log.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Logs;
