CREATE TABLE IF NOT EXISTS ref_setor (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_dspcent (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_despesa (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cod_mt INTEGER NOT NULL,
  CONSTRAINT fk_ref_despesa_dspcent
    FOREIGN KEY (cod_mt) REFERENCES ref_dspcent (codigo)
);

CREATE TABLE IF NOT EXISTS ref_empresa (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_fornecedor (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_sede (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_dotacao (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_colaborador (
  codigo INTEGER PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(120)
);

INSERT INTO ref_setor (codigo, nome) VALUES
  (1, 'Administrativo'),
  (2, 'Logistico'),
  (3, 'Financeiro'),
  (4, 'RH'),
  (5, 'TI'),
  (6, 'Contabil'),
  (7, 'Comercial')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_dspcent (codigo, nome) VALUES
  (1, 'RH'),
  (2, 'Administrativo'),
  (3, 'TI'),
  (4, 'Logistico'),
  (5, 'Comercial'),
  (6, 'Contabil')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_despesa (codigo, nome, cod_mt) VALUES
  (11, '13o Salario', 1),
  (12, 'Acordo Trabalhista', 1),
  (13, 'Ajuda De Custo Promotor', 1),
  (14, 'Ajuda De Custos - Transporte', 1),
  (15, 'Aso - Exames Adm E Demis.', 1),
  (16, 'Confraternizacao', 1),
  (17, 'Crachas E Uniformes', 1),
  (18, 'Despesas Com Alimentacao - Almoco', 1),
  (19, 'Despesas Com Reuniao', 1),
  (110, 'Despesas De Alimentacao Pessoal', 1),
  (111, 'Despesas Com Alimentacao', 1),
  (112, 'Diarias Avulsas', 1),
  (113, 'Diarias Com Tercerizados', 1),
  (114, 'Diarias De Mot. E Ajudantes Ext.', 1),
  (115, 'Ferias', 1),
  (116, 'Fgts', 1),
  (117, 'Fgts - Consignado', 1),
  (118, 'Fgts - Rescisao', 1),
  (119, 'Gratificacoes Pessoal', 1),
  (120, 'Inss', 1),
  (121, 'Plano De Saude', 1),
  (122, 'Coparticipacao - Plano de Saude', 1),
  (123, 'Plano Odontoligico', 1),
  (124, 'Rescisoes Trabalhistas', 1),
  (125, 'Folhas de pagamento - Mensal', 1),
  (126, 'Adiantamento quinzenal', 1),
  (127, 'Taxa Sindical', 1),
  (128, 'Vale Transporte', 1),
  (129, 'Viagens e Estadias', 1),
  (130, 'Distrato', 1),
  (131, 'Caju - Salario', 1),
  (132, 'Caju - Ferias', 1),
  (133, 'Caju - Combustivel', 1),
  (134, 'Rescisao', 1),
  (135, 'Pensao Alimenticia', 1),
  (136, 'Pro Labore', 1),
  (21, 'Agua e Esgoto', 2),
  (22, 'Aluguel Predio', 2),
  (23, 'Assistencia Medica', 2),
  (24, 'Cartorio / Taxas - Adm', 2),
  (25, 'Cesta Basica', 2),
  (26, 'Compra de Agua - Garrafao', 2),
  (27, 'Contribuicoes e Doacoes', 2),
  (28, 'Diversos', 2),
  (29, 'Energia Eletrica', 2),
  (210, 'Estacionamento', 2),
  (211, 'Imobilizados', 2),
  (212, 'Internet E Telefonia', 2),
  (213, 'Iptu', 2),
  (214, 'Manutencao e Conservacao Predial', 2),
  (215, 'Mat. de Expediente', 2),
  (216, 'Outros Tributos Estaduais', 2),
  (217, 'Outros Tributos Municipais', 2),
  (218, 'Pis/Cofins', 2),
  (219, 'Pro Labore', 2),
  (220, 'Salario do Administrativo', 2),
  (221, 'Servico De Seguranca', 2),
  (31, 'Aquisicao Equip. Informatica', 3),
  (32, 'Licenca Programas', 3),
  (33, 'Manutencao De Equip. Informatica', 3),
  (34, 'Manutencao Sistemas', 3),
  (35, 'Salario de TI', 3),
  (36, 'Tinta Para Impressoras', 3),
  (41, 'Cipa e Material de Seguranca', 4),
  (42, 'Combustivel', 4),
  (43, 'Credito para Cliente por Produto Coletado', 4),
  (44, 'Depreciacao De Utilizacao Veiculos Proprio', 4),
  (45, 'Despesas Veiculo', 4),
  (46, 'Ipva / Licenciamento', 4),
  (47, 'Multa / Transito', 4),
  (48, 'Salario da Logistica', 4),
  (51, 'Fornecedores Invest.', 5),
  (52, 'Salario', 5),
  (61, 'Honorarios', 6),
  (62, 'Salario', 6)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_empresa (codigo, nome) VALUES
  (1, 'Omega Barroso'),
  (2, 'Omega Matriz'),
  (3, 'Omega Juazeiro'),
  (4, 'Omega Sobral'),
  (5, 'Omega Geral'),
  (6, 'Tcjk'),
  (7, 'Orion'),
  (8, 'Du Chico'),
  (9, 'Fco. Jose')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_fornecedor (codigo, nome) VALUES
  (117, 'Bombril'),
  (3609, 'Mili'),
  (5569, 'Gallo')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_sede (codigo, nome) VALUES
  (1, 'Omega Barroso'),
  (2, 'Omega Matriz'),
  (3, 'Omega Juazeiro'),
  (4, 'Omega Sobral'),
  (5, 'Omega Geral'),
  (6, 'Tcjk'),
  (7, 'Orion'),
  (8, 'Du Chico'),
  (9, 'Fco. Jose')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_dotacao (codigo, nome) VALUES
  (1, 'Empresa'),
  (2, 'Fornecedor'),
  (3, 'Empr/Fornecedor'),
  (4, 'Funcionario'),
  (6, '-')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ref_colaborador (codigo, nome, email) VALUES
  (1, 'Nilton Linhares', NULL),
  (2, 'Carlos', 'ccostta44@gmail.com'),
  (3, 'Analise.Da', 'omegadistribuidora.da@gmail.com'),
  (4, 'Erilania', NULL),
  (5, 'TesteWilliam', 'symphonyddevelopment@gmail.com')
ON CONFLICT (codigo) DO NOTHING;

UPDATE ref_despesa
SET nome = 'Adiantamento quinzenal'
WHERE codigo = 126 AND lower(nome) = 'andiantamento quinzenal';
