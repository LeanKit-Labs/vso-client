var mocha = require( 'mocha' ),
    should = require( 'should' ),
    _ = require( 'lodash' ),
    Client = require( '../public/vso-client' ),
    url = process.env.VSO_URL || 'https://your-account.visualstudio.com/',
    collection = process.env.VSO_COLLECTION || 'DefaultCollection',
    username = process.env.VSO_USER || 'your-username',
    password = process.env.VSO_PWD || 'your-password';

describe('VSO Client Tests', function(){
  this.timeout(20000);
  var client,
      fields = [
        { field: { id: -3, name: 'ID', refName: 'System.Id' }, value: 7 },
        { field: { id: -2, name: 'Area ID', refName: 'System.AreaId' }, value: 769 },
        { field: { id: -7, name: 'Area Path', refName: 'System.AreaPath' }, value: 'TFS Integration' },
        { field: { id: -12, name: 'Node Name', refName: 'System.NodeName' }, value: 'TFS Integration' },
        { field: { id: -42, name: 'Team Project', refName: 'System.TeamProject' }, value: 'TFS Integration' },
        { field: { id: -43, name: 'Area Level 1', refName: 'System.AreaLevel1' }, value: 'TFS Integration' },
        { field: { id: 8, name: 'Rev', refName: 'System.Rev' }, value: 20 }
      ];

  before(function(done){
    client = Client.createClient(url, collection, username, password);
    done();
  } );

  it ( 'should have a valid client', function() {
    should.exist(client);
    client.should.have.property('url');
    client.should.have.property('username');
    client.should.have.property('password');
    client.username.should.not.equal('your-username');
    client.password.should.not.equal('your-password');
    should.exist(client.client)
  } );

  it ( 'should return a field by name', function() {
    var field = client.findItemField(fields, 'System.Rev');
    should.exist(field);
    field.value.should.equal(20);
  } );

  it ( 'should return the first field by name', function() {
    var field = client.findFirstItemField(fields, ['Bogus', 'System.Rev', 'System.Id']);
    should.exist(field);
    field.value.should.equal(20);
    field.field.name.should.equal('Rev');
  } );

  describe('Project tests', function() {
    var testProject = null,
        testCollection = null,
        testTeam = null,
        tagName = null,
        testTag = null;

    before(function(done){
      tagName = 'testTag-' + (Math.random() + 1).toString(36).substring(7);
      done();
    } );

    // ---------------------------------------
    // Projects
    // ---------------------------------------

    it( 'should return a list of projects', function(done) {
      client.getProjects(function(err, projects){
        should.not.exist(err);
        should.exist(projects);
        // console.log(projects);
        projects.length.should.be.above(0);
        var project = projects[0];
        project.should.have.property('id');
        project.should.have.property('name');
        project.should.have.property('url');
        should.exist(project.collection);
        should.exist(project.defaultTeam);
        testProject = project;
        done();
      } );
    } );

    it( 'should return only one project', function(done) {
      client.getProjects(false, null, 1, 0, function(err, projects){
        should.not.exist(err);
        should.exist(projects);
        // console.log(projects);
        projects.length.should.equal(1);
        var project = projects[0];
        project.should.have.property('id');
        project.should.have.property('name');
        project.should.have.property('url');
        should.exist(project.collection);
        should.exist(project.defaultTeam);
        done();
      } );
    } );

    it( 'should return project capabilities', function(done) {
      client.getProjects(true, function(err, projects){
        should.not.exist(err);
        should.exist(projects);
        // console.log(projects);
        projects.length.should.be.above(0);
        var project = projects[0];
        project.should.have.property('capabilities');
        project.capabilities.should.be.instanceOf(Object);
        for(var i = 0; i < projects.length; i++) {
          console.log(projects[i], projects[i].capabilities);
        }
        done();
      } );
    } );

    it ( 'should retrieve a project by id', function(done) {
      should.exist(testProject);
      client.getProject(testProject.id, false, function(err, project) {
        if (err) {
          console.log(err);
          console.log(project);
        }
        should.not.exist(err);
        should.exist(project);
        // console.log(project);
        project.should.have.property('id');
        project.should.have.property('name');
        project.should.have.property('url');
        should.exist(project.collection);
        should.exist(project.defaultTeam);
        done();
      } );
    } );

    // ---------------------------------------
    // Project Teams
    // ---------------------------------------

    it ( 'should retrieve teams by project id', function(done) {
      should.exist(testProject);
      client.getTeams(testProject.id, function(err, teams) {
        if (err) {
          console.log(err);
          console.log(teams);
        }
        should.not.exist(err);
        should.exist(teams);
        // console.log(teams);
        teams.length.should.be.above(0);
        var team = teams[0];
        team.should.have.property('id');
        team.should.have.property('name');
        team.should.have.property('url');
        team.should.have.property('description');
        team.should.have.property('identityUrl');
        testTeam = team;
        done();
      } );
    } );

    it ( 'should retrieve a team by project and team id', function(done) {
      should.exist(testProject);
      should.exist(testTeam);
      client.getTeam(testProject.id, testTeam.id, function(err, team) {
        if (err) {
          console.log(err);
          console.log(team);
        }
        should.not.exist(err);
        should.exist(team);
        team.should.have.property('id');
        team.should.have.property('name');
        team.should.have.property('url');
        team.should.have.property('description');
        team.should.have.property('identityUrl');
        done();
      } );
    } );

    it ( 'should retrieve team members by project and team id', function(done) {
      should.exist(testProject);
      should.exist(testTeam);
      client.getTeamMembers(testProject.id, testTeam.id, function(err, members) {
        if (err) {
          console.log(err);
          console.log(members);
        }
        should.not.exist(err);
        should.exist(members);
        // console.log(members);
        members.length.should.be.above(0);
        var member = members[0];
        member.should.have.property('id');
        member.should.have.property('displayName');
        member.should.have.property('uniqueName');
        member.should.have.property('url');
        member.should.have.property('imageUrl');
        done();
      } );
    } );

    // ---------------------------------------
    // Collections
    // ---------------------------------------

    it( 'should return a list of project collections', function(done) {
      client.getProjectCollections(function(err, collections){
        should.not.exist(err);
        should.exist(collections);
        // console.log(collections);
        collections.length.should.be.above(0);
        var collection = collections[0];
        collection.should.have.property('id');
        collection.should.have.property('name');
        collection.should.have.property('url');
        collection.should.have.property('collectionUrl');
        collection.should.have.property('state');
        testCollection = collection;
        done();
      } );
    } );

    it( 'should return a project collection by id', function(done) {
      should.exist(testCollection);
      client.getProjectCollection(testCollection.id, function(err, collection){
        should.not.exist(err);
        should.exist(collection);
        collection.should.have.property('id');
        collection.should.have.property('name');
        collection.should.have.property('url');
        collection.should.have.property('collectionUrl');
        collection.should.have.property('state');
        done();
      } );
    } );

    // ---------------------------------------
    // Tags
    // ---------------------------------------

    it ( 'should create a tag', function(done) {
      should.exist(testProject);
      client.createTag(testProject.id, tagName, function(err, tag){
        if (err) {
          console.log(err);
          console.log(tag);
        }
        should.not.exist(err);
        should.exist(tag);
        // console.log(tag);
        testTag = tag;
        done();
      } );
    } );

    it ( 'should update a tag', function(done) {
      should.exist(testProject);
      should.exist(testTag);
      client.updateTag(testProject.id, testTag.id, tagName + '-updated', true, function(err, tag) {
        if (err) {
          console.log(err);
          console.log(tag);
        }
        should.not.exist(err);
        should.exist(tag);
        // console.log(tag);
        done();
      } );
    } );

    it ( 'should retrieve tags by project id', function(done) {
      should.exist(testProject);
      // Work-around, tags don't always immediately appear after being created
      setTimeout(function(done) {
        client.getTags(testProject.id, true, function(err, tags) {
          if (err) {
            console.log(err);
            console.log(tags);
          }
          should.not.exist(err);
          should.exist(tags);
          // console.log(tags);
          tags.length.should.be.above(0);
          if (tags.length > 0) {
            var tag = tags[0];
            tag.should.have.property('id');
            tag.should.have.property('name');
            tag.should.have.property('active');
            tag.should.have.property('url');
          }
          done();
        } );
      } , 5000, done );
    } );

    it ( 'should delete a tag', function(done) {
      should.exist(testProject);
      should.exist(testTag);
      client.deleteTag(testProject.id, testTag.id, function(err, tag) {
        if (err) {
          console.log(err);
          console.log(tag);
        }
        should.not.exist(err);
        should.exist(tag);
        // console.log(tag);
        done();
      } );
    } );

    // ---------------------------------------
    // Queries
    // ---------------------------------------

    var myQueries = testQuery = testFolder = null;

    it ('should return a list of queries', function(done) {
      should.exist(testProject);
      client.getQueries(testProject.name, function(err, queries) {
        if (err) {
          console.log(err);
          console.log(queries);
        }
        should.not.exist(err);
        should.exist(queries);
        // console.log(queries);
        queries.length.should.be.above(0);
        var folder = _.find(queries, function(q){
          return q.name === 'My Queries';
        });
        should.exist(folder);
        myQueries = folder;
        var sharedFolder = _.find(queries, function(q){
          return q.name === 'Shared Queries';
        });
        should.exist(sharedFolder);
        sharedFolder.value.should.be.instanceOf(Array);
        sharedFolder.value.length.should.be.above(0);
        // console.log(sharedFolder);
        var query = _.find(sharedFolder.value, function(q) {
          return q.name === 'My Tasks';
        });
        should.exist(query);
        // console.log(query);
        query.should.have.property('name');
        query.should.have.property('type');
        query.should.have.property('id');
        query.should.have.property('url');
        query.should.have.property('parentId');
        query.project.should.be.instanceOf(Object);
        testQuery = query;
        done();
      } );
    } );

    it ( 'should return a list of work items from saved query', function(done) {
      should.exist(testQuery);
      client.getWorkItemIdsByQuery(testQuery.id, function(err, ids) {
        if (err) {
          console.log(err);
          console.log(ids);
        }
        ids.should.be.instanceOf(Array);
        ids.length.should.be.above(0);
        // console.log(ids);
        done();
      } );
    } );

    it ('should return a query', function(done) {
      should.exist(testQuery);
      client.getQuery(testQuery.id, function(err, query){
        if (err) {
          console.log(err);
          console.log(query);
        }
        should.not.exist(err);
        should.exist(query);
        // console.log(query);
        query.should.have.property('name');
        query.should.have.property('type');
        query.should.have.property('id');
        query.should.have.property('url');
        query.project.should.be.instanceOf(Object);
        done();
      } );
    } );

    it ('should should create a query folder', function(done) {
      should.exist(myQueries);
      client.createFolder('testFolder1', myQueries.id, function(err, folder){
        should.not.exist(err);
        should.exist(folder);
        folder.should.have.property('id');
        testFolder = folder;
        done();
      } );
    } );

    it ('should should create a query', function(done) {
      should.exist(testFolder);

      var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';

      client.createQuery('testQuery1', testFolder.id, wiql, function(err, query){
        should.not.exist(err);
        should.exist(query);
        // console.log(query);
        query.should.have.property('id');
        query.should.have.property('url');
        testQuery = query;
        done();
      } );
    } );

    it ('should should update a query', function(done) {
      should.exist(testFolder);
      should.exist(testQuery);

      var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] asc';

      client.updateQuery(testQuery.id, 'testQuery1-updated', testFolder.id, wiql, function(err, query){
        should.not.exist(err);
        should.exist(query);
        // console.log(query);
        query.should.have.property('id');
        query.should.have.property('url');
        testQuery = query;
        done();
      } );
    } );

    it ('should should delete a query', function(done) {
      should.exist(testQuery);
      client.deleteQuery(testQuery.id, function(err, query){
        should.not.exist(err);
        should.exist(query);
        done();
      } );
    } );

    it ('should should delete a query folder', function(done) {
      should.exist(testFolder);
      client.deleteFolder(testFolder.id, function(err, folder){
        should.not.exist(err);
        should.exist(folder);
        done();
      } );
    } );

  } );

  describe('Work Item Tests', function() {
    var testItemIds = testItemIdArray =  testItemId = null;

    // ---------------------------------------
    // Work Item Queries
    // ---------------------------------------

    it ( 'should return a list of work items from wiql query', function(done) {
      var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Task\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';
      client.getWorkItemIds(wiql, 'TFS Integration', function(err, ids) {
        if (err) {
          console.log(err);
          console.log(ids);
        }
        should.not.exist(err);
        should.exist(ids);
        // console.log(ids);
        ids.should.be.instanceOf(Array);
        ids.length.should.be.above(1);
        testItemIdArray = ids;
        testItemIds = ids.join(',');
        testItemId = ids[0];
        done();
      } );
    } );

    it ( 'should return a list of work items by comma-separated id list', function(done) {
      // client.getWorkItemsById(testItemIds, 'System.Title,System.WorkItemType,System.State', null, null, function(err, items) {
      client.getWorkItemsById(testItemIds, null, null, null, function(err, items) {
        if (err) {
          console.log(err);
          console.log(items);
        }
        should.not.exist(err);
        should.exist(items);
        // console.log(items);
        items.length.should.be.above(0);
        var item = items[0];
        // console.log(item);
        item.should.have.property('id');
        item.should.have.property('rev');
        item.should.have.property('url');
        item.should.have.property('webUrl');
        item.should.have.property('updatesUrl');
        should.exist(item.fields);
        item.fields.length.should.be.above(0);
        // console.log(item.fields);
        done();
      } );
    } );

    it ('should return a list of work items by array of ids', function(done) {
      client.getWorkItemsById(testItemIdArray, null, null, null, function(err, items) {
        if (err) {
          console.log(err);
          console.log(items);
        }
        should.not.exist(err);
        should.exist(items);
        // console.log(items);
        items.length.should.equal(testItemIdArray.length);
        var item = items[0];
        // console.log(item);
        item.should.have.property('id');
        item.should.have.property('rev');
        item.should.have.property('url');
        item.should.have.property('webUrl');
        item.should.have.property('updatesUrl');
        should.exist(item.fields);
        item.fields.length.should.be.above(0);
        // console.log(item.fields);
        done();
      } );
    } );

    it ('should return a list of work items by ids with expanded links', function(done) {
      client.getWorkItemsById(testItemIds, null, null, 'all', function(err, items) {
        if (err) {
          console.log(err);
          console.log(items);
        }
        should.not.exist(err);
        should.exist(items);
        // console.log(items);
        items.length.should.be.above(0);
        var item = _.find(items, function(i){
          return i.links;
        });
        if (item) {
          // console.log(item);
          item.should.have.property('id');
          item.should.have.property('rev');
          item.should.have.property('url');
          item.should.have.property('webUrl');
          item.should.have.property('updatesUrl');
          should.exist(item.fields);
          item.fields.length.should.be.above(0);
          should.exist(item.links);
          item.links.length.should.be.above(0);
          testItemId = item.id;
          // console.log(item.links);
        }
        done();
      } );
    } );

    it ('should return a work item by id', function(done) {
      client.getWorkItem(testItemId, 'all', function(err, item) {
      //client.getWorkItem(7, 'all', function(err, item) {
        if (err) {
          console.log(err);
          console.log(item);
        }
        should.not.exist(err);
        should.exist(item);
        // console.log(item);
        item.should.have.property('id');
        item.should.have.property('rev');
        item.should.have.property('url');
        item.should.have.property('webUrl');
        item.should.have.property('updatesUrl');
        should.exist(item.fields);
        item.fields.length.should.be.above(0);
        should.exist(item.links);
        item.links.length.should.be.above(0);
        // console.log(item.links);
        done();
      } );
    } );

    it ('should return work item updates', function(done) {
      client.getWorkItemUpdates(testItemId, function(err, updates) {
        if (err) {
          console.log(err);
          console.log(updates);
        }
        should.not.exist(err);
        should.exist(updates);
        // console.log(updates);
        updates.length.should.be.above(0);
        var update = updates[updates.length-1];
        update.should.have.property('url');
        update.should.have.property('revisionUrl');
        update.should.have.property('id');
        update.should.have.property('rev');
        should.exist(update.fields);
        // console.log(update.fields);
        update.fields.length.should.be.above(0);
        done();
      } );
    } );

    it ('should return a page of work item updates', function(done) {
      client.getWorkItemUpdates(testItemId, 2, 2, function(err, updates) {
        if (err) {
          console.log(err);
          console.log(updates);
        }
        should.not.exist(err);
        should.exist(updates);
        // console.log(updates);
        updates.length.should.equal(2);
        updates[0].rev.should.be.above(2)
        done();
      } );
    } );

    it ('should return a work item update by revision number', function(done) {
      client.getWorkItemUpdate(testItemId, 4, function(err, update) {
        if (err) {
          console.log(err);
          console.log(update);
        }
        should.not.exist(err);
        should.exist(update);
        // console.log(update);
        update.should.have.property('url');
        update.should.have.property('revisionUrl');
        update.should.have.property('id');
        update.should.have.property('rev');
        should.exist(update.fields);
        done();
      } );
    } );

    it ('should return a work item by revision number', function(done) {
      client.getWorkItemRevision(testItemId, 4, function(err, item) {
        if (err) {
          console.log(err);
          console.log(item);
        }
        should.not.exist(err);
        should.exist(item);
        // console.log(item);
        item.should.have.property('id');
        item.should.have.property('rev');
        item.should.have.property('url');
        item.should.have.property('webUrl');
        should.exist(item.fields);
        item.fields.length.should.be.above(0);
        done();
      } );
    } );

  } );

  describe.skip('Accounts and Profiles Tests', function(){
    it ('should return the current profile', function(done) {
      client.getCurrentProfile(function(err, profile){
        should.not.exist(err);
        should.exist(profile);
        console.log(profile);
        done();
      } );
    } );
  } );

  describe.skip('Team Room tests', function() {
    it ( 'should return a list of team rooms', function(done) {
      client.getRooms(function(err, rooms){
        should.not.exist(err);
        should.exist(rooms);
        console.log(rooms);
        done();
      } );
    } );
  } );

  describe.only('Git repository tests', function() {
    var testRepoName = testRepository = testProject = null;

    before(function(done){
      testRepoName = 'testRepo-' + (Math.random() + 1).toString(36).substring(7);
      client.getProjects(true, function(err, projects) {
        if (projects && projects.length > 0) {
          testProject = _.find(projects, function(p) {
            return p.capabilities.versioncontrol.sourceControlType === 'Git';
          } );
        }
        done();
      } );
    } );

    it ( 'should create a git repository', function(done) {
      if (testProject) {
        client.createRepository(testProject.id, testRepoName, function(err, repository) {
          should.not.exist(err);
          should.exist(repository);
          testRepository = repository;
          // console.log(repository);
          done();
        } );
      } else {
        console.log('Warning: missing test project')
        done();
      }
    } );

    it ( 'should return a list of repositories', function(done) {
      client.getRepositories(function(err, repositories){
        should.not.exist(err);
        should.exist(repositories);
        // console.log(repositories);
        if (repositories.length > 0) {
          var repository = repositories[0];
          repository.should.have.property('id');
          repository.should.have.property('name');
          repository.should.have.property('remoteUrl');
          repository.project.should.be.instanceOf(Object);
        }
        done();
      } );
    } );

    it ( 'should return a list of repositories by project', function(done) {
      if (testProject) {
        client.getRepositories(testProject.id, function(err, repositories){
          should.not.exist(err);
          should.exist(repositories);
          repositories.length.should.be.above(0);
          done();
        } );
      } else {
        console.log('Warning: missing test project')
        done();
      }
    } );

    it ( 'should return a repository by id', function(done) {
      if (testRepository) {
        client.getRepository(testRepository.id, function(err, repository){
          should.not.exist(err);
          should.exist(repository);
          repository.should.have.property('id');
          repository.should.have.property('name');
          repository.should.have.property('remoteUrl');
          repository.project.should.be.instanceOf(Object);
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

    it ( 'should return a repository by name', function(done) {
      if (testRepository) {
        client.getRepository(testRepository.name, testProject.id, function(err, repository){
          should.not.exist(err);
          should.exist(repository);
          repository.should.have.property('id');
          repository.should.have.property('name');
          repository.should.have.property('remoteUrl');
          repository.project.should.be.instanceOf(Object);
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

    it ( 'should rename a repository', function(done) {
      if (testRepository) {
        client.renameRepository(testRepository.id, testRepository.name + '-update', function(err, repository){
          should.not.exist(err);
          should.exist(repository);
          repository.should.have.property('id');
          repository.should.have.property('name');
          repository.should.have.property('remoteUrl');
          repository.project.should.be.instanceOf(Object);
          repository.name.should.equal(testRepository.name + '-update');
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

    it ( 'should delete a repository', function(done) {
      if (testRepository) {
        client.deleteRepository(testRepository.id, function(err, repository){
          should.not.exist(err);
          should.exist(repository);
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

  } );

} );
