'use strict'

var browserify = require('browserify'),
    gulp = require('gulp'),
    sass = require('gulp-sass'),
    clean = require('gulp-clean'),
    spsave = require('gulp-spsave'),
    cached = require('gulp-cached'),
    source = require('vinyl-source-stream'),
    autoprefixer = require('gulp-autoprefixer'),
    rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    buffer = require('vinyl-buffer'),
    notify = require('gulp-notify'),
    CryptoJS = require("crypto-js"),
    ngAnnotate = require('gulp-ng-annotate');

var coreOptions = {
    siteUrl: '',
    notification: false,
    // path to document library or in this case the master pages gallery
    folder: '/',
    flatten: false

};

var creds = {
    username: '',
    password: ''
};

gulp.task('spsave', function() {
    // runs the spsave gulp command on only files the have 
    // changed in the cached files
    return gulp.src('./public/**')
        .pipe(cached('spFiles'))
        .pipe(spsave(coreOptions, creds));     
});

gulp.task('clean', function(){
    return gulp.src('./public/js/')
        .pipe(clean({force: true}))
});

gulp.task('script', function() {
    // Grabs the app.js file
    return browserify('./app/app.js')
        // bundles it and creates a file called main.js
        .bundle()
            .on('error', function(err){
                console.log(err.message);
                notify("Browserify " + err).write(err);
                this.emit("end");
            })
        .pipe(source('bundle.min.js'))
        .pipe(buffer())
        // .pipe(sourcemaps.init({loadMaps:true}))
            .pipe(ngAnnotate())
            // .pipe(uglify())
            .on('error', function(err){
                console.log(err.message);
                return notify("Uglify " + err).write(err);
            })        
        // saves it the public/js/ directory
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./public/js/'));
});

gulp.task('production', function(){
    // Grabs the app.js file
    return browserify('./app/app.js')
        // bundles it and creates a file called main.js
        .bundle()
            .on('error', function(err){
                console.log(err.message);
                notify("Browserify " + err).write(err);
                this.emit("end");
            })
        .pipe(source('bundle.min.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps:true}))
            .pipe(ngAnnotate())
            .pipe(uglify())
            .on('error', function(err){
                console.log(err.message);
                return notify("Uglify " + err).write(err);
            })        
        // saves it the public/js/ directory
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./public/js/'));
});

gulp.task('public:watch', function(){
    gulp.watch(['./public/**/*'], gulp.series('spsave'));
});

gulp.task('script:watchAll', function(){
    gulp.watch(['./app/**/*'], gulp.series('script'));
});

gulp.task('script:watch', function () {
    gulp.watch(['./app/app.js'], ['script']);
});

gulp.task('styles', function () {
    return gulp.src('sass/*.scss')
        .pipe(sass({
            sourcemap: true,
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(rename('app.min.css'))
        .pipe(gulp.dest('./public/css'));
});

gulp.task('styles:watch', function () {
    gulp.watch('./sass/**/*', gulp.series('styles'));
});
