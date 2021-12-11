/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/12/11
 * Time: 上午8:40
 */

const AdmZip = require("adm-zip");
const iconv = require('iconv-lite');
const {detectEncoding} = require('../common');
const html = require('./html');
const txt = require('./txt');

function load(reading, callback) {
	const zip = new AdmZip(reading.filename);
	const zipEntries = zip.getEntries();
	const toc = [];
	let detectedContent;
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
			detectedContent = iconv.decode(data, encoding);
		}
		if (txt.support(filename))
			toc.push({title: filename, _entry: zipEntry, txt: true});
		else if (html.support(filename))
			toc.push({title: filename, _entry: zipEntry, html: true});
	});
	if (toc.length === 0) {
		callback('No supported file found in zip file: ' + reading.filename);
		return;
	}

	callback(null, {
		_zip: zip,
		toc,
		getChapter(index, callback) {
			if (index === 0 && detectedContent) {
				callback(detectedContent);
				detectedContent = null;
			}

			const single = toc[index];
			let lines = [];
			const buffer = single._entry.getData();
			if (single.txt) {
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
				lines = txt.loadFromString(text)
			} else if (single.html)
				lines = html.loadFromString(single._entry.toString());
			callback(lines);
		},
	})
}

function support(filename) {
	return filename.endsWith('.zip');
}

module.exports = {support, load};
