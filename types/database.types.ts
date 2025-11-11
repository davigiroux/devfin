export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nome_completo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nome_completo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome_completo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      socios: {
        Row: {
          id: string
          nome: string
          cpf: string
          percentual_participacao: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cpf: string
          percentual_participacao: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cpf?: string
          percentual_participacao?: number
          created_at?: string
          updated_at?: string
        }
      }
      faturamentos: {
        Row: {
          id: string
          data: string
          valor_bruto: number
          irpj: number
          csll: number
          pis: number
          cofins: number
          total_impostos: number
          usuario_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          data: string
          valor_bruto: number
          irpj: number
          csll: number
          pis: number
          cofins: number
          total_impostos: number
          usuario_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          data?: string
          valor_bruto?: number
          irpj?: number
          csll?: number
          pis?: number
          cofins?: number
          total_impostos?: number
          usuario_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
