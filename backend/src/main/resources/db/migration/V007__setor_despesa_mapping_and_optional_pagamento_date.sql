ALTER TABLE pagamentos
    ALTER COLUMN dt_pagamento DROP NOT NULL;

CREATE TABLE IF NOT EXISTS ref_setor_despesa (
    setor_codigo INTEGER NOT NULL,
    despesa_codigo INTEGER NOT NULL,
    CONSTRAINT pk_ref_setor_despesa PRIMARY KEY (setor_codigo, despesa_codigo),
    CONSTRAINT fk_ref_setor_despesa_setor
        FOREIGN KEY (setor_codigo) REFERENCES ref_setor (codigo) ON DELETE CASCADE,
    CONSTRAINT fk_ref_setor_despesa_despesa
        FOREIGN KEY (despesa_codigo) REFERENCES ref_despesa (codigo) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ref_setor_despesa_setor
    ON ref_setor_despesa (setor_codigo);

