package br.com.omega.payment_control.reference;

import br.com.omega.payment_control.reference.ReferenceDtos.ColaboradorItem;
import br.com.omega.payment_control.reference.ReferenceDtos.DespesaItem;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceBundle;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceItem;
import br.com.omega.payment_control.reference.ReferenceDtos.SetorConfigRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class ReferenceService {

    private final ReferenceRepository repository;
    private static final long CACHE_TTL_MS = 1000L * 60 * 5;
    private volatile ReferenceBundle cachedBundle;
    private volatile long cacheAt;

    public ReferenceService(ReferenceRepository repository) {
        this.repository = repository;
    }

    public List<ReferenceItem> listarSetores() {
        ReferenceBundle cached = getCachedBundle();
        return cached != null ? cached.setores() : repository.listSetores();
    }

    public List<ReferenceItem> listarDspCentros() {
        return repository.listDspCentros();
    }

    public List<DespesaItem> listarDespesas(Integer codMt) {
        if (codMt == null) {
            ReferenceBundle cached = getCachedBundle();
            if (cached != null) {
                return cached.despesas();
            }
        }
        return repository.listDespesas(codMt);
    }

    public List<ReferenceItem> listarEmpresas() {
        ReferenceBundle cached = getCachedBundle();
        return cached != null ? cached.empresas() : repository.listEmpresas();
    }

    public List<ReferenceItem> listarFornecedores() {
        ReferenceBundle cached = getCachedBundle();
        return cached != null ? cached.fornecedores() : repository.listFornecedores();
    }

    public List<ReferenceItem> listarSedes() {
        ReferenceBundle cached = getCachedBundle();
        return cached != null ? cached.sedes() : repository.listSedes();
    }

    public List<ReferenceItem> listarDotacoes() {
        ReferenceBundle cached = getCachedBundle();
        return cached != null ? cached.dotacoes() : repository.listDotacoes();
    }

    public List<ColaboradorItem> listarColaboradores() {
        ReferenceBundle cached = getCachedBundle();
        return cached != null ? cached.colaboradores() : repository.listColaboradores();
    }

    public java.util.Map<String, List<String>> listarSetorDespesas() {
        ReferenceBundle cached = getCachedBundle();
        return cached != null ? cached.setorDespesas() : repository.listSetorDespesas();
    }

    public ReferenceBundle listarTudo() {
        ReferenceBundle bundle = new ReferenceBundle(
                listarSetores(),
                listarDespesas(null),
                listarSedes(),
                listarDotacoes(),
                listarEmpresas(),
                listarFornecedores(),
                listarColaboradores(),
                listarSetorDespesas()
        );
        cacheBundle(bundle);
        return bundle;
    }

    @Transactional
    public ReferenceBundle salvarSetorConfig(SetorConfigRequest request) {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acao permitida somente para admin.");
        }

        String setorNome = trimToNull(request == null ? null : request.nome());
        if (setorNome == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome do setor e obrigatorio.");
        }

        List<String> despesasRaw = request == null ? null : request.despesas();
        Set<String> despesasNormalizadas = new LinkedHashSet<>();
        if (despesasRaw != null) {
            for (String despesa : despesasRaw) {
                String valor = trimToNull(despesa);
                if (valor != null) {
                    despesasNormalizadas.add(valor);
                }
            }
        }
        if (despesasNormalizadas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe ao menos uma despesa para o setor.");
        }

        Integer setorCodigo = repository.findCodigoSetorByNome(setorNome);
        if (setorCodigo == null) {
            setorCodigo = repository.nextSetorCodigo();
            repository.insertSetor(setorCodigo, setorNome);
        }

        List<Integer> despesasCodigos = new ArrayList<>();
        for (String despesaNome : despesasNormalizadas) {
            Integer despesaCodigo = repository.findCodigoDespesaByNome(despesaNome);
            if (despesaCodigo == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Despesa invalida para o setor: " + despesaNome
                );
            }
            despesasCodigos.add(despesaCodigo);
        }

        repository.replaceSetorDespesas(setorCodigo, despesasCodigos);
        clearCache();
        return listarTudo();
    }

    private ReferenceBundle getCachedBundle() {
        long now = System.currentTimeMillis();
        ReferenceBundle cached = cachedBundle;
        if (cached == null) return null;
        if (now - cacheAt > CACHE_TTL_MS) {
            cachedBundle = null;
            return null;
        }
        return cached;
    }

    private void cacheBundle(ReferenceBundle bundle) {
        cachedBundle = bundle;
        cacheAt = System.currentTimeMillis();
    }

    public void clearCache() {
        cachedBundle = null;
        cacheAt = 0L;
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        if ("admin".equalsIgnoreCase(auth.getName())) {
            return true;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_GERENCIA".equals(a.getAuthority()));
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
