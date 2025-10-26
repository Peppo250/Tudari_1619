import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Note {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  summary?: string;
  text_content?: string;
}

const Notes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const createNewNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: "Untitled Note",
          user_id: user.id,
          content_type: "canvas"
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("New note created!");
      navigate(`/notes/${data.id}`);
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Notes</h1>
              <p className="text-xs text-muted-foreground">Create and manage your study notes</p>
            </div>
          </div>
          <Button onClick={createNewNote} className="shadow-medium">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-bold mb-2">No Notes Yet</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? "No notes match your search" : "Start creating your first note!"}
            </p>
            {!searchQuery && (
              <Button onClick={createNewNote} size="lg" className="shadow-medium">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Note
              </Button>
            )}
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredNotes.map((note) => (
              <motion.div key={note.id} variants={item}>
                <Card 
                  className="p-6 cursor-pointer hover:shadow-strong transition-all duration-300 group"
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                        {note.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Updated {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                      {note.summary && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {note.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Notes;
