package br.com.omega.payment_control.reference;

import java.util.List;
import java.util.Map;

public final class ReferenceDtos {

    private ReferenceDtos() {}

    public record ReferenceItem(Integer codigo, String nome) {}

    public record DespesaItem(Integer codigo, String nome, Integer codMt, String dspCent) {}

    public record ColaboradorItem(Integer codigo, String nome, String email) {}

    public record ReferenceBundle(
            List<ReferenceItem> setores,
            List<DespesaItem> despesas,
            List<ReferenceItem> sedes,
            List<ReferenceItem> dotacoes,
            List<ReferenceItem> empresas,
            List<ReferenceItem> fornecedores,
            List<ColaboradorItem> colaboradores,
            Map<String, List<String>> setorDespesas
    ) {}

    public record SetorConfigRequest(
            String nome,
            List<String> despesas
    ) {}

    public record DespesaConfigRequest(
            String setor,
            String despesa
    ) {}
}
