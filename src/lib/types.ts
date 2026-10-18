// ============================================================
// TypeScript Types for the Educational Platform
// ============================================================

export type UserRole = 'admin' | 'instructor' | 'student';
export type ContentType = 'summary' | 'tip' | 'note' | 'video' | 'pdf';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: number;
  name: string;
  code: string;
  description: string | null;
  sort_order: number;
}

export interface Course {
  id: string;
  grade_id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // joined
  grades?: Grade;
}

export interface InstructorCourse {
  id: string;
  instructor_id: string;
  course_id: string;
  assigned_at: string;
  courses?: Course;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // joined
  contents?: Content[];
  quizzes?: Quiz[];
}

export interface Content {
  id: string;
  chapter_id: string;
  content_type: ContentType;
  title: string;
  body: string | null;
  media_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface QuizOption {
  key: string;  // "A", "B", "C", "D"
  text: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: QuizOption[];
  correct_answer: string;
  explanation: string | null;
  points: number;
  sort_order: number;
}

export interface Quiz {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  time_limit_min: number | null;
  pass_score: number;
  is_active: boolean;
  created_at: string;
  questions?: Question[];
}

export interface StudentQuizAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  answers: Record<string, string>;  // { question_id: selected_key }
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  submitted_at: string | null;
  time_taken_sec: number | null;
  quizzes?: Quiz;
}

// ============================================================
// Result types for Quiz submission
// ============================================================
export interface QuizResult {
  attempt_id: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  correct_count: number;
  wrong_count: number;
  questions_review: QuestionReview[];
}

export interface QuestionReview {
  question: Question;
  selected_answer: string | null;
  is_correct: boolean;
}
