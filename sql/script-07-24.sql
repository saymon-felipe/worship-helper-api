create table curtidas_comentarios_musicas (
	id int not null primary key auto_increment,
    id_usuario int not null,
    id_comentario int not null,
    data_criacao varchar(100) not null default current_timestamp()
);

create table comentarios_musica (
	id int not null primary key auto_increment,
    id_musica int not null,
    id_usuario int not null,
    data_criacao varchar(100) not null default current_timestamp(),
    mensagem varchar(100) not null
);

insert into versaodb (versao) values ("24.07.2");

drop table eventos;
drop table membros_eventos;
drop table musicas_eventos;

create table membros_eventos (
	id int not null primary key auto_increment,
    id_usuario int not null,
    id_funcao int not null,
    id_evento int not null
);

create table musicas_eventos (
	id int not null primary key auto_increment,
    id_musica int not null,
    id_evento int not null
);

create table eventos (
	id int not null primary key auto_increment,
    nome varchar(50) not null,
    data_criacao datetime not null default current_timestamp(),
    data_inicio datetime not null,
    id_criador int not null,
    id_igreja int not null
);

create table votacoes_musicas_eventos (
	id int not null primary key auto_increment,
    id_musica_evento int not null,
    id_usuario int not null,
    aprova int not null
);

CREATE TABLE tons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(5) NOT NULL,
    tipo VARCHAR(6) NOT NULL
);

INSERT INTO tons (nome, tipo) VALUES
('C', 'maior'),
('C#', 'maior'),
('D', 'maior'),
('D#', 'maior'),
('E', 'maior'),
('F', 'maior'),
('F#', 'maior'),
('G', 'maior'),
('G#', 'maior'),
('A', 'maior'),
('A#', 'maior'),
('B', 'maior'),
('Cm', 'menor'),
('C#m', 'menor'),
('Dm', 'menor'),
('Ebm', 'menor'),
('Em', 'menor'),
('Fm', 'menor'),
('F#m', 'menor'),
('Gm', 'menor'),
('G#m', 'menor'),
('Am', 'menor'),
('Bbm', 'menor'),
('Bm', 'menor');

ALTER TABLE eventos
MODIFY COLUMN data_inicio varchar(50) not null;

INSERT INTO versaodb (versao) values ("24.07.3");

alter table musicas_eventos add column tom int not null;

create table tons_igreja (
	id int not null primary key auto_increment,
    id_tom int not null,
    id_igreja int not null,
    id_musica int not null
);

insert into versaodb (versao) values ("24.07.4");

insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (16, "Latina");

insert into versaodb (versao) values ("24.07.5");