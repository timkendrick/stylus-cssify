'use strict';

var stylus = require('stylus');

function compile(source, options, inputPath) {
	options = options || {};
	var compiler = stylus(source);
	configureCompiler(compiler, options);
	if (inputPath) { compiler.set('filename', inputPath); }
    var css = compiler.render();
    return css;


    function configureCompiler(stylus, options) {
        var configMethods = ['define', 'import', 'include', 'set', 'use'];
        configMethods.forEach(function(methodName) {
    		var optionValue = options[methodName];

    		if (optionValue instanceof Array) {
                var values = optionValue;
                values.forEach(function(value) {
                    stylus[methodName](value);
                });
    		} else if (typeof optionValue === 'object') {
        		for (var field in optionValue) {
                    stylus[methodName](field, optionValue[field]);
                }
    		}
        });
    }
}

module.exports = compile;
