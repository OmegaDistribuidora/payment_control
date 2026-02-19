INSERT INTO ref_setor (codigo, nome)
VALUES (7, 'Comercial')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_despesa (codigo, nome, cod_mt)
VALUES
  (135, 'Pensao Alimenticia', 1),
  (136, 'Pro Labore', 1)
ON CONFLICT (codigo) DO NOTHING;

UPDATE ref_despesa
SET nome = 'Adiantamento quinzenal'
WHERE codigo = 126 AND lower(nome) = 'andiantamento quinzenal';
