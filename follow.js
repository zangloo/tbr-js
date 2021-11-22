/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/22
 * Time: 上午10:32
 */
'use strict'
const fs = require('fs');
const Tail = require('tail').Tail;
const {controls} = require('termdraw')
const txt = require('./loaders/txt')

let draw;
let logRegion;
let closeCallback;

let tail;
let watching = false;

function keypress(key) {
	switch (key) {
		case 'p':
			stopWatch();
			break;
		case 'r':
			startWatch();
			break;
		case 'q':
		case '^[':
		case '^C':
			stopWatch();
			closeCallback();
			break;
	}
}

function startWatch() {
	if (watching) return;
	watching = true;
	tail.watch();
}

function stopWatch() {
	if (!watching) return;
	watching = false;
	tail.unwatch()
}

function resize() {
	logRegion.resize(draw.width(), draw.height());
	draw.redraw(logRegion, true);
}

function start(reading, theDraw, callback) {
	function append(msg) {
		logRegion.add(msg);
		draw.redraw(logRegion, true);
	}

	const filename = reading.filename;
	const encoding = reading.book.encoding;
	draw = theDraw;
	closeCallback = callback;
	logRegion = new controls.LogBox({width: draw.width(), height: draw.height()});
	watching = true;
	tail = new Tail(filename, {encoding: encoding, follow: true, nLines: 20});
	tail.on("line", append);
	tail.on("error", append);
}

module.exports = {start, keypress, resize};
