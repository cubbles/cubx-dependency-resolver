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

    describe('#_buildRawDependencyTree', function () {
      var rootDepList;
      var baseUrl;
      var stub;
      before(function () {
        resourcesPath = path.join(__dirname, '../resources');
        rootDepList = JSON.parse(fs.readFileSync(path.join(resourcesPath, 'rootDependencies.json'), 'utf8'));
        baseUrl = 'https://cubbles.world/sandbox/';
        artifactsDepsResolver = new ArtifactsDepsResolver();
        pkg1 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage1.json'), 'utf8');
        pkg2 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage2.json'), 'utf8');
        pkg3 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage3.json'), 'utf8');
        pkg4 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage4.json'), 'utf8');
        pkg5 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage5.json'), 'utf8');
        pkg6 = fs.readFileSync(path.join(resourcesPath, 'dependencyPackage6.json'), 'utf8');
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
  });
})();