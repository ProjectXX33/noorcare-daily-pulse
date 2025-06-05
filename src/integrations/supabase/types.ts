export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_performance_dashboard: {
        Row: {
          average_performance_score: number | null
          created_at: string | null
          employee_id: string | null
          employee_name: string
          id: string
          month_year: string
          performance_status: string | null
          punctuality_percentage: number | null
          total_delay_hours: number | null
          total_delay_minutes: number | null
          total_overtime_hours: number | null
          total_working_days: number | null
          updated_at: string | null
        }
        Insert: {
          average_performance_score?: number | null
          created_at?: string | null
          employee_id?: string | null
          employee_name: string
          id?: string
          month_year: string
          performance_status?: string | null
          punctuality_percentage?: number | null
          total_delay_hours?: number | null
          total_delay_minutes?: number | null
          total_overtime_hours?: number | null
          total_working_days?: number | null
          updated_at?: string | null
        }
        Update: {
          average_performance_score?: number | null
          created_at?: string | null
          employee_id?: string | null
          employee_name?: string
          id?: string
          month_year?: string
          performance_status?: string | null
          punctuality_percentage?: number | null
          total_delay_hours?: number | null
          total_delay_minutes?: number | null
          total_overtime_hours?: number | null
          total_working_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_performance_dashboard_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          checkout_time: string | null
          created_at: string | null
          id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          checkout_time?: string | null
          created_at?: string | null
          id?: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          checkout_time?: string | null
          created_at?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_performance_summary: {
        Row: {
          average_performance_score: number | null
          created_at: string | null
          employee_id: string
          id: string
          month_year: string
          punctuality_percentage: number | null
          rank_position: number | null
          total_days_off: number | null
          total_delay_minutes: number | null
          total_early_minutes: number | null
          total_overtime_hours: number | null
          total_regular_hours: number | null
          total_working_days: number | null
          updated_at: string | null
        }
        Insert: {
          average_performance_score?: number | null
          created_at?: string | null
          employee_id: string
          id?: string
          month_year: string
          punctuality_percentage?: number | null
          rank_position?: number | null
          total_days_off?: number | null
          total_delay_minutes?: number | null
          total_early_minutes?: number | null
          total_overtime_hours?: number | null
          total_regular_hours?: number | null
          total_working_days?: number | null
          updated_at?: string | null
        }
        Update: {
          average_performance_score?: number | null
          created_at?: string | null
          employee_id?: string
          id?: string
          month_year?: string
          punctuality_percentage?: number | null
          rank_position?: number | null
          total_days_off?: number | null
          total_delay_minutes?: number | null
          total_early_minutes?: number | null
          total_overtime_hours?: number | null
          total_regular_hours?: number | null
          total_working_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_performance_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          employee_id: string
          id: string
          rated_at: string | null
          rated_by: string
          rating: number
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          rated_at?: string | null
          rated_by: string
          rating: number
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          rated_at?: string | null
          rated_by?: string
          rating?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          work_report_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          work_report_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          work_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_work_report_id_fkey"
            columns: ["work_report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_shifts: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          id: string
          overtime_hours: number | null
          regular_hours: number | null
          shift_id: string
          updated_at: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          overtime_hours?: number | null
          regular_hours?: number | null
          shift_id: string
          updated_at?: string | null
          user_id: string
          work_date: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          overtime_hours?: number | null
          regular_hours?: number | null
          shift_id?: string
          updated_at?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_shifts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          related_to: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          related_to?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          related_to?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_tracking: {
        Row: {
          actual_check_in_time: string | null
          actual_check_out_time: string | null
          created_at: string | null
          delay_minutes: number | null
          employee_id: string
          id: string
          overtime_hours: number | null
          performance_score: number | null
          regular_hours: number | null
          scheduled_start_time: string
          shift_id: string | null
          total_work_minutes: number | null
          updated_at: string | null
          work_date: string
        }
        Insert: {
          actual_check_in_time?: string | null
          actual_check_out_time?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          employee_id: string
          id?: string
          overtime_hours?: number | null
          performance_score?: number | null
          regular_hours?: number | null
          scheduled_start_time: string
          shift_id?: string | null
          total_work_minutes?: number | null
          updated_at?: string | null
          work_date: string
        }
        Update: {
          actual_check_in_time?: string | null
          actual_check_out_time?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          employee_id?: string
          id?: string
          overtime_hours?: number | null
          performance_score?: number | null
          regular_hours?: number | null
          scheduled_start_time?: string
          shift_id?: string | null
          total_work_minutes?: number | null
          updated_at?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_tracking_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_tracking_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          assigned_by: string
          assigned_shift_id: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_day_off: boolean | null
          updated_at: string | null
          work_date: string
        }
        Insert: {
          assigned_by: string
          assigned_shift_id?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_day_off?: boolean | null
          updated_at?: string | null
          work_date: string
        }
        Update: {
          assigned_by?: string
          assigned_shift_id?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_day_off?: boolean | null
          updated_at?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_assigned_shift_id_fkey"
            columns: ["assigned_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          position: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          position: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          position?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rated_at: string | null
          rated_by: string
          rating: number
          task_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_at?: string | null
          rated_by: string
          rating: number
          task_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_at?: string | null
          rated_by?: string
          rating?: number
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_ratings_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_ratings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          comments: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          progress_percentage: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to: string
          comments?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          progress_percentage?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string
          comments?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          progress_percentage?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          department: string
          email: string
          id: string
          last_checkin: string | null
          last_seen: string | null
          name: string
          position: string
          preferences: Json | null
          role: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          department: string
          email: string
          id: string
          last_checkin?: string | null
          last_seen?: string | null
          name: string
          position: string
          preferences?: Json | null
          role: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string
          id?: string
          last_checkin?: string | null
          last_seen?: string | null
          name?: string
          position?: string
          preferences?: Json | null
          role?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      weekly_shift_assignments: {
        Row: {
          assigned_by: string
          created_at: string | null
          employee_id: string
          id: string
          shift_type: string
          updated_at: string | null
          week_start: string
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          employee_id: string
          id?: string
          shift_type: string
          updated_at?: string | null
          week_start: string
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          shift_type?: string
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_shift_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_reports: {
        Row: {
          created_at: string | null
          date: string
          department: string | null
          id: string
          issues_faced: string | null
          plans_for_tomorrow: string
          position: string | null
          tasks_done: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          department?: string | null
          id?: string
          issues_faced?: string | null
          plans_for_tomorrow: string
          position?: string | null
          tasks_done: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          department?: string | null
          id?: string
          issues_faced?: string | null
          plans_for_tomorrow?: string
          position?: string | null
          tasks_done?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_time_config: {
        Row: {
          created_at: string | null
          daily_reset_time: string
          id: string
          name: string
          updated_at: string | null
          work_day_end: string
          work_day_start: string
        }
        Insert: {
          created_at?: string | null
          daily_reset_time?: string
          id?: string
          name: string
          updated_at?: string | null
          work_day_end?: string
          work_day_start?: string
        }
        Update: {
          created_at?: string | null
          daily_reset_time?: string
          id?: string
          name?: string
          updated_at?: string | null
          work_day_end?: string
          work_day_start?: string
        }
        Relationships: []
      }
      workspace_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          updated_at: string | null
          user_id: string
          user_name: string
          user_position: string
          user_role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          updated_at?: string | null
          user_id: string
          user_name: string
          user_position: string
          user_role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          updated_at?: string | null
          user_id?: string
          user_name?: string
          user_position?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_performance_score: {
        Args:
          | { delay_minutes: number }
          | { delay_minutes: number; working_days: number }
        Returns: number
      }
      get_employee_average_rating: {
        Args: { employee_uuid: string }
        Returns: number
      }
      get_latest_employee_rating: {
        Args: { employee_uuid: string }
        Returns: {
          rating: number
          comment: string
          rated_by_name: string
          rated_at: string
        }[]
      }
      get_latest_task_rating: {
        Args: { task_uuid: string }
        Returns: {
          rating: number
          comment: string
          rated_by_name: string
          rated_at: string
        }[]
      }
      get_task_average_rating: {
        Args: { task_uuid: string }
        Returns: number
      }
      update_performance_summary: {
        Args: { emp_id: string; work_month: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
