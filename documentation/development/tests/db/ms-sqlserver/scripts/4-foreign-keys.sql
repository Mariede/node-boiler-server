USE [NODE_TEST]
GO

/****** Object:  FK [FK_LOGS_USUARIO] ******/
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_LOGS_USUARIO]') AND parent_object_id = OBJECT_ID(N'[nodetest].[LOGS]'))
ALTER TABLE [nodetest].[LOGS]  WITH CHECK ADD  CONSTRAINT [FK_LOGS_USUARIO] FOREIGN KEY([ID_USUARIO])
REFERENCES [nodetest].[USUARIO] ([ID_USUARIO])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_LOGS_USUARIO]') AND parent_object_id = OBJECT_ID(N'[nodetest].[LOGS]'))
ALTER TABLE [nodetest].[LOGS] CHECK CONSTRAINT [FK_LOGS_USUARIO]
GO

/****** Object:  FK [FK_PERFIL_FUNCAO_FUNCAO] ******/
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_FUNCAO_FUNCAO]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_FUNCAO]'))
ALTER TABLE [nodetest].[PERFIL_FUNCAO]  WITH CHECK ADD  CONSTRAINT [FK_PERFIL_FUNCAO_FUNCAO] FOREIGN KEY([ID_FUNCAO])
REFERENCES [nodetest].[FUNCAO] ([ID_FUNCAO])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_FUNCAO_FUNCAO]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_FUNCAO]'))
ALTER TABLE [nodetest].[PERFIL_FUNCAO] CHECK CONSTRAINT [FK_PERFIL_FUNCAO_FUNCAO]
GO

/****** Object:  FK [FK_PERFIL_FUNCAO_PERFIL] ******/
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_FUNCAO_PERFIL]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_FUNCAO]'))
ALTER TABLE [nodetest].[PERFIL_FUNCAO]  WITH CHECK ADD  CONSTRAINT [FK_PERFIL_FUNCAO_PERFIL] FOREIGN KEY([ID_PERFIL])
REFERENCES [nodetest].[PERFIL] ([ID_PERFIL])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_FUNCAO_PERFIL]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_FUNCAO]'))
ALTER TABLE [nodetest].[PERFIL_FUNCAO] CHECK CONSTRAINT [FK_PERFIL_FUNCAO_PERFIL]
GO

/****** Object:  FK [FK_PERFIL_USUARIO_PERFIL] ******/
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_USUARIO_PERFIL]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_USUARIO]'))
ALTER TABLE [nodetest].[PERFIL_USUARIO]  WITH CHECK ADD  CONSTRAINT [FK_PERFIL_USUARIO_PERFIL] FOREIGN KEY([ID_PERFIL])
REFERENCES [nodetest].[PERFIL] ([ID_PERFIL])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_USUARIO_PERFIL]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_USUARIO]'))
ALTER TABLE [nodetest].[PERFIL_USUARIO] CHECK CONSTRAINT [FK_PERFIL_USUARIO_PERFIL]
GO

/****** Object:  FK [FK_PERFIL_USUARIO_USUARIO] ******/
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_USUARIO_USUARIO]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_USUARIO]'))
ALTER TABLE [nodetest].[PERFIL_USUARIO]  WITH CHECK ADD  CONSTRAINT [FK_PERFIL_USUARIO_USUARIO] FOREIGN KEY([ID_USUARIO])
REFERENCES [nodetest].[USUARIO] ([ID_USUARIO])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_PERFIL_USUARIO_USUARIO]') AND parent_object_id = OBJECT_ID(N'[nodetest].[PERFIL_USUARIO]'))
ALTER TABLE [nodetest].[PERFIL_USUARIO] CHECK CONSTRAINT [FK_PERFIL_USUARIO_USUARIO]
GO

/****** Object:  FK [FK_USUARIO_EMPRESA] ******/
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_USUARIO_EMPRESA]') AND parent_object_id = OBJECT_ID(N'[nodetest].[USUARIO]'))
ALTER TABLE [nodetest].[USUARIO]  WITH CHECK ADD  CONSTRAINT [FK_USUARIO_EMPRESA] FOREIGN KEY([ID_EMPRESA])
REFERENCES [nodetest].[EMPRESA] ([ID_EMPRESA])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[nodetest].[FK_USUARIO_EMPRESA]') AND parent_object_id = OBJECT_ID(N'[nodetest].[USUARIO]'))
ALTER TABLE [nodetest].[USUARIO] CHECK CONSTRAINT [FK_USUARIO_EMPRESA]
GO