'use strict';

var ArtifactsDepsResolver = require('../lib/cubx-dependency-resolver.js');
var commandLineArgs = require('command-line-args');

var args = [
  { name: 'baseUrl', type: String, alias: 'u' },
  { name: 'rootDependencies', type: String, alias: 'd' }
];

var options = commandLineArgs(args);

if (!options.baseUrl) {
  console.error('Missed necessary parameter "webpackagePath". Usage: cubx-webpackage-rte-update -p <webpackagPath>');
  process.exit(0);
}

if (!options.rootDependencies) {
  console.error('Missed necessary parameter "newRteVersion". Usage: cubx-webpackage-rte-update -v <newRteVersion>');
  process.exit(0);
} else {
  try {
    options.rootDependencies = JSON.parse(options.rootDependencies);
  } catch (e) {
    console.error('\'rootDependencies\' property should be a valid JSON array.', e);
  }
}

var artifactsDepsResolver = new ArtifactsDepsResolver();
artifactsDepsResolver.buildRawDependencyTree(options.rootDependencies, options.baseUrl);
