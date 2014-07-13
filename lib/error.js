var errorCount = 0;

module.exports = {
	increase: function() {
		errorCount++;
	},
	count: function() {
		return errorCount;
	}
};