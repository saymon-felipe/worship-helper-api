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