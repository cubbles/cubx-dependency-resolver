# cubx-dependency-resolver

[![Build Status](https://travis-ci.org/cubbles/cubx-dependency-resolver.svg?branch=master)](https://travis-ci.org/cubbles/cubx-dependency-resolver)

Module for building the rarw dependency tree of a list of root dependencies.

## Usage: 
### Command line: 

```
cubx-dependency-resolver -u <baseUrl> -d <rootDependencies>
```

#### Parameters
* `-u`/`--baseUrl` url of the base where dependencies are hosted
* `d`/`--rootDependencies` a list of root dependencies (JSON valid), or a path to a JSON file containing the list
* `-t`/`--type` to CLI accepting the values:
    * `raw`: returns raw DependencyTree
    * `resolved`: returns resolved Dependency Tree
    * `list` (default): return ordered list of resources
    * `wplist`: return a list of webpackages only (without resources and derived from resolved dependency tree)
    * `mlist`: return a list of manifests of all webpackages (derived from resolved dependency tree)
* `-m`/`--mode` to CLI accepting the values (Note: this only applies if parameter `type` is set to value `list`:
    * `prod` (default): Use only `prod` resources
    * `dev`: Use only `dev` resources


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
artifactsDepsResolver.resolveDependencies(rootDependencies, baseUrl);
```