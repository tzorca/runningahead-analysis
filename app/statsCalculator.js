/*jslint browser: true, nomen: true*/
/*global $, moment, _, Qty*/
/*global OriginalHeaders, AddedHeaders, ActivityTypes, DistanceUnits*/
/*global sumByKeyInObject*/

var StatsKeys = {
  Start_Date: "Start Date",
  End_Date: "End Date",
  Days_in_Period: "Days in Period",
  Total_Runs: "Total Runs",
  Average_Days_Run_Per_Week: "Average Days Run Per Week",
  Average_Runs_Per_Day_Run: "Average Runs Per Day Run",
  Total_Miles: "Total Miles",
  Average_Miles_Per_Week: "Average Miles Per Week",
  Average_Miles_Per_Day_Run: "Average Miles Per Day Run",
  Total_Hours_Run: "Total Hours Run",
  Average_Hours_Per_Week: "Average Hours Per Week",
  Average_Pace: "Average Pace",
  Average_Heart_Rate: "Average Heart Rate",
  Total_Runs_with_Notes: "Total Runs with Notes",
  Total_Note_Length: "Total Note Length",
  Average_Note_Length: "Average Note Length",
  Total_Days_with_Notes: "Total Days with Notes",
  Percent_of_Days_with_Notes: "Percent of Days with Notes",
  Average_Relative_Run_Economy: "Average Relative Run Economy"
};

