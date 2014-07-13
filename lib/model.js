var output = require('./output');

/**
 * Load the stringlist from a challenge object
 * @param  {object} challenge Object representation of a challenge file
 * @return {object}           Object containing keys and translations of strings
 */
function loadStringList(challenge) {
    output.info("Reading strings...");
    var strings = {};
    var stringCount = 0;

    // Loop through all strings
    challenge.strings.string.forEach(function(string) {
        strings[string['$'].id] = {
            value: string['_'].trim(),
            used: false
        };
        stringCount++;
    });

    output.info(stringCount + " strings found");

    return strings;
}

/**
 * Create the base model for challenges. Will only create strings model data
 * @param  {object} challenge Object representation of a challenge file
 * @return {object}           Object containing challenge model
 */
function createModel(challenge) {
    var model = {};
    model.strings = loadStringList(challenge);

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
        cases: []
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
        if (caseElem.error !== undefined) {
            caseModel.error = caseElem.error['$'].message;
        }

        model.cases.push(caseModel);
    });

    return model;
}

/**
 * Create a mission model
 * @param  {object} mission The mission to create a model for
 * @return {object}         The model of the given mission
 */
function createMissionModel(mission) {
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

    return model;
}

module.exports = {
	loadStringList: loadStringList,
	createModel: createModel,
	createObjectiveModel: createObjectiveModel,
	createScoreModel: createScoreModel,
	createMissionModel: createMissionModel
};