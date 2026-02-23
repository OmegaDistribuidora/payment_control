package br.com.omega.payment_control.repository;

import br.com.omega.payment_control.entity.Pagamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.Optional;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {

    Page<Pagamento> findByCriadoPor(String criadoPor, Pageable pageable);

    @EntityGraph(attributePaths = "rateios")
    Optional<Pagamento> findByIdAndCriadoPor(Long id, String criadoPor);

    @EntityGraph(attributePaths = "rateios")
    Optional<Pagamento> findById(Long id);

    @Modifying
    @Query("""
        update Pagamento p
        set p.sedeNorm = lower(p.sede),
            p.setorNorm = lower(p.setor),
            p.despesaNorm = lower(p.despesa),
            p.dotacaoNorm = lower(p.dotacao)
        where p.sedeNorm is null or p.sedeNorm <> lower(p.sede)
           or p.setorNorm is null or p.setorNorm <> lower(p.setor)
           or p.despesaNorm is null or p.despesaNorm <> lower(p.despesa)
           or p.dotacaoNorm is null or p.dotacaoNorm <> lower(p.dotacao)
        """)
    int rebuildNormalizedFields();

    @Query("""
        select p from Pagamento p
        where (:isPrivilegiado = true or p.criadoPor = :criadoPor)
          and (
                :filtrarDe = false
                or (p.dtVencimento is not null and p.dtVencimento >= :de)
                or (p.dtVencimento is null and p.dtPagamento >= :de)
              )
          and (
                :filtrarAte = false
                or (p.dtVencimento is not null and p.dtVencimento <= :ate)
                or (p.dtVencimento is null and p.dtPagamento <= :ate)
              )

          and (:filtrarSede = false or p.sedeNorm = :sede)
          and (:filtrarSetor = false or p.setorNorm = :setor)
          and (:filtrarDespesa = false or p.despesaNorm = :despesa)
          and (:filtrarDotacao = false or p.dotacaoNorm = :dotacao)

          and (
                :filtrarQ = false
                or lower(p.despesa) like :q
                or lower(p.descricao) like :q
              )
        """)
    Page<Pagamento> buscarMeusComFiltros(
            @Param("criadoPor") String criadoPor,
            @Param("isPrivilegiado") boolean isPrivilegiado,
            @Param("filtrarDe") boolean filtrarDe,
            @Param("de") LocalDate de,
            @Param("filtrarAte") boolean filtrarAte,
            @Param("ate") LocalDate ate,
            @Param("filtrarSede") boolean filtrarSede,
            @Param("sede") String sede,
            @Param("filtrarSetor") boolean filtrarSetor,
            @Param("setor") String setor,
            @Param("filtrarDespesa") boolean filtrarDespesa,
            @Param("despesa") String despesa,
            @Param("filtrarDotacao") boolean filtrarDotacao,
            @Param("dotacao") String dotacao,
            @Param("filtrarQ") boolean filtrarQ,
            @Param("q") String q,
            Pageable pageable
    );

    @Query("""
        select coalesce(sum(p.valorTotal), 0) from Pagamento p
        where (:isPrivilegiado = true or p.criadoPor = :criadoPor)
          and (
                :filtrarDe = false
                or (p.dtVencimento is not null and p.dtVencimento >= :de)
                or (p.dtVencimento is null and p.dtPagamento >= :de)
              )
          and (
                :filtrarAte = false
                or (p.dtVencimento is not null and p.dtVencimento <= :ate)
                or (p.dtVencimento is null and p.dtPagamento <= :ate)
              )

          and (:filtrarSede = false or p.sedeNorm = :sede)
          and (:filtrarSetor = false or p.setorNorm = :setor)
          and (:filtrarDespesa = false or p.despesaNorm = :despesa)
          and (:filtrarDotacao = false or p.dotacaoNorm = :dotacao)

          and (
                :filtrarQ = false
                or lower(p.despesa) like :q
                or lower(p.descricao) like :q
              )
        """)
    BigDecimal somarMeusComFiltros(
            @Param("criadoPor") String criadoPor,
            @Param("isPrivilegiado") boolean isPrivilegiado,
            @Param("filtrarDe") boolean filtrarDe,
            @Param("de") LocalDate de,
            @Param("filtrarAte") boolean filtrarAte,
            @Param("ate") LocalDate ate,
            @Param("filtrarSede") boolean filtrarSede,
            @Param("sede") String sede,
            @Param("filtrarSetor") boolean filtrarSetor,
            @Param("setor") String setor,
            @Param("filtrarDespesa") boolean filtrarDespesa,
            @Param("despesa") String despesa,
            @Param("filtrarDotacao") boolean filtrarDotacao,
            @Param("dotacao") String dotacao,
            @Param("filtrarQ") boolean filtrarQ,
            @Param("q") String q
    );
}
