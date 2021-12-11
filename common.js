/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午8:03
 */
const detect = require("charset-detector");
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

function errorExit(msg) {
	console.error(msg);
	process.exit(1);
}

function pushAndSort(element, array, compare) {
	const length = array.length;
	if (length === 0)
		array.push(element);
	else
		array.splice(locationOf(element, array, compare) + 1, 0, element);
	return array;
}

function locationOf(element, array, compare, start, end) {
	compare = compare || function (a, b) {
		return b - a;
	};
	start = start || 0;
	end = end || array.length;
	const distance = end - start;
	if (distance === 0) return start - 1;
	const pivot = parseInt(start + distance / 2, 10);
	const pivotValue = array[pivot];
	const compareResult = compare(pivotValue, element);
	if (compareResult === 0) return pivot;
	if (distance <= 1)
		return compareResult > 0 ? pivot - 1 : pivot;
	if (compareResult < 0)
		return locationOf(element, array, compare, pivot, end);
	else
		return locationOf(element, array, compare, start, pivot);
}

function detectEncoding(buffer) {
	const charsets = detect(buffer);
	return charsets[0].charsetName;
}

module.exports = {
	each,
	some,
	withLeading,
	lengthWithLeading,
	leadingSpace,
	errorExit,
	pushAndSort,
	detectEncoding,
};
