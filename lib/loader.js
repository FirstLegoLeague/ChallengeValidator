var output = require('./output');
var request = require('request');
var fs = require('fs');
var xml4js = require('xml4js');
var options = {};
var parser = new xml4js.Parser(options);
var libxmljs = require('libxmljs');

/**
 * Load a mission XML using its schema and make sure it validates
 * @param  {Function(err, result)} cb Function that gets called when loading is done. If err !== null, an error occurred.
 *                                    Else result contains the parsed XML in JSON format
 */
exports.loadMissionXML = function(cb) {
    output.info("Reading XML file and validating...");

    var args = process.argv.slice(2);
    if (args.length != 1) {
        cb("Usage: node missionvalidator.js [xmlfile]");
        return;
    }

    var challenge = args[0];
    var schema = 'http://fll-tools.com/applications/scoring/v1/challenge.xsd';

    // Read the xml
    fs.readFile(challenge, {encoding: 'utf-8'}, function(err, xml) {
        if (!err) {
            var request = require('request');
            // Try to download the XSD
            request(schema, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    var schemaDoc = libxmljs.parseXmlString(body);
                    var xmlDoc = libxmljs.parseXmlString(xml);

                    // Check if the xml validates
                    if (xmlDoc.validate(schemaDoc)) {
                        parser.addSchema(schema, body, function (err, importsAndIncludes) {
                            parser.parseString(xml, function (err, result) {
                                cb(null, result['fll:challenge']);
                            });
                        });
                    } else {
                        cb("Challenge XML does not validate");
                    }
                } else {
                    cb("Can not load schema XSD from " + schema);
                }
            });
        } else {
            cb("Can not load mission XML file");
            return;
        }
    });
}