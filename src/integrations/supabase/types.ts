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
      broadcast_logs: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          errors: Json | null
          failed_count: number
          id: string
          product_description: string | null
          product_link: string | null
          product_name: string
          recipients_count: number
          sent_count: number
          template_name: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          errors?: Json | null
          failed_count?: number
          id?: string
          product_description?: string | null
          product_link?: string | null
          product_name: string
          recipients_count?: number
          sent_count?: number
          template_name: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          errors?: Json | null
          failed_count?: number
          id?: string
          product_description?: string | null
          product_link?: string | null
          product_name?: string
          recipients_count?: number
          sent_count?: number
          template_name?: string
        }
        Relationships: []
      }
      combo_pack_files: {
        Row: {
          created_at: string
          file_name: string
          file_order: number
          file_url: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_order?: number
          file_url: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_order?: number
          file_url?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_pack_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          phone: string
          updated_at: string | null
          whatsapp_optin: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          phone: string
          updated_at?: string | null
          whatsapp_optin?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          phone?: string
          updated_at?: string | null
          whatsapp_optin?: boolean | null
        }
        Relationships: []
      }
      download_tokens: {
        Row: {
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          id: string
          order_id: string
          product_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          order_id: string
          product_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_tokens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_logs: {
        Row: {
          created_at: string
          delivery_status: string
          email_type: string
          error_message: string | null
          id: string
          order_id: string
          part_number: number | null
          product_id: string | null
          recipient_email: string
          resend_email_id: string | null
          total_parts: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          email_type?: string
          error_message?: string | null
          id?: string
          order_id: string
          part_number?: number | null
          product_id?: string | null
          recipient_email: string
          resend_email_id?: string | null
          total_parts?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_status?: string
          email_type?: string
          error_message?: string | null
          id?: string
          order_id?: string
          part_number?: number | null
          product_id?: string | null
          recipient_email?: string
          resend_email_id?: string | null
          total_parts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_price: number
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_price: number
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_price?: number
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string
          delivery_attempts: number | null
          delivery_status: string | null
          id: string
          order_number: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          total_amount: number
          updated_at: string | null
          whatsapp_optin: boolean | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone: string
          delivery_attempts?: number | null
          delivery_status?: string | null
          id?: string
          order_number: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
          whatsapp_optin?: boolean | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string
          delivery_attempts?: number | null
          delivery_status?: string | null
          id?: string
          order_number?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          whatsapp_optin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          audio_url: string | null
          badge: string | null
          category: string
          created_at: string | null
          description: string | null
          download_count: number | null
          features: string[] | null
          file_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          original_price: number | null
          price: number
          seo_description: string | null
          seo_title: string | null
          updated_at: string | null
        }
        Insert: {
          audio_url?: string | null
          badge?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          features?: string[] | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          original_price?: number | null
          price: number
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_url?: string | null
          badge?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          features?: string[] | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promotion_logs: {
        Row: {
          created_at: string
          created_by: string | null
          cta_link: string | null
          errors: Json | null
          failed_count: number
          id: string
          promotion_message: string | null
          promotion_title: string
          recipients_count: number
          sent_count: number
          template_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          errors?: Json | null
          failed_count?: number
          id?: string
          promotion_message?: string | null
          promotion_title: string
          recipients_count?: number
          sent_count?: number
          template_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          errors?: Json | null
          failed_count?: number
          id?: string
          promotion_message?: string | null
          promotion_title?: string
          recipients_count?: number
          sent_count?: number
          template_name?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          currency: string
          error_message: string | null
          failed_email: string | null
          id: string
          order_id: string
          processed_at: string | null
          processed_by: string | null
          razorpay_payment_id: string
          razorpay_refund_id: string | null
          reason: string
          status: string
          whatsapp_sent: boolean | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          error_message?: string | null
          failed_email?: string | null
          id?: string
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          razorpay_payment_id: string
          razorpay_refund_id?: string | null
          reason: string
          status?: string
          whatsapp_sent?: boolean | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          error_message?: string | null
          failed_email?: string | null
          id?: string
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          razorpay_payment_id?: string
          razorpay_refund_id?: string | null
          reason?: string
          status?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: {
        Args: { _older_than_hours?: number }
        Returns: number
      }
      generate_order_number: { Args: never; Returns: string }
      get_public_setting: { Args: { setting_key: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
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
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
