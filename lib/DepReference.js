(function () {
  'use strict';


  /**
   * Class for representing a dependency item in a dependency list. Each dependency is in fact a reference to an
   * artifact within a webpackage.
   * @global
   * @constructor
   * @param {object} initObject with the structure of an artifacts´s dependency array
   */
  var DepReference = function (initObject) {
    /**
     * id of the webpackage
     * @type {string}
     */
    this.webpackageId = initObject.webpackageId;

    /**
     * id of the artifact
     * @type {string}
     */
    this.artifactId = initObject.artifactId;

    /**
     * id list of referrer of webpackage
     * @type {array}
     */
    this.referrer = [];

    /**
     * Array of resources
     * @type {Resource}
     */
    this.resources = [];

    /**
     * Array holding direct dependencies as DepReference items
     * @type {Array}
     */
    this.dependencies = [];

    /**
     * Array holding depedencyExcludes in the form of {webpackageId: [webpackageId], artifactId: [artifactId]}
     * @type {Array}
     */
    this.dependencyExcludes = [];

    /**
     * Object representing a manifest.webpackage file that should be used when resolving this DepReference instance.
     * Requesting a manifest.webpackage via ajax will be skipped for this DepReference instance if this is set.
     * @type {object}
     */
    this.manifest = initObject.manifest || undefined;

    this.equals = function (item) {
      return item.webpackageId + item.artifactId === this.webpackageId + this.artifactId;
    };

    // constructor logic
    (function (referrer) {
      if (referrer && typeof referrer === 'object' && referrer.hasOwnProperty('webpackageId') && referrer.hasOwnProperty('artifactId')) {
        this.referrer.push(referrer);
      } else if (referrer === null) {
        // if referrer is null we assume it's a root dependency. So we set referrer to 'root'
        this.referrer.push('root');
      } else {
        console.warn('DepReference received referrer of unexpected type \'' + typeof referrer + '\'');
      }
    }.bind(this))(initObject.referrer);
  };

  DepReference.prototype.getId = function () {
    return this.webpackageId + '/' + this.artifactId;
  };

  DepReference.prototype.getArtifactId = function () {
    return this.artifactId;
  };

  module.exports = DepReference;
}());