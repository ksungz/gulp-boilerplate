var gulp = require('gulp');
var sass = require('gulp-sass');
var less = require('gulp-less');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var rename = require('gulp-rename');
var autoprefixer = require('gulp-autoprefixer');
var lessAutoprefix = require('less-plugin-autoprefix');
var spritesmith = require('gulp.spritesmith-multi');
var merge = require('merge-stream');
var imagemin = require('gulp-imagemin');
var runSequence = require('run-sequence');
var del = require('del');
var watch = require('gulp-watch');
var wait = require('gulp-wait');
var concatCss = require('gulp-concat-css');
var browserSync = require('browser-sync').create();
var plumber = require('gulp-plumber');

// setting path
var bases = {
    src: 'src/',
    dest: 'dist/'
};
var paths = {
    js: bases.src + 'js/**/*.js',
    css: bases.src + 'css/**/*.*',
    cssLibs: bases.src + 'css/libs/**/*.css',
    scss: bases.src + 'css/scss/**/*.scss',
    less: bases.src + 'css/less/**/*.less',
    html: bases.src + '**/*.html',
    images: bases.src + 'img/**/*.*',
    sprites: bases.src + 'img/sprites/**/*.*'
};

gulp.task('html-deploy', function () {
    return gulp.src(paths.html)
        .pipe(gulp.dest(bases.dest))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('js-libs-deploy', ['clean-js-folders'], function () {
    return gulp.src(bases.src + 'js/libs/**/*.*')
        .pipe(gulp.dest(bases.dest + 'js/libs'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('css-libs-deploy', function () {
    return gulp.src(bases.src + 'css/libs/**/*.*')
        .pipe(gulp.dest(bases.dest + 'css/libs'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('images-deploy', function () {
    return gulp.src(paths.images)
        .pipe(imagemin({
            optimizationLevel: 5,
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest(bases.dest + 'img'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('sprites', function () {
    var opts = {
        spritesmith: function (options, sprite, icons) {
            options.imgPath = `../img/sprites/${options.imgName}`;
            options.cssName = `${sprite}-sprites.css`;
            options.cssTemplate = null;
            options.cssSpritesheetName = sprite;
            options.padding = 4;
            options.cssVarMap = function (sp) {
                sp.name = `${sprite}-${sp.name}`;
            };
            return options;
        }
    };
    var spriteData = gulp.src('./src/img/sprites/**/*.png').pipe(spritesmith(opts)).on('error', function (err) {
        console.log(err);
    });

    var imgStream = spriteData.img.pipe(gulp.dest('./dist/img/sprites'));
    var cssStream = spriteData.css.pipe(gulp.dest('./dist/css/sprites'));

    return merge(imgStream, cssStream);
});

gulp.task('sass', function () {
    return gulp.src(paths.scss)
        .pipe(plumber(plumberOption))
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'],
            cascade: false
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(bases.dest + 'css/scss'));
});

var lessOptions = new lessAutoprefix({
    browsers: ['last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4']
});

gulp.task('less', function () {
    return gulp.src(bases.src + 'css/less/*.less')
        .pipe(plumber(plumberOption))
        .pipe(sourcemaps.init())
        .pipe(less({
            plugins: [lessOptions]
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(bases.dest + 'css/less'));
});

gulp.task('sprites-css-concat', function () {
    return gulp.src(bases.dest + 'css/sprites/**/*.css')
        .pipe(plumber(plumberOption))
        .pipe(concatCss("sprites.css"))
        .pipe(gulp.dest(bases.dest + 'css/sprites'));
});

gulp.task('css-libs-concat', function () {
    return gulp.src([bases.dest + 'css/libs/**/*.css', '!dist/css/libs/**/*.min.css'])
        .pipe(plumber(plumberOption))
        .pipe(concatCss("libs.css"))
        .pipe(gulp.dest(bases.dest + 'css/libs'));
});

gulp.task('minify-libs-css', ['css-libs-concat'], function () {
    gulp.src([bases.dest + 'css/libs/*.css', '!dist/css/libs/*.min.css'])
        .pipe(plumber(plumberOption))
        .pipe(cssmin())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(bases.dest + 'css'));
});

gulp.task('minify-css', function () {
    gulp.src([bases.dest + 'css/scss/*.css', bases.dest + 'css/less/*.css', bases.dest + 'css/sprites/sprites.css', '!dist/css/*.min.css'])
        .pipe(plumber(plumberOption))
        .pipe(cssmin())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(bases.dest + 'css'));
    browserSync.reload();
});

gulp.task('minify-js', ['js-libs-deploy'], function () {
    return gulp.src([paths.js, '!src/js/libs/**/*.*'])
        .pipe(plumber(plumberOption))
        .pipe(concat('project-name.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(bases.dest + 'js'))
        .pipe(browserSync.reload({
            stream: true
        }));
});

gulp.task('clean-dist-folders', function () {
    return del(bases.dest + '*.*');
});

gulp.task('clean-css-folders', function () {
    return del(bases.dest + 'css');
});

gulp.task('clean-img-folders', function () {
    return del(bases.dest + 'img');
});

gulp.task('clean-js-folders', function () {
    return del(bases.dest + 'js');
});

// Plumber
var errorHandler = function (error) {
    console.error(error.message);
    this.emit('end');
};
var plumberOption = {
    errorHandler: errorHandler
};

gulp.task('generate-sass-less-sprites', function () {
    runSequence('clean-css-folders', 'clean-img-folders', 'css-libs-deploy', 'images-deploy', 'sprites', 'sprites-css-concat', 'sass', 'less', 'minify-libs-css', 'minify-css');
});

gulp.task('watch', function () {
    gulp.watch(paths.html, ['html-deploy']);
    gulp.watch(paths.js, ['minify-js']);
    gulp.watch(paths.css, ['generate-sass-less-sprites']);
    gulp.watch(paths.images, ['generate-sass-less-sprites']);
});

gulp.task('initialize-resources', function () {
    gulp.start('clean-dist-folders');
    gulp.start('generate-sass-less-sprites');
    gulp.start('minify-js');
    gulp.start('html-deploy');
});

gulp.task('server', ['watch'], function () {
    browserSync.init({
        server: {
            baseDir: bases.dest
        },
        options: {
            reloadDelay: 250
        },
        port: 3030,
        notify: false
    });
});

gulp.task('default', ['initialize-resources', 'server']);