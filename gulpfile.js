var gulp = require( 'gulp' ),
//	batch = require( 'gulp-batch' ),
//	filter = require( 'gulp-filter' ),
//	livereload = require( 'gulp-livereload' ),
  gutil = require( 'gulp-util' ),
	mocha = require( 'gulp-mocha' ),
  coffee = require( 'gulp-coffee' );

gulp.task( 'coffee', function() {
    return gulp.src( './src/*.coffee' )
      .pipe( coffee( { bare: true } ).on( 'error', gutil.log ) )
      .pipe( gulp.dest( './public/' ) );
} );

gulp.task( 'test', [ 'coffee' ], function() {
	return gulp.src( './spec/*.spec.js' )
		.pipe( mocha( { reporter: 'spec' } ) )
		.on( 'error', gutil.log );
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './spec/*.spec.js', './src/*.coffee' ], [ 'test' ] );
} );


gulp.task( 'default', [ 'test', 'watch' ], function() {

} );
