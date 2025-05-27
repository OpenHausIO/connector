const cp = require("child_process");
const pkg = require("./package.json");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");

const PATH_DIST = path.resolve(process.cwd(), "dist");
const PATH_BUILD = path.resolve(process.cwd(), "build");

process.env = Object.assign({
    NODE_ENV: "production"
}, process.env);

module.exports = (grunt) => {

    // Project configuration.
    grunt.initConfig({
        pkg,
        uglify: {
            options: {
                mangle: {
                    toplevel: true
                }
            },
            build: {
                files: [{
                    expand: true,
                    src: [
                        "**/*.js",
                        "!logs/**",
                        "**/*.gitkeep",
                        "!Gruntfile.js",
                        "!node_modules/**",
                        "!scripts/**",
                        "!tests/**"
                    ],
                    dest: PATH_BUILD,
                }]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.registerTask("build", () => {
        [
            `rm -rf ${path.join(PATH_BUILD, "/*")}`,
            `rm -rf ${path.join(PATH_DIST, "/*")}`,
            `mkdir -p ${PATH_BUILD}`,
            `mkdir ${path.join(PATH_BUILD, "logs")}`,
            `mkdir ${path.join(PATH_BUILD, "scripts")}`,
            `echo "exit 0" > ${path.join(PATH_BUILD, "scripts/post-install.sh")}`,
            `chmod +x ${path.join(PATH_BUILD, "scripts/post-install.sh")}`,
            `cp ./package*.json ${PATH_BUILD}`,
            `cd ${PATH_BUILD} && npm pkg delete scripts.prepare`,
            "grunt uglify",
        ].forEach((cmd) => {
            cp.execSync(cmd, {
                env: process.env,
                stdio: "inherit"
            });
        });
    });


    grunt.registerTask("build:docker", () => {

        let buildArgs = [
            `--build-arg version=${pkg.version}`,
            `--build-arg buildDate=${Date.now()}`,
        ].join(" ");

        cp.execSync(`docker build . -t openhaus/${pkg.name}:${pkg.version} ${buildArgs}`, {
            env: process.env,
            stdio: "inherit"
        });

        /*
        cp.execSync(`docker build . -t openhaus/${pkg.name}:latest ${buildArgs}`, {
            env: process.env,
            stdio: "inherit"
        });
        */

        cp.execSync(`docker image tag openhaus/${pkg.name}:${pkg.version} openhaus/${pkg.name}:latest`, {
            env: process.env,
            stdio: "inherit"
        });

    });

    grunt.registerTask("compress", () => {
        cp.execSync(`cd ${PATH_BUILD} && tar -czvf ${path.join(PATH_DIST, `${pkg.name}-v${pkg.version}.tgz`)} *`, {
            env: process.env,
            stdio: "inherit"
        });
    });

    grunt.registerTask("checksum", () => {

        let m5f = path.join(PATH_DIST, "./checksums.txt");

        fs.rmSync(m5f, { force: true });
        let files = fs.readdirSync(PATH_DIST);
        let fd = fs.openSync(m5f, "w");

        files.forEach((name) => {

            let file = path.join(PATH_DIST, name);
            let content = fs.readFileSync(file);
            let hasher = crypto.createHash("md5");
            let hash = hasher.update(content).digest("hex");
            fs.writeSync(fd, `${hash}\t${name}${os.EOL}`);

        });

        fs.closeSync(fd);

    });

    grunt.registerTask("release", () => {
        [
            `mkdir -p ${PATH_BUILD}`,
            `mkdir -p ${PATH_DIST}`,
            `rm -rf ${PATH_BUILD}/*`,
            `rm -rf ${PATH_DIST}/*`,
            "npm run build",
            "npm run build:docker",
            //`pkg build --out-path=${PATH_DIST}`, // -> Fix errors!
            `docker save openhaus/${pkg.name}:latest | gzip > ${path.join(PATH_DIST, `${pkg.name}-v${pkg.version}-docker.tgz`)}`,
            "grunt compress",
            "grunt checksum"
        ].forEach((cmd) => {
            cp.execSync(cmd, {
                env: process.env,
                stdio: "inherit"
            });
        });
    });

    grunt.registerTask("publish", () => {
        [
            `docker push openhaus/${pkg.name}:${pkg.version}`,
            `docker push openhaus/${pkg.name}:latest`
        ].forEach((cmd) => {
            cp.execSync(cmd, {
                env: process.env,
                stdio: "inherit"
            });
        });

    });

};