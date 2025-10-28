import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Save, 
  Pen, 
  Eraser, 
  Palette,
  Sparkles,
  FileText,
  Loader2,
  Download,
  Highlighter,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Question {
  question: string;
  options: string[];
  correct_answer: number;
}

interface Stroke {
  tool: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [title, setTitle] = useState("Untitled Note");
  const [textContent, setTextContent] = useState("");
  const [activeTool, setActiveTool] = useState<"pen" | "pencil" | "eraser" | "highlighter">("pen");
  const [brushColor, setBrushColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [summary, setSummary] = useState("");
  const [quizId, setQuizId] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (id) {
        const { data: note, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          toast.error("Failed to load note");
          navigate("/notes");
          return;
        }

        if (note) {
          setTitle(note.title);
          setTextContent(note.text_content || "");
          setSummary(note.summary || "");
          setQuizId(note.quiz_id);
          if (note.strokes && Array.isArray(note.strokes)) {
            setStrokes(note.strokes as unknown as Stroke[]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading note:", error);
      toast.error("Failed to load note");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 500;
    const context = canvas.getContext("2d");
    if (!context) return;

    setCtx(context);
    drawGrid(context);
    redrawCanvas(context);
  }, []);

  useEffect(() => {
    if (ctx) {
      redrawCanvas(ctx);
    }
  }, [strokes, ctx]);

  const drawGrid = (context: CanvasRenderingContext2D) => {
    const gridSize = 20;
    context.strokeStyle = "#f0f0f0";
    context.lineWidth = 0.5;

    for (let x = 0; x <= 800; x += gridSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 500);
      context.stroke();
    }

    for (let y = 0; y <= 500; y += gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(800, y);
      context.stroke();
    }
  };

  const redrawCanvas = (context: CanvasRenderingContext2D) => {
    context.clearRect(0, 0, 800, 500);
    drawGrid(context);

    strokes.forEach((stroke) => {
      drawStroke(context, stroke);
    });

    if (currentStroke) {
      drawStroke(context, currentStroke);
    }
  };

  const drawStroke = (context: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    context.beginPath();
    context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    context.lineWidth = stroke.size;
    context.lineCap = "round";
    context.lineJoin = "round";

    if (stroke.tool === "highlighter") {
      context.globalAlpha = 0.3;
      context.lineWidth = stroke.size * 3;
    } else {
      context.globalAlpha = 1;
    }

    context.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      context.lineTo(stroke.points[i].x, stroke.points[i].y);
    }

    context.stroke();
    context.globalAlpha = 1;
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    
    const newStroke: Stroke = {
      tool: activeTool,
      color: brushColor,
      size: activeTool === "highlighter" ? brushSize * 2 : activeTool === "eraser" ? brushSize * 3 : brushSize,
      points: [pos],
    };
    
    setCurrentStroke(newStroke);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke || !ctx) return;

    const pos = getMousePos(e);
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, pos],
    };

    setCurrentStroke(updatedStroke);
    redrawCanvas(ctx);
  };

  const stopDrawing = () => {
    if (currentStroke && currentStroke.points.length > 1) {
      setStrokes([...strokes, currentStroke]);
    }
    setCurrentStroke(null);
    setIsDrawing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (ctx && canvasRef.current) {
          const scale = Math.min(
            canvasRef.current.width / img.width,
            canvasRef.current.height / img.height,
            1
          );
          const width = img.width * scale;
          const height = img.height * scale;
          const x = (canvasRef.current.width - width) / 2;
          const y = (canvasRef.current.height - height) / 2;

          ctx.drawImage(img, x, y, width, height);
          toast.success("Image imported!");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title,
          text_content: textContent,
          strokes: strokes as unknown as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Note saved successfully!");
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!id) return;
    
    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-note', {
        body: { noteId: id, action: 'summarize' }
      });

      if (error) throw error;
      
      if (data.summary) {
        setSummary(data.summary);
        toast.success("Summary generated!");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary");
    } finally {
      setSummarizing(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!id) return;
    
    setGeneratingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-note', {
        body: { noteId: id, action: 'generate-quiz' }
      });

      if (error) throw error;
      
      if (data.quizId) {
        setQuizId(data.quizId);
        toast.success("Quiz generated! Click 'Attempt Quiz' to start.");
        await loadQuiz(data.quizId);
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const loadQuiz = async (qId?: string) => {
    const quizIdToLoad = qId || quizId;
    if (!quizIdToLoad) return;
    
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('questions')
        .eq('id', quizIdToLoad)
        .single();

      if (error) throw error;
      
      setQuizData(data.questions as unknown as Question[]);
      setShowQuiz(true);
    } catch (error) {
      console.error("Error loading quiz:", error);
      toast.error("Failed to load quiz");
    }
  };

  const submitQuiz = async () => {
    if (!quizId) return;
    
    const score = quizData.reduce((acc, q, idx) => {
      return acc + (answers[idx] === q.correct_answer ? 1 : 0);
    }, 0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('quiz_results').insert({
        quiz_id: quizId,
        user_id: user.id,
        score,
        total_questions: quizData.length,
        answers: Object.entries(answers).map(([qIdx, aIdx]) => ({
          question_index: parseInt(qIdx),
          answer_index: aIdx
        }))
      });

      if (error) throw error;
      
      toast.success(`Quiz completed! Score: ${score}/${quizData.length}`);
      setShowQuiz(false);
      setAnswers({});
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
    }
  };

  const exportNote = () => {
    const content = `Title: ${title}\n\nContent:\n${textContent}\n\n${summary ? `Summary:\n${summary}` : ''}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Note exported!");
  };

  const colors = [
    "#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#000000"
  ];

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
            <Button variant="outline" size="sm" onClick={exportNote}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={summarizing}>
              {summarizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Summary
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerateQuiz} disabled={generatingQuiz}>
              {generatingQuiz ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Quiz
            </Button>
            {quizId && (
              <Button variant="outline" size="sm" onClick={() => loadQuiz()}>
                <FileText className="w-4 h-4 mr-2" />
                Attempt Quiz
              </Button>
            )}
            <Button onClick={handleSave} size="sm" className="shadow-medium" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Canvas Section */}
          <div>
            <div className="border-b bg-pine-light/50 backdrop-blur-sm rounded-t-lg mb-4 p-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button variant={activeTool === "pen" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("pen")}>
                    <Pen className="w-4 h-4" />
                  </Button>
                  <Button variant={activeTool === "pencil" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("pencil")}>
                    <Pen className="w-4 h-4" />
                  </Button>
                  <Button variant={activeTool === "highlighter" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("highlighter")}>
                    <Highlighter className="w-4 h-4" />
                  </Button>
                  <Button variant={activeTool === "eraser" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("eraser")}>
                    <Eraser className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-6 w-px bg-border" />
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Size:</span>
                  <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-24" />
                  <span className="text-sm font-medium w-8">{brushSize}px</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Import
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            <Card className="border-0 shadow-strong overflow-hidden bg-amber-light/20">
              <canvas 
                ref={canvasRef} 
                className="w-full border rounded-lg cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </Card>
          </div>

          {/* Text Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 px-1">Text Notes</h3>
            <Card className="p-4 bg-pine-light/20">
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your notes here..."
                className="min-h-[450px] text-base border-0 focus-visible:ring-0 bg-transparent"
              />
            </Card>
          </div>
        </div>

        {summary && (
          <Card className="mt-6 p-4 bg-amber-light/30 border-amber/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">AI Summary</h3>
                <p className="text-sm">{summary}</p>
              </div>
            </div>
          </Card>
        )}
      </main>

      <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz - {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {quizData.map((q, qIdx) => (
              <div key={qIdx} className="space-y-3">
                <h4 className="font-semibold">{qIdx + 1}. {q.question}</h4>
                <div className="space-y-2">
                  {q.options.map((option, oIdx) => (
                    <label key={oIdx} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors">
                      <input
                        type="radio"
                        name={`q${qIdx}`}
                        checked={answers[qIdx] === oIdx}
                        onChange={() => setAnswers({ ...answers, [qIdx]: oIdx })}
                        className="w-4 h-4"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={submitQuiz} className="w-full" disabled={Object.keys(answers).length !== quizData.length}>
              Submit Quiz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteEditor;
