alter table musicas drop column audio_musica;
alter table musicas drop column cifra_musica;
alter table musicas drop column imagem_musica;

alter table musicas add column video_url varchar(100) not null;
alter table musicas add column cifra_url varchar(100) not null;
alter table musicas add column imagem varchar(100) not null;

alter table musicas add column video_id varchar(20) not null;
ALTER TABLE musicas ADD INDEX IDX_video_id (video_id);

insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (1, "pop");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (2, "rock");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (3, "sertanejo");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (4, "congregacional");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (5, "contemporâneo");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (6, "pentecostal");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (7, "jovem");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (8, "rap");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (9, "instrumental");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (10, "country");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (11, "corinho");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (12, "reggae");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (13, "funk");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (14, "infantil");
insert into lista_tags_musicas (id_tag_musicas, nome_tag) values (15, "eletronica");

alter table tags_de_musicas drop column id_tag_musica;
alter table tags_de_musicas add column id int not null primary key auto_increment;


insert into versaodb (versao) values ("24.06.1");