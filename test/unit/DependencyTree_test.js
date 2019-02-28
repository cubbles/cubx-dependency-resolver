/* globals describe, beforeEach, expect, it, __dirname, sinon */
/* eslint no-unused-expressions: "off" */
(function () {
  'use strict';
  var DependencyTree = require('../../lib/DependencyTree');
  var DepReference = require('../../lib/DepReference');
  describe('DependencyTree', function () {
    var depTree;
    var rootNode1;
    var rootNode2;
    var childA;
    var childB;
    var childC;
    beforeEach(function () {
      /**
       * init tree and put some nodes in it. Following tree will be created:
       *
       *           rootNode1          rootNode2
       *              |                 /   \
       *              |                /     \
       *            childC         childA   childB
       */
      depTree = new DependencyTree();
      rootNode1 = new DependencyTree.Node();
      rootNode1.data = {prop1: 'test', prop2: 1234};
      childC = new DependencyTree.Node();
      childC.parent = rootNode1;
      rootNode1.children = [childC];
      rootNode2 = new DependencyTree.Node();
      rootNode2.data = {prop1: 'test2', prop2: 4321};
      childA = new DependencyTree.Node();
      childA.parent = rootNode2;
      childB = new DependencyTree.Node();
      childB.parent = rootNode2;
      rootNode2.children = [childA, childB];
      depTree._rootNodes = [rootNode1, rootNode2];
    });
    describe('#insertNode()', function () {
      it('should return the inserted DependencyTree.Node instance', function () {
        var node = new DependencyTree.Node();
        node.data = {testData: 'testData'};
        expect(depTree.insertNode(node)).to.equal(node);
      });
      it('should append given node to rootNodes array if neither parent nor before parameter is given.', function () {
        var node = new DependencyTree.Node();
        node.data = {testData: 'testData'};
        depTree.insertNode(node);
        depTree._rootNodes.should.have.lengthOf(3);
        depTree._rootNodes[2].should.be.equal(node);
      });
      it('should insert given node to parents children array if parent and before parameter are given.', function () {
        var node = new DependencyTree.Node();
        node.data = {testData: 'testData'};
        depTree.insertNode(node, rootNode2, childB);
        rootNode2.children.should.have.lengthOf(3);
        rootNode2.children[1].should.equal(node);
        node.parent.should.be.equal(rootNode2);
      });
      it('should insert given node to rootNodes array as left neighbour of given before node if no parent is given.', function () {
        var node = new DependencyTree.Node();
        node.data = {testData: 'testData'};
        depTree.insertNode(node, null, rootNode2);
        expect(node.parent).to.be.null;
        depTree._rootNodes.should.have.lengthOf(3);
        depTree._rootNodes[0].should.be.equal(rootNode1);
        depTree._rootNodes[1].should.be.equal(node);
        depTree._rootNodes[2].should.be.equal(rootNode2);
      });
    });
    describe('#removeNode()', function () {
      it('should remove given node and all of it\'s descendants from tree', function () {
        depTree.removeNode(rootNode2);
        depTree._rootNodes.should.have.length(1);
        depTree._rootNodes[0].should.equal(rootNode1);
      });
      it('should return null if node to be removed could not be found in tree', function () {
        var node = depTree.removeNode(new DependencyTree.Node());
        expect(node).to.be.null;
      });
      it('should return the removed node', function () {
        var node = depTree.removeNode(childA);
        expect(node).to.eql(childA);
      });
      it('should remove given node from usesExisting array of all nodes inside given nodes usedBy array', function () {
        childA.usesExisting = [childC];
        childC.usedBy = [childA];
        depTree.removeNode(childC);
        childA.usesExisting.should.have.lengthOf(0);
      });
      it('should log an error if given parameter is not a DependencyTree.Node instance', function () {
        var spy = sinon.spy(console, 'error');
        depTree.removeNode({});
        expect(spy.calledOnce);
        spy.restore();
      });
    });
    describe('#traverseDF()', function () {
      it('should traverse the tree in depth first pre-order and call the given callback with each visited node', function () {
        var callbackStub = sinon.stub();
        callbackStub.returns(true);
        depTree.traverseDF(callbackStub);
        expect(callbackStub.getCall(0).calledWith(rootNode1)).to.be.true;
        expect(callbackStub.getCall(1).calledWith(childC)).to.be.true;
        expect(callbackStub.getCall(2).calledWith(rootNode2)).to.be.true;
        expect(callbackStub.getCall(3).calledWith(childA)).to.be.true;
        expect(callbackStub.getCall(4).calledWith(childB)).to.be.true;
      });
      it('should break traversal if callback returns false', function () {
        var callbackStub = sinon.stub();
        callbackStub.onThirdCall().returns(false);
        callbackStub.returns(true);
        depTree.traverseDF(callbackStub);
        expect(callbackStub.getCall(0).calledWith(rootNode1)).to.be.true;
        expect(callbackStub.getCall(1).calledWith(childC)).to.be.true;
        expect(callbackStub.getCall(2).calledWith(rootNode2)).to.be.true;
        expect(callbackStub.callCount).to.equal(3);
      });
      it('should log an error if parameter is not of type function', function () {
        var consoleStub = sinon.stub(console, 'error');
        depTree.traverseDF('foo');
        expect(consoleStub.called).to.be.true;
        consoleStub.restore();
      });
    });
    describe('#traverseBF()', function () {
      it('should traverse the tree in breadth first order and call the given callback with each visited node', function () {
        var callbackStub = sinon.stub();
        callbackStub.returns(true);
        depTree.traverseBF(callbackStub);
        expect(callbackStub.getCall(0).calledWith(rootNode1)).to.be.true;
        expect(callbackStub.getCall(1).calledWith(rootNode2)).to.be.true;
        expect(callbackStub.getCall(2).calledWith(childC)).to.be.true;
        expect(callbackStub.getCall(3).calledWith(childA)).to.be.true;
        expect(callbackStub.getCall(4).calledWith(childB)).to.be.true;
        expect(callbackStub.callCount).to.equal(5);
      });
      it('should break traversal if callback returns false', function () {
        var callbackStub = sinon.stub();
        callbackStub.onThirdCall().returns(false);
        callbackStub.returns(true);
        depTree.traverseBF(callbackStub);
        expect(callbackStub.getCall(0).calledWith(rootNode1)).to.be.true;
        expect(callbackStub.getCall(1).calledWith(rootNode2)).to.be.true;
        expect(callbackStub.getCall(2).calledWith(childC)).to.be.true;
        expect(callbackStub.callCount).to.equal(3);
      });
      it('should log an error if parameter is not of type function', function () {
        var consoleStub = sinon.stub(console, 'error');
        depTree.traverseBF('foo');
        expect(consoleStub.called).to.be.true;
        consoleStub.restore();
      });
    });
    describe('#traverseSubtreeBF()', function () {
      it('should traverse subtree starting from given node in breadth first order and call callback for each visited node', function () {
        var callbackStub = sinon.stub();
        callbackStub.returns(true);
        depTree.traverseSubtreeBF(rootNode2, callbackStub);
        expect(callbackStub.getCall(0).calledWith(rootNode2)).to.be.true;
        expect(callbackStub.getCall(1).calledWith(childA)).to.be.true;
        expect(callbackStub.getCall(2).calledWith(childB)).to.be.true;
        expect(callbackStub.callCount).to.equal(3);
      });
      it('should log an error if first parameter is not of type DependencyTree.Node', function () {
        var consoleStub = sinon.stub(console, 'error');
        depTree.traverseSubtreeBF('foo', function () {});
        expect(consoleStub.called).to.be.true;
        consoleStub.restore();
      });
      it('should log an error if second paramter is not of type function', function () {
        var consoleStub = sinon.stub(console, 'error');
        depTree.traverseSubtreeBF(rootNode2, 'foo');
        expect(consoleStub.called).to.be.true;
        consoleStub.restore();
      });
    });
    describe('#contains()', function () {
      it('should return true if given node is member of the DependencyTree', function () {
        expect(depTree.contains(childA)).to.be.true;
      });
      it('should return false if given node is not member of the DependencyTree', function () {
        var node = new DependencyTree.Node();
        expect(depTree.contains(node)).to.be.false;
      });
    });
    describe('#toJSON()', function () {
      it('should return an object describing the dependency tree as JSON object', function () {
        rootNode1.data = new DepReference({webpackageId: 'com.example.package1@1.0', artifactId: 'comp-1', referrer: null});
        childC.data = new DepReference({webpackageId: 'com.example.packageC@1.0', artifactId: 'comp-c', referrer: null});

        rootNode2.data = new DepReference({webpackageId: 'com.example.package2@1.0', artifactId: 'comp-2', referrer: null});
        childA.data = new DepReference({webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a', referrer: null});
        childB.data = new DepReference({webpackageId: 'com.example.packageB@1.0', artifactId: 'comp-b', referrer: null});

        expect(depTree.toJSON()).to.deep.equal({
          rootNodes: [
            {
              webpackageId: 'com.example.package1@1.0',
              artifactId: 'comp-1',
              children: [
                {
                  webpackageId: 'com.example.packageC@1.0',
                  artifactId: 'comp-c',
                  children: [],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                }
              ],
              usesExisting: [],
              usedBy: [],
              excluded: false
            },
            {
              webpackageId: 'com.example.package2@1.0',
              artifactId: 'comp-2',
              children: [
                {
                  webpackageId: 'com.example.packageA@1.0',
                  artifactId: 'comp-a',
                  children: [],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                },
                {
                  webpackageId: 'com.example.packageB@1.0',
                  artifactId: 'comp-b',
                  children: [],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                }
              ],
              usesExisting: [],
              usedBy: [],
              excluded: false
            }
          ]
        });
      });
      it('should include the \'resources\' property on nodes of the JSON object', function () {
        rootNode1.data = new DepReference({webpackageId: 'com.example.package1@1.0', artifactId: 'comp-1', referrer: null});
        childC.data = new DepReference({webpackageId: 'com.example.packageC@1.0', artifactId: 'comp-c', referrer: null});
        childC.data.resources = ['index.html'];

        rootNode2.data = new DepReference({webpackageId: 'com.example.package2@1.0', artifactId: 'comp-2', referrer: null});
        childA.data = new DepReference({webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a', referrer: null});
        childA.data.resources = ['js/main.js', 'css/style.css'];
        childB.data = new DepReference({webpackageId: 'com.example.packageB@1.0', artifactId: 'comp-b', referrer: null});

        expect(depTree.toJSON(true)).to.deep.equal({
          rootNodes: [
            {
              webpackageId: 'com.example.package1@1.0',
              artifactId: 'comp-1',
              resources: [],
              children: [
                {
                  webpackageId: 'com.example.packageC@1.0',
                  artifactId: 'comp-c',
                  resources: ['index.html'],
                  children: [],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                }
              ],
              usesExisting: [],
              usedBy: [],
              excluded: false
            },
            {
              webpackageId: 'com.example.package2@1.0',
              artifactId: 'comp-2',
              resources: [],
              children: [
                {
                  webpackageId: 'com.example.packageA@1.0',
                  artifactId: 'comp-a',
                  resources: ['js/main.js', 'css/style.css'],
                  children: [],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                },
                {
                  webpackageId: 'com.example.packageB@1.0',
                  artifactId: 'comp-b',
                  resources: [],
                  children: [],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                }
              ],
              usesExisting: [],
              usedBy: [],
              excluded: false
            }
          ]
        });
      });
      it('should assign correct values to \'usesExisting\' and \'usedBy\' properties', function () {
        rootNode1.data = new DepReference({webpackageId: 'com.example.package1@1.0', artifactId: 'comp-1', referrer: null});
        childC.data = new DepReference({webpackageId: 'com.example.packageC@1.0', artifactId: 'comp-c', referrer: null});

        rootNode2.data = new DepReference({webpackageId: 'com.example.package2@1.0', artifactId: 'comp-2', referrer: null});
        childA.data = new DepReference({webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a', referrer: null});
        childB.data = new DepReference({webpackageId: 'com.example.packageB@1.0', artifactId: 'comp-b', referrer: null});

        var childD = new DependencyTree.Node();
        childD.data = new DepReference({webpackageId: 'com.example.packageD@1.0', artifactId: 'comp-d', referrer: {webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a'}});

        var childD2 = new DependencyTree.Node();
        childD2.data = new DepReference({webpackageId: 'com.example.packageD@1.0', artifactId: 'comp-d', referrer: {webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a'}});

        depTree.insertNode(childD, childC);
        depTree.insertNode(childD2, childB);
        depTree.removeDuplicates();

        expect(depTree.toJSON()).to.deep.equal({
          rootNodes: [
            {
              webpackageId: 'com.example.package1@1.0',
              artifactId: 'comp-1',
              children: [
                {
                  webpackageId: 'com.example.packageC@1.0',
                  artifactId: 'comp-c',
                  children: [
                    {
                      webpackageId: 'com.example.packageD@1.0',
                      artifactId: 'comp-d',
                      children: [],
                      usesExisting: [],
                      usedBy: [
                        {
                          webpackageId: 'com.example.packageB@1.0',
                          artifactId: 'comp-b'
                        }
                      ],
                      excluded: false
                    }
                  ],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                }
              ],
              usesExisting: [],
              usedBy: [],
              excluded: false
            },
            {
              webpackageId: 'com.example.package2@1.0',
              artifactId: 'comp-2',
              children: [
                {
                  webpackageId: 'com.example.packageA@1.0',
                  artifactId: 'comp-a',
                  children: [],
                  usesExisting: [],
                  usedBy: [],
                  excluded: false
                },
                {
                  webpackageId: 'com.example.packageB@1.0',
                  artifactId: 'comp-b',
                  children: [],
                  usesExisting: [
                    {
                      webpackageId: 'com.example.packageD@1.0',
                      artifactId: 'comp-d'
                    }
                  ],
                  usedBy: [],
                  excluded: false
                }
              ],
              usesExisting: [],
              usedBy: [],
              excluded: false
            }
          ]
        });
      });
    });
    describe('#clone()', function () {
      var clonedTree;
      beforeEach(function () {
        rootNode1.data = new DepReference({webpackageId: 'com.example.package1@1.0', artifactId: 'comp-1', referrer: null});
        childC.data = new DepReference({webpackageId: 'com.example.packageC@1.0', artifactId: 'comp-c', referrer: null});

        rootNode2.data = new DepReference({webpackageId: 'com.example.package2@1.0', artifactId: 'comp-2', referrer: null});
        childA.data = new DepReference({webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a', referrer: null});
        childB.data = new DepReference({webpackageId: 'com.example.packageB@1.0', artifactId: 'comp-b', referrer: null});

        var childD = new DependencyTree.Node();
        childD.data = new DepReference({webpackageId: 'com.example.packageD@1.0', artifactId: 'comp-d', referrer: {webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a'}});

        var childD2 = new DependencyTree.Node();
        childD2.data = new DepReference({webpackageId: 'com.example.packageD@1.0', artifactId: 'comp-d', referrer: {webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a'}});

        depTree.insertNode(childD, childC);
        depTree.insertNode(childD2, childB);
        clonedTree = depTree.clone();
        console.log(clonedTree);
      });
      it('cloned tree should be an instance of \'DependencyTree\'', function () {
        expect(clonedTree instanceof DependencyTree).to.be.true;
      });
      it('cloned and original tree should be deep equal', function () {
        expect(clonedTree).to.deep.equal(depTree);
      });
    });
  });
  describe('DependencyTree.Node', function () {
    var depTree;
    var rootNode1;
    var rootNode2;
    var childA;
    var childB;
    var childC;
    var childD;
    var childE;
    var childF;
    var childG;
    var childH;

    beforeEach(function () {
      /**
       * init tree and put some nodes in it. Following tree will be created:
       *
       *           rootNode1          rootNode2
       *              |                 /   \
       *              |                /     \
       *            childC         childA   childB
       *            /   \            |       /   \
       *           /     \           |      /     \
       *      childD   childE    childF   childG   childH
       */
      depTree = new DependencyTree();
      rootNode1 = new DependencyTree.Node();
      rootNode1.data = {prop1: 'test', prop2: 1234};
      childC = new DependencyTree.Node();
      childC.parent = rootNode1;
      rootNode1.children = [childC];
      rootNode2 = new DependencyTree.Node();
      rootNode2.data = {prop1: 'test2', prop2: 4321};
      childA = new DependencyTree.Node();
      childA.parent = rootNode2;
      childB = new DependencyTree.Node();
      childB.parent = rootNode2;
      rootNode2.children = [childA, childB];
      depTree._rootNodes = [rootNode1, rootNode2];
      childD = new DependencyTree.Node();
      childD.parent = childC;
      childE = new DependencyTree.Node();
      childE.parent = childC;
      childC.children = [childD, childE];
      childF = new DependencyTree.Node();
      childF.parent = childA;
      childA.children = [childF];
      childG = new DependencyTree.Node();
      childG.parent = childB;
      childH = new DependencyTree.Node();
      childH.parent = childB;
      childB.children = [childG, childH];
    });
    describe('#equalsArtifcat()', function () {
      it('should return true if given node references same artifact (based on artifactId and webpackageId)', function () {
        childA.data = new DepReference({webpackageId: 'pkgA', artifactId: 'artifactA', referrer: null});
        childB.data = new DepReference({webpackageId: 'pkgA', artifactId: 'artifactA', referrer: null});
        expect(childA.equalsArtifact(childB)).to.be.true;
      });
      it('should return false if given node references a different artifact', function () {
        childA.data = new DepReference({webpackageId: 'pkgA', artifactId: 'artifactA', referrer: null});
        childB.data = new DepReference({webpackageId: 'pkgB', artifactId: 'artifactB', referrer: null});
        expect(childA.equalsArtifact(childB)).to.be.false;
      });
    });
    describe('#getPathAsString()', function () {
      it('should return a string containing the path from root down to node using [webpackageId]/[artifactId] as node names', function () {
        rootNode1.data = new DepReference({webpackageId: 'pkgA', artifactId: 'artifactA', referrer: null});
        childC.data = new DepReference({webpackageId: 'pkgC', artifactId: 'artifactC', referrer: null});
        childD.data = new DepReference({webpackageId: 'pkgD', artifactId: 'artifactD', referrer: null});
        var path = childD.getPathAsString();
        path.should.equal('pkgA/artifactA > pkgC/artifactC > pkgD/artifactD');
      });
    });
    describe('#isDescendantOf()', function () {
      beforeEach(function () {
        childA.usesExisting = [childC];
        childC.usedBy = [childA];
      });
      it('should return true if node is a descendant of given node checking also paths for nodes in usedBy array', function () {
        expect(childD.isDescendantOf(rootNode1)).to.be.true;
        expect(childD.isDescendantOf(rootNode2)).to.be.true;
        expect(childC.isDescendantOf(childA)).to.be.true;
        expect(childC.isDescendantOf(rootNode2)).to.be.true;
        expect(childF.isDescendantOf(rootNode1)).to.be.false;
      });
    });
    describe('#isAncestorOf()', function () {
      beforeEach(function () {
        childF.usesExisting = [childC];
        childC.usedBy = [childF];
      });
      it('should return true if node is an ancestor of given node checking also paths defined by usesExisting array', function () {
        expect(childF.isAncestorOf(childD)).to.be.true;
        expect(rootNode1.isAncestorOf(childD)).to.be.true;
        expect(rootNode1.isAncestorOf(childF)).to.be.false;
        expect(rootNode2.isAncestorOf(childF)).to.be.true;
        expect(rootNode2.isAncestorOf(childE)).to.be.true;
      });
    });
    describe('#toJSON()', function () {
      it('should return an object describing the node as JSON object', function () {
        rootNode2.data = new DepReference({webpackageId: 'com.example.package2@1.0', artifactId: 'comp-2', referrer: null});
        childA.data = new DepReference({webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a', referrer: null});
        childB.data = new DepReference({webpackageId: 'com.example.packageB@1.0', artifactId: 'comp-b', referrer: null});
        childF.data = new DepReference({webpackageId: 'com.example.packageF@1.0', artifactId: 'comp-f', referrer: null});
        childG.data = new DepReference({webpackageId: 'com.example.packageG@1.0', artifactId: 'comp-g', referrer: null});
        childH.data = new DepReference({webpackageId: 'com.example.packageH@1.0', artifactId: 'comp-h', referrer: null});

        expect(rootNode2.toJSON()).to.deep.equal(
          {
            webpackageId: 'com.example.package2@1.0',
            artifactId: 'comp-2',
            children: [
              {
                webpackageId: 'com.example.packageA@1.0',
                artifactId: 'comp-a',
                children: [
                  {
                    webpackageId: 'com.example.packageF@1.0',
                    artifactId: 'comp-f',
                    children: [],
                    usesExisting: [],
                    usedBy: [],
                    excluded: false
                  }
                ],
                usesExisting: [],
                usedBy: [],
                excluded: false
              },
              {
                webpackageId: 'com.example.packageB@1.0',
                artifactId: 'comp-b',
                children: [
                  {
                    webpackageId: 'com.example.packageG@1.0',
                    artifactId: 'comp-g',
                    children: [],
                    usesExisting: [],
                    usedBy: [],
                    excluded: false
                  },
                  {
                    webpackageId: 'com.example.packageH@1.0',
                    artifactId: 'comp-h',
                    children: [],
                    usesExisting: [],
                    usedBy: [],
                    excluded: false
                  }
                ],
                usesExisting: [],
                usedBy: [],
                excluded: false
              }
            ],
            usesExisting: [],
            usedBy: [],
            excluded: false
          }
        );
      });
      it('should include resources property in the JSON object', function () {
        rootNode2.data = new DepReference({webpackageId: 'com.example.package2@1.0', artifactId: 'comp-2', referrer: null});
        childA.data = new DepReference({webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a', referrer: null});
        childA.data.resources = ['js/main.js', 'css/style.css'];
        childB.data = new DepReference({webpackageId: 'com.example.packageB@1.0', artifactId: 'comp-b', referrer: null});
        childB.data.resources = ['index.html'];
        childF.data = new DepReference({webpackageId: 'com.example.packageF@1.0', artifactId: 'comp-f', referrer: null});
        childF.data.resources = ['index.html'];
        childG.data = new DepReference({webpackageId: 'com.example.packageG@1.0', artifactId: 'comp-g', referrer: null});
        childH.data = new DepReference({webpackageId: 'com.example.packageH@1.0', artifactId: 'comp-h', referrer: null});

        expect(rootNode2.toJSON(true)).to.deep.equal(
          {
            webpackageId: 'com.example.package2@1.0',
            artifactId: 'comp-2',
            resources: [],
            children: [
              {
                webpackageId: 'com.example.packageA@1.0',
                artifactId: 'comp-a',
                resources: ['js/main.js', 'css/style.css'],
                children: [
                  {
                    webpackageId: 'com.example.packageF@1.0',
                    artifactId: 'comp-f',
                    resources: ['index.html'],
                    children: [],
                    usesExisting: [],
                    usedBy: [],
                    excluded: false
                  }
                ],
                usesExisting: [],
                usedBy: [],
                excluded: false
              },
              {
                webpackageId: 'com.example.packageB@1.0',
                artifactId: 'comp-b',
                resources: ['index.html'],
                children: [
                  {
                    webpackageId: 'com.example.packageG@1.0',
                    artifactId: 'comp-g',
                    resources: [],
                    children: [],
                    usesExisting: [],
                    usedBy: [],
                    excluded: false
                  },
                  {
                    webpackageId: 'com.example.packageH@1.0',
                    artifactId: 'comp-h',
                    resources: [],
                    children: [],
                    usesExisting: [],
                    usedBy: [],
                    excluded: false
                  }
                ],
                usesExisting: [],
                usedBy: [],
                excluded: false
              }
            ],
            usesExisting: [],
            usedBy: [],
            excluded: false
          }
        );
      });
      it('should assign correct values to \'usesExisting\' and \'usedBy\' properties', function () {
        rootNode2.data = new DepReference({webpackageId: 'com.example.package2@1.0', artifactId: 'comp-2', referrer: null});
        childA.data = new DepReference({webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a', referrer: null});
        childA.usesExisting = [childH];

        childB.data = new DepReference({webpackageId: 'com.example.packageB@1.0', artifactId: 'comp-b', referrer: null});

        childF.data = new DepReference({webpackageId: 'com.example.packageF@1.0', artifactId: 'comp-f', referrer: null});
        childF.usesExisting = [childG];

        childG.data = new DepReference({webpackageId: 'com.example.packageG@1.0', artifactId: 'comp-g', referrer: null});
        childG.usedBy = [childF];

        childH.data = new DepReference({webpackageId: 'com.example.packageH@1.0', artifactId: 'comp-h', referrer: null});
        childH.usedBy = [childA];

        expect(rootNode2.toJSON()).to.deep.equal(
          {
            webpackageId: 'com.example.package2@1.0',
            artifactId: 'comp-2',
            children: [
              {
                webpackageId: 'com.example.packageA@1.0',
                artifactId: 'comp-a',
                children: [
                  {
                    webpackageId: 'com.example.packageF@1.0',
                    artifactId: 'comp-f',
                    children: [],
                    usesExisting: [{webpackageId: 'com.example.packageG@1.0', artifactId: 'comp-g'}],
                    usedBy: [],
                    excluded: false
                  }
                ],
                usesExisting: [{webpackageId: 'com.example.packageH@1.0', artifactId: 'comp-h'}],
                usedBy: [],
                excluded: false
              },
              {
                webpackageId: 'com.example.packageB@1.0',
                artifactId: 'comp-b',
                children: [
                  {
                    webpackageId: 'com.example.packageG@1.0',
                    artifactId: 'comp-g',
                    children: [],
                    usesExisting: [],
                    usedBy: [{webpackageId: 'com.example.packageF@1.0', artifactId: 'comp-f'}],
                    excluded: false
                  },
                  {
                    webpackageId: 'com.example.packageH@1.0',
                    artifactId: 'comp-h',
                    children: [],
                    usesExisting: [],
                    usedBy: [{webpackageId: 'com.example.packageA@1.0', artifactId: 'comp-a'}],
                    excluded: false
                  }
                ],
                usesExisting: [],
                usedBy: [],
                excluded: false
              }
            ],
            usesExisting: [],
            usedBy: [],
            excluded: false
          }
        );
      });
    });
  });
  describe('DependencyTree Modification', function () {
    var depTree;
    var nodeA;
    var nodeB;
    var childA1;
    var childA2;
    var childB1;
    var childB2;
    var childA11;
    var childB11;
    var childB21;
    var childA111;
    var childB111;
    var packages = {};

    beforeEach(function () {
      packages = {
        pkg1: {webpackageId: 'package1@1.0.0', artifactId: 'util1'},
        pkg2: {webpackageId: 'package2@1.0.0', artifactId: 'util2'},
        pkg3: {webpackageId: 'package3@1.0.0', artifactId: 'util3'},
        pkg4: {webpackageId: 'package4@1.0.0', artifactId: 'util4'},
        pkg5: {webpackageId: 'package5@1.0.0', artifactId: 'util5'},
        pkg6: {webpackageId: 'package6@1.0.0', artifactId: 'util6'}
      };
      /**
       * build dependency tree that has the following structure:
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
      depTree = new DependencyTree();
      nodeA = new DependencyTree.Node();
      nodeA.data = new DepReference({webpackageId: packages.pkg1.webpackageId, artifactId: packages.pkg1.artifactId, referrer: null});
      nodeB = new DependencyTree.Node();
      nodeB.data = new DepReference({webpackageId: packages.pkg2.webpackageId, artifactId: packages.pkg2.artifactId, referrer: null});
      childA1 = new DependencyTree.Node();
      childA1.data = new DepReference({webpackageId: packages.pkg3.webpackageId, artifactId: packages.pkg3.artifactId, referrer: packages.pkg1});
      childA2 = new DependencyTree.Node();
      childA2.data = new DepReference({webpackageId: packages.pkg4.webpackageId, artifactId: packages.pkg4.artifactId, referrer: packages.pkg1});
      childB1 = new DependencyTree.Node();
      childB1.data = new DepReference({webpackageId: packages.pkg3.webpackageId, artifactId: packages.pkg3.artifactId, referrer: packages.pkg2});
      childB2 = new DependencyTree.Node();
      childB2.data = new DepReference({webpackageId: packages.pkg5.webpackageId, artifactId: packages.pkg5.artifactId, referrer: packages.pkg2});
      childA11 = new DependencyTree.Node();
      childA11.data = new DepReference({webpackageId: packages.pkg5.webpackageId, artifactId: packages.pkg5.artifactId, referrer: packages.pkg3});
      childB11 = new DependencyTree.Node();
      childB11.data = new DepReference({webpackageId: packages.pkg5.webpackageId, artifactId: packages.pkg5.artifactId, referrer: packages.pkg3});
      childB21 = new DependencyTree.Node();
      childB21.data = new DepReference({webpackageId: packages.pkg6.webpackageId, artifactId: packages.pkg6.artifactId, referrer: packages.pkg5});
      childA111 = new DependencyTree.Node();
      childA111.data = new DepReference({webpackageId: packages.pkg6.webpackageId, artifactId: packages.pkg6.artifactId, referrer: packages.pkg5});
      childB111 = new DependencyTree.Node();
      childB111.data = new DepReference({webpackageId: packages.pkg6.webpackageId, artifactId: packages.pkg6.artifactId, referrer: packages.pkg5});
      depTree.insertNode(nodeA);
      depTree.insertNode(nodeB);
      depTree.insertNode(childA1, nodeA);
      depTree.insertNode(childA2, nodeA);
      depTree.insertNode(childB1, nodeB);
      depTree.insertNode(childB2, nodeB);
      depTree.insertNode(childA11, childA1);
      depTree.insertNode(childB11, childB1);
      depTree.insertNode(childB21, childB2);
      depTree.insertNode(childA111, childA11);
      depTree.insertNode(childB111, childB11);
    });
    describe('#_removeDuplicate()', function () {
      it('should set excluded value of duplicated node to false if duplicate node has excluded value of false', function () {
        // set excluded flag for several nodes
        childA1.excluded = true;
        childA11.excluded = true;
        childA111.excluded = true;
        childB1.excluded = false;

        depTree._removeDuplicate(childA1, childB1);
        childA1.excluded.should.be.false;
      });
      it('should keep excluded value true of duplicated node if duplicate node has excluded value of true as well', function () {
        // set excluded flag for several nodes
        childA1.excluded = true;
        childA11.excluded = true;
        childA111.excluded = true;
        childB1.excluded = true;
        childB11.excluded = true;
        childB111.excluded = true;

        depTree._removeDuplicate(childA1, childB1);
        childA1.excluded.should.be.true;
      });
      it('should keep excluded value false of duplicated node if duplicate node has excluded value of false as well', function () {
        // set excluded flag for several nodes
        childA1.excluded = false;
        childB1.excluded = false;

        depTree._removeDuplicate(childA1, childB1);
        childA1.excluded.should.be.false;
      });
      it('should keep excluded value false of duplicated node if duplicate node has excluded value of true', function () {
        // set excluded flag for several nodes
        childA1.excluded = false;
        childB1.excluded = true;
        childB11.excluded = true;
        childB111.excluded = true;

        depTree._removeDuplicate(childA1, childB1);
        childA1.excluded.should.be.false;
      });
      it('should only mark nodes as excluded if they are excluded in subtree of duplicated node as well as in ' +
        'subtree of duplicate node', function () {
        childA11.excluded = true;
        childA111.excluded = true;
        childB11.excluded = false;
        childB111.excluded = true;

        depTree._removeDuplicate(childA1, childB1);
        childA11.excluded.should.be.false;
        childA111.excluded.should.be.true;
      });
      it('should only mark nodes as excluded if they are excluded in subtree of duplicated node as well as in ' +
        'subtree of duplicate node, even if children are in a different order', function () {
        // Add subtree, to achieve the following subtree, so that other tests are not broken
        /**
         * build dependency tree that has the following structure:
         *
         *                              package1@1.0.0/util1                                         package2@1.0.0/util2
         *                           /            |           \                                            /        \
         *                          /             |            \                                          /          \
         *      package3@1.0.0/util3    package4@1.0.0/util4    package3@1.0.0/util3     package3@1.0.0/util3    package5@1.0.0/util5
         *              |                                                  |                     |                       |
         *              |                                                  |                     |                       |
         *      package5@1.0.0/util5                            package6@1.0.0/util6     package5@1.0.0/util5    package6@1.0.0/util6
         *              |                                                  |                     |
         *              |                                                  |                     |
         *      package6@1.0.0/util6                            package5@1.0.0/util5     package6@1.0.0/util6
         */
        var childA3;
        var childA31;
        var childA311;
        childA3 = new DependencyTree.Node();
        childA3.data = new DepReference({webpackageId: packages.pkg3.webpackageId, artifactId: packages.pkg3.artifactId, referrer: packages.pkg1});
        childA31 = new DependencyTree.Node();
        childA31.data = new DepReference({webpackageId: packages.pkg6.webpackageId, artifactId: packages.pkg6.artifactId, referrer: packages.pkg3});
        childA311 = new DependencyTree.Node();
        childA311.data = new DepReference({webpackageId: packages.pkg5.webpackageId, artifactId: packages.pkg5.artifactId, referrer: packages.pkg6});

        depTree.insertNode(childA3, nodeA);
        depTree.insertNode(childA31, childA3);
        depTree.insertNode(childA311, childA31);

        // Actual test
        childA31.excluded = true;
        childA311.excluded = true;
        childB11.excluded = false;
        childB111.excluded = true;

        depTree._removeDuplicate(childA3, childB1);
        childA31.excluded.should.be.true;
        childA311.excluded.should.be.false;
      });
      it('should append referrer of removed duplicate node to referrer of duplicated nodes', function () {
        depTree._removeDuplicate(childA1, childB1);
        childA1.data.referrer.should.eql([ packages.pkg1, packages.pkg2 ]);
      });
    });
    describe('#applyExcludes()', function () {
      var childB3;
      beforeEach(function () {
        /**
         * apply some excludes to given tree like follows (excludes in []). Add a child node package4 to invalidate exclude [package4]
         *
         *                  package1@1.0.0/util1 [package4]                           package2@1.0.0/util2 [package5]
         *                     /         \                                           /         \          \_______________
         *                    /           \                                         /           \                         \
         *      package3@1.0.0/util3    package4@1.0.0/util4          package3@1.0.0/util3    package5@1.0.0/util5   package4@1.0.0/util4
         *              |   [package6]                                          |   [package6]          |
         *              |                                                       |                       |
         *      package5@1.0.0/util5                                  package5@1.0.0/util5    package6@1.0.0/util6
         *              |                                                       |
         *              |                                                       |
         *      package6@1.0.0/util6                                  package6@1.0.0/util6
         */
        nodeA.data.dependencyExcludes = [{ webpackageId: 'package4@1.0.0', artifactId: 'util4' }];
        childA1.data.dependencyExcludes = [{ webpackageId: 'package6@1.0.0', artifactId: 'util6' }];
        nodeB.data.dependencyExcludes = [{ webpackageId: 'package5@1.0.0', artifactId: 'util5' }];
        childB1.data.dependenyExcludes = [{ webpackageId: 'package6@1.0.0', artifactId: 'util6' }];
        childB3 = new DependencyTree.Node();
        childB3.data = new DepReference({webpackageId: packages.pkg4.webpackageId, artifactId: packages.pkg4.artifactId, referrer: packages.pkg2});
        depTree.insertNode(childB3, nodeB);
      });
      it('should mark all excluded Nodes', function () {
        depTree.applyExcludes();
        nodeA.excluded.should.be.false;
        nodeB.excluded.should.be.false;
        childA1.excluded.should.be.false;
        childA2.excluded.should.be.true;
        childB1.excluded.should.be.false;
        childB2.excluded.should.be.true;
        childB3.excluded.should.be.false;
        childA11.excluded.should.be.false;
        childA111.excluded.should.be.true;
        childB11.excluded.should.be.true;
        childB21.excluded.should.be.true;
        childB111.excluded.should.be.true;
      });
    });
    describe('#applyGlobalExclude()', function () {
      it('should return the DependencyTree itself', function () {
        // depTree.applyGlobalExclude('')
      });
      it('should set exclude value to true for all appearances of given artifact', function () {
        depTree.applyGlobalExclude(packages.pkg3.webpackageId, packages.pkg3.artifactId);
        childA1.excluded.should.be.true;
        childA11.excluded.should.be.true;
        childA111.excluded.should.be.true;
        childB1.excluded.should.be.true;
        childB11.excluded.should.be.true;
        childB111.excluded.should.be.true;

        // for each other node excluded should be set to false
        nodeA.excluded.should.be.false;
        nodeB.excluded.should.be.false;
        childA2.excluded.should.be.false;
        childB2.excluded.should.be.false;
        childB21.excluded.should.be.false;
      });
    });
    describe('#removeDuplicates() without conflicts', function () {
      it('should return the DependencyTree itself', function () {
        expect(depTree.removeDuplicates()).to.be.an.instanceOf(DependencyTree);
      });
      it('should remove all duplicated nodes from DependencyTree. Only the first one that is found using breadth-first traversal is kept.', function () {
        depTree.removeDuplicates();
        /**
         * Check if cleaned dependency tree has the following structure:
         *
         *                  package1@1.0.0/util1                                package2@1.0.0/util2
         *                     /         \                                           /
         *                    /           \                                         /
         *      package3@1.0.0/util3    package4@1.0.0/util4          package5@1.0.0/util5
         *                                                                      |
         *                                                                      |
         *                                                            package6@1.0.0/util6
         */
        depTree._rootNodes.should.be.eql([nodeA, nodeB]);
        depTree._rootNodes[0].children.should.be.eql([childA1, childA2]);
        depTree._rootNodes[0].children[0].children.should.be.eql([]);
        depTree._rootNodes[0].children[1].children.should.be.eql([]);
        depTree._rootNodes[1].children.should.be.eql([childB2]);
        depTree._rootNodes[1].children[0].children.should.be.eql([childB21]);
      });
      it('should return DependencyTree which contains each webpackage exactly once', function () {
        // packageIds in breadth first order
        var packageIds = [
          'package1@1.0.0/util1',
          'package2@1.0.0/util2',
          'package3@1.0.0/util3',
          'package4@1.0.0/util4',
          'package5@1.0.0/util5',
          'package6@1.0.0/util6'
        ];
        depTree.removeDuplicates();
        var count = 0;
        depTree.traverseBF(function (node) {
          expect(packageIds[count]).to.eql(node.data.getId());
          count++;
        });
        count.should.be.eql(6);
      });
      it('should create correct \'usedBy\' and \'usesExisting\' relations', function () {
        depTree.removeDuplicates();
        nodeB.usesExisting.should.be.eql([childA1]);
        childA1.usedBy.should.be.eql([nodeB]);
        childA1.usesExisting.should.be.eql([childB2]);
        childB2.usedBy.should.be.eql([childA1]);
      });
      it('should set excluded value on each remaining node correctly', function () {
        /**
         * apply some excludes to given tree like follows (excludes in []). Add a child node package4 to invalidate exclude [package4]
         *
         *                  package1@1.0.0/util1 [package4]                           package2@1.0.0/util2 [package5]
         *                     /         \                                           /         \          \_______________
         *                    /           \                                         /           \                         \
         *      package3@1.0.0/util3    package4@1.0.0/util4          package3@1.0.0/util3    package5@1.0.0/util5   package4@1.0.0/util4
         *              |   [package6]                                          |   [package6]          |
         *              |                                                       |                       |
         *      package5@1.0.0/util5                                  package5@1.0.0/util5    package6@1.0.0/util6
         *              |                                                       |
         *              |                                                       |
         *      package6@1.0.0/util6                                  package6@1.0.0/util6
         */
        nodeA.data.dependencyExcludes = [{ webpackageId: 'package4@1.0.0', artifactId: 'util4' }];
        childA1.data.dependencyExcludes = [{ webpackageId: 'package6@1.0.0', artifactId: 'util6' }];
        nodeB.data.dependencyExcludes = [{ webpackageId: 'package5@1.0.0', artifactId: 'util5' }];
        childB1.data.dependenyExcludes = [{ webpackageId: 'package6@1.0.0', artifactId: 'util6' }];
        var childB3 = new DependencyTree.Node();
        childB3.data = new DepReference({webpackageId: packages.pkg4.webpackageId, artifactId: packages.pkg4.artifactId, referrer: packages.pkg2});
        depTree.insertNode(childB3, nodeB);

        depTree.applyExcludes();
        depTree.removeDuplicates();

        nodeA.excluded.should.be.false;
        nodeB.excluded.should.be.false;
        childA1.excluded.should.be.false;
        childA2.excluded.should.be.false;
        childB2.excluded.should.be.false;
        childB21.excluded.should.be.true;
      });
    });
    describe('#removeExcludes()', function () {
      beforeEach(function () {
        /**
         * mark some nodes as [excluded] in original dependency tree
         *
         *                  package1@1.0.0/util1                                package2@1.0.0/util2
         *                     /         \                                           /         \
         *                    /           \                                         /           \
         *      package3@1.0.0/util3    package4@1.0.0/util4          package3@1.0.0/util3    [package5@1.0.0/util5]
         *              |                                                       |                       |
         *              |                                                       |                       |
         *      [package5@1.0.0/util5]                                [package5@1.0.0/util5]  [package6@1.0.0/util6]
         *              |                                                       |
         *              |                                                       |
         *      [package6@1.0.0/util6]                                [package6@1.0.0/util6]
         */
        childA11.excluded = true;
        childA111.excluded = true;
        childB11.excluded = true;
        childB111.excluded = true;
        childB2.excluded = true;
        childB21.excluded = true;
        depTree.removeDuplicates();
      });
      it('should remove all nodes which have property excludes set to true', function () {
        /**
         * After removing excluded nodes tree should look like following
         *
         *                  package1@1.0.0/util1                                package2@1.0.0/util2
         *                     /         \
         *                    /           \
         *      package3@1.0.0/util3    package4@1.0.0/util4
         */
        depTree.removeExcludes();
        depTree._rootNodes.should.have.lengthOf(2);
        depTree._rootNodes[0].should.equal(nodeA);
        depTree._rootNodes[0].children.should.have.lengthOf(2);
        depTree._rootNodes[0].children[0].should.equal(childA1);
        depTree._rootNodes[0].children[1].should.equal(childA2);
        childA1.children.should.have.lengthOf(0);
        childA2.children.should.have.lengthOf(0);
        depTree._rootNodes[1].should.equal(nodeB);
        nodeB.children.should.have.lengthOf(0);
      });
      it('should return the DependencyTree itself', function () {
        expect(depTree.removeExcludes()).to.equal(depTree);
      });
    });
    describe('#_determineNodeRelationShip()', function () {
      var nodeA;
      var nodeB;
      var nodeC;
      var nodeD;
      var nodeE;
      var depTree;

      beforeEach(function () {
        depTree = new DependencyTree();
        nodeA = new DependencyTree.Node();
        nodeA.data = new DepReference({webpackageId: 'packageA@1.0', artifactId: 'artifact_A', referrer: null});

        nodeB = new DependencyTree.Node();
        nodeB.data = new DepReference({webpackageId: 'packageA@1.0', artifactId: 'artifact_A', referrer: null});

        nodeC = new DependencyTree.Node();
        nodeC.data = new DepReference({webpackageId: 'packageB@1.0', artifactId: 'artifact_A', referrer: null});

        nodeD = new DependencyTree.Node();
        nodeD.data = new DepReference({webpackageId: 'packageA@2.0', artifactId: 'artifact_A', referrer: null});

        nodeE = new DependencyTree.Node();
        nodeE.data = new DepReference({webpackageId: 'packageC@1.0', artifactId: 'artifact_B', referrer: null});
      });

      it('should identify nodes with relationship "artifact duplicate"', function () {
        var state = depTree._determineNodeRelationship(nodeA, nodeB);
        state.should.be.equal(DependencyTree.NodeRelationship.ARTIFACT_DUPLICATE);
      });
      it('should identify nodes with relationship "artifact version conflict"', function () {
        var state = depTree._determineNodeRelationship(nodeA, nodeD);
        state.should.be.equal(DependencyTree.NodeRelationship.ARTIFACT_VERSION_CONFLICT);
      });
      it('should identify nodes with relationship "artifact duplicate"', function () {
        var state = depTree._determineNodeRelationship(nodeC, nodeD);
        state.should.be.equal(DependencyTree.NodeRelationship.ARTIFACT_NAME_CONFLICT);
      });
      it('should identify nodes with no special relationship to each other', function () {
        var state = depTree._determineNodeRelationship(nodeA, nodeE);
        state.should.be.equal(DependencyTree.NodeRelationship.DISTINCT_ARTIFACT);
      });
    });
    describe('#_getRelatedNodes()', function () {
      var nodeA;
      var nodeB;
      var nodeC;
      var nodeD;
      var nodes;
      var depTree;

      beforeEach(function () {
        depTree = new DependencyTree();
        nodeA = new DependencyTree.Node();
        nodeA.data = new DepReference({webpackageId: 'packageA@1.0', artifactId: 'artifact_A', referrer: null});

        nodeB = new DependencyTree.Node();
        nodeB.data = new DepReference({webpackageId: 'packageB@1.0', artifactId: 'artifact_B', referrer: null});

        nodeC = new DependencyTree.Node();
        nodeC.data = new DepReference({webpackageId: 'packageC@1.0', artifactId: 'artifact_C', referrer: null});

        nodeD = new DependencyTree.Node();
        nodeD.data = new DepReference({webpackageId: 'packageD@2.0', artifactId: 'artifact_C', referrer: null});

        nodes = [nodeA, nodeB, nodeC, nodeD];
      });

      it('should filter given nodes array to return only nodes being in "artifact version conflict" relationship with the given node', function () {
        var node = new DependencyTree.Node();
        node.data = new DepReference({webpackageId: 'packageA@2.0', artifactId: 'artifact_A', referrer: null});
        var results = depTree._getRelatedNodes(node, nodes, DependencyTree.NodeRelationship.ARTIFACT_VERSION_CONFLICT);
        results.should.be.an('array');
        results.should.have.members([nodeA]);
      });
      it('should filter given nodes array to return only nodes being in "artifact name conflict" relationship with the given node', function () {
        var node = new DependencyTree.Node();
        node.data = new DepReference({webpackageId: 'packageE@1.0', artifactId: 'artifact_C', referrer: null});
        var results = depTree._getRelatedNodes(node, nodes, DependencyTree.NodeRelationship.ARTIFACT_NAME_CONFLICT);
        results.should.be.an('array');
        results.should.have.members([nodeC, nodeD]);
      });
      it('should filter given nodes array to return only nodes being in "artifact duplicate" relationship with the given node', function () {
        var node = new DependencyTree.Node();
        node.data = new DepReference({webpackageId: 'packageB@1.0', artifactId: 'artifact_B', referrer: null});
        var results = depTree._getRelatedNodes(node, nodes, DependencyTree.NodeRelationship.ARTIFACT_DUPLICATE);
        results.should.be.an('array');
        results.should.have.members([nodeB]);
      });
      it('should filter given nodes array to return only nodes being in "distinct artifact" relationship with the given node', function () {
        var node = new DependencyTree.Node();
        node.data = new DepReference({webpackageId: 'packageE@1.0', artifactId: 'artifact_E', referrer: null});
        var results = depTree._getRelatedNodes(node, nodes, DependencyTree.NodeRelationship.DISTINCT_ARTIFACT);
        results.should.be.an('array');
        results.should.have.members([nodeA, nodeB, nodeC, nodeD]);
      });
    });
    describe('Dependency Tree conflict detection and resolution', function () {
      var depTree;
      var rootA;
      var rootB;
      var rootC;
      var childA1;
      var childA2;
      var childA11;
      var childB1;
      var childC1;
      var childC2;
      var childC3;

      beforeEach(function () {
        /**
         * Provide example tree with one version conflict (package5@2.0.0/util5 <--> package5@1.0.0/util5),
         * one naming conflict (package3@1.0.0/my-comp <--> packageB@2.0.0/my-comp) and one mixed conflict containing a
         * version conflict (packageC@1.0/artifact_C <--> packageD@1.0/artifact_C <-->  packageD@2.0/artifact_C)
         * Build the following tree:
         *
         *               package1@1.0.0/util1                      packageA@1.0.0/artifactA                              packageB@1.0/artifact_B
         *                  /            \                                    |                                       /               |          \
         *                /               \                                   |                                      /                |           \
         *    package3@1.0.0/my-comp    package5@2.0.0/util5        packageB@2.0.0/my-comp     packageC@1.0/artifact_C   packageD@1.0/artifact_C   packageD@2.0/artifact_C
         *            |
         *            |
         *    package5@1.0.0/util5
         */
        depTree = new DependencyTree();
        rootA = new DependencyTree.Node();
        rootA.data = new DepReference({webpackageId: 'package1@1.0.0', artifactId: 'util1', referrer: null});
        depTree.insertNode(rootA);

        rootB = new DependencyTree.Node();
        rootB.data = new DepReference({webpackageId: 'packageA@1.0.0', artifactId: 'artifactA', referrer: null});
        depTree.insertNode(rootB);

        rootC = new DependencyTree.Node();
        rootC.data = new DepReference({webpackageId: 'packageB@1.0', artifactId: 'artifact_B', referrer: null});
        depTree.insertNode(rootC);

        childA1 = new DependencyTree.Node();
        childA1.data = new DepReference({
          webpackageId: 'package3@1.0.0',
          artifactId: 'my-comp',
          referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
        });
        depTree.insertNode(childA1, rootA);

        childA2 = new DependencyTree.Node();
        childA2.data = new DepReference({
          webpackageId: 'package5@2.0.0',
          artifactId: 'util5',
          referrer: {webpackageId: 'package1@1.0.0', artifactId: 'util1'}
        });
        depTree.insertNode(childA2, rootA);

        childA11 = new DependencyTree.Node();
        childA11.data = new DepReference({
          webpackageId: 'package5@1.0.0',
          artifactId: 'util5',
          referrer: {webpackageId: 'package3@1.0.0', artifactId: 'my-comp'}
        });
        depTree.insertNode(childA11, childA1);

        childB1 = new DependencyTree.Node();
        childB1.data = new DepReference({
          webpackageId: 'packageB@2.0.0',
          artifactId: 'my-comp',
          referrer: {webpackageId: 'packageA@1.0.0', artifactId: 'artifactA'}
        });
        depTree.insertNode(childB1, rootB);

        childC1 = new DependencyTree.Node();
        childC1.data = new DepReference({
          webpackageId: 'packageC@1.0',
          artifactId: 'artifact_C',
          referrer: {webpackageId: 'packageB@1.0', artifactId: 'artifact_B'}
        });
        depTree.insertNode(childC1, rootC);

        childC2 = new DependencyTree.Node();
        childC2.data = new DepReference({
          webpackageId: 'packageD@1.0',
          artifactId: 'artifact_C',
          referrer: {webpackageId: 'packageB@1.0', artifactId: 'artifact_B'}
        });
        depTree.insertNode(childC2, rootC);

        childC3 = new DependencyTree.Node();
        childC3.data = new DepReference({
          webpackageId: 'packageD@2.0',
          artifactId: 'artifact_C',
          referrer: {webpackageId: 'packageB@1.0', artifactId: 'artifact_B'}
        });
        depTree.insertNode(childC3, rootC);
      });

      describe('#_removeConflictedNode()', function () {
        it('should remove conflictedNode and sets usedBy and usesExisting accordnigly', function () {
          depTree._removeConflictedNode(childA2, childA11);
          depTree.contains(childA11).should.be.false;
          childA2.usedBy.should.include.members([childA1]);
          childA1.usesExisting.should.include.members([childA2]);
        });
      });

      describe('#removeDuplicates() with automatic conflict resolution', function () {
        it('should remove all version conflicted nodes', function () {
          depTree.enableACR();
          depTree.removeDuplicates();
          depTree.contains(rootA).should.be.true;
          depTree.contains(rootB).should.be.true;
          depTree.contains(rootC).should.be.true;
          depTree.contains(childA1).should.be.true;
          depTree.contains(childA2).should.be.true;
          depTree.contains(childB1).should.be.true;
          depTree.contains(childC1).should.be.true;
          depTree.contains(childC2).should.be.true;
          depTree.contains(childA11).should.be.false;
          depTree.contains(childC3).should.be.false;
        });
        it('should add all determined conflicts to internal _conflicts array', function () {
          depTree.enableACR();
          depTree.removeDuplicates();
          var conflicts = depTree.getConflictedNodes();
          conflicts.should.have.lengthOf(5);
          conflicts.should.include.deep.members([
            {node: childC2, conflictedNode: childC3, type: DependencyTree.conflictTypes.VERSION, resolved: true},
            {node: childA2, conflictedNode: childA11, type: DependencyTree.conflictTypes.VERSION, resolved: true},
            {node: childA1, conflictedNode: childB1, type: DependencyTree.conflictTypes.NAME, resolved: false},
            {node: childC1, conflictedNode: childC2, type: DependencyTree.conflictTypes.NAME, resolved: false},
            {node: childC1, conflictedNode: childC3, type: DependencyTree.conflictTypes.NAME, resolved: false}
          ]);
        });
      });
    });
  });
})();
