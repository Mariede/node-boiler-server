'use strict';

// -------------------------------------------------------------------------
// Modulos de inicializacao

// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Modulos de apoio
const cryptoHash = require('@serverRoot/helpers/crypto-hash');
const dbCon = require('@serverRoot/helpers/db');
const errWrapper = require('@serverRoot/helpers/err-wrapper');
const paginator = require('@serverRoot/helpers/paginator');
const searcher = require('@serverRoot/helpers/searcher');
const uploader = require('@serverRoot/helpers/uploader');
const validator = require('@serverRoot/helpers/validator');
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
/*
Constantes gerais do modulo
*/

/*
Constantes locais
*/
const enumLocals = {
	passMinLen: 4,
	passMaxLen: 20,
	detailsMinLen: 5,
	detailsMaxLen: 8000
};

/*
Colecoes enumeradas para a rota options
	-> utilizar key como 'OPTIONS.XXX' (para conversao json em paginator)
		-> ajuste automatico dos niveis json ao converter para camelCase em paginator, quando necessario
	-> na rota options a propriedade key nao e utilizada
*/
const enumOptions = {
	ativo: {
		key: 'OPTIONS.ATIVO',
		content: [
			{
				id: true,
				nome: 'ATIVO'
			},
			{
				id: false,
				nome: 'INATIVO'
			}
		]
	}
};
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Funcoes compartilhadas

// Validacao comum para insert e update de usuarios
const _commonValidationErrStack = (isNewRecord, nome, email, cpf, empresa, ativo, detalhes, perfis, senha, senhaCheck) => {
	const errorStack = [];

	if (validator.isEmpty(nome)) {
		errorStack.push('Nome não pode ser vazio...');
	} else {
		if (!validator.isCompleteName(nome)) {
			errorStack.push('Nome não parece completo...');
		}
	}

	if (validator.isEmpty(email)) {
		errorStack.push('E-mail não pode ser vazio...');
	} else {
		if (!validator.isEmail(email)) {
			errorStack.push('E-mail inválido...');
		}
	}

	if (validator.isEmpty(cpf)) {
		errorStack.push('CPF não pode ser vazio...');
	} else {
		if (!validator.isCpf(cpf)) {
			errorStack.push('CPF inválido...');
		}
	}

	if (validator.isEmpty(empresa)) {
		errorStack.push('Empresa não pode ser vazia...');
	} else {
		if (!validator.isInteger(empresa, false)) {
			errorStack.push('Empresa inválida...');
		}
	}

	if (validator.isEmpty(ativo, true, false)) { // Nao considera false vazio
		errorStack.push('Estado não pode ser vazio...');
	} else {
		if (!validator.isBoolean(ativo)) {
			errorStack.push('Estado inválido...');
		}
	}

	if (!validator.isEmpty(detalhes)) {
		if (!validator.lenRange(detalhes, enumLocals.detailsMinLen, enumLocals.detailsMaxLen)) {
			errorStack.push(`Detalhes deve conter entre ${enumLocals.detailsMinLen} e ${enumLocals.detailsMaxLen} caracteres...`);
		}
	}

	if (validator.isEmpty(perfis)) {
		errorStack.push('Perfis não pode ser vazio...');
	}

	// Apenas para novos usuarios
	if (isNewRecord) {
		if (validator.isEmpty(senha)) {
			errorStack.push('Senha não pode ser vazia...');
		} else {
			if (!validator.lenRange(senha, enumLocals.passMinLen, enumLocals.passMaxLen)) {
				errorStack.push(`Senha deve conter entre ${enumLocals.passMinLen} e ${enumLocals.passMaxLen} caracteres...`);
			}
		}

		if (validator.isEmpty(senhaCheck)) {
			errorStack.push('Confirmação de senha não pode ser vazia...');
		} else {
			if (!validator.equal(senhaCheck, senha)) {
				errorStack.push('Confirmação de senha não confere...');
			}
		}
	}

	if (errorStack.length !== 0) {
		errWrapper.throwThis('USUARIO', 400, errorStack);
	}
};

