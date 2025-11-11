import { z } from 'zod'

export const socioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (formato: 000.000.000-00)'),
  percentual_participacao: z.number().min(0).max(100, 'Percentual deve estar entre 0 e 100'),
})

export type SocioInput = z.infer<typeof socioSchema>
