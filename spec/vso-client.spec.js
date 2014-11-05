// The integration test require the existence of a Team Projet named "TFS INTEGRATION"
// Or you can override that name using the VSO_TEST_PROJECT env name
// Agile process template and git
// It should have at least one bug assigned to the user that is executing the tests
// It should at least have a task (the first task requires at least 2 revisions)
var mocha = require( 'mocha' );
var should = require( 'should' );
var _ = require( 'lodash' );
var async = require( 'async' );
var Client = require( '../public/vso-client' );
var url = process.env.VSO_URL || 'https://your-account.visualstudio.com/';
var collection = process.env.VSO_COLLECTION || 'DefaultCollection';
var username = process.env.VSO_USER || 'your-username';
var password = process.env.VSO_PWD || 'your-password';
var serviceAccountUser = process.env.VSO_SERVICE_ACCOUNT_USER || 'your service account username';
var serviceAccountPassword = process.env.VSO_SERVICE_ACCOUNT_PWD || 'your service account password';
var oauthToken = process.env.VSO_OAUTH_TOKEN || 'dummyAccessToken';
var memberId = process.env.VSO_MEMBER_ID || '00000000-0000-0000-0000-000000000000';
proxy = process.env.VSO_PROXY;
testProjectName = process.env.VSO_TEST_PROJECT || 'TFS INTEGRATION';

function getOptions( overrideVersion ) {
	options = {
		apiVersion: overrideVersion || "1.0"
	};
	if ( typeof (proxy) !== "undefined" || proxy !== null ) {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
		options.clientOptions = {
			proxy: proxy
		};
	}

	return options;
}

describe( 'Versioning tests', function() {

	before( function( done ) {
		client = Client.createClient( url, collection, username, password, getOptions() );
		done();
	} );

	it( 'equal version minimum met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0", "1.0" );

		minimumVersionMet.should.equal( true );
	} );

	it( 'equal version preview minimum met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0-preview", "1.0-preview" );

		minimumVersionMet.should.equal( true );
	} );

	it( 'greater version minimum met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.1", "1.0" );

		minimumVersionMet.should.equal( true );
	} );

	it( 'greater version with preview minimum met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.1-preview", "1.0-preview" );

		minimumVersionMet.should.equal( true );
	} );

	it( 'greater version with preview version minimum met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.1-preview", "1.0" );

		minimumVersionMet.should.equal( true );
	} );

	it( 'greater version with preview version minimum not met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0-preview", "1.1" );

		minimumVersionMet.should.equal( false );
	} );

	it( 'equal version greater preview minimum met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0-preview.2", "1.0-preview" );

		minimumVersionMet.should.equal( true );
	} );

	it( 'equal version lower preview minimum not met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0-preview", "1.0-preview.2" );

		minimumVersionMet.should.equal( false );
	} );

	it( 'equal version lower non preview minimum met met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0", "1.0-preview.2" );

		minimumVersionMet.should.equal( true );
	} );

	it( 'equal version lower running preview required non preview minimum non met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0-preview", "1.0" );

		minimumVersionMet.should.equal( false );
	} );

	it( 'lower version minimum not met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0", "1.2" );

		minimumVersionMet.should.equal( false );
	} );

	it( 'lower version minimum preview not met', function() {
		var minimumVersionMet = client.requireMinimumVersion( "1.0", "1.2-preview" );

		minimumVersionMet.should.equal( false );
	} );


} );