// Upload de arquivos para insert e update de usuarios
const _upload = async (req, res) => {
	const uploaderResults = await uploader.push(req, res, 'fileContent', 'files');
	return uploaderResults;
};
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Acoes
const consultarTodos = async (req, res) => {
	const replaceQuery = '{{REPLACE}}';
	const baseQuery = `
		-- Dados dos usuario (via searcher)
		SELECT DISTINCT
			A.ID_USUARIO
			,A.NOME
			,A.EMAIL
			,A.CPF
			,A.ATIVO
			,A.DETALHES
			,A.DATA_CRIACAO
			,A.ID_EMPRESA [EMPRESA.ID]
			,B.EMPRESA [EMPRESA.NOME]
			,B.ATIVO [EMPRESA.ATIVO]
			,(
				SELECT
					D.ID_PERFIL [ID]
					,D.PERFIL [NOME]
				FROM
					nodetest.PERFIL_USUARIO C (NOLOCK)
					INNER JOIN nodetest.PERFIL D (NOLOCK)
						ON C.ID_PERFIL = D.ID_PERFIL
				WHERE
					A.ID_USUARIO = C.ID_USUARIO
				FOR XML PATH ('PERFIL'), ROOT('PERFIS')
			) [PERFIS]
		FROM
			nodetest.USUARIO A (NOLOCK)
			INNER JOIN nodetest.EMPRESA B (NOLOCK)
				ON (A.ID_EMPRESA = B.ID_EMPRESA)
			INNER JOIN nodetest.PERFIL_USUARIO C (NOLOCK)
				ON (A.ID_USUARIO = C.ID_USUARIO)
			INNER JOIN nodetest.PERFIL D (NOLOCK)
				ON (C.ID_PERFIL = D.ID_PERFIL)
		${replaceQuery}
		-- ----------------------------------------
	`;

	// Searcher: colunas invalidas para pesquisa geram erro
	const resultSet = await searcher.setSearch(
		req,
		baseQuery,
		replaceQuery
	);

	// Ordenador, chaves para camelCase
	resultSet.recordset = paginator.setSort(req, resultSet.recordset, [{ xmlRoot: 'PERFIS', xmlPath: 'PERFIL' }]);

	// Paginador
	const pagedResultSet = paginator.setPage(req, resultSet, resultSet.recordset, resultSet.rowsAffected);

	return pagedResultSet;
};

const consultar = async (req, res) => {
	// Parametros de entrada
	const idUsuario = req.params.id;
	// -------------------------------------------------------------------------

	// Validacoes entrada
	if (!validator.isInteger(idUsuario, false)) {
		errWrapper.throwThis('USUARIO', 400, 'ID do usuário deve ser numérico...');
	}
	// -------------------------------------------------------------------------

	const query = {
		formato: 1,
		dados: {
			input: [
				['idUsuario', 'int', idUsuario]
			],
			executar: `
				-- Dados do usuario
				SELECT
					A.ID_USUARIO
					,A.NOME
					,A.EMAIL
					,A.CPF
					,A.ATIVO
					,A.DETALHES
					,A.DATA_CRIACAO
					,A.ID_EMPRESA [EMPRESA.ID]
					,B.EMPRESA [EMPRESA.NOME]
					,B.ATIVO [EMPRESA.ATIVO]
					,(
						SELECT
							D.ID_PERFIL [ID]
							,D.PERFIL [NOME]
						FROM
							nodetest.PERFIL_USUARIO C (NOLOCK)
							INNER JOIN nodetest.PERFIL D (NOLOCK)
								ON C.ID_PERFIL = D.ID_PERFIL
						WHERE
							A.ID_USUARIO = C.ID_USUARIO
						FOR XML PATH ('PERFIL'), ROOT('PERFIS')
					) [PERFIS]
				FROM
					nodetest.USUARIO A (NOLOCK)
					INNER JOIN nodetest.EMPRESA B (NOLOCK)
						ON (A.ID_EMPRESA = B.ID_EMPRESA)
				WHERE
					A.ID_USUARIO = @idUsuario;
				-- ----------------------------------------

				-- Retorna opcoes na mesma chamada, no mesmo json de retorno
				SELECT
					ID_EMPRESA [ID]
					,EMPRESA [NOME]
					,ATIVO
				FROM
					nodetest.EMPRESA (NOLOCK)
				ORDER BY
					EMPRESA;

				SELECT
					ID_PERFIL [ID]
					,PERFIL [NOME]
				FROM
					nodetest.PERFIL (NOLOCK)
				ORDER BY
					PERFIL;
				-- ----------------------------------------
			`
		}
	};

	const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);

	// Adiciona chaves extras ao resultset inicial (options acoplado)
	resultSet.recordsets[0] = paginator.addKeysToRecords(
		resultSet.recordsets[0],
		[
			{
				key: 'OPTIONS.EMPRESAS',
				content: Array.from(resultSet.recordsets[1])
			},
			{
				key: 'OPTIONS.PERFIS',
				content: Array.from(resultSet.recordsets[2])
			},
			enumOptions.ativo
		]
	);

	// Para o caso de mais de um recordset no result, mantem apenas o recordset inicial, chaves para camelCase
	const settedResult = paginator.setResult(resultSet, resultSet.recordsets[0], resultSet.rowsAffected[0], [{ xmlRoot: 'PERFIS', xmlPath: 'PERFIL' }]);

	return settedResult;
};

