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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      about_content: {
        Row: {
          bio: string | null
          created_at: string
          headline: string | null
          headshot_url: string | null
          id: string
          location: string | null
          singleton: boolean
          socials: Json
          tagline: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          headline?: string | null
          headshot_url?: string | null
          id?: string
          location?: string | null
          singleton?: boolean
          socials?: Json
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          headline?: string | null
          headshot_url?: string | null
          id?: string
          location?: string | null
          singleton?: boolean
          socials?: Json
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["content_kind"]
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["content_kind"]
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["content_kind"]
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_entries: {
        Row: {
          body: string | null
          collection_id: string
          cover_url: string | null
          created_at: string
          entry_date: string
          id: string
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          collection_id: string
          cover_url?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          collection_id?: string
          cover_url?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_entries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_entry_media: {
        Row: {
          caption: string | null
          created_at: string
          entry_id: string
          id: string
          kind: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          entry_id: string
          id?: string
          kind: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          kind?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_entry_media_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "collection_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          created_at: string
          id: string
          image_url: string
          label: string
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          label: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          label?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          content_id: string
          content_type: Database["public"]["Enums"]["content_kind"]
          created_at: string
          id: string
          parent_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          content_id: string
          content_type: Database["public"]["Enums"]["content_kind"]
          created_at?: string
          id?: string
          parent_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          content_id?: string
          content_type?: Database["public"]["Enums"]["content_kind"]
          created_at?: string
          id?: string
          parent_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      dear_today: {
        Row: {
          author_id: string | null
          body: string | null
          chapter_number: number | null
          chapter_title: string | null
          collection_id: string | null
          cover_url: string | null
          created_at: string
          entry_date: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          season_id: string | null
          slug: string
          title: string
          updated_at: string
          volume_id: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          chapter_number?: number | null
          chapter_title?: string | null
          collection_id?: string | null
          cover_url?: string | null
          created_at?: string
          entry_date?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          season_id?: string | null
          slug: string
          title: string
          updated_at?: string
          volume_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          chapter_number?: number | null
          chapter_title?: string | null
          collection_id?: string | null
          cover_url?: string | null
          created_at?: string
          entry_date?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          season_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          volume_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dear_today_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dear_today_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dear_today_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          body: string | null
          chapter_number: number | null
          chapter_title: string | null
          collection_id: string | null
          cover_image_url: string | null
          created_at: string
          entry_date: string
          id: string
          location: string | null
          part_number: number | null
          part_title: string | null
          published: boolean
          season_id: string | null
          slug: string
          title: string
          updated_at: string
          volume_id: string | null
        }
        Insert: {
          body?: string | null
          chapter_number?: number | null
          chapter_title?: string | null
          collection_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          location?: string | null
          part_number?: number | null
          part_title?: string | null
          published?: boolean
          season_id?: string | null
          slug: string
          title: string
          updated_at?: string
          volume_id?: string | null
        }
        Update: {
          body?: string | null
          chapter_number?: number | null
          chapter_title?: string | null
          collection_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          location?: string | null
          part_number?: number | null
          part_title?: string | null
          published?: boolean
          season_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          volume_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      footprints: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          media_url: string | null
          occurred_on: string | null
          published: boolean
          role_or_outlet: string | null
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          media_url?: string | null
          occurred_on?: string | null
          published?: boolean
          role_or_outlet?: string | null
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          media_url?: string | null
          occurred_on?: string | null
          published?: boolean
          role_or_outlet?: string | null
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          published: boolean
          sort_order: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          published?: boolean
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          published?: boolean
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      hero_images: {
        Row: {
          alt: string
          created_at: string
          id: string
          image_url: string
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt?: string
          created_at?: string
          id?: string
          image_url: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          image_url?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string | null
          confirm_token_expires_at: string | null
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          source: string | null
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["content_kind"]
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["content_kind"]
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["content_kind"]
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          volume_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          volume_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          volume_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          default_theme: string
          id: string
          updated_at: string
        }
        Insert: {
          default_theme?: string
          id?: string
          updated_at?: string
        }
        Update: {
          default_theme?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          buy_url: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          price_cents: number
          published: boolean
          slug: string
          sort_order: number
          stock: number | null
          title: string
          updated_at: string
        }
        Insert: {
          buy_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price_cents?: number
          published?: boolean
          slug: string
          sort_order?: number
          stock?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          buy_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price_cents?: number
          published?: boolean
          slug?: string
          sort_order?: number
          stock?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      show_stream_keys: {
        Row: {
          created_at: string
          id: string
          ingest_url: string
          mux_live_stream_id: string | null
          rotated_at: string
          show_id: string
          stream_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingest_url?: string
          mux_live_stream_id?: string | null
          rotated_at?: string
          show_id: string
          stream_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingest_url?: string
          mux_live_stream_id?: string | null
          rotated_at?: string
          show_id?: string
          stream_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_stream_keys_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: true
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          broadcast_kind: string
          broadcast_source_url: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          playback_url: string | null
          published: boolean
          recording_url: string | null
          scheduled_at: string | null
          slug: string
          sort_order: number
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          broadcast_kind?: string
          broadcast_source_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          playback_url?: string | null
          published?: boolean
          recording_url?: string | null
          scheduled_at?: string | null
          slug: string
          sort_order?: number
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          broadcast_kind?: string
          broadcast_source_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          playback_url?: string | null
          published?: boolean
          recording_url?: string | null
          scheduled_at?: string | null
          slug?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          body: string | null
          chapter_number: number | null
          chapter_title: string | null
          collection_id: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          part_number: number | null
          part_title: string | null
          published: boolean
          published_at: string | null
          season_id: string | null
          slug: string
          title: string
          updated_at: string
          volume_id: string | null
        }
        Insert: {
          body?: string | null
          chapter_number?: number | null
          chapter_title?: string | null
          collection_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          part_number?: number | null
          part_title?: string | null
          published?: boolean
          published_at?: string | null
          season_id?: string | null
          slug: string
          title: string
          updated_at?: string
          volume_id?: string | null
        }
        Update: {
          body?: string | null
          chapter_number?: number | null
          chapter_title?: string | null
          collection_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          part_number?: number | null
          part_title?: string | null
          published?: boolean
          published_at?: string | null
          season_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          volume_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volumes: {
        Row: {
          collection_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volumes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_newsletter_subscriber: {
        Args: {
          p_token: string
        }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      unsubscribe_newsletter_subscriber: {
        Args: {
          p_token: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "moderator" | "guest_author" | "reader"
      content_kind:
        | "story"
        | "diary"
        | "collection_item"
        | "gallery"
        | "dear_today"
        | "footprint"
        | "collection_entry"
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
      app_role: ["admin", "editor", "moderator", "guest_author", "reader"],
      content_kind: [
        "story",
        "diary",
        "collection_item",
        "gallery",
        "dear_today",
        "footprint",
        "collection_entry",
      ],
    },
  },
} as const
