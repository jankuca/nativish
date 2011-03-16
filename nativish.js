window.Nativish = {
	'load': function (path, callback) {
		var old_root = require.ROOT;
		require.ROOT += path;
		require.js(
			'lib/utils/utils.js',
			'lib/zepto/zepto.js',
			'lib/iscroll/iscroll.js',
			'src/App.js',
			'src/Model.js',
			'src/Controller.js',
			'src/ui/UIUnit.js',
			'src/ui/UIWindow.js',
			'src/ui/UINavigationBar.js',
			'src/ui/UIDialog.js',
			'src/ui/UIMenuDialog.js',
			'src/ui/UIView.js',
			'src/ui/UIErrorView.js',
			'src/ui/UITableView.js',
			'src/ui/UIGridView.js',
			'src/ui/UICell.js',
			'src/ui/UIButton.js',
			'src/ui/UIBackButton.js',
			callback
		);
		require.ROOT = old_root;
	},
};