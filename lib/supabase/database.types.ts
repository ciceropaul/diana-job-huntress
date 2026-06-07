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
      applications: {
        Row: {
          applied_at: string | null
          created_at: string | null
          id: string
          job_listing_id: string
          notes: string | null
          profile_id: string
          status: string | null
          status_updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          id?: string
          job_listing_id: string
          notes?: string | null
          profile_id: string
          status?: string | null
          status_updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          id?: string
          job_listing_id?: string
          notes?: string | null
          profile_id?: string
          status?: string | null
          status_updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_listing_id_fkey"
            columns: ["job_listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letters: {
        Row: {
          content: string
          created_at: string | null
          id: string
          job_listing_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          job_listing_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          job_listing_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_job_listing_id_fkey"
            columns: ["job_listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      exemplars: {
        Row: {
          company: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          profile_id: string
          source_url: string | null
          title: string
          user_id: string
          why_great: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          profile_id: string
          source_url?: string | null
          title: string
          user_id: string
          why_great?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          profile_id?: string
          source_url?: string | null
          title?: string
          user_id?: string
          why_great?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exemplars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listings: {
        Row: {
          company: string
          date_found: string | null
          date_posted: string | null
          description: string | null
          id: string
          location: string | null
          profile_id: string
          raw_html: string | null
          source: string | null
          source_url: string
          title: string
          user_id: string
        }
        Insert: {
          company: string
          date_found?: string | null
          date_posted?: string | null
          description?: string | null
          id?: string
          location?: string | null
          profile_id: string
          raw_html?: string | null
          source?: string | null
          source_url: string
          title: string
          user_id: string
        }
        Update: {
          company?: string
          date_found?: string | null
          date_posted?: string | null
          description?: string | null
          id?: string
          location?: string | null
          profile_id?: string
          raw_html?: string | null
          source?: string | null
          source_url?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_scores: {
        Row: {
          dimensions: Json | null
          fit_summary: string | null
          gaps: string[] | null
          id: string
          job_listing_id: string
          matched_skills: string[] | null
          overall: number
          reasoning: string | null
          scored_at: string | null
        }
        Insert: {
          dimensions?: Json | null
          fit_summary?: string | null
          gaps?: string[] | null
          id?: string
          job_listing_id: string
          matched_skills?: string[] | null
          overall: number
          reasoning?: string | null
          scored_at?: string | null
        }
        Update: {
          dimensions?: Json | null
          fit_summary?: string | null
          gaps?: string[] | null
          id?: string
          job_listing_id?: string
          matched_skills?: string[] | null
          overall?: number
          reasoning?: string | null
          scored_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_scores_job_listing_id_fkey"
            columns: ["job_listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          deal_breakers: string[] | null
          experience: Json | null
          green_flags: string[]
          id: string
          location: string | null
          name: string | null
          portfolio_links: Json | null
          positioning_statement: string | null
          preferences: Json | null
          skills: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          deal_breakers?: string[] | null
          experience?: Json | null
          green_flags?: string[]
          id?: string
          location?: string | null
          name?: string | null
          portfolio_links?: Json | null
          positioning_statement?: string | null
          preferences?: Json | null
          skills?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          deal_breakers?: string[] | null
          experience?: Json | null
          green_flags?: string[]
          id?: string
          location?: string | null
          name?: string | null
          portfolio_links?: Json | null
          positioning_statement?: string | null
          preferences?: Json | null
          skills?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scan_logs: {
        Row: {
          completed_at: string | null
          email_sent: boolean | null
          error: string | null
          id: string
          jobs_above_threshold: number | null
          jobs_found: number | null
          jobs_scored: number | null
          profile_id: string
          started_at: string | null
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          email_sent?: boolean | null
          error?: string | null
          id?: string
          jobs_above_threshold?: number | null
          jobs_found?: number | null
          jobs_scored?: number | null
          profile_id: string
          started_at?: string | null
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          email_sent?: boolean | null
          error?: string | null
          id?: string
          jobs_above_threshold?: number | null
          jobs_found?: number | null
          jobs_scored?: number | null
          profile_id?: string
          started_at?: string | null
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          digest_enabled: boolean | null
          digest_min_score: number | null
          digest_recipient: string | null
          id: string
          profile_id: string
          scan_sources: Json | null
          scan_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          digest_enabled?: boolean | null
          digest_min_score?: number | null
          digest_recipient?: string | null
          id?: string
          profile_id: string
          scan_sources?: Json | null
          scan_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          digest_enabled?: boolean | null
          digest_min_score?: number | null
          digest_recipient?: string | null
          id?: string
          profile_id?: string
          scan_sources?: Json | null
          scan_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      target_companies: {
        Row: {
          careers_url: string | null
          created_at: string | null
          has_open_role: boolean | null
          id: string
          name: string
          notes: string | null
          profile_id: string
          sector: string | null
          suppressed: boolean | null
          tags: string[] | null
          tier: number | null
          user_id: string
        }
        Insert: {
          careers_url?: string | null
          created_at?: string | null
          has_open_role?: boolean | null
          id?: string
          name: string
          notes?: string | null
          profile_id: string
          sector?: string | null
          suppressed?: boolean | null
          tags?: string[] | null
          tier?: number | null
          user_id: string
        }
        Update: {
          careers_url?: string | null
          created_at?: string | null
          has_open_role?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          profile_id?: string
          sector?: string | null
          suppressed?: boolean | null
          tags?: string[] | null
          tier?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_companies_profile_id_fkey"
            columns: ["profile_id"]
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
