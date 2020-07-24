let main_folder = "dist"       ; 
let src_folder  = "#src"       ;
let files       = require("fs");


// создаём переменную со всеми путями
let path = { 
   build:{
      html     : main_folder + "/"         ,
      css      : main_folder + "/css/"     ,
      js       : main_folder + "/js/"      ,
      images   : main_folder + "/images/"  ,
      fonts    : main_folder + "/fonts/"   ,
      svgSprite: main_folder + "/svgSprite",
   },
   src: {
      html  :     src_folder + "/*.pug"                                  ,
      css   :     src_folder + "/scss/style.scss"                        ,
      js    :     src_folder + "/js/main.js"                             ,
      images:     src_folder + "/images/*.{jpg,png,webp,gif,svg,ico,}"   ,
      fonts :     src_folder + "/fonts/**/*.ttf"                         ,
   },
   watch: {
      html  : src_folder + "/**/*.pug"                               ,
      css   : src_folder + "/scss/**/*.scss"                         ,
      js    : src_folder + "/js/**/*.js"                             ,
      images: src_folder + "/images/**/*.{jpg,png,webp,gif,svg,ico,}",
   },
   delete: "./" + main_folder + "/"
}

let { dest, src } =  require('gulp')                        ,
   gulp           =  require('gulp')                        ,
   browsersync    =  require('browser-sync').create()       ,
   pug            =  require('gulp-pug')                    ,
   pugLinter      =  require('gulp-pug-linter')             ,
   del            =  require('del')                         ,
   scss           =  require('gulp-sass')                   ,
   autoprefixer   =  require('gulp-autoprefixer')           ,
   mediaGroup     =  require('gulp-group-css-media-queries'),
   cleanCss       =  require('gulp-clean-css')              ,
   rename         =  require('gulp-rename')                 ,
   sourcemaps     =  require('gulp-sourcemaps')             ,
   terser         =  require('gulp-terser')                 ,
   babel          =  require('gulp-babel')                  ,
   imagemin       =  require('gulp-imagemin')               ,
   size           =  require('gulp-size')                   ,
   webp           =  require('gulp-webp')                   ,
   webpcss        =  require("gulp-webp-css")               ,
   svg_Sprite      =  require('gulp-svg-sprite')            ,
   Ttf2woff       =  require('gulp-ttf2woff')               ,
   Ttf2woff2      =  require('gulp-ttf2woff2')              ,
   fonter         =  require('gulp-fonter')                 ,
   rsync          =  require("gulp-rsync")                  ,
   concat         =  require("gulp-concat")                 ,
   svgmin         =  require('gulp-svgmin')                 ,
   cheerio        =  require('gulp-cheerio')                ,
   replace        =  require('gulp-replace')                ;


function browserSync(done) {
   browsersync.init({
      server:{
         baseDir: "./" + main_folder + "/"
      },
      notify :false,
      port   :3000 ,
   })
}

function html() {
   return src(path.src.html)
      .pipe(pugLinter())
      .pipe(pug({
         doctype: 'html',
         pretty : true  ,
      }))
      .pipe(dest(path.build.html))
      .pipe(browsersync.stream())
}

function css(params) {
   return src(path.src.css)
      .pipe(sourcemaps.init())
      .pipe(scss({
         outputStyle:"expanded"
      }))
      .pipe(webpcss({}))
      .pipe(autoprefixer({
         overrideBrowserslist: ['last 4 versions'],
         cascade             : true,
      }))
      .pipe(mediaGroup())
      .pipe(dest(path.build.css))
      .pipe(cleanCss())
      .pipe(rename({
         extname:".min.css"
      }))
      .pipe(sourcemaps.write())
      .pipe(dest(path.build.css))
      .pipe(browsersync.stream())
}

function js() {
   return src(path.src.js)
      .pipe(babel({
         presets: ['@babel/env']
      }))
      .pipe(dest(path.build.js))
      .pipe(terser())
      .pipe(rename({
         extname: ".min.js"
      }))
      .pipe(dest(path.build.js))
      .pipe(browsersync.stream())
}

function images() {
   return src(path.src.images)
      .pipe(size())
      .pipe(webp({
         quality: 75,
      }))
      .pipe(dest(path.build.images))
      .pipe(src(path.src.images))
      .pipe(imagemin({
         progressive: true,
         svgoPlugins: [{ removeViewBox: false }],
         interlaced: true,
         optimizationLevel: 4
      }))
      .pipe(dest(path.build.images))
      .pipe(size())
      .pipe(browsersync.stream())
}

