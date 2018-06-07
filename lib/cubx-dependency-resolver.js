/* globals __dirname */
(function () {
  'use strict';

  var path = require('path');
  var axios = require('axios');
  var DependencyTree = require(path.resolve(__dirname, 'DependencyTree.js'));
  var ResponseCache = require(path.resolve(__dirname, 'ResponseCache.js'));
  var DepReference = require(path.resolve(__dirname, 'DepReference.js'));
  var Resource = require(path.resolve(__dirname, 'Resource.js'));

  var DEFAULT_RUNTIME_MODE = 'prod';

  var ArtifactsDepsResolver = function () {
    this._axios = axios.create({ responseType: 'json' });
    this._responseCache = new ResponseCache();
    this._runtimeMode = DEFAULT_RUNTIME_MODE;
  };

  ArtifactsDepsResolver.prototype.resolveDependencies = function (rootDependencies, baseUrl) {
    this.rootDependencies = rootDependencies;
    this._baseUrl = baseUrl;
    return new Promise(function (resolve, reject) {
      this.buildRawDependencyTree(rootDependencies, baseUrl)
        .then(function (rawDepTree) {
          return this._checkDepTreeForExcludes(rawDepTree, baseUrl);
        }.bind(this))
        .then(function (depTree) {
          depTree.applyExcludes();
          depTree.removeDuplicates();
          depTree.removeExcludes();
          this.resolvedDepTree = depTree;
          resolve(this.resolvedDepTree);
        }.bind(this), function (error) {
          console.error('Error while building and processing DependencyTree: ', error);
          reject(error);
        });
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype.resolveResourcesList = function (rootDependencies, baseUrl, runtimeMode) {
    this.rootDependencies = rootDependencies;
    this._baseUrl = baseUrl;
    if (runtimeMode) {
      if (this._isValidRuntimeMode(runtimeMode)) {
        this._runtimeMode = runtimeMode;
      } else {
        console.error('Using default value for runtimeMode: ' + DEFAULT_RUNTIME_MODE +
          ' since an invalid value was provided: \'' + runtimeMode + '\'. It should be \'dev\' or \'prod\'');
      }
    }
    return new Promise(function (resolve, reject) {
      this.resolveDependencies(rootDependencies, baseUrl)
        .then(function (resolvedDepTree) {
          var allDependencies = this._getDependencyListFromTree(resolvedDepTree);
          this.resourceList = this._calculateResourceList(allDependencies);
          resolve(this.resourceList);
        }.bind(this), function (error) {
          console.error('Error while building resources list: ', error);
          reject(error);
        });
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype.resolveWpList = function (rootDependencies, baseUrl) {
    this.rootDependencies = rootDependencies;
    this._baseUrl = baseUrl;
    return new Promise(function (resolve, reject) {
      this.resolveDependencies(rootDependencies, baseUrl)
        .then(function (resolvedDepTree) {
          var allDependencies = this._getDependencyListFromTree(resolvedDepTree);
          this.wpList = this._calculateWpList(allDependencies);
          resolve(this.wpList);
        }.bind(this), function (error) {
          console.error('Error while building webpackages list: ', error);
          reject(error);
        });
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype._isValidRuntimeMode = function (runtimeMode) {
    return typeof runtimeMode === 'string' && (runtimeMode === 'dev' || runtimeMode === 'prod');
  };

  ArtifactsDepsResolver.prototype.getRawDependencyTree = function () {
    return this.rawDepTree;
  };

  ArtifactsDepsResolver.prototype.getResolvedDependencyTree = function () {
    return this.resolvedDepTree;
  };

  ArtifactsDepsResolver.prototype.getResourceList = function () {
    return this.resourceList;
  };

  ArtifactsDepsResolver.prototype.getWpList = function () {
    return this.wpList;
  };

  ArtifactsDepsResolver.prototype.buildRawDependencyTree = function (rootDependencies, baseUrl) {
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
            this.rawDepTree = depTree.clone();
            resolve(depTree);
          }
        }.bind(this), function (error) {
          console.error('Could not resolve Dependency: ', error);
          reject(error);
        });
      }.bind(this))(rootDependencies, rootNodes);
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype._checkDepTreeForExcludes = function (depTree, baseUrl) {
    // make some type checking
    if (!(depTree instanceof DependencyTree)) {
      throw new TypeError('parameter \'depTree\' needs to be an instance of DependencyMgr.DependencyTree');
    }
    if (typeof baseUrl !== 'string') {
      throw new TypeError('parameter \'baseUrl\' needs to be of type string');
    }

    return new Promise(function (resolve, reject) {
      // traverse through tree and request manifest for each node used for adding dependencyExcludes, if there are any.
      var nodes = [];
      var promises = [];

      depTree.traverseBF(function (node) {
        nodes.push(node);
        // if given node is a rootNode check global rootDependencies for existing excludes.
        if (node.parent === null) {
          this._checkAndAddExcludesForRootDependencies(node);
        }
        promises.push(this._getManifestForDepReference(node.data, baseUrl));
      }.bind(this));

      if (promises.length === 0) {
        resolve(depTree);
      }

      Promise.all(promises)
        .then(function (results) {
          results.forEach(function (manifest, index) {
            try {
              this._checkAndAddExcludesToDepReference(nodes[index].data, manifest);
            } catch (e) {
              reject(e);
            }
          }.bind(this));
          resolve(depTree);
        }.bind(this))
        .catch(function (error) {
          reject(error);
        });
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype._checkAndAddExcludesForRootDependencies = function (node) {
    // make some type checking of param node
    if (!(node instanceof DependencyTree.Node)) {
      throw new TypeError('parameter \'node\' needs to be an instance of DependencyTree.Node');
    }
    var rootDependencies = this._createDepReferenceListFromArtifactDependencies(this.rootDependencies, null);
    var rootDep = rootDependencies.find(function (dep) {
      return node.data.artifactId === dep.artifactId && node.data.webpackageId === dep.webpackageId;
    });

    if (rootDep.hasOwnProperty('dependencyExcludes')) {
      node.data.dependencyExcludes = rootDep.dependencyExcludes;
    }
    return node;
  };

  ArtifactsDepsResolver.prototype._getManifestForDepReference = function (depReference, baseUrl) {
    // make some type checking
    if (!(depReference instanceof DepReference)) {
      throw new TypeError('parameter \'depReference\' needs to be an instance of DependencyMgr.DepReference');
    }

    return new Promise(function (resolve, reject) {
      var webpackageId = depReference.webpackageId;
      if (this._responseCache.get(webpackageId) !== null) {
        resolve(this._responseCache.get(webpackageId));
      } else if (depReference.manifest) {
        resolve(depReference.manifest);
      } else if (typeof baseUrl === 'string') {
        // append / to baseUrl if necessary
        var url = baseUrl.lastIndexOf('/') !== baseUrl.length - 1 ? baseUrl + '/' : baseUrl;
        this._fetchManifest(url + webpackageId + '/manifest.webpackage').then(function (result) {
          resolve(result.data);
        }, function (error) {
          reject(error);
        });
      } else {
        reject(new TypeError('parameter \'baseUrl\' needs to be a valid url'));
      }
    }.bind(this));
  };

  ArtifactsDepsResolver.prototype._checkAndAddExcludesToDepReference = function (depReference, manifest) {
    // make some parameter type checking
    if (!(depReference instanceof DepReference)) {
      throw new TypeError('parameter \'depReference\' needs to be an instance of DependencyMgr.DepReference');
    }
    if (typeof manifest !== 'object') {
      throw new TypeError('parameter \'manifest\' needs to be a an object representing a webpackage.manifest');
    }

    // find artifact in given manifest that corresponds with given depReference
    var artifact = this._extractArtifact(depReference, manifest);
    if (artifact.hasOwnProperty('dependencyExcludes') && artifact.dependencyExcludes.length > 0) {
      depReference.dependencyExcludes = depReference.dependencyExcludes.concat(JSON.parse(JSON.stringify(artifact.dependencyExcludes)));
    }

    return depReference;
  };

  ArtifactsDepsResolver.prototype._getDependencyListFromTree = function (depTree) {
    var nodeList = [];
    var depList = [];

    depTree.traverseBF(function (nodeToInsert) {
      // find index of first node in nodeList, which is an ancestor for given node
      var index = -1;
      nodeList.some(function (element, currentIndex) {
        if (element.isAncestorOf(nodeToInsert)) {
          index = currentIndex;
          return true;
        }
      });
      // we need to insert node before all ancestors of this node to make sure all of it's ancestors can use node
      // as dependency. We ensure this by just inserting the node right before the first ancestor found in current nodeList
      if (index > -1) {
        nodeList.splice(index, 0, nodeToInsert);
      } else {
        // if there is no ancestor of node in current nodeList yet we can just push node to current nodeList
        nodeList.push(nodeToInsert);
      }
    });

    depList = nodeList.map(function (node) {
      return node.data;
    });
    return depList;
  };

  ArtifactsDepsResolver.prototype._calculateResourceList = function (depList) {
    var resourceList = [];
    for (var i = 0; i < depList.length; i++) {
      var currentDepRef = depList[i];
      for (var j = 0; j < currentDepRef.resources.length; j++) {
        // remove endpoint appendix from artifactId if there was one added by the manifestConverter
        var qualifiedArtifactId = currentDepRef.artifactId.indexOf('#') > -1
          ? currentDepRef.webpackageId + '/' + currentDepRef.artifactId.split('#')[0]
          : currentDepRef.webpackageId + '/' + currentDepRef.artifactId;
        var resource = this._createResourceFromItem(qualifiedArtifactId, currentDepRef.resources[j],
          this._runtimeMode, currentDepRef.referrer);
        if (resource) {
          resourceList.push(resource);
        }
      }
    }
    return resourceList;
  };

  ArtifactsDepsResolver.prototype._calculateWpList = function (depList) {
    var wpList = [];
    for (var i = 0; i < depList.length; i++) {
      var currentDepRef = depList[i];
      if (wpList.indexOf(currentDepRef.webpackageId) === -1) {
        wpList.push(currentDepRef.webpackageId);
      }
    }
    return wpList;
  };

  ArtifactsDepsResolver.prototype._createResourceFromItem = function (qualifiedArtifactId, item, runtimeMode, referrer) {
    // if item does not contain a prod-dev structure, map it into that - to simplify further processing
    if (typeof item === 'string') {
      item = {
        prod: item,
        dev: item
      };
    }

    if (!item.hasOwnProperty('prod') || !item.hasOwnProperty('dev') ||
      typeof item.prod !== 'string' || typeof item.dev !== 'string') {
      throw new TypeError('parameter "item" needs to have string properties "prod" and "dev"');
    }

    if (qualifiedArtifactId === null || typeof qualifiedArtifactId !== 'string') {
      throw new TypeError('parameter "qualifiedArtifactId" needs to be of type string');
    }

    var file;
    if (item[runtimeMode].indexOf('http') === 0 || item[runtimeMode].indexOf('blob') === 0) {
      file = item[runtimeMode];
    } else {
      file = this._baseUrl + qualifiedArtifactId + '/' + item[runtimeMode];
    }

    var resMetaObj = this._determineResourceType(file);
    if (!resMetaObj.fileType) {
      console.warn('The following resource will be ignored, because the type of the resource is unkown. It should be "js", "html" or "css". (' + item[runtimeMode] + ')');
      return;
    }
    return new Resource(resMetaObj.fileName, resMetaObj.fileType.name, referrer);
  };

  ArtifactsDepsResolver.prototype._determineResourceType = function (fileName) {
    var fileType;
    var paramTypeIndex = fileName.indexOf('?type=');
    var paramType;
    if (paramTypeIndex > 0) {
      paramType = fileName.substr(paramTypeIndex + 6);
      fileName = fileName.substring(0, paramTypeIndex);
    }
    var fileEnding = paramType || fileName.split('.')[fileName.split('.').length - 1];

    for (var property in Resource._types) {
      if (Resource._types.hasOwnProperty(property)) {
        var type = Resource._types[property];
        for (var i = 0; i < type.fileEndings.length; i++) {
          if (type.fileEndings[i] === fileEnding) {
            fileType = type;
            break;
          }
        }
        if (fileType) {
          break;
        }
      }
    }

    return {
      fileType: fileType,
      fileName: fileName
    };
  };

  ArtifactsDepsResolver.prototype._fetchManifest = function (url) {
    return this._axios.request({ url: url });
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
