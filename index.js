'use strict';

var path = require('path');
var PassThrough = require('stream').PassThrough;
var chalk = require('chalk');
var tildify = require('tildify');
var through = require('through');
var File = require('vinyl');

var compile = require('./lib/compile');

function plugin(browserify, options) {
    options = options || {};
    var outputFolder = options.dest;
    if (!outputFolder) { throw new Error('No CSS destination folder specified'); }
    var base = (options.base ? path.resolve(options.base) : process.cwd());
    var appRoot = (options.appRoot || outputFolder);
    var verbose = Boolean(options.verbose);
    var stylusOptions = (options.stylus || {});
    var bundleCallback = (options.bundle || function(outputStream) {});

    var outputStream = null;

    browserify.on('bundle', function(pipeline) {
        outputStream = new PassThrough({ objectMode: true });
        pipeline.on('end', function() {
            outputStream.push(null);
        });
        bundleCallback(outputStream);
        browserify.emit('bundleCss', outputStream);
    });

    browserify.transform(function(inputPath) {
        var isStylusFile = (path.extname(inputPath) === '.styl');
        if (!isStylusFile) { return through(); }

        var inputFilename = path.basename(inputPath);
        var inputFolder = path.dirname(inputPath);
        var outputFilename = inputFilename.replace(/.styl$/, '.css');
        var relativeOutputPath = path.join(path.relative(base, inputFolder), outputFilename);
        var outputPath = path.join(outputFolder, relativeOutputPath);
        var importPrefix = path.relative(appRoot, outputFolder);
        var importPath = path.join(importPrefix, relativeOutputPath);

        var debugInputFilename = chalk.magenta(tildify(inputPath));
        var debugOutputFilename = chalk.magenta(relativeOutputPath);

        if (verbose) {
            console.time('Reading ' + debugInputFilename);
        }

        var src = '';

        return through(
            function write(chunk) {
                src += chunk;
            },
            function end() {
                if (verbose) {
                    console.timeEnd('Reading ' + debugInputFilename);
                    console.time('Compiling ' + debugOutputFilename);
                }

                var css = compile(src, stylusOptions, inputPath);

                if (verbose) {
                    console.timeEnd('Compiling ' + debugOutputFilename);
                }

                emitFile(css, outputPath, appRoot, outputFolder, outputStream);

                var output = 'module.exports = ' + JSON.stringify(importPath) + ';';
                this.queue(output);
                this.queue(null);
            }
        );
    });


    function emitFile(data, path, cwd, base, stream) {
        var cssFile = new File({
            cwd: cwd,
            base: base,
            path: path,
            contents: new Buffer(data)
        });
        stream.push(cssFile);
    }
}

module.exports = plugin;
