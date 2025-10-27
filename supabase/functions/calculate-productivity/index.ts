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
    const { userId, date } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get notes count for the date
    const { count: notesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    // Get logs intensity total
    const { data: logs } = await supabase
      .from('logs')
      .select('intensity')
      .eq('user_id', userId)
      .eq('date', date);

    const logsIntensityTotal = logs?.reduce((sum, log) => sum + log.intensity, 0) || 0;

    // Get completed tasks
    const { count: tasksCompleted } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', ['completed', 'done'])
      .gte('completed_at', `${date}T00:00:00`)
      .lte('completed_at', `${date}T23:59:59`);

    // Get quiz results
    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('score, total_questions')
      .eq('user_id', userId)
      .gte('completed_at', `${date}T00:00:00`)
      .lte('completed_at', `${date}T23:59:59`);

    const quizScore = quizResults?.reduce((sum, result) => 
      sum + (result.score / result.total_questions) * 100, 0) || 0;

    // Calculate productivity score (formula: task=40%, notes=35%, logs=25%)
    const taskPoints = (tasksCompleted || 0) * 10;
    const notePoints = (notesCount || 0) * 8;
    const logPoints = logsIntensityTotal * 2;
    const quizPoints = quizScore * 0.5;

    const score = Math.min(100, Math.round(
      taskPoints * 0.4 + 
      notePoints * 0.35 + 
      logPoints * 0.25 + 
      quizPoints * 0.05
    ));

    // Calculate streak
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: yesterdayProd } = await supabase
      .from('productivity')
      .select('streak')
      .eq('user_id', userId)
      .eq('date', yesterdayStr)
      .single();

    let streak = 1;
    if (yesterdayProd && score >= 1) {
      streak = yesterdayProd.streak + 1;
    } else if (score < 1) {
      streak = 0;
    }

    // Upsert productivity record
    const { error: upsertError } = await supabase
      .from('productivity')
      .upsert({
        user_id: userId,
        date,
        score,
        streak,
        notes_count: notesCount || 0,
        logs_intensity_total: logsIntensityTotal,
        tasks_completed: tasksCompleted || 0,
        quiz_score: Math.round(quizScore)
      }, {
        onConflict: 'user_id,date'
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    // Check for rewards
    if (score >= 500 && streak === 5) {
      await supabase.from('rewards').insert({
        user_id: userId,
        type: 'badge',
        name: 'Bronze Scholar',
        description: 'Achieved 5 day streak with 500+ points'
      });
    }

    return new Response(JSON.stringify({ score, streak }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});