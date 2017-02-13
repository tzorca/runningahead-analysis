$.get('log.txt', runProgram, dataType='text');

var OriginalHeaders = {
    Date: 'Date', TimeOfDay: 'TimeOfDay', Type: 'Type', SubType: 'SubType', Distance: 'Distance', DistanceUnit: 'DistanceUnit', Duration: 'Duration', Weight: 'Weight', WeightUnit: 'WeightUnit', RestHR: 'RestHR', AvgHR: 'AvgHR', MaxHR: 'MaxHR', Sleep: 'Sleep', Calories: 'Calories', Quality: 'Quality', Effort: 'Effort', Weather: 'Weather', Temperature: 'Temperature', TempUnit: 'TempUnit', Notes: 'Notes', Course: 'Course', CourseSurface: 'CourseSurface', CourseNotes: 'CourseNotes', ShoeMake: 'ShoeMake', ShoeModel: 'ShoeModel', Size: 'Size', System: 'System', ShoeSerial: 'ShoeSerial', ShoePrice: 'ShoePrice', OverallPlace: 'OverallPlace', FieldSize: 'FieldSize', GroupMinAge: 'GroupMinAge', GroupMaxAge: 'GroupMaxAge', GroupPlace: 'GroupPlace', GroupSize: 'GroupSize', GenderPlace: 'GenderPlace', GenderSize: 'GenderSize'
};

var AddedHeaders = {
    DurationMinutes: 'DurationMinutes',
    DistanceMiles: 'DistanceMiles'
};

var DistanceUnits = {
    Mile: "Mile",
    Kilometer: "Kilometer"
};


function runProgram(logData) {
    $('body').css('background-color', '#ffff00');

    var dataset = readRunningAheadTSV(logData);
    transformDataset(dataset);
}


function readRunningAheadTSV(tsvString) {
    return new CSV(tsvString, {
        header: true,
        cellDelimiter: '\t',
        cast: false
    }).parse();
}


function transformDataset(dataset) {
    dataset.forEach(transformRow);
}

function transformRow(row) {
    // Duration in minutes
    var durationText = row[OriginalHeaders.Duration];
    if (durationText && durationText.length > 0) {
        var momentDuration = moment.duration(durationText);
        row[AddedHeaders.DurationMinutes] = momentDuration.asMinutes();
    }

    // Distance in miles
    var distText = row[OriginalHeaders.Distance];
    var distUnitText = row[OriginalHeaders.DistanceUnit];
    if (distText && distText.length > 0 && distUnitText && distUnitText.length) {
        var origDist = parseFloat(distText);

        if (distUnitText === DistanceUnits.Mile) {
            row[AddedHeaders.DistanceMiles] = origDist;
        } else if (distUnitText === DistanceUnits.Kilometer) {
            var distInMiles = Qty(origDist + ' km').to('mi').scalar;
            row[AddedHeaders.DistanceMiles] = distInMiles;
        }
    }
}