'use strict';

// -------------------------------------------------------------------------
// Modulos de inicializacao

// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Modulos de apoio

// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
/*
Esquemas mongoose para MongoDB
	-> verifique exemplos na pasta de documentacao
*/
const schemas = {};

/*
Indices compostos associados na criacao dos esquemas
	-> ex: { key1: 1, key2: -1, _unique: true } ou [{ key1: 1, key2: -1 }, { ke5: 1, key6: 1, _unique: true }]
		 1: Ascendente
		-1: Descendente

	-> Acrescentar a chave _unique: true ao objeto de indice para indice unico
*/
const schemasCompoundIndexes = {};

/*
Opcoes extras associadas na criacao dos esquemas e acopladas as opcoes gerais (em config)
	-> ex: { bufferCommands: true }
*/
const schemasExtraOptions = {};

module.exports = {
	schemas,
	schemasCompoundIndexes,
	schemasExtraOptions
};
