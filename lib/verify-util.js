/**
 * Merge two arrays of objective values, creating all possible combinations
 * @param  {array} objectiveValues      The current objective values
 * @param  {array} objectiveValuesToAdd The objective values to add. Should be a 1-dimensional array
 * @return {array}                      Merged objective values
 */
function mergeObjectiveValues(objectiveValues, objectiveValuesToAdd) {
    if (objectiveValues.length == 0) {
        var newObjectiveValues = [];
        objectiveValuesToAdd.forEach(function(objectiveValueToAdd) {
            newObjectiveValues.push([objectiveValueToAdd]);
        });
        return newObjectiveValues;
    } else {
        var newObjectiveValues = [];
        objectiveValues.forEach(function(objectiveValue) {
            objectiveValuesToAdd.forEach(function(objectiveValueToAdd) {
                var merged = objectiveValue.slice(0);
                merged.push(objectiveValueToAdd);
                newObjectiveValues.push(merged);
            });
        });
        return newObjectiveValues;
    }
}

/**
 * Checks if values from a specific case are equal to given objective values
 * @param  {array} objectiveValues Objective values to compare against
 * @param  {array} caseValues      Case values to compare with
 * @return {bool}                  True if and only if objectiveValues equal caseValues
 */
function objectiveValuesEqual(objectiveValues, caseValues) {
    for (var objectiveIndex in objectiveValues) {
        if (objectiveValues[objectiveIndex] != caseValues[objectiveIndex]) {
            return false;
        }
    }
    return true;
}

/**
 * Retrieve all values for an objective
 * @param  {object} objective The objective to retrieve all values fro
 * @return {array}            Array containing string representations of all values
 */
function allValues(objective) {
    switch (objective.type) {
        case 'number':
            var range = [String(objective.min)], index = objective.min;
            while (index < objective.max) {
                index += 1;
                range.push(String(index));
            }
            return range;
            break;
        case 'yesno':
            return ["no", "yes"];
        case 'enum':
            var options = [];
            for (var optionId in objective.options) {
                options.push(optionId);
            }
            return options;
    }
}

module.exports = {
    allValues: allValues,
    mergeObjectiveValues: mergeObjectiveValues,
    objectiveValuesEqual: objectiveValuesEqual
};