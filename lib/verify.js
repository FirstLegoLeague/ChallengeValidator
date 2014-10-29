var util = require('./verify-util');
var model = require('./model');
var output = require('./output');
var error = require('./error');

var staticStrings = ['yes', 'no'];

/**
 * Verify whether an objective is valid
 * @param  {object} objective  The model objective to verify
 * @param  {object} model      The base challenge model to use (for strings)
 */
function verifyObjective(objective, model) {
    checkString(objective, 'description', model);

    if (objective.default !== undefined) {
        switch (objective.type) {
            case 'number':
                if (objective.default < objective.min || objective.default > objective.max) {
                    output.error("Default value '" + objective.default + "' for objective '" + objective.id + "' out of range");
                    error.increase();
                }
                break;
            case 'yesno':
                if (objective.default != 'yes' && objective.default != 'no') {
                    output.error("Default value '" + objective.default + "' for objective '" + objective.id + "' out of range");
                    error.increase();
                }
                break;
            case 'enum':
                if (objective.options[objective.default] === undefined) {
                    output.error("Default value '" + objective.default + "' for objective '" + objective.id + "' out of range");
                    error.increase();
                }
                break;
        }
    }

    // For enums we need to check if all option descriptions exist
    if (objective.type == 'enum') {
        for (var optionName in objective.options) {
            checkString(objective.options[optionName], 'description', model);
        }
    }
}

/**
 * Verify a score model
 * @param  {object} objectives Objectives model, used for checking the scores
 * @param  {object} score      Score model to check
 * @param  {object} model      Model to use for string checking
 */
function verifyScore(objectives, score, model) {
    var indexCounts = {};
    var okToCheckStates = true;
    var objectiveValues = [];

    // First, verify if all indexes are existing objectives. Also, already
    score.indexes.forEach(function(index) {
        if (objectives[index] === undefined) {
            output.error("Index '" + index + "' not found in objectives");
            error.increase();
            okToCheckStates = false;
        } else {
            objectives[index].used = true;
            objectiveValues = util.mergeObjectiveValues(objectiveValues, util.allValues(objectives[index]));
            if (indexCounts[index] === undefined) {
                indexCounts[index] = 1;
            } else {
                indexCounts[index]++;
            }
        }
    });

    // Next check if an objective is used more than once in the same score
    for (var index in indexCounts) {
        if (indexCounts[index] > 1) {
            output.error("Objective '" + index + "' used more than once in same score");
            error.increase();
        }
    }

    // Then, case checks
    score.cases.forEach(function(caseModel) {
        // Check if the index-ref length matches the indexes length
        if (caseModel.indexRefs.length != score.indexes.length) {
            output.error("Index-ref count does not match index count");
            error.increase();
            okToCheckStates = false;
        } else {
            // Length matches indexes length, check if all index-ref values are valid for the objectives
            caseModel.indexRefs.forEach(function(indexRef, index) {
                var objectiveId = score.indexes[index];
                if (objectives[objectiveId] !== undefined) {
                    var objective = objectives[objectiveId];
                    var allObjectiveValues = util.allValues(objective);
                    if (allObjectiveValues.indexOf(indexRef) == -1) {
                        output.error("Value '" + indexRef + "' is out of range for objective '" + objectiveId + '"');
                        error.increase();
                        okToCheckStates = false;
                    }
                }
            });
        }

        // If an error is supplied, check message string
        if (caseModel.error !== undefined) {
            checkString(caseModel, 'error', model);
        }
    });

    if (okToCheckStates) {
        // Keep track of the usage count per objective values
        objectiveValues.forEach(function(objectiveValue, index) {
            objectiveValues[index] = {
                values: objectiveValue,
                useCount: 0
            };
        });

        // Loop through all objective values and score cases to match them up
        objectiveValues.forEach(function(objectiveValue) {
            score.cases.forEach(function(caseModel) {
                if (util.objectiveValuesEqual(objectiveValue.values, caseModel.indexRefs)) {
                    objectiveValue.useCount++;
                }
            });
        });

        // Ok, all counts are known, see which ones are not 1
        objectiveValues.forEach(function(objectiveValue) {
            if (objectiveValue.useCount != 1) {
                var displayValues = [];
                objectiveValue.values.forEach(function(value, index) {
                    displayValues.push(score.indexes[index] + " = " + value);
                });
                var displayString = displayValues.join(", ");
                if (objectiveValue.useCount == 0) {
                    output.error("No case found for: " + displayString);
                } else {
                    output.error(objectiveValue.useCount + " cases found for: " + displayString);
                }
                error.increase();
            }
        });
    }
}

