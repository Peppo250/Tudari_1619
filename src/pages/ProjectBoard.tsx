import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Loader2, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { offlineSupabase } from "@/lib/offlineSupabase";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
}

const ProjectBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "", 
    priority: "medium",
    due_date: ""
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const [projectData, tasksData] = await Promise.all([
        offlineSupabase.from('projects').select('*').eq('id', projectId).single(),
        offlineSupabase.from('tasks').select('*').eq('project_id', projectId).eq('user_id', user.id)
      ]);

      if (projectData.error) throw projectData.error;
      if (tasksData.error) throw tasksData.error;

      setProject(projectData.data);
      setTasks(tasksData.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await offlineSupabase.from('tasks').insert({
        ...newTask,
        project_id: projectId,
        user_id: user.id,
        status: 'todo',
        due_date: newTask.due_date || null
      });

      if (error) throw error;

      toast.success("Task created!");
      setNewTask({ title: "", description: "", priority: "medium", due_date: "" });
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await offlineSupabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await offlineSupabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success("Task deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'border-l-blue-500' },
    { id: 'in_progress', title: 'In Progress', color: 'border-l-yellow-500' },
    { id: 'completed', title: 'Completed', color: 'border-l-green-500' }
  ];

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/tasks")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{project?.title}</h1>
              <p className="text-xs text-muted-foreground">{project?.description}</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-medium">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
                <Button onClick={createTask} className="w-full">Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <div key={column.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{column.title}</h2>
                <span className="text-sm text-muted-foreground">
                  {tasks.filter(t => t.status === column.id).length}
                </span>
              </div>
              <div className="space-y-3">
                {tasks.filter(t => t.status === column.id).map((task) => (
                  <Card key={task.id} className={`p-4 border-l-4 ${column.color} hover:shadow-medium transition-all group`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold flex-1">{task.title}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      {column.id !== 'todo' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs flex-1"
                          onClick={() => updateTaskStatus(task.id, column.id === 'in_progress' ? 'todo' : 'in_progress')}
                        >
                          ← {column.id === 'in_progress' ? 'To Do' : 'In Progress'}
                        </Button>
                      )}
                      {column.id !== 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs flex-1"
                          onClick={() => updateTaskStatus(task.id, column.id === 'todo' ? 'in_progress' : 'completed')}
                        >
                          {column.id === 'todo' ? 'In Progress' : 'Completed'} →
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ProjectBoard;
