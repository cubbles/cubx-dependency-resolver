/* globals __dirname */
(function () {
  'use strict';

  var path = require('path');
  var axios = require('axios');
  var DependencyTree = require(path.resolve(__dirname, 'DependencyTree.js'));
  var ResponseCache = require(path.resolve(__dirname, 'ResponseCache.js'));
  var DepReference = require(path.resolve(__dirname, 'DepReference.js'));

  var ArtifactsDepsResolver = function () {
    this._axios = axios.create({ responseType: 'json' });
    this._responseCache = new ResponseCache();
  };

  ArtifactsDepsResolver.prototype._fetchManifest = function (url) {
    return this._axios.request({ url: url });
  };

  ArtifactsDepsResolver.prototype._buildRawDependencyTree = function (rootDependencies, baseUrl) {
    rootDependencies = this._createDepReferenceListFromArtifactDependencies(rootDependencies);
    if (!Array.isArray(rootDependencies)) {
      throw new TypeError('Parameter \'rootDependencies\' needs to be an array');
    }

    return new Promise(function (resolve, reject) {
      var depTree = new DependencyTree();
      var rootNodes = [];

      // first create rootNodes in dependency tree based on rootDependencies
      rootDependencies.forEach(function (rootDependency) {
        var node = new DependencyTree.Node();
        node.data = rootDependency;
        depTree.insertNode(node);
        rootNodes.push(node);
      });

      // define recursively called function for resolving dependencyTree level by level
      // parentNodes is an array of same length as dependencies. parentNodes[i] is a parentNode reference for
      // dependencies[i]
      (function resolveDependencies (dependencies, parentNodes) {
        var resolutionsQueue = [];
        var nodes = [];

        dependencies.forEach(function (dep) {
          try {
            resolutionsQueue.push(this._resolveDepReferenceDependencies(dep, baseUrl));
          } catch (error) {
            console.error('Could not resolve Dependency ', dep.getId());
            reject(error);
          }
        }.bind(this));

        Promise.all(resolutionsQueue).then(function (results) {
          var unresolvedDependencies = [];
          // empty resolutionsQueue
          resolutionsQueue = [];
          // create and insert node in DependencyTree for each resolved dependency
          results.forEach(function (result, index) {
            var parentNode = parentNodes[index];
            parentNode.data.resources = result.resources;
            result.dependencies.forEach(function (depRefItem) {
              var node = new DependencyTree.Node();
              node.data = depRefItem;
              depTree.insertNode(node, parentNode);
              unresolvedDependencies.push(depRefItem);
              nodes.push(node);
            });
          });

          if (unresolvedDependencies.length > 0) {
            resolveDependencies.bind(this, unresolvedDependencies, nodes)();
          } else {
            resolve(depTree);
          }
        }.bind(this), function (error) {
          console.error('Could not resolve Dependency: ', error);
          reject(error);
        });
      }.bind(this))(rootDependencies, rootNodes);
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype._resolveDepReferenceDependencies = function (depReference, baseUrl) {
    // check depReference
    if (!(depReference instanceof DepReference)) {
      throw new TypeError('parameter \'depReference\' need to be an instance of DepReference');
    }
    // check baseUrl
    if (typeof baseUrl !== 'string') {
      throw new TypeError('parameter \'baseUrl\' needs to be of type string');
    }

    return new Promise(function (resolve, reject) {
      var dependencies = [];
      var processManifest = function (manifest, cache) {
        if (cache) {
          this._responseCache.addItem(depReference.webpackageId, manifest);
        }
        var artifact = this._extractArtifact(depReference, manifest);
        try {
          if (artifact.hasOwnProperty('dependencies') && artifact.dependencies.length > 0) {
            dependencies = this._createDepReferenceListFromArtifactDependencies(artifact.dependencies, depReference);
          }
          this._storeManifestFiles(manifest, artifact.artifactId);
          resolve({
            resources: artifact.resources || [],
            dependencies: dependencies
          });
        } catch (e) {
          console.error('The artifact \'' + depReference.artifactId + '\' is not defined in manifest:',
            '\n\tDependency reference: ', depReference, '\n\tManifest: ', manifest);
          reject(new Error('Artifact not defined.'));
        }
      }.bind(this);

      // append '/' to baseUrl if not present
      baseUrl = baseUrl.lastIndexOf('/') === baseUrl.length - 1 ? baseUrl : baseUrl + '/';

      if (depReference.webpackageId && this._responseCache.get(depReference.webpackageId) !== null) { // use manifest from responseCache if available
        processManifest(this._responseCache.get(depReference.webpackageId), false);
      } else if (typeof depReference.manifest === 'object') { // use inline manifest from depReference if set
        // TODO: transform manifest to ensure backwards compatibility with modelVersion > < 9
        processManifest(depReference.manifest);
      } else { // default case: request manifest using ajax
        var url = baseUrl + depReference.webpackageId + '/manifest.webpackage';
        this._fetchManifest(url).then(
          function (response) { processManifest(response.data, true); },
          function (error) { reject(error); }
        );
      }
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype._extractArtifact = function (depReference, manifest) {
    var requestedArtifact;
    if (manifest) {
      // for apps, elementaryComponents etc.
      // console.log(JSON.stringify(manifest))
      Object.keys(manifest.artifacts).some(function (artifactType) {
        manifest.artifacts[ artifactType ].some(function (artifact) {
          if (artifact.artifactId === depReference.artifactId) {
            requestedArtifact = artifact;
          }
        });
      });
    }
    return requestedArtifact;
  };

  ArtifactsDepsResolver.prototype._createDepReferenceListFromArtifactDependencies = function (dependencies, referrer) {
    var self = this;
    var depList = [];
    if (!dependencies) {
      return depList;
    }

    // check given referrer is of type object
    if (!referrer || (referrer && typeof referrer !== 'object')) {
      console.warn('Expect parameter "referrer" to be null or of type object: ', referrer, '. Will use "root" as fallback referrer');
      // if referrer is invalid set it to null. A referrer with value 'null' is interpreted as 'root'
      referrer = null;
    }
    // console.log(typeof dependencies)

    dependencies.forEach(function (dependency) {
      var valid = true; // just a flag used for skipping the processing of current dependency when it is invalid

      // check if dependency is of type 'object' and has at least string property 'artifactId'
      if (!(typeof dependency === 'object' && dependency.hasOwnProperty('artifactId') && typeof dependency.artifactId === 'string')) {
        console.error('Expected parameter to be an object containing at least string property "artifactId": ', dependency);
        valid = false;
      }
      // check if dependencies manifest property is of type object (in case there is a manifest property)
      if (dependency.hasOwnProperty('manifest') && typeof dependency.manifest !== 'object') {
        console.error('Expected parameter to be an object containing at least string property "artifactId": ', dependency);
        valid = false;
      }

      // continue processing of current dependency only if it's a valid one
      if (valid) {
        var depReferenceInitObject = {
          referrer: referrer,
          artifactId: dependency.artifactId,
          webpackageId: self._determineWebpackageId(dependency, referrer)
        };

        // add manifest if available
        if (dependency.manifest) {
          depReferenceInitObject.manifest = dependency.manifest;
        }

        var depRef = new DepReference(depReferenceInitObject);

        // dependencyExcludes if available
        if (dependency.hasOwnProperty('dependencyExcludes')) {
          depRef.dependencyExcludes = dependency.dependencyExcludes;
        }

        depList.push(depRef);
      }
    });
    return depList;
  };

  ArtifactsDepsResolver.prototype._determineWebpackageId = function (dependency, referrer) {
    if (dependency.hasOwnProperty('webpackageId') && typeof dependency.webpackageId === 'string') {
      return dependency.webpackageId;
    } else if (referrer && typeof referrer === 'object' && referrer.hasOwnProperty('webpackageId') && referrer.hasOwnProperty('artifactId')) {
      // if there is no webpackageId given then we assume that the dependency resides in the same webpackage like the referrer
      return referrer.webpackageId;
    } else {
      console.error('Could not determine webpackageId for dependency: ', dependency, ' and referrer: ', referrer);
      return '';
    }
  };

  ArtifactsDepsResolver.prototype._storeManifestFiles = function (document, artifactId) {
    this._responseCache.addItem(artifactId, document);
  };

  module.exports = ArtifactsDepsResolver;
}());
