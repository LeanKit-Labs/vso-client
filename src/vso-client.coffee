_ = require 'lodash'
requestJson = require 'request-json'
request = require "request"
azure = require 'azure'

apiVersion = '1.0'

spsUri = 'https://app.vssps.visualstudio.com'
vsoTokenUri = spsUri + '/oauth2/token'

requestToken = (clientAssertion, assertion, grantType, redirectUri, callback, tokenUri) ->

  request.post tokenUri, {
    # proxy: "http://127.0.0.1:8888" ,
    form : {
      "client_assertion_type" : "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
      "client_assertion" : clientAssertion,
      "response_type" : "Assertion",
      "grant_type" : grantType,
      "assertion" : assertion,
      "redirect_uri" : redirectUri
      }
    } , (err, res, body) ->
    if (err)
      callback err, body
    else if (res.statusCode != 200 and res.statusCode != 400 and res.statusCode != 401)
      callback "Error Code " + res.statusCode, body
    else
      callback err, JSON.parse body


requestWrapToken = (accountUrl, username, password, callback) ->
  request
    url: accountUrl,
    followRedirect: false
    (err, res, body) ->
      return callback err, body, res if err
      realm = res.headers['x-tfs-fedauthrealm']
      issuer = res.headers['x-tfs-fedauthissuer']

      return callback "Can't determine Federation data on headers", body, res unless realm and issuer

      wrapService = azure.createWrapService issuer, username, password
      wrapService.wrapAccessToken realm, (err, token, res) ->
        callback err, (if err then res.body else token), res


exports.createClient = (url, collection, username, password, options) -> new exports.Client url, collection, (new AuthenticationCredential username, password), options
exports.createOAuthClient = (url, collection, accessToken, options) -> new exports.Client url, collection, (new AuthenticationOAuth accessToken), options
exports.createWrapClient = (url, collection, accessToken, options) -> new exports.Client url, collection, (new AuthenticationWrap accessToken), options

exports.getToken = (clientAssertion, assertion, redirectUri, callback, tokenUri = vsoTokenUri) -> requestToken(clientAssertion, assertion, "urn:ietf:params:oauth:grant-type:jwt-bearer", redirectUri, callback, tokenUri)
exports.refreshToken = (clientAssertion, assertion, redirectUri, callback, tokenUri = vsoTokenUri) -> requestToken(clientAssertion, assertion, "refresh_token", redirectUri, callback, tokenUri)
exports.getWrapToken = (accountUrl, username, password, callback) -> requestWrapToken accountUrl, username, password, callback

class AuthenticationCredential
  constructor: (@username, @password) ->
    @type = "Credential"

class AuthenticationOAuth
  constructor: (@accessToken) ->
    @type = "OAuth"

class AuthenticationWrap
  constructor: (@accessToken) ->
    @type = "Wrap"


