var AuthenticationCredential, AuthenticationOAuth, AuthenticationWrap, apiVersion, azure, request, requestJson, requestToken, requestWrapToken, spsUri, vsoTokenUri, _;

_ = require('lodash');

requestJson = require('request-json');

request = require("request");

azure = require('azure');

apiVersion = '2.0';

spsUri = 'https://app.vssps.visualstudio.com';

vsoTokenUri = spsUri + '/oauth2/token';

requestToken = function(clientAssertion, assertion, grantType, redirectUri, callback, tokenUri) {
  return request.post(tokenUri, {
    form: {
      "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      "client_assertion": clientAssertion,
      "response_type": "Assertion",
      "grant_type": grantType,
      "assertion": assertion,
      "redirect_uri": redirectUri
    }
  }, function(err, res, body) {
    if (err) {
      return callback(err, body);
    } else if (res.statusCode !== 200 && res.statusCode !== 400 && res.statusCode !== 401) {
      return callback("Error Code " + res.statusCode, body);
    } else {
      return callback(err, JSON.parse(body));
    }
  });
};

requestWrapToken = function(accountUrl, username, password, callback) {
  return request({
    url: accountUrl,
    followRedirect: false
  }, function(err, res, body) {
    var issuer, realm, wrapService;
    if (err) {
      return callback(err, body, res);
    }
    realm = res.headers['x-tfs-fedauthrealm'];
    issuer = res.headers['x-tfs-fedauthissuer'];
    if (!(realm && issuer)) {
      return callback("Can't determine Federation data on headers", body, res);
    }
    wrapService = azure.createWrapService(issuer, username, password);
    return wrapService.wrapAccessToken(realm, function(err, token, res) {
      return callback(err, (err ? res.body : token), res);
    });
  });
};

exports.createClient = function(url, collection, username, password, options) {
  return new exports.Client(url, collection, new AuthenticationCredential(username, password), options);
};

exports.createOAuthClient = function(url, collection, accessToken, options) {
  return new exports.Client(url, collection, new AuthenticationOAuth(accessToken), options);
};

exports.createWrapClient = function(url, collection, accessToken, options) {
  return new exports.Client(url, collection, new AuthenticationWrap(accessToken), options);
};

exports.getToken = function(clientAssertion, assertion, redirectUri, callback, tokenUri) {
  if (tokenUri == null) {
    tokenUri = vsoTokenUri;
  }
  return requestToken(clientAssertion, assertion, "urn:ietf:params:oauth:grant-type:jwt-bearer", redirectUri, callback, tokenUri);
};

exports.refreshToken = function(clientAssertion, assertion, redirectUri, callback, tokenUri) {
  if (tokenUri == null) {
    tokenUri = vsoTokenUri;
  }
  return requestToken(clientAssertion, assertion, "refresh_token", redirectUri, callback, tokenUri);
};

exports.getWrapToken = function(accountUrl, username, password, callback) {
  return requestWrapToken(accountUrl, username, password, callback);
};

AuthenticationCredential = (function() {
  function AuthenticationCredential(username, password) {
    this.username = username;
    this.password = password;
    this.type = "Credential";
  }

  return AuthenticationCredential;

})();

AuthenticationOAuth = (function() {
  function AuthenticationOAuth(accessToken) {
    this.accessToken = accessToken;
    this.type = "OAuth";
  }

  return AuthenticationOAuth;

})();

AuthenticationWrap = (function() {
  function AuthenticationWrap(accessToken) {
    this.accessToken = accessToken;
    this.type = "Wrap";
  }

  return AuthenticationWrap;

})();

