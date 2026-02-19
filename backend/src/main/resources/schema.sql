create table if not exists ref_setor (
  codigo integer primary key,
  nome varchar(80) not null
);

create table if not exists ref_dspcent (
  codigo integer primary key,
  nome varchar(80) not null
);

create table if not exists ref_despesa (
  codigo integer primary key,
  nome varchar(120) not null,
  cod_mt integer not null,
  constraint fk_ref_despesa_dspcent
    foreign key (cod_mt) references ref_dspcent (codigo)
);

create table if not exists ref_empresa (
  codigo integer primary key,
  nome varchar(120) not null
);

create table if not exists ref_fornecedor (
  codigo integer primary key,
  nome varchar(120) not null
);

create table if not exists ref_sede (
  codigo integer primary key,
  nome varchar(120) not null
);

create table if not exists ref_dotacao (
  codigo integer primary key,
  nome varchar(120) not null
);

create table if not exists ref_colaborador (
  codigo integer primary key,
  nome varchar(120) not null,
  email varchar(120)
);

create table if not exists ref_setor_despesa (
  setor_codigo integer not null,
  despesa_codigo integer not null,
  constraint pk_ref_setor_despesa primary key (setor_codigo, despesa_codigo),
  constraint fk_ref_setor_despesa_setor
    foreign key (setor_codigo) references ref_setor (codigo) on delete cascade,
  constraint fk_ref_setor_despesa_despesa
    foreign key (despesa_codigo) references ref_despesa (codigo) on delete cascade
);
