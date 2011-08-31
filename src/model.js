goog.require('uuid');
goog.require('goog.json');
goog.require('Deferred');
goog.require('string.inflection');
goog.require('nativish.SQLStatement');
goog.require('nativish.SQLStatement.Modes');

goog.provide('nativish.Model');


/**
 * Combined interface for communicating with a local database and a server API
 * @constructor
 * @param {Object=} doc The model's document object.
 *   Used internally most of the time.
 * @param {boolean=} remote Whether the model data were loaded from a remote
 *   location (API). This is to be used only internally.
 */
var Model = function (doc, remote) {
	doc = doc || {};

	/**
	 * This model's document object (i.e. the current database record state)
	 * Note: The object is not auto-updated when the database records gets
	 *   changed from another model instance.
	 * @type {!Object}
	 */
	this.doc = doc;

	/**
	 * ID if this model
	 * @type {?string|number}
	 */
	this.id = doc['_id'] || null;

	/**
	 * ID of the parent model
	 * @type {?string|number}
	 */
	this.parent = null;

	/**
	 * Whether this model is stored in a database (i.e. exists within the system)
	 * @type {boolean}
	 */
	this.stored = Boolean(doc['_id']);

	/**
	 * Whether this model was loaded from a remote location (API)
	 * @type {boolean}
	 */
	this.remote = Boolean(remote);

	this.extractDoc_();
};

/**
 * Retrieves associated records
 * @param {string} association The associated collection name
 * @param {!Object|string|number} selector
 * @param {Object=} options
 * @return {Deferred}
 */
Model.prototype.get = function (association, selector, options) {
	var dfr = new Deferred();

	if (!this.id) {
		return dfr.complete('failure',
			new Error('Trying to get associations of an unsaved model'));
	}

	var association_name = string.inflection.toSingular(association);
	var M = Model.models_[association_name];
	if (!M) {
		return dfr.complete('failure',
			new Error('Unknown model ' + association_name));
	}

	if (!options.path) {
		options.path = Model.getRelativeApiPath_(
			this.constructor,
			Model.normalizeSelector_(this.id),
			string.inflection.toTableName(association),
			options);
	}
	M.all(selector, options).then(function (models) {
		for (var i = 0, ii = models.length; i < ii; ++i) {
			models[i].parent = this.id;
		}

		dfr.complete('success', models);
	}, dfr, this);

	return dfr;
};

/**
 * Sets values of the given fields to the current unix timestamp
 * @param {...string} var_fields
 */
Model.prototype.updateTimestamp = function (var_fields) {
	var fields = Array.prototype.concat.call(arguments);

	var ts = Math.floor(new Date().getTime() / 1000);
	fields.forEach(function (field) {
		this[field] = ts;
	}, this);
};

/**
 * Merges the current field values with the passed values
 * @param {!Object} values
 */
Model.prototype.update = function (values) {
	Object.keys(values).forEach(function (field) {
		this[field] = values[field];
	}, this);
};

/**
 * Saves the resource to the database and/or creates a push queue item
 * @return {Deferred}
 */
Model.prototype.save = function () {
	var dfr = new Deferred();

	// TODO: validation

	var doc = this.getTempDoc_();
	this.fillDoc_(doc);

	var db = this.constructor.db;
	if (!db) {
		return dfr.complete('failure', new Error('Missing database'));
	}
	if (!this.collection_name) {
		return dfr.complete('failure', new Error('Missing collection name'));
	}
	var st = new SQLStatement(db, this.collection_name, SQLStatement.Modes.UPSERT);
	st.selector = {
		'_id': this.id
	};
	st.options.limit = 1;
	st.data = doc;
	st.execute().pipe(dfr);

	return dfr;
};

/**
 * Extracts the model's document object to fields and associations
 */
Model.prototype.extractDoc_ = function () {
	var doc = this.doc;
	var skip = Model.skip_fields;
	Object.keys(doc).forEach(function (key) {
		if (skip.indexOf(key) !== -1) return;

		var value = doc[key];
		if (key.search(':') !== -1) { // field
			this[key] = value;
		} else if (key[0] === '_') { // meta
			if (key === '_parent' && value !== null) {
				this.parent = (typeof value === 'object') ?
					value['_id'] || null : value || null;
			}
		} else { // child models
			
		}
	}, this);
};

/**
 * Fills a model document object with the current state of the model
 */
