/* globals describe, beforeEach, it, expect, before, __dirname */
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
    describe('#_buildRawDependencyTree', function () {
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
        expect(artifactsDepsResolver._buildRawDependencyTree(rootDepList, baseUrl)).to.be.an.instanceOf(Promise);
      });
      it('should resolve the returned promise with an instance of DependencyTree', function () {
        this.timeout(15000);
        return artifactsDepsResolver._buildRawDependencyTree(rootDepList, baseUrl).then(function (result) {
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
        return artifactsDepsResolver._buildRawDependencyTree(rootDepList, baseUrl).then(function (tree) {
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
            artifactsDepsResolver._buildRawDependencyTree({});
          } catch (error) {
            expect(error).to.be.an.instanceOf(TypeError);
          }
        });
        it('should reject returned promise if there is an error resolving single depenencies', function () {
          rootDepList.push({webpackageId: 'error', artifactId: 'util'});
          return artifactsDepsResolver._buildRawDependencyTree(rootDepList, baseUrl).then(function (result) {
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
          expect(axiosStub.calledWith({url: 'https://www.example.test'})).to.be.true;
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
      var convertManifestStub;
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
    describe('#_extractArtifact', function () {
      var depRefItem;
      before(function () {
        artifactsDepsResolver = new ArtifactsDepsResolver();
        depRefItem = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null})
      });
      it('should return require artifact', function () {
        var artifact = artifactsDepsResolver._extractArtifact(depRefItem, JSON.parse(pkg1));
        expect(artifact).to.deep.equal(JSON.parse(pkg1).artifacts.utilities[0]);
      });
      it('should return null since artifact is not in manifest', function () {
        var artifact = artifactsDepsResolver._extractArtifact(depRefItem, JSON.parse(pkg2));
        expect(artifact).to.be.undefined;
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
  });
})();