/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午8:03
 */
const leadingSpace = 2;

function withLeading(text) {
	if (text.length === 0)
		return false;
	const leader = text[0];
	return leader !== ' ' && leader !== '\t' && leader !== '　';
}

function lengthWithLeading(text) {
	const length = text.length;
	if (withLeading(text))
		return length + leadingSpace;
	else
		return length;
}

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
exports.withLeading = withLeading;
exports.lengthWithLeading = lengthWithLeading;
exports.leadingSpace = leadingSpace;
