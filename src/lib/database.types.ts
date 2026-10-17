// Auto-generated types scaffold for Supabase
// Run: supabase gen types typescript --local > src/lib/database.types.ts
// for production-grade types. This is a minimal scaffold.

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      grades: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      courses: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      instructor_courses: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      chapters: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      contents: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      quizzes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      questions: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      student_quiz_attempts: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      is_instructor_for_course: { Args: { course_uuid: string }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      get_user_role: { Args: Record<string, never>; Returns: string };
    };
  };
};
