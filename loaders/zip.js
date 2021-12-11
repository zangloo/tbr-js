/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/12/11
 * Time: 上午8:40
 */

const AdmZip = require("adm-zip");
const iconv = require('iconv-lite');
const {detectEncoding, pushAndSort} = require('../common');
const html = require('./html');
const txt = require('./txt');

function load(reading, callback) {
	const zip = new AdmZip(reading.filename);
	const zipEntries = zip.getEntries();
	const toc = [];
	zipEntries.forEach(function (zipEntry) {
		if (zipEntry.isDirectory) return;
		let filename;
		if (reading.cache && reading.cache.filenameEncoding)
			filename = iconv.decode(zipEntry.rawEntryName, reading.cache.filenameEncoding)
		else {
			const data = zipEntry.getData();
			const encoding = detectEncoding(data);
			filename = iconv.decode(zipEntry.rawEntryName, encoding)
			if (!reading.cache)
				reading.cache = {fileEncoding: []};
			reading.cache.filenameEncoding = encoding;
			reading.cache.fileEncoding.push({filename: filename, encoding: encoding});
		}
		const single = {title: filename, _entry: zipEntry};
		if (txt.support(filename.toLowerCase()))
			single.txt = true;
		else if (html.support(filename.toLowerCase()))
			single.html = true;
		pushAndSort(single, toc, (a, b) => {
			return a.title.localeCompare(b.title, undefined, {numeric: true});
		});
	});
	if (toc.length === 0) {
		callback('No supported file found in zip file: ' + reading.filename);
		return;
	}

	callback(null, {
		_zip: zip,
		toc,
		getChapter(index, callback) {
			const single = toc[index];
			const buffer = single._entry.getData();
			let encoding;
			if (reading.cache && reading.cache.fileEncoding)
				for (let fe of reading.cache.fileEncoding)
					if (fe.filename === single.title)
						encoding = fe.encoding;
			if (!encoding) {
				encoding = detectEncoding(buffer);
				if (!reading.cache)
					reading.cache = {fileEncoding: []};
				else if (!reading.cache.fileEncoding)
					reading.cache.fileEncoding = [];
				reading.cache.fileEncoding.push({filename: single.title, encoding: encoding});
			}
			const text = iconv.decode(buffer, encoding);

			let lines = [];
			if (single.txt) {
				lines = txt.loadFromString(text)
				callback(lines);
			} else if (single.html)
				lines = html.loadFromString(text, callback);
		},
	})
}

function support(filename) {
	return filename.endsWith('.zip');
}

module.exports = {support, load};