Model.prototype.fillDoc_ = function (doc) {
	doc = doc || this.doc;

	doc['_id'] = this.id;
	if (doc['_parent'] !== undefined) {
		doc['_parent'] = this.parent;
	}
	Object.keys(this).forEach(function (key) {
		if (key.search(':') !== -1) { // field
			doc[key] = this[key];
		}
	}, this);
};

/**
 * Creates a clone of the model's document object
 * @return {!Object}
 */
Model.prototype.getTempDoc_ = function () {
	return /** @type {!Object} */ window.JSON.parse(
		window.JSON.stringify(this.doc));
};

/**
 * List of fields to ignore when exporting document objects. Very useful
 *   for excluding API-specific fields.
 * @type {Array.<string>}
 */
Model.skip_fields = ['url'];

/**
 * Database
 * @type {?Database}
 */
Model.db = null;

/**
 * Collection name
 * @type {?string}
 */
Model.collection_name = null;
Model.prototype.collection_name = Model.collection_name;

/**
 * API field
 * The field of which to use the value as an identifier in API paths
 * @type {string}
 */
Model.api_field = 'id';

/**
 * API HTTP request headers
 * The headers with which to provide each HTTP request to the API
 * @type {!Object}
 */
Model.api_headers = {
	'x-requested-with': 'XMLHttpRequest'
};

/**
 * List of defined models via {@code Model.create}
 * @type {Object.<string, Function>}
 * @private
 */
Model.models_ = {};

/**
 * Retrieves the first record matching the selector
 * @param {Function} M The model constructor to use for the results
 * @param {!Object|string|number} selector
 * @param {Object=} options
 * @return {Deferred}
 */
Model.one = function (M, selector, options) {
	options = options || {};
	options.limit = 1;
	return Model.all(M, selector, options);
};

/**
 * Retrieves the first record matching the selector
 * @param {Function} M The model constructor to use for the results
 * @param {!Object|string|number} selector
 * @param {Object=} options
 * @return {Deferred}
 */
Model.all = function (M, selector, options) {
	var dfr = new Deferred();

	options = options || {};
	if (!options.sort && M.sort) {
		options.sort = M.sort;
	}

	if (!options.online || app.MODE !== 'online') {
		if (!M.db) {
			return dfr.complete('failure', new Error('Missing database'));
		}
		if (!M.collection_name) {
			return dfr.complete('failure', new Error('Missing collection name'));
		}

		selector = Model.normalizeSelector_(selector);

		var st = new SQLStatement(M.db, M.collection_name,
			SQLStatement.Modes.SELECT);
		st.selector = selector;
		st.options = options;
		st.execute().then(function (rows) {
			var models = [];
			for (var i = 0, ii = rows.length; i < ii; ++i) {
				models.push(new M(rows.item(i)));
			}

			var result = (options.limit === 1) ? models[0] || new M() : models;
			dfr.complete('success', result);
		}, dfr);
	} else {
		// online-only mode
		Model.fetchAll(M, selector, options).pipe(dfr);
	}

	return dfr;
};

/**
 * Fetches server-side records that match the given selector
 * @param {Function} M The model constructor to use for the results
 * @param {!Object|string|number} selector
 * @param {Object=} options
 * @return {Deferred}
 */
Model.fetchOne = function (M, selector, options) {
	options = options || {};
	options.limit = 1;
	return Model.fetchAll(M, selector, options);
};
	
/**
 * Fetches server-side records that match the given selector
 * @param {Function} M The model constructor to use for the results
 * @param {!Object|string|number} selector
 * @param {Object=} options
 * @return {Deferred}
 */
Model.fetchAll = function (M, selector, options) {
	selector = Model.normalizeSelector_(selector);
	options = options || {};

	var dfr = new Deferred();

	var path = Model.getRelativeApiPath_(M, selector, null, options);
	Model.api('GET', path).then(function (response) {
		var models = [];
		if (Array.isArray(response)) {
			for (var i = 0, ii = response.length; i < ii; ++i) {
				models.push(new M(response[i], true));
			}
		} else if (response) {
			models.push(new M(response, true));
		}

		var result = (options.limit === 1) ? models[0] || new M() : models;
		dfr.complete('success', result);
	}, dfr);

	return dfr;
};

/**
 * Either searches the local database or requests search results from the API
 * @param {Function} M The model constructor to use for the results
 * @param {string} field The field in which to search
 * @param {Array.<string>} words List of words for which to search
 */
