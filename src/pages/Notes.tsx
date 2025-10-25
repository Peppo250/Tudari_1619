import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Search, FileText, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Note {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
}

const Notes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Check auth
    const userData = localStorage.getItem("tudari_user");
    if (!userData) {
      navigate("/login");
      return;
    }

    // Load notes from localStorage (temporary storage)
    const savedNotes = localStorage.getItem("tudari_notes");
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, [navigate]);

  const createNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: "Untitled Note",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem("tudari_notes", JSON.stringify(updatedNotes));
    navigate(`/notes/${newNote.id}`);
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Notes</h1>
              <p className="text-xs text-muted-foreground">Create and manage your notes</p>
            </div>
          </div>
          
          <Button onClick={createNewNote} className="shadow-medium hover:shadow-strong">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-hero mb-4 shadow-glow">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Notes Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your learning journey by creating your first note
            </p>
            <Button onClick={createNewNote} size="lg" className="shadow-medium hover:shadow-strong">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Note
            </Button>
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
                  className="group cursor-pointer hover:shadow-strong transition-all duration-300 border-0 h-full"
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-medium group-hover:shadow-glow transition-all">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      {note.summary && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Sparkles className="w-3 h-3" />
                          AI Summary
                        </div>
                      )}
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                      {note.title}
                    </CardTitle>
                    <CardDescription>
                      Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  {note.summary && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {note.summary}
                      </p>
                    </CardContent>
                  )}
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
