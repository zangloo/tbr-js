/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/12/11
 * Time: 下午5:56
 */
'use strict';
const PDFParser = require("pdf2json");
const txt = require("./txt");

function load(reading, callback) {
	const pdfParser = new PDFParser();

	pdfParser.on("pdfParser_dataError", errData => callback(errData.parserError));
	pdfParser.on("pdfParser_dataReady", pdfData => {
		const lines = [];
		for (let page of pdfData.Pages) {
			let prevY;
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
		callback(null, {
			toc: [{title: reading.filename}],
			getChapter(index, callback) {
				callback(lines);
			},
			get leadingSpace() {
				return true;
			}
		});
	});
	pdfParser.loadPDF(reading.filename);
}

function support(filename) {
	return filename.endsWith('.pdf');
}

module.exports = {support, load};
