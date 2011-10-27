goog.require('mongo2sql');
goog.require('Deferred');
goog.require('goog.object');

goog.provide('nativish.SQLStatement');
goog.provide('nativish.SQLStatement.Modes');


/**
 * Wrapper around the Web SQL database API
 * @constructor
 * @param {Database} db The Web SQL database to query
 * @param {string} collection The name of the target collection/table
 * @param {SQLStatement.Modes} mode The mode in which to execute the queries
 */
 nativish.SQLStatement = function (db, collection, mode) {
	this.db_ = db;
	this.collection_ = collection;
	this.mode_ = mode;
	this.selector = {};
	this.options = {
		fields: [],
		sort: {},
		limit: 0
	};
	this.data = {};
};

/**
 * Executes SQL queries needed to get the job done
 * Some modes (currently only UPSERT) have subsequent secondary mode that is
 *   needed if the query in the first mode is not enough.
 * @return {Deferred}
 */
nativish.SQLStatement.prototype.execute = function () {
	var dfr = new Deferred();

	var primary_mode = this.getPrimaryMode_();
	var sql = this.getSQL_(primary_mode);
	this.executeSQL_(sql[0], sql[1]).then(function (result) {
		if (result.rowsAffected || result.rows.length) {
			if (primary_mode === nativish.SQLStatement.Modes.SELECT) {
				dfr.complete('success', result.rows);
			} else {
				dfr.complete('success', result);
			}
		} else {
			var secondary_mode = this.getSecondaryMode_();
			if (secondary_mode === null) {
				dfr.complete('failure', 'No record updated');
			} else {
				// Currently implies UPSERT
				var sql = this.getSQL_(secondary_mode);
				this.executeSQL_(sql[0], sql[1]).pipe(dfr);
			}
		}
	}, dfr, this);

	return dfr;
};

/**
 * Executes an SQL query
 * @param {string} sql The SQL query to execute
 * @param {Array} params A list of parameters with which to substitude "?"s
 *   in the query
 * @return {Deferred}
 */
nativish.SQLStatement.prototype.executeSQL_ = function (sql, params) {
	var dfr = new Deferred();

	this.db_.transaction(function (tx) {
		tx.executeSql(sql, params, function (tx, result) {
			dfr.complete('success', result);
		}, function (tx, err) {
			dfr.complete('failure', err);
		});
	});

	return dfr;
};

/**
 * Returns the mode in which to execute the first query
 * @return {SQLStatement.Modes}
 */
nativish.SQLStatement.prototype.getPrimaryMode_ = function () {
	if (this.mode_ === nativish.SQLStatement.Modes.UPSERT) {
		return nativish.SQLStatement.Modes.UPDATE;
	}
	return this.mode_;
};

/**
 * Returns the mode in which to execute the second query
 * Currently only UPSERT needs up to two queries.
 * @return {?SQLStatement.Modes}
 */
nativish.SQLStatement.prototype.getSecondaryMode_ = function () {
	if (this.mode_ === nativish.SQLStatement.Modes.UPSERT) {
		return nativish.SQLStatement.Modes.INSERT;
	}
	return this.mode_ || null;
};

nativish.SQLStatement.prototype.getSQL_ = function (mode) {
	switch (mode) {
		case nativish.SQLStatement.Modes.SELECT:
			return this.getSelectSQL_();
		case nativish.SQLStatement.Modes.INSERT:
			return this.getInsertSQL_();
		case nativish.SQLStatement.Modes.UPDATE:
			return this.getUpdateSQL_();
		case nativish.SQLStatement.Modes.DELETE:
			return this.getDeleteSQL_();
		default:
			throw new Error('Invalid nativish.SQLStatement mode');
	}
};

nativish.SQLStatement.prototype.getSelectSQL_ = function () {
	var selector = this.selector;
	var options = this.options;

	var chunks = [];
	var params = [];

	chunks.push('SELECT');
	var fields = options.fields || [];
	if (fields.length) {
		fields = fields.map(function (field) {
			return (field.search(/\[/) === -1) ? '[' + field + ']' : field;
		});
		chunks.push(fields.join(', '));
	} else {
		chunks.push('*');
	}

	chunks.push('FROM', this.collection_);

	if (goog.object.getKeys(selector).length) {
		chunks.push('WHERE');
		var res = mongo2sql.stringify(selector);
		chunks.push(res.sql);
		params.push.apply(params, res.params);
	}

	var sort = options.sort || {};
	if (typeof sort === 'string') {
		var sort_field = sort;
		sort = {};
		sort[sort_field] = 1;
	}
	if (goog.object.getKeys(sort).length) {
		chunks.push('ORDER BY');
		goog.object.getKeys(sort).forEach(function (field) {
			chunks.push('lower([' + field.replace(':', mongo2sql.NAMESPACE_SEPARATOR) + '])');
			chunks.push(sort[field] > 0 ? 'ASC' : 'DESC');
		});
	}

	if (options.limit) {
		chunks.push('LIMIT', options.limit);
	}

	var sql = chunks.join(' ');
	return [sql, params];
};

nativish.SQLStatement.prototype.getInsertSQL_ = function () {
	var selector = this.selector;
	var options = this.options;
	var data = this.data;

	var chunks = [];
	var params = [];

	chunks.push('INSERT INTO', this.collection_);

	var fields = goog.object.getKeys(data).map(function (field) {
		params.push(data[field]);
		field = (field.search(/\[/) === -1) ? '[' + field + ']' : field;
		return field.replace(':', mongo2sql.NAMESPACE_SEPARATOR);
	});
	chunks.push('(', fields.join(', '), ') VALUES (');
	chunks.push(new Array(fields.length + 1).join('?, ').replace(/,\s$/, ''));
	chunks.push(')');

	var sql = chunks.join(' ');
	return [sql, params];
};

nativish.SQLStatement.prototype.getUpdateSQL_ = function () {
	var selector = this.selector;
	var options = this.options;
	var data = this.data;

	var chunks = [];
	var params = [];

	chunks.push('UPDATE', this.collection_, 'SET');

	var fields = [];
	goog.object.getKeys(data).forEach(function (field) {
		params.push(data[field]);
		field = (field.search(/\[/) === -1) ? '[' + field + ']' : field;
		field = field.replace(':', mongo2sql.NAMESPACE_SEPARATOR);
		fields.push(field + ' = ?');
	});
	chunks.push(fields.join(', '));

	if (goog.object.getKeys(selector).length) {
		chunks.push('WHERE');
		var res = mongo2sql.stringify(selector);
		chunks.push(res.sql);
		params.push.apply(params, res.params);
	}

	var sql = chunks.join(' ');
	return [sql, params];
};

nativish.SQLStatement.prototype.getDeleteSQL_ = function () {
	var selector = this.selector;
	var options = this.options;

	var chunks = [];
	var params = [];

	chunks.push('DELETE FROM', this.collection_);

	if (goog.object.getKeys(selector).length) {
		chunks.push('WHERE');
		var res = mongo2sql.stringify(selector);
		chunks.push(res.sql);
		params.push.apply(params, res.params);
	}

	var sql = chunks.join(' ');
	return [sql, params];
};

/**
 * @enum
 */
nativish.SQLStatement.Modes = {
	SELECT: 1,
	INSERT: 2,
	UPDATE: 3,
	UPSERT: 4,
	DELETE: 5
};
