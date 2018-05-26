# cubx-dependency-resolver

[![Build Status](https://travis-ci.org/cubbles/cubx-dependency-resolver.svg?branch=master)](https://travis-ci.org/cubbles/cubx-dependency-resolver)

Module for building the rarw dependency tree of a list of root dependencies.

## Usage: 
### Command line: 

```
cubx-dependency-resolver -u <baseUrl> -d <rootDependencies>
```

### Other npm modules

```javascript
var baseUrl = 'http://base.example';
var rootDependencies = [
                           {
                               "artifactId": "util1",
                               "webpackageId": "package1@1.0.0"
                           },
                           {
                               "artifactId": "util2",
                               "webpackageId": "package2@1.0.0"
                           }
                       ];

var ArtifactsDepsResolver = require('cubx-dependency-resolver');
var artifactsDepsResolver = new ArtifactsDepsResolver();
artifactsDepsResolver.buildRawDependencyTree(rootDependencies, baseUrl);
```