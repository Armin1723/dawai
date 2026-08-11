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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          store_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          store_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          model: string | null
          prompt: string
          provider: string
          response: string
          store_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          prompt: string
          provider?: string
          response: string
          store_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string
          provider?: string
          response?: string
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity: string
          entity_id: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          store_id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          store_id: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          store_id?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          store_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          store_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          store_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          blood_group: string | null
          city: string | null
          created_at: string
          credit_limit: number
          date_of_birth: string | null
          email: string | null
          id: string
          is_active: boolean
          loyalty_points: number
          name: string
          notes: string | null
          outstanding_balance: number
          phone: string | null
          pincode: string | null
          state: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          credit_limit?: number
          date_of_birth?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          loyalty_points?: number
          name: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          pincode?: string | null
          state?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          credit_limit?: number
          date_of_birth?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          loyalty_points?: number
          name?: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          pincode?: string | null
          state?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          designation: string | null
          emergency_contact: string | null
          employee_code: string | null
          id: string
          is_active: boolean
          joined_on: string | null
          phone: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          salary: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          id?: string
          is_active?: boolean
          joined_on?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          salary?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          id?: string
          is_active?: boolean
          joined_on?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          salary?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          frequency: string | null
          id: string
          is_recurring: boolean
          next_due_date: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          store_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          frequency?: string | null
          id?: string
          is_recurring?: boolean
          next_due_date?: string | null
          paid_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          frequency?: string | null
          id?: string
          is_recurring?: boolean
          next_due_date?: string | null
          paid_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          last_movement_at: string | null
          medicine_id: string
          quantity: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_movement_at?: string | null
          medicine_id: string
          quantity?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_movement_at?: string | null
          medicine_id?: string
          quantity?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          customer_id: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          pdf_url: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          store_id: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          pdf_url?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          pdf_url?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_sale"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string
          id: string
          medicine_id: string
          mrp: number
          purchase_price: number
          quantity: number
          received_date: string | null
          selling_price: number
          store_id: string
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date: string
          id?: string
          medicine_id: string
          mrp?: number
          purchase_price?: number
          quantity?: number
          received_date?: string | null
          selling_price?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string
          id?: string
          medicine_id?: string
          mrp?: number
          purchase_price?: number
          quantity?: number
          received_date?: string | null
          selling_price?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "medicine_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          barcode: string | null
          category_id: string | null
          composition: string | null
          created_at: string
          dosage_form: string | null
          generic_name: string | null
          gst_rate: number
          hsn_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_prescription_required: boolean
          location: string | null
          manufacturer_id: string | null
          max_stock: number | null
          min_stock: number
          mrp: number
          name: string
          purchase_price: number
          selling_price: number
          sku: string
          store_id: string
          strength: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          composition?: string | null
          created_at?: string
          dosage_form?: string | null
          generic_name?: string | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_prescription_required?: boolean
          location?: string | null
          manufacturer_id?: string | null
          max_stock?: number | null
          min_stock?: number
          mrp?: number
          name: string
          purchase_price?: number
          selling_price?: number
          sku: string
          store_id: string
          strength?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          composition?: string | null
          created_at?: string
          dosage_form?: string | null
          generic_name?: string | null
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_prescription_required?: boolean
          location?: string | null
          manufacturer_id?: string | null
          max_stock?: number | null
          min_stock?: number
          mrp?: number
          name?: string
          purchase_price?: number
          selling_price?: number
          sku?: string
          store_id?: string
          strength?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicines_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          severity: string
          store_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          severity?: string
          store_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          severity?: string
          store_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          purchase_order_id: string | null
          reference: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          store_id: string
          supplier_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          purchase_order_id?: string | null
          reference?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          purchase_order_id?: string | null
          reference?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          store_id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          id: string
          label: string
          module: string | null
        }
        Insert: {
          code: string
          id?: string
          label: string
          module?: string | null
        }
        Update: {
          code?: string
          id?: string
          label?: string
          module?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          customer_id: string | null
          doctor_name: string | null
          hospital: string | null
          id: string
          image_url: string | null
          notes: string | null
          refill_reminder: boolean
          store_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          doctor_name?: string | null
          hospital?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          refill_reminder?: boolean
          store_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          doctor_name?: string | null
          hospital?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          refill_reminder?: boolean
          store_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          batch_number: string | null
          cost_price: number
          created_at: string
          expiry_date: string | null
          gst_amount: number
          gst_rate: number
          id: string
          line_total: number
          medicine_id: string
          mrp: number
          purchase_order_id: string
          quantity: number
          received_quantity: number
          selling_price: number
          store_id: string
        }
        Insert: {
          batch_number?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          gst_amount?: number
          gst_rate?: number
          id?: string
          line_total?: number
          medicine_id: string
          mrp?: number
          purchase_order_id: string
          quantity?: number
          received_quantity?: number
          selling_price?: number
          store_id: string
        }
        Update: {
          batch_number?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          gst_amount?: number
          gst_rate?: number
          id?: string
          line_total?: number
          medicine_id?: string
          mrp?: number
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          selling_price?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          paid_amount: number
          po_number: string
          received_date: string | null
          status: Database["public"]["Enums"]["po_status"]
          store_id: string
          subtotal: number
          supplier_id: string | null
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          paid_amount?: number
          po_number: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          store_id: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          paid_amount?: number
          po_number?: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          store_id?: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          file_url: string | null
          format: string
          id: string
          period_end: string | null
          period_start: string | null
          store_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          format?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          store_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          format?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          store_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          batch_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          medicine_id: string | null
          processed_by: string | null
          quantity: number
          reason: string | null
          refund_amount: number
          return_type: string
          sale_id: string | null
          sale_item_id: string | null
          store_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          medicine_id?: string | null
          processed_by?: string | null
          quantity?: number
          reason?: string | null
          refund_amount?: number
          return_type?: string
          sale_id?: string | null
          sale_item_id?: string | null
          store_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          medicine_id?: string | null
          processed_by?: string | null
          quantity?: number
          reason?: string | null
          refund_amount?: number
          return_type?: string
          sale_id?: string | null
          sale_item_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "medicine_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "returns_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: Database["public"]["Enums"]["user_role"]
          description: string | null
          id: string
          label: string
        }
        Insert: {
          code: Database["public"]["Enums"]["user_role"]
          description?: string | null
          id?: string
          label: string
        }
        Update: {
          code?: Database["public"]["Enums"]["user_role"]
          description?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          batch_id: string | null
          cost_price: number
          created_at: string
          discount: number
          gst_amount: number
          gst_rate: number
          id: string
          line_total: number
          medicine_id: string
          quantity: number
          sale_id: string
          store_id: string
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          cost_price?: number
          created_at?: string
          discount?: number
          gst_amount?: number
          gst_rate?: number
          id?: string
          line_total?: number
          medicine_id: string
          quantity?: number
          sale_id: string
          store_id: string
          unit_price?: number
        }
        Update: {
          batch_id?: string | null
          cost_price?: number
          created_at?: string
          discount?: number
          gst_amount?: number
          gst_rate?: number
          id?: string
          line_total?: number
          medicine_id?: string
          quantity?: number
          sale_id?: string
          store_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "medicine_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_status"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string | null
          cost_of_goods: number
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          profit: number
          sale_number: string
          sold_at: string
          status: Database["public"]["Enums"]["sale_status"]
          store_id: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          cashier_id?: string | null
          cost_of_goods?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          profit?: number
          sale_number: string
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          store_id: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cashier_id?: string | null
          cost_of_goods?: number
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          profit?: number
          sale_number?: string
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          store_id?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          business_name: string | null
          created_at: string
          currency: string
          default_payment_method: Database["public"]["Enums"]["payment_method"]
          email: string | null
          expiry_alert_days: number
          gstin: string | null
          id: string
          invoice_footer: string | null
          invoice_prefix: string
          low_stock_threshold: number
          phone: string | null
          stock_method: string
          store_id: string
          tax_inclusive: boolean
          theme: string
          thermal_printer: boolean
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
          default_payment_method?: Database["public"]["Enums"]["payment_method"]
          email?: string | null
          expiry_alert_days?: number
          gstin?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string
          low_stock_threshold?: number
          phone?: string | null
          stock_method?: string
          store_id: string
          tax_inclusive?: boolean
          theme?: string
          thermal_printer?: boolean
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
          default_payment_method?: Database["public"]["Enums"]["payment_method"]
          email?: string | null
          expiry_alert_days?: number
          gstin?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string
          low_stock_threshold?: number
          phone?: string | null
          stock_method?: string
          store_id?: string
          tax_inclusive?: boolean
          theme?: string
          thermal_printer?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          currency: string
          email: string | null
          gstin: string | null
          id: string
          legal_name: string | null
          license_number: string | null
          logo_url: string | null
          name: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          gstin?: string | null
          id?: string
          legal_name?: string | null
          license_number?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          gstin?: string | null
          id?: string
          legal_name?: string | null
          license_number?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          pincode: string | null
          state: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          pincode?: string | null
          state?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          pincode?: string | null
          state?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_inventory_status: {
        Row: {
          barcode: string | null
          category_id: string | null
          category_name: string | null
          current_stock: number | null
          earliest_expiry: string | null
          expiry_status: string | null
          generic_name: string | null
          gst_rate: number | null
          is_active: boolean | null
          location: string | null
          medicine_id: string | null
          min_stock: number | null
          mrp: number | null
          name: string | null
          purchase_price: number | null
          selling_price: number | null
          sku: string | null
          stock_status: string | null
          stock_value: number | null
          store_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicines_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_store_id: { Args: never; Returns: string }
      create_purchase_order: {
        Args: {
          p_created_by: string
          p_discount?: number
          p_items: Json
          p_notes?: string
          p_store_id: string
          p_supplier_id: string
        }
        Returns: Json
      }
      create_sale:
        | {
            Args: {
              p_amount_received: number
              p_cashier_id: string
              p_customer_id: string
              p_discount: number
              p_items: Json
              p_notes: string
              p_payment_method: Database["public"]["Enums"]["payment_method"]
              p_store_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount_received: number
              p_cashier_id: string
              p_customer_id: string
              p_discount: number
              p_items: Json
              p_notes: string
              p_payment_method: Database["public"]["Enums"]["payment_method"]
              p_payments?: Json
              p_store_id: string
            }
            Returns: Json
          }
      create_sale_return: {
        Args: {
          p_items: Json
          p_processed_by: string
          p_refund_method?: Database["public"]["Enums"]["payment_method"]
          p_refund_note?: string
          p_sale_id: string
          p_store_id: string
        }
        Returns: Json
      }
      generate_due_expenses: {
        Args: { p_processed_by: string; p_store_id: string }
        Returns: Json
      }
      receive_purchase_order: {
        Args: { p_items: Json; p_po_id: string; p_store_id: string }
        Returns: Json
      }
      record_customer_payment: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_notes?: string
          p_reference?: string
          p_store_id: string
        }
        Returns: Json
      }
      record_supplier_payment: {
        Args: {
          p_amount: number
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_notes?: string
          p_po_id: string
          p_reference?: string
          p_store_id: string
        }
        Returns: Json
      }
      refresh_inventory_for_medicine: {
        Args: { p_medicine_id: string }
        Returns: undefined
      }
      select_sale_batches: {
        Args: { p_fifo?: boolean; p_medicine_id: string; p_quantity: number }
        Returns: {
          allocated: number
          batch_id: string
          batch_number: string
          expiry_date: string
          unit_cost: number
        }[]
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_entity: string
          p_entity_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      payment_method: "cash" | "upi" | "card" | "credit" | "bank_transfer"
      payment_status: "pending" | "paid" | "partial" | "overdue" | "refunded"
      po_status: "draft" | "ordered" | "received" | "partial" | "cancelled"
      sale_status: "completed" | "held" | "void" | "returned"
      user_role:
        | "owner"
        | "administrator"
        | "manager"
        | "cashier"
        | "pharmacist"
        | "inventory_staff"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      payment_method: ["cash", "upi", "card", "credit", "bank_transfer"],
      payment_status: ["pending", "paid", "partial", "overdue", "refunded"],
      po_status: ["draft", "ordered", "received", "partial", "cancelled"],
      sale_status: ["completed", "held", "void", "returned"],
      user_role: [
        "owner",
        "administrator",
        "manager",
        "cashier",
        "pharmacist",
        "inventory_staff",
      ],
    },
  },
} as const
