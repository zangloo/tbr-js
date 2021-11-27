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

const colors = [
	'blue',
	'brightBlue',
	'cyan',
	'brightCyan',
	'green',
	'brightGreen',
	'black',
	'brightBlack',
	'magenta',
	'brightMagenta',
	'red',
	'brightRed',
	'white',
	'brightWhite',
	'yellow',
	'brightYellow',
];
const defaultThemes = [{
	name: 'default',
	color: null,
	background: null,
}, {
	name: 'white on black',
	color: 'brightWhite',
	background: 'black',
}, {
	name: 'green on black',
	color: 'green',
	background: 'black',
}];
const defaultSearchHistorySize = 100;

function copyReading(src, dest) {
	if (!dest)
		dest = {};
	dest.filename = src.filename;
	dest.chapter = src.chapter;
	dest.line = src.line;
	dest.position = src.position;
	if (src.cache)
		dest.cache = src.cache;
	dest.ts = src.ts;
	return dest;
}

const configFolder = process.env.HOME + '/.config/tbr';
const configFile = configFolder + '/tbr.yaml';
const themeConfigFile = configFolder + '/themes.yaml';

function saveAndExit(exit) {
	const history = context.history;
	const configuration = {
		renderName: context.renderName,
		lastReading: context.lastReading,
		searchPattern: context.searchPattern,
		history: history,
		themeName: context.themeName,
		searchHistorySize: context.searchHistorySize,
		searchHistory: context.searchHistory,
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
	mkdirSync(configFolder, {recursive: true});
	let configuration;
	if (existsSync(configFile)) {
		const convict = require('convict');
		convict.addFormat({
			name: 'array',
			validate: function (entries, entrySchema) {
				if (!Array.isArray(entries))
					throw new Error(`must be of ${entrySchema.children.doc} Array`);
				entries.forEach(entry => {
					convict(entrySchema.children).load(entry).validate();
				});
			}
		});
		convict.addFormat({
			name: 'fontColor',
			validate: function (name) {
				if (colors.indexOf(name) < 0)
					throw new Error(`must be one of ${colors}`);
			}
		});
		convict.addParser({extension: ['yml', 'yaml'], parse: yaml.load});
		const config = convict({
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
			themeName: {
				doc: 'theme name using',
				format: 'String',
				default: null,
				nullable: true,
			},
			history: {
				doc: 'reading history',
				format: 'array',
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
					},
					cache: {
						doc: 'cache for book'
					}
				}
			},
			searchHistorySize: {
				doc: 'Search history size',
				format: 'nat',
				default: defaultSearchHistorySize,
			},
			searchHistory: {
				doc: 'Search history lines',
				format: 'Array',
				default: [],
			}

		});
		config.loadFile(configFile);
		config.validate({allowed: 'strict'});
		configuration = {debug: options.debug};
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
		configuration.searchHistorySize = config.get('searchHistorySize');
		configuration.searchHistory = config.get('searchHistory');
		if (existsSync(themeConfigFile)) {
			const themes = convict({
				themes: {
					doc: 'themes',
					format: 'array',
					default: defaultThemes,
					children: {
						name: {
							doc: 'theme name',
							format: 'String',
							nullable: false,
							default: null,
						},
						color: {
							doc: 'text color',
							format: 'fontColor',
							nullable: true,
							default: null,
						},
						background: {
							doc: 'text background color',
							format: 'fontColor',
							nullable: true,
							default: null,
						}
					}
				},
			});
			themes.loadFile(themeConfigFile);
			themes.validate({allowed: 'strict'});
			configuration.themes = themes.get('themes');
			configuration.themeName = config.get('themeName');
		}
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
			}],
			searchHistorySize: defaultSearchHistorySize,
			searchHistory: [defaultSearchHistorySize],
		}
		const text = yaml.dump(configuration);
		writeFileSync(configFile, text);
	}
	if (!configuration.themes) {
		configuration.themes = defaultThemes;
		if (configuration.themeName === null)
			configuration.themeName = configuration.themes[0].name;
		const text = yaml.dump({themes: configuration.themes});
		writeFileSync(themeConfigFile, text);
	}
	const render = renders[configuration.renderName];
	if (!render)
		errorExit('No render named: ' + configuration.renderName);
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