class exports.Client
  constructor: (@url, @collection, authentication, options) ->
    apiUrl = url
    @client = requestJson.newClient(apiUrl, options?.clientOptions)
    if (authentication is AuthenticationCredential || authentication.type == "Credential")
      @client.setBasicAuth authentication.username, authentication.password
    else if (authentication is AuthenticationOAuth || authentication.type == "OAuth")
      spsUrl = (options?.spsUri || spsUri)
      @clientSPS = requestJson.newClient(spsUrl, options?.clientOptions)
      @client.headers.Authorization = "bearer " + authentication.accessToken
      @clientSPS.headers.Authorization = "bearer " + authentication.accessToken
    else if (authentication is AuthenticationWrap || authentication.type == "Wrap")
      @client.headers.Authorization = "WRAP access_token=\"#{authentication.accessToken}\""
    else
      throw new Error "unknown authentication type"
    @_authType = authentication.type
    @apiVersion = options?.apiVersion || apiVersion

  parseReplyData: (error, res, body, callback) ->
    if error
      callback error, body
    else if @_authType == "OAuth" and res?.statusCode == 203
      callback "Error unauthorized. Check OAUth token", body
    else if res?.statusCode == 401 or (@_authType != "OAuth" and res?.statusCode == 203)
      callback "Error unauthorized", body
    else if res?.statusCode >= 500 && res?.statusCode < 600
      callback "Error call failed with HTTP Code " + res.statusCode, body
    else if (body.errorCode or body.errorCode is 0) and (body.message or body.typeKey)
      #console.log error, body
      err = 'Error ' + body.errorCode + ': '
      if body.message and body.message.length > 0
        err += body.message
      else
        err += body.typeKey
      #console.log err, body
      callback err, body
    else if body and body.value
      #console.log err, body
      callback error, body.value
    else if body and body.id
      callback error, body
    else if body and body.length > 0
      #console.log body
      callback 'Unknown Error', body
    else
      callback error, body


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

  setAccessToken : (acessToken) ->
    if (@_authType != "OAuth" and @_authType != "Wrap")
      throw new Error "can only set access token for OAuth or Wrap client"

    if @_authType is "OAuth"
      @client.headers.Authorization = "bearer #{acessToken}"
    else
      @client.headers.Authorization = "WRAP access_token=\"#{acessToken}\""

  setVersion : (version) ->
    @apiVersion = version

  checkAndRequireOAuth : (methodName) ->
    if (@_authType != "OAuth")
      throw new Error methodName + " can only be invoked with OAuth"

  buildApiPath : (path, params, options) ->
    basePath = ""
    unless options?.excludeCollection
      if options?.projectName
        basePath = '/'+ @collection + '/' + (encodeURI options.projectName)
      else
        basePath = '/' + @collection

    returnPath = basePath + '/_apis/' + path # + '?api-version=' + @apiVersion

    if params and params.length > 0
      if (params[0] != '?')
        params = '?' + params
      returnPath += params
    returnPath

  getOptions : (patch) ->
    options = { headers: {} }
    contentType = if patch and @apiVersion isnt '1.0-preview.1' then 'application/json-patch+json' else 'application/json'

    options.headers['accept'] = 'application/json; api-version=' + @apiVersion
    options.headers['content-type'] = contentType
    options.headers['user-agent'] = 'vso-client/1.0 node/' + process.versions.node + ' ' + process.platform
    options

  getPatchContentType : ->
    return 'application/json' if @apiVersion == "1.0-preview.1"

    return 'application/json-patch+json'

  encodeFolderPath : (folderParam) ->
    return "" unless folderParam

    "/" + (folderParam.split("/").map (e) -> encodeURI e).join("/")

  isGuid : (id) ->
    guidPattern = /// ^
      [0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
      $ ///i

    id.match guidPattern

  #########################################
  # Version validation
  #########################################

  getVersion = (version) ->
    dashPosition = version.indexOf("-")

    if(dashPosition != -1)
      return version.substring(0, dashPosition)

    return version

  getMinorVersion = (previewVersion) ->
    parts = previewVersion.split "."
    return parts[1] if parts.length > 1

    return "0"

  getVersionStage = (version) ->
    dashPosition = version.indexOf("-")

    if(dashPosition == - 1)
      return ""

    return version.substring dashPosition

  requireMinimumVersion : (version, requiredMinimumVersion) ->
    majorVersion = getVersion version
    majorRequiredVersion = getVersion requiredMinimumVersion

    # major defines everything. No preview parts
    return false if majorVersion < majorRequiredVersion
    return true if majorVersion > majorRequiredVersion

    previewVersion = getVersionStage version
    previewRequiredMinimumVersion = getVersionStage requiredMinimumVersion

    return majorVersion >= majorRequiredVersion if previewVersion == previewRequiredMinimumVersion == ""

    if previewVersion != "" and previewRequiredMinimumVersion != ""
      # major is equal. Just need to check preview minor
      return (getMinorVersion previewVersion) >= (getMinorVersion previewRequiredMinimumVersion)

    #  If we reach here we know majors are the same.
    return true if previewVersion == "" and previewRequiredMinimumVersion != ""

    return false

  checkAndRequireMinimumVersion: (minimumVersion) ->
    unless @requireMinimumVersion @apiVersion , minimumVersion
      throw new Error "this method requires at least @{minimumVersion)"

  #########################################
  # Projects and Teams
  #########################################

  getProjects: (stateFilter, pageSize, skip, callback) ->
    # valid stateFilter values: WellFormed, CreatePending, Deleting, New, All

    if typeof stateFilter is 'function'
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

    path = @buildApiPath 'projects', 'stateFilter=' + stateFilter + '&$top=' + pageSize + "&$skip=" + skip
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getProject: (projectId, includeCapabilities, callback) ->

    if typeof includeCapabilities is 'function'
      callback = includeCapabilities
      includeCapabilities = false

    includeCapabilities = includeCapabilities ? false

    path = @buildApiPath 'projects/' + projectId, 'includeCapabilities=' + includeCapabilities
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getProjectCollections: (pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0

    path = @buildApiPath 'projectcollections', '$top=' + pageSize + "&$skip=" + skip
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getProjectCollection: (collectionId, callback) ->

    path = @buildApiPath 'projectcollections/' + collectionId
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getTeams: (projectId, pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0

    path = @buildApiPath 'projects/' + projectId + '/teams', '$top=' + pageSize + '&$skip=' + skip
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getTeam: (projectId, teamId, callback) ->
    path = @buildApiPath 'projects/' + projectId + '/teams/' + teamId
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getTeamMembers: (projectId, teamId, pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0
    path = @buildApiPath 'projects/' + projectId + '/teams/' + teamId + '/members', '$top=' + pageSize + '&$skip=' + skip
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  #########################################
  # Tags
  #########################################

  getTags: (scope, includeInactive, callback) ->
    if typeof includeInactive is 'function'
      callback = includeInactive
      includeInactive = false

    path = @buildApiPath 'tagging/scopes/' + scope + '/tags', 'includeinactive=' + includeInactive
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getTag: (scope, tag, callback) ->
    tagId = encodeURI tag
    path = @buildApiPath 'tagging/scopes/' + scope + '/tags/' + tagId
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createTag: (scope, name, callback) ->
    tag =
      name: name
    path = @buildApiPath 'tagging/scopes/' + scope + '/tags'
    @client.post path, tag, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  updateTag: (scope, tagId, name, active, callback) ->
    tag =
      name: name
      active: active
    path = @buildApiPath 'tagging/scopes/' + scope + '/tags/' + tagId
    @client.patch path, tag, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  deleteTag: (scope, tag, callback) ->
    tagId = encodeURI tag
    path = @buildApiPath 'tagging/scopes/' + scope + '/tags/' + tagId
    @client.del path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  #########################################
  # Work Items
  #########################################

  getWorkItemIds: (wiql, projectName, callback) ->
    if typeof projectName is 'function'
      callback = projectName
      projectName = null

    # console.log query

    params = null

    if @apiVersion == "1.0-preview.1"
      query =
        wiql: wiql
      if projectName
        projectName = encodeURI projectName
        params = '@project=' + projectName
      path = @buildApiPath 'wit/queryresults', params
    else
      query =
        query: wiql
      if projectName
        path = @buildApiPath 'wit/wiql', params, { projectName : projectName }
      else
        path = @buildApiPath 'wit/wiql', params

    # console.log path, query

    @client.post path, query, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, (err, results) ->
        # console.log "Results", results
        if err
          callback err, results
        else
          if results && results.results
            ids = _.map results.results, 'sourceId'
          else
            ids = _.map results.workItems, 'id'
          callback err, ids

  getWorkItemIdsByQuery: (queryId, projectName, callback) ->
    if typeof projectName is 'function'
      callback = projectName
      projectName = null

    query =
      id: queryId

    # console.log query

    params = null
    if projectName
      projectName = encodeURI projectName
      params = '@project=' + projectName

    path = @buildApiPath 'wit/queryresults', params

    @client.post path, query, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, (err, results) ->
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

    path = @buildApiPath 'wit/workitems', params

    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItem: (id, expand, callback) ->
    if typeof expand is 'function'
      callback = expand
      expand = null

    params = null
    if expand
      params = '$expand=' + expand

    path = @buildApiPath 'wit/workitems/' + id, params
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createWorkItem: (item, projectName, workItemType, callback) ->
    if @apiVersion == "1.0-preview.1"
      callback = projectName unless callback?
      path = @buildApiPath 'wit/workitems'
      @client.post path, item, @getOptions(), (err, res, body) =>
        if err
          callback err, body
        else if res.statusCode == 400
          callback body.exception?.Message or "Error Creating work item", body
        else
          @parseReplyData err, res, body, callback
    else # 1.0-preview.2 or greater
      path = @buildApiPath "wit/workitems/$#{workItemType}", null, { projectName : projectName }

      @client.patch path, item, @getOptions(true), (err, res, body) =>
        if err
          callback err, body
        else if res.statusCode == 404
          callback body?.message || "Error Creating work item", body
        else
          @parseReplyData err, res, body, callback

  updateWorkItem: (id, operations, callback) ->
    path = @buildApiPath 'wit/workitems/' + id

    @client.patch path, operations, @getOptions(true), (err, res, body) =>
      if res?.statusCode == 404
        callback body?.message || "Error Creating work item", body
      else
      @parseReplyData err, res, body, callback

  updateWorkItems: (items, callback) ->
    path = @buildApiPath 'wit/workitems'

    @client.patch path, items, @getOptions(true), (err, res, body) =>
      if res?.statusCode == 404
        callback body?.message || "Error Creating work item", body
      else
      @parseReplyData err, res, body, callback

  getWorkItemUpdates: (id, pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    else if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0

    path = @buildApiPath 'wit/workitems/' + id + '/updates', '$top=' + pageSize + '&$skip=' + skip
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemUpdate: (id, rev, callback) ->
    path = @buildApiPath 'wit/workitems/' + id + '/updates/' + rev
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemRevision: (id, rev, callback) ->
    path = @buildApiPath 'wit/workitems/' + id + '/revisions/' + rev
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  uploadAttachment: (project, areaPath, fileName, file, callback) ->
    #For binary file, use base64 encoded string
    params = 'project=' + encodeURI project
    params += '&area=' + encodeURI areaPath
    params += '&filename=' + encodeURI fileName
    path = @buildApiPath 'wit/attachments', params
    @client.post path, file, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath 'wit/workitems/' + id
    @client.patch path, item, @getOptions(true), (err, res, body) =>
      @parseReplyData err, res, body, callback

  #########################################
  # Work Item Queries
  #########################################

  getQueries: (projectName, depth, expand, folderPath, includeDeleted, callback) ->
    if typeof depth is 'function'
      callback = depth
      depth = expand = folderPath = null
      includeDeleted = false
    else if typeof expand is 'function'
      callback = expand
      expand = folderPath = null
      includeDeleted = false
    else if typeof folderPath is 'function'
      callback = folderPath
      folderPath = null
      includeDeleted = false
    else if typeof includeDeleted is 'function'
      callback = includeDeleted
      includeDeleted = false

    folderPathParam = ""
    if @apiVersion == '1.0-preview.1'
      params = '&project=' + projectName
    else
      folderPathParam = @encodeFolderPath folderPath

    if depth
      params += '&$depth=' + depth
    if expand
      params += '&$expand=' + expand

    if @apiVersion == '1.0-preview.1'
      path = @buildApiPath 'wit/queries', params
    else
      if includeDeleted
        params = '&$includeDeleted=' + includeDeleted

    path = @buildApiPath 'wit/queries' + folderPathParam, params, { projectName : projectName }

    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getQuery: (projectName, queryOrFolderId, folderPath, callback) ->
    if typeof folderPath is 'function'
      callback = folderPath
      folderPath = null

    if @apiVersion == '1.0-preview.1'
      path = @buildApiPath 'wit/queries/' + queryOrFolderId
    else
      folderPathParam = @encodeFolderPath folderPath
      path = @buildApiPath 'wit/queries' + folderPathParam + '/' + queryOrFolderId, null, { projectName : projectName }

    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createQuery: (projectName, name, folderIdOrPath, wiql, callback) ->
    if @apiVersion == '1.0-preview.1'
      query =
        name: name
        parentId: folderIdOrPath
        wiql: wiql
      path = @buildApiPath 'wit/queries'
    else
      path = @buildApiPath 'wit/queries' + (@encodeFolderPath folderIdOrPath) , null, { projectName : projectName }
      query =
        name: name
        wiql: wiql

    @client.post path, query, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  updateQuery: (projectName, queryIdOrName, name, folderIdOrPath, wiql, callback) ->
    if @apiVersion == '1.0-preview.1'
      path = @buildApiPath 'wit/queries/' + queryId
      query =
        id: queryIdOrName
        name: name
        parentId: folderIdOrPath
        wiql: wiql
      path = @buildApiPath 'wit/queries'
    else
      path = if @isGuid queryIdOrName then @buildApiPath 'wit/queries/' + queryIdOrName , null, { projectName : projectName } else @buildApiPath 'wit/queries' + (@encodeFolderPath folderIdOrPath) + '/' + queryIdOrName , null, { projectName : projectName }
      # path = @buildApiPath 'wit/queries' + (@encodeFolderPath folderIdOrPath) + '/' + queryIdOrName , null, { projectName : projectName }
      query =
        name: name
        wiql: wiql

    @client.patch path, query, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createFolder: (projectName, name, parentFolderIdOrPath, callback) ->
    if @apiVersion == '1.0-preview.1'
      folder =
        name: name
        parentId: parentFolderIdOrPath
        type: "folder"
      path = @buildApiPath 'wit/queries'
    else
      path = @buildApiPath 'wit/queries' + (@encodeFolderPath parentFolderIdOrPath) , null, { projectName : projectName }
      folder =
        name: name
        isFolder: "true"

    @client.post path, folder, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  deleteQuery: (projectName, queryIdOrPath, callback) ->
    if @apiVersion == '1.0-preview.1'
      path = @buildApiPath 'wit/queries/' + queryIdOrPath
    else
      path = @buildApiPath 'wit/queries' + (@encodeFolderPath queryIdOrPath) , null, { projectName : projectName }

    @client.del path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  deleteFolder: (projectName, queryIdOrPath, callback) ->
    @deleteQuery projectName, queryIdOrPath, callback

  #########################################
  # Work Items V2 only
  #########################################

  getWorkItemTypes: (projectName, callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/workitemtypes', null, { projectName : projectName }
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemType: (projectName, workItemType, callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/workitemtypes/' + workItemType, null, { projectName : projectName }
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemRelationTypes: (callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/workitemrelationtypes'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemRelationType: (relationName, callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/workitemrelationtypes/' + relationName
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemCategories: (projectName, callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/workitemtypecategories', null, { projectName : projectName }
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemCategory: (projectName, categoryName, callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/workitemtypecategories/' + categoryName, null, { projectName : projectName }
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemFields: (callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/fields'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getWorkItemField: (referenceName, callback) ->
    @checkAndRequireMinimumVersion "1.0-preview.2"

    path = @buildApiPath 'wit/fields/' + referenceName
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback


  #########################################
  # Accounts and Profiles
  #########################################

  getAccounts: (memberId, callback) ->
    @checkAndRequireOAuth 'getAccounts'
    path = @buildApiPath 'accounts', 'memberid=' + memberId, { excludeCollection : true }
    @clientSPS.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback


  getCurrentProfile: (callback) ->
    @checkAndRequireOAuth "getCurrentProfile"
    path = @buildApiPath 'profile/profiles/me', null, {excludeCollection : true }
    @clientSPS.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getConnectionData: (callback) ->
    path = @buildApiPath 'connectionData'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback


  #########################################
  # Team Rooms
  #########################################

  getRooms: (callback) ->
    path = @buildApiPath 'chat/rooms'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getRoom: (roomId, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createRoom: (name, description, callback) ->
    path = @buildApiPath 'chat/rooms'
    room =
      name: name
      description: description
    @client.post path, room, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  updateRoom: (roomId, name, description, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId
    room =
      name: name
      description: description
    @client.patch path, room, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  deleteRoom: (roomId, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId
    @client.del path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getRoomUsers: (roomId, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId + '/users'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getRoomUser: (roomId, userId, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId + '/users/' + userId
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  joinRoom: (roomId, userId, userGuid, callback) ->
    # console.log userId
    path = @buildApiPath 'chat/rooms/' + roomId + '/users/' + userGuid
    @client.put path, @getOptions(), userId, (err, res, body) ->
      callback err, res.statusCode

  leaveRoom: (roomId, userId, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId + '/users/' + userId
    @client.del path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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

    path = @buildApiPath 'chat/rooms/' + roomId + '/messages', params
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getMessage: (roomId, messageId, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId + '/messages/' + messageId
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createMessage: (roomId, message, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId + '/messages'
    @client.post path, message, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  updateMessage: (roomId, messageId, message, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId + '/messages/' + messageId
    @client.patch path, null, @getOptions(), (err, res, body) =>
      # console.log res
      @parseReplyData err, res, body, callback

  deleteMessage: (roomId, messageId, callback) ->
    path = @buildApiPath 'chat/rooms/' + roomId + '/messages/' + messageId
    @client.del path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath 'tfvc/branches', p
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath 'tfvc/branches/' + path, p
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath 'tfvc/shelvesets', p
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath 'tfvc/changesets', p
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath 'tfvc/changesets/' + changesetId, p
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath url, p
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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
    path = @buildApiPath url, p
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getLabels: (queryOptions, callback) ->
    if typeof queryOptions is 'function'
      callback = queryOptions
      queryOptions = null

    params = []
    if queryOptions
      if queryOptions.name
        params.push 'name=' + queryOptions.name
      if queryOptions.owner
        params.push 'owner=' + queryOptions.owner
      if queryOptions.itemLabelFilter
        params.push 'itemlabelfilter=' + queryOptions.itemLabelFilter
      if queryOptions.pageSize
        params.push '$top=' + queryOptions.pageSize
      if queryOptions.skip
        params.push '$skip=' + queryOptions.skip

    p = params.join '&'
    path = @buildApiPath 'tfvc/labels', p
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getLabel: (labelId, maxItemCount, callback) ->
    if typeof maxItemCount is 'function'
      callback = maxItemCount
      maxItemCount = null
    params = 'maxitemcount=' + maxItemCount ? ''
    path = @buildApiPath 'tfvc/labels/' + labelId, params
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getItemsByLabel: (labelId, pageSize, skip, callback) ->
    if typeof pageSize is 'function'
      callback = pageSize
      pageSize = skip = null
    if typeof skip is 'function'
      callback = skip
      skip = null

    pageSize = pageSize ? 100
    skip = skip ? 0

    params = '$top=' + pageSize + '&$skip=' + skip
    path = @buildApiPath 'tfvc/labels/' + labelId + '/items', params
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  #########################################
  # Git Repositories
  #########################################

  getRepositories: (projectId, callback) ->
    path = ''
    if typeof projectId is 'function'
      callback = projectId
      projectId = null
    if projectId
      path = @buildApiPath 'git/' + projectId + '/repositories'
    else
      path = @buildApiPath 'git/repositories'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getRepository: (repositoryIdOrName, projectId, callback) ->
    path = ''
    if typeof projectId is 'function'
      callback = projectId
      projectId = null
    repo = encodeURI repositoryIdOrName
    if projectId
      path = @buildApiPath 'git/' + projectId + '/repositories/' + repo
    else
      path = @buildApiPath 'git/repositories/' + repo
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createRepository: (projectId, name, callback) ->
    repo =
      name: name
      project:
        id: projectId
    path = @buildApiPath 'git/repositories'
    @client.post path, repo, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  renameRepository: (repositoryId, name, callback) ->
    repo =
      id: repositoryId
      name: name
    path = @buildApiPath 'git/repositories/' + repositoryId
    @client.patch path, repo, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  deleteRepository: (repositoryId, callback) ->
    path = @buildApiPath 'git/repositories/' + repositoryId
    @client.del path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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

    path = @buildApiPath 'git/repositories/' + repositoryId + '/commits', params
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getCommit: (repositoryId, commitId, changeCount, callback) ->
    if typeof changeCount is 'function'
      callback = changeCount
      changeCount = 0

    path = @buildApiPath 'git/repositories/' + repositoryId + '/commits/' + commitId, 'changeCount=' + changeCount
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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

    path = @buildApiPath 'git/repositories/' + repositoryId + '/diffs/commits', params
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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

    path = @buildApiPath 'git/repositories/' + repositoryId + '/pushes', params
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

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

    path = @buildApiPath url, params.join '&'
    # console.log path
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getRefs: (repositoryId, filter, callback) ->
    if typeof filter is 'function'
      callback = filter
      filter = null

    url = 'git/repositories/' + repositoryId + '/refs'
    if filter
      url += '/' + filter

    path = @buildApiPath url
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  #########################################
  # Builds
  #########################################

  getBuildDefinitions: (callback) ->
    path = @buildApiPath 'build/definitions'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  queueBuild: (buildRequest, callback) ->
    path = @buildApiPath 'build/requests'
    @client.post path, buildRequest, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback


  #########################################
  # Service Hooks
  #########################################

  getPublishers: (callback) ->
    path = @buildApiPath 'hooks/publishers'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getConsumers: (callback) ->
    path = @buildApiPath 'hooks/consumers'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getConsumer: (consumerId, callback) ->
    path = @buildApiPath 'hooks/consumers/' + consumerId
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getConsumerActions: (consumerId, callback) ->
    path = @buildApiPath 'hooks/consumers/' + consumerId + '/actions'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getConsumerAction: (consumerId, action, callback) ->
    path = @buildApiPath 'hooks/consumers/' + consumerId + '/actions/' + action
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  getSubscriptions: (callback) ->
    path = @buildApiPath 'hooks/subscriptions'
    @client.get path, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  createSubscription: (subscription, callback) ->
    path = @buildApiPath 'hooks/subscriptions'
    @client.post path, subscription, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback

  querySubscriptions: (queryOptions, callback) ->
    path = @buildApiPath 'hooks/subscriptionsquery'
    @client.post path, queryOptions, @getOptions(), (err, res, body) =>
      @parseReplyData err, res, body, callback
