
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
            "app_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_admins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "app_admins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "app_admins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_characters": {
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
                },"karma_votes": {
                  Row: {
                    "created_at": string,"lobby_id": string,"tags": (string)[],"target_id": string,"value": number,"voter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"lobby_id": string,"tags"?: (string)[],"target_id": string,"value": number,"voter_id": string
                  }
                  Update: {
                    "created_at"?: string,"lobby_id"?: string,"tags"?: (string)[],"target_id"?: string,"value"?: number,"voter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "karma_votes_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "karma_votes_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "karma_votes_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "karma_votes_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "karma_votes_voter_id_fkey"
      columns: ["voter_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "karma_votes_voter_id_fkey"
      columns: ["voter_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "karma_votes_voter_id_fkey"
      columns: ["voter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobbies": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"game_id": string,"goal": string | null,"id": string,"language": string | null,"mode_slug": string,"note": string | null,"owner_id": string,"rank_max_id": string | null,"rank_min_id": string | null,"region_id": string | null,"slots": number,"starts_at": string | null,"status": Database["public"]['Enums']["lobby_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"game_id": string,"goal"?: string | null,"id"?: string,"language"?: string | null,"mode_slug": string,"note"?: string | null,"owner_id": string,"rank_max_id"?: string | null,"rank_min_id"?: string | null,"region_id"?: string | null,"slots": number,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["lobby_status"],"updated_at"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"game_id"?: string,"goal"?: string | null,"id"?: string,"language"?: string | null,"mode_slug"?: string,"note"?: string | null,"owner_id"?: string,"rank_max_id"?: string | null,"rank_min_id"?: string | null,"region_id"?: string | null,"slots"?: number,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["lobby_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobbies_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobbies_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "lobbies_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobbies_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobbies_rank_max_id_fkey"
      columns: ["rank_max_id"]
isOneToOne: false
      referencedRelation: "game_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobbies_rank_min_id_fkey"
      columns: ["rank_min_id"]
isOneToOne: false
      referencedRelation: "game_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobbies_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "game_regions"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_members": {
                  Row: {
                    "joined_at": string,"lobby_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"lobby_id": string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"lobby_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_members_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "lobby_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_messages": {
                  Row: {
                    "body": string,"created_at": string,"id": number,"lobby_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: never,"lobby_id": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: never,"lobby_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_messages_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "lobby_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_needed_roles": {
                  Row: {
                    "lobby_id": string,"role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "lobby_id": string,"role_id": string
                  }
                  Update: {
                    "lobby_id"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_needed_roles_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_needed_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "game_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_reads": {
                  Row: {
                    "last_read_id": number,"lobby_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "last_read_id"?: number,"lobby_id": string,"user_id": string
                  }
                  Update: {
                    "last_read_id"?: number,"lobby_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_reads_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_reads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "lobby_reads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_reads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_requests": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"id": string,"lobby_id": string,"message": string | null,"status": Database["public"]['Enums']["request_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"id"?: string,"lobby_id": string,"message"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"id"?: string,"lobby_id"?: string,"message"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_requests_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "lobby_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_log": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"id": number,"note": string | null,"report_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"id"?: never,"note"?: string | null,"report_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"id"?: never,"note"?: string | null,"report_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "moderation_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_log_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
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
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"lobby_id": string | null,"message_id": number | null,"message_snapshot": string | null,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"resolution": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"],"target_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"lobby_id"?: string | null,"message_id"?: number | null,"message_snapshot"?: string | null,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"lobby_id"?: string | null,"message_id"?: number | null,"message_snapshot"?: string | null,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "lobby_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "reports_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_target_user_id_fkey"
      columns: ["target_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "player_search"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
            "block_user":
{ Args: { "p_user": string }; Returns: undefined
                           },
"can_see":
{ Args: { "owner": string,"v": Database["public"]['Enums']["visibility"] }; Returns: boolean
                           },
"close_lobby":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"create_lobby":
{ Args: { "p_game_id": string,"p_goal": string,"p_language": string,"p_mode_slug": string,"p_note": string,"p_rank_max": string,"p_rank_min": string,"p_region": string,"p_roles": (string)[],"p_starts_at": string }; Returns: string
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_lobby_member":
{ Args: { "p_lobby": string }; Returns: boolean
                           },
"karma_summary":
{ Args: { "p_user": string }; Returns: {
              "negatives": number,"positives": number,"top_tags": (string)[]
            }[]
                           },
"leave_lobby":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"lobby_refresh_status":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"mark_read":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"my_rooms":
{ Args: Record<PropertyKey, never>; Returns: {
              "last_at": string,"last_body": string,"last_user_id": string,"lobby_id": string,"mode_slug": string,"owner_id": string,"status": Database["public"]['Enums']["lobby_status"],"unread": number
            }[]
                           },
"report_user":
{ Args: { "p_details": string,"p_lobby"?: string,"p_message"?: number,"p_reason": Database["public"]['Enums']["report_reason"],"p_target": string }; Returns: string
                           },
"request_join":
{ Args: { "p_lobby": string,"p_message": string }; Returns: string
                           },
"resolve_report":
{ Args: { "p_note": string,"p_report": string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"respond_request":
{ Args: { "p_accept": boolean,"p_request": string }; Returns: undefined
                           },
"save_game_profile":
{ Args: { "p_characters": Json,"p_flex": boolean,"p_game_id": string,"p_modes"?: (string)[],"p_rank_id": string,"p_region_id": string,"p_roles": Json,"p_visibility": Database["public"]['Enums']["visibility"] }; Returns: undefined
                           },
"send_message":
{ Args: { "p_body": string,"p_lobby": string }; Returns: number
                           },
"unblock_user":
{ Args: { "p_user": string }; Returns: undefined
                           },
"vote_karma":
{ Args: { "p_lobby": string,"p_tags": (string)[],"p_target": string,"p_value": number }; Returns: undefined
                           },
"withdraw_request":
{ Args: { "p_lobby": string }; Returns: undefined
                           }
          }
          Enums: {
            "character_status": "main"|"comfort"|"playable"|"flexible","lobby_status": "open"|"full"|"closed","report_reason": "spam"|"harassment"|"sexual"|"impersonation"|"cheating"|"other","report_status": "open"|"actioned"|"dismissed","request_status": "pending"|"accepted"|"rejected"|"withdrawn","visibility": "public"|"registered"|"private"
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
            "character_status": ["main", "comfort", "playable", "flexible"],"lobby_status": ["open", "full", "closed"],"report_reason": ["spam", "harassment", "sexual", "impersonation", "cheating", "other"],"report_status": ["open", "actioned", "dismissed"],"request_status": ["pending", "accepted", "rejected", "withdrawn"],"visibility": ["public", "registered", "private"]
          }
        }
} as const
