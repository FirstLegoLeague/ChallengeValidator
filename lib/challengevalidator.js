var loader = require('./loader');
var output = require('./output');
var model = require('./model');
var verify = require('./verify');
var error = require('./error');

/**
 * Main function to validate a challenge file
 */
exports.validate = function() {
    loader.loadMissionXML(function(err, challenge) {
        if (err) {
            output.fatal(err);
            process.exit(1);
        }
        var challengeModel = model.createModel(challenge);

        var totalPercentageMissions = {
            count: 0
        };

        output.info("Verifying missions...");
        challenge.mission.forEach(function(mission) {
            verify.verifyMission(mission, challengeModel, totalPercentageMissions);
        });

        verify.checkDoubleLanguages(challengeModel);
        verify.checkDoubleStrings(challengeModel);
        verify.checkUnusedStrings(challengeModel);
        verify.checkStaticStrings(challengeModel);
        verify.checkPercentageMissions(totalPercentageMissions);

        if (error.count() > 0) {
            output.fatal("Total of " + error.count() + " errors found in challenge");
            process.exit(1);
        } else {
            output.ok("Challenge file ok");
        }
    });
};
