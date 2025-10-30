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
  Image as ImageIcon,
  Square,
  Circle as CircleIcon,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stage, Layer, Line, Circle as KonvaCircle, Rect as KonvaRect, Image as KonvaImage } from "react-konva";
import jsPDF from "jspdf";

interface Stroke {
  id: string;
  tool: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
  globalCompositeOperation?: string;
}

interface Question {
  question: string;
  options: string[];
  correct_answer: number;
}

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const stageRef = useRef<any>(null);
  const textSectionRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const isDrawing = useRef(false);
  const [title, setTitle] = useState("Untitled Note");
  const [textContent, setTextContent] = useState("");
  const [activeTool, setActiveTool] = useState<"select" | "pen" | "highlighter" | "eraser" | "rectangle" | "circle">("select");
  const [brushColor, setBrushColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(2);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
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
          
          // Load canvas strokes if they exist
          if (note.strokes && Array.isArray(note.strokes)) {
            setStrokes(note.strokes as unknown as Stroke[]);
            toast.success("Canvas loaded!");
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

  const handleMouseDown = (e: any) => {
    if (activeTool === "select") return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    isDrawing.current = true;
    
    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      tool: activeTool,
      points: [point.x, point.y],
      stroke: activeTool === "eraser" ? "#ffffff" : activeTool === "highlighter" ? brushColor + "4D" : brushColor,
      strokeWidth: activeTool === "highlighter" ? brushSize * 3 : activeTool === "eraser" ? brushSize * 3 : brushSize,
      globalCompositeOperation: activeTool === "eraser" ? "destination-out" : "source-over"
    };
    
    setCurrentStroke(newStroke);
    setStrokes([...strokes, newStroke]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !currentStroke) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (activeTool === "rectangle" || activeTool === "circle") {
      currentStroke.points = [currentStroke.points[0], currentStroke.points[1], point.x, point.y];
    } else {
      currentStroke.points = currentStroke.points.concat([point.x, point.y]);
    }

    setStrokes((prevStrokes) => {
      const newStrokes = [...prevStrokes];
      newStrokes[newStrokes.length - 1] = { ...currentStroke };
      return newStrokes;
    });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    setCurrentStroke(null);
  };

  const renderShape = (stroke: Stroke) => {
    if (stroke.tool === "rectangle" && stroke.points.length >= 4) {
      const x = stroke.points[0];
      const y = stroke.points[1];
      const width = stroke.points[2] - stroke.points[0];
      const height = stroke.points[3] - stroke.points[1];
      
      return (
        <KonvaRect
          key={stroke.id}
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={stroke.stroke}
          strokeWidth={stroke.strokeWidth}
          fill="transparent"
        />
      );
    }

    if (stroke.tool === "circle" && stroke.points.length >= 4) {
      const x = (stroke.points[0] + stroke.points[2]) / 2;
      const y = (stroke.points[1] + stroke.points[3]) / 2;
      const radius = Math.sqrt(
        Math.pow(stroke.points[2] - stroke.points[0], 2) + 
        Math.pow(stroke.points[3] - stroke.points[1], 2)
      ) / 2;
      
      return (
        <KonvaCircle
          key={stroke.id}
          x={x}
          y={y}
          radius={radius}
          stroke={stroke.stroke}
          strokeWidth={stroke.strokeWidth}
          fill="transparent"
        />
      );
    }

    return (
      <Line
        key={stroke.id}
        points={stroke.points}
        stroke={stroke.stroke}
        strokeWidth={stroke.strokeWidth}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={stroke.globalCompositeOperation as any}
      />
    );
  };

  const handleZoomIn = () => {
    setStageScale(stageScale * 1.1);
  };

  const handleZoomOut = () => {
    setStageScale(stageScale / 1.1);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newStroke: Stroke = {
          id: `image-${Date.now()}`,
          tool: "image",
          points: [100, 100], // Default position
          stroke: imgUrl,
          strokeWidth: 0
        };
        setStrokes([...strokes, newStroke]);
        toast.success("Image imported!");
      };
      img.src = imgUrl;
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
          strokes: strokes as any,
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

  const exportToPDF = async () => {
    if (!stageRef.current || !textSectionRef.current) return;

    try {
      toast.info("Generating PDF...");
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Title
      pdf.setFontSize(20);
      pdf.text(title, pageWidth / 2, 20, { align: 'center' });
      
      let yOffset = 35;
      
      // Canvas
      const stage = stageRef.current;
      const canvasDataURL = stage.toDataURL({ pixelRatio: 2 });
      const canvasAspectRatio = 800 / 600;
      const canvasWidth = pageWidth - 20;
      const canvasHeight = canvasWidth / canvasAspectRatio;
      pdf.addImage(canvasDataURL, 'PNG', 10, yOffset, canvasWidth, canvasHeight);
      yOffset += canvasHeight + 10;
      
      // Text content
      if (textContent) {
        if (yOffset + 30 > pageHeight) {
          pdf.addPage();
          yOffset = 20;
        }
        pdf.setFontSize(14);
        pdf.text("Notes:", 10, yOffset);
        yOffset += 7;
        pdf.setFontSize(11);
        const textLines = pdf.splitTextToSize(textContent, pageWidth - 20);
        pdf.text(textLines, 10, yOffset);
        yOffset += textLines.length * 5 + 10;
      }
      
      // Summary
      if (summary) {
        if (yOffset + 30 > pageHeight) {
          pdf.addPage();
          yOffset = 20;
        }
        pdf.setFontSize(14);
        pdf.text("AI Summary:", 10, yOffset);
        yOffset += 7;
        pdf.setFontSize(11);
        const summaryLines = pdf.splitTextToSize(summary, pageWidth - 20);
        pdf.text(summaryLines, 10, yOffset);
      }
      
      pdf.save(`${title}.pdf`);
      toast.success("PDF exported!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
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
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
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
        <div className="space-y-6">
          {/* Canvas Section */}
          <div>
            <div className="border-b bg-pine-light/50 backdrop-blur-sm rounded-t-lg mb-4 p-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button variant={activeTool === "pen" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("pen")}>
                    <Pen className="w-4 h-4" />
                  </Button>
                  <Button variant={activeTool === "highlighter" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("highlighter")}>
                    <Highlighter className="w-4 h-4" />
                  </Button>
                  <Button variant={activeTool === "eraser" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("eraser")}>
                    <Eraser className="w-4 h-4" />
                  </Button>
                  <Button variant={activeTool === "rectangle" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("rectangle")}>
                    <Square className="w-4 h-4" />
                  </Button>
                  <Button variant={activeTool === "circle" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("circle")}>
                    <CircleIcon className="w-4 h-4" />
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
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
            <Card className="border-0 shadow-strong overflow-hidden bg-white">
              <Stage
                width={800}
                height={600}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                ref={stageRef}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePos.x}
                y={stagePos.y}
              >
                <Layer>
                  {/* Grid */}
                  {Array.from({ length: 40 }).map((_, i) => (
                    <Line
                      key={`v-${i}`}
                      points={[i * 20, 0, i * 20, 600]}
                      stroke="#eee"
                      strokeWidth={0.5}
                    />
                  ))}
                  {Array.from({ length: 30 }).map((_, i) => (
                    <Line
                      key={`h-${i}`}
                      points={[0, i * 20, 800, i * 20]}
                      stroke="#eee"
                      strokeWidth={0.5}
                    />
                  ))}
                  
                  {/* Strokes */}
                  {strokes.map(renderShape)}
                </Layer>
              </Stage>
            </Card>
          </div>

          {/* Text Section */}
          <div ref={textSectionRef}>
            <h3 className="text-sm font-semibold mb-3 px-1">Text Notes</h3>
            <Card className="p-4 bg-pine-light/20">
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your notes here..."
                className="min-h-[300px] text-base border-0 focus-visible:ring-0 bg-transparent"
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
