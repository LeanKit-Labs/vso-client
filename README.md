## Visual Studio Online Node.js Client

The VSO client module for Node.js is a wrapper for the latest [Visual Studio Online REST API](http://www.visualstudio.com/integrate/reference/reference-vso-overview-vsi). It provides an easy-to-use set of functions designed to simplify the integration of external systems and utilities with your Visual Studio Online account.

Features:
* Get a list of projects, collections, teams, and team members
* Manage Team Rooms, membership and messages
* Query for work items using saved queries or WIQL
* Create and update work items, including attachments
* Manage saved queries
* TFS version control, branches, changesets, shelvesets, and labels
* Git repositories, commits, diffs, pushes, stats and refs
* Service hook publishers, consumers, and subscriptions

### Requirements

* [Node.js](http://nodejs.org)
* A [Visual Studio Online](https://visualstudio.com) account

### Installing the client

    npm install vso-client

### Client usage

You can authenticate with Visual Studio Online using [basic authentication](http://www.visualstudio.com/integrate/get-started/get-started-auth-introduction-vsi) or [OAuth 2.0](http://www.visualstudio.com/integrate/get-started/get-started-auth-oauth2-vsi).

#### Basic Authentication

You must first enable [alternate credentials](http://www.visualstudio.com/integrate/get-started/get-started-auth-introduction-vsi) on your profile.

    var vso = require('vso-client');
    var client = vso.createClient('url', 'collection', 'your-username', 'your-p@ssw0rd');

    client.getProjects(function(err, projects) {
      if (err) {
        console.log(err);
      } else {
        console.log(projects);
      }
    });

#### OAuth 2.0

**Step 1: Authorize application**

To use OAuth 2.0, you must follow the steps described in [Authorize access with OAuth 2.0](http://www.visualstudio.com/integrate/get-started/get-started-auth-oauth2-vsi).

**Step 2: Request access token**

Use the vso-client to request or renew an access token.

    var vso = require('vso-client');

    vso.getToken ('clientAssertion', 'assertion', 'redirectUri', function(err, response) {
        if(err) {
            console.log(err);
        } else {
            if (typeof (response.Error) !== "undefined") {
               console.log("No token. Returned message was: " + response);
            } else {
               console.log("Received Token: " + response.access_token)
            }
        }
    }

Note: Use `refreshToken` to renew an existing access token.

**Step 3: Initialize client with access token**

    var client = vso.createOAuthClient('url', 'collection', 'access token');

    client.getProjects(function(err, projects) {
      if (err) {
        console.log(err);
      } else {
        console.log(projects);
      }
    });

## API Versioning

Visual Studio Online API are [versioned](http://www.visualstudio.com/integrate/get-started/get-started-rest-basics-vsi#versioning) to ensure client applications keep working as expect when a new version of the API comes out.

When you create a client using `createClient` or `createOAuthClient` you can explicitly specify the API version you wish to use.

If you don't explicitly specify the version you want to use, version _1.0-preview.1_ will be used by default. Since it is up to the caller to pass the right parameters (and interpret the results) to the methods it calls, it is therefore recommended to explicitly pass a version when you create a client.

Note: 1-0.preview means the latest version available, so, if you use it, a new version of the API may break your code. Therefore, it is recommended that you specify the full version for the stage part of the version (for example use _preview.1_ instead of _preview_) to make your code behavior deterministic.

In can specify the version by passing the apiVersion member in the options parameter.

An example with the  `createClient` (it works the same with `createOAuthClient`)

    var vso = require('vso-client');
    var client = vso.createClient('url', 'collection', 'your-username', 'your-p@ssw0rd', {apiVersion : "1.0-preview.1"});


## API Reference

Review the [tests](https://github.com/leankit-labs/vso-client/blob/master/spec/vso-client.spec.js) for a full list of client functions and their usuage. Also, refer to the [Visual Studio Online REST API](http://www.visualstudio.com/integrate/reference/reference-vso-overview-vsi) documentation.

## Developing from Source

The VSO client is written in [CoffeeScript](http://coffeescript.org/). To modify and rebuild the client from source, you will need the CoffeeScript compiler. [Gulp.js](http://gulpjs.com/) is used to automatically build the client and run all [mocha](http://visionmedia.github.io/mocha/) tests.

* Clone or download the `vso-client` Github repository.
* Open a Terminal window, change to the repository folder, and install dependent packages.

        npm install -g coffee-script
        npm install -g gulp
        npm install -g mocha
        npm install -g should
        npm install
        npm install --package-dev

* Add environment variables for integration tests

  **OS X / Linux**

      export VSO_URL=your-vso-account-URL
      export VSO_COLLECTION=your-project-collection
      export VSO_USER=your-username
      export VSO_PWD=your-password

  **Windows**

      setx VSO_URL "your-vso-account-URL"
      setx VSO_COLLECTION "your-project-collection"
      setx VSO_USER "your-username"
      setx VSO_PWD "your-password"

	**Note**: On Windows, you will need to reopen your command prompt after setting environment variables.

* Keep `gulp` running to compile the `/src` folder and run mocha tests in the `/spec` folder.

        gulp

### Installing manually

* Create a folder in your node application's `node_modules` folder named `vso-client` (e.g. `[project-name]/node_modules/vso-client).
* Copy all the files and folders in the `vso-client` project folder to the `vso-client` folder created in the previous step.

### License

The Visual Studio Online client module is licensed under [MIT](http://www.opensource.org/licenses/mit-license.php). Refer to [license.txt](https://github.com/leankit-labs/vso-client/blob/master/LICENSE) for more information.
