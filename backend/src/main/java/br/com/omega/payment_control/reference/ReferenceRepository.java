package br.com.omega.payment_control.reference;

import br.com.omega.payment_control.reference.ReferenceDtos.ColaboradorItem;
import br.com.omega.payment_control.reference.ReferenceDtos.DespesaItem;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.rowset.SqlRowSet;
import org.springframework.stereotype.Repository;

import java.util.List;

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
}
