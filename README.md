## Visual Studio Online Node.js Client

The VSO client module for Node.js is a wrapper for the latest [Visual Studio Online REST API](http://www.visualstudio.com/integrate/reference/reference-vso-overview-vsi).
It provides an easy-to-use set of functions designed to simplify the integration of external systems and
utilities with your Visual Studio Online account.

Features:
* Get a list of projects, collections, teams, and team members
* Manage Team Rooms, membership and messages
* Query for work items using saved queries or WIQL
* Create and update work items, including attachments
* Manage saved queries

### Requirements

* [Node.js](http://nodejs.org)
* A [Visual Studio Online](https://visualstudio.com) account

### Installing the client

    npm install vso-client

### Client usage

    var vso = require('vso-client');
    var client = vso.createClient('url', 'collection', 'your-username', 'your-p@ssw0rd');

    client.getProjects(function(err, projects) {
      if (err) {
        console.log(err);
      } else {
        console.log(projects);
      }
    });

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

The LeanKit Node Client is licensed under [MIT](http://www.opensource.org/licenses/mit-license.php). Refer to [license.txt](https://github.com/leankit-labs/vso-client/blob/master/LICENSE) for more information.
