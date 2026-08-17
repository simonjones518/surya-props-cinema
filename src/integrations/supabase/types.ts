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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          advance_paid: number
          balance_due: number
          booking_code: string
          client_id: number | null
          created_at: string
          deposit_status: string
          id: number
          items: Json
          notes: string | null
          production_house: string
          rental_status: string
          security_deposit: number
          start_date: string
          total_rent: number
          updated_at: string
          wrap_date: string
        }
        Insert: {
          advance_paid?: number
          balance_due?: number
          booking_code: string
          client_id?: number | null
          created_at?: string
          deposit_status?: string
          id?: number
          items?: Json
          notes?: string | null
          production_house?: string
          rental_status?: string
          security_deposit?: number
          start_date: string
          total_rent?: number
          updated_at?: string
          wrap_date: string
        }
        Update: {
          advance_paid?: number
          balance_due?: number
          booking_code?: string
          client_id?: number | null
          created_at?: string
          deposit_status?: string
          id?: number
          items?: Json
          notes?: string | null
          production_house?: string
          rental_status?: string
          security_deposit?: number
          start_date?: string
          total_rent?: number
          updated_at?: string
          wrap_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: number
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          contact_person: string
          created_at: string
          email: string
          gst_number: string | null
          id: number
          phone: string
          production_house: string
        }
        Insert: {
          address?: string | null
          contact_person?: string
          created_at?: string
          email?: string
          gst_number?: string | null
          id?: number
          phone?: string
          production_house: string
        }
        Update: {
          address?: string | null
          contact_person?: string
          created_at?: string
          email?: string
          gst_number?: string | null
          id?: number
          phone?: string
          production_house?: string
        }
        Relationships: []
      }
      godowns: {
        Row: {
          created_at: string
          id: number
          location_code: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          location_code: string
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          location_code?: string
          name?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          advance_received: number
          balance_payable: number
          client_id: number | null
          client_name: string
          client_phone: string
          created_at: string
          discount: number
          doc_type: string
          gst_amount: number
          gst_percent: number
          id: number
          invoice_number: string
          items: Json
          notes: string | null
          payment_status: string
          production_house: string
          security_deposit: number
          shoot_location: string | null
          shoot_start_date: string
          shoot_wrap_date: string
          subtotal: number
          transport_charges: number
        }
        Insert: {
          advance_received?: number
          balance_payable?: number
          client_id?: number | null
          client_name?: string
          client_phone?: string
          created_at?: string
          discount?: number
          doc_type?: string
          gst_amount?: number
          gst_percent?: number
          id?: number
          invoice_number: string
          items?: Json
          notes?: string | null
          payment_status?: string
          production_house?: string
          security_deposit?: number
          shoot_location?: string | null
          shoot_start_date: string
          shoot_wrap_date: string
          subtotal?: number
          transport_charges?: number
        }
        Update: {
          advance_received?: number
          balance_payable?: number
          client_id?: number | null
          client_name?: string
          client_phone?: string
          created_at?: string
          discount?: number
          doc_type?: string
          gst_amount?: number
          gst_percent?: number
          id?: number
          invoice_number?: string
          items?: Json
          notes?: string | null
          payment_status?: string
          production_house?: string
          security_deposit?: number
          shoot_location?: string | null
          shoot_start_date?: string
          shoot_wrap_date?: string
          subtotal?: number
          transport_charges?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_requests: {
        Row: {
          contact_person: string
          created_at: string
          custom_description: string
          id: number
          notes: string | null
          phone: string
          production_house: string
          prop_id: number | null
          prop_title: string
          quantity: number
          reference_image_urls: string[]
          request_code: string
          request_type: string
          shoot_location: string
          shoot_start_date: string | null
          shoot_wrap_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_person?: string
          created_at?: string
          custom_description?: string
          id?: number
          notes?: string | null
          phone?: string
          production_house?: string
          prop_id?: number | null
          prop_title?: string
          quantity?: number
          reference_image_urls?: string[]
          request_code: string
          request_type?: string
          shoot_location?: string
          shoot_start_date?: string | null
          shoot_wrap_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_person?: string
          created_at?: string
          custom_description?: string
          id?: number
          notes?: string | null
          phone?: string
          production_house?: string
          prop_id?: number | null
          prop_title?: string
          quantity?: number
          reference_image_urls?: string[]
          request_code?: string
          request_type?: string
          shoot_location?: string
          shoot_start_date?: string | null
          shoot_wrap_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_requests_prop_id_fkey"
            columns: ["prop_id"]
            isOneToOne: false
            referencedRelation: "props"
            referencedColumns: ["id"]
          },
        ]
      }
      props: {
        Row: {
          category_id: number | null
          category_slug: string
          condition_rating: string
          created_at: string
          daily_rate: number
          description: string
          description_specs: string
          genre_tags: string[]
          godown_id: number | null
          id: number
          image_urls: string[]
          qr_code_id: string
          rack_id: number | null
          replacement_value: number
          security_deposit: number
          serial_number: string
          status: string
          title: string
          updated_at: string
          video_preview_url: string | null
          weekly_rate: number
        }
        Insert: {
          category_id?: number | null
          category_slug: string
          condition_rating?: string
          created_at?: string
          daily_rate?: number
          description?: string
          description_specs?: string
          genre_tags?: string[]
          godown_id?: number | null
          id?: number
          image_urls?: string[]
          qr_code_id?: string
          rack_id?: number | null
          replacement_value?: number
          security_deposit?: number
          serial_number: string
          status?: string
          title: string
          updated_at?: string
          video_preview_url?: string | null
          weekly_rate?: number
        }
        Update: {
          category_id?: number | null
          category_slug?: string
          condition_rating?: string
          created_at?: string
          daily_rate?: number
          description?: string
          description_specs?: string
          genre_tags?: string[]
          godown_id?: number | null
          id?: number
          image_urls?: string[]
          qr_code_id?: string
          rack_id?: number | null
          replacement_value?: number
          security_deposit?: number
          serial_number?: string
          status?: string
          title?: string
          updated_at?: string
          video_preview_url?: string | null
          weekly_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "props_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "props_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "props_rack_id_fkey"
            columns: ["rack_id"]
            isOneToOne: false
            referencedRelation: "racks"
            referencedColumns: ["id"]
          },
        ]
      }
      racks: {
        Row: {
          created_at: string
          godown_id: number
          id: number
          rack_name: string
        }
        Insert: {
          created_at?: string
          godown_id: number
          id?: number
          rack_name: string
        }
        Update: {
          created_at?: string
          godown_id?: number
          id?: number
          rack_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "racks_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_orders: {
        Row: {
          actual_days_used: number | null
          actual_return_date: string | null
          advance_received: number
          balance_payable: number
          client_name: string
          created_at: string
          dispatch_date: string
          estimated_days: number
          estimated_return_date: string
          estimated_total: number
          id: number
          items: Json
          notes: string | null
          order_number: string
          order_status: string
          phone_number: string
          production_house: string
          security_deposit: number
          shoot_location: string
          total_final_amount: number
          updated_at: string
        }
        Insert: {
          actual_days_used?: number | null
          actual_return_date?: string | null
          advance_received?: number
          balance_payable?: number
          client_name?: string
          created_at?: string
          dispatch_date: string
          estimated_days?: number
          estimated_return_date: string
          estimated_total?: number
          id?: number
          items?: Json
          notes?: string | null
          order_number: string
          order_status?: string
          phone_number?: string
          production_house?: string
          security_deposit?: number
          shoot_location?: string
          total_final_amount?: number
          updated_at?: string
        }
        Update: {
          actual_days_used?: number | null
          actual_return_date?: string | null
          advance_received?: number
          balance_payable?: number
          client_name?: string
          created_at?: string
          dispatch_date?: string
          estimated_days?: number
          estimated_return_date?: string
          estimated_total?: number
          id?: number
          items?: Json
          notes?: string | null
          order_number?: string
          order_status?: string
          phone_number?: string
          production_house?: string
          security_deposit?: number
          shoot_location?: string
          total_final_amount?: number
          updated_at?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
