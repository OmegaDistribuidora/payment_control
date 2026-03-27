import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCreatePayload,
  createDefaultForm,
  buildUpdatePayload,
  defaultFilters,
  defaultPasswordForm,
  defaultUserForm,
  mapApiToForm,
  parseCurrency,
  toInputDate,
} from '../models/pagamentoModel.js'
import { clearAuth, loadAuth, saveAuth } from '../models/authModel.js'
import {
  buscarPagamento,
  carregarRelatorioArvore,
  criarPagamento,
  deletarPagamento,
  editarPagamento,
  carregarRelatorioSedes,
  listarHistoricoGlobal,
  listarPagamentos,
  somarPagamentos,
} from '../services/pagamentosService.js'
import {
  editarDespesa,
  editarSetor,
  inativarDespesa,
  inativarEmpresa,
  inativarFornecedor,
  inativarSetor,
  listarDespesasGestao,
  listarEmpresasGestao,
  listarFornecedoresGestao,
  listarReferencias,
  listarReferenciasCached,
  listarSetoresGestao,
  saveCachedReferencias,
  salvarEmpresaFornecedorConfig,
  salvarDespesaConfig,
  salvarSetorConfig,
} from '../services/referenciasService.js'
import {
  atualizarUsuario,
  buscarMinhaSessao,
  criarUsuario,
  inativarUsuario,
  listarOpcoesLogin,
  listarUsuariosGestao,
  trocarMinhaSenha,
} from '../services/usuariosService.js'
import { apiRequest } from '../services/apiClient.js'
import {
  downloadPaymentsExcel,
  downloadPaymentsPdf,
  printPaymentsDocument,
} from '../utils/paymentExport.js'

const USER_PERMISSION_FIELDS = [
  'canViewReports',
  'canViewHistory',
  'canManageSetores',
  'canManageDespesas',
  'canManageEntities',
]

function readSsoTokenFromHash() {
  try {
    const hash = String(window.location.hash || '').replace(/^#/, '')
    if (!hash) return null
    const params = new URLSearchParams(hash)
    return params.get('sso')
  } catch {
    return null
  }
}

function clearSsoHash() {
  const { pathname, search } = window.location
  window.history.replaceState(null, '', `${pathname}${search}`)
}

function buildFiltersForRange(range, currentFilters = defaultFilters) {
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
  } else if (range === 'mes') {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  } else if (range === 'mesAnterior') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    end = new Date(today.getFullYear(), today.getMonth(), 0)
  } else if (range === 'anoAtual') {
    start = new Date(today.getFullYear(), 0, 1)
    end = new Date(today.getFullYear(), 11, 31)
  } else if (range === 'anoPassado') {
    start = new Date(today.getFullYear() - 1, 0, 1)
    end = new Date(today.getFullYear() - 1, 11, 31)
  } else if (range === 'ultimos30') {
    start = new Date(today)
    start.setDate(today.getDate() - 29)
    end = new Date(today)
  }

  if (range === 'personalizado') {
    return { ...currentFilters }
  }

  return {
    ...currentFilters,
    de: toInputDate(start),
    ate: toInputDate(end),
  }
}

function defaultSetorForm() {
  return {
    mode: 'create',
    nome: '',
    despesas: [],
    targetNome: '',
    novoNome: '',
  }
}

function defaultDespesaConfigForm() {
  return {
    mode: 'create',
    setor: '',
    despesa: '',
    targetNome: '',
    novoNome: '',
  }
}

function defaultEntityForm() {
  return {
    mode: 'create',
    tipo: 'empresa',
    nome: '',
    targetNome: '',
  }
}

function defaultTotalsSummary() {
  return {
    total: 0,
    totalEmpresa: 0,
    totalFornecedor: 0,
    totalFuncionario: 0,
  }
}

function defaultReportsViewState() {
  return {
    sedes: [],
    arvore: [],
    totalGeral: 0,
    totalEmpresa: 0,
    totalFornecedor: 0,
    totalFuncionario: 0,
  }
}

function defaultReportsTimelineState() {
  return {
    granularity: 'day',
    items: [],
  }
}

function defaultExportForm(currentFilters = defaultFilters, currentPreset = 'mes') {
  const base = buildFiltersForRange(currentPreset || 'mes', {
    ...defaultFilters,
    ...currentFilters,
  })
  return {
    periodPreset: currentPreset || 'mes',
    de: base.de || '',
    ate: base.ate || '',
    sede: currentFilters?.sede || '',
    setor: currentFilters?.setor || '',
    despesa: currentFilters?.despesa || '',
  }
}

function defaultReportExpenseDetailsState() {
  return {
    open: false,
    title: '',
    subtitle: '',
    sede: '',
    setor: '',
    despesa: '',
    items: [],
    totalElements: 0,
    loading: false,
    error: '',
  }
}

