#!/bin/env node
/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午6:18
 */

const {program} = require('commander');
let filename = null;
program.version('0.1.0')
	.option('-d, --debug', 'output extra debugging', false)
	.argument('[filename]', "book file name")
	.action(f => {
		filename = f;
	})
	.parse();
const options = program.opts();

const requireDir = require('require-dir');
const path = require("path");
const {mkdirSync, existsSync, writeFileSync} = require('fs');
const yaml = require('js-yaml');
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
	Controller.start(context, exitAndSave);
}

function errorExit(msg) {
	console.error(msg);
	process.exit(1);
}

function copyReading(src, dest) {
	if (!dest)
		dest = {};
	dest.filename = src.filename;
	dest.chapter = src.chapter;
	dest.line = src.line;
	dest.position = src.position;
	return dest;
}

const configFolder = process.env.HOME + '/.config/tbr';
const configFile = configFolder + '/tbr.yaml';

function exitAndSave() {
	const history = context.history;
	const configuration = {
		debug: context.debug,
		renderName: context.renderName,
		lastReading: context.lastReading,
		searchPattern: context.searchPattern,
		history: history,
	}
	const reading = context.reading;
	if (!history.some(entry => {
		if (entry.filename === context.lastReading) {
			copyReading(reading, entry);
			return true;
		}
	}))
		history.push(copyReading(context.reading));
	const text = yaml.dump(configuration);
	writeFileSync(configFile, text);
	process.exit(0);
}

function loadConfig() {
	const convict = require('convict');
	convict.addFormat({
		name: 'historyArray',
		validate: function (entries, historyEntrySchema) {
			if (!Array.isArray(entries)) {
				throw new Error('must be of type Array');
			}
			entries.forEach(entry => {
				convict(historyEntrySchema.children).load(entry).validate();
			});
		}
	});
	convict.addParser({extension: ['yml', 'yaml'], parse: yaml.load});
	const config = convict({
		debug: {
			doc: 'enable debug',
			format: 'Boolean',
			default: false,
		},
		renderName: {
			doc: 'render name',
			format: 'String',
			default: 'han',
			nullable: false
		},
		lastReading: {
			doc: 'last reading file name',
			format: 'String',
			default: null,
			nullable: false,
		},
		searchPattern: {
			doc: 'the last search pattern',
			format: 'String',
			default: null,
			nullable: true,
		},
		history: {
			doc: 'reading history',
			format: 'historyArray',
			default: [],
			children: {
				filename: {
					doc: 'reading file full path',
					format: 'String',
					nullable: false,
					default: null,
				},
				chapter: {
					doc: 'reading chapter index, 0 based',
					format: 'nat',
					default: 0
				},
				line: {
					doc: 'reading line index in chapter, 0 based',
					format: 'nat',
					default: 0
				},
				position: {
					doc: 'reading char index in line, 0 based',
					format: 'nat',
					default: 0
				},
			}
		}

	});
	mkdirSync(configFolder, {recursive: true});
	let configuration;
	if (existsSync(configFile)) {
		config.loadFile(configFile);
		config.validate({allowed: 'strict'});
		configuration = {}
		if (options.debug)
			configuration.debug = true;
		else
			configuration.debug = config.get('debug');
		let renderName = config.get('renderName');
		const render = renders[renderName];
		if (!render)
			errorExit('No render named: ' + renderName);
		configuration.renderName = renderName;
		configuration.render = render;
		configuration.searchPattern = config.get('searchPattern');
		if (!filename)
			filename = path.resolve(config.get('lastReading'));
		filename = path.resolve(filename);
		configuration.lastReading = filename;
		configuration.history = config.get('history');
		if (!configuration.history.some(entry => {
			if (entry.filename === configuration.lastReading) {
				configuration.reading = copyReading(entry);
				return true;
			}
		})) configuration.reading = {
			filename: configuration.lastReading,
			chapter: 0,
			line: 0,
			position: 0,
		}
	} else {
		if (!filename)
			errorExit('No file to open.');
		const absolutePath = path.resolve(filename);
		configuration = {
			debug: options.debug,
			renderName: 'han',
			lastReading: absolutePath,
			history: [{
				filename: absolutePath,
				chapter: 0,
				line: 0,
				position: 0,
			}]
		}
		const text = yaml.dump(configuration);
		writeFileSync(configFile, text);
	}
	return configuration;
}

const context = loadConfig();

if (!common.some(loaders, (name, loader) => {
	if (loader.support(context.lastReading)) {
		loader.load(context.lastReading, bookLoaded);
		return true;
	} else
		return false;
}))
	errorExit('Unknown filename type: ' + filename);