const inserir = async (req, res) => {
	// Parametros de entrada

	// Uploads, trocar req.body para result.body
	const uResult = await _upload(req, res);

	const nome = uResult.body.nome;
	const email = uResult.body.email;
	const cpf = String(uResult.body.cpf).replace(/\D/g, ''); // Mascara no formulario
	const empresa = uResult.body.empresa;
	const ativo = uResult.body.ativo;
	const detalhes = uResult.body.detalhes;
	const perfis = dbCon.msSqlServer.sanitize(uResult.body.perfis);

	// Senha inicial
	const senha = uResult.body.senha;
	const senhaCheck = uResult.body.senhaCheck;
	const salt = cryptoHash.generateSalt(5, false);
	// -------------------------------------------------------------------------

	// Validacoes entrada
	// Stack de erros
	_commonValidationErrStack(true, nome, email, cpf, empresa, ativo, detalhes, perfis, senha, senhaCheck);
	// -------------------------------------------------------------------------

	const query = {
		formato: 1,
		dados: {
			input: [
				['nome', 'varchar(200)', nome],
				['email', 'varchar(200)', email],
				['cpf', 'numeric(11, 0)', (cpf ? Number(cpf) : null)],
				['senha', 'varchar(128)', cryptoHash.hash(senha, salt).passHash],
				['salt', 'varchar(5)', salt],
				['empresa', 'int', empresa],
				['ativo', 'bit', ativo],
				['detalhes', 'varchar(max)', detalhes || null]
			],
			output: [
				['id', 'int']
			],
			executar: `
				-- Cria novo usuario
				INSERT INTO nodetest.USUARIO(
					ID_EMPRESA
					,NOME
					,EMAIL
					,CPF
					,SENHA
					,SALT
					,ATIVO
					,DETALHES
					,DATA_CRIACAO
				)
				VALUES(
					@empresa
					,@nome
					,@email
					,@cpf
					,@senha
					,@salt
					,@ativo
					,@detalhes
					,GETDATE()
				);

				SET @id = SCOPE_IDENTITY();

				DELETE
				FROM
					nodetest.PERFIL_USUARIO
				WHERE
					ID_USUARIO = @id;

				INSERT INTO nodetest.PERFIL_USUARIO(
					ID_PERFIL
					,ID_USUARIO
				)
				VALUES ${
					perfis.map(
						perfil => {
							return `\n(${perfil}, @id)`;
						}
					)
				}
				-- ----------------------------------------
			`
		}
	};

	const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);

	return resultSet.output;
};

