import { renderHook, act, waitFor } from '@testing-library/react'
import { useClipboard } from '@/hooks/useClipboard'

describe('useClipboard', () => {
  let writeTextMock: jest.Mock

  beforeEach(() => {
    // Mock navigator.clipboard.writeText
    writeTextMock = jest.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('deve inicializar com estado padrão', () => {
    const { result } = renderHook(() => useClipboard())

    expect(result.current.copying).toBe(false)
    expect(result.current.success).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('deve copiar texto com sucesso', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copyToClipboard('Teste de cópia')
    })

    expect(writeTextMock).toHaveBeenCalledWith('Teste de cópia')
    expect(result.current.copying).toBe(false)
    expect(result.current.success).toBe(true)
    expect(result.current.error).toBe(null)
  })

  it('deve definir copying como true durante operação', async () => {
    let resolvePromise: (value?: unknown) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    writeTextMock.mockReturnValue(promise)

    const { result } = renderHook(() => useClipboard())

    act(() => {
      result.current.copyToClipboard('Teste')
    })

    // Durante a operação
    expect(result.current.copying).toBe(true)

    // Resolve a promise
    await act(async () => {
      resolvePromise!()
      await promise
    })

    // Após completar
    expect(result.current.copying).toBe(false)
  })

  it('deve resetar success após 2 segundos', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copyToClipboard('Teste')
    })

    expect(result.current.success).toBe(true)

    // Avança 2 segundos
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.success).toBe(false)
  })

  it('não deve resetar success antes de 2 segundos', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copyToClipboard('Teste')
    })

    expect(result.current.success).toBe(true)

    // Avança apenas 1 segundo
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.success).toBe(true)
  })

  it('deve lidar com erro ao copiar', async () => {
    writeTextMock.mockRejectedValue(new Error('Clipboard API falhou'))
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copyToClipboard('Teste')
    })

    expect(result.current.copying).toBe(false)
    expect(result.current.success).toBe(false)
    expect(result.current.error).toBe('Erro ao copiar para área de transferência')
  })

  it('deve limpar erro ao tentar copiar novamente', async () => {
    // Primeira tentativa falha
    writeTextMock.mockRejectedValueOnce(new Error('Erro'))
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copyToClipboard('Teste1')
    })

    expect(result.current.error).toBe('Erro ao copiar para área de transferência')

    // Segunda tentativa com sucesso
    writeTextMock.mockResolvedValue(undefined)

    await act(async () => {
      await result.current.copyToClipboard('Teste2')
    })

    expect(result.current.error).toBe(null)
    expect(result.current.success).toBe(true)
  })

  it('deve limpar success ao copiar novamente antes do reset', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClipboard())

    // Primeira cópia
    await act(async () => {
      await result.current.copyToClipboard('Teste1')
    })

    expect(result.current.success).toBe(true)

    // Segunda cópia antes dos 2 segundos
    await act(async () => {
      await result.current.copyToClipboard('Teste2')
    })

    // Success deve permanecer true após a segunda cópia
    expect(result.current.success).toBe(true)
  })

  it('deve limpar timeout antigo ao copiar novamente', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClipboard())

    // Primeira cópia
    await act(async () => {
      await result.current.copyToClipboard('Teste1')
    })

    // Avança 1 segundo
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Segunda cópia (deve limpar o timeout anterior)
    await act(async () => {
      await result.current.copyToClipboard('Teste2')
    })

    // Avança mais 1 segundo (total 2s desde primeira cópia, mas 1s desde segunda)
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Success ainda deve ser true (timeout anterior foi limpo)
    expect(result.current.success).toBe(true)

    // Avança mais 1 segundo (agora são 2s desde a segunda cópia)
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Agora success deve ser false
    expect(result.current.success).toBe(false)
  })

  it('deve limpar timeout ao desmontar componente', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result, unmount } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copyToClipboard('Teste')
    })

    expect(result.current.success).toBe(true)

    // Desmonta o componente
    unmount()

    // Avança 2 segundos (timeout deveria ter sido limpo)
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // Se chegou até aqui sem erro, o cleanup funcionou corretamente
  })

  it('deve copiar texto vazio', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClipboard())

    await act(async () => {
      await result.current.copyToClipboard('')
    })

    expect(writeTextMock).toHaveBeenCalledWith('')
    expect(result.current.success).toBe(true)
  })

  it('deve copiar texto com caracteres especiais', async () => {
    writeTextMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClipboard())

    const textoEspecial = 'Teste\ncom\nquebras\nde\nlinha\ne\ttabs\n\nR$ 1.234,56'

    await act(async () => {
      await result.current.copyToClipboard(textoEspecial)
    })

    expect(writeTextMock).toHaveBeenCalledWith(textoEspecial)
    expect(result.current.success).toBe(true)
  })
})
