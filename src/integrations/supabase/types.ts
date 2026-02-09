export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed: boolean | null
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          item_id: string | null
          phase: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          item_id?: string | null
          phase?: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          item_id?: string | null
          phase?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string | null
          completed: boolean | null
          created_at: string
          deadline: string | null
          description: string | null
          duration: number | null
          google_id: string | null
          id: string
          importance: string | null
          notified: boolean | null
          parent_item_id: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          sort_order: number | null
          start_time: string | null
          synced: boolean | null
          time: string | null
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed?: boolean | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          duration?: number | null
          google_id?: string | null
          id?: string
          importance?: string | null
          notified?: boolean | null
          parent_item_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          sort_order?: number | null
          start_time?: string | null
          synced?: boolean | null
          time?: string | null
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed?: boolean | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          duration?: number | null
          google_id?: string | null
          id?: string
          importance?: string | null
          notified?: boolean | null
          parent_item_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          sort_order?: number | null
          start_time?: string | null
          synced?: boolean | null
          time?: string | null
          title?: string
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_daily_stats: {
        Row: {
          created_at: string
          date: string
          focus_minutes: number | null
          id: string
          most_productive_hour: number | null
          sessions_count: number | null
          streak_days: number | null
          tasks_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          focus_minutes?: number | null
          id?: string
          most_productive_hour?: number | null
          sessions_count?: number | null
          streak_days?: number | null
          tasks_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          focus_minutes?: number | null
          id?: string
          most_productive_hour?: number | null
          sessions_count?: number | null
          streak_days?: number | null
          tasks_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_daily_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          google_calendar_token: string | null
          google_calendar_token_expiry: string | null
          id: string
          notification_email_enabled: boolean | null
          notification_minutes_before: number | null
          notification_push_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_calendar_token?: string | null
          google_calendar_token_expiry?: string | null
          id: string
          notification_email_enabled?: boolean | null
          notification_minutes_before?: number | null
          notification_push_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_calendar_token?: string | null
          google_calendar_token_expiry?: string | null
          id?: string
          notification_email_enabled?: boolean | null
          notification_minutes_before?: number | null
          notification_push_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          item_id: string
          sort_order: number | null
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          item_id: string
          sort_order?: number | null
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          item_id?: string
          sort_order?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      item_type: "task" | "event" | "reminder"
      priority_level: "low" | "medium" | "high" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_type: ["task", "event", "reminder"],
      priority_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
