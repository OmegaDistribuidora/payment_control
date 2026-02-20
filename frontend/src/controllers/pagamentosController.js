import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCreatePayload,
  buildUpdatePayload,
  defaultFilters,
  defaultForm,
  mapApiToForm,
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
  somarPagamentos,
} from '../services/pagamentosService.js'
import {
  listarReferencias,
  listarReferenciasCached,
  saveCachedReferencias,
  salvarSetorConfig,
} from '../services/referenciasService.js'

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
    setorDespesas: {},
  })
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
  })
  const [viewMode, setViewMode] = useState('cards')
  const [spreadsheetRows, setSpreadsheetRows] = useState([])
  const [spreadsheetLoading, setSpreadsheetLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal] = useState({ open: false, mode: 'create' })
  const [setorModalOpen, setSetorModalOpen] = useState(false)
  const [setorForm, setSetorForm] = useState({ nome: '', despesas: [] })
  const [form, setForm] = useState(defaultForm)
  const [originalStatus, setOriginalStatus] = useState(defaultForm.status)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalValue, setTotalValue] = useState(0)
  const [pageCache, setPageCache] = useState({})
  const [prefetchCache, setPrefetchCache] = useState({})
  const fetchAbortRef = useRef(null)
  const requestIdRef = useRef(0)

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

  const applyReferenceBundle = (bundle) => {
    const next = {
      setores: bundle?.setores || [],
      despesas: bundle?.despesas || [],
      sedes: bundle?.sedes || [],
      dotacoes: bundle?.dotacoes || [],
      empresas: bundle?.empresas || [],
      fornecedores: bundle?.fornecedores || [],
      colaboradores: bundle?.colaboradores || [],
      setorDespesas: bundle?.setorDespesas || {},
    }
    setReferences(next)
    return next
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
      const data = await listarPagamentos(
        authData,
        activeFilters,
        {
          number: targetPage,
          size: pageInfo.size,
        },
        controller.signal
      )
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
      const totalResponse = await somarPagamentos(authData, activeFilters, controller.signal)
      if (requestId !== requestIdRef.current) return
      setTotalValue(parseCurrency(totalResponse?.total))
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao carregar pagamentos.')
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  const fetchSpreadsheetRows = async ({ authOverride, filtersOverride } = {}) => {
    const authData = authOverride || auth
    if (!authData) {
      setAuthModalOpen(true)
      return
    }

    const activeFilters = filtersOverride || filters
    setSpreadsheetLoading(true)
    try {
      const firstPage = await listarPagamentos(authData, activeFilters, {
        number: 0,
        size: 200,
      })
      const totalPages = firstPage?.totalPages ?? 0
      const allRows = [...(firstPage?.content || [])]

      for (let page = 1; page < totalPages; page += 1) {
        const pageData = await listarPagamentos(authData, activeFilters, {
          number: page,
          size: 200,
        })
        allRows.push(...(pageData?.content || []))
      }

      setSpreadsheetRows(allRows)
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao carregar planilha.')
      }
    } finally {
      setSpreadsheetLoading(false)
    }
  }

  const fetchReferencias = async (authOverride) => {
    const authData = authOverride || auth
    if (!authData) return

    try {
      const bundle = await listarReferenciasCached(authData)
      applyReferenceBundle(bundle)
    } catch (err) {
      showError(err.message || 'Erro ao carregar referencias.')
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

  const refreshVisibleData = async (targetPage = 0) => {
    await fetchPagamentos({ pageNumber: targetPage, skipCache: true })
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows()
    }
  }

  const handleAuthSave = async (credentials) => {
    const username = credentials?.username?.trim()
    const password = credentials?.password
    if (!username || !password) {
      showError('Informe usuario e senha.')
      return
    }
    const cleaned = { username, password }
    setLoading(true)
    try {
      const bundle = await listarReferencias(cleaned)
      applyReferenceBundle(bundle)
      saveCachedReferencias(bundle)

      saveAuth(cleaned)
      setAuth(cleaned)
      setAuthModalOpen(false)
      setPageCache({})
      setPrefetchCache({})

      await fetchPagamentos({ pageNumber: 0, authOverride: cleaned, skipCache: true })
      if (viewMode === 'spreadsheet') {
        await fetchSpreadsheetRows({ authOverride: cleaned })
      }
    } catch (err) {
      clearAuth()
      setAuth(null)
      setAuthModalOpen(true)
      if (err?.status === 401) {
        showError('Credenciais invalidas.')
      } else {
        showError(err?.message || 'Nao foi possivel autenticar no backend.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAuthClear = () => {
    clearAuth()
    setAuth(null)
    setAuthModalOpen(true)
    setSetorModalOpen(false)
    setTotalValue(0)
    setPageCache({})
    setPrefetchCache({})
    setSpreadsheetRows([])
    setViewMode('cards')
  }

  useEffect(() => {
    if (auth) {
      fetchPagamentos({ pageNumber: 0 })
      fetchReferencias(auth)
    }
  }, [auth])

  const applyFilters = async () => {
    const nextFilters = { ...filters }
    await fetchPagamentos({ pageNumber: 0, filtersOverride: nextFilters })
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows({ filtersOverride: nextFilters })
    }
  }

  const clearFilters = async () => {
    const nextFilters = { ...defaultFilters }
    setFilters(nextFilters)
    await fetchPagamentos({ pageNumber: 0, filtersOverride: nextFilters })
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows({ filtersOverride: nextFilters })
    }
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

    if (range === 'mesAnterior') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
    }

    if (range === 'anoAtual') {
      start = new Date(today.getFullYear(), 0, 1)
      end = new Date(today.getFullYear(), 11, 31)
    }

    if (range === 'anoPassado') {
      start = new Date(today.getFullYear() - 1, 0, 1)
      end = new Date(today.getFullYear() - 1, 11, 31)
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
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows({ filtersOverride: nextFilters })
    }
  }

  const toggleFilters = () => setIsFiltersOpen((prev) => !prev)

  const toggleViewMode = async () => {
    const nextMode = viewMode === 'cards' ? 'spreadsheet' : 'cards'
    setViewMode(nextMode)
    if (nextMode === 'spreadsheet') {
      await fetchSpreadsheetRows()
    }
  }

  const openCreateModal = () => {
    setModal({ open: true, mode: 'create' })
    setForm({ ...defaultForm, colaborador: '' })
    setOriginalStatus(defaultForm.status)
    setError('')
  }

  const openSetorModal = () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (auth.username?.toLowerCase() !== 'admin') {
      showError('Somente admin pode configurar setores.')
      return
    }
    setSetorForm({ nome: '', despesas: [] })
    setSetorModalOpen(true)
    setError('')
  }

  const closeSetorModal = () => {
    setSetorModalOpen(false)
  }

  const updateSetorNome = (nome) => {
    setSetorForm((prev) => ({ ...prev, nome }))
  }

  const addSetorDespesa = (despesaRaw) => {
    const despesa = String(despesaRaw || '').trim()
    if (!despesa) return
    setSetorForm((prev) => {
      const atual = Array.isArray(prev.despesas) ? prev.despesas : []
      const norm = normalizeText(despesa)
      const existe = atual.some((item) => normalizeText(item) === norm)
      if (existe) return prev
      const despesas = [...atual, despesa].sort((a, b) => a.localeCompare(b, 'pt-BR'))
      return { ...prev, despesas }
    })
  }

  const removeSetorDespesa = (despesa) => {
    setSetorForm((prev) => ({
      ...prev,
      despesas: (prev.despesas || []).filter((item) => item !== despesa),
    }))
  }

  const saveSetor = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (auth.username?.toLowerCase() !== 'admin') {
      showError('Somente admin pode configurar setores.')
      return
    }

    const nome = setorForm.nome?.trim()
    const despesas = Array.isArray(setorForm.despesas)
      ? setorForm.despesas.filter((item) => Boolean(item?.trim()))
      : []

    if (!nome) {
      showError('Informe o nome do setor.')
      return
    }
    if (!despesas.length) {
      showError('Adicione ao menos uma despesa.')
      return
    }

    setLoading(true)
    try {
      const bundle = await salvarSetorConfig(auth, { nome, despesas })
      applyReferenceBundle(bundle)
      saveCachedReferencias(bundle)
      setSetorModalOpen(false)
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao salvar setor.')
      }
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = async (pagamentoOverride) => {
    const pagamento = pagamentoOverride || selectedPagamento
    if (!pagamento) {
      showError('Selecione um lancamento para editar.')
      return
    }
    if (pagamento.status === 'PAGO') {
      showError('Pagamento pago nao pode ser editado.')
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
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao carregar lancamento.')
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
      showError('Selecione um lancamento para ver o historico.')
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
        showError('Credenciais invalidas.')
      } else {
        setHistoryError(err.message || 'Erro ao carregar historico.')
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
      !form.dtVencimento ||
      !form.sede ||
      !form.colaborador ||
      !form.setor ||
      !form.despesa ||
      !form.dotacao ||
      !form.setorPagamento
    ) {
      showError('Preencha os campos obrigatorios.')
      return false
    }
    if (form.dtPagamento && form.dtVencimento && form.dtVencimento < form.dtPagamento) {
      showError('Vencimento nao pode ser anterior ao pagamento.')
      return false
    }
    const dotacao = form.dotacao?.toLowerCase()
    const exigeEmpresaFornecedor =
      dotacao === 'empresa' ||
      dotacao === 'fornecedor' ||
      dotacao === 'empr/fornecedor' ||
      dotacao === 'empresa/fornecedor'
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
      await refreshVisibleData(pageInfo.number)
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
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
      showError('Selecione um lancamento para excluir.')
      return
    }
    if (pagamento.status === 'PAGO') {
      showError('Pagamento pago nao pode ser excluido.')
      return
    }

    setLoading(true)
    try {
      await deletarPagamento(auth, pagamento.id)
      setSelectedId(null)
      setModal({ open: false, mode: modal.mode })
      setPageCache({})
      setPrefetchCache({})
      await refreshVisibleData(0)
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao excluir pagamento.')
      }
    } finally {
      setLoading(false)
    }
  }

  const marcarComoPago = async (pagamentoOverride) => {
    const pagamento = pagamentoOverride || selectedPagamento
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!pagamento) {
      showError('Selecione um lancamento para alterar status.')
      return
    }
    if (pagamento.status === 'PAGO') {
      showError('Este lancamento ja esta pago.')
      return
    }

    setLoading(true)
    try {
      await alterarStatus(auth, pagamento.id, 'PAGO')
      setPageCache({})
      setPrefetchCache({})
      await refreshVisibleData(pageInfo.number)
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao atualizar status.')
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

  const isAdmin = auth?.username?.toLowerCase() === 'admin'

  return {
    auth,
    isAdmin,
    authModalOpen,
    isFiltersOpen,
    filters,
    pagamentos,
    pageInfo,
    selectedId,
    selectedPagamento,
    viewMode,
    spreadsheetRows,
    spreadsheetLoading,
    modal,
    setorModalOpen,
    setorForm,
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
    fetchSpreadsheetRows,
    fetchReferencias,
    applyFilters,
    clearFilters,
    applyQuickFilter,
    toggleViewMode,
    toggleFilters,
    openCreateModal,
    openSetorModal,
    openEditModal,
    openHistoryModal,
    closeModal,
    closeSetorModal,
    closeHistoryModal,
    updateForm,
    updateFilters,
    updateSetorNome,
    addSetorDespesa,
    removeSetorDespesa,
    savePagamento,
    saveSetor,
    removePagamento,
    marcarComoPago,
    goNextPage,
    goPrevPage,
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
