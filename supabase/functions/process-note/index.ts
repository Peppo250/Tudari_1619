import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, action } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get note data
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      throw new Error('Note not found');
    }

    const noteContent = note.text_content || 
      (note.strokes && Array.isArray(note.strokes) ? `Canvas with ${note.strokes.length} strokes` : 'Empty note');

    if (action === 'summarize') {
      // Generate summary
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful assistant that creates concise summaries of study notes. Keep summaries under 150 words.' 
            },
            { 
              role: 'user', 
              content: `Summarize the following note titled "${note.title}":\n\n${noteContent}` 
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.choices[0].message.content;

      // Update note with summary
      await supabase
        .from('notes')
        .update({ summary })
        .eq('id', noteId);

      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'generate-quiz') {
      // Generate quiz
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful assistant that creates educational quizzes. Generate 5 multiple-choice questions based on the note content. Return ONLY valid JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0}]} where correct_answer is the index (0-3) of the correct option.' 
            },
            { 
              role: 'user', 
              content: `Create a quiz for this note titled "${note.title}":\n\n${noteContent}` 
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const quizContent = data.choices[0].message.content;
      
      // Parse quiz JSON
      let questions;
      try {
        const parsed = JSON.parse(quizContent);
        questions = parsed.questions;
      } catch (e) {
        // If AI didn't return pure JSON, try to extract it
        const match = quizContent.match(/\{[\s\S]*\}/);
        if (match) {
          const extracted = JSON.parse(match[0]);
          questions = extracted.questions;
        } else {
          throw new Error('Failed to parse quiz');
        }
      }

      // Normalize questions to ensure correct_answer field exists
      questions = questions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer !== undefined ? q.correct_answer : q.correct || 0
      }));

      // Create quiz in database
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          note_id: noteId,
          user_id: note.user_id,
          questions
        })
        .select()
        .single();

      if (quizError) {
        console.error('Quiz insert error:', quizError);
        throw quizError;
      }

      // Update note with quiz_id
      await supabase
        .from('notes')
        .update({ quiz_id: quiz.id })
        .eq('id', noteId);

      return new Response(JSON.stringify({ quizId: quiz.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});