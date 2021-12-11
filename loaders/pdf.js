/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/12/11
 * Time: 下午5:56
 */
'use strict';
const PDFParser = require("pdf2json");
const fs = require("fs");
const {cacheContent} = require("../common");
const txt = require("./txt");

function loadTextFromPDF(reading, callback) {
	const pdfParser = new PDFParser();

	pdfParser.on("pdfParser_dataError", errData => callback(errData.parserError));
	pdfParser.on("pdfParser_dataReady", pdfData => {
		const lines = [];
		for (let page of pdfData.Pages) {
			let prevY = -1;
			let prevText = null;
			for (let item of page.Texts) {
				const text = decodeURIComponent(item.R[0].T);
				if (prevText)
					if (Math.abs(item.y - prevY) <= 0.5)
						prevText += text;
					else {
						lines.push(prevText);
						prevText = text;
						prevY = item.y;
					}
				else {
					prevText = text;
					prevY = item.y;
				}
			}
			if (prevText)
				lines.push(prevText);
		}
		// save to cache
		const cacheText = lines.join("\n");
		cacheContent('pdf', '.txt', cacheText, (err, path) => {
			if (err)
				callback(err);
			else {
				if (!reading.cache)
					reading.cache = {};
				reading.cache.content = path;
				callback(null, makeBook(reading.filename, lines));
			}
		});
	});
	pdfParser.loadPDF(reading.filename);
}

function makeBook(filename, lines) {
	return {
		toc: [{title: filename}],
		getChapter(index, callback) {
			callback(lines);
		},
	};
}

function load(reading, callback) {
	if (reading.cache && reading.cache.content)
		fs.readFile(reading.cache.content, (error, buffer) => {
			if (error)
				loadTextFromPDF(reading, callback);
			else {
				const text = buffer.toString();
				const lines = txt.loadFromString(text);
				callback(null, makeBook(reading.filename, lines));
			}
		});
	else
		loadTextFromPDF(reading, callback);
}

function support(filename) {
	return filename.endsWith('.pdf');
}

module.exports = {support, load};