const alterar = async (req, res) => {
	// Parametros de sessao
	const sess = req.session;
	const sessWraper = __serverConfig.auth.sessWrapper;
	// -------------------------------------------------------------------------

	// Parametros de entrada
	const idUsuario = req.params.id;

	// Uploads, trocar req.body para result.body
	const uResult = await _upload(req, res);

	const nome = uResult.body.nome;
	const email = uResult.body.email;
	const cpf = String(uResult.body.cpf).replace(/\D/g, ''); // Mascara no formulario
	const empresa = uResult.body.empresa;
	const ativo = uResult.body.ativo;
	const detalhes = uResult.body.detalhes;
	const perfis = dbCon.msSqlServer.sanitize(uResult.body.perfis);
	// -------------------------------------------------------------------------

	// Validacoes entrada
	if (!validator.isInteger(idUsuario, false)) {
		errWrapper.throwThis('USUARIO', 400, 'ID do usuário deve ser numérico...');
	}

	if (sess[sessWraper].id === parseInt(idUsuario, 10) && !ativo) {
		errWrapper.throwThis('USUARIO', 400, 'Não é possível desativar a si mesmo...');
	}

	// Stack de erros
	_commonValidationErrStack(false, nome, email, cpf, empresa, ativo, detalhes, perfis);
	// -------------------------------------------------------------------------

	const query = {
		formato: 1,
		dados: {
			input: [
				['idUsuario', 'int', idUsuario],
				['nome', 'varchar(200)', nome],
				['email', 'varchar(200)', email],
				['cpf', 'numeric(11, 0)', (cpf ? Number(cpf) : null)],
				['empresa', 'int', empresa],
				['ativo', 'bit', ativo],
				['detalhes', 'varchar(max)', detalhes || null]
			],
			output: [
				['id', 'int']
			],
			executar: `
				-- Atualiza usuario
				UPDATE
					A
				SET
					A.NOME = @nome
					,A.EMAIL = @email
					,A.CPF = @cpf
					,A.ID_EMPRESA = @empresa
					,A.ATIVO = @ativo
					,A.DETALHES = @detalhes
				FROM
					nodetest.USUARIO A
				WHERE
					A.ID_USUARIO = @idUsuario;

				DELETE
				FROM
					nodetest.PERFIL_USUARIO
				WHERE
					ID_USUARIO = @idUsuario;

				INSERT INTO nodetest.PERFIL_USUARIO(
					ID_PERFIL
					,ID_USUARIO
				)
				VALUES ${
					perfis.map(
						perfil => {
							return `\n(${perfil}, @idUsuario)`;
						}
					)
				}

				SET @id = @idUsuario;
				-- ----------------------------------------

				-- Se dados alterados forem do usuario logado, atualiza a sessao
				SELECT
					A.ID_USUARIO id
					,A.NOME nome
					,A.EMAIL email
					,B.EMPRESA empresa
				FROM
					nodetest.USUARIO A (NOLOCK)
					INNER JOIN nodetest.EMPRESA B (NOLOCK)
						ON (A.ID_EMPRESA = B.ID_EMPRESA)
				WHERE
					A.ID_USUARIO = @id;

				SELECT
					C.PERFIL _perfis
				FROM
					nodetest.USUARIO A (NOLOCK)
					INNER JOIN nodetest.PERFIL_USUARIO B (NOLOCK)
						ON (A.ID_USUARIO = B.ID_USUARIO)
					INNER JOIN nodetest.PERFIL C (NOLOCK)
						ON (B.ID_PERFIL = C.ID_PERFIL)
				WHERE
					A.ID_USUARIO = @id;

				SELECT DISTINCT
					D.FUNCAO _funcoes
				FROM
					nodetest.USUARIO A (NOLOCK)
					INNER JOIN nodetest.PERFIL_USUARIO B (NOLOCK)
						ON (A.ID_USUARIO = B.ID_USUARIO)
					INNER JOIN nodetest.PERFIL_FUNCAO C (NOLOCK)
						ON (B.ID_PERFIL = C.ID_PERFIL)
					INNER JOIN nodetest.FUNCAO D (NOLOCK)
						ON (C.ID_FUNCAO = D.ID_FUNCAO)
				WHERE
					A.ID_USUARIO = @id;
				-- ----------------------------------------
			`
		}
	};

	const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);

	// Atualiza dados da sessao ativa, apenas se mesmo usuario
	if (sess[sessWraper] && sess[sessWraper].id === parseInt(idUsuario, 10)) {
		if (resultSet && resultSet.recordsets) {
			const rsLen = resultSet.recordsets.length;

			const dataUser = resultSet.recordsets[rsLen - 3].length === 1 && resultSet.recordsets[rsLen - 3].pop();

			const perfis = (
				resultSet.recordsets[rsLen - 2].length !== 0 && resultSet.recordsets[rsLen - 2].map(
					_p => {
						return _p._perfis;
					}
				)
			) || [];

			const funcoes = (
				resultSet.recordsets[rsLen - 1].length !== 0 && resultSet.recordsets[rsLen - 1].map(
					_f => {
						return _f._funcoes;
					}
				)
			) || [];

			sess[sessWraper] = { ...sess[sessWraper], ...dataUser, perfis: perfis, funcoes: funcoes };
		}
	}

	return resultSet.output;
};

