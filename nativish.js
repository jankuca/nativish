window.Nativish = {
	'load': function (path, callback) {
		var old_root = require.ROOT;
		require.ROOT += path;
		require.js(
			'lib/nativish/lib/utils/utils.js',
			'lib/nativish/lib/zepto/zepto.js',
			'lib/nativish/lib/iscroll/iscroll.js',
			'lib/nativish/src/App.js',
			'lib/nativish/src/Model.js',
			'lib/nativish/src/Controller.js',
			'lib/nativish/src/ui/UIUnit.js',
			'lib/nativish/src/ui/UIWindow.js',
			'lib/nativish/src/ui/UINavigationBar.js',
			'lib/nativish/src/ui/UIDialog.js',
			'lib/nativish/src/ui/UIMenuDialog.js',
			'lib/nativish/src/ui/UIView.js',
			'lib/nativish/src/ui/UIErrorView.js',
			'lib/nativish/src/ui/UITableView.js',
			'lib/nativish/src/ui/UIGridView.js',
			'lib/nativish/src/ui/UICell.js',
			'lib/nativish/src/ui/UIButton.js',
			'lib/nativish/src/ui/UIBackButton.js',
			callback
		);
	},
};