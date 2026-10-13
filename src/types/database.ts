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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      card_price_history: {
        Row: {
          captured_on: string
          eur: number | null
          eur_etched: number | null
          eur_foil: number | null
          source: Database["public"]["Enums"]["price_source"]
          tix: number | null
          usd: number | null
          usd_etched: number | null
          usd_foil: number | null
          version_id: string
        }
        Insert: {
          captured_on: string
          eur?: number | null
          eur_etched?: number | null
          eur_foil?: number | null
          source: Database["public"]["Enums"]["price_source"]
          tix?: number | null
          usd?: number | null
          usd_etched?: number | null
          usd_foil?: number | null
          version_id: string
        }
        Update: {
          captured_on?: string
          eur?: number | null
          eur_etched?: number | null
          eur_foil?: number | null
          source?: Database["public"]["Enums"]["price_source"]
          tix?: number | null
          usd?: number | null
          usd_etched?: number | null
          usd_foil?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_price_history_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "card_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      card_prices: {
        Row: {
          eur: number | null
          eur_etched: number | null
          eur_foil: number | null
          source: Database["public"]["Enums"]["price_source"]
          tix: number | null
          updated_at: string
          usd: number | null
          usd_etched: number | null
          usd_foil: number | null
          version_id: string
        }
        Insert: {
          eur?: number | null
          eur_etched?: number | null
          eur_foil?: number | null
          source?: Database["public"]["Enums"]["price_source"]
          tix?: number | null
          updated_at?: string
          usd?: number | null
          usd_etched?: number | null
          usd_foil?: number | null
          version_id: string
        }
        Update: {
          eur?: number | null
          eur_etched?: number | null
          eur_foil?: number | null
          source?: Database["public"]["Enums"]["price_source"]
          tix?: number | null
          updated_at?: string
          usd?: number | null
          usd_etched?: number | null
          usd_foil?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_prices_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "card_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      card_sync_runs: {
        Row: {
          bulk_type: string
          bulk_updated_at: string
          error: string | null
          finished_at: string | null
          id: string
          rows_read: number
          rows_upserted: number
          started_at: string
          status: string
        }
        Insert: {
          bulk_type: string
          bulk_updated_at: string
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_read?: number
          rows_upserted?: number
          started_at?: string
          status?: string
        }
        Update: {
          bulk_type?: string
          bulk_updated_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_read?: number
          rows_upserted?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      card_versions: {
        Row: {
          artist: string | null
          card_faces: Json | null
          card_id: string
          collector_number: string
          finishes: Database["public"]["Enums"]["card_finish"][]
          id: string
          image_uris: Json | null
          rarity: string
          set: string
          updated_at: string
        }
        Insert: {
          artist?: string | null
          card_faces?: Json | null
          card_id: string
          collector_number: string
          finishes?: Database["public"]["Enums"]["card_finish"][]
          id: string
          image_uris?: Json | null
          rarity?: string
          set: string
          updated_at?: string
        }
        Update: {
          artist?: string | null
          card_faces?: Json | null
          card_id?: string
          collector_number?: string
          finishes?: Database["public"]["Enums"]["card_finish"][]
          id?: string
          image_uris?: Json | null
          rarity?: string
          set?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_versions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          card_faces: Json | null
          cmc: number
          color_identity: string[]
          colors: string[] | null
          id: string
          layout: string
          legalities: Json
          loyalty: string | null
          mana_cost: string | null
          name: string
          power: string | null
          rules_text: string | null
          toughness: string | null
          type_line: string
          updated_at: string
        }
        Insert: {
          card_faces?: Json | null
          cmc?: number
          color_identity?: string[]
          colors?: string[] | null
          id: string
          layout?: string
          legalities?: Json
          loyalty?: string | null
          mana_cost?: string | null
          name: string
          power?: string | null
          rules_text?: string | null
          toughness?: string | null
          type_line: string
          updated_at?: string
        }
        Update: {
          card_faces?: Json | null
          cmc?: number
          color_identity?: string[]
          colors?: string[] | null
          id?: string
          layout?: string
          legalities?: Json
          loyalty?: string | null
          mana_cost?: string | null
          name?: string
          power?: string | null
          rules_text?: string | null
          toughness?: string | null
          type_line?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          card_id: string
          condition: Database["public"]["Enums"]["card_condition"]
          created_at: string
          finish: Database["public"]["Enums"]["card_finish"]
          id: string
          quantity: number
          updated_at: string
          user_id: string
          version_id: string
        }
        Insert: {
          card_id: string
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          finish?: Database["public"]["Enums"]["card_finish"]
          id?: string
          quantity: number
          updated_at?: string
          user_id?: string
          version_id: string
        }
        Update: {
          card_id?: string
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          finish?: Database["public"]["Enums"]["card_finish"]
          id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_version_fkey"
            columns: ["version_id", "card_id"]
            isOneToOne: false
            referencedRelation: "card_versions"
            referencedColumns: ["id", "card_id"]
          },
        ]
      }
      deck_cards: {
        Row: {
          card_id: string
          category: string
          deck_id: string
          is_commander: boolean
          quantity: number
        }
        Insert: {
          card_id: string
          category?: string
          deck_id: string
          is_commander?: boolean
          quantity?: number
        }
        Update: {
          card_id?: string
          category?: string
          deck_id?: string
          is_commander?: boolean
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "deck_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          bracket: number
          commander_card_id: string
          created_at: string
          id: string
          name: string
          owner_id: string
          partner_card_id: string | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          bracket?: number
          commander_card_id: string
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          partner_card_id?: string | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          bracket?: number
          commander_card_id?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          partner_card_id?: string | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_commander_card_id_fkey"
            columns: ["commander_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decks_partner_card_id_fkey"
            columns: ["partner_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      game_nights: {
        Row: {
          created_at: string
          created_by: string
          id: string
          location: string | null
          notes: string | null
          playgroup_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          notes?: string | null
          playgroup_id: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          notes?: string | null
          playgroup_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_nights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_nights_playgroup_id_fkey"
            columns: ["playgroup_id"]
            isOneToOne: false
            referencedRelation: "playgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number | null
          game_night_id: string | null
          id: string
          played_at: string
          player_count: number
          playgroup_id: string
          updated_at: string
          winner_commander_card_id: string | null
          winner_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          game_night_id?: string | null
          id?: string
          played_at?: string
          player_count?: number
          playgroup_id: string
          updated_at?: string
          winner_commander_card_id?: string | null
          winner_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          game_night_id?: string | null
          id?: string
          played_at?: string
          player_count?: number
          playgroup_id?: string
          updated_at?: string
          winner_commander_card_id?: string | null
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_game_night_fkey"
            columns: ["game_night_id", "playgroup_id"]
            isOneToOne: false
            referencedRelation: "game_nights"
            referencedColumns: ["id", "playgroup_id"]
          },
          {
            foreignKeyName: "games_playgroup_id_fkey"
            columns: ["playgroup_id"]
            isOneToOne: false
            referencedRelation: "playgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_commander_card_id_fkey"
            columns: ["winner_commander_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_requests: {
        Row: {
          card_id: string
          created_at: string
          id: string
          note: string | null
          owner_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          note?: string | null
          owner_id: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          note?: string | null
          owner_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_requests_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playgroup_members: {
        Row: {
          joined_at: string
          playgroup_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          playgroup_id: string
          role?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          playgroup_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playgroup_members_playgroup_id_fkey"
            columns: ["playgroup_id"]
            isOneToOne: false
            referencedRelation: "playgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playgroup_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playgroups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playgroups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          display_name: string
          id: string
          initials: string
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          display_name: string
          id: string
          initials: string
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          display_name?: string
          id?: string
          initials?: string
          updated_at?: string
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          game_night_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          game_night_id: string
          status: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          game_night_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_game_night_id_fkey"
            columns: ["game_night_id"]
            isOneToOne: false
            referencedRelation: "game_nights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      collection_item_prices: {
        Row: {
          card_id: string | null
          condition: Database["public"]["Enums"]["card_condition"] | null
          finish: Database["public"]["Enums"]["card_finish"] | null
          id: string | null
          prices_updated_at: string | null
          quantity: number | null
          unit_eur: number | null
          unit_usd: number | null
          user_id: string | null
          version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_version_fkey"
            columns: ["version_id", "card_id"]
            isOneToOne: false
            referencedRelation: "card_versions"
            referencedColumns: ["id", "card_id"]
          },
        ]
      }
    }
    Functions: {
      compact_card_price_history: {
        Args: { keep_daily_days?: number }
        Returns: number
      }
      create_playgroup: {
        Args: { group_name: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "playgroups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      join_playgroup: {
        Args: { code: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "playgroups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      snapshot_card_prices: { Args: never; Returns: number }
      sync_card_batch: {
        Args: { card_rows: Json; price_rows: Json; version_rows: Json }
        Returns: number
      }
    }
    Enums: {
      card_condition: "M" | "NM" | "EX" | "GD" | "LP" | "PL" | "PO"
      card_finish: "nonfoil" | "foil" | "etched"
      price_source: "scryfall"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      card_condition: ["M", "NM", "EX", "GD", "LP", "PL", "PO"],
      card_finish: ["nonfoil", "foil", "etched"],
      price_source: ["scryfall"],
    },
  },
} as const
