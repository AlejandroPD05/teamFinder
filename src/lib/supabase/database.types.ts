
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "game_characters": {
                  Row: {
                    "active": boolean,"game_id": string,"id": string,"name": string,"role_id": string | null,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"game_id": string,"id"?: string,"name": string,"role_id"?: string | null,"slug": string
                  }
                  Update: {
                    "active"?: boolean,"game_id"?: string,"id"?: string,"name"?: string,"role_id"?: string | null,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_characters_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_characters_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "game_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_modes": {
                  Row: {
                    "active": boolean,"game_id": string,"id": string,"name": string,"party_size": number,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"game_id": string,"id"?: string,"name": string,"party_size": number,"slug": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"game_id"?: string,"id"?: string,"name"?: string,"party_size"?: number,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_modes_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"game_profiles": {
                  Row: {
                    "created_at": string,"flex": boolean,"game_id": string,"mode_slugs": (string)[],"rank_id": string | null,"rank_source": string,"region_id": string | null,"updated_at": string,"user_id": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"flex"?: boolean,"game_id": string,"mode_slugs"?: (string)[],"rank_id"?: string | null,"rank_source"?: string,"region_id"?: string | null,"updated_at"?: string,"user_id": string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "created_at"?: string,"flex"?: boolean,"game_id"?: string,"mode_slugs"?: (string)[],"rank_id"?: string | null,"rank_source"?: string,"region_id"?: string | null,"updated_at"?: string,"user_id"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_profiles_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_rank_id_fkey"
      columns: ["rank_id"]
isOneToOne: false
      referencedRelation: "game_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "game_regions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_ranks": {
                  Row: {
                    "active": boolean,"game_id": string,"id": string,"name": string,"slug": string,"tier": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"game_id": string,"id"?: string,"name": string,"slug": string,"tier": number
                  }
                  Update: {
                    "active"?: boolean,"game_id"?: string,"id"?: string,"name"?: string,"slug"?: string,"tier"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_ranks_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"game_regions": {
                  Row: {
                    "active": boolean,"game_id": string,"id": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"game_id": string,"id"?: string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"game_id"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_regions_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"game_roles": {
                  Row: {
                    "active": boolean,"game_id": string,"id": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"game_id": string,"id"?: string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"game_id"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_roles_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "active": boolean,"id": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id": string,"name": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"id"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"player_characters": {
                  Row: {
                    "character_id": string,"game_id": string,"status": Database["public"]['Enums']["character_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "character_id": string,"game_id": string,"status": Database["public"]['Enums']["character_status"],"user_id": string
                  }
                  Update: {
                    "character_id"?: string,"game_id"?: string,"status"?: Database["public"]['Enums']["character_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_characters_character_id_fkey"
      columns: ["character_id"]
isOneToOne: false
      referencedRelation: "game_characters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_characters_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profile_cards"
      referencedColumns: ["user_id","game_id"]
    },{
      foreignKeyName: "player_characters_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profiles"
      referencedColumns: ["user_id","game_id"]
    }
                  ]
                },"player_roles": {
                  Row: {
                    "game_id": string,"is_primary": boolean,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game_id": string,"is_primary"?: boolean,"role_id": string,"user_id": string
                  }
                  Update: {
                    "game_id"?: string,"is_primary"?: boolean,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "player_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "game_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_roles_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profile_cards"
      referencedColumns: ["user_id","game_id"]
    },{
      foreignKeyName: "player_roles_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profiles"
      referencedColumns: ["user_id","game_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "availability": (string)[],"availability_visibility": Database["public"]['Enums']["visibility"],"avatar_url": string | null,"created_at": string,"display_name": string,"goals": (string)[],"goals_visibility": Database["public"]['Enums']["visibility"],"id": string,"languages": (string)[],"languages_visibility": Database["public"]['Enums']["visibility"],"updated_at": string,"voice": string | null,"voice_visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: (string)[],"availability_visibility"?: Database["public"]['Enums']["visibility"],"avatar_url"?: string | null,"created_at"?: string,"display_name": string,"goals"?: (string)[],"goals_visibility"?: Database["public"]['Enums']["visibility"],"id": string,"languages"?: (string)[],"languages_visibility"?: Database["public"]['Enums']["visibility"],"updated_at"?: string,"voice"?: string | null,"voice_visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "availability"?: (string)[],"availability_visibility"?: Database["public"]['Enums']["visibility"],"avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"goals"?: (string)[],"goals_visibility"?: Database["public"]['Enums']["visibility"],"id"?: string,"languages"?: (string)[],"languages_visibility"?: Database["public"]['Enums']["visibility"],"updated_at"?: string,"voice"?: string | null,"voice_visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "game_profile_cards": {
                  Row: {
                    "flex": boolean,"game_id": string,"mode_slugs": (string)[],"rank_id": string | null,"rank_source": string,"region_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "flex"?: boolean | null,"game_id"?: string | null,"mode_slugs"?: (string)[] | null,"rank_id"?: string | null,"rank_source"?: string | null,"region_id"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                         }
                        Update: {
                           "flex"?: boolean | null,"game_id"?: string | null,"mode_slugs"?: (string)[] | null,"rank_id"?: string | null,"rank_source"?: string | null,"region_id"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "game_profiles_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_rank_id_fkey"
      columns: ["rank_id"]
isOneToOne: false
      referencedRelation: "game_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "game_regions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "game_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"player_character_cards": {
                  Row: {
                    "character_id": string,"game_id": string,"status": Database["public"]['Enums']["character_status"],"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "player_characters_character_id_fkey"
      columns: ["character_id"]
isOneToOne: false
      referencedRelation: "game_characters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_characters_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profile_cards"
      referencedColumns: ["user_id","game_id"]
    },{
      foreignKeyName: "player_characters_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profiles"
      referencedColumns: ["user_id","game_id"]
    }
                  ]
                },"player_role_cards": {
                  Row: {
                    "game_id": string,"is_primary": boolean,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "player_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "game_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "player_roles_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profile_cards"
      referencedColumns: ["user_id","game_id"]
    },{
      foreignKeyName: "player_roles_user_id_game_id_fkey"
      columns: ["user_id","game_id"]
isOneToOne: false
      referencedRelation: "game_profiles"
      referencedColumns: ["user_id","game_id"]
    }
                  ]
                },"player_search": {
                  Row: {
                    "availability": (string)[] | null,"avatar_url": string | null,"char_keys": (string)[] | null,"character_ids": (string)[] | null,"display_name": string,"flex": boolean,"game_id": string,"goals": (string)[] | null,"languages": (string)[] | null,"mode_slugs": (string)[],"primary_role_id": string | null,"rank_id": string | null,"rank_source": string,"rank_tier": number | null,"region_id": string | null,"role_ids": (string)[] | null,"updated_at": string | null,"user_id": string,"voice": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "game_profiles_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_rank_id_fkey"
      columns: ["rank_id"]
isOneToOne: false
      referencedRelation: "game_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_profiles_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "game_regions"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_cards": {
                  Row: {
                    "availability": (string)[] | null,"avatar_url": string | null,"created_at": string,"display_name": string,"goals": (string)[] | null,"id": string,"languages": (string)[] | null,"voice": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "availability"?: never,"avatar_url"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"goals"?: never,"id"?: string | null,"languages"?: never,"voice"?: never
                         }
                        Update: {
                           "availability"?: never,"avatar_url"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"goals"?: never,"id"?: string | null,"languages"?: never,"voice"?: never
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "can_see":
{ Args: { "owner": string,"v": Database["public"]['Enums']["visibility"] }; Returns: boolean
                           },
"save_game_profile":
{ Args: { "p_characters": Json,"p_flex": boolean,"p_game_id": string,"p_modes"?: (string)[],"p_rank_id": string,"p_region_id": string,"p_roles": Json,"p_visibility": Database["public"]['Enums']["visibility"] }; Returns: undefined
                           }
          }
          Enums: {
            "character_status": "main"|"comfort"|"playable"|"flexible","visibility": "public"|"registered"|"private"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "character_status": ["main", "comfort", "playable", "flexible"],"visibility": ["public", "registered", "private"]
          }
        }
} as const
