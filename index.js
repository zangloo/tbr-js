#!/bin/env node
/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午6:18
 */

const {program} = require('commander');
let filename = '';
program.version('0.1.0')
	.option('-d, --debug', 'output extra debugging', false)
	.argument('filename', "book file name")
	.action(f => {
		filename = f;
	})
	.parse();
const options = program.opts();

const requireDir = require('require-dir');
const loaders = requireDir('./loaders');
const renders = requireDir('./renders');
const common = require('./common');
const Controller = require('./controller');

/**
 * @param book object
 * {
 *         toc: toc string array
 *         [imageLoader]: image loader function(<toc index>, <line index of pic>)
 *         getChapter: chapter loader function(<toc index>): line array
 *                 line: {
 *                         type: text | pic
 *                         content: text | picture text
 *                 }
 *         }
 * }
 */
function bookLoaded(book) {
	if (options.debug)
		console.debug('Book opened: ' + filename);
	context.reading.book = book;
	Controller.start(context);
}

const context = {
	debug: options.debug,
	render: renders.han,
	reading: {
		filename: filename,
		content: null,
		chapter: 3,
		line: 14,
		position: 148,
	},
};

if (!common.some(loaders, (name, loader) => {
	if (loader.support(filename)) {
		loader.load(filename, bookLoaded);
		return true;
	} else
		return false;
})) {
	console.error('Unknown filename type: ' + filename)
	process.exit(1);
}
