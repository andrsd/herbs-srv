var express = require('express');
var router = express.Router();
var fs = require('fs');
var herb_names = [ 'sage', 'thyme', 'chives', 'parsley', 'rosemary', 'basil' ];
var db_file_name = "./data/db";

function twoDigits(number) {
  if (number >= 10)
    return number;
  else
    return "0" + number;
}

router.get('/', function(req, res, next) {
  var rows = fs.readFileSync(db_file_name).toString().split("\n");
  var hdr = rows[0].split("\t");

  var data = { }

  data['current_data'] = [ ];
  data['current_data'][0] = [ 'Label', 'Value' ];

  data['history'] = [ ];
  data['history'][0] = [ "time" ];
  for (j = 0; j < hdr.length - 1; j++)
    data['history'][0].push(hdr[j + 1]);

  for (i = 1; i < rows.length - 1; i++) {
    var value = rows[i].split("\t");

    var date = new Date(value[0]);
    var minutes =
    // value[0] = date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " +
    //            twoDigits(date.getHours()) + ":" + twoDigits(date.getMinutes());
    value[0] = twoDigits(date.getHours()) + ":" + twoDigits(date.getMinutes());
    for (j = 1; j < hdr.length; j++)
      value[j] = value[j] * 100;
    data['history'][i] = value;

    if (i == rows.length - 2) {
      for (j = 1; j < hdr.length; j++)
        data['current_data'][j] = [ hdr[j], value[j] ];
    }
  }

  res.render('herbs', data);
});

// POST the moisture level
router.post('/', function(req, res, next) {
  var time = new Date().toISOString();
  console.log(req.body);

  var row = time;
  for (i = 0; i < herb_names.length; i++) {
    if (herb_names[i] in req.body)
      row = row + "\t" + req.body[herb_names[i]].toFixed(2);
    else
      row = row + "\t0.00";
  }
  row = row + "\n";
  fs.appendFileSync(db_file_name, row);

  res.status(200);
  res.end();
});

// GET the moisture level
router.get('/:name', function(req, res, next) {
  var herb_name = req.params.name;
  var file_content = fs.readFileSync(db_file_name).toString();
  var rows = file_content.split("\n");

  var hdr = rows[0].split("\t");
  var line = rows[rows.length - 2].split("\t");
  for (i = 1; i < hdr.length; i++) {
    if (hdr[i] == herb_name) {
      res.status(200);
      res.json({ "value" : line[i]});
      return;
    }
  }

  res.status(406);
  res.end();
});

module.exports = router;