Model.search = function (M, field, words) {
	var dfr = new Deferred();

	if (!words.length) {
		return dfr.complete('failure', new Error('No words specified'));
	}

	field = 'lower([' + field.replace(':', '__') + '])';
	var selector = {};
	selector[field] = { '$search': words };
	var st = new SQLStatement(M.db, M.collection_name,
		SQLStatement.Modes.SELECT);
	st.selector = selector;
	st.execute().pipe(dfr);

	return dfr;
};

/**
 * Sends an HTTP request to the API
 * @param {string} method The HTTP method to use
 * @param {string} path The path
 * @param {Object=} data Request body
 * @return {Deferred}
 */
Model.api = function (method, path, data) {
	var dfr = new Deferred();

	var xhr = new XMLHttpRequest();
	xhr.open(method, path, true);

	// headers
	var headers = Model.api_headers;
	Object.keys(headers).forEach(function (key) {
		xhr.setRequestHeader(key, headers);
	});

	// response
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			var result = null;
			try {
				result = goog.json.unsafeParse(xhr.responseText);
			} finally {
				dfr.complete(xhr.status < 400 ? 'success' : 'failure', result);
			}
		}
	};

	// body
	var body_parts = [];
	Object.keys(data || {}).forEach(function (key) {
		body_parts.push(key + '=' + window.encodeURIComponent(data[key]));
	});
	xhr.send(body_parts.join('&'));

	return dfr;
};

/**
 * Returns a selector that can be used for querying the database/API
 * @param {!Object|string|number} selector The selector to normalize
 * @return {!Object}
 */
Model.normalizeSelector_ = function (selector) {
	if (typeof selector !== 'object') {
		return { '_id': selector };
	}
	return selector;
};

/**
 * Creates an API path relative to the API root
 * @param {Function} M The model constructor to use
 *   for the results
 * @param {!Object} selector
 * @param {?string=} association An optional association collection name
 * @param {Object=} options
 * @return {string}
 */
Model.getRelativeApiPath_ = function (M, selector, association, options) {
	var path = options.path;
	if (!path) {
		var field = M.api_field.replace(/^_id$/, 'id');
		path = Model.getRelativeApiPathname_(M, selector[field], association);
		var query_parts = [];
		Object.keys(selector).forEach(function (key) {
			if (key !== field && key.search(':') !== -1) {
				query_parts.push(key + '=' + window.encodeURIComponent(selector[key]));
			}
		});
		if (query_parts.length) {
			path += '?' + query_parts.join('&');
		}
	}
	return path;
};

/**
 * Creates an API pathname relative to the API root
 * @param {Function} M The model constructor to use
 *   for the results
 * @param {string|number=} value An optional identifier to target
 *   one particular record
 * @param {?string=} association An optional association collection name
 * @return {string} The pathname (i.e. /collection_name[/value[/association]])
 */
Model.getRelativeApiPathname_ = function (M, value, association) {
	var pathname = '/' + M.collection_name;
	if (value) {
		pathname += '/' + value;
		if (association) {
			pathname += '/' + association;
		}
	}
	return pathname;
};

/**
 * Helper constructor used for {@code Model} inheritance
 * Note: "Bare" stands for having an empty constructor body and not having
 *   static methods.
 * @constructor
 * @private
 */
var BareModel_ = function () {};
BareModel_.prototype = Model.prototype;

/**
 * Creates a model constructor that inherits from {@code Model} and gets
 *   static methods for model data retrieval.
 * @param {string} name The new model name; gets used for a collection name,
 *   document object child node field names and API resource URLs.
 */
Model.create = function (name) {
	/**
	 * @constructor
	 * @extends {Model}
	 */
	function M(doc, remote) {
		Model.call(this, doc, remote);
	};
	M.prototype = new BareModel_();
	M.prototype.constructor = M;
	M.prototype.super_ = Model;

	M.name = name;
	M.db = Model.db;
	M.api_field = Model.api_field;
	M.collection_name = string.inflection.toTableName(
		string.inflection.toPlural(name));
	M.prototype.collection_name = M.collection_name;

	/**
	 * @param {!Object|string|number} selector
	 * @param {Object=} options
	 */
	M.one = function (selector, options) {
		Model.one(M, selector, options);
	};

	/**
	 * @param {!Object|string|number} selector
	 * @param {Object=} options
	 */
	M.all = function (selector, options) {
		Model.all(M, selector, options);
	};

	/**
	 * @param {string} field The field in which to search
	 * @param {Array.<string>} words List of words for which to search
	 */
	M.search = function (field, words) {
		Model.all(M, field, words);
	};

	Model.models_[name] = M;

	return M;
};