function calculateRangeDays(de, ate) {
  if (!de || !ate) return 31
  const start = new Date(`${de}T00:00:00`)
  const end = new Date(`${ate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 31
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
}

function monthKeyToLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number)
  if (!year || !month) return String(monthKey || '')
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
    .replace('.', '')
}

function buildTimelineSeries(rows, filters) {
  const rangeDays = calculateRangeDays(filters?.de, filters?.ate)
  const granularity = rangeDays <= 59 ? 'day' : 'month'
  const grouped = new Map()

  for (const item of rows || []) {
    const paymentDate = String(item?.dtPagamento || '').slice(0, 10)
    if (!paymentDate) continue
    const key = granularity === 'day' ? paymentDate : paymentDate.slice(0, 7)
    const current = grouped.get(key) || 0
    grouped.set(key, current + Number(item?.valorTotal || 0))
  }

  const items = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, total]) => ({
      key,
      label: granularity === 'day' ? formatDateForDocument(key) : monthKeyToLabel(key),
      total: Number(total.toFixed(2)),
    }))

  return { granularity, items }
}

function buildReportDetailMeta(detail, filters, username) {
  const despesa = detail?.despesa ? detail.despesa : 'Todas as despesas'
  return {
    titulo: detail?.despesa ? 'Lancamentos da despesa' : 'Lancamentos do total',
    visualizacao: 'Relatorios',
    periodo: `${filters?.de ? formatDateForDocument(filters.de) : '--/--/----'} ate ${filters?.ate ? formatDateForDocument(filters.ate) : '--/--/----'}`,
    sede: detail?.sede || 'Todas',
    setor: detail?.setor || 'Todos',
    despesa,
    usuario: username || '-',
  }
}

export function usePagamentosController() {
  const initialSsoToken = readSsoTokenFromHash()
  const [auth, setAuth] = useState(() => (initialSsoToken ? null : loadAuth()))
  const [authModalOpen, setAuthModalOpen] = useState(() => {
    const initialAuth = initialSsoToken ? null : loadAuth()
    return !initialAuth && !initialSsoToken
  })
  const [loginOptions, setLoginOptions] = useState([])
  const [currentPage, setCurrentPage] = useState('payments')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [periodPreset, setPeriodPreset] = useState('mes')
  const [filters, setFilters] = useState(() => buildFiltersForRange('mes', defaultFilters))
  const [pagamentos, setPagamentos] = useState([])
  const [references, setReferences] = useState({
    setores: [],
    despesas: [],
    sedes: [],
    dotacoes: [],
    empresas: [],
    fornecedores: [],
    colaboradores: [],
    usuarios: [],
    setorDespesas: {},
  })
  const [managedUsers, setManagedUsers] = useState([])
  const [managedSetores, setManagedSetores] = useState([])
  const [managedDespesas, setManagedDespesas] = useState([])
  const [managedEmpresas, setManagedEmpresas] = useState([])
  const [managedFornecedores, setManagedFornecedores] = useState([])
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
  const [setorForm, setSetorForm] = useState(defaultSetorForm())
  const [despesaModalOpen, setDespesaModalOpen] = useState(false)
  const [despesaForm, setDespesaForm] = useState(defaultDespesaConfigForm())
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userForm, setUserForm] = useState({ ...defaultUserForm, permissions: { ...defaultUserForm.permissions } })
  const [entityModalOpen, setEntityModalOpen] = useState(false)
  const [entityForm, setEntityForm] = useState(defaultEntityForm())
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportForm, setExportForm] = useState(() => defaultExportForm(defaultFilters, 'mes'))
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ ...defaultPasswordForm })
  const [reportsData, setReportsData] = useState(defaultReportsViewState())
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')
  const [reportsViewMode, setReportsViewMode] = useState('tree')
  const [reportsTimeline, setReportsTimeline] = useState(defaultReportsTimelineState())
  const [reportsTimelineLoading, setReportsTimelineLoading] = useState(false)
  const [reportsTimelineError, setReportsTimelineError] = useState('')
  const [selectedReportSede, setSelectedReportSede] = useState('')
  const [selectedReportSetor, setSelectedReportSetor] = useState('')
  const [reportExpenseDetails, setReportExpenseDetails] = useState(defaultReportExpenseDetailsState())
  const [form, setForm] = useState(() => createDefaultForm())
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyDate, setHistoryDate] = useState('')
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalSummary, setTotalSummary] = useState(defaultTotalsSummary())
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

  const fetchLoginOptions = async () => {
    try {
      const response = await listarOpcoesLogin()
      const options = Array.isArray(response?.content) ? response.content : []
      setLoginOptions(options.map((item) => ({ value: item.username, label: item.label || item.username })))
    } catch {
      setLoginOptions([
        { value: 'admin', label: 'admin' },
        { value: 'diretoria', label: 'diretoria' },
        { value: 'rh', label: 'rh' },
        { value: 'omega.matriz', label: 'omega.matriz' },
        { value: 'omega.sobral', label: 'omega.sobral' },
        { value: 'omega.cariri', label: 'omega.cariri' },
      ])
    }
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
      usuarios: bundle?.usuarios || [],
      setorDespesas: bundle?.setorDespesas || {},
    }
    setReferences(next)
    return next
  }

  const refreshReferences = async (authData = auth) => {
    if (!authData) return null
    const bundle = await listarReferencias(authData)
    applyReferenceBundle(bundle)
    saveCachedReferencias(bundle)
    return bundle
  }

  const fetchManagedLists = async (authData = auth) => {
    if (!authData || authData.username?.toLowerCase() !== 'admin') return
    const [usersResponse, setoresResponse, despesasResponse, empresasResponse, fornecedoresResponse] = await Promise.all([
      listarUsuariosGestao(authData),
      listarSetoresGestao(authData),
      listarDespesasGestao(authData),
      listarEmpresasGestao(authData),
      listarFornecedoresGestao(authData),
    ])
    setManagedUsers(Array.isArray(usersResponse?.content) ? usersResponse.content : [])
    setManagedSetores(Array.isArray(setoresResponse?.content) ? setoresResponse.content : [])
    setManagedDespesas(Array.isArray(despesasResponse?.content) ? despesasResponse.content : [])
    setManagedEmpresas(Array.isArray(empresasResponse?.content) ? empresasResponse.content : [])
    setManagedFornecedores(Array.isArray(fornecedoresResponse?.content) ? fornecedoresResponse.content : [])
  }

  const loadReports = async ({ authOverride, filtersOverride } = {}) => {
    const authData = authOverride || auth
    const activeFilters = filtersOverride || filters
    if (!authData) {
      setAuthModalOpen(true)
      return
    }
    if (!authData?.permissions?.canViewReports) {
      showError('Relatorios indisponiveis para este usuario.')
      return
    }

    setReportsLoading(true)
    setReportsError('')
    try {
      const [sedesResponse, arvoreResponse] = await Promise.all([
        carregarRelatorioSedes(authData, activeFilters),
        carregarRelatorioArvore(authData, activeFilters),
      ])
      const sedes = Array.isArray(sedesResponse?.content) ? sedesResponse.content : []
      const arvore = Array.isArray(arvoreResponse?.content) ? arvoreResponse.content : []

      setReportsData({
        sedes,
        arvore,
        totalGeral: Number(sedesResponse?.totalGeral ?? arvoreResponse?.totalGeral ?? 0),
        totalEmpresa: Number(sedesResponse?.totalEmpresa ?? arvoreResponse?.totalEmpresa ?? 0),
        totalFornecedor: Number(sedesResponse?.totalFornecedor ?? arvoreResponse?.totalFornecedor ?? 0),
        totalFuncionario: Number(sedesResponse?.totalFuncionario ?? arvoreResponse?.totalFuncionario ?? 0),
      })
      setTotalSummary({
        total: Number(sedesResponse?.totalGeral ?? arvoreResponse?.totalGeral ?? 0),
        totalEmpresa: Number(sedesResponse?.totalEmpresa ?? arvoreResponse?.totalEmpresa ?? 0),
        totalFornecedor: Number(sedesResponse?.totalFornecedor ?? arvoreResponse?.totalFornecedor ?? 0),
        totalFuncionario: Number(sedesResponse?.totalFuncionario ?? arvoreResponse?.totalFuncionario ?? 0),
      })
      setSelectedReportSede((prev) => {
        if (prev && sedes.some((item) => item.sede === prev)) return prev
        return sedes[0]?.sede || ''
      })
      setSelectedReportSetor('')
      setReportExpenseDetails(defaultReportExpenseDetailsState())
      setReportsTimelineError('')
      if (reportsViewMode === 'chart') {
        await loadReportsTimeline({ authOverride: authData, filtersOverride: activeFilters })
      }
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        setReportsError(err.message || 'Erro ao carregar relatorio.')
      }
    } finally {
      setReportsLoading(false)
    }
  }

  const loadReportsTimeline = async ({ authOverride, filtersOverride } = {}) => {
    const authData = authOverride || auth
    const activeFilters = filtersOverride || filters
    if (!authData) {
      setAuthModalOpen(true)
      return
    }
    if (!authData?.permissions?.canViewReports) {
      showError('Relatorios indisponiveis para este usuario.')
      return
    }

    setReportsTimelineLoading(true)
    setReportsTimelineError('')
    try {
      const rows = await fetchAllPagamentos(authData, activeFilters)
      setReportsTimeline(buildTimelineSeries(rows, activeFilters))
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        setReportsTimelineError(err.message || 'Erro ao carregar grafico do relatorio.')
      }
    } finally {
      setReportsTimelineLoading(false)
    }
  }

  const username = auth?.username?.toLowerCase()
  const isAdmin = username === 'admin'
  const canCreateSetor = Boolean(auth?.permissions?.canManageSetores)
  const canCreateDespesa = Boolean(auth?.permissions?.canManageDespesas)
  const canCreateUser = isAdmin
  const canManageEntities = Boolean(auth?.permissions?.canManageEntities)
  const canViewReports = Boolean(auth?.permissions?.canViewReports)
  const canViewHistory = Boolean(auth?.permissions?.canViewHistory)

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
      setTotalSummary({
        total: parseCurrency(totalResponse?.total),
        totalEmpresa: parseCurrency(totalResponse?.totalEmpresa),
        totalFornecedor: parseCurrency(totalResponse?.totalFornecedor),
        totalFuncionario: parseCurrency(totalResponse?.totalFuncionario),
      })
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
    if (currentPage === 'reports') {
      await loadReports()
      return
    }
    await fetchPagamentos({ pageNumber: targetPage, skipCache: true })
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows()
    }
  }

  const fetchAllPagamentos = async (authData, activeFilters) => {
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

    return allRows
  }

  const completeAuthSession = async (authData) => {
    const loginFilters = buildFiltersForRange('mes', defaultFilters)
    const session = await buscarMinhaSessao(authData)
    const enrichedAuth = {
      ...authData,
      username: session?.username || authData.username,
      role: session?.role || authData.role,
      visibleUsernames: Array.isArray(session?.visibleUsernames) ? session.visibleUsernames : [],
      permissions: session?.permissions ? { ...session.permissions } : { ...defaultUserForm.permissions },
    }
    const bundle = await listarReferencias(enrichedAuth)
    applyReferenceBundle(bundle)
    saveCachedReferencias(bundle)

    saveAuth(enrichedAuth)
    setAuth(enrichedAuth)
    setPeriodPreset('mes')
    setFilters(loginFilters)
    setExportForm(defaultExportForm(loginFilters, 'mes'))
    setAuthModalOpen(false)
    setPageCache({})
    setPrefetchCache({})
    setCurrentPage('payments')

    await fetchPagamentos({
      pageNumber: 0,
      authOverride: enrichedAuth,
      filtersOverride: loginFilters,
      skipCache: true,
    })
    if (enrichedAuth.username?.toLowerCase() === 'admin') {
      await fetchManagedLists(enrichedAuth)
    }
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows({ authOverride: enrichedAuth, filtersOverride: loginFilters })
    }
  }

  const handleAuthSave = async (credentials) => {
    const username = credentials?.username?.trim()
    const password = credentials?.password
    if (!username || !password) {
      showError('Informe usuario e senha.')
      return
    }
    const cleaned = { username, password, authType: 'basic' }
    setLoading(true)
    try {
      await completeAuthSession(cleaned)
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
    setDespesaModalOpen(false)
    setUserModalOpen(false)
    setEntityModalOpen(false)
    setExportModalOpen(false)
    setPasswordModalOpen(false)
    setPeriodPreset('mes')
    setFilters(buildFiltersForRange('mes', defaultFilters))
    setExportForm(defaultExportForm(defaultFilters, 'mes'))
    setTotalSummary(defaultTotalsSummary())
    setPageCache({})
    setPrefetchCache({})
    setSpreadsheetRows([])
    setViewMode('cards')
    setCurrentPage('payments')
    setReportsData(defaultReportsViewState())
    setReportsViewMode('tree')
    setReportsTimeline(defaultReportsTimelineState())
    setReportsTimelineError('')
    setReportsError('')
    setManagedUsers([])
    setManagedSetores([])
    setManagedDespesas([])
    setManagedEmpresas([])
    setManagedFornecedores([])
  }

  useEffect(() => {
    fetchLoginOptions()
  }, [])

  useEffect(() => {
    const ssoToken = readSsoTokenFromHash()
    if (!ssoToken) return

    let active = true
    setLoading(true)
    setAuth(null)
    setAuthModalOpen(false)
    clearAuth()

    ;(async () => {
      try {
        const data = await apiRequest('/api/auth/sso/exchange', {
          method: 'POST',
          body: { token: ssoToken },
        })

        const token = String(data?.token || '').trim()
        const username = String(data?.user?.username || '').trim()
        if (!token || !username) {
          throw new Error('Resposta invalida do login delegado.')
        }

        const delegatedAuth = {
          username,
          token,
          authType: 'bearer',
          authorization: `Bearer ${token}`,
        }

        if (!active) return
        await completeAuthSession(delegatedAuth)
      } catch (err) {
        if (!active) return
        clearAuth()
        setAuth(null)
        setAuthModalOpen(true)
        showError(err?.message || 'Falha ao validar login vindo do Ecossistema.')
      } finally {
        clearSsoHash()
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (auth) {
      fetchPagamentos({ pageNumber: 0 })
      fetchReferencias(auth)
      if (auth.username?.toLowerCase() === 'admin') {
        fetchManagedLists(auth)
      }
    }
  }, [auth])

  const applyFilters = async () => {
    const nextFilters = { ...filters }
    if (currentPage === 'reports') {
      setFilters(nextFilters)
      await loadReports({ filtersOverride: nextFilters })
      return
    }
    await fetchPagamentos({ pageNumber: 0, filtersOverride: nextFilters })
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows({ filtersOverride: nextFilters })
    }
  }

  const clearFilters = async () => {
    const nextFilters = buildFiltersForRange('mes', defaultFilters)
    setPeriodPreset('mes')
    setFilters(nextFilters)
    if (currentPage === 'reports') {
      await loadReports({ filtersOverride: nextFilters })
      return
    }
    await fetchPagamentos({ pageNumber: 0, filtersOverride: nextFilters })
    if (viewMode === 'spreadsheet') {
      await fetchSpreadsheetRows({ filtersOverride: nextFilters })
    }
  }

  const applyQuickFilter = async (range) => {
    const nextPreset = range || 'mes'
    setPeriodPreset(nextPreset)
    if (nextPreset === 'personalizado') {
      return
    }
    const nextFilters = buildFiltersForRange(nextPreset, filters)
    if (currentPage === 'reports') {
      await loadReports({ filtersOverride: nextFilters })
      return
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

  const openPaymentsPage = () => {
    setCurrentPage('payments')
  }

  const openReportsPage = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!canViewReports) {
      showError('Relatorios indisponiveis para este usuario.')
      return
    }
    setCurrentPage('reports')
    setReportsViewMode('tree')
    await loadReports()
  }

  const changeReportsViewMode = async (mode) => {
    const nextMode = mode === 'chart' ? 'chart' : 'tree'
    setReportsViewMode(nextMode)
    if (nextMode === 'chart') {
      await loadReportsTimeline()
    }
  }

  const openCreateModal = () => {
    setModal({ open: true, mode: 'create' })
    setForm({ ...createDefaultForm(), colaborador: '' })
    setError('')
  }

  const openSetorModal = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!canCreateSetor) {
      showError('Configuracao de setores indisponivel para este usuario.')
      return
    }
    setSetorForm(defaultSetorForm())
    setSetorModalOpen(true)
    setError('')
    try {
      await fetchManagedLists(auth)
    } catch (err) {
      showError(err.message || 'Erro ao carregar gestao de setores.')
    }
  }

  const closeSetorModal = () => {
    setSetorModalOpen(false)
  }

  const openDespesaModal = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!canCreateDespesa) {
      showError('Configuracao de despesas indisponivel para este usuario.')
      return
    }
    setDespesaForm(defaultDespesaConfigForm())
    setDespesaModalOpen(true)
    setError('')
    try {
      if (isAdmin) {
        await fetchManagedLists(auth)
      }
    } catch (err) {
      showError(err.message || 'Erro ao carregar gestao de despesas.')
    }
  }

  const closeDespesaModal = () => {
    setDespesaModalOpen(false)
  }

  const openUserModal = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!isAdmin) {
      showError('Somente admin pode gerenciar usuarios.')
      return
    }
    setUserForm({ ...defaultUserForm, permissions: { ...defaultUserForm.permissions } })
    setUserModalOpen(true)
    setError('')
    try {
      await fetchManagedLists(auth)
    } catch (err) {
      showError(err.message || 'Erro ao carregar gestao de usuarios.')
    }
  }

  const closeUserModal = () => {
    setUserModalOpen(false)
    setUserForm({ ...defaultUserForm, permissions: { ...defaultUserForm.permissions } })
  }

  const openEntityModal = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!canManageEntities) {
      showError('Gestao de empresas e fornecedores indisponivel para este usuario.')
      return
    }
    setEntityForm(defaultEntityForm())
    setEntityModalOpen(true)
    setError('')
    try {
      await fetchManagedLists(auth)
    } catch (err) {
      showError(err.message || 'Erro ao carregar gestao de empresas e fornecedores.')
    }
  }

  const closeEntityModal = () => {
    setEntityModalOpen(false)
  }

  const openExportModal = () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!isAdmin) {
      showError('Somente admin pode exportar lancamentos.')
      return
    }
    setExportForm(defaultExportForm(filters, periodPreset))
    setExportModalOpen(true)
    setError('')
  }

  const closeExportModal = () => {
    setExportModalOpen(false)
  }

  const updateExportForm = (key, value) => {
    setExportForm((prev) => {
      if (key === 'periodPreset') {
        const next = defaultExportForm(prev, value)
        return { ...prev, ...next, periodPreset: value }
      }
      if (key === 'setor') {
        const despesas = references?.setorDespesas?.[value] || []
        const currentDespesa = despesas.includes(prev.despesa) ? prev.despesa : ''
        return { ...prev, setor: value, despesa: currentDespesa }
      }
      return { ...prev, [key]: value }
    })
  }

  const updateUserForm = (key, value) => {
    setUserForm((prev) => {
      if (key === 'mode') {
        return {
          ...defaultUserForm,
          mode: value,
          permissions: { ...defaultUserForm.permissions },
        }
      }

      if (key === 'permissions') {
        return {
          ...prev,
          permissions: {
            ...(prev.permissions || defaultUserForm.permissions),
            ...value,
          },
        }
      }

      if (key === 'targetUsername' && prev.mode === 'edit') {
        const selected = managedUsers.find((item) => item.username === value)
        return {
          ...prev,
          targetUsername: value,
          username: selected?.username || '',
          password: '',
          visibleUsernames: Array.isArray(selected?.visibleUsernames) ? [...selected.visibleUsernames] : [],
          permissions: {
            ...defaultUserForm.permissions,
            ...(selected?.permissions || {}),
          },
        }
      }

      return { ...prev, [key]: value }
    })
  }

  const updateSetorForm = (key, value) => {
    setSetorForm((prev) => {
      if (key === 'mode') {
        return { ...defaultSetorForm(), mode: value }
      }
      return { ...prev, [key]: value }
    })
  }

  const updateDespesaForm = (key, value) => {
    setDespesaForm((prev) => {
      if (key === 'mode') {
        return { ...defaultDespesaConfigForm(), mode: value }
      }
      return { ...prev, [key]: value }
    })
  }

  const updateEntityForm = (key, value) => {
    setEntityForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'tipo' ? { targetNome: '' } : {}),
    }))
  }

  const openPasswordModal = () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    setPasswordForm({ ...defaultPasswordForm })
    setPasswordModalOpen(true)
    setError('')
  }

  const closePasswordModal = () => {
    setPasswordModalOpen(false)
  }

  const updatePasswordForm = (key, value) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleUserVisibility = (usernameToToggle) => {
    setUserForm((prev) => {
      const current = Array.isArray(prev.visibleUsernames) ? prev.visibleUsernames : []
      const exists = current.includes(usernameToToggle)
      return {
        ...prev,
        visibleUsernames: exists
          ? current.filter((item) => item !== usernameToToggle)
          : [...current, usernameToToggle].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      }
    })
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
    if (!canCreateSetor) {
      showError('Configuracao de setores indisponivel para este usuario.')
      return
    }

    setLoading(true)
    try {
      if (setorForm.mode === 'inactivate') {
        if (!setorForm.targetNome) {
          showError('Selecione o setor que sera inativado.')
          return
        }
        await inativarSetor(auth, { nome: setorForm.targetNome })
      } else if (setorForm.mode === 'edit') {
        if (!setorForm.targetNome) {
          showError('Selecione o setor que sera editado.')
          return
        }
        if (!setorForm.novoNome?.trim()) {
          showError('Informe o novo nome do setor.')
          return
        }
        await editarSetor(auth, { nomeAtual: setorForm.targetNome, novoNome: setorForm.novoNome.trim() })
      } else {
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

        await salvarSetorConfig(auth, { nome, despesas })
      }
      await refreshReferences(auth)
      await fetchManagedLists(auth)
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

  const saveDespesa = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!canCreateDespesa) {
      showError('Configuracao de despesas indisponivel para este usuario.')
      return
    }

    setLoading(true)
    try {
      if (despesaForm.mode === 'inactivate') {
        if (!despesaForm.targetNome) {
          showError('Selecione a despesa que sera inativada.')
          return
        }
        await inativarDespesa(auth, { nome: despesaForm.targetNome })
      } else if (despesaForm.mode === 'edit') {
        if (!despesaForm.targetNome) {
          showError('Selecione a despesa que sera editada.')
          return
        }
        if (!despesaForm.novoNome?.trim()) {
          showError('Informe o novo nome da despesa.')
          return
        }
        await editarDespesa(auth, { nomeAtual: despesaForm.targetNome, novoNome: despesaForm.novoNome.trim() })
      } else {
        const setor = despesaForm.setor?.trim()
        const despesa = despesaForm.despesa?.trim()
        if (!setor) {
          showError('Selecione o setor.')
          return
        }
        if (!despesa) {
          showError('Informe o nome da despesa.')
          return
        }
        await salvarDespesaConfig(auth, { setor, despesa })
      }
      await refreshReferences(auth)
      if (isAdmin) {
        await fetchManagedLists(auth)
      }
      setDespesaModalOpen(false)
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao salvar despesa.')
      }
    } finally {
      setLoading(false)
    }
  }

  const saveUser = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!isAdmin) {
      showError('Somente admin pode gerenciar usuarios.')
      return
    }

    setLoading(true)
    try {
      if (userForm.mode === 'inactivate') {
        if (!userForm.targetUsername) {
          showError('Selecione o usuario que sera inativado.')
          return
        }
        await inativarUsuario(auth, { username: userForm.targetUsername })
      } else {
        const username = (userForm.mode === 'edit' ? userForm.targetUsername : userForm.username)?.trim().toLowerCase()
        const password = userForm.password?.trim()
        const visibleUsernames = Array.isArray(userForm.visibleUsernames) ? userForm.visibleUsernames : []
        const permissions = USER_PERMISSION_FIELDS.reduce((acc, key) => {
          acc[key] = userForm.permissions?.[key] === true
          return acc
        }, {})
        if (!username) {
          showError('Informe o login do usuario.')
          return
        }
        if (userForm.mode === 'create' && !password) {
          showError('Informe a senha do usuario.')
          return
        }
        if (userForm.mode === 'edit') {
          await atualizarUsuario(auth, username, { password, visibleUsernames, permissions })
        } else {
          await criarUsuario(auth, { username, password, visibleUsernames, permissions })
        }
      }
      await refreshReferences(auth)
      await fetchManagedLists(auth)
      await fetchLoginOptions()
      setUserModalOpen(false)
      setUserForm({ ...defaultUserForm, permissions: { ...defaultUserForm.permissions } })
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao salvar usuario.')
      }
    } finally {
      setLoading(false)
    }
  }

  const saveEntity = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!canManageEntities) {
      showError('Gestao de empresas e fornecedores indisponivel para este usuario.')
      return
    }

    setLoading(true)
    try {
      if (entityForm.mode === 'inactivate') {
        if (!entityForm.targetNome) {
          showError(`Selecione o ${entityForm.tipo} que sera inativado.`)
          return
        }
        if (entityForm.tipo === 'empresa') {
          await inativarEmpresa(auth, { nome: entityForm.targetNome })
        } else {
          await inativarFornecedor(auth, { nome: entityForm.targetNome })
        }
      } else {
        const nome = entityForm.nome?.trim()
        if (!nome) {
          showError(`Informe o nome do ${entityForm.tipo}.`)
          return
        }
        await salvarEmpresaFornecedorConfig(auth, { tipo: entityForm.tipo, nome })
      }
      await refreshReferences(auth)
      await fetchManagedLists(auth)
      setEntityModalOpen(false)
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao salvar empresa/fornecedor.')
      }
    } finally {
      setLoading(false)
    }
  }

  const savePassword = async () => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }

    const currentPassword = passwordForm.currentPassword?.trim()
    const newPassword = passwordForm.newPassword?.trim()
    if (!currentPassword) {
      showError('Informe a senha atual.')
      return
    }
    if (!newPassword) {
      showError('Informe a nova senha.')
      return
    }

    setLoading(true)
    try {
      await trocarMinhaSenha(auth, { currentPassword, newPassword })
      const updatedAuth = { ...auth, password: newPassword }
      saveAuth(updatedAuth)
      setAuth(updatedAuth)
      setPasswordModalOpen(false)
      setPasswordForm({ ...defaultPasswordForm })
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao trocar senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  const exportPagamentos = async (format) => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!isAdmin) {
      showError('Somente admin pode exportar lancamentos.')
      return
    }

    const exportFilters = {
      de: exportForm.de || '',
      ate: exportForm.ate || '',
      sede: exportForm.sede || '',
      setor: exportForm.setor || '',
      despesa: exportForm.despesa || '',
      usuario: '',
      dotacao: '',
      q: '',
    }

    setLoading(true)
    try {
      const rows = await fetchAllPagamentos(auth, exportFilters)
      if (!rows.length) {
        showError('Nenhum lancamento encontrado para exportacao.')
        return
      }

      if (format === 'excel') {
        await downloadPaymentsExcel(rows, {
          periodo: `${exportForm.de || '--/--/----'} ate ${exportForm.ate || '--/--/----'}`,
          sede: exportForm.sede || 'Todas',
          setor: exportForm.setor || 'Todos',
          despesa: exportForm.despesa || 'Todas',
          usuario: auth.username || '-',
          titulo: 'Exportacao de lancamentos',
        })
      } else if (format === 'pdf') {
        await downloadPaymentsPdf(rows, {
          titulo: 'Exportacao de lancamentos',
          visualizacao: 'Exportacao',
          periodo: `${exportForm.de ? formatDateForDocument(exportForm.de) : '--/--/----'} ate ${exportForm.ate ? formatDateForDocument(exportForm.ate) : '--/--/----'}`,
          sede: exportForm.sede || 'Todas',
          setor: exportForm.setor || 'Todos',
          despesa: exportForm.despesa || 'Todas',
          usuario: auth.username || '-',
        })
      } else {
        printPaymentsDocument(rows, {
          titulo: 'Exportacao de lancamentos',
          visualizacao: 'Exportacao',
          periodo: `${exportForm.de ? formatDateForDocument(exportForm.de) : '--/--/----'} ate ${exportForm.ate ? formatDateForDocument(exportForm.ate) : '--/--/----'}`,
          sede: exportForm.sede || 'Todas',
          setor: exportForm.setor || 'Todos',
          despesa: exportForm.despesa || 'Todas',
          usuario: auth.username || '-',
        })
      }
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        showError('Credenciais invalidas.')
      } else {
        showError(err.message || 'Erro ao exportar lancamentos.')
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
    if (!canViewHistory) {
      showError('Auditoria indisponivel para este usuario.')
      return
    }

    setHistoryModalOpen(true)
    setHistoryLoading(true)
    setHistoryError('')
    setHistoryDate('')
    try {
      const data = await listarHistoricoGlobal(auth)
      setHistoryItems(data?.content || [])
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        setHistoryModalOpen(false)
        showError('Credenciais invalidas.')
      } else {
        setHistoryError(err.message || 'Erro ao carregar auditoria.')
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadHistory = async (dateValue = '') => {
    if (!auth) {
      setAuthModalOpen(true)
      return
    }
    if (!canViewHistory) {
      showError('Auditoria indisponivel para este usuario.')
      return
    }

    setHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await listarHistoricoGlobal(auth, { date: dateValue || undefined })
      setHistoryItems(data?.content || [])
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        setHistoryModalOpen(false)
        showError('Credenciais invalidas.')
      } else {
        setHistoryError(err.message || 'Erro ao carregar auditoria.')
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeHistoryModal = () => {
    setHistoryModalOpen(false)
    setHistoryDate('')
    setHistoryItems([])
    setHistoryError('')
  }

  const buildReportDetailRequest = (despesa = '') => {
    if (!selectedReportSede || !selectedReportSetor) {
      showError('Selecione uma sede e um setor validos do relatorio.')
      return null
    }

    const detailFilters = {
      ...filters,
      sede: selectedReportSede,
      setor: selectedReportSetor,
      despesa,
    }

    return {
      filters: detailFilters,
      detailState: {
        open: true,
        title: despesa ? 'Lancamentos da despesa' : 'Lancamentos do total',
        subtitle: despesa
          ? `${despesa} | ${selectedReportSetor} | ${selectedReportSede}`
          : `${selectedReportSetor} | ${selectedReportSede} | Todas as despesas`,
        sede: selectedReportSede,
        setor: selectedReportSetor,
        despesa,
      },
    }
  }

  const loadReportDetailItems = async (despesa = '', { openModal = true } = {}) => {
    if (!auth) {
      setAuthModalOpen(true)
      return null
    }
    if (!canViewReports) {
      showError('Relatorios indisponiveis para este usuario.')
      return null
    }
    if (despesa && !String(despesa).trim()) {
      showError('Selecione uma despesa valida do relatorio.')
      return null
    }

    const request = buildReportDetailRequest(despesa)
    if (!request) return null

    const pendingState = {
      ...request.detailState,
      items: [],
      totalElements: 0,
      loading: true,
      error: '',
    }

    if (openModal) {
      setReportExpenseDetails(pendingState)
    }

    try {
      const rows = await fetchAllPagamentos(auth, request.filters)
      const result = {
        ...request.detailState,
        open: openModal,
        items: rows,
        totalElements: rows.length,
        loading: false,
        error: '',
      }
      if (openModal) {
        setReportExpenseDetails(result)
      }
      return result
    } catch (err) {
      if (err.status === 401) {
        setAuthModalOpen(true)
        if (openModal) {
          setReportExpenseDetails(defaultReportExpenseDetailsState())
        }
        showError('Credenciais invalidas.')
      } else {
        const nextState = {
          ...pendingState,
          loading: false,
          error: err.message || 'Erro ao carregar lancamentos do relatorio.',
        }
        if (openModal) {
          setReportExpenseDetails(nextState)
        }
      }
      return null
    }
  }

  const openReportExpenseDetails = async (despesa) => {
    await loadReportDetailItems(despesa, { openModal: true })
  }

  const openReportTotalDetails = async () => {
    await loadReportDetailItems('', { openModal: true })
  }

  const printCurrentReportDetails = () => {
    if (!reportExpenseDetails?.open || reportExpenseDetails.loading || reportExpenseDetails.error) return
    printPaymentsDocument(reportExpenseDetails.items, buildReportDetailMeta(reportExpenseDetails, filters, auth?.username))
  }

  const exportCurrentReportDetails = async (format) => {
    if (!reportExpenseDetails?.open || reportExpenseDetails.loading || reportExpenseDetails.error) return
    const meta = buildReportDetailMeta(reportExpenseDetails, filters, auth?.username)
    if (format === 'excel') {
      await downloadPaymentsExcel(reportExpenseDetails.items, meta)
      return
    }
    await downloadPaymentsPdf(reportExpenseDetails.items, meta)
  }

  const runReportTotalAction = async (action) => {
    const detail = await loadReportDetailItems('', { openModal: false })
    if (!detail) return
    const meta = buildReportDetailMeta(detail, filters, auth?.username)
    if (action === 'open') {
      setReportExpenseDetails({ ...detail, open: true })
      return
    }
    if (action === 'print') {
      printPaymentsDocument(detail.items, meta)
      return
    }
    if (action === 'excel') {
      await downloadPaymentsExcel(detail.items, meta)
      return
    }
    await downloadPaymentsPdf(detail.items, meta)
  }

  const closeReportExpenseDetails = () => {
    setReportExpenseDetails(defaultReportExpenseDetailsState())
  }

  const updateHistoryDate = (value) => {
    setHistoryDate(value)
  }

  const applyHistoryDateFilter = async () => {
    await loadHistory(historyDate)
  }

  const clearHistoryDateFilter = async () => {
    setHistoryDate('')
    await loadHistory('')
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
    if (key === 'de' || key === 'ate') {
      setPeriodPreset('personalizado')
    }
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
    currentPage,
    isAdmin,
    canCreateUser,
    canViewReports,
    canViewHistory,
    canManageEntities,
    loginOptions,
    canCreateSetor,
    canCreateDespesa,
    authModalOpen,
    isFiltersOpen,
    periodPreset,
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
    managedSetores,
    despesaModalOpen,
    despesaForm,
    managedDespesas,
    userModalOpen,
    userForm,
    managedUsers,
    entityModalOpen,
    entityForm,
    managedEmpresas,
    managedFornecedores,
    exportModalOpen,
    exportForm,
    passwordModalOpen,
    passwordForm,
    reportsData,
    reportsLoading,
    reportsError,
    reportsViewMode,
    reportsTimeline,
    reportsTimelineLoading,
    reportsTimelineError,
    selectedReportSede,
    selectedReportSetor,
    reportExpenseDetails,
    form,
    historyModalOpen,
    historyDate,
    historyItems,
    historyLoading,
    historyError,
    loading,
    error,
    totalSummary,
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
    openPaymentsPage,
    openCreateModal,
    openSetorModal,
    openDespesaModal,
    openUserModal,
    openEntityModal,
    openExportModal,
    openPasswordModal,
    openReportsPage,
    openReportExpenseDetails,
    openReportTotalDetails,
    openEditModal,
    openHistoryModal,
    closeModal,
    closeSetorModal,
    closeDespesaModal,
    closeUserModal,
    closeEntityModal,
    closeExportModal,
    closePasswordModal,
    closeHistoryModal,
    updateHistoryDate,
    applyHistoryDateFilter,
    clearHistoryDateFilter,
    changeReportsViewMode,
    updateForm,
    updateFilters,
    updateSetorForm,
    addSetorDespesa,
    removeSetorDespesa,
    updateDespesaForm,
    updateUserForm,
    updateEntityForm,
    updateExportForm,
    updatePasswordForm,
    toggleUserVisibility,
    savePagamento,
    saveSetor,
    saveDespesa,
    saveUser,
    saveEntity,
    exportPagamentos,
    printCurrentReportDetails,
    exportCurrentReportDetails,
    runReportTotalAction,
    savePassword,
    removePagamento,
    goNextPage,
    goPrevPage,
    setSelectedReportSede,
    setSelectedReportSetor,
    closeReportExpenseDetails,
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function formatDateForDocument(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function formatDateTimeForDocument(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatCurrencyForDocument(value) {
  const numberValue = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(numberValue) ? numberValue : 0)
}

