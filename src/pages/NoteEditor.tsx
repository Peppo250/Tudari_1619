import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { 
  ArrowLeft, 
  Save, 
  Pen, 
  Eraser, 
  Palette,
  Sparkles,
  FileText,
  Loader2,
  Download
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

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [title, setTitle] = useState("Untitled Note");
  const [textContent, setTextContent] = useState("");
  const [activeTool, setActiveTool] = useState<"pen" | "eraser">("pen");
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

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 400,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    const brush = new PencilBrush(canvas);
    brush.color = brushColor;
    brush.width = brushSize;
    canvas.freeDrawingBrush = brush;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

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

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      const canvasData = fabricCanvas ? fabricCanvas.toJSON() : null;
      
      const { error } = await supabase
        .from('notes')
        .update({
          title,
          text_content: textContent,
          strokes: canvasData ? canvasData.objects : [],
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
        toast.success("Quiz generated!");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const loadQuiz = async () => {
    if (!quizId) return;
    
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('questions')
        .eq('id', quizId)
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
              <Button variant="outline" size="sm" onClick={loadQuiz}>
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
            <div className="border-b bg-card/50 backdrop-blur-sm rounded-t-lg mb-4 p-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button variant={activeTool === "pen" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("pen")}>
                    <Pen className="w-4 h-4" />
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
              </div>
            </div>
            <Card className="border-0 shadow-strong overflow-hidden">
              <canvas ref={canvasRef} className="w-full border rounded-lg" />
            </Card>
          </div>

          {/* Text Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 px-1">Text Notes</h3>
            <Card className="p-4">
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your notes here..."
                className="min-h-[450px] text-base border-0 focus-visible:ring-0"
              />
            </Card>
          </div>
        </div>

        {summary && (
          <Card className="mt-6 p-4 bg-accent/10 border-accent/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-accent mt-0.5" />
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
