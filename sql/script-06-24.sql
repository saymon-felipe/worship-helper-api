alter table musicas drop column audio_musica;
alter table musicas drop column cifra_musica;
alter table musicas drop column imagem_musica;

alter table musicas add column video_url varchar(100) not null;
alter table musicas add column cifra_url varchar(100) not null;
alter table musicas add column imagem varchar(100) not null;

insert into versaodb (versao) values ("24.06.1");