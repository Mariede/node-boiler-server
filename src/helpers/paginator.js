'use strict';

// -------------------------------------------------------------------------
// Modulos de inicializacao

// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
// Modulos de apoio
const errWrapper = require('@serverRoot/helpers/err-wrapper');
// -------------------------------------------------------------------------

// -------------------------------------------------------------------------
/*
Ordenador (sort): sortElements deve ser uma array e case sensitive para as chaves (metodo privado)
	-> sortOrder Array ASC/DESC (default: ASC)
	-> sortCaseInsensitive true/false
*/
const _executeSort = (jsonData, sortElements, sortOrder, sortCaseInsensitive) => {
	const sortThis = (a, b, i, iLen) => {
		if (i < iLen) {
			const order = ((sortOrder[i] || '').toUpperCase() === 'DESC' ? { d1: 1, a1: -1 } : { d1: -1, a1: 1 });
			const aCheck = (a[sortElements[i]] || '');
			const bCheck = (b[sortElements[i]] || '');
			const checkData = collator.compare(aCheck, bCheck);

			return ((checkData < 0) ? order.d1 : ((checkData > 0) ? order.a1 : sortThis(a, b, i + 1, iLen)));
		}

		return 0;
	};

	const newData = Array.from(jsonData);
	const sortElementsLen = (Array.isArray(sortElements) ? sortElements.length : 0);
	const collator = new Intl.Collator(
		undefined, // Default locale
		{
			ignorePunctuation: false,
			localeMatcher: 'best fit',
			numeric: true,
			sensitivity: (sortCaseInsensitive ? 'base' : 'case'),
			usage: 'sort'
		}
	);

	newData.sort(
		(a, b) => {
			return sortThis(a, b, 0, sortElementsLen);
		}
	);

	return newData;
};

// Paginador (page): pagina currentPage / itemsPerPage, retorno => pageDetails, recordset, output, rowsAffected (metodo privado)
const _executePage = (jsonData, jsonDataLen, currentPage, itemsPerPage, output = {}) => {
	const backPage = currentPage - 1;
	const _iFrom = (backPage * itemsPerPage) + 1;
	const _iTo = currentPage * itemsPerPage;
	const pageDetails = {
		currentPage: currentPage,
		itemsPerPage: itemsPerPage,
		itemsFrom: (_iFrom <= jsonDataLen ? (_iTo !== 0 ? _iFrom : 0) : 0),
		itemsTo: (_iFrom <= jsonDataLen ? (_iTo <= jsonDataLen ? _iTo : jsonDataLen) : 0),
		itemsCount: jsonDataLen,
		totalPages: Math.ceil(jsonDataLen / itemsPerPage)
	};
	const indexSearchStart = backPage * itemsPerPage;
	const indexSearchStop = indexSearchStart + itemsPerPage;
	const recordSet = jsonData.filter(
		(e, i) => {
			return (i >= indexSearchStart && i < indexSearchStop);
		}
	);
	const rowsAffected = [recordSet.length];

	return (
		{ pageDetails: pageDetails, recordset: recordSet, output: output, rowsAffected: rowsAffected }
	);
};

// Converte chaves de uma array com objetos de SNAKE_CASE para camelCase
const keysToCamelCase = jsonData => {
	const convertKeys = (cKey, cValue, nDocument) => {
		const transformP = p => {
			const changedP = p.toLowerCase().replace(
				/[_]([a-z])/g,
				g => {
					return g[1].toUpperCase();
				}
			);

			return changedP;
		};

		const nKey = transformP(cKey);

		if (Array.isArray(cValue)) {
			nDocument[nKey] = [];
			loopKeys(cValue, nDocument[nKey]);
		} else {
			if (typeof cValue === 'object' && cValue !== null) {
				nDocument[nKey] = {};
				loopKeys(cValue, nDocument[nKey]);
			}
		}

		return nKey;
	};

	const loopKeys = (cDocument, nDocument) => {
		Object.keys(cDocument).forEach(
			currentKey => {
				const currentValue = cDocument[currentKey];
				const newKey = convertKeys(currentKey, currentValue, nDocument);

				if (currentValue === null || typeof currentValue !== 'object') {
					nDocument[newKey] = currentValue;
				}
			}
		);
	};

	const loopArray = jData => {
		if (Array.isArray(jData)) {
			for (let i = 0; i < jData.length; i++) {
				const currentDocument = jData[i];

				if (typeof currentDocument === 'object' && currentDocument !== null) {
					newData.push({});
					loopKeys(currentDocument, newData[i]);
				}
			}
		}
	};

	const newData = [];

	if (jsonData) {
		loopArray(jsonData);
	}

	return newData;
};

// Chamada inicial, verifica os dados de entrada do cliente, executa a acao (ordenador)
const setSort = (req, jsonData, toCamelCase = false) => {
	const sortElements = [];
	const sortOrder = [];
	const sortCaseInsensitive = /^(true|yes|y|sim|s){0,1}$/i.test(req.query.sort_case_insensitive);

	if (req.query.sort_fields) {
		req.query.sort_fields.split(/[,|]/).forEach(
			e => {
				const sortField = e.split(/[:]/);

				if (sortField[0]) {
					sortElements.push(sortField[0]);
					sortOrder.push((sortField[1] || ''));
				}
			}
		);
	}

	if (req.method.toUpperCase() !== 'GET') {
		errWrapper.throwThis('ORDENAÇÃO (SORTER)', 400, 'Favor utilizar verbo GET para realizar a ordenação...');
	}

	return _executeSort((toCamelCase ? keysToCamelCase(jsonData) : jsonData), sortElements, sortOrder, sortCaseInsensitive);
};

/*
Chamada inicial, verifica os dados de entrada do cliente, executa a acao (paginador)
	-> page na querystring e obrigatorio para a paginacao
*/
const setPage = (req, jsonData, jsonDataLen, toCamelCase = false) => {
	let currentPage = 0,
		itemsPerPage = 10;

	if (/^(\d)+$/.test(req.query.page)) {
		currentPage = parseInt(req.query.page, 10);
	}

	if (/^(\d)+$/.test(req.query.items_per_page)) {
		itemsPerPage = parseInt(req.query.items_per_page, 10);
	}

	if (toCamelCase && jsonData.recordset) {
		jsonData.recordset = keysToCamelCase(jsonData.recordset);
	}

	if (req.method.toUpperCase() !== 'GET') {
		errWrapper.throwThis('PAGINAÇÃO (PAGINATOR)', 400, 'Favor utilizar verbo GET para realizar a consulta...');
	}

	if (currentPage && jsonData.recordset) {
		return _executePage(jsonData.recordset, jsonDataLen, currentPage, itemsPerPage, jsonData.output);
	}

	return jsonData;
};
// -------------------------------------------------------------------------

module.exports = {
	keysToCamelCase,
	setSort,
	setPage
};
