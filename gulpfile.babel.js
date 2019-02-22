import gulp from "gulp";
import cp from "child_process";
import gutil from "gulp-util";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import svgstore from "gulp-svgstore";
import svgmin from "gulp-svgmin";
import inject from "gulp-inject";
import sass from "gulp-sass";
import webpackConfig from "./webpack.conf";

const browserSync = BrowserSync.create();
const hugoBin = `./bin/hugo.${
  process.platform === "win32" ? "exe" : process.platform
}`;
const defaultArgs = ["-d", "../dist", "-s", "site"];

if (process.env.DEBUG) {
  defaultArgs.unshift("--debug");
}

const buildSite = (cb, options) => {
  const args = options ? defaultArgs.concat(options) : defaultArgs;

  return cp
    .spawn(hugoBin, args, {
      stdio: "inherit"
    })
    .on("close", code => {
      if (code === 0) {
        browserSync.reload("notify:false");
        cb();
      } else {
        browserSync.notify("Hugo build failed :(");
        cb("Hugo build failed");
      }
    });
};

gulp.task("hugo", cb => buildSite(cb));
gulp.task("hugo-preview", cb =>
  buildSite(cb, ["--buildDrafts", "--buildFuture"])
);
gulp.task("build", ["css", "js", "hugo"]);
gulp.task("build-preview", ["css", "js", "hugo-preview"]);

gulp.task("css", () =>
  gulp
  .src("./src/scss/*.scss")
  .pipe(sass().on("error", sass.logError))
  .pipe(gulp.dest("./dist/css"))
);

gulp.task("js", cb => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log(
      "[webpack]",
      stats.toString({
        colors: true,
        progress: true
      })
    );
    browserSync.reload();
    cb();
  });
});

gulp.task("svg", () => {
  const svgs = gulp
    .src("site/static/img/icons-*.svg")
    .pipe(svgmin())
    .pipe(
      svgstore({
        inlineSvg: true
      })
    );

  function fileContents(filePath, file) {
    return file.contents.toString();
  }

  return gulp
    .src("site/layouts/partials/svg.html")
    .pipe(
      inject(svgs, {
        transform: fileContents
      })
    )
    .pipe(gulp.dest("site/layouts/partials/"));
});

gulp.task("server", ["hugo", "css", "js", "svg"], () => {
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch("./src/scss/**/*.scss", ["scss"]);
  gulp.watch("./site/static/img/icons-*.svg", ["svg"]);
  gulp.watch("./site/**/*", ["hugo"]);
});