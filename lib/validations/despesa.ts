import { z } from 'zod'

export const despesaSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  tipo: z.enum(['imposto', 'compromisso'], {
    message: 'Tipo deve ser "imposto" ou "compromisso"'
  }),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  dia_vencimento: z.number().int().min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31'),
  recorrente: z.boolean().default(true),
  mes_referencia: z.number().int().min(1).max(12).nullable().optional(),
  ano_referencia: z.number().int().min(2000).nullable().optional(),
  ativa: z.boolean().default(true),
}).refine(
  (data) => {
    if (!data.recorrente) {
      return data.mes_referencia !== null && data.mes_referencia !== undefined &&
             data.ano_referencia !== null && data.ano_referencia !== undefined
    }
    return true
  },
  {
    message: 'Despesas não recorrentes devem ter mês e ano de referência',
    path: ['mes_referencia']
  }
)

export type DespesaInput = z.infer<typeof despesaSchema>
