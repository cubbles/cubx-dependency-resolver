/* globals describe, beforeEach, it, expect, before, __dirname */
(function () {
  'use strict';
  describe('DependencyTree', function () {
    var fs = require('fs-extra');
    var path = require('path');
    var DependencyTree = require('../../lib/DependencyTree');
    var DepReference = require('../../lib/DepReference');
    var packages;
    describe('#_removeDuplicate()', function () {
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
      it('should append referrer of removed duplicate node to referrer of duplicated nodes', function () {
        depTree._removeDuplicate(childA1, childB1);
        childA1.data.referrer.should.eql([ packages.pkg1, packages.pkg2 ]);
      });
    });
  });
})();