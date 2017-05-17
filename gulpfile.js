/* eslint comma-dangle: 0 */
/* eslint-disable */

"use strict";

// General
const argv = require("yargs").argv;
const browserSync = require("browser-sync");
const del = require("del");
const fs = require("fs");
const ghPages = require('gulp-gh-pages');
const gulp = require("gulp");
const gulpif = require("gulp-if");
const gutil = require("gulp-util");
const historyApiFallback = require('connect-history-api-fallback');
const sourcemaps = require("gulp-sourcemaps");
const watch = require("gulp-watch");

// SASS
const autoprefixer = require("gulp-autoprefixer");
const filter = require("gulp-filter");
const sass = require("gulp-sass");

const css2JS = require("./index.js");

// PUG
const pug = require("gulp-pug");

// JS
const babelify = require("babelify"); // eslint-disable-line no-unused-vars
const browserify = require("browserify");
const buffer = require("vinyl-buffer");
const rename = require("gulp-rename");
const source = require("vinyl-source-stream");
const stripDebug = require("gulp-strip-debug");
const uglify = require("gulp-uglify");
const watchify = require("watchify");

/* eslint-enable */

/* eslint-disable no-unused-vars */

// Constants
const SOURCE_PATH = "./src";
const BUILD_PATH = "./build";
const STATIC_FILES = ["/html/**", "/img/*.png", "/img/*.jpg", "/img/*.svg", "/img/*.ico", "*.html", "/js/jquery-3.1.1.min.js", "/favicon.ico", "CNAME"]; // relative to /src/
const SCRIPTS_TO_WATCH = [`${SOURCE_PATH}/js/script.js`];
const KEEP_FILES = true;
const OPEN_TAB = argv.open || argv.o;

// Do not change this one!
const STATIC_FILES_TO_WATCH = [];

/* eslint-enable no-unused-vars */

/**
 * Simple way to check for development/production mode.
 */
function isProduction() {
  return argv.production || argv.p;
}

/**
 * Logs the current build mode on the console.
 */
function logBuildMode() {
  if ( isProduction() ) {
    gutil.log( gutil.colors.green( "Running production build..." ) );
  } else {
    gutil.log( gutil.colors.red( "Running development build..." ) );
  }
}

/**
 * Handles errors
 */
function logError( err ) {
  if ( err.plugin === "gulp-sass" ) {
    gutil.log( `${gutil.colors.yellow( "SASS error" )}: ${gutil.colors.red( err.messageOriginal.slice( 0, -1 ) )} in ${gutil.colors.cyan( err.relativePath )} on line ${err.line}, column ${err.column}` );
  } else if ( err.fileName ) {
    gutil.log( `${gutil.colors.yellow( err.name )}: ${gutil.colors.red( err.fileName.replace( `${__dirname}/src/js/`, "" ) )}: Line ${gutil.colors.magenta( err.lineNumber )} & Column ${gutil.colors.magenta( err.columnNumber || err.column )}: ${gutil.colors.blue( err.description )}` );
  } else {
    // Browserify error..
    gutil.log( `${gutil.colors.yellow( err.name )}: ${gutil.colors.red( err.message )}` );
  }
}

/**
 * Copies folders from folders specified in STATIC_FOLDERS.
 */
function copyStatic() {
  STATIC_FILES.forEach( ( v ) => {
    let path;
    let output;
    if ( fs.existsSync( `${SOURCE_PATH}${v}` ) && fs.lstatSync( `${SOURCE_PATH}${v}` ).isDirectory() ) {
      path = `${SOURCE_PATH}${v}`;
      output = `${BUILD_PATH}${v}`;

      path += "/*.*";
    } else {
      let file = v;
      if ( v[0] !== "/" ) {
        file = `/${file}`;
      }

      path = `${SOURCE_PATH}${file}`;
      output = `${BUILD_PATH}${file}`;

      output = output.split( "/" );
      output.pop();
      output = output.join( "/" );
    }

    gulp.src( path )
      .pipe( gulp.dest( output ) );
  } );
}

/**
 * Deletes all content inside the './build' folder.
 * If 'keepFiles' is true, no files will be deleted. This is a dirty workaround since we can't have
 * optional task dependencies :(
 * Note: keepFiles is set to true by gulp.watch (see serve()) and reseted here to avoid conflicts.
 */
function cleanBuild() {
  if ( !KEEP_FILES ) {
    del( ["build/**/*.*"] );
    // del(["build/**/"]);
  }

  copyStatic();
}