describe( 'VSO API 1.0 Tests', function() {
	this.timeout( 20000 );
	var client = {};
	var fields = [
		{ field: { id: -3, name: 'ID', refName: 'System.Id' }, value: 7 },
		{ field: { id: -2, name: 'Area ID', refName: 'System.AreaId' }, value: 769 },
		{ field: { id: -7, name: 'Area Path', refName: 'System.AreaPath' }, value: 'TFS Integration' },
		{ field: { id: -12, name: 'Node Name', refName: 'System.NodeName' }, value: 'TFS Integration' },
		{ field: { id: -42, name: 'Team Project', refName: 'System.TeamProject' }, value: 'TFS Integration' },
		{ field: { id: -43, name: 'Area Level 1', refName: 'System.AreaLevel1' }, value: 'TFS Integration' },
		{ field: { id: 8, name: 'Rev', refName: 'System.Rev' }, value: 20 }
	];

	before( function( done ) {
		client = Client.createClient( url, collection, username, password, getOptions( "1.0" ) );
		clientOAuth = Client.createOAuthClient( url, collection, oauthToken, getOptions( "1.0" ) );
		// console.log(oauthToken);
		done();
	} );

	describe( 'client tests', function() {

		it( 'has a credential valid client', function() {
			should.exist( client );
			client.should.have.property( 'url' );
			client.should.have.property( '_authType' );
			client._authType.should.equal( 'Credential' );
			should.exist( client.client );
			should.not.exist( client.clientSPS );
		} );

		it( 'has a OAuth valid client', function() {
			should.exist( clientOAuth );
			clientOAuth.should.have.property( 'url' );
			clientOAuth.should.have.property( '_authType' );
			clientOAuth._authType.should.equal( 'OAuth' );
			should.exist( clientOAuth.client );
			should.exist( clientOAuth.clientSPS );
		} );

		it( 'has overriden version', function() {
			var version = "1.0-preview-unitTest";
			var clientWithVersion = Client.createClient( url, collection, username, password, { apiVersion: version } );

			clientWithVersion.apiVersion.should.equal( version );
		} );

		it( 'has default version', function() {
			var expectedVersion = "1.0";
			var clientWithVersion = Client.createClient( url, collection, username, password );

			clientWithVersion.apiVersion.should.equal( expectedVersion );
		} );


		it( 'returns a field by name', function() {
			var field = client.findItemField( fields, 'System.Rev' );
			should.exist( field );
			field.value.should.equal( 20 );
		} );

		it( 'returns the first field by name', function() {
			var field = client.findFirstItemField( fields, [ 'Bogus', 'System.Rev', 'System.Id' ] );
			should.exist( field );
			field.value.should.equal( 20 );
			field.field.name.should.equal( 'Rev' );
		} );


		describe( 'auth tests', function() {

			it( 'fails authentication with error', function( done ) {

				var clientWithWrongCredential = Client.createClient( url, collection, "DUMMY_USER_NAME", "DUMMY PASSWORD SET TO FAIL", getOptions() );

				clientWithWrongCredential.getProjects( function( err, projects ) {
					should.exist( err );
					done();
				} );
			} );
		} );

	} );


	describe( 'project tests', function() {
		var testProject = null;
		var testCollection = null;
		var testTeam = null;
		var tagName = null;
		var testTag = null;

		before( function( done ) {
			tagName = 'testTag-' + ( Math.random() + 1 ).toString( 36 ).substring( 7 );
			done();
		} );

		// ---------------------------------------
		// Projects
		// ---------------------------------------

		it( 'returns a list of projects', function( done ) {
			client.getProjects( function( err, projects ) {
				should.not.exist( err );
				should.exist( projects );
				// console.log(projects);
				projects.length.should.be.above( 0 );
				var project = _.find( projects, function( p ) {
					return p.name === testProjectName;
				} );
				should.exist( project );
				// console.log(project);
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				project.should.have.property( 'state' );
				testProject = project;
				done();
			} );
		} );

		it( 'returns only one project', function( done ) {
			client.getProjects( false, null, 1, 0, function( err, projects ) {
				should.not.exist( err );
				should.exist( projects );
				// console.log(projects);
				projects.length.should.equal( 1 );
				var project = projects[ 0 ];
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				done();
			} );
		} );

		it( 'retrieves a project by id', function( done ) {
			should.exist( testProject );
			client.getProject( testProject.id, false, function( err, project ) {
				if ( err ) {
					console.log( err );
					console.log( project );
				}
				should.not.exist( err );
				should.exist( project );
				// console.log(project);
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				should.exist( project._links );
				should.exist( project._links.collection );
				should.exist( project.defaultTeam );
				done();
			} );
		} );

		it( 'retrieves a project by id with capabilities', function( done ) {
			should.exist( testProject );
			client.getProject( testProject.id, true, function( err, project ) {
				if ( err ) {
					console.log( err );
					console.log( project );
				}
				should.not.exist( err );
				should.exist( project );
				// console.log(project);
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				should.exist( project._links );
				should.exist( project._links.collection );
				should.exist( project.capabilities );
				should.exist( project.capabilities.versioncontrol );
				should.exist( project.capabilities.processTemplate );
				should.exist( project.defaultTeam );
				done();
			} );
		} );

		// ---------------------------------------
		// Project Teams
		// ---------------------------------------

		it( 'retrieves teams by project id', function( done ) {
			should.exist( testProject );
			client.getTeams( testProject.id, function( err, teams ) {
				if ( err ) {
					console.log( err );
					console.log( teams );
				}
				should.not.exist( err );
				should.exist( teams );
				// console.log(teams);
				teams.length.should.be.above( 0 );
				var team = teams[ 0 ];
				team.should.have.property( 'id' );
				team.should.have.property( 'name' );
				team.should.have.property( 'url' );
				team.should.have.property( 'description' );
				team.should.have.property( 'identityUrl' );
				testTeam = team;
				done();
			} );
		} );

		it( 'retrieves a team by project and team id', function( done ) {
			should.exist( testProject );
			should.exist( testTeam );
			client.getTeam( testProject.id, testTeam.id, function( err, team ) {
				if ( err ) {
					console.log( err );
					console.log( team );
				}
				should.not.exist( err );
				should.exist( team );
				team.should.have.property( 'id' );
				team.should.have.property( 'name' );
				team.should.have.property( 'url' );
				team.should.have.property( 'description' );
				team.should.have.property( 'identityUrl' );
				done();
			} );
		} );

		it( 'retrieves team members by project and team id', function( done ) {
			should.exist( testProject );
			should.exist( testTeam );
			client.getTeamMembers( testProject.id, testTeam.id, function( err, members ) {
				if ( err ) {
					console.log( err );
					console.log( members );
				}
				should.not.exist( err );
				should.exist( members );
				// console.log(members);
				members.length.should.be.above( 0 );
				var member = members[ 0 ];
				member.should.have.property( 'id' );
				member.should.have.property( 'displayName' );
				member.should.have.property( 'uniqueName' );
				member.should.have.property( 'url' );
				member.should.have.property( 'imageUrl' );
				done();
			} );
		} );

		// ---------------------------------------
		// Collections
		// ---------------------------------------

		it( 'returns a list of project collections', function( done ) {
			client.getProjectCollections( function( err, collections ) {
				should.not.exist( err );
				should.exist( collections );
				// console.log(collections);
				collections.length.should.be.above( 0 );
				var collection = collections[ 0 ];
				collection.should.have.property( 'id' );
				collection.should.have.property( 'name' );
				collection.should.have.property( 'url' );
				collection.should.have.property( 'collectionUrl' );
				collection.should.have.property( 'state' );
				testCollection = collection;
				done();
			} );
		} );

		it( 'returns a project collection by id', function( done ) {
			should.exist( testCollection );
			client.getProjectCollection( testCollection.id, function( err, collection ) {
				should.not.exist( err );
				should.exist( collection );
				collection.should.have.property( 'id' );
				collection.should.have.property( 'name' );
				collection.should.have.property( 'url' );
				collection.should.have.property( 'collectionUrl' );
				collection.should.have.property( 'state' );
				done();
			} );
		} );

		// ---------------------------------------
		// Tags
		// ---------------------------------------

		it( 'creates a tag', function( done ) {
			should.exist( testProject );
			client.createTag( testProject.id, tagName, function( err, tag ) {
				if ( err ) {
					console.log( err );
					console.log( tag );
				}
				should.not.exist( err );
				should.exist( tag );
				// console.log(tag);
				testTag = tag;
				done();
			} );
		} );

		it( 'updates a tag', function( done ) {
			should.exist( testProject );
			should.exist( testTag );
			client.updateTag( testProject.id, testTag.id, tagName + '-updated', true, function( err, tag ) {
				if ( err ) {
					console.log( err );
					console.log( tag );
				}
				should.not.exist( err );
				should.exist( tag );
				// console.log(tag);
				done();
			} );
		} );

		it( 'retrieves tags by project id', function( done ) {
			should.exist( testProject );
			// Work-around, tags don't always immediately appear after being created
			setTimeout( function( done ) {
				client.getTags( testProject.id, true, function( err, tags ) {
					if ( err ) {
						console.log( err );
						console.log( tags );
					}
					should.not.exist( err );
					should.exist( tags );
					// console.log(tags);
					tags.length.should.be.above( 0 );
					if ( tags.length > 0 ) {
						var tag = tags[ 0 ];
						tag.should.have.property( 'id' );
						tag.should.have.property( 'name' );
						tag.should.have.property( 'active' );
						tag.should.have.property( 'url' );
					}
					done();
				} );
			}, 5000, done );
		} );

		it( 'deletes a tag', function( done ) {
			should.exist( testProject );
			should.exist( testTag );
			client.deleteTag( testProject.id, testTag.id, function( err, tag ) {
				if ( err ) {
					console.log( err );
					console.log( tag );
				}
				should.not.exist( err );
				should.exist( tag );
				// console.log(tag);
				done();
			} );
		} );

	} );

	// ---------------------------------------
	// Queries
	// ---------------------------------------

	describe( 'queries', function() {

		var myQueries = null;
		var testQuery = null;
		var testFolder = null;
		var myBugsQuery = null;
		var testProject = null;

		before( function( done ) {
			client.getProjects( function( err, projects ) {
				// console.log(err);
				// console.log(projects);
				testProject = _.find( projects, function( p ) {
					return p.name === testProjectName;
				} );
				done();
			} );
		} );

		it( 'should return a list of queries', function( done ) {
			should.exist( testProject );
			client.getQueries( testProject.name, 2, function( err, queries ) {
				if ( err ) {
					console.log( err );
					console.log( queries );
				}
				should.not.exist( err );
				should.exist( queries );
				// console.log(queries);
				queries.length.should.be.above( 0 );
				var folder = _.find( queries, function( q ) {
					return q.name === 'My Queries';
				} );
				should.exist( folder );
				myQueries = folder;
				var sharedFolder = _.find( queries, function( q ) {
					return q.name === 'Shared Queries';
				} );
				should.exist( sharedFolder );
				sharedFolder.children.should.be.instanceOf( Array );
				sharedFolder.children.length.should.be.above( 0 );
				// console.log(sharedFolder);
				var query = _.find( sharedFolder.children, function( q ) {
					return q.name === 'My Bugs';
				} );
				should.exist( query );
				// console.log( query );
				query.should.have.property( 'id' );
				query.should.have.property( 'name' );
				query.should.have.property( 'url' );
				query.should.have.property( 'path' );
				myBugsQuery = query;
				done();
			} );
		} );

		it( 'should return a list of work items from saved query', function( done ) {
			should.exist( testProject );
			should.exist( myBugsQuery );

			client.getWorkItemIdsByQuery( myBugsQuery.id, testProject.name, function( err, ids ) {
				if ( err ) {
					console.log( err );
					console.log( ids );
				}
				ids.should.be.instanceOf( Array );
				ids.length.should.be.above( 0 );
				// console.log(ids);
				done();
			} );
		} );

		it( 'should return a query', function( done ) {
			should.exist( testProject );
			should.exist( myBugsQuery );

			client.getQuery( testProject.name, myBugsQuery.id, function( err, query ) {
				if ( err ) {
					console.log( err );
					console.log( query );
				}
				should.not.exist( err );
				should.exist( query );
				//console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'name' );

				query.should.have.property( 'url' );
				done();
			} );
		} );

		it( 'should create a query folder', function( done ) {
			testFolder = null;
			should.exist( testProject );
			should.exist( myQueries );
			client.createFolder( testProject.name, 'testFolder1', myQueries.id, function( err, folder ) {
				should.not.exist( err );
				should.exist( folder );
				// console.log(folder);
				folder.should.have.property( 'id' );
				folder.should.have.property( 'url' );
				testFolder = folder;
				done();
			} );
		} );

		it( 'should create a query', function( done ) {
			testQuery = null;
			should.exist( testProject );
			should.exist( testFolder );

			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';

			client.createQuery( testProject.name, 'testQuery1', testFolder.id, wiql, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				//console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'url' );
				testQuery = query;
				done();
			} );
		} );

		it( 'should update a query by name', function( done ) {
			should.exist( testProject );
			should.exist( testFolder );
			should.exist( testQuery );

			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] asc';

			client.getQuery( testProject.name, testQuery.id, function( err, query ) {
				should.exist( query );
				// console.log(testFolder);
				// console.log(query);
				client.updateQuery( testProject.name, query.name, 'testQuery1-updated', testFolder.path, wiql, function( err, query2 ) {
					should.not.exist( err );
					should.exist( query2 );
					// console.log(query);
					query2.should.have.property( 'id' );
					query2.should.have.property( 'url' );
					testQuery = query2;
					done();
				} );
			} );
		} );

		it( 'should update a query by id', function( done ) {
			should.exist( testProject );
			should.exist( testFolder );
			should.exist( testQuery );

			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] asc';

			client.getQuery( testProject.name, testQuery.id, function( err, query ) {
				should.exist( query );
				// console.log(testFolder);
				// console.log(query);
				client.updateQuery( testProject.name, query.id, 'testQuery1-updated2', null, wiql, function( err, query2 ) {
					should.not.exist( err );
					should.exist( query2 );
					// console.log(query);
					query2.should.have.property( 'id' );
					query2.should.have.property( 'url' );
					testQuery = query2;
					done();
				} );
			} );
		} );

		it( 'should delete a query', function( done ) {
			should.exist( testProject );
			should.exist( testQuery );
			client.deleteQuery( testProject.name, testQuery.id, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				done();
			} );
		} );

		it( 'should delete a query folder', function( done ) {
			should.exist( testProject );
			should.exist( testFolder );
			client.deleteFolder( testProject.name, testFolder.id, function( err, folder ) {
				should.not.exist( err );
				should.exist( folder );
				// console.log(folder);
				done();
			} );
		} );

	} );

	describe( 'work items', function() {
		var testItemIds = null;
		var testItemIdArray = null;
		var testItemId = null;

		// ---------------------------------------
		// Work Item Queries
		// ---------------------------------------

		it( 'returns a list of work items from wiql query', function( done ) {
			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Task\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';

			client.getWorkItemIds( wiql, testProjectName, function( err, ids ) {
				if ( err ) {
					console.log( err );
					console.log( ids );
				}
				should.not.exist( err );
				should.exist( ids );
				//console.log(ids);
				ids.should.be.instanceOf( Array );
				ids.length.should.be.above( 0 );
				testItemIdArray = ids;
				testItemIds = ids.join( ',' );
				testItemId = ids[ 0 ];
				done();
			} );
		} );

		it( 'returns a list of work items by comma-separated id list', function( done ) {
			client.getWorkItemsById( testItemIds, null, null, null, function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				items.length.should.be.above( 0 );
				var item = items[ 0 ];
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				should.exist( item.fields );
				// console.log( item.fields );
				item.fields.should.have.property( 'System.Title' );
				item.fields.should.have.property( 'System.State' );
				done();
			} );
		} );

		it( 'returns a list of work items by array of ids', function( done ) {
			client.getWorkItemsById( testItemIdArray, null, null, null, function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				items.length.should.equal( testItemIdArray.length );
				var item = items[ 0 ];
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				should.exist( item.fields );
				// console.log( item.fields );
				item.fields.should.have.property( 'System.Title' );
				item.fields.should.have.property( 'System.State' );
				done();
			} );
		} );

		it( 'returns a list of work items by ids with expanded links', function( done ) {
			client.getWorkItemsById( testItemIds, null, null, 'all', function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				// console.log(items);
				items.length.should.be.above( 0 );
				var item = items[ 0 ];
				item.should.have.property( '_links' );
				should.exist( item._links );
				item._links.should.have.property( 'self' );
				testItemId = item.id;
				done();
			} );
		} );

		it( 'returns a work item by id', function( done ) {
			should.exist( testItemId );
			client.getWorkItem( testItemId, 'all', function( err, item ) {
				//client.getWorkItem(7, 'all', function(err, item) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				// console.log(item);
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				should.exist( item.fields );
				// console.log( item.fields );
				item.fields.should.have.property( 'System.Id' );
				item.fields.should.have.property( 'System.Title' );
				item.fields.should.have.property( 'System.State' );
				done();
			} );
		} );

		it( 'returns work item updates', function( done ) {
			client.getWorkItemUpdates( testItemId, function( err, updates ) {
				if ( err ) {
					console.log( err );
					console.log( updates );
				}
				should.not.exist( err );
				should.exist( updates );
				//console.log(updates);
				updates.length.should.be.above( 0 );
				var update = updates[ updates.length - 1 ];
				// console.log(update);
				update.should.have.property( 'id' );
				update.should.have.property( 'rev' );
				should.exist( update.fields );
				done();
			} );
		} );

		it( 'returns a page of work item updates', function( done ) {
			client.getWorkItemUpdates( testItemId, 2, 0, function( err, updates ) {
				if ( err ) {
					console.log( err );
					console.log( updates );
				}
				should.not.exist( err );
				should.exist( updates );
				//console.log(updates);
				updates.length.should.equal( 2 );
				updates[ updates.length - 1 ].rev.should.be.above( 1 );
				done();
			} );
		} );

		it( 'returns a work item update by revision number', function( done ) {
			client.getWorkItemUpdate( testItemId, 1, function( err, update ) {
				if ( err ) {
					console.log( err );
					console.log( update );
				}
				should.not.exist( err );
				should.exist( update );
				//console.log(update);
				update.should.have.property( 'id' );
				update.should.have.property( 'rev' );
				update.should.have.property( 'url' );
				should.exist( update.fields );
				done();
			} );
		} );

		it( 'returns a work item by revision number', function( done ) {
			client.getWorkItemRevision( testItemId, 1, function( err, item ) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				//console.log(item);
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				should.exist( item.fields );
				// console.log( item.fields );
				item.fields.should.have.property( 'System.Title' );
				item.fields.should.have.property( 'System.State' );
				done();
			} );
		} );

	} );
	// Accounts and Profiles Tests are not testable since they required
	// OAuth, thus requiring human intervention to get a token with
	// an authorization

	describe.skip( 'Accounts', function() {
		it( 'should return a list of accounts', function( done ) {
			clientOAuth.getAccounts( memberId, function( err, accounts ) {
				// console.log(err);
				should.not.exist( err );
				should.exist( accounts );
				// console.log(accounts);
				accounts.should.be.instanceOf( Array );
				accounts.length.should.be.above( 0 );
				var account = accounts[ 0 ];
				account.should.have.property( 'accountId' );
				account.should.have.property( 'accountUri' );
				account.should.have.property( 'accountName' );
				account.should.have.property( 'organizationName' );
				done();
			} );
		} );
	} );

	describe( 'team room tests', function() {
		var testTeamRoom = null;
		var testTeamRoomId = null;

		it( 'returns a list of team rooms', function( done ) {
			client.getRooms( function( err, rooms ) {
				should.not.exist( err );
				should.exist( rooms );
				// console.log( rooms );
				rooms.length.should.be.above( 0 );
				var room = _.find( rooms, function( t ) {
					return t.hasReadWritePermissions;
				} );
				should.exist( room );
				// console.log(testTeamRoom);
				room.should.have.property( 'id' );
				room.should.have.property( 'name' );
				room.should.have.property( 'description' );
				room.should.have.property( 'lastActivity' );
				room.should.have.property( 'createdBy' );
				room.should.have.property( 'createdDate' );
				room.should.have.property( 'hasAdminPermissions' );
				room.should.have.property( 'hasReadWritePermissions' );
				testTeamRoomId = room.id;
				done();
			} );
		} );

		it( 'returns a room by id', function( done ) {
			if ( testTeamRoomId ) {
				client.getRoom( testTeamRoomId, function( err, room ) {
					should.not.exist( err );
					should.exist( room );
					// console.log( room );
					room.should.have.property( 'id' );
					room.should.have.property( 'name' );
					room.should.have.property( 'description' );
					room.should.have.property( 'lastActivity' );
					room.should.have.property( 'createdBy' );
					room.should.have.property( 'createdDate' );
					room.should.have.property( 'hasAdminPermissions' );
					room.should.have.property( 'hasReadWritePermissions' );
					done();
				} );
			} else {
				console.log( 'Warning: no test team room' );
				done();
			}
		} );

		it( 'creates a room', function( done ) {
			var randomName = 'test-room-' + ( Math.random() + 1 ).toString( 36 ).substring( 7 );
			client.createRoom( randomName, 'a description', function( err, room ) {
				should.not.exist( err );
				should.exist( room );
				// console.log( room );
				testTeamRoom = room;
				room.should.have.property( 'id' );
				room.should.have.property( 'name' );
				room.should.have.property( 'description' );
				room.should.have.property( 'lastActivity' );
				room.should.have.property( 'createdBy' );
				room.should.have.property( 'createdDate' );
				room.should.have.property( 'hasAdminPermissions' );
				room.should.have.property( 'hasReadWritePermissions' );
				done();
			} );
		} );

		it ( 'updates a room', function( done ) {
			if ( testTeamRoom ) {
				var name = testTeamRoom.name + '-updated';
				var description = 'updated description';
				client.updateRoom( testTeamRoom.id, name, description, function( err, room ) {
					should.not.exist( err );
					should.exist( room );
					// console.log( room );
					room.name.should.equal( name );
					room.description.should.equal( description );
					done();
				} );
			} else {
				console.log( 'Warning: no test team room' );
				done();
			}
		} );

		it( 'deletes a room', function( done ) {
			if ( testTeamRoom ) {
				client.deleteRoom( testTeamRoom.id, function( err, res ) {
					should.not.exist( err );
					// console.log( res );
					done();
				} );
			} else {
				console.log( 'Warning: no test team room' );
				done();
			}
		} );
	} );

	describe( 'version control tests', function() {

		before( function() {
			client.setVersion( '1.0' );
		} );

		// ---------------------------------------
		// Version Control
		// ---------------------------------------

		it( 'returns root branches', function( done ) {
			client.getRootBranches( true, true, function( err, branches ) {
				if ( err ) {
					console.log( err, branches );
				}
				should.not.exist( err );
				should.exist( branches );
				// console.log( branches );
				done();
			} );
		} );

		it.skip( 'returns a branch', function( done ) {
			var path = '$/TestProject';
			client.getBranch( path, true, true, true, function( err, branch ) {
				if ( err ) {
					console.log( err, branch );
				}
				should.not.exist( err );
				should.exist( branch );
				// console.log(branch);
				done();
			} );
		} );

		it( 'returns shelvesets', function( done ) {
			client.getShelveSets( function( err, shelvesets ) {
				if ( err ) {
					console.log( err, shelvesets );
				}
				should.not.exist( err );
				should.exist( shelvesets );
				// console.log(shelvesets);
				done();
			} );
		} );

		var testCommitId = null;
		var testChangeSet = null;

		it( 'returns changesets', function( done ) {
			client.getChangeSets( function( err, changesets ) {
				if ( err ) {
					console.log( err, changesets );
				}
				should.not.exist( err );
				should.exist( changesets );
				// console.log(changesets);
				changesets.should.be.instanceOf( Array );
				changesets.length.should.be.above( 0 );
				var changeset = changesets[ 0 ];
				changeset.should.have.property( 'changesetId' );
				changeset.should.have.property( 'url' );
				changeset.should.have.property( 'createdDate' );
				changeset.should.have.property( 'comment' );
				changeset.author.should.be.instanceOf( Object );
				changeset.checkedInBy.should.be.instanceOf( Object );
				testCommitId = changeset.changesetId;
				done();
			} );
		} );

		it( 'returns a changeset by id', function( done ) {
			if ( testCommitId ) {
				client.getChangeSet( testCommitId, function( err, changeset ) {
					if ( err ) {
						console.log( err, changeset );
					}
					should.not.exist( err );
					should.exist( changeset );
					// console.log(changeset);
					changeset.should.have.property( 'changesetId' );
					changeset.should.have.property( 'url' );
					changeset.should.have.property( 'createdDate' );
					changeset.should.have.property( 'comment' );
					changeset.author.should.be.instanceOf( Object );
					changeset.checkedInBy.should.be.instanceOf( Object );
					testChangeSet = changeset;
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'returns changsets from range of IDs', function( done ) {
			if ( testChangeSet ) {
				var toId = testChangeSet.changesetId;
				var fromId = toId - 2;
				var expectedCount = 3;
				if ( fromId < 1 ) {
					fromId = 1;
					expectedCount = toId - fromId + 1;
				}
				var queryOptions = {
					fromId: fromId,
					toId: testChangeSet.changesetId
				};
				client.getChangeSets( queryOptions, function( err, changesets ) {
					if ( err ) {
						console.log( err, changesets );
					}
					should.not.exist( err );
					should.exist( changesets );
					// console.log(changesets);
					changesets.should.be.instanceOf( Array );
					changesets.length.should.equal( expectedCount );
					var changeset = changesets[ 0 ];
					changeset.should.have.property( 'changesetId' );
					changeset.should.have.property( 'url' );
					changeset.should.have.property( 'createdDate' );
					changeset.should.have.property( 'comment' );
					changeset.author.should.be.instanceOf( Object );
					changeset.checkedInBy.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'returns a changeset by id with details', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					includeDetails: true,
					includeWorkItems: false,
					maxChangeCount: 0,
					maxCommentLength: 1000
				};
				client.getChangeSet( testCommitId, queryOptions, function( err, changeset ) {
					if ( err ) {
						console.log( err, changeset );
					}
					should.not.exist( err );
					should.exist( changeset );
					// console.log(changeset);
					changeset.checkinNotes.should.be.instanceOf( Array );
					changeset.policyOverride.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'returns a changeset by id with work items', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					includeDetails: false,
					includeWorkItems: true,
					maxChangeCount: 0,
					maxCommentLength: 1000
				};
				client.getChangeSet( testCommitId, queryOptions, function( err, changeset ) {
					if ( err ) {
						console.log( err, changeset );
					}
					should.not.exist( err );
					should.exist( changeset );
					// console.log(changeset);
					changeset.workItems.should.be.instanceOf( Array );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it.skip( 'returns latest changeset changes', function( done ) {
			client.getChangeSetChanges( function( err, changes ) {
				if ( err ) {
					console.log( err, changes );
				}
				should.not.exist( err );
				should.exist( changes );
				// console.log(changes);
				changes.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'returns changes for a changeset by id', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					id: testCommitId
				};
				client.getChangeSetChanges( queryOptions, function( err, changes ) {
					if ( err ) {
						console.log( err, changes );
					}
					should.not.exist( err );
					should.exist( changes );
					// console.log(changes);
					changes.should.be.instanceOf( Array );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it.skip( 'returns latest changeset work items', function( done ) {
			client.getChangeSetWorkItems( function( err, workitems ) {
				if ( err ) {
					console.log( err, workitems );
				}
				should.not.exist( err );
				should.exist( workitems );
				// console.log(workitems);
				workitems.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'returns work items for a changeset by id', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					id: testCommitId
				};
				client.getChangeSetWorkItems( queryOptions, function( err, workitems ) {
					if ( err ) {
						console.log( err, workitems );
					}
					should.not.exist( err );
					should.exist( workitems );
					// console.log(workitems);
					workitems.should.be.instanceOf( Array );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'gets a list of labels', function( done ) {
			client.getLabels( function( err, labels ) {
				if ( err ) {
					console.log( err, labels );
				}
				should.not.exist( err );
				should.exist( labels );
				// console.log(labels);
				labels.should.be.instanceOf( Array );
				done();
			} );
		} );
	} );

	describe.skip ( 'git repository tests', function() {

		// ---------------------------------------
		// Git Repositories
		// ---------------------------------------

		var testRepoName = null;
		var testRepository = null;
		var testGitProject = null;
		var testCommit = null;
		var testProject = null;

		before( function( done ) {
			testRepoName = 'testRepo-' + ( Math.random() + 1 ).toString( 36 ).substring( 7 );
			client.getProjects( true, function( err, projects ) {
				testProject = _.find( projects, function( p ) {
					return p.name === testProjectName;
				} );

				// Find a project that uses git
				if ( projects && projects.length > 0 ) {
					async.each( projects, function( project, callback ) {
						client.getProject( project.id, true, function( err, proj ) {
							if ( proj.capabilities.versioncontrol.sourceControlType === 'Git' ) {
								testGitProject = proj;
								callback( 'Found' );
							} else {
								callback();
							}
						} );
					}, function( err ) {
							if ( err !== 'Found' ) {
								console.log( err );
							}
							done();
						} );
				}
			} );
		} );

		it( 'creates a git repository', function( done ) {
			if ( testGitProject ) {
				client.createRepository( testGitProject.id, testRepoName, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					testRepository = repository;
					done();
				} );
			} else {
				console.log( 'Warning: missing test project' );
				done();
			}
		} );

		it( 'returns a list of repositories', function( done ) {
			client.getRepositories( function( err, repositories ) {
				should.not.exist( err );
				should.exist( repositories );
				// console.log(repositories);
				if ( repositories.length > 0 ) {
					var repository = repositories[ 0 ];
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
				}
				done();
			} );
		} );

		it( 'returns a list of repositories by project', function( done ) {
			if ( testGitProject ) {
				client.getRepositories( testGitProject.id, function( err, repositories ) {
					should.not.exist( err );
					should.exist( repositories );
					repositories.length.should.be.above( 0 );
					done();
				} );
			} else {
				console.log( 'Warning: missing test project' );
				done();
			}
		} );

		it( 'returns a repository by id', function( done ) {
			if ( testRepository ) {
				client.getRepository( testRepository.id, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'returns a repository by name', function( done ) {
			if ( testRepository ) {
				client.getRepository( testRepository.name, testProject.id, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'renames a repository', function( done ) {
			if ( testRepository ) {
				client.renameRepository( testRepository.id, testRepository.name + '-update', function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
					repository.name.should.equal( testRepository.name + '-update' );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'deletes a repository', function( done ) {
			if ( testRepository ) {
				client.deleteRepository( testRepository.id, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'gets a list of commits', function( done ) {
			if ( testGitProject ) {
				client.getRepositories( testGitProject.id, function( err, repositories ) {
					should.not.exist( err );
					should.exist( repositories );
					if ( repositories.length > 0 ) {
						// console.log( repositories );
						var repository = repositories[ 0 ];
						testRepository = repository;
						console.log( repository );
						client.getCommits( repository.id, function( err, commits ) {
							should.not.exist( err );
							should.exist( commits );
							commits.should.be.instanceOf( Array );
							console.log( commits );
							if ( commits.length > 0 ) {
								var commit = commits[ 0 ];
								commit.should.have.property( 'commitId' );
								commit.should.have.property( 'comment' );
								commit.should.have.property( 'url' );
								commit.author.should.be.instanceOf( Object );
								commit.committer.should.be.instanceOf( Object );
								commit.changeCounts.should.be.instanceOf( Object );
								testCommit = commit;
							}
							// console.log(commits);
							done();
						} );
					} else {
						conosole.log( 'Warning: no repositories in project', testProject );
						done();
					}
				} );
			} else {
				console.log( 'Warning: missing test project' );
				done();
			}
		} );

		it( 'gets a list of commits by author', function( done ) {
			if ( testRepository && testCommit ) {
				client.getCommits( testRepository.id, null, null, testCommit.author.name, function( err, commits ) {
					should.not.exist( err );
					should.exist( commits );
					commits.should.be.instanceOf( Array );
					commits.length.should.be.above( 0 );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository and commit' );
				done();
			}
		} );

		it( 'gets a commit by id', function( done ) {
			if ( testRepository && testCommit ) {
				client.getCommit( testRepository.id, testCommit.commitId, function( err, commit ) {
					should.not.exist( err );
					should.exist( commit );
					commit.parents.should.be.instanceOf( Array );
					commit.should.have.property( 'treeId' );
					commit.push.should.be.instanceOf( Object );
					commit.should.have.property( 'commitId' );
					commit.should.have.property( 'comment' );
					commit.should.have.property( 'url' );
					commit.author.should.be.instanceOf( Object );
					commit.committer.should.be.instanceOf( Object );
					should.not.exist( commit.changes );
					// console.log(commit);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository and commit' );
				done();
			}
		} );

		it( 'gets a commit by id with changed items', function( done ) {
			if ( testRepository && testCommit ) {
				client.getCommit( testRepository.id, testCommit.commitId, 10, function( err, commit ) {
					should.not.exist( err );
					should.exist( commit );
					// console.log(commit);
					commit.changes.should.be.instanceOf( Array );
					commit.changeCounts.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository and commit' );
				done();
			}
		} );

		it( 'gets a list of commit diffs', function( done ) {
			if ( testRepository ) {
				client.getDiffs( testRepository.id, null, 'master', null, 'develop', function( err, diffs ) {
					should.not.exist( err );
					should.exist( diffs );
					diffs.should.have.property( 'allChangesIncluded' );
					diffs.changes.should.be.instanceOf( Array );
					diffs.should.have.property( 'commonCommit' );
					diffs.should.have.property( 'aheadCount' );
					diffs.should.have.property( 'behindCount' );
					// console.log(diffs);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'gets a list of pushes', function( done ) {
			if ( testRepository ) {
				client.getPushes( testRepository.id, function( err, pushes ) {
					should.not.exist( err );
					should.exist( pushes );
					pushes.should.be.instanceOf( Array );
					pushes.length.should.be.above( 0 );
					// console.log(pushes);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'gets stats for repository', function( done ) {
			if ( testRepository ) {
				client.getStats( testRepository.id, function( err, stats ) {
					should.not.exist( err );
					should.exist( stats );
					stats.should.be.instanceOf( Array );
					stats.length.should.be.above( 0 );
					// console.log(stats);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'gets refs for repository', function( done ) {
			if ( testRepository ) {
				client.getRefs( testRepository.id, function( err, refs ) {
					should.not.exist( err );
					should.exist( refs );
					refs.should.be.instanceOf( Array );
					refs.length.should.be.above( 0 );
					// console.log(refs);
					var ref = refs[ 0 ];
					ref.should.have.property( 'name' );
					ref.should.have.property( 'objectId' );
					ref.should.have.property( 'url' );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

	} );

	describe( 'Service Hook tests', function() {

		// ---------------------------------------
		// Service Hooks
		// ---------------------------------------

		it( 'should get a list of publishers', function( done ) {
			client.getConsumers( function( err, publishers ) {
				if ( err ) console.log( err, publishers );
				should.not.exist( err );
				should.exist( publishers );
				// console.log(publishers);
				publishers.should.be.instanceOf( Array );
				var publisher = _.find( publishers, function( c ) {
					return c.id === 'webHooks';
				} );
				should.exist( publisher );
				// console.log(publisher);
				// console.log(publisher.actions[0].inputDescriptors);
				publisher.should.have.property( 'id' );
				publisher.should.have.property( 'url' );
				publisher.should.have.property( 'name' );
				publisher.should.have.property( 'description' );
				publisher.should.have.property( 'informationUrl' );
				publisher.should.have.property( 'authenticationType' );
				publisher.inputDescriptors.should.be.instanceOf( Array );
				publisher.actions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a list of consumers', function( done ) {
			client.getConsumers( function( err, consumers ) {
				if ( err ) console.log( err, consumers );
				should.not.exist( err );
				should.exist( consumers );
				// console.log(consumers);
				consumers.should.be.instanceOf( Array );
				var zendesk = _.find( consumers, function( c ) {
					return c.id === 'zendesk';
				} );
				should.exist( zendesk );
				// console.log(zendesk);
				zendesk.should.have.property( 'id' );
				zendesk.should.have.property( 'url' );
				zendesk.should.have.property( 'name' );
				zendesk.should.have.property( 'description' );
				zendesk.should.have.property( 'informationUrl' );
				zendesk.should.have.property( 'authenticationType' );
				zendesk.inputDescriptors.should.be.instanceOf( Array );
				zendesk.actions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a consumer by id', function( done ) {
			client.getConsumer( 'zapier', function( err, consumer ) {
				if ( err ) console.log( err, consumer );
				should.not.exist( err );
				should.exist( consumer );
				// console.log(consumer);
				consumer.should.have.property( 'id' );
				consumer.should.have.property( 'url' );
				consumer.should.have.property( 'name' );
				consumer.should.have.property( 'description' );
				consumer.should.have.property( 'informationUrl' );
				consumer.should.have.property( 'authenticationType' );
				consumer.inputDescriptors.should.be.instanceOf( Array );
				consumer.actions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a list of consumer actions by id', function( done ) {
			client.getConsumerActions( 'zapier', function( err, actions ) {
				if ( err ) console.log( err, actions );
				should.not.exist( err );
				should.exist( actions );
				// console.log(actions);
				actions.should.be.instanceOf( Array );
				actions.length.should.be.above( 0 );
				var action = actions[ 0 ];
				// console.log(action);
				action.should.have.property( 'id' );
				action.should.have.property( 'consumerId' );
				action.should.have.property( 'url' );
				action.should.have.property( 'name' );
				action.should.have.property( 'description' );
				action.inputDescriptors.should.be.instanceOf( Array );
				action.supportedEventTypes.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a list of consumer action by id', function( done ) {
			client.getConsumerAction( 'zapier', 'sendNotification', function( err, action ) {
				if ( err ) console.log( err, action );
				should.not.exist( err );
				should.exist( action );
				// console.log(action);
				action.should.have.property( 'id' );
				action.should.have.property( 'consumerId' );
				action.should.have.property( 'url' );
				action.should.have.property( 'name' );
				action.should.have.property( 'description' );
				action.inputDescriptors.should.be.instanceOf( Array );
				action.supportedEventTypes.should.be.instanceOf( Array );
				done();
			} );
		} );

		it.skip( 'should create a subscription', function( done ) {
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
			client.createSubscription( subscription, function( err, sub ) {
				if ( err ) console.log( err, sub );
				should.not.exist( err );
				should.exist( sub );
				console.log( sub );
			} );
		} );

		it( 'should get a list of subscriptions', function( done ) {
			client.getSubscriptions( function( err, subscriptions ) {
				if ( err ) console.log( err, subscriptions );
				should.not.exist( err );
				should.exist( subscriptions );
				// console.log(subscriptions);
				subscriptions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it.skip( 'should get a list of subscriptions by query', function( done ) {
			// Documentation incomplete
			var queryOptions = {
				publisherId: '',
				eventType: '',
				consumerId: '',
				consumerActionId: '',
				publisherInputFilters: [ {
					conditions: [ {
						inputId: '',
						operator: 'equals',
						inputValue: ''
					} ]
				} ]
			};
			client.querySubscriptions( queryOptions, function( err, subscriptions ) {
				if ( err ) console.log( err, subscriptions );
				should.not.exist( err );
				should.exist( subscriptions );
				// console.log(subscriptions);
				subscriptions.should.be.instanceOf( Array );
				done();
			} );
		} );


	} );

	describe.skip( 'Build tests', function() {

		it( 'should return a list of build definitions', function( done ) {
			client.getBuildDefinitions( function( err, builds ) {
				should.not.exist( err );
				should.exist( builds );
				builds.length.should.be.above( 0 );
				var build = builds[ 0 ];
				build.should.have.property( 'id' );
				build.should.have.property( 'name' );
				build.should.have.property( 'url' );
				done();
			} );
		} );

		it( 'should queue a build', function( done ) {
			var buildRequest = { definition: { id: 1 }, reason: 'Manual', priority: 'Normal' };
			// console.log(buildRequest);
			client.queueBuild( buildRequest, function( err, buildResponse ) {
				should.not.exist( err );
				should.exist( buildResponse );
				buildResponse.length.should.be.above( 0 );
				buildResponse.should.have.property( 'status' );
				done();
			} );
		} );
	} );

} );


describe.skip( 'VSO Client Tests Preview.1', function() {
	this.timeout( 20000 );
	var client = {};
	var fields = [
		{ field: { id: -3, name: 'ID', refName: 'System.Id' }, value: 7 },
		{ field: { id: -2, name: 'Area ID', refName: 'System.AreaId' }, value: 769 },
		{ field: { id: -7, name: 'Area Path', refName: 'System.AreaPath' }, value: 'TFS Integration' },
		{ field: { id: -12, name: 'Node Name', refName: 'System.NodeName' }, value: 'TFS Integration' },
		{ field: { id: -42, name: 'Team Project', refName: 'System.TeamProject' }, value: 'TFS Integration' },
		{ field: { id: -43, name: 'Area Level 1', refName: 'System.AreaLevel1' }, value: 'TFS Integration' },
		{ field: { id: 8, name: 'Rev', refName: 'System.Rev' }, value: 20 }
	];

	before( function( done ) {
		client = Client.createClient( url, collection, username, password, getOptions( "1.0-preview.1" ) );
		clientOAuth = Client.createOAuthClient( url, collection, oauthToken, getOptions( "1.0-preview.1" ) );
		// console.log(oauthToken);
		done();
	} );

	it( 'has a credential valid client', function() {
		should.exist( client );
		client.should.have.property( 'url' );
		client.should.have.property( '_authType' );
		client._authType.should.equal( 'Credential' );
		should.exist( client.client );
		should.not.exist( client.clientSPS );
	} );

	it( 'has a OAuth valid client', function() {
		should.exist( clientOAuth );
		clientOAuth.should.have.property( 'url' );
		clientOAuth.should.have.property( '_authType' );
		clientOAuth._authType.should.equal( 'OAuth' );
		should.exist( clientOAuth.client );
		should.exist( clientOAuth.clientSPS );
	} );

	it( 'has overriden version', function() {
		var version = "1.0-preview-unitTest";
		clientWithVersion = Client.createClient( url, collection, username, password, { apiVersion: version } );

		clientWithVersion.apiVersion.should.equal( version );
	} );

	it( 'has default version', function() {
		var expectedVersion = "1.0";
		clientWithVersion = Client.createClient( url, collection, username, password );

		clientWithVersion.apiVersion.should.equal( expectedVersion );
	} );


	it( 'should return a field by name', function() {
		var field = client.findItemField( fields, 'System.Rev' );
		should.exist( field );
		field.value.should.equal( 20 );
	} );

	it( 'should return the first field by name', function() {
		var field = client.findFirstItemField( fields, [ 'Bogus', 'System.Rev', 'System.Id' ] );
		should.exist( field );
		field.value.should.equal( 20 );
		field.field.name.should.equal( 'Rev' );
	} );


	describe( 'Auth tests', function() {

		it( 'should fail authentication with error', function( done ) {

			var clientWithWrongCredential = Client.createClient( url, collection, "DUMMY_USER_NAME", "DUMMY PASSWORD SET TO FAIL", getOptions() );

			clientWithWrongCredential.getProjects( function( err, projects ) {
				should.exist( err );
				done();
			} );
		} );
	} );


	describe( 'Project tests', function() {
		var testProject = null,
			testCollection = null,
			testTeam = null,
			tagName = null,
			testTag = null;

		before( function( done ) {
			tagName = 'testTag-' + ( Math.random() + 1 ).toString( 36 ).substring( 7 );
			done();
		} );

		// ---------------------------------------
		// Projects
		// ---------------------------------------

		it( 'should return a list of projects', function( done ) {
			client.getProjects( function( err, projects ) {
				should.not.exist( err );
				should.exist( projects );
				// console.log(projects);
				projects.length.should.be.above( 0 );
				var project = _.find( projects, function( p ) {
					return p.name === testProjectName;
				} );
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				should.exist( project.collection );
				should.exist( project.defaultTeam );
				testProject = project;
				// console.log(testProject);
				done();
			} );
		} );

		it( 'should return only one project', function( done ) {
			client.getProjects( false, null, 1, 0, function( err, projects ) {
				should.not.exist( err );
				should.exist( projects );
				// console.log(projects);
				projects.length.should.equal( 1 );
				var project = projects[ 0 ];
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				should.exist( project.collection );
				should.exist( project.defaultTeam );
				done();
			} );
		} );

		it( 'should return project capabilities', function( done ) {
			client.getProjects( true, function( err, projects ) {
				should.not.exist( err );
				should.exist( projects );
				// console.log(projects);
				projects.length.should.be.above( 0 );
				var project = projects[ 0 ];
				project.should.have.property( 'capabilities' );
				project.capabilities.should.be.instanceOf( Object );
				// for(var i = 0; i < projects.length; i++) {
				//   console.log(projects[i]);
				// }
				done();
			} );
		} );

		it( 'should retrieve a project by id', function( done ) {
			should.exist( testProject );
			client.getProject( testProject.id, false, function( err, project ) {
				if ( err ) {
					console.log( err );
					console.log( project );
				}
				should.not.exist( err );
				should.exist( project );
				// console.log(project);
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				should.exist( project.collection );
				should.exist( project.defaultTeam );
				done();
			} );
		} );

		// ---------------------------------------
		// Project Teams
		// ---------------------------------------

		it( 'should retrieve teams by project id', function( done ) {
			should.exist( testProject );
			client.getTeams( testProject.id, function( err, teams ) {
				if ( err ) {
					console.log( err );
					console.log( teams );
				}
				should.not.exist( err );
				should.exist( teams );
				// console.log(teams);
				teams.length.should.be.above( 0 );
				var team = teams[ 0 ];
				team.should.have.property( 'id' );
				team.should.have.property( 'name' );
				team.should.have.property( 'url' );
				team.should.have.property( 'description' );
				team.should.have.property( 'identityUrl' );
				testTeam = team;
				done();
			} );
		} );

		it( 'should retrieve a team by project and team id', function( done ) {
			should.exist( testProject );
			should.exist( testTeam );
			client.getTeam( testProject.id, testTeam.id, function( err, team ) {
				if ( err ) {
					console.log( err );
					console.log( team );
				}
				should.not.exist( err );
				should.exist( team );
				team.should.have.property( 'id' );
				team.should.have.property( 'name' );
				team.should.have.property( 'url' );
				team.should.have.property( 'description' );
				team.should.have.property( 'identityUrl' );
				done();
			} );
		} );

		it( 'should retrieve team members by project and team id', function( done ) {
			should.exist( testProject );
			should.exist( testTeam );
			client.getTeamMembers( testProject.id, testTeam.id, function( err, members ) {
				if ( err ) {
					console.log( err );
					console.log( members );
				}
				should.not.exist( err );
				should.exist( members );
				// console.log(members);
				members.length.should.be.above( 0 );
				var member = members[ 0 ];
				member.should.have.property( 'id' );
				member.should.have.property( 'displayName' );
				member.should.have.property( 'uniqueName' );
				member.should.have.property( 'url' );
				member.should.have.property( 'imageUrl' );
				done();
			} );
		} );

		// ---------------------------------------
		// Collections
		// ---------------------------------------

		it( 'should return a list of project collections', function( done ) {
			client.getProjectCollections( function( err, collections ) {
				should.not.exist( err );
				should.exist( collections );
				// console.log(collections);
				collections.length.should.be.above( 0 );
				var collection = collections[ 0 ];
				collection.should.have.property( 'id' );
				collection.should.have.property( 'name' );
				collection.should.have.property( 'url' );
				collection.should.have.property( 'collectionUrl' );
				collection.should.have.property( 'state' );
				testCollection = collection;
				done();
			} );
		} );

		it( 'should return a project collection by id', function( done ) {
			should.exist( testCollection );
			client.getProjectCollection( testCollection.id, function( err, collection ) {
				should.not.exist( err );
				should.exist( collection );
				collection.should.have.property( 'id' );
				collection.should.have.property( 'name' );
				collection.should.have.property( 'url' );
				collection.should.have.property( 'collectionUrl' );
				collection.should.have.property( 'state' );
				done();
			} );
		} );

		// ---------------------------------------
		// Tags
		// ---------------------------------------

		it( 'should create a tag', function( done ) {
			should.exist( testProject );
			client.createTag( testProject.id, tagName, function( err, tag ) {
				if ( err ) {
					console.log( err );
					console.log( tag );
				}
				should.not.exist( err );
				should.exist( tag );
				// console.log(tag);
				testTag = tag;
				done();
			} );
		} );

		it( 'should update a tag', function( done ) {
			should.exist( testProject );
			should.exist( testTag );
			client.updateTag( testProject.id, testTag.id, tagName + '-updated', true, function( err, tag ) {
				if ( err ) {
					console.log( err );
					console.log( tag );
				}
				should.not.exist( err );
				should.exist( tag );
				// console.log(tag);
				done();
			} );
		} );

		it( 'should retrieve tags by project id', function( done ) {
			should.exist( testProject );
			// Work-around, tags don't always immediately appear after being created
			setTimeout( function( done ) {
				client.getTags( testProject.id, true, function( err, tags ) {
					if ( err ) {
						console.log( err );
						console.log( tags );
					}
					should.not.exist( err );
					should.exist( tags );
					// console.log(tags);
					tags.length.should.be.above( 0 );
					if ( tags.length > 0 ) {
						var tag = tags[ 0 ];
						tag.should.have.property( 'id' );
						tag.should.have.property( 'name' );
						tag.should.have.property( 'active' );
						tag.should.have.property( 'url' );
					}
					done();
				} );
			}, 5000, done );
		} );

		it( 'should delete a tag', function( done ) {
			should.exist( testProject );
			should.exist( testTag );
			client.deleteTag( testProject.id, testTag.id, function( err, tag ) {
				if ( err ) {
					console.log( err );
					console.log( tag );
				}
				should.not.exist( err );
				should.exist( tag );
				// console.log(tag);
				done();
			} );
		} );

	} );

	// ---------------------------------------
	// Queries
	// ---------------------------------------

	describe( 'Queries', function() {

		var myQueries = null;
		var testQuery = null;
		var testFolder = null;
		var myBugsQuery = null;
		var testProject = null;

		before( function( done ) {
			client.getProjects( function( err, projects ) {
				testProject = _.find( projects, function( p ) {
					return p.name === testProjectName;
				} );
				done();
			} );
		} );

		it( 'should return a list of queries', function( done ) {
			should.exist( testProject );
			client.getQueries( testProject.name, 2, function( err, queries ) {
				if ( err ) {
					console.log( err );
					console.log( queries );
				}
				should.not.exist( err );
				should.exist( queries );
				//console.log(queries);
				queries.length.should.be.above( 0 );
				var folder = _.find( queries, function( q ) {
					return q.name === 'My Queries';
				} );
				should.exist( folder );
				myQueries = folder;
				var sharedFolder = _.find( queries, function( q ) {
					return q.name === 'Shared Queries';
				} );
				should.exist( sharedFolder );
				sharedFolder.value.should.be.instanceOf( Array );
				sharedFolder.value.length.should.be.above( 0 );
				//console.log(sharedFolder);
				var query = _.find( sharedFolder.value, function( q ) {
					return q.name === 'My Bugs';
				} );
				should.exist( query );
				query.should.have.property( 'id' );
				query.should.have.property( 'name' );
				query.should.have.property( 'url' );
				myBugsQuery = query;
				done();
			} );
		} );

		it( 'should return a list of work items from saved query', function( done ) {
			should.exist( testProject );
			should.exist( myBugsQuery );

			client.getWorkItemIdsByQuery( myBugsQuery.id, testProject.name, function( err, ids ) {
				if ( err ) {
					console.log( err );
					console.log( ids );
				}
				ids.should.be.instanceOf( Array );
				ids.length.should.be.above( 0 );
				// console.log(ids);
				done();
			} );
		} );

		it( 'should return a query', function( done ) {
			should.exist( testProject );
			should.exist( myBugsQuery );

			client.getQuery( testProject.name, myBugsQuery.id, function( err, query ) {
				if ( err ) {
					console.log( err );
					console.log( query );
				}
				should.not.exist( err );
				should.exist( query );
				//console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'name' );

				query.should.have.property( 'url' );
				done();
			} );
		} );

		it( 'should create a query folder', function( done ) {
			testFolder = null;
			should.exist( testProject );
			should.exist( myQueries );
			client.createFolder( testProject.name, 'testFolder1', myQueries.id, function( err, folder ) {
				should.not.exist( err );
				should.exist( folder );
				// console.log(folder);
				folder.should.have.property( 'id' );
				folder.should.have.property( 'url' );
				testFolder = folder;
				done();
			} );
		} );

		it( 'should create a query', function( done ) {
			testQuery = null;
			should.exist( testProject );
			should.exist( testFolder );

			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';

			client.createQuery( testProject.name, 'testQuery1', testFolder.id, wiql, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				//console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'url' );
				testQuery = query;
				done();
			} );
		} );

		it( 'should update a query', function( done ) {
			should.exist( testProject );
			should.exist( testFolder );
			should.exist( testQuery );

			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] asc';

			client.updateQuery( testProject.name, testQuery.id, 'testQuery1-updated', testFolder.id, wiql, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				// console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'url' );
				testQuery = query;
				done();
			} );
		} );

		it( 'should delete a query', function( done ) {
			should.exist( testProject );
			should.exist( testQuery );
			client.deleteQuery( testProject.name, testQuery.id, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				done();
			} );
		} );

		it( 'should delete a query folder', function( done ) {
			should.exist( testProject );
			should.exist( testFolder );
			client.deleteFolder( testProject.name, testFolder.id, function( err, folder ) {
				should.not.exist( err );
				should.exist( folder );
				// console.log(folder);
				done();
			} );
		} );

	} );

	describe( 'Work Item Tests', function() {
		var testItemIds = null;
		var testItemIdArray = null;
		var testItemId = null;

		// ---------------------------------------
		// Work Item Queries
		// ---------------------------------------

		it( 'should return a list of work items from wiql query', function( done ) {
			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Task\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';

			client.getWorkItemIds( wiql, testProjectName, function( err, ids ) {
				if ( err ) {
					console.log( err );
					console.log( ids );
				}
				should.not.exist( err );
				should.exist( ids );
				//console.log(ids);
				ids.should.be.instanceOf( Array );
				ids.length.should.be.above( 0 );
				testItemIdArray = ids;
				testItemIds = ids.join( ',' );
				testItemId = ids[ 0 ];
				done();
			} );
		} );

		it( 'should return a list of work items by comma-separated id list', function( done ) {
			client.getWorkItemsById( testItemIds, null, null, null, function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				items.length.should.be.above( 0 );
				var item = items[ 0 ];
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				item.should.have.property( 'webUrl' );
				should.exist( item.fields );
				var systemIdField = _.find( item.fields, function( field ) {
					return field.field.refName === 'System.Id';
				} );
				should.exist( systemIdField );
				done();
			} );
		} );

		it( 'should return a list of work items by array of ids', function( done ) {
			client.getWorkItemsById( testItemIdArray, null, null, null, function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				items.length.should.equal( testItemIdArray.length );
				var item = items[ 0 ];
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				item.should.have.property( 'webUrl' );
				should.exist( item.fields );
				var systemIdField = _.find( item.fields, function( field ) {
					return field.field.refName === 'System.Id';
				} );
				should.exist( systemIdField );
				done();
			} );
		} );

		it( 'should return a list of work items by ids with expanded links', function( done ) {
			client.getWorkItemsById( testItemIds, null, null, 'all', function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				// console.log(items);
				items.length.should.be.above( 0 );
				var item = _.find( items, function( i ) {
					return i.links;
				} );
				if ( item ) {
					// console.log(item);
					item.should.have.property( 'id' );
					item.should.have.property( 'rev' );
					item.should.have.property( 'url' );
					item.should.have.property( 'links' );
					should.exist( item.fields );
					var systemIdField = _.find( item.fields, function( field ) {
						return field.field.refName === 'System.Id';
					} );
					should.exist( systemIdField );
					should.exist( item.links );
					item.links.length.should.be.above( 0 );
					testItemId = item.id;
					// console.log(item.links);
				}
				done();
			} );
		} );

		it( 'should return a work item by id', function( done ) {
			client.getWorkItem( testItemId, 'all', function( err, item ) {
				//client.getWorkItem(7, 'all', function(err, item) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				// console.log(item);
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				item.should.have.property( 'webUrl' );
				should.exist( item.fields );
				var systemIdField = _.find( item.fields, function( field ) {
					return field.field.refName === 'System.Id';
				} );
				should.exist( systemIdField );
				done();
			} );
		} );

		it( 'should return work item updates', function( done ) {
			client.getWorkItemUpdates( testItemId, function( err, updates ) {
				if ( err ) {
					console.log( err );
					console.log( updates );
				}
				should.not.exist( err );
				should.exist( updates );
				//console.log(updates);
				updates.length.should.be.above( 0 );
				var update = updates[ updates.length - 1 ];
				// console.log(update);
				update.should.have.property( 'id' );
				update.should.have.property( 'rev' );
				should.exist( update.fields );
				done();
			} );
		} );

		it( 'should return a page of work item updates', function( done ) {
			client.getWorkItemUpdates( testItemId, 2, 0, function( err, updates ) {
				if ( err ) {
					console.log( err );
					console.log( updates );
				}
				should.not.exist( err );
				should.exist( updates );
				//console.log(updates);
				updates.length.should.equal( 2 );
				updates[ updates.length - 1 ].rev.should.be.above( 1 );
				done();
			} );
		} );

		it( 'should return a work item update by revision number', function( done ) {
			client.getWorkItemUpdate( testItemId, 1, function( err, update ) {
				if ( err ) {
					console.log( err );
					console.log( update );
				}
				should.not.exist( err );
				should.exist( update );
				//console.log(update);
				update.should.have.property( 'id' );
				update.should.have.property( 'rev' );
				update.should.have.property( 'url' );
				should.exist( update.fields );
				done();
			} );
		} );

		it( 'should return a work item by revision number', function( done ) {
			client.getWorkItemRevision( testItemId, 1, function( err, item ) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				//console.log(item);
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				item.should.have.property( 'webUrl' );
				item.should.have.property( 'fields' );
				should.exist( item.fields );
				var systemIdField = _.find( item.fields, function( field ) {
					return field.field.refName === 'System.Id';
				} );
				should.exist( systemIdField );
				done();
			} );
		} );

	} );

	// Accounts and Profiles Tests are not testable since they required
	// OAuth, thus requiring human intervention to get a token with
	// an authorization

	describe.skip( 'Accounts', function() {
		it( 'should return a list of accounts', function( done ) {
			clientOAuth.getAccounts( memberId, function( err, accounts ) {
				// console.log(err);
				should.not.exist( err );
				should.exist( accounts );
				// console.log(accounts);
				accounts.should.be.instanceOf( Array );
				accounts.length.should.be.above( 0 );
				var account = accounts[ 0 ];
				account.should.have.property( 'accountId' );
				account.should.have.property( 'accountUri' );
				account.should.have.property( 'accountName' );
				account.should.have.property( 'organizationName' );
				done();
			} );
		} );
	} );

	describe.skip( 'Team Room tests', function() {
		it( 'should return a list of team rooms', function( done ) {
			client.getRooms( function( err, rooms ) {
				should.not.exist( err );
				should.exist( rooms );
				console.log( rooms );
				done();
			} );
		} );
	} );

	describe( 'Version Control tests', function() {

		before( function() {
			client.setVersion( '1.0-preview.1' );
		} );

		// ---------------------------------------
		// Version Control
		// ---------------------------------------

		it( 'should return root branches', function( done ) {
			client.getRootBranches( function( err, branches ) {
				if ( err ) {
					console.log( err, branches );
				}
				should.not.exist( err );
				should.exist( branches );
				// console.log(branches);
				done();
			} );
		} );

		it.skip( 'should return a branch', function( done ) {
			var path = '$/TestProject';
			client.getBranch( path, true, true, true, function( err, branch ) {
				if ( err ) {
					console.log( err, branch );
				}
				should.not.exist( err );
				should.exist( branch );
				// console.log(branch);
				done();
			} );
		} );

		it( 'should return shelvesets', function( done ) {
			client.getShelveSets( function( err, shelvesets ) {
				if ( err ) {
					console.log( err, shelvesets );
				}
				should.not.exist( err );
				should.exist( shelvesets );
				// console.log(shelvesets);
				done();
			} );
		} );

		var testCommitId = null;
		var testChangeSet = null;

		it( 'should return changesets', function( done ) {
			client.getChangeSets( function( err, changesets ) {
				if ( err ) {
					console.log( err, changesets );
				}
				should.not.exist( err );
				should.exist( changesets );
				// console.log(changesets);
				changesets.should.be.instanceOf( Array );
				changesets.length.should.be.above( 0 );
				var changeset = changesets[ 0 ];
				changeset.should.have.property( 'changesetId' );
				changeset.should.have.property( 'url' );
				changeset.should.have.property( 'createdDate' );
				changeset.should.have.property( 'comment' );
				changeset.author.should.be.instanceOf( Object );
				changeset.checkedInBy.should.be.instanceOf( Object );
				testCommitId = changeset.changesetId;
				done();
			} );
		} );

		it( 'should return a changeset by id', function( done ) {
			if ( testCommitId ) {
				client.getChangeSet( testCommitId, function( err, changeset ) {
					if ( err ) {
						console.log( err, changeset );
					}
					should.not.exist( err );
					should.exist( changeset );
					// console.log(changeset);
					changeset.should.have.property( 'changesetId' );
					changeset.should.have.property( 'url' );
					changeset.should.have.property( 'createdDate' );
					changeset.should.have.property( 'comment' );
					changeset.author.should.be.instanceOf( Object );
					changeset.checkedInBy.should.be.instanceOf( Object );
					testChangeSet = changeset;
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'should return changsets from range of IDs', function( done ) {
			if ( testChangeSet ) {
				var toId = testChangeSet.changesetId;
				var fromId = toId - 2;
				var expectedCount = 3;
				if ( fromId < 1 ) {
					fromId = 1;
					expectedCount = toId - fromId + 1;
				}
				var queryOptions = {
					fromId: fromId,
					toId: testChangeSet.changesetId
				};
				client.getChangeSets( queryOptions, function( err, changesets ) {
					if ( err ) {
						console.log( err, changesets );
					}
					should.not.exist( err );
					should.exist( changesets );
					// console.log(changesets);
					changesets.should.be.instanceOf( Array );
					changesets.length.should.equal( expectedCount );
					var changeset = changesets[ 0 ];
					changeset.should.have.property( 'changesetId' );
					changeset.should.have.property( 'url' );
					changeset.should.have.property( 'createdDate' );
					changeset.should.have.property( 'comment' );
					changeset.author.should.be.instanceOf( Object );
					changeset.checkedInBy.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'should return a changeset by id with details', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					includeDetails: true,
					includeWorkItems: false,
					maxChangeCount: 0,
					maxCommentLength: 1000
				};
				client.getChangeSet( testCommitId, queryOptions, function( err, changeset ) {
					if ( err ) {
						console.log( err, changeset );
					}
					should.not.exist( err );
					should.exist( changeset );
					// console.log(changeset);
					changeset.checkinNotes.should.be.instanceOf( Array );
					changeset.policyOverride.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'should return a changeset by id with work items', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					includeDetails: false,
					includeWorkItems: true,
					maxChangeCount: 0,
					maxCommentLength: 1000
				};
				client.getChangeSet( testCommitId, queryOptions, function( err, changeset ) {
					if ( err ) {
						console.log( err, changeset );
					}
					should.not.exist( err );
					should.exist( changeset );
					// console.log(changeset);
					changeset.workItems.should.be.instanceOf( Array );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it.skip( 'should return latest changeset changes', function( done ) {
			client.getChangeSetChanges( function( err, changes ) {
				if ( err ) {
					console.log( err, changes );
				}
				should.not.exist( err );
				should.exist( changes );
				// console.log(changes);
				changes.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should return changes for a changeset by id', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					id: testCommitId
				};
				client.getChangeSetChanges( queryOptions, function( err, changes ) {
					if ( err ) {
						console.log( err, changes );
					}
					should.not.exist( err );
					should.exist( changes );
					// console.log(changes);
					changes.should.be.instanceOf( Array );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it.skip( 'should return latest changeset work items', function( done ) {
			client.getChangeSetWorkItems( function( err, workitems ) {
				if ( err ) {
					console.log( err, workitems );
				}
				should.not.exist( err );
				should.exist( workitems );
				// console.log(workitems);
				workitems.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should return work items for a changeset by id', function( done ) {
			if ( testCommitId ) {
				var queryOptions = {
					id: testCommitId
				};
				client.getChangeSetWorkItems( queryOptions, function( err, workitems ) {
					if ( err ) {
						console.log( err, workitems );
					}
					should.not.exist( err );
					should.exist( workitems );
					// console.log(workitems);
					workitems.should.be.instanceOf( Array );
					done();
				} );
			} else {
				console.log( 'Warning: no test change set' );
				done();
			}
		} );

		it( 'should get a list of labels', function( done ) {
			client.getLabels( function( err, labels ) {
				if ( err ) {
					console.log( err, labels );
				}
				should.not.exist( err );
				should.exist( labels );
				// console.log(labels);
				labels.should.be.instanceOf( Array );
				done();
			} );
		} );
	} );

	describe( 'Git repository tests', function() {

		// ---------------------------------------
		// Git Repositories
		// ---------------------------------------

		var testRepoName = null;
		var testRepository = null;
		var testGitProject = null;
		var testCommit = null;

		before( function( done ) {
			testRepoName = 'testRepo-' + ( Math.random() + 1 ).toString( 36 ).substring( 7 );
			client.getProjects( true, function( err, projects ) {
				// console.log(projects);
				// console.log(projects[0]);
				// Find a project that uses git
				if ( projects && projects.length > 0 ) {
					testGitProject = _.find( projects, function( p ) {
						return p.name === testProjectName && p.capabilities.versioncontrol.sourceControlType === 'Git';
					} );
					// Test project is not git. Try to find another one
					if ( typeof (testGitProject) === "undefined" || testGitProject === null ) {
						testGitProject = _.find( projects, function( p ) {
							return p.capabilities.versioncontrol.sourceControlType === 'Git';
						} );
					}
				}
				done();
			} );
		} );

		it( 'should create a git repository', function( done ) {
			if ( testGitProject ) {
				client.createRepository( testGitProject.id, testRepoName, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					testRepository = repository;
					done();
				} );
			} else {
				console.log( 'Warning: missing test project' );
				done();
			}
		} );

		it( 'should return a list of repositories', function( done ) {
			client.getRepositories( function( err, repositories ) {
				should.not.exist( err );
				should.exist( repositories );
				// console.log(repositories);
				if ( repositories.length > 0 ) {
					var repository = repositories[ 0 ];
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
				}
				done();
			} );
		} );

		it( 'should return a list of repositories by project', function( done ) {
			if ( testGitProject ) {
				client.getRepositories( testGitProject.id, function( err, repositories ) {
					should.not.exist( err );
					should.exist( repositories );
					repositories.length.should.be.above( 0 );
					done();
				} );
			} else {
				console.log( 'Warning: missing test project' );
				done();
			}
		} );

		it( 'should return a repository by id', function( done ) {
			if ( testRepository ) {
				client.getRepository( testRepository.id, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'should return a repository by name', function( done ) {
			if ( testRepository ) {
				client.getRepository( testRepository.name, testProject.id, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'should rename a repository', function( done ) {
			if ( testRepository ) {
				client.renameRepository( testRepository.id, testRepository.name + '-update', function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					repository.should.have.property( 'id' );
					repository.should.have.property( 'name' );
					repository.should.have.property( 'remoteUrl' );
					repository.project.should.be.instanceOf( Object );
					repository.name.should.equal( testRepository.name + '-update' );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'should delete a repository', function( done ) {
			if ( testRepository ) {
				client.deleteRepository( testRepository.id, function( err, repository ) {
					should.not.exist( err );
					should.exist( repository );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'should get a list of commits', function( done ) {
			if ( testGitProject ) {
				client.getRepositories( testGitProject.id, function( err, repositories ) {
					should.not.exist( err );
					should.exist( repositories );
					if ( repositories.length > 0 ) {
						var repository = repositories[ 0 ];
						testRepository = repository;
						client.getCommits( repository.id, function( err, commits ) {
							should.not.exist( err );
							should.exist( commits );
							commits.should.be.instanceOf( Array );
							// console.log(commits);
							if ( commits.length > 0 ) {
								var commit = commits[ 0 ];
								commit.should.have.property( 'commitId' );
								commit.should.have.property( 'comment' );
								commit.should.have.property( 'url' );
								commit.author.should.be.instanceOf( Object );
								commit.committer.should.be.instanceOf( Object );
								commit.changeCounts.should.be.instanceOf( Object );
								testCommit = commit;
							}
							// console.log(commits);
							done();
						} );
					} else {
						conosole.log( 'Warning: no repositories in project', testProject );
						done();
					}
				} );
			} else {
				console.log( 'Warning: missing test project' );
				done();
			}
		} );

		it( 'should get a list of commits by author', function( done ) {
			if ( testRepository && testCommit ) {
				client.getCommits( testRepository.id, null, null, testCommit.author.name, function( err, commits ) {
					should.not.exist( err );
					should.exist( commits );
					commits.should.be.instanceOf( Array );
					commits.length.should.be.above( 0 );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository and commit' );
				done();
			}
		} );

		it( 'should get a commit by id', function( done ) {
			if ( testRepository && testCommit ) {
				client.getCommit( testRepository.id, testCommit.commitId, function( err, commit ) {
					should.not.exist( err );
					should.exist( commit );
					commit.parents.should.be.instanceOf( Array );
					commit.should.have.property( 'treeId' );
					commit.push.should.be.instanceOf( Object );
					commit.should.have.property( 'commitId' );
					commit.should.have.property( 'comment' );
					commit.should.have.property( 'url' );
					commit.author.should.be.instanceOf( Object );
					commit.committer.should.be.instanceOf( Object );
					should.not.exist( commit.changes );
					// console.log(commit);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository and commit' );
				done();
			}
		} );

		it( 'should get a commit by id with changed items', function( done ) {
			if ( testRepository && testCommit ) {
				client.getCommit( testRepository.id, testCommit.commitId, 10, function( err, commit ) {
					should.not.exist( err );
					should.exist( commit );
					// console.log(commit);
					commit.changes.should.be.instanceOf( Array );
					commit.changeCounts.should.be.instanceOf( Object );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository and commit' );
				done();
			}
		} );

		it( 'should get a list of commit diffs', function( done ) {
			if ( testRepository ) {
				client.getDiffs( testRepository.id, null, 'master', null, 'develop', function( err, diffs ) {
					should.not.exist( err );
					should.exist( diffs );
					diffs.should.have.property( 'allChangesIncluded' );
					diffs.changes.should.be.instanceOf( Array );
					diffs.should.have.property( 'commonCommit' );
					diffs.should.have.property( 'aheadCount' );
					diffs.should.have.property( 'behindCount' );
					// console.log(diffs);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'should get a list of pushes', function( done ) {
			if ( testRepository ) {
				client.getPushes( testRepository.id, function( err, pushes ) {
					should.not.exist( err );
					should.exist( pushes );
					pushes.should.be.instanceOf( Array );
					pushes.length.should.be.above( 0 );
					// console.log(pushes);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'should get stats for repository', function( done ) {
			if ( testRepository ) {
				client.getStats( testRepository.id, function( err, stats ) {
					should.not.exist( err );
					should.exist( stats );
					stats.should.be.instanceOf( Array );
					stats.length.should.be.above( 0 );
					// console.log(stats);
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

		it( 'should get refs for repository', function( done ) {
			if ( testRepository ) {
				client.getRefs( testRepository.id, function( err, refs ) {
					should.not.exist( err );
					should.exist( refs );
					refs.should.be.instanceOf( Array );
					refs.length.should.be.above( 0 );
					// console.log(refs);
					var ref = refs[ 0 ];
					ref.should.have.property( 'name' );
					ref.should.have.property( 'objectId' );
					ref.should.have.property( 'url' );
					done();
				} );
			} else {
				console.log( 'Warning: missing test repository' );
				done();
			}
		} );

	} );

	describe( 'Service Hook tests', function() {

		// ---------------------------------------
		// Service Hooks
		// ---------------------------------------

		it( 'should get a list of publishers', function( done ) {
			client.getConsumers( function( err, publishers ) {
				if ( err ) console.log( err, publishers );
				should.not.exist( err );
				should.exist( publishers );
				// console.log(publishers);
				publishers.should.be.instanceOf( Array );
				var publisher = _.find( publishers, function( c ) {
					return c.id === 'webHooks';
				} );
				should.exist( publisher );
				// console.log(publisher);
				// console.log(publisher.actions[0].inputDescriptors);
				publisher.should.have.property( 'id' );
				publisher.should.have.property( 'url' );
				publisher.should.have.property( 'name' );
				publisher.should.have.property( 'description' );
				publisher.should.have.property( 'informationUrl' );
				publisher.should.have.property( 'authenticationType' );
				publisher.inputDescriptors.should.be.instanceOf( Array );
				publisher.actions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a list of consumers', function( done ) {
			client.getConsumers( function( err, consumers ) {
				if ( err ) console.log( err, consumers );
				should.not.exist( err );
				should.exist( consumers );
				// console.log(consumers);
				consumers.should.be.instanceOf( Array );
				var zendesk = _.find( consumers, function( c ) {
					return c.id === 'zendesk';
				} );
				should.exist( zendesk );
				// console.log(zendesk);
				zendesk.should.have.property( 'id' );
				zendesk.should.have.property( 'url' );
				zendesk.should.have.property( 'name' );
				zendesk.should.have.property( 'description' );
				zendesk.should.have.property( 'informationUrl' );
				zendesk.should.have.property( 'authenticationType' );
				zendesk.inputDescriptors.should.be.instanceOf( Array );
				zendesk.actions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a consumer by id', function( done ) {
			client.getConsumer( 'zapier', function( err, consumer ) {
				if ( err ) console.log( err, consumer );
				should.not.exist( err );
				should.exist( consumer );
				// console.log(consumer);
				consumer.should.have.property( 'id' );
				consumer.should.have.property( 'url' );
				consumer.should.have.property( 'name' );
				consumer.should.have.property( 'description' );
				consumer.should.have.property( 'informationUrl' );
				consumer.should.have.property( 'authenticationType' );
				consumer.inputDescriptors.should.be.instanceOf( Array );
				consumer.actions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a list of consumer actions by id', function( done ) {
			client.getConsumerActions( 'zapier', function( err, actions ) {
				if ( err ) console.log( err, actions );
				should.not.exist( err );
				should.exist( actions );
				// console.log(actions);
				actions.should.be.instanceOf( Array );
				actions.length.should.be.above( 0 );
				var action = actions[ 0 ];
				// console.log(action);
				action.should.have.property( 'id' );
				action.should.have.property( 'consumerId' );
				action.should.have.property( 'url' );
				action.should.have.property( 'name' );
				action.should.have.property( 'description' );
				action.inputDescriptors.should.be.instanceOf( Array );
				action.supportedEventTypes.should.be.instanceOf( Array );
				done();
			} );
		} );

		it( 'should get a list of consumer action by id', function( done ) {
			client.getConsumerAction( 'zapier', 'sendNotification', function( err, action ) {
				if ( err ) console.log( err, action );
				should.not.exist( err );
				should.exist( action );
				// console.log(action);
				action.should.have.property( 'id' );
				action.should.have.property( 'consumerId' );
				action.should.have.property( 'url' );
				action.should.have.property( 'name' );
				action.should.have.property( 'description' );
				action.inputDescriptors.should.be.instanceOf( Array );
				action.supportedEventTypes.should.be.instanceOf( Array );
				done();
			} );
		} );

		it.skip( 'should create a subscription', function( done ) {
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
			client.createSubscription( subscription, function( err, sub ) {
				if ( err ) console.log( err, sub );
				should.not.exist( err );
				should.exist( sub );
				console.log( sub );
			} );
		} );

		it( 'should get a list of subscriptions', function( done ) {
			client.getSubscriptions( function( err, subscriptions ) {
				if ( err ) console.log( err, subscriptions );
				should.not.exist( err );
				should.exist( subscriptions );
				// console.log(subscriptions);
				subscriptions.should.be.instanceOf( Array );
				done();
			} );
		} );

		it.skip( 'should get a list of subscriptions by query', function( done ) {
			// Documentation incomplete
			var queryOptions = {
				publisherId: '',
				eventType: '',
				consumerId: '',
				consumerActionId: '',
				publisherInputFilters: [ {
					conditions: [ {
						inputId: '',
						operator: 'equals',
						inputValue: ''
					} ]
				} ]
			};
			client.querySubscriptions( queryOptions, function( err, subscriptions ) {
				if ( err ) console.log( err, subscriptions );
				should.not.exist( err );
				should.exist( subscriptions );
				// console.log(subscriptions);
				subscriptions.should.be.instanceOf( Array );
				done();
			} );
		} );


	} );

	describe.skip( 'Build tests', function() {

		it( 'should return a list of build definitions', function( done ) {
			client.getBuildDefinitions( function( err, builds ) {
				should.not.exist( err );
				should.exist( builds );
				builds.length.should.be.above( 0 );
				var build = builds[ 0 ];
				build.should.have.property( 'id' );
				build.should.have.property( 'name' );
				build.should.have.property( 'url' );
				done();
			} );
		} );

		it( 'should queue a build', function( done ) {
			var buildRequest = { definition: { id: 1 }, reason: 'Manual', priority: 'Normal' };
			// console.log(buildRequest);
			client.queueBuild( buildRequest, function( err, buildResponse ) {
				should.not.exist( err );
				should.exist( buildResponse );
				buildResponse.length.should.be.above( 0 );
				buildResponse.should.have.property( 'status' );
				done();
			} );
		} );
	} );

} );



describe( 'VSO Client Tests Preview.2', function() {
	this.timeout( 20000 );
	var testProject;
	var client;
	var fields = [
		{ field: { id: -3, name: 'ID', refName: 'System.Id' }, value: 7 },
		{ field: { id: -2, name: 'Area ID', refName: 'System.AreaId' }, value: 769 },
		{ field: { id: -7, name: 'Area Path', refName: 'System.AreaPath' }, value: 'TFS Integration' },
		{ field: { id: -12, name: 'Node Name', refName: 'System.NodeName' }, value: 'TFS Integration' },
		{ field: { id: -42, name: 'Team Project', refName: 'System.TeamProject' }, value: 'TFS Integration' },
		{ field: { id: -43, name: 'Area Level 1', refName: 'System.AreaLevel1' }, value: 'TFS Integration' },
		{ field: { id: 8, name: 'Rev', refName: 'System.Rev' }, value: 20 }
	];

	before( function( done ) {
		client = Client.createClient( url, collection, username, password, getOptions( "1.0" ) );
		client.getProjects( function( err, projects ) {
			testProject = _.find( projects, function( p ) {
				return p.name === testProjectName;
			} );
			if ( err )
				throw err;
			done();
		} );
	} );

	var myQueries = null;
	var testQuery = null;
	var testFolder = null;
	var myBugsQuery = null;

	describe( 'Work Item Query Tests', function() {

		it( 'should return a list of queries', function( done ) {
			should.exist( testProject );
			client.getQueries( testProject.name, 2, function( err, queries ) {
				if ( err ) {
					console.log( err );
					console.log( queries );
				}
				should.not.exist( err );
				should.exist( queries );
				//console.log(queries);
				queries.length.should.be.above( 0 );
				var folder = _.find( queries, function( q ) {
					return q.name === 'My Queries';
				} );
				should.exist( folder );
				myQueries = folder;
				var sharedFolder = _.find( queries, function( q ) {
					return q.name === 'Shared Queries';
				} );
				should.exist( sharedFolder );
				//console.log(sharedFolder);
				sharedFolder.children.should.be.instanceOf( Array );
				sharedFolder.children.length.should.be.above( 0 );
				var query = _.find( sharedFolder.children, function( q ) {
					return q.name === 'My Bugs';
				} );
				//console.log(query);
				should.exist( query );
				query.should.have.property( 'id' );
				query.should.have.property( 'isPublic' );
				query.should.have.property( 'name' );
				query.should.have.property( 'url' );
				myBugsQuery = query;
				done();
			} );
		} );

		it( 'should return a query', function( done ) {
			should.exist( testProject.name );
			should.exist( myBugsQuery );
			client.getQuery( testProject.name, myBugsQuery.id, function( err, query ) {
				if ( err ) {
					console.log( err );
					console.log( query );
				}
				should.not.exist( err );
				should.exist( query );
				//console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'isPublic' );
				query.should.have.property( 'name' );
				query.should.have.property( 'url' );
				done();
			} );
		} );

		it( 'should create a query folder', function( done ) {
			should.exist( myQueries );
			should.exist( testProject );
			client.createFolder( testProject.name, 'testFolder1', myQueries.id, function( err, folder ) {
				should.not.exist( err );
				should.exist( folder );
				folder.should.have.property( 'id' );
				testFolder = folder;
				done();
			} );
		} );

		it( 'should create a query', function( done ) {
			should.exist( testFolder );
			should.exist( testProject );

			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';

			client.createQuery( testProject.name, 'testQuery1', testFolder.id, wiql, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				//console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'url' );
				testQuery = query;
				done();
			} );
		} );

		it( 'should update a query', function( done ) {
			should.exist( testFolder );
			should.exist( testQuery );
			should.exist( testProject );

			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Bug\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] asc';

			client.updateQuery( testProject.name, testQuery.id, 'testQuery1-updated', null, wiql, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				// console.log(query);
				query.should.have.property( 'id' );
				query.should.have.property( 'url' );
				testQuery = query;
				done();
			} );
		} );

		it( 'should delete a query', function( done ) {
			should.exist( testQuery );
			should.exist( testProject );
			client.deleteQuery( testProject.name, testQuery.id, function( err, query ) {
				should.not.exist( err );
				should.exist( query );
				done();
			} );
		} );

		it( 'should delete a query folder', function( done ) {
			should.exist( testFolder );
			should.exist( testProject );
			client.deleteFolder( testProject.name, testFolder.id, function( err, folder ) {
				should.not.exist( err );
				should.exist( folder );
				done();
			} );
		} );

	} );

	describe( 'Work Item Tests', function() {
		var testItemIds = null;
		var testItemIdArray = null;
		var testItemId = null;

		// ---------------------------------------
		// Work Item Queries
		// ---------------------------------------
		it( 'should return a list of work items from wiql query', function( done ) {
			should.exist( testProject );
			var wiql = 'Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = \'Task\' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc';
			client.getWorkItemIds( wiql, testProject.name, function( err, ids ) {
				if ( err ) {
					console.log( err );
					console.log( ids );
				}
				should.not.exist( err );
				should.exist( ids );
				//console.log(ids);
				ids.should.be.instanceOf( Array );
				ids.length.should.be.above( 0 );
				testItemIdArray = ids;
				testItemIds = ids.join( ',' );
				testItemId = ids[ 0 ];
				done();
			} );
		} );


		it( 'should return a list of work items by comma-separated id list', function( done ) {
			client.getWorkItemsById( testItemIds, null, null, null, function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				items.length.should.be.above( 0 );
				var item = items[ 0 ];
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				//item.should.have.property('webUrl');
				should.exist( item.fields );
				item.fields.should.have.property( 'System.State' );
				done();
			} );
		} );

		it( 'should return a list of work items by array of ids', function( done ) {
			client.getWorkItemsById( testItemIdArray, null, null, null, function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				items.length.should.equal( testItemIdArray.length );
				var item = items[ 0 ];
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				should.exist( item.fields );
				item.fields.should.have.property( 'System.State' );
				done();
			} );
		} );

		it( 'should return a list of work items by ids with expanded links', function( done ) {
			client.getWorkItemsById( testItemIds, null, null, 'all', function( err, items ) {
				if ( err ) {
					console.log( err );
					console.log( items );
				}
				should.not.exist( err );
				should.exist( items );
				// console.log(items);
				items.length.should.be.above( 0 );
				var item = _.find( items, function( i ) {
					return i.links;
				} );
				if ( item ) {
					// console.log(item);
					item.should.have.property( 'id' );
					item.should.have.property( 'rev' );
					item.should.have.property( 'url' );
					item.should.have.property( '_links' );
					should.exist( item.fields );
					item.fields.should.have.property( 'System.State' );
					should.exist( item.links );
					item.links.length.should.be.above( 0 );
					testItemId = item.id;
					// console.log(item.links);
				}
				done();
			} );
		} );

		it( 'should return a work item by id', function( done ) {
			client.getWorkItem( testItemId, 'all', function( err, item ) {
				//client.getWorkItem(7, 'all', function(err, item) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				//console.log(item);
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				item.should.have.property( '_links' );
				should.exist( item.fields );
				item.fields.should.have.property( 'System.State' );
				done();
			} );
		} );

		it( 'should return work item updates', function( done ) {
			client.getWorkItemUpdates( testItemId, function( err, updates ) {
				if ( err ) {
					console.log( err );
					console.log( updates );
				}
				should.not.exist( err );
				should.exist( updates );
				//console.log(updates);
				updates.length.should.be.above( 0 );
				var update = updates[ updates.length - 1 ];
				// console.log(update);
				update.should.have.property( 'id' );
				update.should.have.property( 'rev' );
				should.exist( update.fields );
				done();
			} );
		} );

		it( 'should return a page of work item updates', function( done ) {
			client.getWorkItemUpdates( testItemId, 2, 0, function( err, updates ) {
				if ( err ) {
					console.log( err );
					console.log( updates );
				}
				should.not.exist( err );
				should.exist( updates );
				//console.log(updates);
				updates.length.should.equal( 2 );
				updates[ updates.length - 1 ].rev.should.be.above( 1 );
				done();
			} );
		} );

		it( 'should return a work item update by revision number', function( done ) {
			client.getWorkItemUpdate( testItemId, 2, function( err, update ) {
				if ( err ) {
					console.log( err );
					console.log( update );
				}
				should.not.exist( err );
				should.exist( update );
				//console.log(update);
				update.should.have.property( 'id' );
				update.should.have.property( 'rev' );
				update.should.have.property( 'url' );
				should.exist( update.fields );
				done();
			} );
		} );

		it( 'should return a work item by revision number', function( done ) {
			client.getWorkItemRevision( testItemId, 1, function( err, item ) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				should.exist( item.fields );
				done();
			} );
		} );

		it( 'should update a work item', function( done ) {
			var update = [
				{
					op: "replace",
					path: '/fields/System.Title',
					value: 'Updated title ' + Date.now()
				}
			];

			client.updateWorkItem( testItemId, update, function( err, item ) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				// console.log(item);
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				item.should.have.property( '_links' );
				should.exist( item.fields );
				item.fields.should.have.property( 'System.State' );
				done();
			} );

		} );

		it( 'should create a work item', function( done ) {
			should.exist( testProject );

			var createWorkItemOp = [
				{
					op: "add",
					path: '/fields/System.Title',
					value: 'new title ' + Date.now()
				}
			];

			client.createWorkItem( createWorkItemOp, testProject.name, "Bug", function( err, item ) {
				if ( err ) {
					console.log( err );
					console.log( item );
				}
				should.not.exist( err );
				should.exist( item );
				// console.log(item);
				item.should.have.property( 'id' );
				item.should.have.property( 'rev' );
				item.should.have.property( 'url' );
				should.exist( item.fields );
				item.fields.should.have.property( 'System.State' );
				done();
			} );

		} );


	} );

} );

describe( 'VSO Service Account Tests', function() {
	this.timeout( 20000 );

	it( 'has a WRAP valid client', function() {
		var client = Client.createWrapClient( url, collection, "dummy wrap token", getOptions() );
		should.exist( client );
		client.should.have.property( 'url' );
		client.should.have.property( '_authType' );
		client._authType.should.equal( 'Wrap' );
		should.exist( client.client );
	} );

	describe( 'Request WRAP Token Tests', function() {

		it( 'should return a WRAP valid token', function( done ) {
			Client.getWrapToken( url, serviceAccountUser, serviceAccountPassword, function( err, data, resp ) {
				should.not.exist( err );
				data.should.have.property( 'wrap_access_token' );
				data.should.have.property( 'wrap_access_token_expires_in' );
				done();
			} );
		} );

		it( 'should return an error with 401', function( done ) {
			Client.getWrapToken( url, "dummy user", "dummy password", function( err, data, resp ) {
				should.exist( err );
				err.statusCode.should.equal( 401 );
				done();
			} );
		} );
	} );

	describe( 'API calls with WRAP Token Tests', function() {
		var client;

		before( function( done ) {
			Client.getWrapToken( url, serviceAccountUser, serviceAccountPassword, function( err, data, resp ) {
				if ( err ) {
					console.log( "Can't get WRAP token" );
					throw err;
				}
				client = Client.createWrapClient( url, collection, data.wrap_access_token, getOptions() );
				done();
			} );
		} );


		it( 'should return a list of projects', function( done ) {
			client.getProjects( function( err, projects ) {
				should.not.exist( err );
				should.exist( projects );
				// console.log(projects);
				projects.length.should.be.above( 0 );
				var project = _.find( projects, function( p ) {
					return p.name === testProjectName;
				} );
				project.should.have.property( 'id' );
				project.should.have.property( 'name' );
				project.should.have.property( 'url' );
				should.exist( project.collection );
				should.exist( project.defaultTeam );
				done();
			} );
		} );

	} );
} );
