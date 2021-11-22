/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/20
 * Time: 下午7:34
 */
'use strict';

const {controls} = require('termdraw')
const {wcswidth} = require('ansiterm')
const {pushAndSort} = require('./common')

let context;
let historyBox;
let historyEntries;
let closeCallback;
let currentSelection;
let topIndex;

/**
 *
 * @param c context
 * @param callback if selected, called with a argument: <reading info from history list>
 */
function start(c, callback) {
	context = c;
	closeCallback = callback;
	historyEntries = [];
	const lastReading = c.lastReading;
	context.history.forEach(entry => {
		if (entry.filename === lastReading) return;
		pushAndSort(entry, historyEntries, (a, b) => {
			const ts1 = a.ts ? a.ts : 0;
			const ts2 = b.ts ? b.ts : 0;
			return ts2 - ts1;
		});
	});
	const draw = context.draw;
	const width = draw.width();
	const height = draw.height();
	historyBox = new controls.Box({
		width: width,
		height: height,
		title: makeTitle(),
	});
	currentSelection = 0;
	topIndex = 0;
	refresh(draw);
}

function makeTitle() {
	return `Select file from history: (${currentSelection + 1}:${historyEntries.length})`;
}

function keypress(key) {
	const draw = context.draw;
	const maxLines = draw.height() - 2;
	switch (key) {
		case 'down':
			if (currentSelection === historyEntries.length - 1)
				break;
			currentSelection++;
			refresh(draw, maxLines)
			break;
		case 'up':
			if (currentSelection === 0)
				break;
			currentSelection--;
			refresh(draw, maxLines)
			break;
		case 'next':
			if (currentSelection === historyEntries.length - 1)
				break;
			currentSelection += maxLines;
			if (currentSelection >= historyEntries.length)
				currentSelection = historyEntries.length - 1;
			refresh(draw, maxLines)
			break;
		case 'prior':
			if (currentSelection === 0)
				break;
			currentSelection -= maxLines;
			if (currentSelection < 0)
				currentSelection = 0;
			refresh(draw, maxLines)
			break;
		case 'end':
			currentSelection = historyEntries.length - 1;
			refresh(draw, maxLines)
			break;
		case 'home':
			currentSelection = topIndex = 0;
			refresh(draw, maxLines)
			break;
		case '^M':
			// return key
			closeCallback(historyEntries[currentSelection]);
			closeCallback = null;
			break;
		case 'q':
		case '^[':
		case '^C':
			closeCallback(null);
			closeCallback = null;
			break;
	}
}

function resize() {
	const draw = context.draw;
	const height = draw.height();
	historyBox.resize(draw.width(), height);
	refresh(draw, height - 2);
}

function refresh(draw, resetTopLines) {
	if (resetTopLines && (currentSelection < topIndex || currentSelection >= topIndex + resetTopLines)) {
		topIndex = 0;
		while (topIndex + resetTopLines <= currentSelection)
			topIndex += resetTopLines;
	}
	// set title will call _redo that clear the box and draw the border
	historyBox.set_title(makeTitle());
	const width = draw.width() - 2;
	let lines = Math.min(historyEntries.length - topIndex, historyBox.height() - 2);
	for (let i = 0; i < lines; i++) {
		const entryIndex = i + topIndex;
		const entry = historyEntries[entryIndex];
		const y = i + 1;
		let text = entry.filename
		while (wcswidth(text) > width)
			text = text.substr(1);
		historyBox.str(1, y, text, entryIndex === currentSelection ? {reverse: true} : null);
	}
	draw.redraw(historyBox, true);
}

module.exports = {start, keypress, resize};
