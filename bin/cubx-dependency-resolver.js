#! /usr/bin/env node
var ArtifactsDepsResolver = require('../lib/cubx-dependency-resolver.js');
var commandLineArgs = require('command-line-args');
var fs = require('fs-extra');

var args = [
  {name: 'baseUrl', type: String, alias: 'u'},
  {name: 'rootDependencies', type: String, alias: 'd'},
  {name: 'type', type: String, alias: 't'},
  {name: 'mode', type: String, alias: 'm'}
];

function parseRootDependencies (rootDeps) {
  try {
    rootDeps = JSON.parse(rootDeps);
    if (!Array.isArray(rootDeps)) {
      throw new TypeError('\'rootDependencies\' is not a valid JSON list');
    }
    return rootDeps;
  } catch (e) {
    console.error('\'rootDependencies\' property should be a valid JSON array or a path to a file containing a valid JSON array.', e);
    process.exit(0);
  }
}

function isValidType (type) {
  return type === 'raw' || type === 'resolved' || type === 'list' || type === 'wplist' || type === 'mlist';
}

var options = commandLineArgs(args);

if (!options.baseUrl) {
  console.error('Missed necessary parameter "baseUrl". Usage: cubx-dependency-resolver -u <baseUrl>');
  process.exit(0);
}

if (!options.rootDependencies) {
  console.error('Missed necessary parameter "rootDependencies". Usage: cubx-dependency-resolver -d <rootDependencies>');
  process.exit(0);
} else {
  try {
    if (fs.pathExists(options.rootDependencies)) {
      options.rootDependencies = fs.readFileSync(options.rootDependencies, 'utf8');
      options.rootDependencies = parseRootDependencies(options.rootDependencies);
    }
  } catch (e) {
    options.rootDependencies = parseRootDependencies(options.rootDependencies);
  }
}

if (!options.type) {
  options.type = 'list';
  console.warn('Using default value for \'type\': \'list\'.');
} else if (!isValidType(options.type)) {
  console.warn('Invalid "type", it can be \'list\', \'resolved\', \'raw\', \'wplist\' or \'mlist\'. Using default value: \'list\'. ' +
    'Given: ', '\'' + options.type + '\'. Using default value: \'list\'.');
  options.type = 'list';
}

var artifactsDepsResolver = new ArtifactsDepsResolver();
switch (options.type) {
  case 'raw':
    artifactsDepsResolver.buildRawDependencyTree(options.rootDependencies, options.baseUrl).then(function (rawDepTree) {
      console.log(JSON.stringify(rawDepTree.toJSON(true), null, '   '));
    });
    break;
  case 'list':
    artifactsDepsResolver.resolveResourcesList(options.rootDependencies, options.baseUrl, options.mode).then(function (resourceList) {
      console.log(JSON.stringify(resourceList, null, '   '));
    });
    break;
  case 'wplist':
    artifactsDepsResolver.resolveWpList(options.rootDependencies, options.baseUrl).then(function (wpList) {
      console.log(JSON.stringify(wpList, null, '   '));
    });
    break;
  case 'mlist':
    artifactsDepsResolver.resolveManifestsList(options.rootDependencies, options.baseUrl).then(function (mList) {
      console.log(JSON.stringify(mList, null, '   '));
    });
    break;
  case 'resolved':
    artifactsDepsResolver.resolveDependencies(options.rootDependencies, options.baseUrl).then(function (resolvedDepTree) {
      console.log(JSON.stringify(resolvedDepTree, null, '   '));
    });
    break;
}