const excluir = async (req, res) => {
	// Parametros de sessao
	const sess = req.session;
	const sessWraper = __serverConfig.auth.sessWrapper;
	// -------------------------------------------------------------------------

	// Parametros de entrada
	const idUsuario = req.params.id;
	// -------------------------------------------------------------------------

	// Validacoes entrada
	if (!validator.isInteger(idUsuario, false)) {
		errWrapper.throwThis('USUARIO', 400, 'ID do usuário deve ser numérico...');
	}

	if (sess[sessWraper].id === parseInt(idUsuario, 10)) {
		errWrapper.throwThis('USUARIO', 400, 'Não é possível realizar esta operação em si mesmo...');
	}
	// -------------------------------------------------------------------------

	const query = {
		formato: 1,
		dados: {
			input: [
				['idUsuario', 'int', idUsuario]
			],
			output: [
				['id', 'int']
			],
			executar: `
				-- Exclui usuario
				DELETE
				FROM
					nodetest.PERFIL_USUARIO
				WHERE
					ID_USUARIO = @idUsuario;

				DELETE
				FROM
					nodetest.USUARIO
				WHERE
					ID_USUARIO = @idUsuario;

				SET @id = @idUsuario;
				-- ----------------------------------------
			`
		}
	};

	const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);

	return resultSet.output;
};

const ativacao = async (req, res) => {
	// Parametros de sessao
	const sess = req.session;
	const sessWraper = __serverConfig.auth.sessWrapper;
	// -------------------------------------------------------------------------

	// Parametros de entrada
	const idUsuario = req.params.id;
	const ativo = req.body.ativo === true;
	// -------------------------------------------------------------------------

	// Validacoes entrada
	if (!validator.isInteger(idUsuario, false)) {
		errWrapper.throwThis('USUARIO', 400, 'ID do usuário deve ser numérico...');
	}

	if (sess[sessWraper].id === parseInt(idUsuario, 10)) {
		errWrapper.throwThis('USUARIO', 400, 'Não é possível realizar esta operação em si mesmo...');
	}
	// -------------------------------------------------------------------------

	const query = {
		formato: 1,
		dados: {
			input: [
				['idUsuario', 'int', idUsuario],
				['ativo', 'bit', !ativo]
			],
			output: [
				['id', 'int']
			],
			executar: `
				-- Usuario Ativo / Inativo
				UPDATE
					A
				SET
					A.ATIVO = @ativo
				FROM
					nodetest.USUARIO A
				WHERE
					A.ID_USUARIO = @idUsuario;

				SET @id = @idUsuario;
				-- ----------------------------------------
			`
		}
	};

	const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);

	return resultSet.output;
};

