package br.com.omega.payment_control.controller;

import br.com.omega.payment_control.dto.PagamentoCreateRequest;
import br.com.omega.payment_control.dto.PagamentoHistoricoResponse;
import br.com.omega.payment_control.dto.PagamentoResponse;
import br.com.omega.payment_control.dto.PagamentoStatusUpdateRequest;
import br.com.omega.payment_control.dto.PagamentoUpdateRequest;
import br.com.omega.payment_control.entity.StatusPagamento;
import br.com.omega.payment_control.service.PagamentoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/pagamentos")
public class PagamentoController {

    private final PagamentoService service;

    public PagamentoController(PagamentoService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PagamentoResponse criar(@RequestBody @Valid PagamentoCreateRequest req, Authentication auth) {
        return service.criar(req, auth.getName());
    }

    // ✅ Agora com filtros
    @GetMapping("/meus")
    public Page<PagamentoResponse> listarMeus(
            Authentication auth,
            @RequestParam(required = false) LocalDate de,
            @RequestParam(required = false) LocalDate ate,
            @RequestParam(required = false) String sede,
            @RequestParam(required = false) String setor,
            @RequestParam(required = false) String despesa,
            @RequestParam(required = false) String dotacao,
            @RequestParam(required = false) StatusPagamento status,
            @RequestParam(required = false, name = "q") String q,
            Pageable pageable
    ) {
        return service.listarMeusComFiltros(
                auth.getName(),
                de, ate,
                sede, setor, despesa, dotacao,
                status,
                q,
                pageable
        );
    }

    @GetMapping("/meus/total")
    public Map<String, BigDecimal> somarMeus(
            Authentication auth,
            @RequestParam(required = false) LocalDate de,
            @RequestParam(required = false) LocalDate ate,
            @RequestParam(required = false) String sede,
            @RequestParam(required = false) String setor,
            @RequestParam(required = false) String despesa,
            @RequestParam(required = false) String dotacao,
            @RequestParam(required = false) StatusPagamento status,
            @RequestParam(required = false, name = "q") String q
    ) {
        BigDecimal total = service.somarMeusComFiltros(
                auth.getName(),
                de, ate,
                sede, setor, despesa, dotacao,
                status,
                q
        );
        Map<String, BigDecimal> body = new HashMap<>();
        body.put("total", total);
        return body;
    }

    @GetMapping("/{id}")
    public PagamentoResponse buscarMeu(@PathVariable Long id, Authentication auth) {
        return service.buscarMeu(id, auth.getName());
    }

    @PutMapping("/{id}")
    public PagamentoResponse editar(@PathVariable Long id,
                                    @RequestBody @Valid PagamentoUpdateRequest req,
                                    Authentication auth) {
        return service.editar(id, req, auth.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletar(@PathVariable Long id, Authentication auth) {
        service.deletarMeu(id, auth.getName());
    }

    @PatchMapping("/{id}/status")
    public PagamentoResponse alterarStatus(@PathVariable Long id,
                                           @RequestBody @Valid PagamentoStatusUpdateRequest req,
                                           Authentication auth) {
        return service.alterarStatus(id, req, auth.getName());
    }

    @GetMapping("/{id}/historico")
    public List<PagamentoHistoricoResponse> historico(
            @PathVariable Long id,
            Authentication auth
    ) {
        return service.listarHistorico(id, auth.getName());
    }

    @PostMapping("/normalize")
    public Map<String, Object> normalizarCampos(Authentication auth) {
        int updated = service.rebuildNormalizedFields(auth.getName());
        Map<String, Object> body = new HashMap<>();
        body.put("updated", updated);
        return body;
    }
}