function watchFiles(params) {
   gulp.watch([path.watch.html],html)        ;
   gulp.watch([path.watch.css], css)         ;
   gulp.watch([path.watch.js], js)           ;
   gulp.watch([path.watch.images], images)   ;
}

function clean(params) {
   return del(path.delete);
}

gulp.task('ttf', function () {
   return src([src_folder + '/fonts/*.otf'])
      .pipe(fonter({
         formats: ['ttf']
      }))
      .pipe(dest(src_folder + '/fonts/'))
})

function fonts(params) {
   src(path.src.fonts)
      .pipe(Ttf2woff())
      .pipe(dest(path.build.fonts)) ;
   return src(path.src.fonts)
      .pipe(Ttf2woff2())
      .pipe(dest(path.build.fonts)) ;
}

function callBack() {
   
}

function fontMixin() {
   let file_content = files.readFileSync(src_folder + '/scss/fonts.scss');
   if (file_content == '') {
      files.writeFile(src_folder + '/scss/fonts.scss', '', callBack);
      return files.readdir(path.build.fonts, function (err, items) {
         if (items) {
            let c_fontname;
            for (var i = 0; i < items.length; i++) {
               let fontname = items[i].split('.');
               fontname = fontname[0];
               if (c_fontname != fontname) {
                  files.appendFile(src_folder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', callBack);
               }
               c_fontname = fontname;
            }
         }
      })
   }
}

function svgSprite() {
   return gulp.src([src_folder + '/svgSprite/*.svg'])
      .pipe(svgmin({
         js2svg: {
            pretty: true
         }
      }))
      .pipe(cheerio({
         run: function ($) {
            $('[fill]').removeAttr('fill');
            $('[stroke]').removeAttr('stroke');
            $('[style]').removeAttr('style');
         },
         parserOptions: { xmlMode: true }
      }))
      .pipe(replace('&gt;', '>'))
      .pipe(svg_Sprite({
         mode: {
            symbol: {
               sprite: "../sprite.svg",
               example: true,
               render: {
                  scss: {
                     dest: '../../../' + src_folder + '/scss/svg-sprite.scss',
                  }
               }
            }
         },
      }))
      .pipe(replace(/^\t+$/gm, ''))
      .pipe(replace(/\n{2,}/g, '\n'))
      .pipe(replace('?><!', '?>\n<!'))
      .pipe(replace('><svg', '>\n\n<svg'))
      .pipe(replace('><defs', '>\n\t\t<defs'))
      .pipe(replace('><path', '>\n\t\t<path'))
      .pipe(replace('><circle', '>\n\t\t<circle'))
      .pipe(replace('><symbol', '>\n\n\t<symbol'))
      .pipe(replace('></symbol', '>\n\t</symbol'))
      .pipe(replace('></svg', '>\n\n</svg'))
      .pipe(dest(path.build.svgSprite))
}

gulp.task("deploy", function () {
   return gulp.src(`${main_folder}/**`).pipe(
      rsync({
         root: "dist/", 
         hostname: "dkkasumov@myAPI",
         destination: "PATH",
         port: 25212, // в редких случаях
         include: ["*.htaccess"], 
         exclude: ["**/Thumbs.db", "**/*.DS_Store"], 
         recursive: true, 
         archive: true, 
         silent: false, 
         compress: true, 
         progress: true, 
      }),
   );
});

function style(params) {
   return gulp
      .src([
         "node_modules/normalize.css/normalize.css",
      ])
      .pipe(concat("libs.min.css"))
      .pipe(cleanCss())
      .pipe(gulp.dest(main_folder + '/css'))
      .pipe(size());
}

function script(params) {
   return gulp
      .src([
         "node_modules/jquery/dist/jquery.js",
         "node_modules/svg4everybody/dist/svg4everybody.min.js",
      ])
      .pipe(size())
      .pipe(babel())
      .pipe(concat("libs.min.js"))
      .pipe(terser())
      .pipe(gulp.dest(main_folder + '/js'))
      .pipe(size());
}

let build = gulp.series(clean, gulp.parallel(images, css, js, html, fonts, fontMixin, script, style, svgSprite));
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.svgSprite = svgSprite;
exports.script    = script   ;
exports.style     = style    ;
exports.fontMixin = fontMixin;
exports.images    = images   ;
exports.js        = js       ;
exports.css       = css      ;
exports.build     = build    ;
exports.html      = html     ;
exports.watch     = watch    ;
exports.default   = watch    ;