const senha = async (req, res) => {
	// Parametros de sessao
	const sess = req.session;
	const sessWraper = __serverConfig.auth.sessWrapper;
	// -------------------------------------------------------------------------

	// Parametros de entrada
	const idUsuario = req.params.id;
	const senha = req.body.senha;
	const senhaNova = req.body.senhaNova;
	const senhaNovaCheck = req.body.senhaNovaCheck;
	// -------------------------------------------------------------------------

	// Validacoes entrada
	if (!validator.isInteger(idUsuario, false)) {
		errWrapper.throwThis('USUARIO', 400, 'ID do usuário deve ser numérico...');
	}

	if (sess[sessWraper].id !== parseInt(idUsuario, 10)) {
		errWrapper.throwThis('USUARIO', 400, 'Só é possível realizar esta operação em si mesmo...');
	}

	const errorStack = [];

	if (validator.isEmpty(senha)) {
		errorStack.push('Senha atual não pode ser vazia...');
	}

	if (validator.isEmpty(senhaNova)) {
		errorStack.push('Nova senha não pode ser vazia...');
	} else {
		if (!validator.lenRange(senhaNova, enumLocals.passMinLen, enumLocals.passMaxLen)) {
			errorStack.push(`Nova senha deve conter entre ${enumLocals.passMinLen} e ${enumLocals.passMaxLen} caracteres...`);
		} else {
			if (validator.equal(senhaNova, senha)) {
				errorStack.push('Nova senha não pode ser igual a atual...');
			}
		}
	}

	if (validator.isEmpty(senhaNovaCheck)) {
		errorStack.push('Confirmação de nova senha não pode ser vazia...');
	} else {
		if (!validator.equal(senhaNovaCheck, senhaNova)) {
			errorStack.push('Confirmação de nova senha não confere...');
		}
	}

	if (errorStack.length !== 0) {
		errWrapper.throwThis('USUARIO', 400, errorStack);
	} else {
		const query = {
			formato: 1,
			dados: {
				input: [
					['idUsuario', 'int', idUsuario]
				],
				executar: `
					-- Valida dados do usuario
					SELECT
						A.SENHA
						,A.SALT
						,A.ATIVO
					FROM
						nodetest.USUARIO A (NOLOCK)
					WHERE
						A.ID_USUARIO = @idUsuario;
					-- ----------------------------------------
				`
			}
		};

		const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);
		const dataUser = resultSet && resultSet.rowsAffected === 1 && resultSet.recordset.pop();
		const senhaCheck = (dataUser ? cryptoHash.hash(senha, dataUser.SALT) : null);

		if (!senhaCheck) {
			errWrapper.throwThis('USUARIO', 400, 'Erro ao recuperar dados do usuário...');
		} else {
			if (senhaCheck.passHash !== dataUser.SENHA) {
				errWrapper.throwThis('USUARIO', 400, 'Senha informada é inválida...');
			}
		}

		if (!dataUser.ATIVO) {
			errWrapper.throwThis('USUARIO', 400, 'Usuário inativo...');
		}
	}
	// -------------------------------------------------------------------------

	const salt = cryptoHash.generateSalt(5, false);

	const query = {
		formato: 1,
		dados: {
			input: [
				['idUsuario', 'int', idUsuario],
				['senha', 'varchar(128)', cryptoHash.hash(senhaNova, salt).passHash],
				['salt', 'varchar(5)', salt]
			],
			output: [
				['id', 'int']
			],
			executar: `
				-- Altera senha do usuario
				UPDATE
					A
				SET
					A.SENHA = @senha
					,A.SALT = @salt
				FROM
					nodetest.USUARIO A
				WHERE
					A.ID_USUARIO = @idUsuario;

				SET @id = @idUsuario;
				-- ----------------------------------------
			`
		}
	};

	const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);

	return resultSet.output;
};

const options = async (req, res) => {
	const query = {
		formato: 1,
		dados: {
			executar: `
				-- Opcoes -> Empresas disponiveis no DB
				SELECT
					ID_EMPRESA [ID]
					,EMPRESA [NOME]
					,ATIVO
				FROM
					nodetest.EMPRESA (NOLOCK)
				ORDER BY
					EMPRESA;

				-- Opcoes -> Perfis disponiveis no DB
				SELECT
					ID_PERFIL [ID]
					,PERFIL [NOME]
				FROM
					nodetest.PERFIL (NOLOCK)
				ORDER BY
					PERFIL;
				-- ----------------------------------------
			`
		}
	};

	const resultSet = await dbCon.msSqlServer.sqlExecuteAll(query);

	const optionsSet = {
		empresas: paginator.keysToCamelCase(resultSet.recordsets[0]), // Chaves para camelCase
		perfis: paginator.keysToCamelCase(resultSet.recordsets[1]) // Chaves para camelCase
	};

	const _enumOptions = {};

	// Mantem apenas a chave de conteudo
	Object.keys(enumOptions).forEach(
		key => {
			_enumOptions[key] = enumOptions[key].content;
		}
	);

	return { ...optionsSet, ..._enumOptions };
};
// -------------------------------------------------------------------------

module.exports = {
	consultarTodos,
	consultar,
	inserir,
	alterar,
	excluir,
	ativacao,
	senha,
	options
};
