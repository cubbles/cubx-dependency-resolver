/* globals describe, beforeEach, afterEach, it, expect, before, __dirname, sinon, after */
/* eslint no-unused-expressions: "off" */
(function () {
  'use strict';
  describe('ArtifactsDepsResolver', function () {
    var fs = require('fs-extra');
    var path = require('path');
    var DependencyTree = require('../../lib/DependencyTree');
    var DepReference = require('../../lib/DepReference');
    var ArtifactsDepsResolver = require('../../lib/cubx-dependency-resolver.js');
    var artifactsDepsResolver;
    var resourcesPath;
    var pkg1;
    var pkg2;
    var pkg3;
    var pkg4;
    var pkg5;
    var pkg6;
    var rootDepList;
    before(function () {
      resourcesPath = path.join(__dirname, '../resources');
      pkg1 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage1.json'), 'utf8');
      pkg2 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage2.json'), 'utf8');
      pkg3 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage3.json'), 'utf8');
      pkg4 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage4.json'), 'utf8');
      pkg5 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage5.json'), 'utf8');
      pkg6 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage6.json'), 'utf8');
    });
    beforeEach(function () {
      rootDepList = JSON.parse(fs.readFileSync(path.join(resourcesPath, 'rootDependencies.json'), 'utf8'));
    });
    describe('#buildRawDependencyTree', function () {
      var baseUrl;
      var stub;
      before(function () {
        baseUrl = 'https://cubbles.world/sandbox/';
        artifactsDepsResolver = new ArtifactsDepsResolver();
        stub = sinon.stub(artifactsDepsResolver, '_resolveDepReferenceDependencies').callsFake(function (dep) {
          return new Promise(function (resolve, reject) {
            var requestedPkg;
            var dependencies = [];
            switch (dep.getId()) {
              case 'package1@1.0.0/util1':
                requestedPkg = JSON.parse(pkg1);
                dependencies = artifactsDepsResolver._createDepReferenceListFromArtifactDependencies(
                  requestedPkg.artifacts.utilities[0].dependencies, {
                    webpackageId: 'package1@1.0.0',
                    artifactId: 'util1'
                  });
                break;
              case 'package2@1.0.0/util2':
                requestedPkg = JSON.parse(pkg2);
                dependencies = artifactsDepsResolver._createDepReferenceListFromArtifactDependencies(
                  requestedPkg.artifacts.utilities[0].dependencies, {
                    webpackageId: 'package2@1.0.0',
                    artifactId: 'util2'
                  });
                break;
              case 'package3@1.0.0/util3':
                requestedPkg = JSON.parse(pkg3);
                dependencies = artifactsDepsResolver._createDepReferenceListFromArtifactDependencies(
                  requestedPkg.artifacts.utilities[0].dependencies, {
                    webpackageId: 'package3@1.0.0',
                    artifactId: 'util3'
                  });
                break;
              case 'package4@1.0.0/util4':
                requestedPkg = JSON.parse(pkg4);
                break;
              case 'package5@1.0.0/util5':
                requestedPkg = JSON.parse(pkg5);
                dependencies = artifactsDepsResolver._createDepReferenceListFromArtifactDependencies(
                  requestedPkg.artifacts.utilities[0].dependencies, {
                    webpackageId: 'package5@1.0.0',
                    artifactId: 'util5'
                  });
                break;
              case 'package6@1.0.0/util6':
                requestedPkg = JSON.parse(pkg6);
            }
            if (requestedPkg) {
              setTimeout(function () {
                resolve({dependencies: dependencies, resources: requestedPkg.artifacts.utilities[0].resources});
              }, 200);
            } else if (!(dep instanceof DepReference)) {
              throw new TypeError();
            } else {
              setTimeout(function () {
                reject({message: 'Error while resolving...'}); // eslint-disable-line prefer-promise-reject-errors
              }, 100);
            }
          });
        });
      });
      after(function () {
        stub.restore();
      });
      it('should return a promise', function () {
        expect(artifactsDepsResolver.buildRawDependencyTree(rootDepList, baseUrl)).to.be.an.instanceOf(Promise);
      });
      it('should resolve the returned promise with an instance of DependencyTree', function () {
        this.timeout(15000);
        return artifactsDepsResolver.buildRawDependencyTree(rootDepList, baseUrl).then(function (result) {
          result.should.be.an.instanceOf(DependencyTree);
        });
      });
      it('should create a DependencyTree representing the raw dependency structure for given rootDependency list', function () {
        /**
         * Check if raw dependency tree has the following structure:
         *
         *                  package1@1.0.0/util1                                package2@1.0.0/util2
         *                     /         \                                           /         \
         *                    /           \                                         /           \
         *      package3@1.0.0/util3    package4@1.0.0/util4          package3@1.0.0/util3    package5@1.0.0/util5
         *              |                                                       |                       |
         *              |                                                       |                       |
         *      package5@1.0.0/util5                                  package5@1.0.0/util5    package6@1.0.0/util6
         *              |                                                       |
         *              |                                                       |
         *      package6@1.0.0/util6                                  package6@1.0.0/util6
         */
        return artifactsDepsResolver.buildRawDependencyTree(rootDepList, baseUrl).then(function (tree) {
          expect(tree._rootNodes).to.have.lengthOf(2);
          // check first (root) level of tree
          expect(tree._rootNodes[0].data.getId()).to.equal('package1@1.0.0/util1');
          expect(tree._rootNodes[1].data.getId()).to.equal('package2@1.0.0/util2');
          // check second level of tree
          expect(tree._rootNodes[0].children[0].data.getId()).to.equal('package3@1.0.0/util3');
          expect(tree._rootNodes[0].children[1].data.getId()).to.equal('package4@1.0.0/util4');
          expect(tree._rootNodes[1].children[0].data.getId()).to.equal('package3@1.0.0/util3');
          expect(tree._rootNodes[1].children[1].data.getId()).to.equal('package5@1.0.0/util5');
          // check third level of tree
          expect(tree._rootNodes[0].children[0].children[0].data.getId()).to.equal('package5@1.0.0/util5');
          expect(tree._rootNodes[1].children[0].children[0].data.getId()).to.equal('package5@1.0.0/util5');
          expect(tree._rootNodes[1].children[1].children[0].data.getId()).to.equal('package6@1.0.0/util6');
          // check 4th level of tree
          expect(tree._rootNodes[0].children[0].children[0].children[0].data.getId()).to.equal('package6@1.0.0/util6');
          expect(tree._rootNodes[1].children[0].children[0].children[0].data.getId()).to.equal('package6@1.0.0/util6');
        });
      });
      describe('Error Handling', function () {
        it('should throw an TypeError if \'dependencies\' parameter is not an Array', function () {
          try {
            artifactsDepsResolver.buildRawDependencyTree({});
          } catch (error) {
            expect(error).to.be.an.instanceOf(TypeError);
          }
        });
        it('should reject returned promise if there is an error resolving single depenencies', function () {
          rootDepList.push({webpackageId: 'error', artifactId: 'util'});
          return artifactsDepsResolver.buildRawDependencyTree(rootDepList, baseUrl).then(function (result) {
            throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
          }, function (error) {
            error.should.have.ownProperty('message', 'Error while resolving...');
          });
        });
      });
    });
    describe('#_fetchManifest()', function () {
      var axiosStub;
      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        axiosStub = sinon.stub(artifactsDepsResolver._axios, 'request').callsFake(function (url) {
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              resolve();
            }, 250);
          });
        });
      });
      it('should call _axios.request method with given url', function (done) {
        artifactsDepsResolver._fetchManifest('https://www.example.test').then(function () {
          expect(axiosStub.calledWith({url: 'https://www.example.test'})).to.be.equal(true);
          done();
        });
      });
      it('should return a promise', function () {
        var promise = artifactsDepsResolver._fetchManifest('https://www.example.test');
        expect(promise).to.be.an.instanceOf(Promise);
      });
      after(function () {
        axiosStub.restore();
      });
    });
    describe('#_resolveDepReferenceDependencies()', function () {
      var _fetchManifestStub;
      var depRefItem;
      var baseUrl;

      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        baseUrl = 'https://cubbles.world/sandbox/';
      });
      beforeEach(function () {
        artifactsDepsResolver._responseCache.invalidate();
        depRefItem = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null});
        // mock _fetchManifest method
        _fetchManifestStub = sinon.stub(artifactsDepsResolver, '_fetchManifest').callsFake(function (url) {
          return new Promise(function (resolve, reject) {
            var response = {};
            if (url.indexOf('package1@1.0.0') >= 0) {
              response.data = JSON.parse(pkg1);
            }
            if (url.indexOf('package2@1.0.0') >= 0) {
              response.data = JSON.parse(pkg2);
            }
            if (url.indexOf('package3@1.0.0') >= 0) {
              response.data = JSON.parse(pkg3);
            }
            if (url.indexOf('package4@1.0.0') >= 0) {
              response.data = JSON.parse(pkg4);
            }
            if (url.indexOf('package5@1.0.0') >= 0) {
              response.data = JSON.parse(pkg5);
            }
            if (url.indexOf('package6@1.0.0') >= 0) {
              response.data = JSON.parse(pkg6);
            }
            if (response.hasOwnProperty('data')) {
              setTimeout(function () {
                resolve(response);
              }, 200);
            } else {
              setTimeout(function () {
                reject({message: 'Error while requesting ' + url}); // eslint-disable-line prefer-promise-reject-errors
              }, 100);
            }
          });
        });
      });
      afterEach(function () {
        _fetchManifestStub.restore();
      });
      it('should return a promise', function () {
        expect(artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl)).to.be.an.instanceOf(Promise);
      });
      it('should resolve the returned promise with an object containing an array of the dependencies of given depRef item and all the resources for the given depRefItem', function () {
        return artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl).then(function (result) {
          result.should.be.an.instanceOf(Object);
          result.should.have.property('resources');
          result.should.have.property('dependencies');
          result.resources.should.eql(['js/pack1.js', 'css/pack1.css']);
          result.dependencies.should.have.lengthOf(2);
          result.dependencies[0].should.be.an.instanceOf(DepReference);
          result.dependencies[1].should.be.an.instanceOf(DepReference);
          expect(result.dependencies[0].getId()).to.equal('package3@1.0.0/util3');
          expect(result.dependencies[1].getId()).to.equal('package4@1.0.0/util4');
        });
      });
      it('should use inline manifest from given dependency if there is any', function () {
        depRefItem.manifest = JSON.parse(pkg1);
        return artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl).then(function (result) {
          expect(_fetchManifestStub.callCount).to.equal(0);
          result.dependencies.should.have.lengthOf(2);
          result.dependencies[0].should.be.an.instanceOf(DepReference);
          result.dependencies[1].should.be.an.instanceOf(DepReference);
          expect(result.dependencies[0].getId()).to.equal('package3@1.0.0/util3');
          expect(result.dependencies[1].getId()).to.equal('package4@1.0.0/util4');
        });
      });
      it('should use manifest from responseCache if there is already one for given webpackageId', function () {
        artifactsDepsResolver._responseCache.addItem(depRefItem.webpackageId, JSON.parse(pkg1));
        return artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl).then(function (result) {
          expect(_fetchManifestStub.callCount).to.equal(0);
          result.dependencies.should.have.lengthOf(2);
          result.dependencies[0].should.be.an.instanceOf(DepReference);
          result.dependencies[1].should.be.an.instanceOf(DepReference);
          expect(result.dependencies[0].getId()).to.equal('package3@1.0.0/util3');
          expect(result.dependencies[1].getId()).to.equal('package4@1.0.0/util4');
        });
      });
      it('should add inline or requested manifest to response cache if there is no entry for corresponding webpackageId', function () {
        return artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl).then(function (result) {
          expect(artifactsDepsResolver._responseCache.get(depRefItem.webpackageId)).to.eql(JSON.parse(pkg1));
        });
      });
      it('should request manifest files from given baseUrl', function () {
        var baseUrl = 'https://www.example.test/';
        return artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl).then(function (result) {
          expect(_fetchManifestStub.calledWith(baseUrl + depRefItem.webpackageId + '/manifest.webpackage'));
        });
      });
      it('should append \'/\' to baseUrl if not present', function () {
        var baseUrl = 'https://www.example.test';
        return artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl).then(function (result) {
          expect(_fetchManifestStub.calledWith(baseUrl + '/' + depRefItem.webpackageId + '/manifest.webpackage'));
        });
      });
      describe('Error handling', function () {
        it('should throw an TypeError if parameter baseUrl is not given or a not of type string', function () {
          try {
            artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, {});
          } catch (error) {
            expect(error).to.be.an.instanceOf(TypeError);
          }
        });
        it('should throw an TypeError if parameter depReference is not an instance of DependencyMgr.DepReference', function () {
          try {
            artifactsDepsResolver._resolveDepReferenceDependencies({}, baseUrl);
          } catch (error) {
            expect(error).to.be.an.instanceOf(TypeError);
          }
        });
        it('should reject returned promise if there is an error while fetching the manifest', function () {
          depRefItem.webpackageId = 'error';
          return artifactsDepsResolver._resolveDepReferenceDependencies(depRefItem, baseUrl).then(function (result) {
            throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
          }, function (error) {
            error.should.have.ownProperty('message');
          });
        });
      });
    });
    describe('#_extractArtifact()', function () {
      var depRefItem;
      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        depRefItem = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null});
      });
      it('should return require artifact', function () {
        var artifact = artifactsDepsResolver._extractArtifact(depRefItem, JSON.parse(pkg1));
        expect(artifact).to.deep.equal(JSON.parse(pkg1).artifacts.utilities[0]);
      });
      it('should return null since artifact is not in manifest', function () {
        var artifact = artifactsDepsResolver._extractArtifact(depRefItem, JSON.parse(pkg2));
        expect(artifact).to.be.equal(undefined);
      });
    });
    describe('#_createDepReferenceListFromArtifactDependencies()', function () {
      beforeEach(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
      });
      it('should create a list of DepReference items from given list of dependencies', function () {
        var referrer = {
          webpackageId: 'testWebpackagePackageId',
          artifactId: 'testArtifactId'
        };
        var depList = artifactsDepsResolver._createDepReferenceListFromArtifactDependencies(rootDepList, referrer);
        expect(depList).to.have.lengthOf(2);
        var item = depList[0];
        item.artifactId.should.equal('util1');
        item.webpackageId.should.equal('package1@1.0.0');
        item.referrer[0].should.eql(referrer);
        item.dependencyExcludes.should.eql([]);

        item = depList[1];
        item.artifactId.should.equal('util2');
        item.webpackageId.should.equal('package2@1.0.0');
        item.referrer[0].should.eql(referrer);
        item.dependencyExcludes.should.eql([]);
      });
      it('should set referrer to "root" if param referrer is set to null', function () {
        var item = artifactsDepsResolver._createDepReferenceListFromArtifactDependencies(rootDepList, null)[0];
        item.referrer[0].should.equal('root');
      });
    });
    describe('#_determineWebpackageId()', function () {
      var referrer;
      var dependency;
      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        referrer = {
          webpackageId: 'testWebpackagePackageId',
          artifactId: 'testArtifactId'
        };
      });
      it('should determine webpackageId from dependency', function () {
        dependency = {
          webpackageId: 'testWebpackagePackageId2',
          artifactId: 'testArtifactId2'
        };
        var webpackageId = artifactsDepsResolver._determineWebpackageId(dependency, referrer);
        expect(webpackageId).to.be.equal(dependency.webpackageId);
      });
      it('should determine webpackageId from referrer', function () {
        dependency = {};
        var webpackageId = artifactsDepsResolver._determineWebpackageId(dependency, referrer);
        expect(webpackageId).to.be.equal(referrer.webpackageId);
      });
      describe('Error Handling', function () {
        var consoleSpy;
        before(function () {
          dependency = {};
          referrer = null;
        });
        beforeEach(function () {
          consoleSpy = sinon.spy(console, 'error');
        });
        afterEach(function () {
          consoleSpy.restore();
        });
        it('should return \'\'since webpackageId could not be determined', function () {
          var webpackageId = artifactsDepsResolver._determineWebpackageId(dependency, referrer);
          expect(webpackageId).to.be.equal('');
        });
        it('should log an error since webpackageId could not be determined', function () {
          artifactsDepsResolver._determineWebpackageId(dependency, referrer);
          expect(consoleSpy).to.be.calledOnce;
        });
      });
    });
    describe('#_storeManifestFiles()', function () {
      var cacheAddItemSpy;
      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        cacheAddItemSpy = sinon.spy(artifactsDepsResolver._responseCache, 'addItem');
      });
      it('should call \'addItem\' method from \'_responseCache\'', function () {
        var pk1Manifest = JSON.parse(pkg1);
        artifactsDepsResolver._storeManifestFiles(pk1Manifest, pk1Manifest.artifacts.utilities[0].artifactId);
        cacheAddItemSpy.should.be.calledWith(pk1Manifest.artifacts.utilities[0].artifactId, pk1Manifest);
      });
    });
    describe('#_checkDepTreeForExcludes()', function () {
      var baseUrl;
      var depTree;
      var spy;
      var spy2;
      var stub;

      beforeEach(function () {
        rootDepList = JSON.parse(fs.readFileSync(path.join(resourcesPath, 'rootDependencies.json'), 'utf8'));
        // add an dependencyExclude to rootDependencies
        rootDepList[0].dependencyExcludes = [
          {webpackageId: 'packageToExclude', artifactId: 'artifactToExclude'}
        ];
        artifactsDepsResolver = new ArtifactsDepsResolver();
        artifactsDepsResolver.rootDependencies = rootDepList;
        baseUrl = 'https://cubbles.world/sandbox/';

        // spy _checkAndAddExcludesToDepReference()
        spy = sinon.spy(Object.getPrototypeOf(artifactsDepsResolver), '_checkAndAddExcludesToDepReference');

        // spy _checkAndAddExcludesForRootDependencies()
        spy2 = sinon.spy(Object.getPrototypeOf(artifactsDepsResolver), '_checkAndAddExcludesForRootDependencies');

        // stub _getManifestForDepReference()
        stub = sinon.stub(Object.getPrototypeOf(artifactsDepsResolver), '_getManifestForDepReference').callsFake(function (depRefItem, baseUrl) {
          var manifest;
          switch (depRefItem.webpackageId) {
            case 'package1@1.0.0':
              manifest = JSON.parse(pkg1);
              // add some excludes
              manifest.artifacts.utilities[0].dependencyExcludes = [
                {webpackageId: 'anotherPackageExclude', artifactId: 'anotherArtifactExclude'}
              ];
              break;
            case 'package3@1.0.0':
              manifest = JSON.parse(pkg3);
              // add some excludes
              manifest.artifacts.utilities[0].dependencyExcludes = [
                {webpackageId: 'packageToExclude', artifactId: 'artifactToExclude'},
                {webpackageId: 'packageToExclude_2', artifactId: 'artifactToExclude_2'}
              ];
              break;
            case 'package4@1.0.0':
              manifest = JSON.parse(pkg4);
              break;
            case 'package5@1.0.0':
              manifest = JSON.parse(pkg5);
          }
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              if (manifest) {
                resolve(manifest);
              } else {
                reject(); // eslint-disable-line prefer-promise-reject-errors
              }
            }, 200);
          });
        });

        /**
         * Build the following tree:
         *
         *               package1@1.0.0/util1
         *                    /       \
         *                   /         \
         *    package3@1.0.0/util3    package4@1.0.0/util4
         *            |
         *            |
         *    package5@1.0.0/util5
         */
        depTree = new DependencyTree();
        var root = new DependencyTree.Node();
        root.data = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null});
        depTree.insertNode(root);
        var childA = new DependencyTree.Node();
        childA.data = new DepReference({
          webpackageId: 'package3@1.0.0',
          artifactId: 'util3',
          referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
        });
        depTree.insertNode(childA, root);
        var childB = new DependencyTree.Node();
        childB.data = new DepReference({
          webpackageId: 'package4@1.0.0',
          artifactId: 'util4',
          referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
        });
        depTree.insertNode(childB, root);
        var childA1 = new DependencyTree.Node();
        childA1.data = new DepReference({
          webpackageId: 'package5@1.0.0',
          artifactId: 'util5',
          referrer: {webpackageId: 'package4@1.0.0', artifactId: 'util4'}
        });
        depTree.insertNode(childA1, childA);
      });
      afterEach(function () {
        spy.restore();
        spy2.restore();
        stub.restore();
      });
      it('should return promise which will be resolved with given DependencyTree', function () {
        var promise = artifactsDepsResolver._checkDepTreeForExcludes(depTree, baseUrl);
        expect(promise).to.be.an.instanceOf(Promise);
        return promise.then(function (result) {
          result.should.be.an.instanceof(DependencyTree);
        });
      });
      it('should call _checkAndAddExcludesToDepReference() for each Node in DependencyTree and assign dependencyExcludes if there are any', function () {
        return artifactsDepsResolver._checkDepTreeForExcludes(depTree, baseUrl).then(function () {
          expect(spy.callCount).to.eql(4);
          expect(spy.getCall(0).args[0].getId()).to.equal('package1@1.0.0/util1');
          expect(spy.getCall(1).args[0].getId()).to.equal('package3@1.0.0/util3');
          expect(spy.getCall(2).args[0].getId()).to.equal('package4@1.0.0/util4');
          expect(spy.getCall(3).args[0].getId()).to.equal('package5@1.0.0/util5');
          depTree._rootNodes[0].data.should.have.ownProperty('dependencyExcludes');
          depTree._rootNodes[0].data.dependencyExcludes.should.eql([
            {webpackageId: 'packageToExclude', artifactId: 'artifactToExclude'},
            {webpackageId: 'anotherPackageExclude', artifactId: 'anotherArtifactExclude'}
          ]);
          depTree._rootNodes[0].children[0].data.should.have.ownProperty('dependencyExcludes');
          depTree._rootNodes[0].children[0].data.dependencyExcludes.should.eql([
            {webpackageId: 'packageToExclude', artifactId: 'artifactToExclude'},
            {webpackageId: 'packageToExclude_2', artifactId: 'artifactToExclude_2'}
          ]);
          // console.log(depTree);
        });
      });
      it('should call _checkAndAddExcludesForRootDependencies() for each rootNode in DependencyTree', function () {
        return artifactsDepsResolver._checkDepTreeForExcludes(depTree, baseUrl).then(function () {
          expect(spy2.callCount).to.eql(1);
          expect(spy2.getCall(0).args[0]).to.equal(depTree._rootNodes[0]);
        });
      });
      describe('Error handling', function () {
        it('should throw an TypeError if first parameter is not an instance of DependencyMgr.DependencyTree', function () {
          var errorThrown = false;
          try {
            artifactsDepsResolver._checkDepTreeForExcludes({}, 'http://www.example.de/test');
          } catch (error) {
            errorThrown = true;
            error.should.be.an.instanceOf(TypeError);
          } finally {
            expect(errorThrown).to.be.true;
          }
        });
        it('should throw an TypeError if second parameter is not a string', function () {
          var errorThrown = false;
          try {
            artifactsDepsResolver._checkDepTreeForExcludes(new DependencyTree(), 123);
          } catch (error) {
            errorThrown = true;
            error.should.be.an.instanceOf(TypeError);
          } finally {
            expect(errorThrown).to.be.true;
          }
        });
      });
    });
    describe('#_checkAndAddExcludesForRootDependencies', function () {
      var node;
      beforeEach(function () {
        rootDepList = JSON.parse(fs.readFileSync(path.join(resourcesPath, 'rootDependencies.json'), 'utf8'));
        // add an dependencyExclude to rootDependencies
        rootDepList[0].dependencyExcludes = [
          {webpackageId: 'packageToExclude', artifactId: 'artifactToExclude'}
        ];
        artifactsDepsResolver = new ArtifactsDepsResolver();
        artifactsDepsResolver.rootDependencies = rootDepList;
        node = new DependencyTree.Node();
        node.data = new DepReference({artifactId: 'util1', webpackageId: 'package1@1.0.0', referrer: null});
      });
      it('should return given DependencyTree.Node', function () {
        var result = artifactsDepsResolver._checkAndAddExcludesForRootDependencies(node);
        result.should.equal(node);
      });
      it('should add dependencyExcludes from corresponding rootDependency to given node', function () {
        artifactsDepsResolver._checkAndAddExcludesForRootDependencies(node);
        node.data.dependencyExcludes.should.eql([{
          webpackageId: 'packageToExclude',
          artifactId: 'artifactToExclude'
        }]);
      });
      describe('Error handling', function () {
        it('should throw an TypeError if given parameter is not of type DependencyTree.Node', function () {
          var errorThrown = false;
          try {
            artifactsDepsResolver._checkAndAddExcludesForRootDependencies({});
          } catch (error) {
            errorThrown = true;
            error.should.be.an.instanceOf(TypeError);
          } finally {
            expect(errorThrown).to.be.true;
          }
        });
      });
    });
    describe('#_getManifestForDepReference()', function () {
      var baseUrl;
      var depRefItem;
      var fetchManifestStub;
      var getItemFromCacheSpy;

      beforeEach(function () {
        rootDepList = JSON.parse(fs.readFileSync(path.join(resourcesPath, 'rootDependencies.json'), 'utf8'));
        // add an dependencyExclude to rootDependencies
        artifactsDepsResolver = new ArtifactsDepsResolver();
        artifactsDepsResolver.rootDependencies = rootDepList;
        baseUrl = 'http://www.example.de/';
        depRefItem = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null});
        fetchManifestStub = sinon.stub(Object.getPrototypeOf(artifactsDepsResolver), '_fetchManifest').callsFake(function (url) {
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              if (url.indexOf('package1@1.0.0') >= 0) {
                resolve({data: JSON.parse(pkg1)});
              } else {
                reject({response: {status: 'timeout'}}); // eslint-disable-line prefer-promise-reject-errors
              }
            }, 200);
          });
        });
        getItemFromCacheSpy = sinon.spy(artifactsDepsResolver._responseCache, 'get');
        artifactsDepsResolver._responseCache.invalidate();
      });
      afterEach(function () {
        fetchManifestStub.restore();
        getItemFromCacheSpy.restore();
        artifactsDepsResolver._responseCache.invalidate();
      });
      it('should return a promise', function () {
        expect(artifactsDepsResolver._getManifestForDepReference(depRefItem, baseUrl)).to.be.an.instanceOf(Promise);
      });
      it('should resolve returned promise with manifest from responseCache if there is one', function () {
        // put a manifest in responseCache
        artifactsDepsResolver._responseCache.addItem('package1@1.0.0', JSON.parse(pkg1));
        return artifactsDepsResolver._getManifestForDepReference(depRefItem).then(function (result) {
          result.should.be.eql(JSON.parse(pkg1));
          expect(getItemFromCacheSpy.calledOnce);
          expect(fetchManifestStub.callCount).to.be.equal(0);
        });
      });
      it('should resolve returned promise with inline manifest from depReference if there is one ' +
        'and no manifest was found in responseCache', function () {
        depRefItem.manifest = JSON.parse(pkg1);
        return artifactsDepsResolver._getManifestForDepReference(depRefItem).then(function (result) {
          result.should.be.eql(depRefItem.manifest);
          expect(getItemFromCacheSpy.callCount.calledOnce);
          expect(fetchManifestStub.callCount).to.be.equal(0);
        });
      });
      it('should resolve returned promise with requested manifest from baseUrl if there is ' +
        'neither a manifest in responseCache nor in inline manifest', function () {
        return artifactsDepsResolver._getManifestForDepReference(depRefItem, baseUrl).then(function (result) {
          result.should.be.eql(JSON.parse(pkg1));
          expect(getItemFromCacheSpy.calledOnce);
          expect(fetchManifestStub.calledOnce);
          expect(fetchManifestStub.calledWith(baseUrl + 'package1@1.0.0/webpackage.manifest'));
        });
      });
      describe('Error handling', function () {
        it('should reject returned promise if there is an error while fetching manifest', function () {
          depRefItem.webpackageId = 'timeout';
          return artifactsDepsResolver._getManifestForDepReference(depRefItem, baseUrl).then(function (resolved) {
            throw new Error('Promise was unexpectedly fulfilled: ', resolved);
          }, function (rejected) {
            rejected.should.have.property('response');
            rejected.response.should.eql({status: 'timeout'});
          });
        });
        it('should reject returned promise if baseUrl is not given when fetching manifest needs to be called', function () {
          return artifactsDepsResolver._getManifestForDepReference(depRefItem).then(function (resolved) {
            throw new Error('Promise was unexpectedly fulfilled: ', resolved);
          }, function (rejected) {
            rejected.should.be.an.instanceof(TypeError);
          });
        });
        it('should throw a TypeError if first given parameter is not an instanceOf DepReference', function () {
          var errorThrown = false;
          try {
            artifactsDepsResolver._getManifestForDepReference({});
          } catch (e) {
            errorThrown = true;
            expect(e).to.be.instanceOf(TypeError);
          } finally {
            errorThrown.should.be.true;
          }
        });
      });
    });
    describe('#_checkAndAddExcludesToDepReference()', function () {
      var depRefItem;
      var manifest;

      beforeEach(function () {
        rootDepList = JSON.parse(fs.readFileSync(path.join(resourcesPath, 'rootDependencies.json'), 'utf8'));
        // add an dependencyExclude to rootDependencies
        artifactsDepsResolver = new ArtifactsDepsResolver();
        artifactsDepsResolver.rootDependencies = rootDepList;
        manifest = {
          name: 'testPackage',
          groupId: 'com.test',
          version: '1.0.0',
          modelVersion: '9.1.0',
          docType: 'webpackage',
          artifacts: {
            utilities: [
              {
                artifactId: 'testArtifact',
                dependencyExcludes: [
                  {webpackageId: 'exclude@1', artifactId: 'util1'},
                  {webpackageId: 'exclude@2', artifactId: 'util2', endpointId: 'main'}
                ]
              }
            ]
          }
        };
        depRefItem = new DepReference({
          webpackageId: 'com.test.testPackage@1.0.0',
          artifactId: 'testArtifact',
          referrer: null
        });
        depRefItem.dependencyExcludes = [{webpackageId: 'exludedPackage', artifactId: 'excludedArtifact'}];
      });
      it('should return the given DepReference instance', function () {
        expect(artifactsDepsResolver._checkAndAddExcludesToDepReference(depRefItem, manifest)).to.eql(depRefItem);
      });
      it('should append all dependencyExcludes defined in given manifest for corresponding artifact to excludes of given DepReference', function () {
        artifactsDepsResolver._checkAndAddExcludesToDepReference(depRefItem, manifest);
        depRefItem.should.have.ownProperty('dependencyExcludes');
        depRefItem.dependencyExcludes.should.be.eql([
          {webpackageId: 'exludedPackage', artifactId: 'excludedArtifact'},
          {webpackageId: 'exclude@1', artifactId: 'util1'},
          {webpackageId: 'exclude@2', artifactId: 'util2', endpointId: 'main'}
        ]);
      });
      describe('Error handling', function () {
        it('should throw an TypeError if first given parameter is not an instance of DepReference', function () {
          var errorThrown = false;
          try {
            artifactsDepsResolver._checkAndAddExcludesToDepReference({}, manifest);
          } catch (error) {
            errorThrown = true;
            error.should.be.an.instanceOf(TypeError);
          } finally {
            errorThrown.should.be.true;
          }
        });
        it('should throw an TypeError if second given parameter is not an object', function () {
          var errorThrown = false;
          try {
            artifactsDepsResolver._checkAndAddExcludesToDepReference(depRefItem, 123);
          } catch (error) {
            errorThrown = true;
            error.should.be.an.instanceOf(TypeError);
          } finally {
            errorThrown.should.be.true;
          }
        });
      });
    });
    describe('#_getDependencyListFromTree', function () {
      var depTree;
      var dep1;
      var dep2;
      var dep3;
      var dep4;
      var dep5;
      var dep6;
      beforeEach(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        // we need to provide a valid dependencyTree which has already excludes and duplicates removed
        depTree = new DependencyTree();
        dep1 = new DependencyTree.Node();
        dep1.data = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null});
        dep2 = new DependencyTree.Node();
        dep2.data = new DepReference({webpackageId: 'package2@1.0.0', artifactId: 'util2', referrer: null});
        dep3 = new DependencyTree.Node();
        dep3.data = new DepReference({webpackageId: 'package3@1.0.0', artifactId: 'util3', referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}});
        dep4 = new DependencyTree.Node();
        dep4.data = new DepReference({webpackageId: 'package4@1.0.0', artifactId: 'util4', referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}});
        dep5 = new DependencyTree.Node();
        dep5.data = new DepReference({webpackageId: 'package5@1.0.0', artifactId: 'util5', referrer: {webpackageId: 'package2@1.0.0', artifactId: 'util2'}});
        dep6 = new DependencyTree.Node();
        dep6.data = new DepReference({webpackageId: 'package6@1.0.0', artifactId: 'util6', referrer: {webpackageId: 'package5@1.0.0', artifactId: 'util5'}});
        // build dependency tree structure
        depTree.insertNode(dep1);
        depTree.insertNode(dep2);
        depTree.insertNode(dep3, dep1);
        depTree.insertNode(dep4, dep1);
        depTree.insertNode(dep5, dep2);
        depTree.insertNode(dep6, dep5);
        dep2.usesExisting = [dep3];
        dep3.usedBy = [dep2];
        dep3.usesExisting = [dep5];
        dep5.usedBy = [dep3];
      });
      it('should return an array of DepReference items', function () {
        var list = artifactsDepsResolver._getDependencyListFromTree(depTree);
        list.should.be.an.instanceof(Array);
        list.forEach(function (item) { item.should.be.an.instanceOf(DepReference); });
      });
      it('should order the items in the returned array so that all dependencies of an item have a lower index the item itself', function () {
        var list = artifactsDepsResolver._getDependencyListFromTree(depTree);
        list[0].webpackageId.should.equal('package6@1.0.0');
        list[0].artifactId.should.equal('util6');
        list[1].webpackageId.should.equal('package5@1.0.0');
        list[1].artifactId.should.equal('util5');
        list[2].webpackageId.should.equal('package3@1.0.0');
        list[2].artifactId.should.equal('util3');
        list[3].webpackageId.should.equal('package4@1.0.0');
        list[3].artifactId.should.equal('util4');
        list[4].webpackageId.should.equal('package1@1.0.0');
        list[4].artifactId.should.equal('util1');
        list[5].webpackageId.should.equal('package2@1.0.0');
        list[5].artifactId.should.equal('util2');
      });
    });
    describe('#_calculateResourceList()', function () {
      var internalDepList = [];
      var item1;
      var item2;
      var item3;
      before(function () {
        // add an dependencyExclude to rootDependencies
        artifactsDepsResolver = new ArtifactsDepsResolver();
        artifactsDepsResolver._baseUrl = 'https://cubbles.world/sandbox//';
      });
      beforeEach(function () {
        var testReferrer = {
          webpackageId: 'testWebpackage',
          artifactId: 'testArtifactId'
        };
        var items = artifactsDepsResolver._createDepReferenceListFromArtifactDependencies([
          {webpackageId: 'package1@1.0.0', artifactId: 'generic1'},
          {webpackageId: 'package2@1.0.0', artifactId: 'generic2'},
          {webpackageId: 'package3@1.0.0', artifactId: 'util#main'}
        ], testReferrer);

        item1 = items[ 0 ];
        item2 = items[ 1 ];
        item3 = items[ 2 ];
        item1.resources = [
          'test1_1.js',
          {
            prod: 'test1_2.min.css',
            dev: 'test1_2.css'
          },
          'test1_3.html'
        ];
        item2.resources = [
          {
            prod: 'test2_1.min.js',
            dev: 'test2_1.js'
          },
          'test2_2.js',
          'test2_3.html'
        ];
        item3.resources = [
          'test3-1.js'
        ];
        internalDepList.push(item1);
        internalDepList.push(item2);
        internalDepList.push(item3);
      });
      it('should return a list of all resources in correct order for given list of DepReference items',
        function () {
          var resourceList = artifactsDepsResolver._calculateResourceList(internalDepList);
          console.log(JSON.stringify(resourceList));
          resourceList.should.have.length(7);
          resourceList[ 0 ].should.have.property('path',
            artifactsDepsResolver._baseUrl + item1.webpackageId + '/' + item1.artifactId + '/' + item1.resources[ 0 ]);
          resourceList[ 1 ].should.have.property('path',
            artifactsDepsResolver._baseUrl + item1.webpackageId + '/' + item1.artifactId + '/' +
            item1.resources[ 1 ].prod);
          resourceList[ 2 ].should.have.property('path',
            artifactsDepsResolver._baseUrl + item1.webpackageId + '/' + item1.artifactId + '/' + item1.resources[ 2 ]);
          resourceList[ 3 ].should.have.property('path',
            artifactsDepsResolver._baseUrl + item2.webpackageId + '/' + item2.artifactId + '/' +
            item2.resources[ 0 ].prod);
          resourceList[ 4 ].should.have.property('path',
            artifactsDepsResolver._baseUrl + item2.webpackageId + '/' + item2.artifactId + '/' + item2.resources[ 1 ]);
          resourceList[ 5 ].should.have.property('path',
            artifactsDepsResolver._baseUrl + item2.webpackageId + '/' + item2.artifactId + '/' + item2.resources[ 2 ]);
        });
      it('should ignore endpointId appendix on artifacts that where converted by the manifestConverter', function () {
        var resourceList = artifactsDepsResolver._calculateResourceList(internalDepList);
        resourceList[ 6 ].should.have.property('path',
          artifactsDepsResolver._baseUrl + item3.webpackageId + '/util/' + item3.resources[ 0 ]);
      });
      afterEach(function () {
        internalDepList = [];
      });
      after(function () {
        artifactsDepsResolver._depJson = null;
      });
    });
    describe('#_createResourceFromItem()', function () {
      var item = {
        prod: 'test.min.js',
        dev: 'test.js'
      };
      var id = 'package1-1.0.0/my-artifact';
      var stringItem = 'test.css';
      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        artifactsDepsResolver._baseUrl = '';
      });
      it('should throw TypeError', function () {
        expect(artifactsDepsResolver._createResourceFromItem).to.throw(TypeError);
      });
      it('should create a new resource containing file and type for item given as object', function () {
        var resource = artifactsDepsResolver._createResourceFromItem(id, item, 'prod');
        expect(resource).to.have.property('path');
        expect(resource).to.have.property('type');
        expect(resource.path).to.equal(id + '/' + item.prod);
        expect(resource.type).to.equal('javascript');
      });
      it('should create a new resource containing file and type for item given as string', function () {
        var resource = artifactsDepsResolver._createResourceFromItem(id, stringItem, 'prod');
        expect(resource).to.have.property('path');
        expect(resource).to.have.property('type');
        expect(resource.path).to.equal(id + '/' + stringItem);
        expect(resource.type).to.equal('stylesheet');
      });
      it('should use "prod" file path if parameter "runtimeMode" has value "prod"', function () {
        var resource = artifactsDepsResolver._createResourceFromItem(id, item, 'prod');
        expect(resource.path).to.equal(id + '/' + item.prod);
      });
      it('should use "dev" file path if parameter "runtimeMode" has value "dev"', function () {
        var resource = artifactsDepsResolver._createResourceFromItem(id, item, 'dev');
        expect(resource.path).to.equal(id + '/' + item.dev);
      });
      it('should add the baseUrl as prefix for all files if some url is given', function () {
        artifactsDepsResolver._baseUrl = 'https://cubbles.world/sandbox//';
        var resource = artifactsDepsResolver._createResourceFromItem(id, item, 'prod');
        resource.should.have.property('path', artifactsDepsResolver._baseUrl + id + '/' + item.prod);
        resource.should.have.property('type', 'javascript');
        artifactsDepsResolver._baseUrl = '';
      });
    });
    describe('#_determineResourceType()', function () {
      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
      });
      it('should associate fileEnding ".js" with type "javascript"', function () {
        var fileName = 'test.min.js';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.fileType.name.should.eql('javascript');
      });
      it('should associate fileEnding ".css" with type "stylesheet"', function () {
        var fileName = 'test.min.css';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.fileType.name.should.eql('stylesheet');
      });
      it('should associate fileEnding ".html" and ".htm" with type "htmlImport"', function () {
        var fileName = 'import.html';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.fileType.name.should.eql('htmlImport');
        fileName = 'import.htm';
        erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.fileType.name.should.eql('htmlImport');
      });
      it('should associate type parameter "js" with type "javascript"', function () {
        var fileName = 'blob:http://xxxxxx?type=js';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.fileType.name.should.eql('javascript');
        erg.fileName.should.equal('blob:http://xxxxxx');
      });
      it('should associate type parameter "html" with type "htmlImport"', function () {
        var fileName = 'blob:http://xxxxxx?type=html';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.fileType.name.should.eql('htmlImport');
        erg.fileName.should.equal('blob:http://xxxxxx');
      });
      it('should associate type parameter "css" with type "stylesheet"', function () {
        var fileName = 'blob:http://xxxxxx?type=css';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.fileType.name.should.eql('stylesheet');
        erg.fileName.should.equal('blob:http://xxxxxx');
      });
      it('should associate type parameter "js" with type "javascript"', function () {
        var fileName = 'blob:http://xxxxxx?type=xxx';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.should.have.property('fileType', undefined);
        erg.fileName.should.equal('blob:http://xxxxxx');
      });
      it('should associate type parameter "js" with type "javascript"', function () {
        var fileName = 'blob:http://xxxxxx';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.should.have.property('fileType', undefined);
        erg.fileName.should.equal('blob:http://xxxxxx');
      });
      it('should associate type parameter "js" with type "javascript"', function () {
        var fileName = 'blob:http://xxxxxx?yyy';
        var erg = artifactsDepsResolver._determineResourceType(fileName);
        erg.should.have.property('fileType', undefined);
        erg.fileName.should.equal('blob:http://xxxxxx?yyy');
      });
    });
    describe('#resolveDependencies', function () {
      var baseUrl;
      var _buildRawDepTreeStub;
      var removeDuplicatesStub;
      var applyExcludesStub;
      var removeExcludesStub;
      var _getDependencyListFromTreeStub;
      var _checkDepTreeForExcludesStub;
      var _calculateResourceListStub;
      var rawDepTree;
      var resourcesList;
      var consoleSpy;
      beforeEach(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();

        /**
         * Build the following tree:
         *
         *               package1@1.0.0/util1
         *                    /       \
         *                   /         \
         *    package3@1.0.0/util3    package4@1.0.0/util4
         *            |                         |
         *            |                         |
         *    package5@1.0.0/util5    package3@1.0.0/util3
         */
        rawDepTree = new DependencyTree();
        var root = new DependencyTree.Node();
        root.data = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null});
        rawDepTree.insertNode(root);
        var childA = new DependencyTree.Node();
        childA.data = new DepReference({
          webpackageId: 'package3@1.0.0',
          artifactId: 'util3',
          referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
        });
        rawDepTree.insertNode(childA, root);
        var childB = new DependencyTree.Node();
        childB.data = new DepReference({
          webpackageId: 'package4@1.0.0',
          artifactId: 'util4',
          referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
        });
        rawDepTree.insertNode(childB, root);
        var childA1 = new DependencyTree.Node();
        childA1.data = new DepReference({
          webpackageId: 'package5@1.0.0',
          artifactId: 'util5',
          referrer: {webpackageId: 'package4@1.0.0', artifactId: 'util4'}
        });
        rawDepTree.insertNode(childA1, childA);
        var childADuplicated = new DependencyTree.Node();
        childADuplicated.data = new DepReference({
          webpackageId: 'package3@1.0.0',
          artifactId: 'util3',
          referrer: {webpackageId: 'package4@1.0.0', artifactId: 'util4'}
        });
        rawDepTree.insertNode(childADuplicated, childB);
        resourcesList = [
          {
            path: 'https://cubbles.world/sandbox//package1@1.0.0/util1/util1.js',
            type: 'javascript',
            referrer: null
          },
          {
            path: 'https://cubbles.world/sandbox//package3@1.0.0/util3/util3.js',
            type: 'javascript',
            referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
          },
          {
            path: 'https://cubbles.world/sandbox//package4@1.0.0/util4/util4.js',
            type: 'javascript',
            referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
          },
          {
            path: 'https://cubbles.world/sandbox//package5@1.0.0/util5/util5.js',
            type: 'javascript',
            referrer: {webpackageId: 'package4@1.0.0', artifactId: 'util4'}
          }
        ];

        // Stubs
        _buildRawDepTreeStub = sinon.stub(artifactsDepsResolver, 'buildRawDependencyTree').callsFake(function (rootDeps) {
          return new Promise(function (resolve, reject) {
            if (rootDeps[0].webpackageId === 'error') {
              reject(new Error());
            }
            setTimeout(function () {
              artifactsDepsResolver.rawDepTree = rawDepTree.clone();
              resolve(rawDepTree);
            }, 200);
          });
        });
        _checkDepTreeForExcludesStub = sinon.stub(artifactsDepsResolver, '_checkDepTreeForExcludes').callsFake(function () {
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              resolve(rawDepTree);
            }, 200);
          });
        });
        _getDependencyListFromTreeStub = sinon.stub(artifactsDepsResolver, '_getDependencyListFromTree').callsFake(function () {
          return [root.data, childA.data, childB.data, childA1.data];
        });
        _calculateResourceListStub = sinon.stub(artifactsDepsResolver, '_calculateResourceList').callsFake(function () {
          return resourcesList;
        });
        removeDuplicatesStub = sinon.stub(Object.getPrototypeOf(rawDepTree), 'removeDuplicates').callsFake(function () {
          return new Promise(function (resolve, reject) {
            rawDepTree.removeNode(childADuplicated);
            childB.usesExisting = [childA];
            childA.usedBy = [childB];
          });
        });
        applyExcludesStub = sinon.stub(Object.getPrototypeOf(rawDepTree), 'applyExcludes').callsFake(function () {});
        removeExcludesStub = sinon.stub(Object.getPrototypeOf(rawDepTree), 'removeExcludes').callsFake(function () {});

        consoleSpy = sinon.spy(console, 'error');
      });
      afterEach(function () {
        _buildRawDepTreeStub.restore();
        _getDependencyListFromTreeStub.restore();
        _checkDepTreeForExcludesStub.restore();
        _calculateResourceListStub.restore();
        removeDuplicatesStub.restore();
        applyExcludesStub.restore();
        removeExcludesStub.restore();
        consoleSpy.restore();
      });
      it('should return a promise', function () {
        expect(artifactsDepsResolver.resolveDependencies(rootDepList, baseUrl)).to.be.an.instanceOf(Promise);
      });
      it('should have \'rawDepTree\', \'resolvedDepTree\' and \'resourceList\' properties', function () {
        this.timeout(1500);
        return artifactsDepsResolver.resolveDependencies(rootDepList, baseUrl).then(function (result) {
          artifactsDepsResolver.rawDepTree.should.be.an.instanceOf(DependencyTree);
          artifactsDepsResolver.resolvedDepTree.should.be.an.instanceOf(DependencyTree);
          /**
           * Raw dep tree:
           *
           *               package1@1.0.0/util1
           *                    /       \
           *                   /         \
           *    package3@1.0.0/util3    package4@1.0.0/util4
           *            |                         |
           *            |                         |
           *    package5@1.0.0/util5    package3@1.0.0/util3
           */
          expect(artifactsDepsResolver.rawDepTree._rootNodes[0].children[1].children[0].data.getId()).to.equal('package3@1.0.0/util3');
          /**
           * Resolved dep tree:
           *
           *               package1@1.0.0/util1
           *                    /       \
           *                   /         \
           *    package3@1.0.0/util3    package4@1.0.0/util4
           *            |
           *            |
           *    package5@1.0.0/util5
           */
          expect(artifactsDepsResolver.resolvedDepTree._rootNodes[0].children[1].children).to.have.lengthOf(0);
          expect(artifactsDepsResolver.resolvedDepTree._rootNodes[0].children[0].usedBy[0].data.getId()).to.equal('package4@1.0.0/util4');
          expect(artifactsDepsResolver.resolvedDepTree._rootNodes[0].children[1].usesExisting[0].data.getId()).to.equal('package3@1.0.0/util3');

          // Resources list
          expect(artifactsDepsResolver.resourceList).to.be.deep.equal(resourcesList);
        });
      });
      describe('Error Handling', function () {
        it('should reject returned promise if there is an error resolving single depenencies', function () {
          return artifactsDepsResolver.resolveDependencies([{webpackageId: 'error', artifactId: 'util'}], baseUrl).then(function (result) {
            throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
          }, function (error) {
            expect(consoleSpy).to.be.calledWith('Error while building and processing DependencyTree: ', error);
          });
        });
      });
    });
    describe('runtimeMode behavior', function () {
      var consoleSpy;
      beforeEach(function () {
        consoleSpy = sinon.spy(console, 'error');
      });
      afterEach(function () {
        consoleSpy.restore();
      });
      it('should use default value \'prod\' runtime mode since no value is provided', function () {
        var artifactsDepsResolver = new ArtifactsDepsResolver();
        expect(artifactsDepsResolver._runtimeMode).to.be.equal('prod');
      });
      it('should use default value \'prod\' runtime mode since an invalid value was provided', function () {
        var artifactsDepsResolver = new ArtifactsDepsResolver('development');
        expect(consoleSpy).to.be.calledOnce;
        expect(artifactsDepsResolver._runtimeMode).to.be.equal('prod');
      });
      it('should use provided runtime mode', function () {
        var artifactsDepsResolver = new ArtifactsDepsResolver('dev');
        expect(artifactsDepsResolver._runtimeMode).to.be.equal('dev');
      });
    })
  });
})();
