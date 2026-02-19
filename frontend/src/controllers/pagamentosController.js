import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCreatePayload,
  buildUpdatePayload,
  defaultFilters,
  defaultForm,
  parseCurrency,
  toInputDate,
} from '../models/pagamentoModel.js'
import { clearAuth, loadAuth, saveAuth } from '../models/authModel.js'
import {
  alterarStatus,
  buscarPagamento,
  criarPagamento,
  deletarPagamento,
  editarPagamento,
  listarHistorico,
  listarPagamentos,
} from '../services/pagamentosService.js'
import { mapApiToForm } from '../models/pagamentoModel.js'
import { listarReferenciasCached } from '../services/referenciasService.js'

export function usePagamentosController() {
  const [auth, setAuth] = useState(loadAuth())
  const [authModalOpen, setAuthModalOpen] = useState(!auth)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState(defaultFilters)
  const [pagamentos, setPagamentos] = useState([])
  const [references, setReferences] = useState({
    setores: [],
    despesas: [],
    sedes: [],
    dotacoes: [],
    empresas: [],
    fornecedores: [],
    colaboradores: [],
  })
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
  })
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal] = useState({ open: false, mode: 'create' })
  const [form, setForm] = useState(defaultForm)
  const [originalStatus, setOriginalStatus] = useState(defaultForm.status)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageCache, setPageCache] = useState({})
  const [prefetchCache, setPrefetchCache] = useState({})
  const fetchAbortRef = useRef(null)
  const requestIdRef = useRef(0)

  const totalValue = useMemo(() => {
    return pagamentos.reduce((sum, pagamento) => {
      const valor = typeof pagamento.valorTotal === 'number' ? pagamento.valorTotal : parseCurrency(pagamento.valorTotal)
      return sum + (valor || 0)
    }, 0)
  }, [pagamentos])

  const selectedPagamento = useMemo(() => {
    if (!selectedId) return null
    return pagamentos.find((item) => item.id === selectedId) || null
  }, [pagamentos, selectedId])

  const canPaginateNext = pageInfo.number + 1 < pageInfo.totalPages
  const canPaginatePrev = pageInfo.number > 0

  const showError = (message) => {
    setError(message)
    setTimeout(() => setError(''), 4000)
  }

  const handleAuthSave = async (credentials) => {
    const username = credentials?.username?.trim()
    const password = credentials?.password
    if (!username || !password) {
      showError('Informe usuÃ¡rio e senha.')
      return
    }
    const cleaned = { username, password }
    saveAuth(cleaned)
    setAuth(cleaned)
    setAuthModalOpen(false)
    setPageCache({})
    setPrefetchCache({})
    await Promise.all([
      fetchPagamentos({ pageNumber: 0, authOverride: cleaned }),
      fetchReferencias(cleaned),
    ])
  }

  const handleAuthClear = () => {
    clearAuth()
    setAuth(null)
    setAuthModalOpen(true)
    setPageCache({})
    setPrefetchCache({})
  }

  const fetchPagamentos = async ({ pageNumber, authOverride, filtersOverride, skipCache } = {}) => {
    const authData = authOverride || auth
    if (!authData) {
      setAuthModalOpen(true)
      return
    }

    const activeFilters = filtersOverride || filters
    if (filtersOverride) {
      setFilters(filtersOverride)
      setPrefetchCache({})
      setPageCache({})
    }

    const targetPage = pageNumber ?? pageInfo.number
    if (!skipCache && !filtersOverride) {
      const cached = pageCache[targetPage]
      if (cached) {
        setPagamentos(cached.content ?? [])
        setPageInfo({
          number: cached.number ?? targetPage,
          size: cached.size ?? pageInfo.size,
          totalPages: cached.totalPages ?? 0,
          totalElements: cached.totalElements ?? 0,
        })
        prefetchNextPage(authData, activeFilters, {
          number: cached.number ?? targetPage,
          size: cached.size ?? pageInfo.size,
          totalPages: cached.totalPages ?? 0,
        })
        return
      }
    }

    const requestId = ++requestIdRef.current
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort()
    }
    const controller = new AbortController()
    fetchAbortRef.current = controller
    setLoading(true)
    try {
      const data = await listarPagamentos(authData, activeFilters, {
        number: targetPage,
        size: pageInfo.size,
      }, controller.signal)
      if (requestId !== requestIdRef.current) return
      setPagamentos(data.content ?? [])
      setPageInfo({
        number: data.number ?? 0,
        size: data.size ?? pageInfo.size,
        totalPages: data.totalPages ?? 0,
        totalElements: data.totalElements ?? 0,
      })
      setPageCache((prev) => ({ ...prev, [data.number ?? targetPage]: data }))
      prefetchNextPage(authData, activeFilters, {
        number: data.number ?? 0,
        size: data.size ?? pageInfo.size,
        totalPages: data.totalPages ?? 0,
      })
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invÃ¡lidas.')
      } else {
        showError(err.message || 'Erro ao carregar pagamentos.')
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  const fetchReferencias = async (authOverride) => {
    const authData = authOverride || auth
    if (!authData) return

    try {
      const bundle = await listarReferenciasCached(authData)
      setReferences({
        setores: bundle?.setores || [],
        despesas: bundle?.despesas || [],
        sedes: bundle?.sedes || [],
        dotacoes: bundle?.dotacoes || [],
        empresas: bundle?.empresas || [],
        fornecedores: bundle?.fornecedores || [],
        colaboradores: bundle?.colaboradores || [],
      })
    } catch (err) {
      showError(err.message || 'Erro ao carregar referÃªncias.')
    }
  }

  const prefetchNextPage = async (authData, activeFilters, info) => {
    if (!authData) return
    if (!info || info.number === undefined || info.totalPages === undefined) return
    const nextPage = info.number + 1
    if (nextPage >= info.totalPages) return
    if (prefetchCache[nextPage] || pageCache[nextPage]) return
    try {
      const data = await listarPagamentos(authData, activeFilters, {
        number: nextPage,
        size: info.size,
      })
      setPrefetchCache((prev) => ({ ...prev, [nextPage]: data }))
      setPageCache((prev) => ({ ...prev, [nextPage]: data }))
    } catch {
      // ignore prefetch errors
    }
  }

  useEffect(() => {
    if (auth) {
      fetchPagamentos({ pageNumber: 0 })
      fetchReferencias(auth)
    }
  }, [auth])

  const applyFilters = async () => {
    await fetchPagamentos({ pageNumber: 0, filtersOverride: { ...filters } })
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
  }

  const applyQuickFilter = async (range) => {
    const today = new Date()
    let start = today
    let end = today

    if (range === 'semana') {
      const day = today.getDay()
      const diff = day === 0 ? 6 : day - 1
      start = new Date(today)
      start.setDate(today.getDate() - diff)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    }

    if (range === 'mes') {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    }

    if (range === 'ultimos30') {
      start = new Date(today)
      start.setDate(today.getDate() - 29)
      end = new Date(today)
    }

    const nextFilters = {
      ...filters,
      de: toInputDate(start),
      ate: toInputDate(end),
    }
    await fetchPagamentos({ pageNumber: 0, filtersOverride: nextFilters })
  }

  const toggleFilters = () => setIsFiltersOpen((prev) => !prev)

  const openCreateModal = () => {
    setModal({ open: true, mode: 'create' })
    const defaultColaborador = resolveColaboradorFromAuth(auth, references)
    setForm({ ...defaultForm, colaborador: defaultColaborador })
    setOriginalStatus(defaultForm.status)
    setError('')
  }

  const openEditModal = async (pagamentoOverride) => {
    const pagamento = pagamentoOverride || selectedPagamento
    if (!pagamento) {
      showError('Selecione um lançamento para editar.')
      return
    }
    if (pagamento.status === 'PAGO') {
      showError('Pagamento pago não pode ser editado.')
      return
    }
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    setLoading(true)
    try {
      setSelectedId(pagamento.id)
      const detalhes = await buscarPagamento(auth, pagamento.id)
      setModal({ open: true, mode: 'edit' })
      const mapped = mapApiToForm(detalhes)
      setForm(mapped)
      setOriginalStatus(mapped.status)
      setError('')
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais inválidas.')
      } else {
        showError(err.message || 'Erro ao carregar lançamento.')
      }
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setModal({ open: false, mode: modal.mode })
    setError('')
  }

  const openHistoryModal = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!selectedPagamento) {
      showError('Selecione um lanÃ§amento para ver o histÃ³rico.')
      return
    }

    setHistoryModalOpen(true)
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await listarHistorico(auth, selectedPagamento.id)
      setHistoryItems(data || [])
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        setHistoryModalOpen(false)
        showError('Credenciais invÃ¡lidas.')
      } else {
        setHistoryError(err.message || 'Erro ao carregar histÃ³rico.')
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeHistoryModal = () => {
    setHistoryModalOpen(false)
    setHistoryItems([])
    setHistoryError('')
  }

  const updateForm = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'setor') {
        next.despesa = ''
      }
      if (key === 'dotacao') {
        next.rateios = []
        next.empresaFornecedor = ''
      }
      return next
    })
  }

  const updateFilters = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const validateForm = () => {
    if (
      !form.dtPagamento ||
      !form.dtVencimento ||
      !form.sede ||
      !form.colaborador ||
      !form.setor ||
      !form.despesa ||
      !form.dotacao ||
      !form.setorPagamento
    ) {
      showError('Preencha os campos obrigatÃ³rios.')
      return false
    }
    if (form.dtVencimento < form.dtPagamento) {
      showError('Vencimento nÃ£o pode ser anterior ao pagamento.')
      return false
    }
    const dotacao = form.dotacao?.toLowerCase()
    const exigeEmpresaFornecedor =
      dotacao === 'empresa' || dotacao === 'fornecedor' || dotacao === 'empr/fornecedor' || dotacao === 'empresa/fornecedor'
    if (!parseCurrency(form.valorTotal)) {
      showError('Informe o valor total.')
      return false
    }
    const rateioSum = Array.isArray(form.rateios)
      ? form.rateios.reduce((sum, item) => sum + parseCurrency(item.valor), 0)
      : 0
    const total = parseCurrency(form.valorTotal)
    if (rateioSum > 0 && rateioSum !== total) {
      showError('Soma do rateio deve ser igual ao valor total.')
      return false
    }
    if (exigeEmpresaFornecedor && !form.empresaFornecedor && rateioSum === 0) {
      showError('Distribua o rateio para empresa/fornecedor.')
      return false
    }
    return true
  }

  const savePagamento = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }

    if (!validateForm()) return

    setLoading(true)
    try {
      if (modal.mode === 'create') {
        const payload = buildCreatePayload(form)
        await criarPagamento(auth, payload)
      } else if (selectedPagamento) {
        const payload = buildUpdatePayload(form)
        await editarPagamento(auth, selectedPagamento.id, payload)
        if (form.status && form.status !== originalStatus) {
          await alterarStatus(auth, selectedPagamento.id, form.status)
        }
      }

      setModal({ open: false, mode: modal.mode })
      setPageCache({})
      setPrefetchCache({})
      await fetchPagamentos({ pageNumber: pageInfo.number, skipCache: true })
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invÃ¡lidas.')
      } else {
        showError(err.message || 'Erro ao salvar pagamento.')
      }
    } finally {
      setLoading(false)
    }
  }

  const removePagamento = async (pagamentoOverride) => {
    const pagamento = pagamentoOverride || selectedPagamento
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!pagamento) {
      showError('Selecione um lançamento para excluir.')
      return
    }
    if (pagamento.status === 'PAGO') {
      showError('Pagamento pago não pode ser excluído.')
      return
    }

    setLoading(true)
    try {
      await deletarPagamento(auth, pagamento.id)
      setSelectedId(null)
      setModal({ open: false, mode: modal.mode })
      setPageCache({})
      setPrefetchCache({})
      await fetchPagamentos({ pageNumber: 0, skipCache: true })
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais inválidas.')
      } else {
        showError(err.message || 'Erro ao excluir pagamento.')
      }
    } finally {
      setLoading(false)
    }
  }

  const goNextPage = async () => {
    if (!canPaginateNext) return
    const nextPage = pageInfo.number + 1
    const cached = prefetchCache[nextPage] || pageCache[nextPage]
    if (cached) {
      setPagamentos(cached.content ?? [])
      setPageInfo({
        number: cached.number ?? nextPage,
        size: cached.size ?? pageInfo.size,
        totalPages: cached.totalPages ?? pageInfo.totalPages,
        totalElements: cached.totalElements ?? pageInfo.totalElements,
      })
      setPageCache((prev) => ({ ...prev, [cached.number ?? nextPage]: cached }))
      setPrefetchCache((prev) => {
        const copy = { ...prev }
        delete copy[nextPage]
        return copy
      })
      prefetchNextPage(auth, filters, {
        number: cached.number ?? nextPage,
        size: cached.size ?? pageInfo.size,
        totalPages: cached.totalPages ?? pageInfo.totalPages,
      })
      return
    }
    await fetchPagamentos({ pageNumber: nextPage })
  }

  const goPrevPage = async () => {
    if (!canPaginatePrev) return
    const prevPage = pageInfo.number - 1
    const cached = pageCache[prevPage]
    if (cached) {
      setPagamentos(cached.content ?? [])
      setPageInfo({
        number: cached.number ?? prevPage,
        size: cached.size ?? pageInfo.size,
        totalPages: cached.totalPages ?? pageInfo.totalPages,
        totalElements: cached.totalElements ?? pageInfo.totalElements,
      })
      return
    }
    await fetchPagamentos({ pageNumber: prevPage })
  }

  return {
    auth,
    authModalOpen,
    isFiltersOpen,
    filters,
    pagamentos,
    pageInfo,
    selectedId,
    selectedPagamento,
    modal,
    form,
    historyModalOpen,
    historyItems,
    historyLoading,
    historyError,
    loading,
    error,
    totalValue,
    references,
    prefetchCache,
    canPaginateNext,
    canPaginatePrev,
    setSelectedId,
    setAuthModalOpen,
    handleAuthSave,
    handleAuthClear,
    fetchPagamentos,
    fetchReferencias,
    applyFilters,
    clearFilters,
    applyQuickFilter,
    toggleFilters,
    openCreateModal,
    openEditModal,
    openHistoryModal,
    closeModal,
    closeHistoryModal,
    updateForm,
    updateFilters,
    savePagamento,
    removePagamento,
    goNextPage,
    goPrevPage,
  }
}

function resolveColaboradorFromAuth(auth, references) {
  const username = auth?.username?.trim().toLowerCase()
  if (!username) return ''
  const colaboradores = references?.colaboradores || []
  const match = colaboradores.find((item) => {
    if (!item) return false
    const nome = item.nome?.trim().toLowerCase()
    const email = item.email?.trim().toLowerCase()
    return nome === username || email === username
  })
  return match?.nome || ''
}

