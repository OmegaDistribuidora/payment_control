package br.com.omega.payment_control.reference;

import br.com.omega.payment_control.reference.ReferenceDtos.ColaboradorItem;
import br.com.omega.payment_control.reference.ReferenceDtos.DespesaItem;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.rowset.SqlRowSet;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class ReferenceRepository {

    private final JdbcTemplate jdbc;

    public ReferenceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ReferenceItem> listSetores() {
        return jdbc.query(
                "select codigo, nome from ref_setor order by codigo",
                (rs, row) -> new ReferenceItem(rs.getInt("codigo"), rs.getString("nome"))
        );
    }

    public Map<String, List<String>> listSetorDespesas() {
        ensureSetorDespesasTable();
        String sql = """
                select s.nome as setor_nome, d.nome as despesa_nome
                from ref_setor_despesa sd
                join ref_setor s on s.codigo = sd.setor_codigo
                join ref_despesa d on d.codigo = sd.despesa_codigo
                order by lower(s.nome), lower(d.nome)
                """;
        return jdbc.query(sql, rs -> {
            Map<String, List<String>> result = new LinkedHashMap<>();
            while (rs.next()) {
                String setor = rs.getString("setor_nome");
                String despesa = rs.getString("despesa_nome");
                result.computeIfAbsent(setor, ignored -> new ArrayList<>()).add(despesa);
            }
            return result;
        });
    }

    public List<ReferenceItem> listDspCentros() {
        return jdbc.query(
                "select codigo, nome from ref_dspcent order by codigo",
                (rs, row) -> new ReferenceItem(rs.getInt("codigo"), rs.getString("nome"))
        );
    }

    public List<DespesaItem> listDespesas(Integer codMt) {
        if (codMt == null) {
            return jdbc.query(
                    """
                    select d.codigo, d.nome, d.cod_mt, c.nome as dspcent
                    from ref_despesa d
                    join ref_dspcent c on c.codigo = d.cod_mt
                    order by d.codigo
                    """,
                    (rs, row) -> new DespesaItem(
                            rs.getInt("codigo"),
                            rs.getString("nome"),
                            rs.getInt("cod_mt"),
                            rs.getString("dspcent")
                    )
            );
        }

        return jdbc.query(
                """
                select d.codigo, d.nome, d.cod_mt, c.nome as dspcent
                from ref_despesa d
                join ref_dspcent c on c.codigo = d.cod_mt
                where d.cod_mt = ?
                order by d.codigo
                """,
                (rs, row) -> new DespesaItem(
                        rs.getInt("codigo"),
                        rs.getString("nome"),
                        rs.getInt("cod_mt"),
                        rs.getString("dspcent")
                ),
                codMt
        );
    }

    public List<ReferenceItem> listEmpresas() {
        return jdbc.query(
                "select codigo, nome from ref_empresa order by codigo",
                (rs, row) -> new ReferenceItem(rs.getInt("codigo"), rs.getString("nome"))
        );
    }

    public List<ReferenceItem> listFornecedores() {
        return jdbc.query(
                "select codigo, nome from ref_fornecedor order by codigo",
                (rs, row) -> new ReferenceItem(rs.getInt("codigo"), rs.getString("nome"))
        );
    }

    public List<ReferenceItem> listSedes() {
        return jdbc.query(
                "select codigo, nome from ref_sede order by codigo",
                (rs, row) -> new ReferenceItem(rs.getInt("codigo"), rs.getString("nome"))
        );
    }

    public List<ReferenceItem> listDotacoes() {
        return jdbc.query(
                "select codigo, nome from ref_dotacao order by codigo",
                (rs, row) -> new ReferenceItem(rs.getInt("codigo"), rs.getString("nome"))
        );
    }

    public List<ColaboradorItem> listColaboradores() {
        return jdbc.query(
                "select codigo, nome, email from ref_colaborador order by codigo",
                (rs, row) -> new ColaboradorItem(
                        rs.getInt("codigo"),
                        rs.getString("nome"),
                        rs.getString("email")
                )
        );
    }

    public Integer findCodigoSedeByNome(String nome) {
        return findCodigoByNome("ref_sede", nome);
    }

    public Integer findCodigoSetorByNome(String nome) {
        return findCodigoByNome("ref_setor", nome);
    }

    public Integer findCodigoDspcentByNome(String nome) {
        return findCodigoByNome("ref_dspcent", nome);
    }

    public Integer findCodigoDespesaByNome(String nome) {
        return findCodigoByNome("ref_despesa", nome);
    }

    public int nextSetorCodigo() {
        Integer next = jdbc.queryForObject("select coalesce(max(codigo), 0) + 1 from ref_setor", Integer.class);
        return next == null ? 1 : next;
    }

    public void insertSetor(Integer codigo, String nome) {
        jdbc.update("insert into ref_setor (codigo, nome) values (?, ?)", codigo, nome);
    }

    public int nextDspcentCodigo() {
        Integer next = jdbc.queryForObject("select coalesce(max(codigo), 0) + 1 from ref_dspcent", Integer.class);
        return next == null ? 1 : next;
    }

    public void insertDspcent(Integer codigo, String nome) {
        jdbc.update("insert into ref_dspcent (codigo, nome) values (?, ?)", codigo, nome);
    }

    public int nextDespesaCodigo() {
        Integer next = jdbc.queryForObject("select coalesce(max(codigo), 0) + 1 from ref_despesa", Integer.class);
        return next == null ? 1 : next;
    }

    public void insertDespesa(Integer codigo, String nome, Integer codMt) {
        jdbc.update(
                "insert into ref_despesa (codigo, nome, cod_mt) values (?, ?, ?)",
                codigo,
                nome,
                codMt
        );
    }

    public void replaceSetorDespesas(Integer setorCodigo, List<Integer> despesasCodigos) {
        ensureSetorDespesasTable();
        jdbc.update("delete from ref_setor_despesa where setor_codigo = ?", setorCodigo);
        if (despesasCodigos == null || despesasCodigos.isEmpty()) {
            return;
        }
        jdbc.batchUpdate(
                "insert into ref_setor_despesa (setor_codigo, despesa_codigo) values (?, ?) on conflict do nothing",
                despesasCodigos,
                despesasCodigos.size(),
                (ps, despesaCodigo) -> {
                    ps.setInt(1, setorCodigo);
                    ps.setInt(2, despesaCodigo);
                }
        );
    }

    public Integer findCodigoColaboradorByLogin(String login) {
        if (login == null || login.isBlank()) return null;
        String sql = """
                select codigo
                from ref_colaborador
                where lower(nome) = lower(?) or lower(email) = lower(?)
                limit 1
                """;
        SqlRowSet rowSet = jdbc.queryForRowSet(sql, login, login);
        return rowSet.next() ? rowSet.getInt("codigo") : null;
    }

    public String findNomeColaboradorByLogin(String login) {
        if (login == null || login.isBlank()) return null;
        String sql = """
                select nome
                from ref_colaborador
                where lower(nome) = lower(?) or lower(email) = lower(?)
                limit 1
                """;
        SqlRowSet rowSet = jdbc.queryForRowSet(sql, login, login);
        return rowSet.next() ? rowSet.getString("nome") : null;
    }

    public boolean existsSedeByNome(String nome) {
        return existsByNome("ref_sede", nome);
    }

    public boolean existsSetorByNome(String nome) {
        return existsByNome("ref_setor", nome);
    }

    public boolean existsDespesaByNome(String nome) {
        return existsByNome("ref_despesa", nome);
    }

    public boolean existsDotacaoByNome(String nome) {
        return existsByNome("ref_dotacao", nome);
    }

    public boolean existsEmpresaByNome(String nome) {
        return existsByNome("ref_empresa", nome);
    }

    public boolean existsFornecedorByNome(String nome) {
        return existsByNome("ref_fornecedor", nome);
    }

    private Integer findCodigoByNome(String table, String nome) {
        if (nome == null || nome.isBlank()) return null;
        String sql = "select codigo from " + table + " where lower(nome) = lower(?) limit 1";
        SqlRowSet rowSet = jdbc.queryForRowSet(sql, nome);
        return rowSet.next() ? rowSet.getInt("codigo") : null;
    }

    private boolean existsByNome(String table, String nome) {
        if (nome == null || nome.isBlank()) return false;
        String sql = "select 1 from " + table + " where lower(nome) = lower(?) limit 1";
        SqlRowSet rowSet = jdbc.queryForRowSet(sql, nome);
        return rowSet.next();
    }

    private void ensureSetorDespesasTable() {
        jdbc.execute("""
                create table if not exists ref_setor_despesa (
                    setor_codigo integer not null,
                    despesa_codigo integer not null,
                    constraint pk_ref_setor_despesa primary key (setor_codigo, despesa_codigo),
                    constraint fk_ref_setor_despesa_setor
                        foreign key (setor_codigo) references ref_setor (codigo) on delete cascade,
                    constraint fk_ref_setor_despesa_despesa
                        foreign key (despesa_codigo) references ref_despesa (codigo) on delete cascade
                )
                """);
        jdbc.execute("""
                create index if not exists idx_ref_setor_despesa_setor
                on ref_setor_despesa (setor_codigo)
                """);
    }
}
