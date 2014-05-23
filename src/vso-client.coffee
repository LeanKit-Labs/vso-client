_ = require 'lodash'
request = require 'request-json'
apiVersion = '1.0-preview'

parseReplyData = (error, body, callback) ->
  # console.log body
  if error
    callback error, body
  else if (body.errorCode or body.errorCode is 0) and (body.message or body.typeKey)
    # console.log error, body
    err = 'Error ' + body.errorCode + ': '
    if body.message and body.message.length > 0
      err += body.message
    else
      err += body.typeKey
    # console.log err, body
    callback err, body
  else if body and body.value
    # console.log err, body
    callback error, body.value
  else if body and body.id
    callback error, body
  else if body and body.length > 0
    # console.log body
    callback 'Unknown Error', body
  else
    callback error, body

buildApiPath = (path, params) ->
  returnPath = path + '?api-version=' + apiVersion
  if params and params.length > 0
    returnPath += '&' + params
  # console.log returnPath
  returnPath

exports.createClient = (url, collection, username, password) -> new exports.Client url, collection, username, password

class exports.Client
  constructor: (@url, @collection, @username, @password) ->
    apiUrl = url + '/' + collection + '/_apis/'
    @client = request.newClient(apiUrl)
    @client.setBasicAuth @username, @password
    @apiVersion = '1.0-preview'

  findItemField: (fields, fieldName) ->
    field = _.find fields, (f) ->
      f.field.refName is fieldName
    field

  findFirstItemField: (fields, fieldNames) ->
    field = null
    for fieldName in fieldNames
      field = @findItemField fields, fieldName
      if field
        break
    field

  #########################################
  # Projects and Teams
  #########################################

  getProjects: (includeCapabilities, stateFilter, pageSize, skip, callback) ->
    # valid stateFilter values: WellFormed, CreatePending, Deleting, New, All

    if typeof includeCapabilities is 'function'
      callback = includeCapabilities
      includeCapabilities = stateFilter = pageSize = skip = null
    else if typeof stateFilter is 'function'
      callback = stateFilter
      stateFilter = pageSize = skip = null
    else if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0
    stateFilter = stateFilter ? 'WellFormed'
    includeCapabilities = includeCapabilities ? false

    path = buildApiPath 'projects', 'stateFilter=' + stateFilter + '&includeCapabilities=' + includeCapabilities + '&$top=' + pageSize + "&$skip=" + skip
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getProject: (projectId, includeCapabilities, callback) ->
    # valid stateFilter values: WellFormed, CreatePending, Deleting, New, All

    if typeof includeCapabilities is 'function'
      callback = includeCapabilities
      includeCapabilities = false

    includeCapabilities = includeCapabilities ? false

    path = buildApiPath 'projects/' + projectId, 'includeCapabilities=' + includeCapabilities
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getProjectCollections: (pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0

    path = buildApiPath 'projectcollections', '$top=' + pageSize + "&$skip=" + skip
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getProjectCollection: (collectionId, callback) ->

    path = buildApiPath 'projectcollections/' + collectionId
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getTeams: (projectId, pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0

    path = buildApiPath 'projects/' + projectId + '/teams', '$top=' + pageSize + '&$skip=' + skip
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getTeam: (projectId, teamId, callback) ->
    path = buildApiPath 'projects/' + projectId + '/teams/' + teamId
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getTeamMembers: (projectId, teamId, pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0
    path = buildApiPath 'projects/' + projectId + '/teams/' + teamId + '/members', '$top=' + pageSize + '&$skip=' + skip
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  #########################################
  # Tags
  #########################################

  getTags: (scope, includeInactive, callback) ->
    if typeof includeInactive is 'function'
      callback = includeInactive
      includeInactive = false

    path = buildApiPath 'tagging/scopes/' + scope + '/tags', 'includeinactive=' + includeInactive
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getTag: (scope, tag, callback) ->
    tagId = encodeURI tag
    path = buildApiPath 'tagging/scopes/' + scope + '/tags/' + tagId
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  createTag: (scope, name, callback) ->
    tag =
      name: name
    path = buildApiPath 'tagging/scopes/' + scope + '/tags'
    @client.post path, tag, (err, res, body) ->
      parseReplyData err, body, callback

  updateTag: (scope, tagId, name, active, callback) ->
    tag =
      name: name
      active: active
    path = buildApiPath 'tagging/scopes/' + scope + '/tags/' + tagId
    @client.patch path, tag, (err, res, body) ->
      parseReplyData err, body, callback

  deleteTag: (scope, tag, callback) ->
    tagId = encodeURI tag
    path = buildApiPath 'tagging/scopes/' + scope + '/tags/' + tagId
    @client.del path, (err, res, body) ->
      parseReplyData err, body, callback

  #########################################
  # Work Items
  #########################################

  getWorkItemIds: (wiql, projectName, callback) ->
    if typeof projectName is 'function'
      callback = projectName
      projectName = null

    query =
      wiql: wiql

    # console.log query

    params = null
    if projectName
      projectName = encodeURI projectName
      params = '@project=' + projectName

    path = buildApiPath 'wit/queryresults', params
    @client.post path, query, (err, res, body) ->
      parseReplyData err, body, (err, results) ->
        if err
          callback err, results
        else
          ids = _.map results.results, 'sourceId'
          callback err, ids

  getWorkItemIdsByQuery: (queryId, projectName, callback) ->
    if typeof projectName is 'function'
      callback = projectName
      projectName = 'anything'

    query =
      id: queryId

    # console.log query

    params = null
    if projectName
      projectName = encodeURI projectName
      params = '@project=' + projectName

    path = buildApiPath 'wit/queryresults', params
    @client.post path, query, (err, res, body) ->
      parseReplyData err, body, (err, results) ->
        if err
          callback err, results
        else
          # console.log results
          ids = _.map results.results, 'sourceId'
          callback err, ids

  getWorkItemsById: (ids, fields, asOf, expand, callback) ->
    if typeof fields is 'function'
      callback = fields
      fields = asOf = expand = null
    else if typeof asOf is 'function'
      callback = asOf
      asOf = expand = null
    else if typeof expand is 'function'
      callback = expand
      expand = null

    if typeof ids is 'Array'
      ids = ids.join(',')
    if typeof fields is 'Array'
      fields = fields.join(',')

    params = 'ids=' + ids
    if fields
      params += '&fields=' + fields

    if asOf
      params += '&asof=' + asOf

    if expand
      params += '&$expand=' + expand

    # console.log params

    path = buildApiPath 'wit/workitems', params
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getWorkItem: (id, expand, callback) ->
    if typeof expand is 'function'
      callback = expand
      expand = null

    params = null
    if expand
      params = '$expand=' + expand

    path = buildApiPath 'wit/workitems/' + id, params
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  createWorkItem: (item, callback) ->
    path = buildApiPath 'wit/workitems'
    @client.post path, item, (err, res, body) ->
      parseReplyData err, body, callback

  updateWorkItem: (id, item, callback) ->
    path = buildApiPath 'wit/workitems/' + id
    @client.patch path, item, (err, res, body) ->
      parseReplyData err, body, callback

  updateWorkItems: (items, callback) ->
    path = buildApiPath 'wit/workitems'
    @client.patch path, item, (err, res, body) ->
      parseReplyData err, body, callback

  getWorkItemUpdates: (id, pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0

    path = buildApiPath 'wit/workitems/' + id + '/updates', '$top=' + pageSize + '&$skip=' + skip
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getWorkItemUpdate: (id, rev, callback) ->
    path = buildApiPath 'wit/workitems/' + id + '/updates/' + rev
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getWorkItemRevision: (id, rev, callback) ->
    path = buildApiPath 'wit/workitems/' + id + '/revisions/' + rev
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  uploadAttachment: (project, areaPath, fileName, file, callback) ->
    #For binary file, use base64 encoded string
    params = 'project=' + encodeURI project
    params += '&area=' + encodeURI areaPath
    params += '&filename=' + encodeURI fileName
    path = buildApiPath 'wit/attachments', params
    @client.post path, file, (err, res, body) ->
      parseReplyData err, body, callback

  addAttachmentToWorkItem: (id, rev, fileName, locationId, comment, callback) ->
    item =
      id: id
      rev: rev
      resourceLinks: [
        {
          type: 'attachment'
          name: fileName
          location: locationId
          comment: comment
        }
      ]
    path = buildApiPath 'wit/workitems/' + id
    @client.patch path, item, (err, res, body) ->
      parseReplyData err, body, callback

  #########################################
  # Work Item Queries
  #########################################

  getQueries: (projectName, depth, expand, callback) ->
    if typeof depth is 'function'
      callback = depth
      depth = expand = null
    else if typeof expand is 'function'
      callback = expand
      expand = null

    params = 'project=' + projectName
    if depth
      params += '&$depth=' + depth
    if expand
      params += '&$expand=' + expand

    path = buildApiPath 'wit/queries', params
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getQuery: (queryOrFolderId, depth, expand, callback) ->
    if typeof depth is 'function'
      callback = depth
      depth = expand = null
    else if typeof expand is 'function'
      callback = expand
      expand = null

    params = ''
    if depth
      params = '$depth=' + depth
    if expand
      params += '&$expand=' + expand

    path = buildApiPath 'wit/queries/' + queryOrFolderId, params
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  createQuery: (name, folderId, wiql, callback) ->
    query =
      name: name
      parentId: folderId
      wiql: wiql
    path = buildApiPath 'wit/queries'
    @client.post path, query, (err, res, body) ->
      parseReplyData err, body, callback

  updateQuery: (queryId, name, folderId, wiql, callback) ->
    query =
      id: queryId
      name: name
      parentId: folderId
      wiql: wiql
    path = buildApiPath 'wit/queries/' + queryId
    @client.patch path, query, (err, res, body) ->
      parseReplyData err, body, callback

  createFolder: (name, parentFolderId, callback) ->
    folder =
      name: name
      parentId: parentFolderId
      type: 'folder'
    path = buildApiPath 'wit/queries'
    @client.post path, folder, (err, res, body) ->
      parseReplyData err, body, callback

  deleteQuery: (queryId, callback) ->
    path = buildApiPath 'wit/queries/' + queryId
    @client.del path, (err, res, body) ->
      parseReplyData err, body, callback

  deleteFolder: (folderId, callback) ->
    @deleteQuery folderId, callback

  #########################################
  # Accounts and Profiles
  #########################################

  getCurrentProfile: (callback) ->
    path = buildApiPath 'profile/profiles/me'
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  #########################################
  # Team Rooms
  #########################################

  getRooms: (callback) ->
    path = buildApiPath 'chat/rooms'
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getRoom: (roomId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  createRoom: (name, description, callback) ->
    path = buildApiPath 'chat/rooms'
    room =
      name: name
      description: description
    @client.post path, room, (err, res, body) ->
      parseReplyData err, body, callback

  updateRoom: (roomId, name, description, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId
    room =
      name: name
      description: description
    @client.patch path, (err, res, body) ->
      parseReplyData err, body, callback

  deleteRoom: (roomId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId
    @client.del path, (err, res, body) ->
      parseReplyData err, body, callback

  getRoomUsers: (roomId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/users'
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getRoomUser: (roomId, userId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/users/' + userId
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  joinRoom: (roomId, userId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/users/' + userId
    @client.put path, (err, res, body) ->
      parseReplyData err, body, callback

  leaveRoom: (roomId, userId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/users/' + userId
    @client.del path, (err, res, body) ->
      parseReplyData err, body, callback

  getMessages: (roomId, startDate, endDate, callback) ->
    params = null
    if typeof startDate is 'function'
      callback = startDate
    else if startDate or endDate
      params = '$filter='
      if typeof endDate is 'function'
        callback = endDate
        endDate = null
      if startDate and endDate
        params += 'postedtime ge ' + startDate + ' and postedtime lt ' + endDate
      else if startDate
        params += 'postedtime ge ' + startDate
      else
        params += 'postedtime lt ' + endDate

    path = buildApiPath 'chat/rooms/' + roomId + '/messages', params
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getMessage: (roomId, messageId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/messages/' + messageId
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  createMessage: (roomId, message, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/messages'
    @client.post path, (err, res, body) ->
      parseReplyData err, body, callback

  updateMessage: (roomId, messageId, message, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/messages/' + messageId
    @client.patch path, (err, res, body) ->
      parseReplyData err, body, callback

  deleteMessage: (roomId, messageId, callback) ->
    path = buildApiPath 'chat/rooms/' + roomId + '/messages/' + messageId
    @client.del path, (err, res, body) ->
      parseReplyData err, body, callback

  #########################################
  # Version Control
  #########################################

  getRootBranches: (includeChildren, includeDeleted, callback) ->
    if typeof includeChildren is 'function'
      callback = includeChildren
      includeChildren = includeDeleted = false
    if typeof includeDeleted is 'function'
      callback = includeDeleted
      includeDeleted = false

    params = []
    if includeChildren
      params.push "includechildren=true"
    if includeDeleted
      params.push "includedeleted=true"
    p = params.join '&'
    path = buildApiPath 'tfvc/branches', p
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getBranch: (path, includeChildren, includeParent, includeDeleted, callback) ->
    if typeof includeChildren is 'function'
      callback = includeChildren
      includeChildren = includeParent = includeDeleted = false
    if typeof includeParent is 'function'
      callback = includeParent
      includeParent = includeDeleted = false
    if typeof includeDeleted is 'function'
      callback = includeDeleted
      includeDeleted = false

    params = []
    if includeChildren
      params.push "includechildren=true"
    if includeParent
      params.push "includeparent=true"
    if includeDeleted
      params.push "includedeleted=true"
    p = params.join '&'
    path = buildApiPath 'tfvc/branches/' + path, p
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getShelveSets: (owner, maxCommentLength, pageSize, skip, callback) ->
    if typeof owner is 'function'
      callback = owner
      owner = maxCommentLength = pageSize = skip = null
    if typeof maxCommentLength is 'function'
      callback = maxCommentLength
      maxCommentLength = pageSize = skip = null
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    if typeof skip is 'function'
      callback = skip
      skip = null

    maxCommentLength = maxCommentLength ? 80
    pageSize = pageSize ? 100
    skip = skip ? 0
    params = []
    if owner
      params.push 'owner=' + owner
    params.push 'maxcommentlength=' + maxCommentLength
    params.push '$top=' + pageSize
    params.push '$skip=' + skip
    p = params.join '&'
    path = buildApiPath 'tfvc/shelvesets', p
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getChangeSets: (queryOptions, callback) ->
    if typeof queryOptions is 'function'
      callback = queryOptions
      queryOptions = null

    params = []
    if queryOptions
      if queryOptions.itemPath
        params.push 'itempath=' + queryOptions.itemPath
      if queryOptions.version
        params.push 'version=' + queryOptions.version
      if queryOptions.versionType
        params.push 'versiontype=' + queryOptions.versionType
      if queryOptions.versionOption
        params.push 'versionoption=' + queryOptions.versionOption
      if queryOptions.author
        params.push 'author=' + queryOptions.author
      if queryOptions.fromId
        params.push 'fromId=' + queryOptions.fromId
      if queryOptions.toId
        params.push 'toId=' + queryOptions.toId
      if queryOptions.fromDate
        params.push 'fromDate=' + queryOptions.fromDate
      if queryOptions.toDate
        params.push 'toDate=' + queryOptions.toDate
      if queryOptions.pageSize
        params.push '$top=' + queryOptions.pageSize
      if queryOptions.skip
        params.push '$skip=' + queryOptions.skip
      if queryOptions.orderby
        params.push '$orderby=' + queryOptions.orderby
      if queryOptions.maxCommentLength
        params.push 'maxcommentlength=' + queryOptions.maxCommentLength

    p = params.join '&'
    path = buildApiPath 'tfvc/changesets', p
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getChangeSet: (changesetId, queryOptions, callback) ->
    if typeof queryOptions is 'function'
      callback = queryOptions
      queryOptions = null

    # console.log 'queryOptions', queryOptions
    params = []
    if queryOptions
      if queryOptions.includeDetails
        params.push 'includedetails=true'
      if queryOptions.includeWorkItems
        params.push 'includeworkitems=true'
      if queryOptions.maxChangeCount
        params.push 'maxchangecount=' + queryOptions.maxChangeCount
      if queryOptions.maxCommentLength
        params.push 'maxcommentlength=' + queryOptions.maxCommentLength

    p = params.join '&'
    path = buildApiPath 'tfvc/changesets/' + changesetId, p
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getChangeSetChanges: (queryOptions, callback) ->
    if typeof queryOptions is 'function'
      callback = queryOptions
      queryOptions = null
    url = 'tfvc/changesets/latest/changes'
    params = []
    if queryOptions
      if queryOptions.id
        url = 'tfvc/changesets/' + queryOptions.id + '/changes'
      if queryOptions.pageSize
        params.push '$top=' + queryOptions.pageSize
      if queryOptions.skip
        params.push '$skip=' + queryOptions.skip
    p = params.join '&'
    path = buildApiPath url, p
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getChangeSetWorkItems: (queryOptions, callback) ->
    if typeof queryOptions is 'function'
      callback = queryOptions
      queryOptions = null
    url = 'tfvc/changesets/latest/workitems'
    params = []
    if queryOptions
      if queryOptions.id
        url = 'tfvc/changesets/' + queryOptions.id + '/workitems'
      if queryOptions.pageSize
        params.push '$top=' + queryOptions.pageSize
      if queryOptions.skip
        params.push '$skip=' + queryOptions.skip
    p = params.join '&'
    path = buildApiPath url, p
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  #########################################
  # Git Repositories
  #########################################

  getRepositories: (projectId, callback) ->
    path = ''
    if typeof projectId is 'function'
      callback = projectId
      projectId = null
    if projectId
      path = buildApiPath 'git/' + projectId + '/repositories'
    else
      path = buildApiPath 'git/repositories'
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getRepository: (repositoryIdOrName, projectId, callback) ->
    path = ''
    if typeof projectId is 'function'
      callback = projectId
      projectId = null
    repo = encodeURI repositoryIdOrName
    if projectId
      path = buildApiPath 'git/' + projectId + '/repositories/' + repo
    else
      path = buildApiPath 'git/repositories/' + repo
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  createRepository: (projectId, name, callback) ->
    repo =
      name: name
      project:
        id: projectId
    path = buildApiPath 'git/repositories'
    @client.post path, repo, (err, res, body) ->
      parseReplyData err, body, callback

  renameRepository: (repositoryId, name, callback) ->
    repo =
      id: repositoryId
      name: name
    path = buildApiPath 'git/repositories/' + repositoryId
    @client.patch path, repo, (err, res, body) ->
      parseReplyData err, body, callback

  deleteRepository: (repositoryId, callback) ->
    path = buildApiPath 'git/repositories/' + repositoryId
    @client.del path, (err, res, body) ->
      parseReplyData err, body, callback

  getCommits: (repositoryId, itemPath, committer, author, fromDate, toDate, pageSize, skip, callback) ->
    if typeof itemPath is 'function'
      callback = itemPath
      itemPath = committer = author = fromDate = toDate = pageSize = skip = null
    else if typeof committer is 'function'
      callback = committer
      committer = author = fromDate = toDate = pageSize = skip = null
    else if typeof author is 'function'
      callback = author
      author = fromDate = toDate = pageSize = skip = null
    else if typeof fromDate is 'function'
      callback = fromDate
      fromDate = toDate = pageSize = skip = null
    else if typeof toDate is 'function'
      callback = toDate
      toDate = pageSize = skip = null
    else if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    skip = skip ? 0
    pageSize = pageSize ? 1000

    params = '$top=' + pageSize + '&$skip=' + skip
    if itemPath
      params += '&itempath=' + itemPath
    if committer
      params += '&committer=' + committer
    if author
      params += '&author=' + author
    if fromDate
      params += '&fromdate=' + fromDate
    if toDate
      params += '&todate=' + toDate

    path = buildApiPath 'git/repositories/' + repositoryId + '/commits', params
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getCommit: (repositoryId, commitId, changeCount, callback) ->
    if typeof changeCount is 'function'
      callback = changeCount
      changeCount = 0

    path = buildApiPath 'git/repositories/' + repositoryId + '/commits/' + commitId, 'changeCount=' + changeCount
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getDiffs: (repositoryId, baseVersionType, baseVersion, targetVersionType, targetVersion, pageSize, skip, callback) ->
    if typeof baseVersionType is 'function'
      callback = baseVersionType
      baseVersionType = baseVersion = targetVersionType = targetVersion = pageSize = skip = null
    else if typeof baseVersion is 'function'
      callback = baseVersion
      baseVersion = targetVersionType = targetVersion = pageSize = skip = null
    else if typeof targetVersionType is 'function'
      callback = targetVersionType
      targetVersionType = targetVersion = pageSize = skip = null
    else if typeof targetVersion is 'function'
      callback = targetVersion
      targetVersion = pageSize = skip = null
    else if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    skip = skip ? 0
    pageSize = pageSize ? 1000

    params = '$top=' + pageSize + '&$skip=' + skip
    if (baseVersionType)
      params += '&baseversiontype=' + baseVersionType
    if (targetVersionType)
      params += '&targetversiontype=' + targetVersionType
    if (baseVersion)
      params += '&baseversion=' + baseVersion
    if (targetVersion)
      params += '&targetversion=' + targetVersion

    path = buildApiPath 'git/repositories/' + repositoryId + '/diffs/commits', params
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getPushes: (repositoryId, fromDate, toDate, pusherId, pageSize, skip, callback) ->
    if typeof fromDate is 'function'
      callback = fromDate
      fromDate = toDate = pusherId = pageSize = skip = null
    else if typeof toDate is 'function'
      callback = toDate
      toDate = pusherId = pageSize = skip = null
    else if typeof pusherId is 'function'
      callback = pusherId
      pusherId = pageSize = skip = null
    else if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    skip = skip ? 0
    pageSize = pageSize ? 1000

    params = '$top=' + pageSize + '&$skip=' + skip
    if (fromDate)
      params += '&fromdate=' + fromDate
    if (toDate)
      params += '&todate=' + toDate
    if (pusherId)
      params += '&pusherid=' + pusherId

    path = buildApiPath 'git/repositories/' + repositoryId + '/pushes', params
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getStats: (repositoryId, branchName, baseVersionType, baseVersion, callback) ->
    if typeof branchName is 'function'
      callback = branchName
      branchName = baseVersionType = baseVersion = null
    else if typeof baseVersionType is 'function'
      callback = baseVersionType
      baseVersionType = baseVersion = null
    else if typeof baseVersion is 'function'
      callback = baseVersion
      baseVersion = null

    params = []
    if baseVersionType
      params.push 'baseversiontype=' + baseVersionType
    if baseVersion
      params.push 'baseversion=' + baseVersion

    url = 'git/repositories/' + repositoryId + '/stats/branches'
    if branchName
      url += '/' + branchName

    path = buildApiPath url, params.join '&'
    # console.log path
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback

  getRefs: (repositoryId, filter, callback) ->
    if typeof filter is 'function'
      callback = filter
      filter = null

    url = 'git/repositories/' + repositoryId + '/refs'
    if filter
      url += '/' + filter

    path = buildApiPath url
    @client.get path, (err, res, body) ->
      parseReplyData err, body, callback
