-- Expand text fields to prevent truncation when many rateios are saved.
-- Apply manually on PostgreSQL.

ALTER TABLE pagamentos
    ALTER COLUMN empresa_fornecedor TYPE VARCHAR(255);

ALTER TABLE pagamento_rateio
    ALTER COLUMN nome TYPE VARCHAR(255);
