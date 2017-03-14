module.exports = (grunt) => {
  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({

    clean: ['dist'],

    copy: {
      src_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['**/*', '!**/*.js', '!**/*.scss', '!img/**/*'],
        dest: 'dist'
      },
      pluginDef: {
        expand: true,
        src: ['README.md'],
        dest: 'dist',
      },
      externals: {
        cwd: 'src',
        expand: true,
        src: ['**/external/*'],
        dest: 'dist'
      },
      img_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['img/**/*'],
        dest: 'dist'
      }
    },

    watch: {
      rebuild_all: {
        files: ['src/**/*'],
        tasks: ['default'],
        options: {spawn: false}
      },
    },

    babel: {
      options: {
        sourceMap: true,
        presets: ['es2015'],
        plugins: ['transform-es2015-modules-systemjs', 'transform-es2015-for-of'],
      },
      dist: {
        files: [{
          cwd: 'src',
          expand: true,
          src: ['*.js'],
          dest: 'dist',
          ext: '.js'
        }]
      },
    },

  });

  grunt.registerTask('default', ['clean', 'copy:src_to_dist', 'copy:pluginDef', 'copy:img_to_dist', 'copy:externals', 'babel']);
};