exports.Client = (function() {
  var getMinorVersion, getVersion, getVersionStage;

  function Client(url, collection, authentication, options) {
    var apiUrl, spsUrl, userAgent;
    this.url = url;
    this.collection = collection;
    apiUrl = url;
    this.client = requestJson.createClient(apiUrl, options != null ? options.clientOptions : void 0);
    if (authentication === AuthenticationCredential || authentication.type === "Credential") {
      this.client.setBasicAuth(authentication.username, authentication.password);
    } else if (authentication === AuthenticationOAuth || authentication.type === "OAuth") {
      spsUrl = (options != null ? options.spsUri : void 0) || spsUri;
      this.clientSPS = requestJson.createClient(spsUrl, options != null ? options.clientOptions : void 0);
      this.client.headers.Authorization = "bearer " + authentication.accessToken;
      this.clientSPS.headers.Authorization = "bearer " + authentication.accessToken;
    } else if (authentication === AuthenticationWrap || authentication.type === "Wrap") {
      this.client.headers.Authorization = "WRAP access_token=\"" + authentication.accessToken + "\"";
    } else {
      throw new Error("unknown authentication type");
    }
    this._authType = authentication.type;
    this.apiVersion = (options != null ? options.apiVersion : void 0) || apiVersion;
    userAgent = 'vso-client/1.0 node/' + process.versions.node + ' ' + process.platform;
    if (((options != null ? options.userAgent : void 0) != null)) {
      this.userAgent = options.userAgent + '; ' + userAgent;
    } else {
      this.userAgent = userAgent;
    }
  }

  Client.prototype.parseReplyData = function(error, res, body, callback) {
    var err;
    if (error) {
      return callback(error, body);
    } else if (this._authType === "OAuth" && (res != null ? res.statusCode : void 0) === 203) {
      return callback("Error unauthorized. Check OAUth token", body);
    } else if ((res != null ? res.statusCode : void 0) === 401 || (this._authType !== "OAuth" && (res != null ? res.statusCode : void 0) === 203)) {
      return callback("Error unauthorized", body);
    } else if ((res != null ? res.statusCode : void 0) >= 500 && (res != null ? res.statusCode : void 0) < 600) {
      return callback("Error call failed with HTTP Code " + res.statusCode, body);
    } else if ((body.errorCode || body.errorCode === 0) && (body.message || body.typeKey)) {
      err = 'Error ' + body.errorCode + ': ';
      if (body.message && body.message.length > 0) {
        err += body.message;
      } else {
        err += body.typeKey;
      }
      return callback(err, body);
    } else if (body && body.value) {
      return callback(error, body.value);
    } else if (body && body.id) {
      return callback(error, body);
    } else if (body && body.length > 0) {
      return callback('Unknown Error', body);
    } else {
      return callback(error, body);
    }
  };

  Client.prototype.findItemField = function(fields, fieldName) {
    var field;
    field = _.find(fields, function(f) {
      return f.field.refName === fieldName;
    });
    return field;
  };

  Client.prototype.findFirstItemField = function(fields, fieldNames) {
    var field, fieldName, _i, _len;
    field = null;
    for (_i = 0, _len = fieldNames.length; _i < _len; _i++) {
      fieldName = fieldNames[_i];
      field = this.findItemField(fields, fieldName);
      if (field) {
        break;
      }
    }
    return field;
  };

  Client.prototype.setAccessToken = function(acessToken) {
    if (this._authType !== "OAuth" && this._authType !== "Wrap") {
      throw new Error("can only set access token for OAuth or Wrap client");
    }
    if (this._authType === "OAuth") {
      return this.client.headers.Authorization = "bearer " + acessToken;
    } else {
      return this.client.headers.Authorization = "WRAP access_token=\"" + acessToken + "\"";
    }
  };

  Client.prototype.setVersion = function(version) {
    return this.apiVersion = version;
  };

  Client.prototype.checkAndRequireOAuth = function(methodName) {
    if (this._authType !== "OAuth") {
      throw new Error(methodName + " can only be invoked with OAuth");
    }
  };

  Client.prototype.buildApiPath = function(path, params, options) {
    var basePath, returnPath;
    basePath = "";
    if (!(options != null ? options.excludeCollection : void 0)) {
      if (options != null ? options.projectName : void 0) {
        if (options != null ? options.teamName : void 0){
          basePath = '/' + this.collection + '/' + (encodeURI(options.projectName))+ '/' + (encodeURI(options.teamName));
        } else{
          basePath = '/' + this.collection + '/' + (encodeURI(options.projectName));
        }
      } else {
        basePath = '/' + this.collection;
      }
    }
    returnPath = basePath + '/_apis/' + path;
    if (params && params.length > 0) {
      if (params[0] !== '?') {
        params = '?' + params;
      }
      returnPath += params;
    }
    return returnPath;
  };

  Client.prototype.getOptions = function(patch) {
    var contentType, options;
    options = {
      headers: {}
    };
    contentType = patch && this.apiVersion !== '1.0-preview.1' ? 'application/json-patch+json' : 'application/json';
    options.headers['accept'] = 'application/json; api-version=' + this.apiVersion;
    options.headers['content-type'] = contentType;
    options.headers['user-agent'] = this.userAgent;
    return options;
  };

  Client.prototype.getPatchContentType = function() {
    if (this.apiVersion === "1.0-preview.1") {
      return 'application/json';
    }
    return 'application/json-patch+json';
  };

  Client.prototype.encodeFolderPath = function(folderParam) {
    if (!folderParam) {
      return "";
    }
    return "/" + (folderParam.split("/").map(function(e) {
      return encodeURI(e);
    })).join("/");
  };

  Client.prototype.isGuid = function(id) {
    var guidPattern;
    guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return id.match(guidPattern);
  };

  getVersion = function(version) {
    var dashPosition;
    dashPosition = version.indexOf("-");
    if (dashPosition !== -1) {
      return version.substring(0, dashPosition);
    }
    return version;
  };

  getMinorVersion = function(previewVersion) {
    var parts;
    parts = previewVersion.split(".");
    if (parts.length > 1) {
      return parts[1];
    }
    return "0";
  };

  getVersionStage = function(version) {
    var dashPosition;
    dashPosition = version.indexOf("-");
    if (dashPosition === -1) {
      return "";
    }
    return version.substring(dashPosition);
  };

  Client.prototype.requireMinimumVersion = function(version, requiredMinimumVersion) {
    var majorRequiredVersion, majorVersion, previewRequiredMinimumVersion, previewVersion;
    majorVersion = getVersion(version);
    majorRequiredVersion = getVersion(requiredMinimumVersion);
    if (majorVersion < majorRequiredVersion) {
      return false;
    }
    if (majorVersion > majorRequiredVersion) {
      return true;
    }
    previewVersion = getVersionStage(version);
    previewRequiredMinimumVersion = getVersionStage(requiredMinimumVersion);
    if ((previewVersion === previewRequiredMinimumVersion && previewRequiredMinimumVersion === "")) {
      return majorVersion >= majorRequiredVersion;
    }
    if (previewVersion !== "" && previewRequiredMinimumVersion !== "") {
      return (getMinorVersion(previewVersion)) >= (getMinorVersion(previewRequiredMinimumVersion));
    }
    if (previewVersion === "" && previewRequiredMinimumVersion !== "") {
      return true;
    }
    return false;
  };

  Client.prototype.checkAndRequireMinimumVersion = function(minimumVersion) {
    if (!this.requireMinimumVersion(this.apiVersion, minimumVersion)) {
      throw new Error("this method requires at least @{minimumVersion)");
    }
  };

  Client.prototype.getProjects = function(stateFilter, pageSize, skip, callback) {  
    var path;
    if (typeof stateFilter === 'function') {
      callback = stateFilter;
      stateFilter = pageSize = skip = null;
    } else if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    pageSize = pageSize != null ? pageSize : 100;
    skip = skip != null ? skip : 0;
    stateFilter = stateFilter != null ? stateFilter : 'WellFormed';
    path = this.buildApiPath('projects', 'stateFilter=' + stateFilter + '&$top=' + pageSize + "&$skip=" + skip);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getProject = function(projectId, includeCapabilities, callback) {
    var path;
    if (typeof includeCapabilities === 'function') {
      callback = includeCapabilities;
      includeCapabilities = false;
    }
    includeCapabilities = includeCapabilities != null ? includeCapabilities : false;
    path = this.buildApiPath('projects/' + projectId, 'includeCapabilities=' + includeCapabilities);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getProjectCollections = function(pageSize, skip, callback) {
    var path;
    if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    pageSize = pageSize != null ? pageSize : 100;
    skip = skip != null ? skip : 0;
    path = this.buildApiPath('projectcollections', '$top=' + pageSize + "&$skip=" + skip);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getProjectCollection = function(collectionId, callback) {
    var path;
    path = this.buildApiPath('projectcollections/' + collectionId);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getTeams = function(projectId, pageSize, skip, callback) {
    var path;
    if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    pageSize = pageSize != null ? pageSize : 100;
    skip = skip != null ? skip : 0;
    path = this.buildApiPath('projects/' + projectId + '/teams', '$top=' + pageSize + '&$skip=' + skip);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getIterations = function(projectName, teamName, callback) {
    var path;
    if (this.apiVersion === "1.0-preview.1") {
      return callback("Not Supported!", null);
    } else {
        path = this.buildApiPath("work/TeamSettings/Iterations", null, {
        projectName: projectName,
        teamName: teamName
      });
      return this.client.get(path,this.getOptions(), (function(_this) {
        return function(err, res, body) {
          if (err) {
            return callback(err, body);
          } else if (res.statusCode === 404) {
            return callback((body != null ? body.message : void 0) || "Error getting Iterations", body);
          } else {
            return _this.parseReplyData(err, res, body, callback);
          }
        };
      })(this));
    }
  };

  Client.prototype.getTeam = function(projectId, teamId, callback) {
    var path;
    path = this.buildApiPath('projects/' + projectId + '/teams/' + teamId);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getTeamMembers = function(projectId, teamId, pageSize, skip, callback) {
    var path;
    if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    pageSize = pageSize != null ? pageSize : 100;
    skip = skip != null ? skip : 0;
    path = this.buildApiPath('projects/' + projectId + '/teams/' + teamId + '/members', '$top=' + pageSize + '&$skip=' + skip);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getTags = function(scope, includeInactive, callback) {
    var path;
    if (typeof includeInactive === 'function') {
      callback = includeInactive;
      includeInactive = false;
    }
    path = this.buildApiPath('tagging/scopes/' + scope + '/tags', 'includeinactive=' + includeInactive);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getTag = function(scope, tag, callback) {
    var path, tagId;
    tagId = encodeURI(tag);
    path = this.buildApiPath('tagging/scopes/' + scope + '/tags/' + tagId);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createTag = function(scope, name, callback) {
    var path, tag;
    tag = {
      name: name
    };
    path = this.buildApiPath('tagging/scopes/' + scope + '/tags');
    return this.client.post(path, tag, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.updateTag = function(scope, tagId, name, active, callback) {
    var path, tag;
    tag = {
      name: name,
      active: active
    };
    path = this.buildApiPath('tagging/scopes/' + scope + '/tags/' + tagId);
    return this.client.patch(path, tag, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.deleteTag = function(scope, tag, callback) {
    var path, tagId;
    tagId = encodeURI(tag);
    path = this.buildApiPath('tagging/scopes/' + scope + '/tags/' + tagId);
    return this.client.del(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemIds = function(wiql, projectName, callback) {
    var params, path, query;
    if (typeof projectName === 'function') {
      callback = projectName;
      projectName = null;
    }
    params = null;
    if (this.apiVersion === "1.0-preview.1") {
      query = {
        wiql: wiql
      };
      if (projectName) {
        projectName = encodeURI(projectName);
        params = '@project=' + projectName;
      }
      path = this.buildApiPath('wit/queryresults', params);
    } else {
      query = {
        query: wiql
      };
      if (projectName) {
        path = this.buildApiPath('wit/wiql', params, {
          projectName: projectName
        });
      } else {
        path = this.buildApiPath('wit/wiql', params);
      }
    }
    return this.client.post(path, query, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, function(err, results) {
          var ids;
          if (err) {
            return callback(err, results);
          } else {
            if (results && results.results) {
              ids = _.map(results.results, 'sourceId');
            } else {
              ids = _.map(results.workItems, 'id');
            }
            return callback(err, ids);
          }
        });
      };
    })(this));
  };

  Client.prototype.getWorkItemIdsByQuery = function(queryId, projectName, callback) {
    var params, path, query;
    if (typeof projectName === 'function') {
      callback = projectName;
      projectName = null;
    }
    query = {
      id: queryId
    };
    params = null;
    if (projectName) {
      projectName = encodeURI(projectName);
      params = '@project=' + projectName;
    }
    path = this.buildApiPath('wit/queryresults', params);
    return this.client.post(path, query, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, function(err, results) {
          var ids;
          if (err) {
            return callback(err, results);
          } else {
            ids = _.map(results.results, 'sourceId');
            return callback(err, ids);
          }
        });
      };
    })(this));
  };

  Client.prototype.getWorkItemsById = function(ids, fields, asOf, expand, callback) {
    var params, path;
    if (typeof fields === 'function') {
      callback = fields;
      fields = asOf = expand = null;
    } else if (typeof asOf === 'function') {
      callback = asOf;
      asOf = expand = null;
    } else if (typeof expand === 'function') {
      callback = expand;
      expand = null;
    }
    if (typeof ids === 'Array') {
      ids = ids.join(',');
    }
    if (typeof fields === 'Array') {
      fields = fields.join(',');
    }
    params = 'ids=' + ids;
    if (fields) {
      params += '&fields=' + fields;
    }
    if (asOf) {
      params += '&asof=' + asOf;
    }
    if (expand) {
      params += '&$expand=' + expand;
    }
    path = this.buildApiPath('wit/workitems', params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItem = function(id, expand, callback) {
    var params, path;
    if (typeof expand === 'function') {
      callback = expand;
      expand = null;
    }
    params = null;
    if (expand) {
      params = '$expand=' + expand;
    }
    path = this.buildApiPath('wit/workitems/' + id, params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createWorkItem = function(item, projectName, workItemType, callback) {
    var path;
    if (this.apiVersion === "1.0-preview.1") {
      if (callback == null) {
        callback = projectName;
      }
      path = this.buildApiPath('wit/workitems');
      return this.client.post(path, item, this.getOptions(), (function(_this) {
        return function(err, res, body) {
          var _ref;
          if (err) {
            return callback(err, body);
          } else if (res.statusCode === 400) {
            return callback(((_ref = body.exception) != null ? _ref.Message : void 0) || "Error Creating work item", body);
          } else {
            return _this.parseReplyData(err, res, body, callback);
          }
        };
      })(this));
    } else {
      path = this.buildApiPath("wit/workitems/$" + workItemType, null, {
        projectName: projectName
      });
      return this.client.patch(path, item, this.getOptions(true), (function(_this) {
        return function(err, res, body) {
          if (err) {
            return callback(err, body);
          } else if (res.statusCode === 404) {
            return callback((body != null ? body.message : void 0) || "Error Creating work item", body);
          } else {
            return _this.parseReplyData(err, res, body, callback);
          }
        };
      })(this));
    }
  };

  Client.prototype.updateWorkItem = function(id, operations, callback) {
    var path;
    path = this.buildApiPath('wit/workitems/' + id);
    return this.client.patch(path, operations, this.getOptions(true), (function(_this) {
      return function(err, res, body) {
        if ((res != null ? res.statusCode : void 0) === 404) {
          callback((body != null ? body.message : void 0) || "Error Creating work item", body);
        } else {

        }
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.updateWorkItems = function(items, callback) {
    var path;
    path = this.buildApiPath('wit/workitems');
    return this.client.patch(path, items, this.getOptions(true), (function(_this) {
      return function(err, res, body) {
        if ((res != null ? res.statusCode : void 0) === 404) {
          callback((body != null ? body.message : void 0) || "Error Creating work item", body);
        } else {

        }
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemUpdates = function(id, pageSize, skip, callback) {
    var path;
    if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    pageSize = pageSize != null ? pageSize : 100;
    skip = skip != null ? skip : 0;
    path = this.buildApiPath('wit/workitems/' + id + '/updates', '$top=' + pageSize + '&$skip=' + skip);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemUpdate = function(id, rev, callback) {
    var path;
    path = this.buildApiPath('wit/workitems/' + id + '/updates/' + rev);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemRevision = function(id, rev, callback) {
    var path;
    path = this.buildApiPath('wit/workitems/' + id + '/revisions/' + rev);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.uploadAttachment = function(project, areaPath, fileName, file, callback) {
    var params, path;
    params = 'project=' + encodeURI(project);
    params += '&area=' + encodeURI(areaPath);
    params += '&filename=' + encodeURI(fileName);
    path = this.buildApiPath('wit/attachments', params);
    return this.client.post(path, file, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.addAttachmentToWorkItem = function(id, rev, fileName, locationId, comment, callback) {
    var item, path;
    item = {
      id: id,
      rev: rev,
      resourceLinks: [
        {
          type: 'attachment',
          name: fileName,
          location: locationId,
          comment: comment
        }
      ]
    };
    path = this.buildApiPath('wit/workitems/' + id);
    return this.client.patch(path, item, this.getOptions(true), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getQueries = function(projectName, depth, expand, folderPath, includeDeleted, callback) {
    var folderPathParam, params, path;
    if (typeof depth === 'function') {
      callback = depth;
      depth = expand = folderPath = null;
      includeDeleted = false;
    } else if (typeof expand === 'function') {
      callback = expand;
      expand = folderPath = null;
      includeDeleted = false;
    } else if (typeof folderPath === 'function') {
      callback = folderPath;
      folderPath = null;
      includeDeleted = false;
    } else if (typeof includeDeleted === 'function') {
      callback = includeDeleted;
      includeDeleted = false;
    }
    folderPathParam = "";
    if (this.apiVersion === '1.0-preview.1') {
      params = '&project=' + projectName;
    } else {
      folderPathParam = this.encodeFolderPath(folderPath);
    }
    if (depth) {
      params += '&$depth=' + depth;
    }
    if (expand) {
      params += '&$expand=' + expand;
    }
    if (this.apiVersion === '1.0-preview.1') {
      path = this.buildApiPath('wit/queries', params);
    } else {
      if (includeDeleted) {
        params = '&$includeDeleted=' + includeDeleted;
      }
    }
    path = this.buildApiPath('wit/queries' + folderPathParam, params, {
      projectName: projectName
    });
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getQuery = function(projectName, queryOrFolderId, folderPath, callback) {
    var folderPathParam, path;
    if (typeof folderPath === 'function') {
      callback = folderPath;
      folderPath = null;
    }
    if (this.apiVersion === '1.0-preview.1') {
      path = this.buildApiPath('wit/queries/' + queryOrFolderId);
    } else {
      folderPathParam = this.encodeFolderPath(folderPath);
      path = this.buildApiPath('wit/queries' + folderPathParam + '/' + queryOrFolderId, null, {
        projectName: projectName
      });
    }
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createQuery = function(projectName, name, folderIdOrPath, wiql, callback) {
    var path, query;
    if (this.apiVersion === '1.0-preview.1') {
      query = {
        name: name,
        parentId: folderIdOrPath,
        wiql: wiql
      };
      path = this.buildApiPath('wit/queries');
    } else {
      path = this.buildApiPath('wit/queries' + (this.encodeFolderPath(folderIdOrPath)), null, {
        projectName: projectName
      });
      query = {
        name: name,
        wiql: wiql
      };
    }
    return this.client.post(path, query, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.updateQuery = function(projectName, queryIdOrName, name, folderIdOrPath, wiql, callback) {
    var path, query;
    if (this.apiVersion === '1.0-preview.1') {
      path = this.buildApiPath('wit/queries/' + queryId);
      query = {
        id: queryIdOrName,
        name: name,
        parentId: folderIdOrPath,
        wiql: wiql
      };
      path = this.buildApiPath('wit/queries');
    } else {
      path = this.isGuid(queryIdOrName) ? this.buildApiPath('wit/queries/' + queryIdOrName, null, {
        projectName: projectName
      }) : this.buildApiPath('wit/queries' + (this.encodeFolderPath(folderIdOrPath)) + '/' + queryIdOrName, null, {
        projectName: projectName
      });
      query = {
        name: name,
        wiql: wiql
      };
    }
    return this.client.patch(path, query, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createFolder = function(projectName, name, parentFolderIdOrPath, callback) {
    var folder, path;
    if (this.apiVersion === '1.0-preview.1') {
      folder = {
        name: name,
        parentId: parentFolderIdOrPath,
        type: "folder"
      };
      path = this.buildApiPath('wit/queries');
    } else {
      path = this.buildApiPath('wit/queries' + (this.encodeFolderPath(parentFolderIdOrPath)), null, {
        projectName: projectName
      });
      folder = {
        name: name,
        isFolder: "true"
      };
    }
    return this.client.post(path, folder, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.deleteQuery = function(projectName, queryIdOrPath, callback) {
    var path;
    if (this.apiVersion === '1.0-preview.1') {
      path = this.buildApiPath('wit/queries/' + queryIdOrPath);
    } else {
      path = this.buildApiPath('wit/queries' + (this.encodeFolderPath(queryIdOrPath)), null, {
        projectName: projectName
      });
    }
    return this.client.del(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.deleteFolder = function(projectName, queryIdOrPath, callback) {
    return this.deleteQuery(projectName, queryIdOrPath, callback);
  };

  Client.prototype.getWorkItemTypes = function(projectName, callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemtypes', null, {
      projectName: projectName
    });
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemTypesNames = function(projectName, callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemtypes', null, {
      projectName: projectName
    });
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, function(err, results){
          let names;
          if(err) {
            return callback(err, results);
          } else {
            names = _.map(results, 'name');
            return callback(err, names);
          }
        });
      };
    })(this));
  };

  Client.prototype.getWorkItemType = function(projectName, workItemType, callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemtypes/' + workItemType, null, {
      projectName: projectName
    });
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemRelationTypes = function(callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemrelationtypes');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemRelationTypesNames = function(callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemrelationtypes');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, function(err, results){
          let names;
          if(err) {
            return callback(err, results);
          } else {
            names = _.map(results, 'name');
            return callback(err, names);
          }
        });
      };
    })(this));
  };

  Client.prototype.getWorkItemRelationType = function(relationName, callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemrelationtypes/' + relationName);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemCategories = function(projectName, callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemtypecategories', null, {
      projectName: projectName
    });
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemCategory = function(projectName, categoryName, callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/workitemtypecategories/' + categoryName, null, {
      projectName: projectName
    });
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemFields = function(callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/fields');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getWorkItemFieldsShort = function(callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/fields');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, function(err, results){
          let short;
          if(err) {
            return callback(err, results);
          } else {
            short = _.map(results, (data, result) => {
              return {
                name: data.name,
                nameReference: data.referenceName
              }
            });
            return callback(err, short);
          }
        });
      };
    })(this));
  };

  Client.prototype.getWorkItemField = function(referenceName, callback) {
    var path;
    this.checkAndRequireMinimumVersion("1.0-preview.2");
    path = this.buildApiPath('wit/fields/' + referenceName);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getAccounts = function(memberId, callback) {
    var path;
    this.checkAndRequireOAuth('getAccounts');
    path = this.buildApiPath('accounts', 'memberid=' + memberId, {
      excludeCollection: true
    });
    return this.clientSPS.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getCurrentProfile = function(callback) {
    var path;
    this.checkAndRequireOAuth("getCurrentProfile");
    path = this.buildApiPath('profile/profiles/me', null, {
      excludeCollection: true
    });
    return this.clientSPS.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getConnectionData = function(callback) {
    var path;
    path = this.buildApiPath('connectionData');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRooms = function(callback) {
    var path;
    path = this.buildApiPath('chat/rooms');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRoom = function(roomId, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createRoom = function(name, description, callback) {
    var path, room;
    path = this.buildApiPath('chat/rooms');
    room = {
      name: name,
      description: description
    };
    return this.client.post(path, room, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.updateRoom = function(roomId, name, description, callback) {
    var path, room;
    path = this.buildApiPath('chat/rooms/' + roomId);
    room = {
      name: name,
      description: description
    };
    return this.client.patch(path, room, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.deleteRoom = function(roomId, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId);
    return this.client.del(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRoomUsers = function(roomId, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/users');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRoomUser = function(roomId, userId, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/users/' + userId);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.joinRoom = function(roomId, userId, userGuid, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/users/' + userGuid);
    return this.client.put(path, userId, this.getOptions(), function(err, res, body) {
      return callback(err, res.statusCode);
    });
  };

  Client.prototype.leaveRoom = function(roomId, userId, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/users/' + userId);
    return this.client.del(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getMessages = function(roomId, startDate, endDate, callback) {
    var params, path;
    params = null;
    if (typeof startDate === 'function') {
      callback = startDate;
    } else if (startDate || endDate) {
      params = '$filter=';
      if (typeof endDate === 'function') {
        callback = endDate;
        endDate = null;
      }
      if (startDate && endDate) {
        params += 'postedtime ge ' + startDate + ' and postedtime lt ' + endDate;
      } else if (startDate) {
        params += 'postedtime ge ' + startDate;
      } else {
        params += 'postedtime lt ' + endDate;
      }
    }
    path = this.buildApiPath('chat/rooms/' + roomId + '/messages', params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getMessage = function(roomId, messageId, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/messages/' + messageId);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createMessage = function(roomId, message, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/messages');
    return this.client.post(path, message, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.updateMessage = function(roomId, messageId, message, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/messages/' + messageId);
    return this.client.patch(path, null, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.deleteMessage = function(roomId, messageId, callback) {
    var path;
    path = this.buildApiPath('chat/rooms/' + roomId + '/messages/' + messageId);
    return this.client.del(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRootBranches = function(includeChildren, includeDeleted, callback) {
    var p, params, path;
    if (typeof includeChildren === 'function') {
      callback = includeChildren;
      includeChildren = includeDeleted = false;
    }
    if (typeof includeDeleted === 'function') {
      callback = includeDeleted;
      includeDeleted = false;
    }
    params = [];
    if (includeChildren) {
      params.push("includechildren=true");
    }
    if (includeDeleted) {
      params.push("includedeleted=true");
    }
    p = params.join('&');
    path = this.buildApiPath('tfvc/branches', p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getBranch = function(path, includeChildren, includeParent, includeDeleted, callback) {
    var p, params;
    if (typeof includeChildren === 'function') {
      callback = includeChildren;
      includeChildren = includeParent = includeDeleted = false;
    }
    if (typeof includeParent === 'function') {
      callback = includeParent;
      includeParent = includeDeleted = false;
    }
    if (typeof includeDeleted === 'function') {
      callback = includeDeleted;
      includeDeleted = false;
    }
    params = [];
    if (includeChildren) {
      params.push("includechildren=true");
    }
    if (includeParent) {
      params.push("includeparent=true");
    }
    if (includeDeleted) {
      params.push("includedeleted=true");
    }
    p = params.join('&');
    path = this.buildApiPath('tfvc/branches/' + path, p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getShelveSets = function(owner, maxCommentLength, pageSize, skip, callback) {
    var p, params, path;
    if (typeof owner === 'function') {
      callback = owner;
      owner = maxCommentLength = pageSize = skip = null;
    }
    if (typeof maxCommentLength === 'function') {
      callback = maxCommentLength;
      maxCommentLength = pageSize = skip = null;
    }
    if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    }
    if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    maxCommentLength = maxCommentLength != null ? maxCommentLength : 80;
    pageSize = pageSize != null ? pageSize : 100;
    skip = skip != null ? skip : 0;
    params = [];
    if (owner) {
      params.push('owner=' + owner);
    }
    params.push('maxcommentlength=' + maxCommentLength);
    params.push('$top=' + pageSize);
    params.push('$skip=' + skip);
    p = params.join('&');
    path = this.buildApiPath('tfvc/shelvesets', p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getChangeSets = function(queryOptions, callback) {
    var p, params, path;
    if (typeof queryOptions === 'function') {
      callback = queryOptions;
      queryOptions = null;
    }
    params = [];
    if (queryOptions) {
      if (queryOptions.itemPath) {
        params.push('itempath=' + queryOptions.itemPath);
      }
      if (queryOptions.version) {
        params.push('version=' + queryOptions.version);
      }
      if (queryOptions.versionType) {
        params.push('versiontype=' + queryOptions.versionType);
      }
      if (queryOptions.versionOption) {
        params.push('versionoption=' + queryOptions.versionOption);
      }
      if (queryOptions.author) {
        params.push('author=' + queryOptions.author);
      }
      if (queryOptions.fromId) {
        params.push('fromId=' + queryOptions.fromId);
      }
      if (queryOptions.toId) {
        params.push('toId=' + queryOptions.toId);
      }
      if (queryOptions.fromDate) {
        params.push('fromDate=' + queryOptions.fromDate);
      }
      if (queryOptions.toDate) {
        params.push('toDate=' + queryOptions.toDate);
      }
      if (queryOptions.pageSize) {
        params.push('$top=' + queryOptions.pageSize);
      }
      if (queryOptions.skip) {
        params.push('$skip=' + queryOptions.skip);
      }
      if (queryOptions.orderby) {
        params.push('$orderby=' + queryOptions.orderby);
      }
      if (queryOptions.maxCommentLength) {
        params.push('maxcommentlength=' + queryOptions.maxCommentLength);
      }
    }
    p = params.join('&');
    path = this.buildApiPath('tfvc/changesets', p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getChangeSet = function(changesetId, queryOptions, callback) {
    var p, params, path;
    if (typeof queryOptions === 'function') {
      callback = queryOptions;
      queryOptions = null;
    }
    params = [];
    if (queryOptions) {
      if (queryOptions.includeDetails) {
        params.push('includedetails=true');
      }
      if (queryOptions.includeWorkItems) {
        params.push('includeworkitems=true');
      }
      if (queryOptions.maxChangeCount) {
        params.push('maxchangecount=' + queryOptions.maxChangeCount);
      }
      if (queryOptions.maxCommentLength) {
        params.push('maxcommentlength=' + queryOptions.maxCommentLength);
      }
    }
    p = params.join('&');
    path = this.buildApiPath('tfvc/changesets/' + changesetId, p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getChangeSetChanges = function(queryOptions, callback) {
    var p, params, path, url;
    if (typeof queryOptions === 'function') {
      callback = queryOptions;
      queryOptions = null;
    }
    url = 'tfvc/changesets/latest/changes';
    params = [];
    if (queryOptions) {
      if (queryOptions.id) {
        url = 'tfvc/changesets/' + queryOptions.id + '/changes';
      }
      if (queryOptions.pageSize) {
        params.push('$top=' + queryOptions.pageSize);
      }
      if (queryOptions.skip) {
        params.push('$skip=' + queryOptions.skip);
      }
    }
    p = params.join('&');
    path = this.buildApiPath(url, p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getChangeSetWorkItems = function(queryOptions, callback) {
    var p, params, path, url;
    if (typeof queryOptions === 'function') {
      callback = queryOptions;
      queryOptions = null;
    }
    url = 'tfvc/changesets/latest/workitems';
    params = [];
    if (queryOptions) {
      if (queryOptions.id) {
        url = 'tfvc/changesets/' + queryOptions.id + '/workitems';
      }
      if (queryOptions.pageSize) {
        params.push('$top=' + queryOptions.pageSize);
      }
      if (queryOptions.skip) {
        params.push('$skip=' + queryOptions.skip);
      }
    }
    p = params.join('&');
    path = this.buildApiPath(url, p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getLabels = function(queryOptions, callback) {
    var p, params, path;
    if (typeof queryOptions === 'function') {
      callback = queryOptions;
      queryOptions = null;
    }
    params = [];
    if (queryOptions) {
      if (queryOptions.name) {
        params.push('name=' + queryOptions.name);
      }
      if (queryOptions.owner) {
        params.push('owner=' + queryOptions.owner);
      }
      if (queryOptions.itemLabelFilter) {
        params.push('itemlabelfilter=' + queryOptions.itemLabelFilter);
      }
      if (queryOptions.pageSize) {
        params.push('$top=' + queryOptions.pageSize);
      }
      if (queryOptions.skip) {
        params.push('$skip=' + queryOptions.skip);
      }
    }
    p = params.join('&');
    path = this.buildApiPath('tfvc/labels', p);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getLabel = function(labelId, maxItemCount, callback) {
    var params, path, _ref;
    if (typeof maxItemCount === 'function') {
      callback = maxItemCount;
      maxItemCount = null;
    }
    params = (_ref = 'maxitemcount=' + maxItemCount) != null ? _ref : '';
    path = this.buildApiPath('tfvc/labels/' + labelId, params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getItemsByLabel = function(labelId, pageSize, skip, callback) {
    var params, path;
    if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    }
    if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    pageSize = pageSize != null ? pageSize : 100;
    skip = skip != null ? skip : 0;
    params = '$top=' + pageSize + '&$skip=' + skip;
    path = this.buildApiPath('tfvc/labels/' + labelId + '/items', params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRepositories = function(projectId, callback) {
    var path;
    path = '';
    if (typeof projectId === 'function') {
      callback = projectId;
      projectId = null;
    }
    if (projectId) {
      path = this.buildApiPath('git/' + projectId + '/repositories');
    } else {
      path = this.buildApiPath('git/repositories');
    }
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRepository = function(repositoryIdOrName, projectId, callback) {
    var path, repo;
    path = '';
    if (typeof projectId === 'function') {
      callback = projectId;
      projectId = null;
    }
    repo = encodeURI(repositoryIdOrName);
    if (projectId) {
      path = this.buildApiPath('git/' + projectId + '/repositories/' + repo);
    } else {
      path = this.buildApiPath('git/repositories/' + repo);
    }
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createRepository = function(projectId, name, callback) {
    var path, repo;
    repo = {
      name: name,
      project: {
        id: projectId
      }
    };
    path = this.buildApiPath('git/repositories');
    return this.client.post(path, repo, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.renameRepository = function(repositoryId, name, callback) {
    var path, repo;
    repo = {
      id: repositoryId,
      name: name
    };
    path = this.buildApiPath('git/repositories/' + repositoryId);
    return this.client.patch(path, repo, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.deleteRepository = function(repositoryId, callback) {
    var path;
    path = this.buildApiPath('git/repositories/' + repositoryId);
    return this.client.del(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getCommits = function(repositoryId, itemPath, committer, author, fromDate, toDate, pageSize, skip, callback) {
    var params, path;
    if (typeof itemPath === 'function') {
      callback = itemPath;
      itemPath = committer = author = fromDate = toDate = pageSize = skip = null;
    } else if (typeof committer === 'function') {
      callback = committer;
      committer = author = fromDate = toDate = pageSize = skip = null;
    } else if (typeof author === 'function') {
      callback = author;
      author = fromDate = toDate = pageSize = skip = null;
    } else if (typeof fromDate === 'function') {
      callback = fromDate;
      fromDate = toDate = pageSize = skip = null;
    } else if (typeof toDate === 'function') {
      callback = toDate;
      toDate = pageSize = skip = null;
    } else if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    skip = skip != null ? skip : 0;
    pageSize = pageSize != null ? pageSize : 1000;
    params = '$top=' + pageSize + '&$skip=' + skip;
    if (itemPath) {
      params += '&itempath=' + itemPath;
    }
    if (committer) {
      params += '&committer=' + committer;
    }
    if (author) {
      params += '&author=' + author;
    }
    if (fromDate) {
      params += '&fromdate=' + fromDate;
    }
    if (toDate) {
      params += '&todate=' + toDate;
    }
    path = this.buildApiPath('git/repositories/' + repositoryId + '/commits', params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getCommit = function(repositoryId, commitId, changeCount, callback) {
    var path;
    if (typeof changeCount === 'function') {
      callback = changeCount;
      changeCount = 0;
    }
    path = this.buildApiPath('git/repositories/' + repositoryId + '/commits/' + commitId, 'changeCount=' + changeCount);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getDiffs = function(repositoryId, baseVersionType, baseVersion, targetVersionType, targetVersion, pageSize, skip, callback) {
    var params, path;
    if (typeof baseVersionType === 'function') {
      callback = baseVersionType;
      baseVersionType = baseVersion = targetVersionType = targetVersion = pageSize = skip = null;
    } else if (typeof baseVersion === 'function') {
      callback = baseVersion;
      baseVersion = targetVersionType = targetVersion = pageSize = skip = null;
    } else if (typeof targetVersionType === 'function') {
      callback = targetVersionType;
      targetVersionType = targetVersion = pageSize = skip = null;
    } else if (typeof targetVersion === 'function') {
      callback = targetVersion;
      targetVersion = pageSize = skip = null;
    } else if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    skip = skip != null ? skip : 0;
    pageSize = pageSize != null ? pageSize : 1000;
    params = '$top=' + pageSize + '&$skip=' + skip;
    if (baseVersionType) {
      params += '&baseversiontype=' + baseVersionType;
    }
    if (targetVersionType) {
      params += '&targetversiontype=' + targetVersionType;
    }
    if (baseVersion) {
      params += '&baseversion=' + baseVersion;
    }
    if (targetVersion) {
      params += '&targetversion=' + targetVersion;
    }
    path = this.buildApiPath('git/repositories/' + repositoryId + '/diffs/commits', params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getPushes = function(repositoryId, fromDate, toDate, pusherId, pageSize, skip, callback) {
    var params, path;
    if (typeof fromDate === 'function') {
      callback = fromDate;
      fromDate = toDate = pusherId = pageSize = skip = null;
    } else if (typeof toDate === 'function') {
      callback = toDate;
      toDate = pusherId = pageSize = skip = null;
    } else if (typeof pusherId === 'function') {
      callback = pusherId;
      pusherId = pageSize = skip = null;
    } else if (typeof pageSize === 'function') {
      callback = pageSize;
      pageSize = skip = null;
    } else if (typeof skip === 'function') {
      callback = skip;
      skip = null;
    }
    skip = skip != null ? skip : 0;
    pageSize = pageSize != null ? pageSize : 1000;
    params = '$top=' + pageSize + '&$skip=' + skip;
    if (fromDate) {
      params += '&fromdate=' + fromDate;
    }
    if (toDate) {
      params += '&todate=' + toDate;
    }
    if (pusherId) {
      params += '&pusherid=' + pusherId;
    }
    path = this.buildApiPath('git/repositories/' + repositoryId + '/pushes', params);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getStats = function(repositoryId, branchName, baseVersionType, baseVersion, callback) {
    var params, path, url;
    if (typeof branchName === 'function') {
      callback = branchName;
      branchName = baseVersionType = baseVersion = null;
    } else if (typeof baseVersionType === 'function') {
      callback = baseVersionType;
      baseVersionType = baseVersion = null;
    } else if (typeof baseVersion === 'function') {
      callback = baseVersion;
      baseVersion = null;
    }
    params = [];
    if (baseVersionType) {
      params.push('baseversiontype=' + baseVersionType);
    }
    if (baseVersion) {
      params.push('baseversion=' + baseVersion);
    }
    url = 'git/repositories/' + repositoryId + '/stats/branches';
    if (branchName) {
      url += '/' + branchName;
    }
    path = this.buildApiPath(url, params.join('&'));
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getRefs = function(repositoryId, filter, callback) {
    var path, url;
    if (typeof filter === 'function') {
      callback = filter;
      filter = null;
    }
    url = 'git/repositories/' + repositoryId + '/refs';
    if (filter) {
      url += '/' + filter;
    }
    path = this.buildApiPath(url);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getBuildDefinitions = function(callback) {
    var path;
    path = this.buildApiPath('build/definitions');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.queueBuild = function(buildRequest, callback) {
    var path;
    path = this.buildApiPath('build/requests');
    return this.client.post(path, buildRequest, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getPublishers = function(callback) {
    var path;
    path = this.buildApiPath('hooks/publishers');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getConsumers = function(callback) {
    var path;
    path = this.buildApiPath('hooks/consumers');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getConsumer = function(consumerId, callback) {
    var path;
    path = this.buildApiPath('hooks/consumers/' + consumerId);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getConsumerActions = function(consumerId, callback) {
    var path;
    path = this.buildApiPath('hooks/consumers/' + consumerId + '/actions');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getConsumerAction = function(consumerId, action, callback) {
    var path;
    path = this.buildApiPath('hooks/consumers/' + consumerId + '/actions/' + action);
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.getSubscriptions = function(callback) {
    var path;
    path = this.buildApiPath('hooks/subscriptions');
    return this.client.get(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.createSubscription = function(subscription, callback) {
    var path;
    path = this.buildApiPath('hooks/subscriptions');
    return this.client.post(path, subscription, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.querySubscriptions = function(queryOptions, callback) {
    var path;
    path = this.buildApiPath('hooks/subscriptionsquery');
    return this.client.post(path, queryOptions, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.deleteSubscription = function(id, callback) {
    var path;
    path = this.buildApiPath('hooks/subscriptions/' + id);
    return this.client.del(path, this.getOptions(), (function(_this) {
      return function(err, res, body) {
        return _this.parseReplyData(err, res, body, callback);
      };
    })(this));
  };

  Client.prototype.batchRequest = function(methods, callback) {
    var path;
    if (this.apiVersion === "1.0-preview.1") {
      return callback("Not Supported!", null);
    } else {
      path = this.buildApiPath("wit/$batch", null, null);
      return this.client.post(path, methods, this.getOptions(), (function(_this) {
        return function(err, res, body) {
          if(body && body.value!=null && Array.isArray(body.value)) {
            var bd = { results:[], errors:0, count:0 };
            body.value.map(function(b){
              if (b!=null & b.code == 404){
                var bdy = null;
                try { bdy = JSON.parse(b.body); }
                catch(e) { bdy = b.body != null ? b.body : null; }
                bd.results.push((bdy != null ? bdy : void 0) || { "code":404, "count":1, "value":"Error with your batch of WorkItem Actions" });
                bd.errors++;
              } else {
                if(b.code == 400) { bd.errors++; }
                try { bd.results.push(JSON.parse(b.body)); }
                catch(e) { bd.results.push(b.body); }
              }
            });
            if (err) {
              return callback(err.toString(), b);
            } else if (res.statusCode === 404) {
              return callback((body != null ? body.message : void 0) || "Error with your batch of WorkItem Actions", body);
            } else {
              bd.count = bd.results.length;
              return _this.parseReplyData(err, res, bd, callback);
            }
          } else {
            if (err) {
              return callback(err.toString(), body);
            } else if (res.statusCode === 404) {
              return callback((body != null ? body.message : void 0) || "Error with your batch of WorkItem Actions", body);
            } else {
              return _this.parseReplyData(err, res, body, callback);
            }
          }
        };
      })(this));
    }
  };

  return Client;

})()
