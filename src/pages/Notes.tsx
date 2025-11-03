import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText, Search, Loader2, Trash2, FolderPlus, Folder } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { offlineSupabase } from "@/lib/offlineSupabase";
import { DeleteNoteDialog } from "@/components/DeleteNoteDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Note {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  summary?: string;
  text_content?: string;
  folder?: string;
}

const Notes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedNoteForFolder, setSelectedNoteForFolder] = useState<Note | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

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

      const { data, error } = await offlineSupabase
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

      const { error } = await offlineSupabase
        .from('notes')
        .insert({
          title: "Untitled Note",
          user_id: user.id,
          content_type: "canvas",
          folder: null
        });

      if (error) throw error;

      // Reload to get the created note
      await loadNotes();
      const latestNote = notes[0];
      if (latestNote) {
        navigate(`/notes/${latestNote.id}`);
      }

      
      toast.success("New note created!");
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    }
  };

  const deleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      const { error } = await offlineSupabase
        .from('notes')
        .delete()
        .eq('id', noteToDelete.id);

      if (error) throw error;

      toast.success("Note deleted!");
      loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const handleMoveToFolder = async () => {
    if (!selectedNoteForFolder) return;
    
    try {
      const { error } = await offlineSupabase
        .from('notes')
        .update({ folder: newFolderName || null })
        .eq('id', selectedNoteForFolder.id);

      if (error) throw error;

      toast.success(newFolderName ? `Note moved to ${newFolderName}!` : "Note removed from folder!");
      loadNotes();
    } catch (error) {
      console.error("Error updating folder:", error);
      toast.error("Failed to move note");
    } finally {
      setFolderDialogOpen(false);
      setSelectedNoteForFolder(null);
      setNewFolderName("");
    }
  };

  const folders = Array.from(new Set(notes.map(n => n.folder).filter(Boolean))) as string[];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = !selectedFolder || note.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

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
        <div className="mb-6 space-y-4">
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

          {folders.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={selectedFolder === null ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedFolder(null)}
              >
                All Notes
              </Button>
              {folders.map(folder => (
                <Button 
                  key={folder}
                  variant={selectedFolder === folder ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedFolder(folder)}
                >
                  <Folder className="w-3 h-3 mr-1" />
                  {folder}
                </Button>
              ))}
            </div>
          )}
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
                <Card className="p-6 hover:shadow-strong transition-all duration-300 group">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-1" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/notes/${note.id}`)}>
                      <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                        {note.title}
                      </h3>
                      {note.folder && (
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {note.folder}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Updated {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                      {note.summary && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {note.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNoteForFolder(note);
                          setNewFolderName(note.folder || "");
                          setFolderDialogOpen(true);
                        }}
                      >
                        <FolderPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToDelete(note);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        <DeleteNoteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={deleteNote}
          noteTitle={noteToDelete?.title || ""}
        />

        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move to Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name or leave empty to remove from folder"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleMoveToFolder}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Notes;
