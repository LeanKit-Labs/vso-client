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
        // for(var i = 0; i < projects.length; i++) {
        //   console.log(projects[i]);
        // }
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

  describe('Version Control tests', function() {

    // ---------------------------------------
    // Version Control
    // ---------------------------------------

    it ( 'should return root branches', function(done) {
      client.getRootBranches(function(err, branches) {
        if (err) {
          console.log(err, branches);
        }
        should.not.exist(err);
        should.exist(branches);
        // console.log(branches);
        done();
      } );
    } );

    it.skip ( 'should return a branch', function(done) {
      var path = '$/TestProject';
      client.getBranch(path, true, true, true, function(err, branch) {
        if (err) {
          console.log(err, branch);
        }
        should.not.exist(err);
        should.exist(branch);
        // console.log(branch);
        done();
      } );
    } );

    it ( 'should return shelvesets', function(done) {
      client.getShelveSets(function(err, shelvesets) {
        if (err) {
          console.log(err, shelvesets);
        }
        should.not.exist(err);
        should.exist(shelvesets);
        // console.log(shelvesets);
        done();
      } );
    } );

    var testCommitId = testChangeSet = null;

    it ( 'should return changesets', function(done) {
      client.getChangeSets(function(err, changesets) {
        if (err) {
          console.log(err, changesets);
        }
        should.not.exist(err);
        should.exist(changesets);
        // console.log(changesets);
        changesets.should.be.instanceOf(Array);
        changesets.length.should.be.above(0);
        var changeset = changesets[0];
        changeset.should.have.property('changesetId');
        changeset.should.have.property('url');
        changeset.should.have.property('createdDate');
        changeset.should.have.property('comment');
        changeset.author.should.be.instanceOf(Object);
        changeset.checkedInBy.should.be.instanceOf(Object);
        testCommitId = changeset.changesetId;
        done();
      } );
    } );

    it ( 'should return a changeset by id', function(done) {
      if (testCommitId) {
        client.getChangeSet(testCommitId, function(err, changeset) {
          if (err) {
            console.log(err, changeset);
          }
          should.not.exist(err);
          should.exist(changeset);
          // console.log(changeset);
          changeset.should.have.property('changesetId');
          changeset.should.have.property('url');
          changeset.should.have.property('createdDate');
          changeset.should.have.property('comment');
          changeset.author.should.be.instanceOf(Object);
          changeset.checkedInBy.should.be.instanceOf(Object);
          testChangeSet = changeset;
          done();
        } );
      } else {
        console.log('Warning: no test change set');
        done();
      }
    } );

    it ( 'should return changsets from range of IDs', function(done) {
      if (testChangeSet) {
        var toId = testChangeSet.changesetId;
        var fromId = toId - 2;
        var expectedCount = 3;
        if (fromId < 1) {
          fromId = 1;
          expectedCount = toId - fromId + 1;
        }
        var queryOptions = {
          fromId: fromId,
          toId: testChangeSet.changesetId
        };
        client.getChangeSets(queryOptions, function(err, changesets) {
          if (err) {
            console.log(err, changesets);
          }
          should.not.exist(err);
          should.exist(changesets);
          // console.log(changesets);
          changesets.should.be.instanceOf(Array);
          changesets.length.should.equal(expectedCount);
          var changeset = changesets[0];
          changeset.should.have.property('changesetId');
          changeset.should.have.property('url');
          changeset.should.have.property('createdDate');
          changeset.should.have.property('comment');
          changeset.author.should.be.instanceOf(Object);
          changeset.checkedInBy.should.be.instanceOf(Object);
          done();
        } );
      } else {
        console.log('Warning: no test change set');
        done();
      }
    } );

    it ( 'should return a changeset by id with details', function(done) {
      if (testCommitId) {
        var queryOptions = {
          includeDetails: true,
          includeWorkItems: false,
          maxChangeCount: 0,
          maxCommentLength: 1000
        };
        client.getChangeSet(testCommitId, queryOptions, function(err, changeset) {
          if (err) {
            console.log(err, changeset);
          }
          should.not.exist(err);
          should.exist(changeset);
          // console.log(changeset);
          changeset.checkinNotes.should.be.instanceOf(Array);
          changeset.policyOverride.should.be.instanceOf(Object);
          done();
        } );
      } else {
        console.log('Warning: no test change set');
        done();
      }
    } );

    it ( 'should return a changeset by id with work items', function(done) {
      if (testCommitId) {
        var queryOptions = {
          includeDetails: false,
          includeWorkItems: true,
          maxChangeCount: 0,
          maxCommentLength: 1000
        };
        client.getChangeSet(testCommitId, queryOptions, function(err, changeset) {
          if (err) {
            console.log(err, changeset);
          }
          should.not.exist(err);
          should.exist(changeset);
          // console.log(changeset);
          changeset.workItems.should.be.instanceOf(Array);
          done();
        } );
      } else {
        console.log('Warning: no test change set');
        done();
      }
    } );

    it.skip ( 'should return latest changeset changes', function(done) {
      client.getChangeSetChanges(function(err, changes) {
        if (err) {
          console.log(err, changes);
        }
        should.not.exist(err);
        should.exist(changes);
        // console.log(changes);
        changes.should.be.instanceOf(Array);
        done();
      } );
    } );

    it ( 'should return changes for a changeset by id', function(done) {
      if (testCommitId) {
        var queryOptions = {
          id: testCommitId
        };
        client.getChangeSetChanges(queryOptions, function(err, changes) {
        if (err) {
          console.log(err, changes);
        }
        should.not.exist(err);
        should.exist(changes);
        // console.log(changes);
        changes.should.be.instanceOf(Array);
        done();
        } );
      } else {
        console.log('Warning: no test change set');
        done();
      }
    } );

    it.skip ( 'should return latest changeset work items', function(done) {
      client.getChangeSetWorkItems(function(err, workitems) {
        if (err) {
          console.log(err, workitems);
        }
        should.not.exist(err);
        should.exist(workitems);
        // console.log(workitems);
        workitems.should.be.instanceOf(Array);
        done();
      } );
    } );

    it ( 'should return work items for a changeset by id', function(done) {
      if (testCommitId) {
        var queryOptions = {
          id: testCommitId
        };
        client.getChangeSetWorkItems(queryOptions, function(err, workitems) {
        if (err) {
          console.log(err, workitems);
        }
        should.not.exist(err);
        should.exist(workitems);
        // console.log(workitems);
        workitems.should.be.instanceOf(Array);
        done();
        } );
      } else {
        console.log('Warning: no test change set');
        done();
      }
    } );

    it ( 'should get a list of labels', function(done) {
      client.getLabels(function(err, labels) {
        if (err) {
          console.log(err, labels);
        }
        should.not.exist(err);
        should.exist(labels);
        // console.log(labels);
        labels.should.be.instanceOf(Array);
        done();
      } );
    } );
  } );

  describe('Git repository tests', function() {

    // ---------------------------------------
    // Git Repositories
    // ---------------------------------------

    var testRepoName = testRepository = testProject = testCommit = null;

    before(function(done){
      testRepoName = 'testRepo-' + (Math.random() + 1).toString(36).substring(7);
      client.getProjects(true, function(err, projects) {
        // Find a project that uses git
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

    it ( 'should get a list of commits', function(done) {
      if (testProject) {
        client.getRepositories(testProject.id, function(err, repositories){
          should.not.exist(err);
          should.exist(repositories);
          if (repositories.length > 0) {
            var repository = repositories[0];
            testRepository = repository;
            client.getCommits(repository.id, function(err, commits){
              should.not.exist(err);
              should.exist(commits);
              commits.should.be.instanceOf(Array);
              if (commits.length > 0) {
                var commit = commits[0];
                commit.should.have.property('commitId');
                commit.should.have.property('comment');
                commit.should.have.property('url');
                commit.author.should.be.instanceOf(Object);
                commit.committer.should.be.instanceOf(Object);
                commit.changeCounts.should.be.instanceOf(Object);
                testCommit = commit;
              }
              // console.log(commits);
              done();
            });
          } else {
            conosole.log('Warning: no repositories in project', testProject);
            done();
          }
        } );
      } else {
        console.log('Warning: missing test project')
        done();
      }
    } );

    it ( 'should get a list of commits by author', function(done) {
      if (testRepository && testCommit) {
        client.getCommits(testRepository.id, null, null, testCommit.author.name, function(err, commits) {
          should.not.exist(err);
          should.exist(commits);
          commits.should.be.instanceOf(Array);
          commits.length.should.be.above(0);
          done();
        } );
      } else {
        console.log('Warning: missing test repository and commit')
        done();
      }
    } );

    it ( 'should get a commit by id', function(done) {
      if (testRepository && testCommit) {
        client.getCommit(testRepository.id, testCommit.commitId, function(err, commit) {
          should.not.exist(err);
          should.exist(commit);
          commit.parents.should.be.instanceOf(Array);
          commit.should.have.property('treeId');
          commit.push.should.be.instanceOf(Object);
          commit.should.have.property('commitId');
          commit.should.have.property('comment');
          commit.should.have.property('url');
          commit.author.should.be.instanceOf(Object);
          commit.committer.should.be.instanceOf(Object);
          should.not.exist(commit.changes);
          // console.log(commit);
          done();
        } );
      } else {
        console.log('Warning: missing test repository and commit')
        done();
      }
    } );

    it ( 'should get a commit by id with changed items', function(done) {
      if (testRepository && testCommit) {
        client.getCommit(testRepository.id, testCommit.commitId, 10, function(err, commit) {
          should.not.exist(err);
          should.exist(commit);
          // console.log(commit);
          commit.changes.should.be.instanceOf(Array);
          commit.changeCounts.should.be.instanceOf(Object);
          done();
        } );
      } else {
        console.log('Warning: missing test repository and commit')
        done();
      }
    } );

    it ( 'should get a list of commit diffs', function(done) {
      if (testRepository) {
        client.getDiffs(testRepository.id, null, 'master', null, 'develop', function(err, diffs) {
          should.not.exist(err);
          should.exist(diffs);
          diffs.should.have.property('allChangesIncluded');
          diffs.changes.should.be.instanceOf(Array);
          diffs.should.have.property('commonCommit');
          diffs.should.have.property('aheadCount');
          diffs.should.have.property('behindCount');
          // console.log(diffs);
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

    it ( 'should get a list of pushes', function(done) {
      if (testRepository) {
        client.getPushes(testRepository.id, function(err, pushes) {
          should.not.exist(err);
          should.exist(pushes);
          pushes.should.be.instanceOf(Array);
          pushes.length.should.be.above(0);
          // console.log(pushes);
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

    it ( 'should get stats for repository', function(done) {
      if (testRepository) {
        client.getStats(testRepository.id, function(err, stats) {
          should.not.exist(err);
          should.exist(stats);
          stats.should.be.instanceOf(Array);
          stats.length.should.be.above(0);
          // console.log(stats);
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

    it ( 'should get refs for repository', function(done) {
      if (testRepository) {
        client.getRefs(testRepository.id, function(err, refs) {
          should.not.exist(err);
          should.exist(refs);
          refs.should.be.instanceOf(Array);
          refs.length.should.be.above(0);
          // console.log(refs);
          var ref = refs[0];
          ref.should.have.property('name');
          ref.should.have.property('objectId');
          ref.should.have.property('url');
          done();
        } );
      } else {
        console.log('Warning: missing test repository')
        done();
      }
    } );

  } );

  describe('Service Hook tests', function() {

    // ---------------------------------------
    // Service Hooks
    // ---------------------------------------

    it ( 'should get a list of publishers', function(done) {
      client.getConsumers(function(err, publishers) {
        if (err) console.log(err, publishers);
        should.not.exist(err);
        should.exist(publishers);
        // console.log(publishers);
        publishers.should.be.instanceOf(Array);
        var publisher = _.find(publishers, function(c) {
          return c.id === 'webHooks';
        } );
        should.exist(publisher);
        // console.log(publisher);
        // console.log(publisher.actions[0].inputDescriptors);
        publisher.should.have.property('id');
        publisher.should.have.property('url');
        publisher.should.have.property('name');
        publisher.should.have.property('description');
        publisher.should.have.property('informationUrl');
        publisher.should.have.property('authenticationType');
        publisher.inputDescriptors.should.be.instanceOf(Array);
        publisher.actions.should.be.instanceOf(Array);
        done();
      } );
    } );

    it ( 'should get a list of consumers', function(done) {
      client.getConsumers(function(err, consumers) {
        if (err) console.log(err, consumers);
        should.not.exist(err);
        should.exist(consumers);
        // console.log(consumers);
        consumers.should.be.instanceOf(Array);
        var zendesk = _.find(consumers, function(c) {
          return c.id === 'zendesk';
        } );
        should.exist(zendesk);
        // console.log(zendesk);
        zendesk.should.have.property('id');
        zendesk.should.have.property('url');
        zendesk.should.have.property('name');
        zendesk.should.have.property('description');
        zendesk.should.have.property('informationUrl');
        zendesk.should.have.property('authenticationType');
        zendesk.inputDescriptors.should.be.instanceOf(Array);
        zendesk.actions.should.be.instanceOf(Array);
        done();
      } );
    } );

    it ( 'should get a consumer by id', function(done) {
      client.getConsumer('zapier', function(err, consumer) {
        if (err) console.log(err, consumer);
        should.not.exist(err);
        should.exist(consumer);
        // console.log(consumer);
        consumer.should.have.property('id');
        consumer.should.have.property('url');
        consumer.should.have.property('name');
        consumer.should.have.property('description');
        consumer.should.have.property('informationUrl');
        consumer.should.have.property('authenticationType');
        consumer.inputDescriptors.should.be.instanceOf(Array);
        consumer.actions.should.be.instanceOf(Array);
        done();
      } );
    } );

    it ( 'should get a list of consumer actions by id', function(done) {
      client.getConsumerActions('zapier', function(err, actions) {
        if (err) console.log(err, actions);
        should.not.exist(err);
        should.exist(actions);
        // console.log(actions);
        actions.should.be.instanceOf(Array);
        actions.length.should.be.above(0);
        var action = actions[0];
        // console.log(action);
        action.should.have.property('id');
        action.should.have.property('consumerId');
        action.should.have.property('url');
        action.should.have.property('name');
        action.should.have.property('description');
        action.inputDescriptors.should.be.instanceOf(Array);
        action.supportedEventTypes.should.be.instanceOf(Array);
        done();
      } );
    } );

    it ( 'should get a list of consumer action by id', function(done) {
      client.getConsumerAction('zapier', 'sendNotification', function(err, action) {
        if (err) console.log(err, action);
        should.not.exist(err);
        should.exist(action);
        // console.log(action);
        action.should.have.property('id');
        action.should.have.property('consumerId');
        action.should.have.property('url');
        action.should.have.property('name');
        action.should.have.property('description');
        action.inputDescriptors.should.be.instanceOf(Array);
        action.supportedEventTypes.should.be.instanceOf(Array);
        done();
      } );
    } );

    it.skip ( 'should create a subscription', function(done) {
      var subscription = {
        consumerActionId: 'httpRequest',
        consumerId: 'webHooks',
        consumerInputs: {
          url: 'http://localhost:1234/test/consumer'
        },
        eventType: 'buildCompleted',
        publisherId: 'webHooks',
        publisherInputs: {
          url: 'http://localhost:1234/test/publisher'
        }
      };
      client.createSubscription(subscription, function(err, sub) {
        if (err) console.log(err, sub);
        should.not.exist(err);
        should.exist(sub);
        console.log(sub);
      } );
    } );

    it ( 'should get a list of subscriptions', function(done) {
      client.getSubscriptions(function(err, subscriptions) {
        if (err) console.log(err, subscriptions);
        should.not.exist(err);
        should.exist(subscriptions);
        // console.log(subscriptions);
        subscriptions.should.be.instanceOf(Array);
        done();
      } );
    } );

    it.skip ( 'should get a list of subscriptions by query', function(done) {
      // Documentation incomplete
      var queryOptions = {
          publisherId: '',
          eventType: '',
          consumerId: '',
          consumerActionId: '',
          publisherInputFilters: [{
            conditions: [{
              inputId: '',
              operator: 'equals',
              inputValue: ''
            }]
          }]
      };
      client.querySubscriptions(queryOptions, function(err, subscriptions) {
        if (err) console.log(err, subscriptions);
        should.not.exist(err);
        should.exist(subscriptions);
        // console.log(subscriptions);
        subscriptions.should.be.instanceOf(Array);
        done();
      } );
    } );


  } );

  describe.skip( 'Build tests', function() {

    it( 'should return a list of build definitions', function(done) {
      client.getBuildDefinitions( function(err, builds){
        should.not.exist(err);
        should.exist(builds);
        builds.length.should.be.above(0);
        var build = builds[0];
        build.should.have.property('id');
        build.should.have.property('name');
        build.should.have.property('url');
        done();
      } );
    } );

    it( 'should queue a build', function(done) {
      var buildRequest = { definition : {id: 1},  reason: 'Manual', priority: 'Normal'};
      // console.log(buildRequest);
      client.queueBuild( buildRequest, function(err, buildResponse) {
        should.not.exist(err);
        should.exist(buildResponse);
        buildResponse.length.should.be.above(0);
        buildResponse.should.have.property('status')
        done();
      } );
    } );
  } );

} );
