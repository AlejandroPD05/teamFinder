
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
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clip_comments": {
                  Row: {
                    "body": string,"clip_id": string,"created_at": string,"hidden": boolean,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"clip_id": string,"created_at"?: string,"hidden"?: boolean,"id"?: never,"user_id": string
                  }
                  Update: {
                    "body"?: string,"clip_id"?: string,"created_at"?: string,"hidden"?: boolean,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clip_comments_clip_id_fkey"
      columns: ["clip_id"]
isOneToOne: false
      referencedRelation: "clips"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clip_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clip_emblems": {
                  Row: {
                    "active": boolean,"description": string,"id": string,"kind": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"description": string,"id"?: string,"kind": string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"description"?: string,"id"?: string,"kind"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"clip_votes": {
                  Row: {
                    "clip_id": string,"created_at": string,"emblem_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clip_id": string,"created_at"?: string,"emblem_id": string,"user_id": string
                  }
                  Update: {
                    "clip_id"?: string,"created_at"?: string,"emblem_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clip_votes_clip_id_fkey"
      columns: ["clip_id"]
isOneToOne: false
      referencedRelation: "clips"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clip_votes_emblem_id_fkey"
      columns: ["emblem_id"]
isOneToOne: false
      referencedRelation: "clip_emblems"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clip_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clips": {
                  Row: {
                    "created_at": string,"emblem_id": string,"game_id": string,"hidden": boolean,"id": string,"provider": Database["public"]['Enums']["clip_provider"],"title": string,"user_id": string,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"emblem_id": string,"game_id": string,"hidden"?: boolean,"id"?: string,"provider": Database["public"]['Enums']["clip_provider"],"title": string,"user_id": string,"video_id": string
                  }
                  Update: {
                    "created_at"?: string,"emblem_id"?: string,"game_id"?: string,"hidden"?: boolean,"id"?: string,"provider"?: Database["public"]['Enums']["clip_provider"],"title"?: string,"user_id"?: string,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clips_emblem_id_fkey"
      columns: ["emblem_id"]
isOneToOne: false
      referencedRelation: "clip_emblems"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clips_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clips_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"collectible_cards": {
                  Row: {
                    "active": boolean,"credit": string,"game_id": string,"id": string,"image_url": string,"name": string,"rarity": Database["public"]['Enums']["card_rarity"],"slug": string,"sort": number,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"credit": string,"game_id": string,"id"?: string,"image_url": string,"name": string,"rarity"?: Database["public"]['Enums']["card_rarity"],"slug": string,"sort"?: number,"source"?: string
                  }
                  Update: {
                    "active"?: boolean,"credit"?: string,"game_id"?: string,"id"?: string,"image_url"?: string,"name"?: string,"rarity"?: Database["public"]['Enums']["card_rarity"],"slug"?: string,"sort"?: number,"source"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collectible_cards_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"direct_conversations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"last_message_at": string | null,"user_a": string,"user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"last_message_at"?: string | null,"user_a": string,"user_b": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"last_message_at"?: string | null,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "direct_conversations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "direct_conversations_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "direct_conversations_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"direct_messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": number,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: never,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: never,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "direct_messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "direct_conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "direct_messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"direct_reads": {
                  Row: {
                    "conversation_id": string,"last_read_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"last_read_id"?: number,"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"last_read_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "direct_reads_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "direct_conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "direct_reads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fanart_submissions": {
                  Row: {
                    "artist_name": string,"card_id": string | null,"created_at": string,"game_id": string,"id": string,"image_path": string,"license_accepted_at": string,"license_version": string,"portfolio_url": string | null,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["fanart_status"],"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "artist_name": string,"card_id"?: string | null,"created_at"?: string,"game_id": string,"id"?: string,"image_path": string,"license_accepted_at"?: string,"license_version": string,"portfolio_url"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["fanart_status"],"title": string,"user_id": string
                  }
                  Update: {
                    "artist_name"?: string,"card_id"?: string | null,"created_at"?: string,"game_id"?: string,"id"?: string,"image_path"?: string,"license_accepted_at"?: string,"license_version"?: string,"portfolio_url"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["fanart_status"],"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fanart_submissions_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "collectible_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fanart_submissions_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fanart_submissions_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fanart_submissions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"kind": string,"page": string | null,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"kind": string,"page"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"page"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_characters": {
                  Row: {
                    "active": boolean,"game_id": string,"icon_url": string | null,"id": string,"name": string,"role_id": string | null,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"game_id": string,"icon_url"?: string | null,"id"?: string,"name": string,"role_id"?: string | null,"slug": string
                  }
                  Update: {
                    "active"?: boolean,"game_id"?: string,"icon_url"?: string | null,"id"?: string,"name"?: string,"role_id"?: string | null,"slug"?: string
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
                },"game_maps": {
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
      foreignKeyName: "game_maps_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
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
                    "available_mode": string | null,"available_until": string | null,"created_at": string,"flex": boolean,"game_id": string,"mode_slugs": (string)[],"rank_id": string | null,"rank_source": string,"region_id": string | null,"updated_at": string,"user_id": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "available_mode"?: string | null,"available_until"?: string | null,"created_at"?: string,"flex"?: boolean,"game_id": string,"mode_slugs"?: (string)[],"rank_id"?: string | null,"rank_source"?: string,"region_id"?: string | null,"updated_at"?: string,"user_id": string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "available_mode"?: string | null,"available_until"?: string | null,"created_at"?: string,"flex"?: boolean,"game_id"?: string,"mode_slugs"?: (string)[],"rank_id"?: string | null,"rank_source"?: string,"region_id"?: string | null,"updated_at"?: string,"user_id"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
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
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_ranks": {
                  Row: {
                    "active": boolean,"color": string | null,"game_id": string,"icon_url": string | null,"id": string,"name": string,"slug": string,"tier": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"color"?: string | null,"game_id": string,"icon_url"?: string | null,"id"?: string,"name": string,"slug": string,"tier": number
                  }
                  Update: {
                    "active"?: boolean,"color"?: string | null,"game_id"?: string,"icon_url"?: string | null,"id"?: string,"name"?: string,"slug"?: string,"tier"?: number
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
                    "active": boolean,"character_label": string | null,"id": string,"name": string,"short_name": string | null,"sort": number,"theme_accent": string | null,"theme_accent_soft": string | null,"theme_glow_a": string | null,"theme_glow_b": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"character_label"?: string | null,"id": string,"name": string,"short_name"?: string | null,"sort"?: number,"theme_accent"?: string | null,"theme_accent_soft"?: string | null,"theme_glow_a"?: string | null,"theme_glow_b"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"character_label"?: string | null,"id"?: string,"name"?: string,"short_name"?: string | null,"sort"?: number,"theme_accent"?: string | null,"theme_accent_soft"?: string | null,"theme_glow_a"?: string | null,"theme_glow_b"?: string | null
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
      referencedRelation: "profiles"
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
                    "closed_at": string | null,"created_at": string,"discord_posted_at": string | null,"filled_at": string | null,"game_id": string,"goal": string | null,"id": string,"language": string | null,"mode_slug": string,"note": string | null,"owner_id": string,"rank_max_id": string | null,"rank_min_id": string | null,"region_id": string | null,"reminded_at": string | null,"shared_at": string | null,"slots": number,"starts_at": string | null,"status": Database["public"]['Enums']["lobby_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"discord_posted_at"?: string | null,"filled_at"?: string | null,"game_id": string,"goal"?: string | null,"id"?: string,"language"?: string | null,"mode_slug": string,"note"?: string | null,"owner_id": string,"rank_max_id"?: string | null,"rank_min_id"?: string | null,"region_id"?: string | null,"reminded_at"?: string | null,"shared_at"?: string | null,"slots": number,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["lobby_status"],"updated_at"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"discord_posted_at"?: string | null,"filled_at"?: string | null,"game_id"?: string,"goal"?: string | null,"id"?: string,"language"?: string | null,"mode_slug"?: string,"note"?: string | null,"owner_id"?: string,"rank_max_id"?: string | null,"rank_min_id"?: string | null,"region_id"?: string | null,"reminded_at"?: string | null,"shared_at"?: string | null,"slots"?: number,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["lobby_status"],"updated_at"?: string
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
                },"lobby_departures": {
                  Row: {
                    "id": number,"left_at": string,"lobby_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"left_at"?: string,"lobby_id": string,"user_id": string
                  }
                  Update: {
                    "id"?: never,"left_at"?: string,"lobby_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_departures_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_departures_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_requests": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"id": string,"lobby_id": string,"message": string | null,"responded_at": string | null,"status": Database["public"]['Enums']["request_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"id"?: string,"lobby_id": string,"message"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"id"?: string,"lobby_id"?: string,"message"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"user_id"?: string
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
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lobby_templates": {
                  Row: {
                    "created_at": string,"game_id": string,"goal": string | null,"id": string,"language": string | null,"mode_slug": string,"name": string,"note": string | null,"rank_max_id": string | null,"rank_min_id": string | null,"region_id": string | null,"roles": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": string,"goal"?: string | null,"id"?: string,"language"?: string | null,"mode_slug": string,"name": string,"note"?: string | null,"rank_max_id"?: string | null,"rank_min_id"?: string | null,"region_id"?: string | null,"roles"?: (string)[],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: string,"goal"?: string | null,"id"?: string,"language"?: string | null,"mode_slug"?: string,"name"?: string,"note"?: string | null,"rank_max_id"?: string | null,"rank_min_id"?: string | null,"region_id"?: string | null,"roles"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lobby_templates_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_templates_rank_max_id_fkey"
      columns: ["rank_max_id"]
isOneToOne: false
      referencedRelation: "game_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_templates_rank_min_id_fkey"
      columns: ["rank_min_id"]
isOneToOne: false
      referencedRelation: "game_ranks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_templates_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "game_regions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lobby_templates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"manual_matches": {
                  Row: {
                    "assists": number | null,"character_id": string | null,"created_at": string,"deaths": number | null,"game_id": string,"id": string,"kills": number | null,"map_name": string | null,"mode_id": string | null,"note": string | null,"placement": number | null,"played_on": string,"result": Database["public"]['Enums']["match_result"] | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assists"?: number | null,"character_id"?: string | null,"created_at"?: string,"deaths"?: number | null,"game_id": string,"id"?: string,"kills"?: number | null,"map_name"?: string | null,"mode_id"?: string | null,"note"?: string | null,"placement"?: number | null,"played_on": string,"result"?: Database["public"]['Enums']["match_result"] | null,"user_id": string
                  }
                  Update: {
                    "assists"?: number | null,"character_id"?: string | null,"created_at"?: string,"deaths"?: number | null,"game_id"?: string,"id"?: string,"kills"?: number | null,"map_name"?: string | null,"mode_id"?: string | null,"note"?: string | null,"placement"?: number | null,"played_on"?: string,"result"?: Database["public"]['Enums']["match_result"] | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "manual_matches_character_id_fkey"
      columns: ["character_id"]
isOneToOne: false
      referencedRelation: "game_characters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_matches_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_matches_mode_id_fkey"
      columns: ["mode_id"]
isOneToOne: false
      referencedRelation: "game_modes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "manual_matches_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mission_claims": {
                  Row: {
                    "card_id": string | null,"claimed_at": string,"id": string,"mission_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id"?: string | null,"claimed_at"?: string,"id"?: string,"mission_id": string,"user_id": string
                  }
                  Update: {
                    "card_id"?: string | null,"claimed_at"?: string,"id"?: string,"mission_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mission_claims_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "collectible_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mission_claims_mission_id_fkey"
      columns: ["mission_id"]
isOneToOne: false
      referencedRelation: "missions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mission_claims_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"missions": {
                  Row: {
                    "active": boolean,"description": string,"game_id": string,"id": string,"kind": string,"max_per_day": number,"min_member_age": string,"slug": string,"sort": number,"target": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"description": string,"game_id": string,"id"?: string,"kind": string,"max_per_day"?: number,"min_member_age"?: string,"slug": string,"sort"?: number,"target": number,"title": string
                  }
                  Update: {
                    "active"?: boolean,"description"?: string,"game_id"?: string,"id"?: string,"kind"?: string,"max_per_day"?: number,"min_member_age"?: string,"slug"?: string,"sort"?: number,"target"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "missions_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
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
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"body": string | null,"clip_id": string | null,"created_at": string,"id": number,"kind": Database["public"]['Enums']["notification_kind"],"lobby_id": string | null,"read_at": string | null,"team_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string | null,"clip_id"?: string | null,"created_at"?: string,"id"?: never,"kind": Database["public"]['Enums']["notification_kind"],"lobby_id"?: string | null,"read_at"?: string | null,"team_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string | null,"clip_id"?: string | null,"created_at"?: string,"id"?: never,"kind"?: Database["public"]['Enums']["notification_kind"],"lobby_id"?: string | null,"read_at"?: string | null,"team_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_clip_id_fkey"
      columns: ["clip_id"]
isOneToOne: false
      referencedRelation: "clips"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
      referencedRelation: "game_profiles"
      referencedColumns: ["user_id","game_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "availability": (string)[],"availability_visibility": Database["public"]['Enums']["visibility"],"avatar_url": string | null,"created_at": string,"display_name": string,"dm_policy": string,"email_notifications": boolean,"goals": (string)[],"goals_visibility": Database["public"]['Enums']["visibility"],"id": string,"invite_code": string | null,"invited_by": string | null,"languages": (string)[],"languages_visibility": Database["public"]['Enums']["visibility"],"matches_visibility": Database["public"]['Enums']["visibility"],"onboarded_at": string | null,"share_card": boolean,"social_twitch": string | null,"social_x": string | null,"social_youtube": string | null,"socials_visibility": Database["public"]['Enums']["visibility"],"updated_at": string,"voice": string | null,"voice_visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: (string)[],"availability_visibility"?: Database["public"]['Enums']["visibility"],"avatar_url"?: string | null,"created_at"?: string,"display_name": string,"dm_policy"?: string,"email_notifications"?: boolean,"goals"?: (string)[],"goals_visibility"?: Database["public"]['Enums']["visibility"],"id": string,"invite_code"?: string | null,"invited_by"?: string | null,"languages"?: (string)[],"languages_visibility"?: Database["public"]['Enums']["visibility"],"matches_visibility"?: Database["public"]['Enums']["visibility"],"onboarded_at"?: string | null,"share_card"?: boolean,"social_twitch"?: string | null,"social_x"?: string | null,"social_youtube"?: string | null,"socials_visibility"?: Database["public"]['Enums']["visibility"],"updated_at"?: string,"voice"?: string | null,"voice_visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "availability"?: (string)[],"availability_visibility"?: Database["public"]['Enums']["visibility"],"avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"dm_policy"?: string,"email_notifications"?: boolean,"goals"?: (string)[],"goals_visibility"?: Database["public"]['Enums']["visibility"],"id"?: string,"invite_code"?: string | null,"invited_by"?: string | null,"languages"?: (string)[],"languages_visibility"?: Database["public"]['Enums']["visibility"],"matches_visibility"?: Database["public"]['Enums']["visibility"],"onboarded_at"?: string | null,"share_card"?: boolean,"social_twitch"?: string | null,"social_x"?: string | null,"social_youtube"?: string | null,"socials_visibility"?: Database["public"]['Enums']["visibility"],"updated_at"?: string,"voice"?: string | null,"voice_visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "clip_comment_id": number | null,"clip_id": string | null,"created_at": string,"details": string | null,"direct_message_id": number | null,"id": string,"lobby_id": string | null,"message_id": number | null,"message_snapshot": string | null,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"resolution": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"],"target_user_id": string | null,"team_message_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "clip_comment_id"?: number | null,"clip_id"?: string | null,"created_at"?: string,"details"?: string | null,"direct_message_id"?: number | null,"id"?: string,"lobby_id"?: string | null,"message_id"?: number | null,"message_snapshot"?: string | null,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_user_id"?: string | null,"team_message_id"?: number | null
                  }
                  Update: {
                    "clip_comment_id"?: number | null,"clip_id"?: string | null,"created_at"?: string,"details"?: string | null,"direct_message_id"?: number | null,"id"?: string,"lobby_id"?: string | null,"message_id"?: number | null,"message_snapshot"?: string | null,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_user_id"?: string | null,"team_message_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_clip_comment_id_fkey"
      columns: ["clip_comment_id"]
isOneToOne: false
      referencedRelation: "clip_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_clip_id_fkey"
      columns: ["clip_id"]
isOneToOne: false
      referencedRelation: "clips"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_direct_message_id_fkey"
      columns: ["direct_message_id"]
isOneToOne: false
      referencedRelation: "direct_messages"
      referencedColumns: ["id"]
    },{
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
      referencedRelation: "profiles"
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
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_team_message_id_fkey"
      columns: ["team_message_id"]
isOneToOne: false
      referencedRelation: "team_messages"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_searches": {
                  Row: {
                    "alerts": boolean,"created_at": string,"game_id": string,"id": string,"language": string | null,"last_alert_at": string | null,"name": string,"query": string,"rank_max_tier": number | null,"rank_min_tier": number | null,"region_id": string | null,"role_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alerts"?: boolean,"created_at"?: string,"game_id": string,"id"?: string,"language"?: string | null,"last_alert_at"?: string | null,"name": string,"query"?: string,"rank_max_tier"?: number | null,"rank_min_tier"?: number | null,"region_id"?: string | null,"role_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "alerts"?: boolean,"created_at"?: string,"game_id"?: string,"id"?: string,"language"?: string | null,"last_alert_at"?: string | null,"name"?: string,"query"?: string,"rank_max_tier"?: number | null,"rank_min_tier"?: number | null,"region_id"?: string | null,"role_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_searches_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_searches_region_id_fkey"
      columns: ["region_id"]
isOneToOne: false
      referencedRelation: "game_regions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_searches_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "game_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_searches_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"team_event_rsvps": {
                  Row: {
                    "answer": string,"event_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"event_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "answer"?: string,"event_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_event_rsvps_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "team_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_event_rsvps_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"team_events": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"lobby_id": string | null,"note": string | null,"starts_at": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"lobby_id"?: string | null,"note"?: string | null,"starts_at": string,"team_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"lobby_id"?: string | null,"note"?: string | null,"starts_at"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_events_lobby_id_fkey"
      columns: ["lobby_id"]
isOneToOne: false
      referencedRelation: "lobbies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_events_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"team_invites": {
                  Row: {
                    "created_at": string,"id": string,"invited_by": string | null,"responded_at": string | null,"status": string,"team_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"invited_by"?: string | null,"responded_at"?: string | null,"status"?: string,"team_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invited_by"?: string | null,"responded_at"?: string | null,"status"?: string,"team_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_invites_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_invites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"team_members": {
                  Row: {
                    "joined_at": string,"role": string,"team_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"role"?: string,"team_id": string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"role"?: string,"team_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_members_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"team_messages": {
                  Row: {
                    "body": string,"created_at": string,"id": number,"team_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: never,"team_id": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: never,"team_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_messages_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "created_at": string,"description": string | null,"game_id": string,"id": string,"name": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"game_id": string,"id"?: string,"name": string,"owner_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"game_id"?: string,"id"?: string,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_owner_id_fkey"
      columns: ["owner_id"]
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
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_cards": {
                  Row: {
                    "card_id": string,"obtained_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"obtained_at"?: string,"user_id": string
                  }
                  Update: {
                    "card_id"?: string,"obtained_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_cards_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "collectible_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_cards_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_restrictions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"lifted_at": string | null,"reason": string,"report_id": string | null,"until": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"lifted_at"?: string | null,"reason": string,"report_id"?: string | null,"until": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"lifted_at"?: string | null,"reason"?: string,"report_id"?: string | null,"until"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_restrictions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_restrictions_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_restrictions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"weekly_rank_awards": {
                  Row: {
                    "created_at": string,"finished": number,"game_id": string,"points": number,"pos": number,"recognitions": number,"user_id": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finished": number,"game_id": string,"points": number,"pos": number,"recognitions": number,"user_id": string,"week_start": string
                  }
                  Update: {
                    "created_at"?: string,"finished"?: number,"game_id"?: string,"points"?: number,"pos"?: number,"recognitions"?: number,"user_id"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "weekly_rank_awards_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "weekly_rank_awards_user_id_fkey"
      columns: ["user_id"]
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
                    
                  ]
                },"player_character_cards": {
                  Row: {
                    "character_id": string,"game_id": string,"status": Database["public"]['Enums']["character_status"],"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"player_role_cards": {
                  Row: {
                    "game_id": string,"is_primary": boolean,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"player_search": {
                  Row: {
                    "availability": (string)[] | null,"avatar_url": string | null,"char_keys": (string)[] | null,"character_ids": (string)[] | null,"display_name": string,"flex": boolean,"game_id": string,"goals": (string)[] | null,"languages": (string)[] | null,"mode_slugs": (string)[],"primary_role_id": string | null,"rank_id": string | null,"rank_source": string,"rank_tier": number | null,"region_id": string | null,"role_ids": (string)[] | null,"updated_at": string | null,"user_id": string,"voice": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"profile_cards": {
                  Row: {
                    "availability": (string)[] | null,"avatar_url": string | null,"created_at": string,"display_name": string,"dm_policy": string | null,"goals": (string)[] | null,"id": string,"languages": (string)[] | null,"social_twitch": string | null,"social_x": string | null,"social_youtube": string | null,"voice": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "availability"?: never,"avatar_url"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"dm_policy"?: never,"goals"?: never,"id"?: string | null,"languages"?: never,"social_twitch"?: never,"social_x"?: never,"social_youtube"?: never,"voice"?: never
                         }
                        Update: {
                           "availability"?: never,"avatar_url"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"dm_policy"?: never,"goals"?: never,"id"?: string | null,"languages"?: never,"social_twitch"?: never,"social_x"?: never,"social_youtube"?: never,"voice"?: never
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "accept_invite":
{ Args: { "p_code": string }; Returns: boolean
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"available_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "game_id": string,"players": number
            }[]
                           },
"available_now":
{ Args: { "p_game": string }; Returns: {
              "available_until": string,"mode_slug": string,"user_id": string
            }[]
                           },
"block_user":
{ Args: { "p_user": string }; Returns: undefined
                           },
"can_see":
{ Args: { "owner": string,"v": Database["public"]['Enums']["visibility"] }; Returns: boolean
                           },
"cancel_team_invite":
{ Args: { "p_invite": string }; Returns: undefined
                           },
"claim_mission":
{ Args: { "p_mission": string }; Returns: string
                           },
"clip_weekly_winners":
{ Args: { "p_game": string,"p_min_voter_age"?: string,"p_min_votes"?: number,"p_weeks"?: number }; Returns: {
              "clip_id": string,"closed": boolean,"emblem_id": string,"votes": number,"week_start": string
            }[]
                           },
"close_lobby":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"comment_clip":
{ Args: { "p_body": string,"p_clip": string }; Returns: number
                           },
"create_lobby":
{ Args: { "p_game_id": string,"p_goal": string,"p_language": string,"p_mode_slug": string,"p_note": string,"p_rank_max": string,"p_rank_min": string,"p_region": string,"p_roles": (string)[],"p_starts_at": string }; Returns: string
                           },
"create_team":
{ Args: { "p_description": string,"p_game": string,"p_name": string }; Returns: string
                           },
"create_team_event":
{ Args: { "p_note": string,"p_starts_at": string,"p_team": string }; Returns: string
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"delete_my_clip":
{ Args: { "p_clip": string }; Returns: undefined
                           },
"delete_my_clip_comment":
{ Args: { "p_comment": number }; Returns: undefined
                           },
"delete_team":
{ Args: { "p_team": string }; Returns: undefined
                           },
"delete_team_event":
{ Args: { "p_event": string }; Returns: undefined
                           },
"discord_lobbies_enabled":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"game_player_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "game_id": string,"players": number
            }[]
                           },
"invite_owner":
{ Args: { "p_code": string }; Returns: string
                           },
"invite_to_team":
{ Args: { "p_team": string,"p_user": string }; Returns: string
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
"leave_team":
{ Args: { "p_team": string,"p_user"?: string }; Returns: undefined
                           },
"lift_restriction":
{ Args: { "p_restriction": string }; Returns: undefined
                           },
"lobby_refresh_status":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"mark_direct_read":
{ Args: { "p_conversation": string }; Returns: undefined
                           },
"mark_notifications_read":
{ Args: { "p_id"?: number }; Returns: undefined
                           },
"mark_read":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"moderate_clip":
{ Args: { "p_clip": string,"p_comment": number,"p_hidden": boolean,"p_note": string }; Returns: undefined
                           },
"my_conversations":
{ Args: Record<PropertyKey, never>; Returns: {
              "blocked": boolean,"conversation_id": string,"last_at": string,"last_body": string,"last_sender": string,"other_id": string,"unread": number
            }[]
                           },
"my_invite_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_invitees":
{ Args: Record<PropertyKey, never>; Returns: {
              "joined_at": string,"user_id": string
            }[]
                           },
"my_missions":
{ Args: { "p_game": string }; Returns: {
              "cards_owned": number,"cards_total": number,"claimable": boolean,"claims": number,"description": string,"id": string,"progress": number,"slug": string,"target": number,"title": string
            }[]
                           },
"my_rooms":
{ Args: Record<PropertyKey, never>; Returns: {
              "last_at": string,"last_body": string,"last_user_id": string,"lobby_id": string,"mode_slug": string,"owner_id": string,"status": Database["public"]['Enums']["lobby_status"],"unread": number
            }[]
                           },
"player_badges":
{ Args: { "p_user": string }; Returns: Json
                           },
"player_reliability":
{ Args: { "p_user": string }; Returns: Json
                           },
"post_clip":
{ Args: { "p_emblem": string,"p_game": string,"p_provider": Database["public"]['Enums']["clip_provider"],"p_title": string,"p_video": string }; Returns: string
                           },
"post_lobby_discord":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"prune_push_subscriptions":
{ Args: { "p_endpoints": (string)[],"p_secret": string }; Returns: number
                           },
"public_player_card":
{ Args: { "p_game": string,"p_user": string }; Returns: {
              "avatar_url": string,"display_name": string,"flex": boolean,"game_name": string,"mains": (string)[],"primary_role": string,"rank_color": string,"rank_name": string,"region": string,"roles": (string)[]
            }[]
                           },
"report_clip":
{ Args: { "p_clip": string,"p_comment": number,"p_details": string,"p_reason": Database["public"]['Enums']["report_reason"] }; Returns: string
                           },
"report_direct_message":
{ Args: { "p_details": string,"p_message": number,"p_reason": Database["public"]['Enums']["report_reason"] }; Returns: string
                           },
"report_team_message":
{ Args: { "p_details": string,"p_message": number,"p_reason": Database["public"]['Enums']["report_reason"] }; Returns: string
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
"respond_team_invite":
{ Args: { "p_accept": boolean,"p_invite": string }; Returns: undefined
                           },
"restrict_user":
{ Args: { "p_days": number,"p_reason": string,"p_report"?: string,"p_user": string }; Returns: string
                           },
"review_fanart":
{ Args: { "p_approve": boolean,"p_id": string,"p_image_url": string,"p_note": string,"p_rarity": Database["public"]['Enums']["card_rarity"] }; Returns: undefined
                           },
"rsvp_team_event":
{ Args: { "p_answer": string,"p_event": string }; Returns: undefined
                           },
"save_game_profile":
{ Args: { "p_characters": Json,"p_flex": boolean,"p_game_id": string,"p_modes"?: (string)[],"p_rank_id": string,"p_region_id": string,"p_roles": Json,"p_visibility": Database["public"]['Enums']["visibility"] }; Returns: undefined
                           },
"save_lobby_template":
{ Args: { "p_lobby": string,"p_name": string }; Returns: string
                           },
"save_search":
{ Args: { "p_game": string,"p_language": string,"p_name": string,"p_query": string,"p_rank_max": string,"p_rank_min": string,"p_region": string,"p_role": string }; Returns: string
                           },
"send_direct_message":
{ Args: { "p_body": string,"p_conversation": string }; Returns: number
                           },
"send_feedback":
{ Args: { "p_body": string,"p_kind": string,"p_page": string }; Returns: string
                           },
"send_message":
{ Args: { "p_body": string,"p_lobby": string }; Returns: number
                           },
"send_team_message":
{ Args: { "p_body": string,"p_team": string }; Returns: number
                           },
"set_available":
{ Args: { "p_game": string,"p_hours": number,"p_mode"?: string }; Returns: string
                           },
"set_feedback_status":
{ Args: { "p_id": string,"p_status": string }; Returns: undefined
                           },
"share_lobby":
{ Args: { "p_lobby": string }; Returns: undefined
                           },
"shared_lobby":
{ Args: { "p_lobby": string }; Returns: {
              "game_id": string,"game_name": string,"goal": string,"id": string,"language": string,"mode_name": string,"note": string,"owner_name": string,"rank_max": string,"rank_min": string,"region": string,"roles": (string)[],"slots": number,"starts_at": string,"status": Database["public"]['Enums']["lobby_status"],"taken": number
            }[]
                           },
"start_conversation":
{ Args: { "p_other": string }; Returns: string
                           },
"submit_fanart":
{ Args: { "p_artist": string,"p_game": string,"p_license": string,"p_path": string,"p_portfolio": string,"p_title": string }; Returns: string
                           },
"suggested_players":
{ Args: { "p_game": string,"p_limit"?: number }; Returns: {
              "available": boolean,"reasons": (string)[],"user_id": string
            }[]
                           },
"team_event_lobby":
{ Args: { "p_event": string,"p_mode": string }; Returns: string
                           },
"toggle_clip_vote":
{ Args: { "p_clip": string,"p_emblem": string }; Returns: boolean
                           },
"touch_seen":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"unblock_user":
{ Args: { "p_user": string }; Returns: undefined
                           },
"update_team":
{ Args: { "p_description": string,"p_name": string,"p_team": string }; Returns: undefined
                           },
"vote_karma":
{ Args: { "p_lobby": string,"p_tags": (string)[],"p_target": string,"p_value": number }; Returns: undefined
                           },
"weekly_ranking":
{ Args: { "p_game": string,"p_min_age"?: string,"p_min_finished"?: number,"p_week_start"?: string }; Returns: {
              "finished": number,"last_at": string,"points": number,"pos": number,"recognitions": number,"user_id": string
            }[]
                           },
"withdraw_fanart":
{ Args: { "p_id": string }; Returns: undefined
                           },
"withdraw_request":
{ Args: { "p_lobby": string }; Returns: undefined
                           }
          }
          Enums: {
            "card_rarity": "common"|"rare"|"epic"|"legendary","character_status": "main"|"comfort"|"playable"|"flexible","clip_provider": "youtube"|"twitch"|"streamable","fanart_status": "pending"|"approved"|"rejected"|"withdrawn","lobby_status": "open"|"full"|"closed","match_result": "win"|"loss"|"draw","notification_kind": "join_request"|"request_accepted"|"request_rejected"|"clip_comment"|"karma"|"restriction"|"fanart"|"ranking"|"team_invite"|"team_joined"|"team_event"|"team_lobby"|"friend_joined"|"karma_reminder"|"lobby_starting"|"search_match","report_reason": "spam"|"harassment"|"sexual"|"impersonation"|"cheating"|"other","report_status": "open"|"actioned"|"dismissed","request_status": "pending"|"accepted"|"rejected"|"withdrawn","visibility": "public"|"registered"|"private"
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
            "card_rarity": ["common", "rare", "epic", "legendary"],"character_status": ["main", "comfort", "playable", "flexible"],"clip_provider": ["youtube", "twitch", "streamable"],"fanart_status": ["pending", "approved", "rejected", "withdrawn"],"lobby_status": ["open", "full", "closed"],"match_result": ["win", "loss", "draw"],"notification_kind": ["join_request", "request_accepted", "request_rejected", "clip_comment", "karma", "restriction", "fanart", "ranking", "team_invite", "team_joined", "team_event", "team_lobby", "friend_joined", "karma_reminder", "lobby_starting", "search_match"],"report_reason": ["spam", "harassment", "sexual", "impersonation", "cheating", "other"],"report_status": ["open", "actioned", "dismissed"],"request_status": ["pending", "accepted", "rejected", "withdrawn"],"visibility": ["public", "registered", "private"]
          }
        }
} as const
