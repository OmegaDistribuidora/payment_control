package br.com.omega.payment_control.reference;

import java.util.List;

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
            List<ColaboradorItem> colaboradores
    ) {}
}
