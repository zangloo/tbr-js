/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/18
 * Time: 上午7:24
 */

const {convert} = require('html-to-text');

function load(filename, callback) {
}

function loadFromString(string, callback) {
	const text = convert(string, {
		trimEmptyLines: true,
		formatters: {
			image: function (elem, walk, builder, formatOptions) {
				builder.openBlock({leadingLineBreaks: formatOptions.leadingLineBreaks || 1});
				builder.addInline('[image:');
				builder.addInline(elem.attribs.src);
				builder.addInline(']');
				builder.closeBlock({trailingLineBreaks: formatOptions.trailingLineBreaks || 1});
			}
		},
		selectors: [
			{selector: 'a', options: {ignoreHref: true}},
			{selector: 'img', format: 'image'},
		],
	});
	const lines = text.split('\n');
	callback(lines);
}

function support(filename) {
	return filename.indexOf('.html') > 0 || filename.indexOf('.hml') > 0;
}

exports.load = load;
exports.support = support;
exports.loadFromString = loadFromString;
