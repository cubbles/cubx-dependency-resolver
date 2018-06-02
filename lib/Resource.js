(function () {
  'use strict';

  var Resource = function (path, type, referrer) {
    if (path === null || typeof path !== 'string' || path.length === 0) {
      throw new TypeError('parameter "path" needs to be of type string');
    }

    /**
     * Path
     * @type {string}
     */
    this.path = path;

    if (type === null || typeof type !== 'string' || type.length === 0) {
      throw new TypeError('parameter "type" needs to be of type string');
    }

    if (!this._isValidResourceType(type)) {
      throw new TypeError('parameter "type" has non valid value');
    }

    /**
     * type
     * @type {string}
     */
    this.type = type;

    /**
     * referrer list
     */
    this.referrer = referrer;
  };

  /**
   * Contains all possible resource types
   * @type {object}
   * @static
   * @private
   */
  Resource._types = {
    stylesheet: {
      name: 'stylesheet',
      fileEndings: [
        'css'
      ],
      'template': '<link rel="stylesheet" href="#">'
    },
    htmlImport: {
      name: 'htmlImport',
      fileEndings: [
        'html',
        'htm'
      ],
      'template': '<link rel="import" href="#">'
    },
    javascript: {
      name: 'javascript',
      fileEndings: [
        'js'
      ],
      'template': '<script src="#"></script>'
    }
  };

  /**
   * Check if given type is valid
   * @param {string} type
   * @return {boolean}
   * @static
   * @private
   */
  Resource.prototype._isValidResourceType = function (type) {
    for (var property in Resource._types) {
      if (Resource._types.hasOwnProperty(property)) {
        if (Resource._types[property].name === type) {
          return true;
        }
      }
    }
    return false;
  };

  module.exports = Resource;
}());
