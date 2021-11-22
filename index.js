#!/bin/env node
/**
 * Created with IntelliJ IDEA.
 * User: zang.loo
 * Date: 2021/11/17
 * Time: 下午6:18
 */
'use strict';

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
const renders = requireDir('./renders');
const {errorExit} = require('./common');
const Controller = require('./controller');

function copyReading(src, dest) {
	if (!dest)
		dest = {};
	dest.filename = src.filename;
	dest.chapter = src.chapter;
	dest.line = src.line;
	dest.position = src.position;
	dest.ts = src.ts;
	return dest;
}

const configFolder = process.env.HOME + '/.config/tbr';
const configFile = configFolder + '/tbr.yaml';

function saveAndExit(exit) {
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
			delete reading.book;
			delete reading.content
			entry.ts = new Date().getTime();
			return true;
		}
	})) {
		const copy = copyReading(context.reading);
		copy.ts = new Date().getTime();
		history.push(copy);
	}
	const text = yaml.dump(configuration);
	writeFileSync(configFile, text);
	if (exit)
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
			default: 'xi',
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
				ts: {
					doc: 'last opened time stamp, in long',
					format: 'nat',
					default: 0
				}
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
		configuration.renderName = config.get('renderName');
		configuration.searchPattern = config.get('searchPattern');
		if (!filename)
			filename = path.resolve(config.get('lastReading'));
		filename = path.resolve(filename);
		configuration.lastReading = filename;
		configuration.history = config.get('history');
		configuration.history.some(entry => {
			if (entry.filename === configuration.lastReading) {
				configuration.reading = copyReading(entry);
				return true;
			}
		});
	} else {
		if (!filename)
			errorExit('No file to open.');
		const absolutePath = path.resolve(filename);
		configuration = {
			debug: options.debug,
			renderName: 'xi',
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
	const render = renders[configuration.renderName];
	if (!render)
		errorExit('No render named: ' + renderName);
	configuration.render = render;
	if (!configuration.reading)
		configuration.reading = {
			filename: configuration.lastReading,
			chapter: 0,
			line: 0,
			position: 0,
		}
	configuration.switchRender = function () {
		if (this.renderName === 'xi')
			this.renderName = 'han';
		else
			this.renderName = 'xi';
		this.render = renders[this.renderName];
	}
	return configuration;
}

const context = loadConfig();
Controller.start(context, saveAndExit);
