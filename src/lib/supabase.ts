import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ─── Type Definitions ─── */

export interface VibeUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  current_module: number;
  current_lesson: number;
  total_xp: number;
  streak_days: number;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface VibeModule {
  id: number;
  title: string;
  slug: string;
  description: string;
  icon: string;
  difficulty: 'zero' | 'beginner' | 'intermediate' | 'advanced' | 'pro';
  order_index: number;
  total_lessons: number;
  is_published: boolean;
}

export interface VibeLesson {
  id: number;
  module_id: number;
  title: string;
  slug: string;
  description: string;
  content: ContentBlock[];
  youtube_url: string | null;
  youtube_title: string | null;
  order_index: number;
  estimated_minutes: number;
  xp_reward: number;
  is_published: boolean;
}

export interface ContentBlock {
  type: 'text' | 'image' | 'callout' | 'code' | 'interactive_code' | 'drag_drop';
  content?: string;
  src?: string;
  alt?: string;
  caption?: string;
  variant?: 'tip' | 'info' | 'success' | 'warning';
  language?: string;
  /* interactive_code fields */
  editable?: boolean;
  expectedOutput?: string;
  /* drag_drop fields */
  dragMode?: 'order' | 'match';
  dragTitle?: string;
  dragInstruction?: string;
  dragItems?: { id: string; text: string; matchTarget?: string }[];
  dragTargets?: string[];
  dragXpReward?: number;
}

export interface VibeQuiz {
  id: number;
  lesson_id: number;
  quiz_type: 'lesson_quiz' | 'module_test';
  title: string;
  passing_score: number;
  xp_reward: number;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question: string;
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank';
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  order_index: number;
}

export interface UserProgress {
  id: number;
  user_id: string;
  lesson_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
}

export interface QuizAttempt {
  id: number;
  user_id: string;
  quiz_id: number;
  score: number;
  answers: Record<string, string>;
  passed: boolean;
  xp_earned: number;
  attempted_at: string;
}

/* ─── Data Fetching Helpers ─── */

export async function getModules(): Promise<VibeModule[]> {
  const { data, error } = await supabase
    .from('vibe_modules')
    .select('*')
    .eq('is_published', true)
    .order('order_index');
  if (error) throw error;
  return data || [];
}

export async function getModuleBySlug(slug: string): Promise<VibeModule | null> {
  const { data, error } = await supabase
    .from('vibe_modules')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

export async function getLessonsByModule(moduleId: number): Promise<VibeLesson[]> {
  const { data, error } = await supabase
    .from('vibe_lessons')
    .select('*')
    .eq('module_id', moduleId)
    .eq('is_published', true)
    .order('order_index');
  if (error) throw error;
  return data || [];
}

export async function getLessonBySlug(slug: string): Promise<VibeLesson | null> {
  const { data, error } = await supabase
    .from('vibe_lessons')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

export async function getQuizForLesson(lessonId: number): Promise<VibeQuiz | null> {
  const { data, error } = await supabase
    .from('vibe_quizzes')
    .select('*')
    .eq('lesson_id', lessonId)
    .single();
  if (error) return null;
  return data;
}

export async function getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('vibe_quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order_index');
  if (error) throw error;
  return data || [];
}

export async function getOrCreateUser(email: string): Promise<VibeUser> {
  // Try to find existing user
  const { data: existing } = await supabase
    .from('vibe_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    // Update last active
    await supabase
      .from('vibe_users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing;
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('vibe_users')
    .insert({ email: email.toLowerCase(), display_name: email.split('@')[0] })
    .select()
    .single();

  if (error) throw error;
  return newUser;
}

export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const { data, error } = await supabase
    .from('vibe_user_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function updateUserXP(userId: string, newXP: number): Promise<void> {
  const { error } = await supabase
    .from('vibe_users')
    .update({ total_xp: newXP })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateLessonProgress(
  userId: string,
  lessonId: number,
  status: 'in_progress' | 'completed'
): Promise<void> {
  // Don't downgrade completed → in_progress
  if (status === 'in_progress') {
    const { data: existing } = await supabase
      .from('vibe_user_progress')
      .select('status')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (existing?.status === 'completed') return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('vibe_user_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status,
        started_at: now,
        ...(status === 'completed' ? { completed_at: now } : {}),
      },
      { onConflict: 'user_id,lesson_id' }
    );
  if (error) throw error;
}

/**
 * After completing a lesson, check whether every lesson in the
 * user's current module is now completed.  If so, advance
 * `current_module` by one so the next module unlocks.
 *
 * This is intentionally idempotent — calling it multiple times
 * for the same module will not over-advance.
 */
export async function advanceUserModule(userId: string): Promise<boolean> {
  /* 1 — Fetch the user's current module index */
  const { data: user } = await supabase
    .from('vibe_users')
    .select('current_module')
    .eq('id', userId)
    .single();
  if (!user) return false;

  /* 2 — Find the module at this 1-based order_index */
  const { data: mod } = await supabase
    .from('vibe_modules')
    .select('id, total_lessons')
    .eq('order_index', user.current_module)
    .eq('is_published', true)
    .single();
  if (!mod) return false;

  /* 3 — Count completed lessons for this module */
  const { data: lessons } = await supabase
    .from('vibe_lessons')
    .select('id')
    .eq('module_id', mod.id)
    .eq('is_published', true);
  if (!lessons || lessons.length === 0) return false;

  const lessonIds = lessons.map((l) => l.id);
  const { count } = await supabase
    .from('vibe_user_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('lesson_id', lessonIds);

  /* 4 — If all lessons completed → advance */
  if ((count ?? 0) >= lessons.length) {
    await supabase
      .from('vibe_users')
      .update({ current_module: user.current_module + 1 })
      .eq('id', userId);
    return true;
  }

  return false;
}

export async function submitQuizAttempt(
  userId: string,
  quizId: number,
  score: number,
  answers: Record<string, string>,
  passed: boolean,
  xpEarned: number
): Promise<QuizAttempt> {
  const { data, error } = await supabase
    .from('vibe_quiz_attempts')
    .insert({
      user_id: userId,
      quiz_id: quizId,
      score,
      answers,
      passed,
      xp_earned: xpEarned,
    })
    .select()
    .single();

  if (error) throw error;

  // Update user XP
  if (passed) {
    const { data: user } = await supabase
      .from('vibe_users')
      .select('total_xp')
      .eq('id', userId)
      .single();

    if (user) {
      await supabase
        .from('vibe_users')
        .update({ total_xp: user.total_xp + xpEarned })
        .eq('id', userId);
    }
  }

  return data;
}
