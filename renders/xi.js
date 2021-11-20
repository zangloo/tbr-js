/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/19
 * Time: 下午10:19
 */
'use strict';

const {leadingSpace, withLeading} = require('../common');
const {wcswidth} = require('ansiterm');

function draw(context) {
	const region = context.region;
	const height = context.region.height();
	const width = context.region.width();

	const reading = context.reading;
	const lines = reading.content;
	let position = reading.position;
	let line = reading.line;
	for (let y = 0; y < height; y++) {
		const text = lines[line];
		const lineLength = text.length;
		let x = (position === 0 && withLeading(text)) ? leadingSpace : 0;
		while (position < lineLength) {
			const char = text[position];
			const cw = wcswidth(char);
			if (x + cw >= width)
				break;
			const reverse = context.reverse;
			let format = null;
			if (reverse && reverse.line === line && reverse.start <= position && reverse.end > position)
				format = {reverse: true};
			region.chr(x, y, char, format);
			x += cw;
			position++;
		}
		if (position === lineLength) {
			line++;
			if (line === lines.length) {
				context.next = null;
				return;
			} else
				position = 0;
		}
	}
	context.next = {
		line: line,
		position: position
	}
}

function prev(context) {
	const region = context.region;
	const height = region.height();
	const width = region.width();

	const reading = context.reading;
	const lines = reading.content;
	let line = reading.line;
	let text;
	let position = reading.position
	if (position === 0) {
		line--;
		text = lines[line];
	} else
		text = lines[line].substr(0, position);
	let rows = 0;
	let linePositions;
	do {
		linePositions = [0]
		const lineLength = text.length;
		let w = withLeading(text) ? leadingSpace : 0;
		for (let cp = 0; cp < lineLength; cp++) {
			const char = text[cp];
			const cw = wcswidth(char);
			w += cw;
			if (w > width) {
				linePositions.push(cp);
				w = cw;
			}
		}
		rows += linePositions.length;
		if (rows >= height)
			break;
		if (line === 0)
			break;
		line--;
		text = lines[line];
	} while (true)

	if (rows >= height)
		position = linePositions[rows - height];
	else
		position = 0;

	reading.line = line;
	reading.position = position;
}

function setupReverse(context) {
	let reverse = context.reverse;
	if (reverse === null) return;
	const reversLine = reverse.line;
	const reading = context.reading;
	const next = context.next;
	const reversStart = reverse.start;
	const readingLine = reading.line;
	const readingPosition = reading.position;
	if (((reversLine === readingLine && reversStart >= readingPosition) || (reversLine > readingLine))
		&& (!next || (reversLine === next.line && reversStart < next.position) || (reversLine < next.line)))
		return;

	const region = context.region;
	const width = region.width();
	const text = reading.content[reversLine]
	let w = withLeading(text) ? leadingSpace : 0;
	let position = 0;
	let cp = 0;
	do {
		const char = text[cp];
		const cw = wcswidth(char);
		w += cw;
		if (w > width) {
			w = cw;
			position = cp;
		}
		cp++;
	} while (cp <= reversStart);
	reading.line = reversLine;
	reading.position = position;
}

function nextLine(context) {
	if (!context.next) return false;
	const reading = context.reading;
	let line = reading.line;
	const width = context.region.width();
	const text = reading.content[line];
	const textLength = text.length;
	let position = reading.position;
	let w = withLeading(text) ? leadingSpace : 0;
	for (; position < textLength; position++) {
		const char = text[position];
		const cw = wcswidth(char);
		w += cw;
		if (w > width) break;
	}
	if (position === textLength)
		reading.line++;
	else
		reading.position = position;
	return true;
}

function prevLine(context) {
	const reading = context.reading;
	const width = context.region.width();
	let line = reading.line;
	let position = reading.position;
	let text;
	if (position === 0) {
		if (line === 0)
			return false;
		line--;
		text = reading.content[line];
		position = text.length;
	} else
		text = reading.content[line];

	let lastBreak = 0;
	let w = withLeading(text) ? leadingSpace : 0;
	for (let cp = 0; cp < position; cp++) {
		const char = text[cp];
		const cw = wcswidth(char);
		w += cw;
		if (w > width) {
			lastBreak = cp;
			w = cw;
		}
	}
	reading.line = line;
	reading.position = lastBreak;
	return true;
}

module.exports = {
	draw,
	prev,
	setupReverse,
	nextLine,
	prevLine,
};
