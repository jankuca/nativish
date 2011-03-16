var _ = function (key /* , params... */) {
	if (lang[key] === undefined) {
		console.warn('Undefined language key: ' + key);
		return '';
	}

	var val = lang[key] + '',
		params = Array.prototype.slice.call(arguments, 1),
		i, ii = params.length;
	for (i = 1; i <= ii; ++i) {
		val = val.replace(new RegExp('%\\{' + i + '\\}', 'g'), params[i - 1]);
	}
	return val;
};