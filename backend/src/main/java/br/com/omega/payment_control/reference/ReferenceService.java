package br.com.omega.payment_control.reference;

import br.com.omega.payment_control.reference.ReferenceDtos.ColaboradorItem;
import br.com.omega.payment_control.reference.ReferenceDtos.DespesaItem;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceBundle;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceItem;
import org.springframework.stereotype.Service;

import java.util.List;

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

    public ReferenceBundle listarTudo() {
        ReferenceBundle bundle = new ReferenceBundle(
                listarSetores(),
                listarDespesas(null),
                listarSedes(),
                listarDotacoes(),
                listarEmpresas(),
                listarFornecedores(),
                listarColaboradores()
        );
        cacheBundle(bundle);
        return bundle;
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
}
