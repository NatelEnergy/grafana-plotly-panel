module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  var pkgJson = require('./package.json');

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks("grunt-tslint");

  grunt.initConfig({
    clean: ['dist', 'src/lib'],

    copy: {

      libs: {
        cwd: 'node_modules/plotly.js/dist',
        expand: true,
        src: ['plotly.min.js'],
        dest: 'src/lib'
      },
      dist_js: {
        expand: true,
        cwd: 'src',
        src: ['**/*.ts', '**/*.d.ts', 'lib/*'],
        dest: 'dist'
      },
      dist_html: {
        expand: true,
        flatten: true,
        cwd: 'src/partials',
        src: ['*.html'],
        dest: 'dist/partials/'
      },
      dist_css: {
        expand: true,
        flatten: true,
        cwd: 'src/css',
        src: ['*.css'],
        dest: 'dist/css/'
      },
      dist_img: {
        expand: true,
        flatten: true,
        cwd: 'src/img',
        src: ['*.*'],
        dest: 'dist/img/'
      },
      dist_statics: {
        expand: true,
        flatten: true,
        src: ['src/plugin.json', 'LICENSE', 'README.md'],
        dest: 'dist/'
      }
    },

    ts: {
      build: {
        src: ['src/**/*.ts', '!**/*.d.ts', '!**/*.min.js'],
        outDir: 'dist',
        options: {
          rootDir: "src",
          verbose: true,

          "target": "ES5",
          "module": "system",
          "sourceMap": true,
          "declaration": true,
          "emitDecoratorMetadata": true,
          "experimentalDecorators": true,
          "noImplicitAny": false,
          "strictNullChecks": false,
          "skipLibCheck": true
        }
      }
    },

    // NOT WORKING!
    // this does: node_modules/tslint/bin/tslint -c tslint.json --fix 'src/**/*.ts'
    tslint: {
      options: {
        // can be a configuration object or a filepath to tslint.json
        configuration: "tslint.json",
        // If set to true, tslint errors will be reported, but not fail the task
        // If set to false, tslint errors will be reported, and the task will fail
        force: false,
        fix: false
      },
      default: {
        files: {
          src: ['src/**/*.ts', '!**/*.d.ts'],
        }
      }
    },

    'string-replace': {
      dist: {
        files: [{
          cwd: 'src',
          expand: true,
          src: ["**/plugin.json"],
          dest: 'dist'
        }],
        options: {
          replacements: [{
            pattern: '%VERSION%',
            replacement: pkgJson.version
          },{
            pattern: '%TODAY%',
            replacement: '<%= grunt.template.today("yyyy-mm-dd") %>'
          }]
        }
      }
    },

    watch: {
      files: ['src/**/*.ts', 'src/**/*.html', 'src/**/*.css', 'src/img/*.*', 'src/plugin.json', 'README.md'],
      tasks: ['default'],
      options: {
        debounceDelay: 250,
      },
    }
  });

  grunt.registerTask('default', [
    'clean',
    'copy:libs',
    'copy:dist_js',
    'ts:build',
    'copy:dist_html',
    'copy:dist_css',
    'copy:dist_img',
    'copy:dist_statics',
    'string-replace'
  ]);
};