/**
 * Verify a mission model
 * @param  {object} mission                 The mission model to verify
 * @param  {object} challenge               The model to use for strings
 * @param  {object} totalPercentageMissions An object that will keep track of
 *                                          the number of percentage missions
 */
function verifyMission(mission, challenge, totalPercentageMissions) {
    var missionModel = model.createMissionModel(mission, totalPercentageMissions);

    output.info("Verifying mission " + missionModel.name + "...");
    checkString(missionModel, 'name', challenge);
    checkString(missionModel, 'description', challenge);

    // First, simply check all objectives
    for (var objectiveId in missionModel.objectives) {
        var allObjectiveValues = util.allValues(missionModel.objectives[objectiveId]);
        verifyObjective(missionModel.objectives[objectiveId], challenge);
    }

    // Next, check all scores
    missionModel.scores.forEach(function(score) {
        verifyScore(missionModel.objectives, score, challenge);
    });

    // Finally, see if all objectives are used at least once
    for (var objectiveId in missionModel.objectives) {
        if (!missionModel.objectives[objectiveId].used) {
            output.error("Objective '" + objectiveId + "' not used in any score");
            error.increase();
        }
    }
}

/**
 * Check if a string is found in the model. If not, report an error
 * @param  {object} object     The object to check a string for
 * @param  {string} field      The field to check on the object. This should exist on the object
 * @param  {object} model      The challenge model to use
 */
function checkString(object, field, model) {
    var key = object[field];
    for (var idx in model.stringlists) {
        var stringlist = model.stringlists[idx];
        if (stringlist.strings[key] === undefined) {
            output.error("Field '" + field + "' contains unknown string " + key + " for language " + stringlist.language);
            error.increase();
        } else {
            stringlist.strings[key].used = true;
        }
    }
}

/**
 * Check if any stringlist languages are defined more than once
 * @param  {object} model Model to check stringlists for
 */
function checkDoubleLanguages(model) {
    var counts = {};
    for (var idx in model.stringlists) {
        var stringlist = model.stringlists[idx];
        if (counts[stringlist.language] == undefined) {
            counts[stringlist.language] = 0;
        }
        counts[stringlist.language]++;
    }

    for (var language in counts) {
        if (counts[language] > 1) {
            output.error("Language " + language + " is defined more than once");
            error.increase();
        }
    }
}

/**
 * Check if any strings are defined more than once
 * @param  {object} model Model to check string definitions for
 */
function checkDoubleStrings(model) {
    for (var idx in model.stringlists) {
        var stringlist = model.stringlists[idx];
        for (var stringId in stringlist.strings) {
            if (stringlist.strings[stringId].count > 1) {
                output.error("String '" + stringId + "' in language " + stringlist.language + " is defined more than once");
                error.increase();
            }
        }
    }
}

/**
 * Check if any strings are unused
 * @param  {object} model Model to check string usage for
 */
function checkUnusedStrings(model) {
    for (var idx in model.stringlists) {
        var stringlist = model.stringlists[idx];
        for (var stringId in stringlist.strings) {
            if (staticStrings.indexOf(stringId) != -1) {
                // SKip statically defined strings; they do not have to exist
                continue;
            }
            if (!stringlist.strings[stringId].used) {
                output.error("String '" + stringId + "' in language " + stringlist.language + " not used anywhere");
                error.increase();
            }
        }
    }
}

/**
 * Check if all the static strings are defined
 * @param  {object} model Model to check static strings for
 */
function checkStaticStrings(model) {
    for (var idx in model.stringlists) {
        var stringlist = model.stringlists[idx];
        for (var stringId in staticStrings) {
            var string = staticStrings[stringId];
            if (stringlist.strings[string] === undefined) {
                output.error("Static string '" + string + "' is not defined for language " + stringlist.language);
                error.increase();
            }
        }
    }
}

/**
 * Check if there is at most one percentage mission
 * @param  {object} model Model to check percentage missions for
 */
function checkPercentageMissions(totalPercentageMissions) {
    if (totalPercentageMissions.count > 1) {
        output.error("There can be at most one mission with percentage scoring");
        error.increase();
    }
}

module.exports = {
    verifyMission: verifyMission,
    checkDoubleLanguages: checkDoubleLanguages,
    checkDoubleStrings: checkDoubleStrings,
    checkUnusedStrings: checkUnusedStrings,
    checkStaticStrings: checkStaticStrings,
    checkPercentageMissions: checkPercentageMissions
};
