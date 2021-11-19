/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午8:03
 */

function each(obj, callback) {
	Object.keys(obj).forEach(function (key) {
		callback(key, obj[key])
	});
}

function some(obj, callback) {
	return Object.keys(obj).some(function (key) {
		return callback(key, obj[key])
	});
}

exports.each = each;
exports.some = some;
