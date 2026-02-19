package br.com.omega.payment_control.service;

import br.com.omega.payment_control.dto.PagamentoCreateRequest;
import br.com.omega.payment_control.dto.PagamentoHistoricoResponse;
import br.com.omega.payment_control.dto.PagamentoRateioItem;
import br.com.omega.payment_control.dto.PagamentoResponse;
import br.com.omega.payment_control.dto.PagamentoStatusUpdateRequest;
import br.com.omega.payment_control.dto.PagamentoUpdateRequest;
import br.com.omega.payment_control.entity.Pagamento;
import br.com.omega.payment_control.entity.PagamentoHistorico;
import br.com.omega.payment_control.entity.PagamentoRateio;
import br.com.omega.payment_control.entity.StatusPagamento;
import br.com.omega.payment_control.repository.PagamentoHistoricoRepository;
import br.com.omega.payment_control.repository.PagamentoRepository;
import br.com.omega.payment_control.reference.ReferenceDtos.ColaboradorItem;
import br.com.omega.payment_control.reference.ReferenceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class PagamentoService {

    private final PagamentoRepository repo;
    private final ReferenceRepository referenceRepository;
    private final PagamentoHistoricoRepository historicoRepository;
    private final ObjectMapper objectMapper;
    private static final int MAX_EMPRESA_FORNECEDOR = 255;

    public PagamentoService(PagamentoRepository repo,
                            ReferenceRepository referenceRepository,
                            PagamentoHistoricoRepository historicoRepository,
                            ObjectMapper objectMapper) {
        this.repo = repo;
        this.referenceRepository = referenceRepository;
        this.historicoRepository = historicoRepository;
        this.objectMapper = objectMapper;
    }

    private static String normEq(String s) {
        if (s == null) return null;
        s = s.trim();
        if (s.isBlank()) return null;
        return s.toLowerCase(Locale.ROOT);
    }

    private static String normLike(String s) {
        if (s == null) return null;
        s = s.trim();
        if (s.isBlank()) return null;
        return "%" + s.toLowerCase(Locale.ROOT) + "%";
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isBlank() ? null : t;
    }

    private static String normalizeField(String s) {
        String t = trimToNull(s);
        return t == null ? null : t.toLowerCase(Locale.ROOT);
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        if (s.length() <= max) return s;
        return s.substring(0, max);
    }

    private static String buildCodVld(Long codigo, LocalDate data, Integer codColab, Integer codSede, Integer codSetor) {
        LocalDate baseDate = data != null ? data : LocalDate.now();
        String mm = String.format(Locale.ROOT, "%02d", baseDate.getMonthValue());
        String yy = String.format(Locale.ROOT, "%02d", baseDate.getYear() % 100);
        String colab = codColab == null ? "0" : String.valueOf(codColab);
        String sede = codSede == null ? "0" : String.valueOf(codSede);
        String setor = codSetor == null ? "0" : String.valueOf(codSetor);
        return String.format(Locale.ROOT, "%06d%s%s%s%s%s", codigo, mm, yy, colab, sede, setor);
    }

    @Transactional(readOnly = true)
    public Page<PagamentoResponse> listarMeusComFiltros(
            String criadoPor,
            LocalDate de,
            LocalDate ate,
            String sede,
            String setor,
            String despesa,
            String dotacao,
            StatusPagamento status,
            String q,
            Pageable pageable
    ) {
        sede = normEq(sede);
        setor = normEq(setor);
        despesa = normEq(despesa);
        dotacao = normEq(dotacao);

        q = normLike(q);

        boolean privilegiado = isPrivileged();
        boolean filtrarDe = de != null;
        boolean filtrarAte = ate != null;
        boolean filtrarSede = sede != null;
        boolean filtrarSetor = setor != null;
        boolean filtrarDespesa = despesa != null;
        boolean filtrarDotacao = dotacao != null;
        boolean filtrarStatus = status != null;
        boolean filtrarQ = q != null;

        LocalDate deParam = filtrarDe ? de : LocalDate.of(1970, 1, 1);
        LocalDate ateParam = filtrarAte ? ate : LocalDate.of(2999, 12, 31);
        String sedeParam = filtrarSede ? sede : "";
        String setorParam = filtrarSetor ? setor : "";
        String despesaParam = filtrarDespesa ? despesa : "";
        String dotacaoParam = filtrarDotacao ? dotacao : "";
        StatusPagamento statusParam = filtrarStatus ? status : StatusPagamento.LANCADO;
        String qParam = filtrarQ ? q : "%";

        Map<String, String> colaboradorMap = buildColaboradorMap();
        return repo.buscarMeusComFiltros(
                        criadoPor,
                        privilegiado,
                        filtrarDe, deParam,
                        filtrarAte, ateParam,
                        filtrarSede, sedeParam,
                        filtrarSetor, setorParam,
                        filtrarDespesa, despesaParam,
                        filtrarDotacao, dotacaoParam,
                        filtrarStatus, statusParam,
                        filtrarQ, qParam,
                        pageable
                )
                .map(p -> toResponse(p, colaboradorMap, false));
    }

    @Transactional(readOnly = true)
    public PagamentoResponse buscarMeu(Long id, String criadoPor) {
        Pagamento p = buscarPorPermissao(id, criadoPor);
        return toResponse(p, buildColaboradorMap(), true);
    }

    @Transactional
    public PagamentoResponse criar(PagamentoCreateRequest req, String criadoPor) {
        String sede = trimToNull(req.sede());
        String colaborador = trimToNull(req.colaborador());
        String setor = trimToNull(req.setor());
        String despesa = trimToNull(req.despesa());
        String dotacao = trimToNull(req.dotacao());
        String setorPagamento = trimToNull(req.setorPagamento());
        String empresaFornecedor = trimToNull(req.empresaFornecedor());

        validateReferences(
                sede,
                setor,
                despesa,
                dotacao,
                empresaFornecedor,
                req.rateios(),
                colaborador,
                setorPagamento
        );
        LocalDate dtPagamento = req.dtPagamento() != null ? req.dtPagamento() : req.dtVencimento();
        validateDatas(dtPagamento, req.dtVencimento());
        Pagamento p = new Pagamento();
        p.setCriadoPor(criadoPor);
        p.setPerfilCriador(resolvePerfilCriador());
        p.setDtPagamento(dtPagamento);
        p.setDtVencimento(req.dtVencimento());
        p.setSede(sede);
        p.setSedeNorm(normalizeField(sede));
        p.setColaborador(colaborador);
        p.setSetor(setor);
        p.setSetorNorm(normalizeField(setor));
        p.setDespesa(despesa);
        p.setDespesaNorm(normalizeField(despesa));
        p.setDotacao(dotacao);
        p.setDotacaoNorm(normalizeField(dotacao));
        p.setSetorPagamento(setorPagamento);
        p.setValorTotal(req.valorTotal());
        p.setDescricao(trimToNull(req.descricao()));
        applyRateios(p, req.rateios(), empresaFornecedor);

        Pagamento saved = repo.save(p);
        if (saved.getCodVld() == null || saved.getCodVld().isBlank()) {
            Integer codColab = referenceRepository.findCodigoColaboradorByLogin(saved.getColaborador());
            if (codColab == null) {
                codColab = referenceRepository.findCodigoColaboradorByLogin(criadoPor);
            }
            Integer codSede = referenceRepository.findCodigoSedeByNome(saved.getSede());
            Integer codSetor = referenceRepository.findCodigoSetorByNome(saved.getSetor());
            LocalDate codDate = saved.getDtPagamento() != null ? saved.getDtPagamento() : saved.getDtVencimento();
            saved.setCodVld(buildCodVld(saved.getId(), codDate, codColab, codSede, codSetor));
            saved = repo.save(saved);
        }
        logHistorico(saved.getId(), "CRIADO", buildSnapshot(saved));
        return toResponse(saved, buildColaboradorMap(), true);
    }

    @Transactional
    public PagamentoResponse editar(Long id, PagamentoUpdateRequest req, String criadoPor) {
        Pagamento p = buscarPorPermissao(id, criadoPor);
        if (p.getStatus() == StatusPagamento.PAGO && !isPrivileged()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Pagamento pago não pode ser editado.");
        }
        String sede = trimToNull(req.sede());
        String colaborador = trimToNull(req.colaborador());
        String setor = trimToNull(req.setor());
        String despesa = trimToNull(req.despesa());
        String dotacao = trimToNull(req.dotacao());
        String setorPagamento = trimToNull(req.setorPagamento());
        String empresaFornecedor = trimToNull(req.empresaFornecedor());

        validateReferences(
                sede,
                setor,
                despesa,
                dotacao,
                empresaFornecedor,
                req.rateios(),
                colaborador,
                setorPagamento
        );
        LocalDate dtPagamento = req.dtPagamento() != null ? req.dtPagamento() : req.dtVencimento();
        validateDatas(dtPagamento, req.dtVencimento());

        Pagamento before = copySnapshot(p);

        p.setDtPagamento(dtPagamento);
        p.setDtVencimento(req.dtVencimento());
        p.setSede(sede);
        p.setSedeNorm(normalizeField(sede));
        p.setColaborador(colaborador);
        p.setSetor(setor);
        p.setSetorNorm(normalizeField(setor));
        p.setDespesa(despesa);
        p.setDespesaNorm(normalizeField(despesa));
        p.setDotacao(dotacao);
        p.setDotacaoNorm(normalizeField(dotacao));
        p.setSetorPagamento(setorPagamento);
        p.setValorTotal(req.valorTotal());
        p.setDescricao(trimToNull(req.descricao()));
        applyRateios(p, req.rateios(), empresaFornecedor);

        Pagamento saved = repo.save(p);
        Map<String, Object> diff = buildDiff(before, saved);
        if (!diff.isEmpty()) {
            logHistorico(saved.getId(), "ATUALIZADO", diff);
        }
        return toResponse(saved, buildColaboradorMap(), true);
    }

    @Transactional
    public void deletarMeu(Long id, String criadoPor) {
        Pagamento p = buscarPorPermissao(id, criadoPor);
        if (p.getStatus() == StatusPagamento.PAGO && !isPrivileged()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Pagamento pago não pode ser excluído.");
        }
        logHistorico(p.getId(), "EXCLUIDO", buildSnapshot(p));
        repo.delete(p);
    }

    @Transactional
    public PagamentoResponse alterarStatus(Long id, PagamentoStatusUpdateRequest req, String criadoPor) {
        Pagamento p = buscarPorPermissao(id, criadoPor);
        StatusPagamento anterior = p.getStatus();
        p.setStatus(req.status());
        Pagamento saved = repo.save(p);
        Map<String, Object> detalhes = new LinkedHashMap<>();
        detalhes.put("statusAnterior", anterior);
        detalhes.put("statusNovo", saved.getStatus());
        logHistorico(saved.getId(), "STATUS_ALTERADO", detalhes);
        return toResponse(saved, buildColaboradorMap(), true);
    }

    @Transactional(readOnly = true)
    public List<PagamentoHistoricoResponse> listarHistorico(Long pagamentoId, String criadoPor) {
        buscarPorPermissao(pagamentoId, criadoPor);
        return historicoRepository.findByPagamentoIdOrderByDtEventoDesc(pagamentoId)
                .stream()
                .map(this::toHistoricoResponse)
                .toList();
    }

    @Transactional
    public int rebuildNormalizedFields(String solicitadoPor) {
        if (!isPrivileged()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ação não permitida.");
        }
        return repo.rebuildNormalizedFields();
    }

    private Pagamento buscarPorPermissao(Long id, String criadoPor) {
        if (isPrivileged()) {
            return repo.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pagamento não encontrado"));
        }
        return repo.findByIdAndCriadoPor(id, criadoPor)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pagamento não encontrado"));
    }

    private boolean isPrivileged() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_GERENCIA")
                        || a.getAuthority().equals("ROLE_DIRETORIA")
                        || a.getAuthority().equals("ROLE_RH"));
    }

    private PagamentoResponse toResponse(Pagamento p, Map<String, String> colaboradorMap, boolean includeRateios) {
        String colaborador = trimToNull(p.getColaborador());
        if (colaborador == null) {
            colaborador = resolveColaborador(p.getCriadoPor(), colaboradorMap);
        }
        return new PagamentoResponse(
                p.getId(),
                p.getCodVld(),
                p.getPerfilCriador(),
                colaborador,
                p.getCriadoPor(),
                p.getUltEditadoPor(),
                p.getDtSistema(),
                p.getDtPagamento(),
                p.getDtVencimento(),
                p.getDtUltEdicao(),
                p.getStatus(),
                p.getSede(),
                p.getSetor(),
                p.getDespesa(),
                p.getDotacao(),
                p.getEmpresaFornecedor(),
                p.getSetorPagamento(),
                p.getValorTotal(),
                p.getDescricao(),
                includeRateios ? mapRateios(p.getRateios()) : List.of()
        );
    }

    private PagamentoHistoricoResponse toHistoricoResponse(PagamentoHistorico historico) {
        return new PagamentoHistoricoResponse(
                historico.getId(),
                historico.getPagamentoId(),
                historico.getAcao(),
                historico.getDetalhes(),
                historico.getCriadoPor(),
                historico.getDtEvento()
        );
    }

    private String resolvePerfilCriador() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "DESCONHECIDO";
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .filter(role -> role.equals("GERENCIA")
                        || role.equals("DIRETORIA")
                        || role.equals("RH")
                        || role.equals("MATRIZ")
                        || role.equals("SOBRAL")
                        || role.equals("CARIRI"))
                .findFirst()
                .orElse("USUARIO");
    }

    private void validateDatas(LocalDate pagamento, LocalDate vencimento) {
        if (pagamento == null || vencimento == null) return;
        if (vencimento.isBefore(pagamento)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vencimento não pode ser anterior ao pagamento.");
        }
    }

    private Map<String, String> buildColaboradorMap() {
        List<ColaboradorItem> colaboradores = referenceRepository.listColaboradores();
        Map<String, String> map = new HashMap<>();
        for (ColaboradorItem item : colaboradores) {
            if (item == null) continue;
            String nome = trimToNull(item.nome());
            if (nome != null) {
                map.put(nome.toLowerCase(Locale.ROOT), nome);
            }
            String email = trimToNull(item.email());
            if (email != null) {
                map.put(email.toLowerCase(Locale.ROOT), nome != null ? nome : email);
            }
        }
        return map;
    }

    private String resolveColaborador(String login, Map<String, String> map) {
        if (login == null || login.isBlank()) return "";
        String key = login.trim().toLowerCase(Locale.ROOT);
        return map.getOrDefault(key, login);
    }

    private void logHistorico(Long pagamentoId, String acao, Object detalhes) {
        PagamentoHistorico historico = new PagamentoHistorico();
        historico.setPagamentoId(pagamentoId);
        historico.setAcao(acao);
        historico.setDetalhes(toJson(detalhes));
        historicoRepository.save(historico);
    }

    private String toJson(Object detalhes) {
        if (detalhes == null) return null;
        try {
            return objectMapper.writeValueAsString(detalhes);
        } catch (JsonProcessingException e) {
            return String.valueOf(detalhes);
        }
    }

    private Map<String, Object> buildSnapshot(Pagamento p) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("dtPagamento", p.getDtPagamento());
        snapshot.put("dtVencimento", p.getDtVencimento());
        snapshot.put("sede", p.getSede());
        snapshot.put("colaborador", p.getColaborador());
        snapshot.put("setor", p.getSetor());
        snapshot.put("despesa", p.getDespesa());
        snapshot.put("dotacao", p.getDotacao());
        snapshot.put("empresaFornecedor", p.getEmpresaFornecedor());
        snapshot.put("setorPagamento", p.getSetorPagamento());
        snapshot.put("rateios", mapRateios(p.getRateios()));
        snapshot.put("valorTotal", p.getValorTotal());
        snapshot.put("descricao", p.getDescricao());
        snapshot.put("status", p.getStatus());
        return snapshot;
    }

    private Pagamento copySnapshot(Pagamento p) {
        Pagamento c = new Pagamento();
        c.setDtPagamento(p.getDtPagamento());
        c.setDtVencimento(p.getDtVencimento());
        c.setSede(p.getSede());
        c.setSedeNorm(p.getSedeNorm());
        c.setColaborador(p.getColaborador());
        c.setSetor(p.getSetor());
        c.setSetorNorm(p.getSetorNorm());
        c.setDespesa(p.getDespesa());
        c.setDespesaNorm(p.getDespesaNorm());
        c.setDotacao(p.getDotacao());
        c.setDotacaoNorm(p.getDotacaoNorm());
        c.setEmpresaFornecedor(p.getEmpresaFornecedor());
        c.setSetorPagamento(p.getSetorPagamento());
        c.setValorTotal(p.getValorTotal());
        c.setDescricao(p.getDescricao());
        c.setRateios(new ArrayList<>(p.getRateios()));
        c.setStatus(p.getStatus());
        return c;
    }

    private Map<String, Object> buildDiff(Pagamento before, Pagamento after) {
        Map<String, Object> diff = new LinkedHashMap<>();
        addDiff(diff, "dtPagamento", before.getDtPagamento(), after.getDtPagamento());
        addDiff(diff, "dtVencimento", before.getDtVencimento(), after.getDtVencimento());
        addDiff(diff, "sede", before.getSede(), after.getSede());
        addDiff(diff, "colaborador", before.getColaborador(), after.getColaborador());
        addDiff(diff, "setor", before.getSetor(), after.getSetor());
        addDiff(diff, "despesa", before.getDespesa(), after.getDespesa());
        addDiff(diff, "dotacao", before.getDotacao(), after.getDotacao());
        addDiff(diff, "empresaFornecedor", before.getEmpresaFornecedor(), after.getEmpresaFornecedor());
        addDiff(diff, "setorPagamento", before.getSetorPagamento(), after.getSetorPagamento());
        addDiff(diff, "valorTotal", before.getValorTotal(), after.getValorTotal());
        addDiff(diff, "descricao", before.getDescricao(), after.getDescricao());
        addDiff(diff, "rateios", mapRateios(before.getRateios()), mapRateios(after.getRateios()));
        return diff;
    }

    private void addDiff(Map<String, Object> diff, String key, Object before, Object after) {
        if (before == null && after == null) return;
        if (before == null || after == null || !before.equals(after)) {
            Map<String, Object> change = new LinkedHashMap<>();
            change.put("de", before);
            change.put("para", after);
            diff.put(key, change);
        }
    }

    private void applyRateios(Pagamento p, List<PagamentoRateioItem> items, String empresaFornecedor) {
        List<PagamentoRateioItem> rateios = sanitizeRateios(items);
        String empresaFornecedorNorm = trimToNull(empresaFornecedor);
        empresaFornecedorNorm = truncate(empresaFornecedorNorm, MAX_EMPRESA_FORNECEDOR);

        if (rateios.isEmpty() && empresaFornecedorNorm != null) {
            rateios = List.of(new PagamentoRateioItem(empresaFornecedorNorm, p.getValorTotal()));
        }

        if (!rateios.isEmpty()) {
            validateRateios(rateios, p.getValorTotal());
            p.getRateios().clear();
            for (PagamentoRateioItem item : rateios) {
                PagamentoRateio rateio = new PagamentoRateio();
                rateio.setNome(item.nome().trim());
                rateio.setValor(item.valor());
                p.getRateios().add(rateio);
            }
            // Sempre recalcula empresa/fornecedor com base nos rateios
            String joined = rateios.stream()
                    .map(PagamentoRateioItem::nome)
                    .distinct()
                    .collect(Collectors.joining(", "));
            p.setEmpresaFornecedor(truncate(joined, MAX_EMPRESA_FORNECEDOR));
        } else {
            p.getRateios().clear();
            // Sem rateio: mantém o valor informado e cria consistência no registro.
            p.setEmpresaFornecedor(empresaFornecedorNorm);
        }

        String dotacao = trimToNull(p.getDotacao());
        if (dotacao != null) {
            String normDotacao = dotacao.toLowerCase(Locale.ROOT);
            boolean exigeEmpresa = normDotacao.equals("empresa");
            boolean exigeFornecedor = normDotacao.equals("fornecedor");
            boolean permiteAmbos = normDotacao.equals("empr/fornecedor") || normDotacao.equals("empresa/fornecedor");
            if ((exigeEmpresa || exigeFornecedor || permiteAmbos) && p.getRateios().isEmpty() && p.getEmpresaFornecedor() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa/Fornecedor obrigatório.");
            }
        }
    }

    private List<PagamentoRateioItem> sanitizeRateios(List<PagamentoRateioItem> items) {
        if (items == null) return List.of();
        return items.stream()
                .filter(item -> item != null && trimToNull(item.nome()) != null && item.valor() != null)
                .map(item -> new PagamentoRateioItem(truncate(item.nome().trim(), MAX_EMPRESA_FORNECEDOR), item.valor()))
                .toList();
    }

    private void validateRateios(List<PagamentoRateioItem> rateios, java.math.BigDecimal total) {
        java.math.BigDecimal soma = java.math.BigDecimal.ZERO;
        for (PagamentoRateioItem item : rateios) {
            if (item.valor().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rateio com valor inválido.");
            }
            soma = soma.add(item.valor());
        }
        if (total != null && soma.compareTo(total) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Soma do rateio deve ser igual ao valor total.");
        }
    }

    private List<PagamentoRateioItem> mapRateios(List<PagamentoRateio> rateios) {
        if (rateios == null) return List.of();
        return rateios.stream()
                .map(r -> new PagamentoRateioItem(r.getNome(), r.getValor()))
                .toList();
    }

    private void validateReferences(
            String sede,
            String setor,
            String despesa,
            String dotacao,
            String empresaFornecedor,
            List<PagamentoRateioItem> rateios,
            String colaborador,
            String setorPagamento
    ) {
        sede = trimToNull(sede);
        setor = trimToNull(setor);
        despesa = trimToNull(despesa);
        dotacao = trimToNull(dotacao);
        colaborador = trimToNull(colaborador);
        setorPagamento = trimToNull(setorPagamento);

        if (!referenceRepository.existsSedeByNome(sede)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sede inválida.");
        }
        if (!referenceRepository.existsSetorByNome(setor)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Setor inválido.");
        }
        if (!referenceRepository.existsDespesaByNome(despesa)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Despesa inválida.");
        }
        if (!referenceRepository.existsDotacaoByNome(dotacao)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dotação inválida.");
        }
        if (!referenceRepository.existsSetorByNome(setorPagamento)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Setor (Quem?) inválido.");
        }

        String dotacaoNorm = trimToNull(dotacao);
        String empresaFornecedorNorm = trimToNull(empresaFornecedor);
        if (dotacaoNorm == null) return;

        String normDotacao = dotacaoNorm.toLowerCase(Locale.ROOT);
        boolean exigeEmpresa = normDotacao.equals("empresa");
        boolean exigeFornecedor = normDotacao.equals("fornecedor");
        boolean permiteAmbos = normDotacao.equals("empr/fornecedor") || normDotacao.equals("empresa/fornecedor");

        List<PagamentoRateioItem> rateiosNorm = sanitizeRateios(rateios);
        if (!rateiosNorm.isEmpty()) {
            for (PagamentoRateioItem item : rateiosNorm) {
                boolean okEmpresa = referenceRepository.existsEmpresaByNome(item.nome());
                boolean okFornecedor = referenceRepository.existsFornecedorByNome(item.nome());
                if (exigeEmpresa && !okEmpresa) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa inválida.");
                }
                if (exigeFornecedor && !okFornecedor) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fornecedor inválido.");
                }
                if (permiteAmbos && !(okEmpresa || okFornecedor)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa/Fornecedor inválido.");
                }
            }
            return;
        }

        if (exigeEmpresa || exigeFornecedor || permiteAmbos) {
            if (empresaFornecedorNorm == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa/Fornecedor obrigatório.");
            }
            empresaFornecedorNorm = truncate(empresaFornecedorNorm, MAX_EMPRESA_FORNECEDOR);
            boolean okEmpresa = referenceRepository.existsEmpresaByNome(empresaFornecedorNorm);
            boolean okFornecedor = referenceRepository.existsFornecedorByNome(empresaFornecedorNorm);
            if (exigeEmpresa && !okEmpresa) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa inválida.");
            }
            if (exigeFornecedor && !okFornecedor) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fornecedor inválido.");
            }
            if (permiteAmbos && !(okEmpresa || okFornecedor)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa/Fornecedor inválido.");
            }
        }
    }
}
