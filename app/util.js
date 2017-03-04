function renderTwoDecimalPlaces(data, type, row) {
  if (data) {
    return parseFloat(data).toFixed(2);
  } else {
    return "";
  }
}


function sumByKeyInObject(array, key) {
  return _.reduce(array,
    function(previous, obj) {
      var val = obj[key];
      if (val) {
        return previous + val;
      } else {
        return previous;
      };
    }, 0);
}