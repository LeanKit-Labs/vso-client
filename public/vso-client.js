var apiVersion, buildApiPath, parseReplyData, request, _;

_ = require('lodash');

request = require('request-json');

apiVersion = '1.0-preview';

parseReplyData = function(error, body, callback, cacheCallback) {
  var err;
  if (error) {
    return callback(error, body);
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

buildApiPath = function(path, params) {
  var returnPath;
  returnPath = path + '?api-version=' + apiVersion;
  if (params && params.length > 0) {
    returnPath += '&' + params;
  }
  return returnPath;
};

exports.createClient = function(url, collection, username, password) {
  return new exports.Client(url, collection, username, password);
};

exports.Client = (function() {
  function Client(url, collection, username, password) {
    var apiUrl;
    this.url = url;
    this.collection = collection;
    this.username = username;
    this.password = password;
    apiUrl = url + '/' + collection + '/_apis/';
    this.client = request.newClient(apiUrl);
    this.client.setBasicAuth(this.username, this.password);
    this.apiVersion = '1.0-preview';
  }

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

  Client.prototype.getProjects = function(includeCapabilities, stateFilter, pageSize, skip, callback) {
    var path;
    if (typeof includeCapabilities === 'function') {
      callback = includeCapabilities;
      includeCapabilities = stateFilter = pageSize = skip = null;
    } else if (typeof stateFilter === 'function') {
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
    includeCapabilities = includeCapabilities != null ? includeCapabilities : false;
    path = buildApiPath('projects', 'stateFilter=' + stateFilter + '&includeCapabilities=' + includeCapabilities + '&$top=' + pageSize + "&$skip=" + skip);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getProject = function(projectId, includeCapabilities, callback) {
    var path;
    if (typeof includeCapabilities === 'function') {
      callback = includeCapabilities;
      includeCapabilities = false;
    }
    includeCapabilities = includeCapabilities != null ? includeCapabilities : false;
    path = buildApiPath('projects/' + projectId, 'includeCapabilities=' + includeCapabilities);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('projectcollections', '$top=' + pageSize + "&$skip=" + skip);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getProjectCollection = function(collectionId, callback) {
    var path;
    path = buildApiPath('projectcollections/' + collectionId);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('projects/' + projectId + '/teams', '$top=' + pageSize + '&$skip=' + skip);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getTeam = function(projectId, teamId, callback) {
    var path;
    path = buildApiPath('projects/' + projectId + '/teams/' + teamId);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('projects/' + projectId + '/teams/' + teamId + '/members', '$top=' + pageSize + '&$skip=' + skip);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getTags = function(scope, includeInactive, callback) {
    var path;
    if (typeof includeInactive === 'function') {
      callback = includeInactive;
      includeInactive = false;
    }
    path = buildApiPath('tagging/scopes/' + scope + '/tags', 'includeinactive=' + includeInactive);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getTag = function(scope, tag, callback) {
    var path, tagId;
    tagId = encodeURI(tag);
    path = buildApiPath('tagging/scopes/' + scope + '/tags/' + tagId);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.createTag = function(scope, name, callback) {
    var path, tag;
    tag = {
      name: name
    };
    path = buildApiPath('tagging/scopes/' + scope + '/tags');
    return this.client.post(path, tag, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.updateTag = function(scope, tagId, name, active, callback) {
    var path, tag;
    tag = {
      name: name,
      active: active
    };
    path = buildApiPath('tagging/scopes/' + scope + '/tags/' + tagId);
    return this.client.patch(path, tag, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.deleteTag = function(scope, tag, callback) {
    var path, tagId;
    tagId = encodeURI(tag);
    path = buildApiPath('tagging/scopes/' + scope + '/tags/' + tagId);
    return this.client.del(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getWorkItemIds = function(wiql, projectName, callback) {
    var params, path, query;
    if (typeof projectName === 'function') {
      callback = projectName;
      projectName = null;
    }
    query = {
      wiql: wiql
    };
    params = null;
    if (projectName) {
      projectName = encodeURI(projectName);
      params = '@project=' + projectName;
    }
    path = buildApiPath('wit/queryresults', params);
    return this.client.post(path, query, function(err, res, body) {
      return parseReplyData(err, body, function(err, results) {
        var ids;
        if (err) {
          return callback(err, results);
        } else {
          ids = _.map(results.results, 'sourceId');
          return callback(err, ids);
        }
      });
    });
  };

  Client.prototype.getWorkItemIdsByQuery = function(queryId, projectName, callback) {
    var params, path, query;
    if (typeof projectName === 'function') {
      callback = projectName;
      projectName = 'anything';
    }
    query = {
      id: queryId
    };
    params = null;
    if (projectName) {
      projectName = encodeURI(projectName);
      params = '@project=' + projectName;
    }
    path = buildApiPath('wit/queryresults', params);
    return this.client.post(path, query, function(err, res, body) {
      return parseReplyData(err, body, function(err, results) {
        var ids;
        if (err) {
          return callback(err, results);
        } else {
          ids = _.map(results.results, 'sourceId');
          return callback(err, ids);
        }
      });
    });
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
    path = buildApiPath('wit/workitems', params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('wit/workitems/' + id, params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.createWorkItem = function(item, callback) {
    var path;
    path = buildApiPath('wit/workitems');
    return this.client.post(path, item, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.updateWorkItem = function(id, item, callback) {
    var path;
    path = buildApiPath('wit/workitems/' + id);
    return this.client.patch(path, item, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.updateWorkItems = function(items, callback) {
    var path;
    path = buildApiPath('wit/workitems');
    return this.client.patch(path, item, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('wit/workitems/' + id + '/updates', '$top=' + pageSize + '&$skip=' + skip);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getWorkItemUpdate = function(id, rev, callback) {
    var path;
    path = buildApiPath('wit/workitems/' + id + '/updates/' + rev);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getWorkItemRevision = function(id, rev, callback) {
    var path;
    path = buildApiPath('wit/workitems/' + id + '/revisions/' + rev);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.uploadAttachment = function(project, areaPath, fileName, file, callback) {
    var params, path;
    params = 'project=' + encodeURI(project);
    params += '&area=' + encodeURI(areaPath);
    params += '&filename=' + encodeURI(fileName);
    path = buildApiPath('wit/attachments', params);
    return this.client.post(path, file, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('wit/workitems/' + id);
    return this.client.patch(path, item, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getQueries = function(projectName, depth, expand, callback) {
    var params, path;
    if (typeof depth === 'function') {
      callback = depth;
      depth = expand = null;
    } else if (typeof expand === 'function') {
      callback = expand;
      expand = null;
    }
    params = 'project=' + projectName;
    if (depth) {
      params += '&$depth=' + depth;
    }
    if (expand) {
      params += '&$expand=' + expand;
    }
    path = buildApiPath('wit/queries', params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getQuery = function(queryOrFolderId, depth, expand, callback) {
    var params, path;
    if (typeof depth === 'function') {
      callback = depth;
      depth = expand = null;
    } else if (typeof expand === 'function') {
      callback = expand;
      expand = null;
    }
    params = '';
    if (depth) {
      params = '$depth=' + depth;
    }
    if (expand) {
      params += '&$expand=' + expand;
    }
    path = buildApiPath('wit/queries/' + queryOrFolderId, params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.createQuery = function(name, folderId, wiql, callback) {
    var path, query;
    query = {
      name: name,
      parentId: folderId,
      wiql: wiql
    };
    path = buildApiPath('wit/queries');
    return this.client.post(path, query, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.updateQuery = function(queryId, name, folderId, wiql, callback) {
    var path, query;
    query = {
      id: queryId,
      name: name,
      parentId: folderId,
      wiql: wiql
    };
    path = buildApiPath('wit/queries/' + queryId);
    return this.client.patch(path, query, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.createFolder = function(name, parentFolderId, callback) {
    var folder, path;
    folder = {
      name: name,
      parentId: parentFolderId,
      type: 'folder'
    };
    path = buildApiPath('wit/queries');
    return this.client.post(path, folder, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.deleteQuery = function(queryId, callback) {
    var path;
    path = buildApiPath('wit/queries/' + queryId);
    return this.client.del(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.deleteFolder = function(folderId, callback) {
    return this.deleteQuery(folderId, callback);
  };

  Client.prototype.getCurrentProfile = function(callback) {
    var path;
    path = buildApiPath('profile/profiles/me');
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getRooms = function(callback) {
    var path;
    path = buildApiPath('chat/rooms');
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getRoom = function(roomId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.createRoom = function(name, description, callback) {
    var path, room;
    path = buildApiPath('chat/rooms');
    room = {
      name: name,
      description: description
    };
    return this.client.post(path, room, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.updateRoom = function(roomId, name, description, callback) {
    var path, room;
    path = buildApiPath('chat/rooms/' + roomId);
    room = {
      name: name,
      description: description
    };
    return this.client.patch(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.deleteRoom = function(roomId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId);
    return this.client.del(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getRoomUsers = function(roomId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/users');
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getRoomUser = function(roomId, userId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/users/' + userId);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.joinRoom = function(roomId, userId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/users/' + userId);
    return this.client.put(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.leaveRoom = function(roomId, userId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/users/' + userId);
    return this.client.del(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('chat/rooms/' + roomId + '/messages', params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getMessage = function(roomId, messageId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/messages/' + messageId);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.createMessage = function(roomId, message, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/messages');
    return this.client.post(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.updateMessage = function(roomId, messageId, message, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/messages/' + messageId);
    return this.client.patch(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.deleteMessage = function(roomId, messageId, callback) {
    var path;
    path = buildApiPath('chat/rooms/' + roomId + '/messages/' + messageId);
    return this.client.del(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getRepositories = function(projectId, callback) {
    var path;
    path = '';
    if (typeof projectId === 'function') {
      callback = projectId;
      projectId = null;
    }
    if (projectId) {
      path = buildApiPath('git/' + projectId + '/repositories');
    } else {
      path = buildApiPath('git/repositories');
    }
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
      path = buildApiPath('git/' + projectId + '/repositories/' + repo);
    } else {
      path = buildApiPath('git/repositories/' + repo);
    }
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.createRepository = function(projectId, name, callback) {
    var path, repo;
    repo = {
      name: name,
      project: {
        id: projectId
      }
    };
    path = buildApiPath('git/repositories');
    return this.client.post(path, repo, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.renameRepository = function(repositoryId, name, callback) {
    var path, repo;
    repo = {
      id: repositoryId,
      name: name
    };
    path = buildApiPath('git/repositories/' + repositoryId);
    return this.client.patch(path, repo, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.deleteRepository = function(repositoryId, callback) {
    var path;
    path = buildApiPath('git/repositories/' + repositoryId);
    return this.client.del(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('git/repositories/' + repositoryId + '/commits', params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  Client.prototype.getCommit = function(repositoryId, commitId, changeCount, callback) {
    var path;
    if (typeof changeCount === 'function') {
      callback = changeCount;
      changeCount = 0;
    }
    path = buildApiPath('git/repositories/' + repositoryId + '/commits/' + commitId, 'changeCount=' + changeCount);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('git/repositories/' + repositoryId + '/diffs/commits', params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath('git/repositories/' + repositoryId + '/pushes', params);
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
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
    path = buildApiPath(url, params.join('&'));
    return this.client.get(path, function(err, res, body) {
      return parseReplyData(err, body, callback);
    });
  };

  return Client;

})();
