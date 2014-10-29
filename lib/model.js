var output = require('./output');

/**
 * Load the stringlists from a challenge object
 * @param  {object} challenge Object representation of a challenge file
 * @return {object}           Object containing keys and translations of strings
 */
function loadStringLists(challenge) {
    output.info("Reading stringlists...");
    var stringlists = [];

    // Loop through all stringlists
    challenge.strings.forEach(function(stringlist) {
        var currentStringlist = {
            language: stringlist['$'].language,
            count: 0,
            strings: {},
            stringCounts: {}
        };

        stringlist.string.forEach(function(string) {
            if (currentStringlist.strings[string['$'].id] === undefined) {
                currentStringlist.strings[string['$'].id] = {
                    value: string['_'].trim(),
                    used: false,
                    count: 1
                };
            } else {
                currentStringlist.strings[string['$'].id].count++;
            }
            currentStringlist.count++;
        });

        output.info(currentStringlist.count + " strings found for language " + currentStringlist.language);

        stringlists.push(currentStringlist);
    });

    return stringlists;
}

/**
 * Create the base model for challenges. Will only create strings model data
 * @param  {object} challenge Object representation of a challenge file
 * @return {object}           Object containing challenge model
 */
function createModel(challenge) {
    var model = {};
    model.stringlists = loadStringLists(challenge);

    return model;
}

/**
 * Create a model for one objective
 * @param  {string} type        The type of this objective
 * @param  {[object]} objective The data from the challenge containing the objective data
 * @return {[object]}           The objective model
 */
function createObjectiveModel(type, objective) {
    var model = {};

    model.type = type;
    model.id = objective['$'].id;
    model.description = objective['$'].description;
    model.used = false;
    switch (type) {
        case 'number':
            model.min = objective['$'].min;
            model.max = objective['$'].max;
            break;
        case 'yesno':
            // Nothing...
            break;
        case 'enum':
            model.options = {};
            objective.option.forEach(function(option) {
                model.options[option['$'].name] = {
                    name: option['$'].name,
                    description: option['$'].description
                };
            });
            break;
    }

    if (objective['$'].default !== undefined) {
        model.default = objective['$'].default;
    }

    return model;
}

/**
 * Create a model for a score
 * @param  {object} score The score to create a model for
 * @return {object}       The model of the given score
 */
function createScoreModel(score) {
    var model = {
        indexes: [],
        cases: [],
        hasPercentage: false
    };

    score.indexes.index.forEach(function(index) {
        model.indexes.push(index['$'].objective);
    });

    score.cases.case.forEach(function(caseElem) {
        var caseModel = {
            indexRefs: []
        };
        caseElem['index-ref'].forEach(function(indexRef) {
            caseModel.indexRefs.push(indexRef['$'].value);
        });

        if (caseElem.points !== undefined) {
            caseModel.points = caseElem.points['$'].amount;
        }
        if (caseElem.percentage !== undefined) {
            caseModel.percentage = caseElem.percentage['$'].amount;
            model.hasPercentage = true;
        }
        if (caseElem.error !== undefined) {
            caseModel.error = caseElem.error['$'].message;
        }

        model.cases.push(caseModel);
    });

    return model;
}

/**
 * Create a mission model
 * @param  {object} mission                 The mission to create a model for
 * @param  {object} totalPercentageMissions An object that will keep track of
 *                                          the number of percentage missions
 * @return {object}                         The model of the given mission
 */
function createMissionModel(mission, totalPercentageMissions) {
    var model = {};
    model.name = mission['$'].name;
    model.description = mission['$'].description;
    model.objectives = {};

    if (mission['objective-number'] !== undefined) {
        mission['objective-number'].forEach(function(objective) {
            model.objectives[objective['$'].id] = createObjectiveModel('number', objective);
        });
    }

    if (mission['objective-yesno'] !== undefined) {
        mission['objective-yesno'].forEach(function(objective) {
            model.objectives[objective['$'].id] = createObjectiveModel('yesno', objective);
        });
    }

    if (mission['objective-enum'] !== undefined) {
        mission['objective-enum'].forEach(function(objective) {
            model.objectives[objective['$'].id] = createObjectiveModel('enum', objective);
        });
    }

    model.scores = [];
    mission['score'].forEach(function(score) {
        model.scores.push(createScoreModel(score));
    });

    var hasPercentage = false;

    model.scores.forEach(function(scoreModel) {
        if (scoreModel.hasPercentage) {
            hasPercentage = true;
        }
    });

    if (hasPercentage) {
        totalPercentageMissions.count++;
    }

    return model;
}

module.exports = {
	loadStringLists: loadStringLists,
	createModel: createModel,
	createObjectiveModel: createObjectiveModel,
	createScoreModel: createScoreModel,
	createMissionModel: createMissionModel
};
