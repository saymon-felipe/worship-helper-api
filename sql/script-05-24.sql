
CREATE DATABASE  IF NOT EXISTS `worship_helper` /*!40100 DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci */;
USE `worship_helper`;

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `nome_usuario` varchar(50) NOT NULL,
  `email_usuario` varchar(100) NOT NULL,
  `senha_usuario` varchar(500) NOT NULL,
  `descricao_usuario` varchar(50) NOT NULL,
  `app_owner` int(11) NOT NULL DEFAULT 0,
  `imagem_usuario` varchar(500) NOT NULL DEFAULT '',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email_usuario` (`email_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Table structure for table `avisos_igreja`
--

DROP TABLE IF EXISTS `avisos_igreja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `avisos_igreja` (
  `id_aviso_igreja` int(11) NOT NULL AUTO_INCREMENT,
  `aviso_igreja_id_igreja` int(11) NOT NULL,
  `aviso_igreja_mensagem` varchar(100) NOT NULL,
  `aviso_igreja_id_criador` int(11) NOT NULL,
  `aviso_igreja_data_criacao` varchar(50) NOT NULL,
  PRIMARY KEY (`id_aviso_igreja`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `eventos`
--

DROP TABLE IF EXISTS `eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `eventos` (
  `id_evento` int(11) NOT NULL AUTO_INCREMENT,
  `nome_evento` varchar(50) NOT NULL,
  `data_criacao_evento` varchar(50) NOT NULL,
  `data_inicio_evento` varchar(50) NOT NULL,
  `id_criador` int(11) NOT NULL,
  PRIMARY KEY (`id_evento`),
  KEY `id_criador_idx` (`id_criador`),
  CONSTRAINT `id_criador` FOREIGN KEY (`id_criador`) REFERENCES `usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `funcoes_igreja`
--

DROP TABLE IF EXISTS `funcoes_igreja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `funcoes_igreja` (
  `id_funcoes_igreja` int(11) NOT NULL AUTO_INCREMENT,
  `id_funcoes_igreja_id_igreja` int(11) NOT NULL,
  `nome_funcao` varchar(50) NOT NULL,
  `tipo_funcao` varchar(50) NOT NULL,
  PRIMARY KEY (`id_funcoes_igreja`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `funcoes_usuario`
--

DROP TABLE IF EXISTS `funcoes_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `funcoes_usuario` (
  `id_funcoes_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `id_funcoes_igreja_id_igreja` int(11) NOT NULL,
  `id_funcoes_referencia` int(11) NOT NULL,
  `id_funcoes_igreja_id_usuario` int(11) NOT NULL,
  PRIMARY KEY (`id_funcoes_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igreja`
--

DROP TABLE IF EXISTS `igreja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `igreja` (
  `id_igreja` int(11) NOT NULL AUTO_INCREMENT,
  `nome_igreja` varchar(50) NOT NULL,
  `imagem_igreja` varchar(500) NOT NULL DEFAULT '',
  `usuario_administrador` int(11) NOT NULL,
  PRIMARY KEY (`id_igreja`),
  KEY `usuario_administrador` (`usuario_administrador`),
  CONSTRAINT `usuario_administrador` FOREIGN KEY (`usuario_administrador`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


DROP TABLE IF EXISTS `tags_igreja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_igreja` (
  `id_tag` int(11) NOT NULL AUTO_INCREMENT,
  `tags_id_igreja` int(11) NOT NULL,
  `nome_tag` varchar(50) NOT NULL,
  `tipo_tag` varchar(50) NOT NULL,
  PRIMARY KEY (`id_tag`),
  KEY `id_igreja_idx` (`tags_id_igreja`),
  CONSTRAINT `tags_id_igreja` FOREIGN KEY (`tags_id_igreja`) REFERENCES `igreja` (`id_igreja`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
--
-- Table structure for table `lista_tags_musicas`
--

DROP TABLE IF EXISTS `lista_tags_musicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lista_tags_musicas` (
  `id_tag_musicas` int(11) NOT NULL,
  `nome_tag` varchar(50) NOT NULL,
  PRIMARY KEY (`id_tag_musicas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `membros_eventos`
--

DROP TABLE IF EXISTS `membros_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `membros_eventos` (
  `id_membro_evento` int(11) NOT NULL AUTO_INCREMENT,
  `membros_eventos_id_usuario` int(11) NOT NULL,
  `membros_eventos_id_tag` int(11) NOT NULL,
  `membros_eventos_id_evento` int(11) NOT NULL,
  PRIMARY KEY (`id_membro_evento`),
  KEY `id_usuario_idx` (`membros_eventos_id_usuario`),
  KEY `id_tag_idx` (`membros_eventos_id_tag`),
  KEY `id_evento_idx` (`membros_eventos_id_evento`),
  CONSTRAINT `membros_eventos_id_evento` FOREIGN KEY (`membros_eventos_id_evento`) REFERENCES `eventos` (`id_evento`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `membros_eventos_id_tag` FOREIGN KEY (`membros_eventos_id_tag`) REFERENCES `tags_igreja` (`id_tag`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `membros_eventos_id_usuario` FOREIGN KEY (`membros_eventos_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metadados`
--

DROP TABLE IF EXISTS `metadados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metadados` (
  `tipo_metadado` varchar(50) NOT NULL,
  `data_criacao` varchar(50) NOT NULL,
  `data_confirmacao` varchar(50) NOT NULL DEFAULT '""',
  `nome_metadado` varchar(50) NOT NULL DEFAULT '""',
  `metadados_id_igreja` int(11) NOT NULL,
  `metadados_id_usuario` int(11) NOT NULL,
  `id_objeto` int(11) NOT NULL DEFAULT 0,
  `confirmacao` int(11) NOT NULL DEFAULT 0,
  `id_metadado` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id_metadado`),
  KEY `id_igreja_idx` (`metadados_id_igreja`),
  KEY `id_usuario_idx` (`metadados_id_usuario`),
  CONSTRAINT `metadados_id_igreja` FOREIGN KEY (`metadados_id_igreja`) REFERENCES `igreja` (`id_igreja`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `metadados_id_usuario` FOREIGN KEY (`metadados_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `musicas`
--

DROP TABLE IF EXISTS `musicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `musicas` (
  `id_musica` int(11) NOT NULL AUTO_INCREMENT,
  `nome_musica` varchar(50) NOT NULL,
  `artista_musica` varchar(50) NOT NULL DEFAULT '""',
  `audio_musica` varchar(500) NOT NULL,
  `cifra_musica` varchar(500) NOT NULL DEFAULT '""',
  `imagem_musica` varchar(500) NOT NULL DEFAULT '',
  PRIMARY KEY (`id_musica`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `musicas_eventos`
--

DROP TABLE IF EXISTS `musicas_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `musicas_eventos` (
  `id_musica_evento` int(11) NOT NULL AUTO_INCREMENT,
  `id_musica` int(11) NOT NULL,
  `id_evento` int(11) NOT NULL,
  `num_votos` int(11) NOT NULL DEFAULT 0,
  `votos_positivos` int(11) NOT NULL DEFAULT 0,
  `votos_negativos` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_musica_evento`),
  KEY `id_musica_idx` (`id_musica`),
  KEY `id_evento_idx` (`id_evento`),
  CONSTRAINT `id_evento` FOREIGN KEY (`id_evento`) REFERENCES `eventos` (`id_evento`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `id_musica` FOREIGN KEY (`id_musica`) REFERENCES `musicas` (`id_musica`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags_de_musicas`
--

DROP TABLE IF EXISTS `tags_de_musicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_de_musicas` (
  `id_tag_musica` int(11) NOT NULL AUTO_INCREMENT,
  `tag_id_musica` int(11) NOT NULL,
  `id_tag_referencia` int(11) NOT NULL,
  PRIMARY KEY (`id_tag_musica`),
  KEY `id_musica_idx` (`tag_id_musica`),
  KEY `id_tag_idx` (`id_tag_referencia`),
  CONSTRAINT `id_tag_referencia` FOREIGN KEY (`id_tag_referencia`) REFERENCES `lista_tags_musicas` (`id_tag_musicas`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `tag_id_musica` FOREIGN KEY (`tag_id_musica`) REFERENCES `musicas` (`id_musica`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags_igreja`
--



--
-- Table structure for table `tags_usuario`
--

DROP TABLE IF EXISTS `tags_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_usuario` (
  `tags_usuario_id_igreja` int(11) NOT NULL,
  `tags_usuario_id_usuario` int(11) NOT NULL,
  `tags_usuario_id_tag_referencia` int(11) NOT NULL,
  `id_tag_usuario` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id_tag_usuario`),
  KEY `id_igreja_idx` (`tags_usuario_id_igreja`),
  KEY `id_usuario_idx` (`tags_usuario_id_usuario`),
  KEY `id_tag_idx` (`tags_usuario_id_tag_referencia`),
  CONSTRAINT `tags_usuario_id_igreja` FOREIGN KEY (`tags_usuario_id_igreja`) REFERENCES `igreja` (`id_igreja`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `tags_usuario_id_tag_referencia` FOREIGN KEY (`tags_usuario_id_tag_referencia`) REFERENCES `tags_igreja` (`id_tag`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `tags_usuario_id_usuario` FOREIGN KEY (`tags_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuario`
--



create table versaodb (
	id int not null primary key auto_increment,
    versao varchar(10) not null
);

insert into versaodb (versao) values ("24.05.1");
