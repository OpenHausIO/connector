const pkg = require("./package.json");

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg,
        env: {
            options: {
                //Shared Options Hash
            },
            prod: {
                NODE_ENV: "production",
            }
        },
        compress: {
            main: {
                options: {
                    archive: `${pkg.name}-v${pkg.version}.tgz`
                },
                files: [{
                    expand: true,
                    src: "**/*",
                    cwd: "./"
                }]
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks("grunt-env");
    grunt.loadNpmTasks("grunt-contrib-compress");

};