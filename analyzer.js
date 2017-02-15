$.get('log.txt', runProgram, dataType='text');

var OriginalHeaders = {
    Date: 'Date', TimeOfDay: 'TimeOfDay', Type: 'Type', SubType: 'SubType', Distance: 'Distance', DistanceUnit: 'DistanceUnit', Duration: 'Duration', Weight: 'Weight', WeightUnit: 'WeightUnit', RestHR: 'RestHR', AvgHR: 'AvgHR', MaxHR: 'MaxHR', Sleep: 'Sleep', Calories: 'Calories', Quality: 'Quality', Effort: 'Effort', Weather: 'Weather', Temperature: 'Temperature', TempUnit: 'TempUnit', Notes: 'Notes', Course: 'Course', CourseSurface: 'CourseSurface', CourseNotes: 'CourseNotes', ShoeMake: 'ShoeMake', ShoeModel: 'ShoeModel', Size: 'Size', System: 'System', ShoeSerial: 'ShoeSerial', ShoePrice: 'ShoePrice', OverallPlace: 'OverallPlace', FieldSize: 'FieldSize', GroupMinAge: 'GroupMinAge', GroupMaxAge: 'GroupMaxAge', GroupPlace: 'GroupPlace', GroupSize: 'GroupSize', GenderPlace: 'GenderPlace', GenderSize: 'GenderSize'
};

var AddedHeaders = {
    DurationInMinutes: 'DurationInMinutes',
    DistanceInMiles: 'DistanceInMiles'
};

var DistanceUnits = {
    Mile: "Mile",
    Kilometer: "Kilometer"
};

var ActivityTypes = {
    Run: "Run"
};


function runProgram(logData) {
    $('body').css('background-color', '#ffff00');

    var dataset = readRunningAheadTSV(logData);
    var tDataset = transformDataset(dataset);

    // Just look at runs
    var tRunsDataset = tDataset.filter(       function(row) {
            return row[OriginalHeaders.Type] === ActivityTypes.Run;
        });

    var summer2011Stats = calculateStatsForPeriod(tRunsDataset, '2011-06-01', '2011-10-01');
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

    // Days in period
    stats.daysInPeriod = moment(endDate)
        .diff(moment(startDate), 'days');

    // Total runs
    stats.totalRuns = pRows.length;

    var runsByDate = _.groupBy(pRows, function (row) {
        return row.Date;
    });

    // Total days run
    stats.totalDaysRun = Object.keys(runsByDate).length;

    // Average days run per week
    stats.avgDaysRunPerWeek = (stats.totalDaysRun / stats.daysInPeriod) * 7;

    // Average runs per day run
    stats.avgsRunsPerDayRun = stats.totalRuns / stats.totalDaysRun;

    // Total miles
    stats.totalMiles = sumByKeyInObject(pRows, AddedHeaders.DistanceInMiles);

    // Average miles per week
    stats.avgMilesPerWeek = stats.totalMiles / stats.daysInPeriod * 7;

    // Average distance per day run
    stats.avgDistPerDayRun = stats.totalMiles / stats.totalDaysRun;

    // Total hours running
    stats.totalHours = sumByKeyInObject(pRows, AddedHeaders.DurationInMinutes) / 60;

    // Average hours per week
    stats.avgHoursPerWeek = stats.totalHours / stats.daysInPeriod * 7;

    // Average pace (minutes per mile)
    stats.avgPace = (stats.totalHours * 60) / stats.totalMiles;

    var runsWithNotes = pRows.filter(function(row) {
        return row[OriginalHeaders.Notes] && row[OriginalHeaders.Notes].length > 0;
    });

    // Total runs with notes
    stats.totalRunsWithNotes = runsWithNotes.length;

    // Total note length
    stats.totalNoteLength = _.reduce(runsWithNotes, function(previous, row) {
        return previous + row[OriginalHeaders.Notes].length;
    }, 0); 

    // Average note length
    stats.avgNoteLength = stats.totalNoteLength / stats.totalRunsWithNotes;
    
    var runsWithNotesByDate = _.groupBy(runsWithNotes, function (row) {
        return row.Date;
    });

    // Total days with notes
    stats.totalDaysWithNotes = Object.keys(runsWithNotesByDate).length;

    // Percent of days with notes
    stats.percentOfDaysWithNotes = stats.totalDaysWithNotes / stats.daysInPeriod;

    return stats;
}


function sumByKeyInObject(array, key) {
    return _.reduce(array,
        function (previous, obj) {
            var val = obj[key];
            if (val) {
                return previous + val;
            } else {
                return previous;
            };
    }, 0);
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
        newRow[AddedHeaders.DurationInMinutes] = momentDuration.asMinutes();
    }

    // Distance in miles
    var distText = newRow[OriginalHeaders.Distance];
    var distUnitText = newRow[OriginalHeaders.DistanceUnit];
    if (distText && distText.length > 0 && distUnitText && distUnitText.length) {
        var origDist = parseFloat(distText);

        if (distUnitText === DistanceUnits.Mile) {
            newRow[AddedHeaders.DistanceInMiles] = origDist;
        } else if (distUnitText === DistanceUnits.Kilometer) {
            var distInMiles = Qty(origDist + ' km').to('mi').scalar;
            newRow[AddedHeaders.DistanceInMiles] = distInMiles;
        }
    }

    // Date as JS moment (Replace Date column)
    var dateText = newRow[OriginalHeaders.Date];
    if (dateText && dateText.length > 0) {
        newRow[OriginalHeaders.Date] = moment(dateText, 'YYYY-MM-DD')
    }

    return newRow;
}