/**
 * Converts time to appropriate unit.
 */
function showDuration( t ) {
  if ( t >= 1000 ) {
    return `${t / 1000} s`;
  }

  if ( t <= 1 ) {
    return `${t * 1000} μs`;
  }

  return `${t} ms`;
}

/**
 * Transforms ES2015 code into ES5 code.
 * Creates sourcemaps if production.
 * Uglifies if not in production.
 */
function buildScript( toWatch, path ) {
  const filename = path.split( "/" ).pop();
  let bundler = browserify( path, {
    basedir: __dirname,
    debug: true,
    cache: {},
    packageCache: {},
    fullPaths: toWatch,
    plugin: [watchify],
  } );

  if ( toWatch ) {
    bundler = watchify( bundler );
  }

  bundler.transform( "babelify", { presets: ["es2015"] } );

  const rebundle = function() {
    const timer = Date.now();

    const stream = bundler.bundle().on( "end", () => {
      gutil.log( `Started '${gutil.colors.cyan( "scripts" )}' ('${gutil.colors.cyan( filename )}')...` );
    } );

    return stream
      .on( "error", logError )
      .pipe( source( filename ) )
      .pipe( buffer() )
      .pipe( sourcemaps.init( { loadMaps: true } ) )
      .pipe( gulpif( isProduction(), stripDebug() ) )
      .pipe( gulpif( isProduction(), uglify() ) )
      .pipe( gulpif( !isProduction(), sourcemaps.write( "./" ) ) )
      .pipe( gulp.dest( `${BUILD_PATH}/js` ) )
      .on( "end", () => {
        const taskName = `'${gutil.colors.cyan( "scripts" )}' ('${gutil.colors.cyan( filename )}')`;
        const taskTime = gutil.colors.magenta( showDuration( Date.now() - timer ) );
        gutil.log( `Finished ${taskName} after ${taskTime}` );
      } )
  };
}

/**
 * Generates SASS.
 */
function buildSass() {
  const options = {
    style: "expanded",
  };

  return gulp.src( `${SOURCE_PATH}/sass/**/*.sass` )
    .pipe( sass( options ).on( "error", logError ) )
    .pipe( css2JS() )
    .pipe( gulp.dest( `${SOURCE_PATH}/js/styles` ) )
}

/**
 * Generates pug.
 */
function buildPug() {
  return gulp.src( `${SOURCE_PATH}/*.pug` )
    .pipe(
      pug( {
        "pretty": isProduction(),
      } )
    )
    .pipe( gulp.dest( BUILD_PATH ) )
    .pipe(
      browserSync.stream()
    );
}

/**
 * Adds paths to array conatining files that will be watched.
 */
function watchStatic() {
  STATIC_FILES.forEach( ( v ) => {
    let path;
    if ( fs.existsSync( `${SOURCE_PATH}${v}` ) && fs.lstatSync( `${SOURCE_PATH}${v}` ).isDirectory() ) {
      path = `${SOURCE_PATH}${v}`;
      path += "/*.*";
    } else {
      let file = v;
      if ( v[0] !== "/" ) {
        file = `/${file}`;
      }

      path = `${SOURCE_PATH}${file}`;
    }

    STATIC_FILES_TO_WATCH.push( path );
  } );
}

/**
 * Starts the Browsersync server.
 * Watches for file changes in the 'src' folder.
 */
function serve() {
  const options = {
    serveStatic: [
      {
        route: "/browser-sync-client-transition",
        dir: "./node_modules/browser-sync-client-transition"
      },
      {
        route: "/build",
        dir: "./build"
      }
    ],
    open: OPEN_TAB,
  };

  let server = argv.proxy || false;
  if ( server ) {
    if ( typeof server === "boolean" ) {
      server = "localhost";
    }

    options.proxy = { "target": server };
  } else {
    options.server = BUILD_PATH;
  }

  browserSync( options );
}

gulp.task( "cleanBuild", cleanBuild );
gulp.task( "copyStatic", copyStatic );
gulp.task( "sass", buildSass );
gulp.task( "pug", buildPug );

gulp.task( "watchScripts", () => {
  SCRIPTS_TO_WATCH.forEach( ( v ) => {
    buildScript( true, v );
  } );
} );

gulp.task( "watchStatic", () => {
  watchStatic();
} );

gulp.task( "default", ["sass", "watchScripts"] );
