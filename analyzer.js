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
    var tDataset = transformDataset(dataset);


    var summer2011Stats = calculateStatsForPeriod(tDataset, '2011-06-01', '2011-10-01');
    console.log(summer2011Stats);
}


function readRunningAheadTSV(tsvString) {
    return new CSV(tsvString, {
        header: true,
        cellDelimiter: '\t',
        cast: false
    }).parse();
}


function transformDataset(dataset) {
    var newDataset = [];
    for (var i = 0; i < dataset.length; i++) {
        newDataset.push(transformRow(dataset[i]));
    }

    return newDataset;
}


function calculateStatsForPeriod(rows, startDate, endDate) {
    var pRows = filterRowsByDate(rows, startDate, endDate);

    var stats = {};

    stats.periodDays = moment(endDate)
        .diff(moment(startDate), 'days');

    stats.totalRuns = pRows.length;

    var runsByDate = _.groupBy(pRows, function (row) {
        return row.Date;
    });
    console.log(runsByDate);
    stats.totalDaysRun = Object.keys(runsByDate).length;

    stats.avgDaysPerWeekRun = (stats.totalDaysRun / stats.periodDays) * 7;

    return stats;
}


// Return filtered rows where Date is within [startDate, endDate]
function filterRowsByDate(rows, startDate, endDate) {
    return rows.filter(function (row) {
        var onOrAfterStart = row.Date.isSame(startDate, 'day') || row.Date.isAfter(startDate);
        var onOrBeforeEnd = row.Date.isSame(endDate, 'day') || row.Date.isBefore(endDate);

        return onOrAfterStart && onOrBeforeEnd;
    });
}


function transformRow(originalRow) {
    // Shallow copy original row
    var newRow = $.extend({}, originalRow);

    // Duration in minutes
    var durationText = newRow[OriginalHeaders.Duration];
    if (durationText && durationText.length > 0) {
        var momentDuration = moment.duration(durationText);
        newRow[AddedHeaders.DurationMinutes] = momentDuration.asMinutes();
    }

    // Distance in miles
    var distText = newRow[OriginalHeaders.Distance];
    var distUnitText = newRow[OriginalHeaders.DistanceUnit];
    if (distText && distText.length > 0 && distUnitText && distUnitText.length) {
        var origDist = parseFloat(distText);

        if (distUnitText === DistanceUnits.Mile) {
            newRow[AddedHeaders.DistanceMiles] = origDist;
        } else if (distUnitText === DistanceUnits.Kilometer) {
            var distInMiles = Qty(origDist + ' km').to('mi').scalar;
            newRow[AddedHeaders.DistanceMiles] = distInMiles;
        }
    }

    // Date as JS moment (Replace Date column)
    var dateText = newRow[OriginalHeaders.Date];
    if (dateText && dateText.length > 0) {
        newRow[OriginalHeaders.Date] = moment(dateText, 'YYYY-MM-DD')
    }

    return newRow;
}