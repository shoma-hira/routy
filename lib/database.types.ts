export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      allowed_users: {
        Row: {
          email: string;
        };
        Insert: {
          email: string;
        };
        Update: {
          email?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          route_date: string | null;
          area: string | null;
          transport_type: string | null;
          companion_type: string | null;
          budget: number | null;
          weather_type: string | null;
          cover_image_url: string | null;
          caption: string | null;
          type: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          route_date?: string | null;
          area?: string | null;
          transport_type?: string | null;
          companion_type?: string | null;
          budget?: number | null;
          weather_type?: string | null;
          cover_image_url?: string | null;
          caption?: string | null;
          type?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          route_date?: string | null;
          area?: string | null;
          transport_type?: string | null;
          companion_type?: string | null;
          budget?: number | null;
          weather_type?: string | null;
          cover_image_url?: string | null;
          caption?: string | null;
          type?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      post_likes: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          username: string | null;
          bio: string | null;
          avatar_url: string | null;
          hobby_tags: string[] | null;
          profile_completed: boolean;
          updated_at: string | null;
          role?: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          username?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          hobby_tags?: string[] | null;
          profile_completed?: boolean;
          updated_at?: string | null;
          role?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          username?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          hobby_tags?: string[] | null;
          profile_completed?: boolean;
          updated_at?: string | null;
          role?: string | null;
        };
      };
      saved_posts: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string | null;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string | null;
        };
      };
      schedule_items: {
        Row: {
          id: string;
          post_id: string;
          start_time: string | null;
          end_time: string | null;
          content_name: string | null;
          place_name: string | null;
          time: string | null;
          spot_name: string | null;
          stay_duration: string | number | null;
          comment: string | null;
          image_url: string | null;
          sort_order: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          start_time?: string | null;
          end_time?: string | null;
          content_name?: string | null;
          place_name?: string | null;
          time?: string | null;
          spot_name?: string | null;
          stay_duration?: string | number | null;
          comment?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          start_time?: string | null;
          end_time?: string | null;
          content_name?: string | null;
          place_name?: string | null;
          time?: string | null;
          spot_name?: string | null;
          stay_duration?: string | number | null;
          comment?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
};
