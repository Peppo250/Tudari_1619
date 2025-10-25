import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { 
  ArrowLeft, 
  Save, 
  Undo, 
  Redo, 
  Pen, 
  Eraser, 
  Image as ImageIcon,
  Palette,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [title, setTitle] = useState("Untitled Note");
  const [activeTool, setActiveTool] = useState<"pen" | "eraser">("pen");
  const [brushColor, setBrushColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(2);

  useEffect(() => {
    // Check auth
    const userData = localStorage.getItem("tudari_user");
    if (!userData) {
      navigate("/login");
      return;
    }

    // Load note data
    const savedNotes = localStorage.getItem("tudari_notes");
    if (savedNotes) {
      const notes = JSON.parse(savedNotes);
      const note = notes.find((n: any) => n.id === id);
      if (note) {
        setTitle(note.title);
      }
    }

    // Initialize Fabric canvas
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    // Set up drawing brush
    const brush = new PencilBrush(canvas);
    brush.color = brushColor;
    brush.width = brushSize;
    canvas.freeDrawingBrush = brush;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = true;
    const brush = new PencilBrush(fabricCanvas);
    
    if (activeTool === "eraser") {
      brush.color = "#ffffff";
      brush.width = brushSize * 3;
    } else {
      brush.color = brushColor;
      brush.width = brushSize;
    }
    
    fabricCanvas.freeDrawingBrush = brush;
  }, [activeTool, brushColor, brushSize, fabricCanvas]);

  const handleSave = () => {
    if (!fabricCanvas) return;

    const savedNotes = localStorage.getItem("tudari_notes");
    if (savedNotes) {
      const notes = JSON.parse(savedNotes);
      const noteIndex = notes.findIndex((n: any) => n.id === id);
      
      if (noteIndex !== -1) {
        notes[noteIndex] = {
          ...notes[noteIndex],
          title,
          updatedAt: new Date().toISOString(),
          // In full version, we'd save canvas data here
        };
        
        localStorage.setItem("tudari_notes", JSON.stringify(notes));
        toast.success("Note saved successfully!");
      }
    }
  };

  const handleUndo = () => {
    // Fabric.js undo/redo would be implemented with custom history stack
    toast("Undo functionality will be enhanced in full version");
  };

  const handleRedo = () => {
    toast("Redo functionality will be enhanced in full version");
  };

  const colors = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#22c55e", // green
    "#eab308", // yellow
    "#a855f7", // purple
    "#000000", // black
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("/notes")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-md font-semibold"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Summary
            </Button>
            <Button onClick={handleSave} size="sm" className="shadow-medium">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Tools */}
            <div className="flex items-center gap-2">
              <Button
                variant={activeTool === "pen" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("pen")}
              >
                <Pen className="w-4 h-4" />
              </Button>
              <Button
                variant={activeTool === "eraser" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("eraser")}
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Colors */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              {colors.map((color) => (
                <button
                  key={color}
                  className={`w-7 h-7 rounded-md border-2 transition-all ${
                    brushColor === color ? "border-primary scale-110 shadow-medium" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                />
              ))}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm font-medium w-8">{brushSize}px</span>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* History */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleUndo}>
                <Undo className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRedo}>
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Image Upload */}
            <Button variant="outline" size="sm">
              <ImageIcon className="w-4 h-4 mr-2" />
              Add Image
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <main className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-strong overflow-hidden">
          <div className="p-4 bg-gradient-to-b from-muted/50 to-transparent">
            <div className="flex justify-center">
              <canvas 
                ref={canvasRef} 
                className="border border-border rounded-lg shadow-medium"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }}
              />
            </div>
          </div>
        </Card>

        <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">AI Features Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Automatic note summarization and quiz generation will be powered by AI when backend is connected.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NoteEditor;