var StatsCalculator = {
  // Return filtered rows where Date is within [startDate, endDate]
  filterRowsByDate: function (rows, startDate, endDate) {
    return rows.filter(function (row) {
      var onOrAfterStart, onOrBeforeEnd;
      onOrAfterStart = row.Date.isSame(startDate, 'day') || row.Date.isAfter(startDate);
      onOrBeforeEnd = row.Date.isSame(endDate, 'day') || row.Date.isBefore(endDate);

      return onOrAfterStart && onOrBeforeEnd;
    });
  },

  // Returns a list of unique subtypes used in a dataset
  getAllSubTypes: function (rows) {
    return _.uniq(rows.map(function (row) {
      return row[OriginalHeaders.SubType];
    }));
  },


  // Return filtered rows where SubType is the specified targetSubType
  filterRowsBySubType: function (rows, targetSubType) {
    return rows.filter(function (row) {
      return row[OriginalHeaders.SubType] === targetSubType;
    });
  },

  calculateStatsForPeriod: function (rows, startDate, endDate) {
    var runsByDate, runsWithNotes, totalAvgHeartRate, runsWithAvgHR, totalRelativeRunningEconomy, runsWithNotesByDate, pRows = StatsCalculator.filterRowsByDate(rows, startDate, endDate), stats = {};

    // Start and end date
    stats[StatsKeys.Start_Date] = startDate.format('M/D/YYYY');
    stats[StatsKeys.End_Date] = endDate.format('M/D/YYYY');

    // Days in period
    stats[StatsKeys.Days_in_Period] = moment(endDate)
      .diff(moment(startDate), 'days');

    // Total runs
    stats[StatsKeys.Total_Runs] = pRows.length;

    runsByDate = _.groupBy(pRows, function (row) {
      return row.Date;
    });

    // Total days run
    stats[StatsKeys.Total_Days_Run] = Object.keys(runsByDate).length;

    // Average days run per week
    stats[StatsKeys.Average_Days_Run_Per_Week] = (stats[StatsKeys.Total_Days_Run] / stats[StatsKeys.Days_in_Period]) * 7;

    // Average runs per day run
    stats[StatsKeys.Average_Runs_Per_Day_Run] = stats[StatsKeys.Total_Runs] / stats[StatsKeys.Total_Days_Run];

    // Total miles
    stats[StatsKeys.Total_Miles] = sumByKeyInObject(pRows, AddedHeaders.DistanceInMiles);

    // Average miles per week
    stats[StatsKeys.Average_Miles_Per_Week] = stats[StatsKeys.Total_Miles] / stats[StatsKeys.Days_in_Period] * 7;

    // Average distance per day run
    stats[StatsKeys.Average_Miles_Per_Day_Run] = stats[StatsKeys.Total_Miles] / stats[StatsKeys.Total_Days_Run];

    // Total hours running
    stats[StatsKeys.Total_Hours_Run] = sumByKeyInObject(pRows, AddedHeaders.DurationInMinutes) / 60;

    // Average hours per week
    stats[StatsKeys.Average_Hours_Per_Week] = stats[StatsKeys.Total_Hours_Run] / stats[StatsKeys.Days_in_Period] * 7;

    // Average pace (minutes per mile)
    stats[StatsKeys.Average_Pace] = (stats[StatsKeys.Total_Hours_Run] * 60) / stats[StatsKeys.Total_Miles];

    runsWithNotes = pRows.filter(function (row) {
      return row[OriginalHeaders.Notes] && row[OriginalHeaders.Notes].length > 0;
    });

    // Total runs with notes
    stats[StatsKeys.Total_Runs_with_Notes] = runsWithNotes.length;

    // Total note length
    stats[StatsKeys.Total_Note_Length] = _.reduce(runsWithNotes, function (previous, row) {
      return previous + row[OriginalHeaders.Notes].length;
    }, 0);

    // Average note length
    stats[StatsKeys.Average_Note_Length] = stats[StatsKeys.Total_Note_Length] / stats[StatsKeys.Total_Runs_with_Notes];

    runsWithNotesByDate = _.groupBy(runsWithNotes, function (row) {
      return row.Date;
    });

    // Total days with notes
    stats[StatsKeys.Total_Days_with_Notes] = Object.keys(runsWithNotesByDate).length;

    // Percent of days with notes
    stats[StatsKeys.Percent_of_Days_with_Notes] = stats[StatsKeys.Total_Days_with_Notes] / stats[StatsKeys.Days_in_Period] * 100;

    // Average Heart Rate
    runsWithAvgHR = pRows.filter(function (row) {
      return row[OriginalHeaders.AvgHR] && row[OriginalHeaders.AvgHR] > 10;
    });
    totalAvgHeartRate = sumByKeyInObject(runsWithAvgHR, OriginalHeaders.AvgHR);
    stats[StatsKeys.Average_Heart_Rate] = totalAvgHeartRate / runsWithAvgHR.length;

    // Average Relative Running Economy
    runsWithRelRunEconomy = pRows.filter(function (row) {
      return row[AddedHeaders.RelativeRunningEconomy] && row[AddedHeaders.RelativeRunningEconomy] > 10;
    });
    totalRelativeRunningEconomy = sumByKeyInObject(runsWithRelRunEconomy, AddedHeaders.RelativeRunningEconomy);
    stats[StatsKeys.Average_Relative_Run_Economy] = (totalRelativeRunningEconomy / runsWithRelRunEconomy.length);

    // Round for display
    stats[StatsKeys.Average_Days_Run_Per_Week] = roundFloat(stats[StatsKeys.Average_Days_Run_Per_Week], 1);
    stats[StatsKeys.Average_Runs_Per_Day_Run] = roundFloat(stats[StatsKeys.Average_Runs_Per_Day_Run], 1);
    stats[StatsKeys.Total_Miles] = roundFloat(stats[StatsKeys.Total_Miles], 1);
    stats[StatsKeys.Average_Miles_Per_Week] = roundFloat(stats[StatsKeys.Average_Miles_Per_Week], 1);
    stats[StatsKeys.Average_Miles_Per_Day_Run] = roundFloat(stats[StatsKeys.Average_Miles_Per_Day_Run], 1);
    stats[StatsKeys.Total_Hours_Run] = roundFloat(stats[StatsKeys.Total_Hours_Run], 1);
    stats[StatsKeys.Average_Hours_Per_Week] = roundFloat(stats[StatsKeys.Average_Hours_Per_Week], 1);
    stats[StatsKeys.Average_Pace] = roundFloat(stats[StatsKeys.Average_Pace], 1);
    stats[StatsKeys.Total_Runs_with_Notes] = roundFloat(stats[StatsKeys.Total_Runs_with_Notes], 1);
    stats[StatsKeys.Total_Note_Length] = roundFloat(stats[StatsKeys.Total_Note_Length], 1);
    stats[StatsKeys.Average_Note_Length] = roundFloat(stats[StatsKeys.Average_Note_Length], 1);
    stats[StatsKeys.Total_Days_with_Notes] = roundFloat(stats[StatsKeys.Total_Days_with_Notes], 1);
    stats[StatsKeys.Percent_of_Days_with_Notes] = roundFloat(stats[StatsKeys.Percent_of_Days_with_Notes], 1);
    stats[StatsKeys.Average_Heart_Rate] = roundFloat(stats[StatsKeys.Average_Heart_Rate], 1);
    stats[StatsKeys.Average_Relative_Run_Economy] = roundFloat(stats[StatsKeys.Average_Relative_Run_Economy], 1);

    return stats;
  },

  transformRow: function (originalRow) {
    var newRow, durationText, momentDuration, durationInMinutes, distText, distUnitText, origDist, distInMiles, dateText, timeText, restingHR, avgHR, totalHeartBeats, workPerMile, minDurationToCalcEconomy;
    var distanceCoefficient = 1.08, restingHR = 45, minDurationToCalcEconomy = 15; // TODO: Make these configurable
    var fiveKilometersInMiles = 3.107;

    // Shallow copy original row
    newRow = $.extend({}, originalRow);

    // Duration in minutes
    durationText = newRow[OriginalHeaders.Duration];
    if (durationText && durationText.length > 0) {
      momentDuration = moment.duration(durationText);
      durationInMinutes = momentDuration.asMinutes()
      newRow[AddedHeaders.DurationInMinutes] = durationInMinutes;
    }

    // Distance in miles
    distText = newRow[OriginalHeaders.Distance];
    distUnitText = newRow[OriginalHeaders.DistanceUnit];
    if (distText && distText.length > 0 && distUnitText && distUnitText.length) {
      origDist = parseFloat(distText);

      if (distUnitText === DistanceUnits.Mile) {
        distInMiles = origDist;
        newRow[AddedHeaders.DistanceInMiles] = distInMiles;
      } else if (distUnitText === DistanceUnits.Kilometer) {
        distInMiles = Qty(origDist + ' km').to('mi').scalar;
        newRow[AddedHeaders.DistanceInMiles] = distInMiles;
      }
    }

    // Equivalent time for 5 kilometer distance (uses Pete Riegel's formula)
    newRow[AddedHeaders.EquivalentDurationFor5K] = "";
    if (durationInMinutes && distInMiles) {
      newRow[AddedHeaders.EquivalentDurationFor5K] = durationInMinutes * 
        Math.pow(fiveKilometersInMiles / distInMiles, distanceCoefficient);
    }

    // Date as JS moment (Replace Date column)
    dateText = newRow[OriginalHeaders.Date];
    if (dateText && dateText.length > 0) {
      newRow[OriginalHeaders.Date] = moment(dateText, 'YYYY-MM-DD');
    }

    // Time as JS moment (Replace Time column)
    timeText = newRow[OriginalHeaders.TimeOfDay];
    if (timeText && timeText.length > 0) {
      newRow[OriginalHeaders.TimeOfDay] = moment(timeText, 'hh:mm a');
    }

    // Relative running economy
    // Formula sourced from http://fellrnr.com/wiki/Running_Economy
    avgHR = newRow[OriginalHeaders.AvgHR];
    newRow[AddedHeaders.RelativeRunningEconomy] = "";
    if (durationInMinutes && distInMiles && avgHR && durationInMinutes >= minDurationToCalcEconomy) {
      totalHeartBeats = (avgHR - restingHR) * durationInMinutes;
      workPerMile = totalHeartBeats / distInMiles;
      newRow[AddedHeaders.RelativeRunningEconomy] = 1 / workPerMile * 100000;
    }

    return newRow;
  },

  transformDataset: function (dataset) {
    var newDataset = [], i;
    for (i = 0; i < dataset.length; i += 1) {
      newDataset.push(StatsCalculator.transformRow(dataset[i]));
    }

    return newDataset;
  }
};

