const escpos = require('escpos');
const http = require('https')
const device = new escpos.USB();
const printer = new escpos.Printer(device);
const url = require('url');
const time = require('time');
const fs = require('fs');
const config = require('config');

const apiKey = config.get('openDiningSettings.apiKey');
const customerId = config.get('openDiningSettings.customerId');
const customerSecret = config.get('openDiningSettings.customerSecret');
const opendiningHost = config.get('openDiningSettings.host');
const opendiningPort = config.get('openDiningSettings.port');
const opendiningPath = '/api/v1/restaurants/' + customerId + '/orders?secret=' + customerSecret + '&key=' + apiKey;

console.log("apiKey: " + apiKey);
console.log("customerId: " + customerId);
console.log("customerSecret: " + customerSecret);
console.log("path" + opendiningPath);
const lastOrderFile = "./lastorder";
const jobQueue = new JobQueue();
//var orders = "";
const httpOptions = {
  protocol: 'https:',
  host: opendiningHost,
  path: opendiningPath,
  port: opendiningPort,
  method: 'GET'
}
const writeFileOptions = {
  flags: 'w+',
  defaultEncoding: 'utf8',
  fd: null,
  mode: 0o666,
  autoClose: true
}
//local persisting check of last order processed
function setLastOrder(date) {
  console.log("set last order: " + date);
  var ws = fs.createWriteStream(lastOrderFile, writeFileOptions);
  ws.on('error', function (err) {
    console.log("could not open writestream. " + err);
  });
  ws.write(date.toString());
  ws.end();
}
function getLastOrder() {
  var fileContent = "";
  try {
    fs.accessSync(lastOrderFile, fs.constants.R_OK | fs.constants.W_OK);
    fileContent = fs.readFileSync(lastOrderFile);
    return fileContent;
  } catch (err) {
    fileContent = new time.Date().toString();
    console.log("error getting file: " + err);
    setLastOrder(fileContent);
    return fileContent
  }
}
function isLastOrderOlder(date) {
  if (new time.Date(getLastOrder()) < new time.Date(date)) {
    console.log("last order: " + new time.Date(getLastOrder()).toString() + " - current date: " + new time.Date(date).toString());
    return true;
  }
  return false;
}
//end local persisting check of last order processed
function init() {
}

function printLine(lineString, isCenter) {
  device.open(function () {
    var alignment = 'lt';
    if (isCenter)
      alignment = 'ct';
    printer
      .align(alignment)
      .size(1, 1)
      .text(lineString)
  });
};
function printUnderLine(lineString, isCenter, mode) {
  device.open(function () {
    var alignment = 'lt';
    if (isCenter)
      alignment = 'ct';
    printer
      .style(mode)
      .text(lineString)
  });
};
function printBoldLine(lineString, isCenter) {
  device.open(function () {
    var alignment = 'lt';
    if (isCenter)
      alignment = 'ct';
    printer
      .style('b')
      .text(lineString)
  });
}
function printBigLine(lineString, isCenter, size) {
  device.open(function () {
    var alignment = 'lt';
    if (isCenter)
      alignment = 'ct';
    printer
      .align(alignment)
      .size(1, size)
      .text(lineString)
  });
}
function printFeed() {
  device.open(function () {
    printer
      .feed()
  });
}
function printEnd() {
  device.open(function () {
    printer.cut()
  });
};
function printClose() {

}
function printControl(mode) {
  device.open(function () {
    printer
      .control(mode)
  });
}
//.anchor(2)
var parsedUrl = url.parse('https://opendining.net:443/' + 'api/v1/restaurants/' + customerId + '/orders?secret=' + customerSecret + '&key=' + apiKey, true);
function getOrders(callback) {
  console.log("getting orders");
  http.get(httpOptions, function (res) {
    var data = "";
    res.on("data", function (chunk) {
      data += chunk.toString();
    });
    res.on("end", function () {
      console.log("orders received " + data.length);
      var parsedResult = JSON.parse(data);
      orders = parsedResult.orders;
      callback(orders);
    });
  });
}

function JobQueue() {
  this.queue = new Array();
  this.length = function () {
    return this.queue.length;
  }
  this.dequeue = function () {
    return this.queue.pop();
  }
  this.enqueue = function (value) {
    this.queue.unshift(value);
  }
}

var lastOrder = new time.Date("Mon May 16 2016 15:08:41 GMT-0700");

init();

setInterval(function () {
  getOrders(enqueueCallbackFunction);
}, 60 * 1000);
dequeue();

var enqueueCallbackFunction = function enqueue(orders) {
  console.log("enqueueing");
  if (orders !== undefined) {
    if (orders.length > 0) {
      orders.forEach(function (order) {
        var submit_time = new time.Date(order.submit_time, 'America/New_York');
        submit_time.setTimezone('America/Los_Angeles');
        if (isLastOrderOlder(submit_time.toString())) {
          if (order in jobQueue.queue) { }
          else {
            console.log("enqueued item: " + order.short_id);
            jobQueue.enqueue(order);
          }
        }
      });
    }
  }
}
function dequeue() {
  //dequeue and print interval
  setInterval(function () {
    console.log("dequeueing");
    if (jobQueue.length() > 0) {
      var maxQueue = jobQueue.length();
      for (var index = 0; index < maxQueue; index++) {
        var order = jobQueue.dequeue();
        var submit_time = new time.Date(order.submit_time, 'America/New_York');
        submit_time.setTimezone('America/Los_Angeles');
        printOrder(order);
        console.log("order no. " + order.short_id);
        if (isLastOrderOlder(submit_time.toString()))
          setLastOrder(new time.Date(submit_time).toString());
      }
    }
  }, 60 * 1000);
}


function printOrder(order) {
  console.log("--- print start ---");
  var submit_time = new time.Date(order.submit_time, 'America/New_York');
  submit_time.setTimezone('America/Los_Angeles');
  console.log(new time.Date() + ": new order");
  printBigLine("=== Order No. " + order.short_id + " ===", true, 2);
  printLine("Order In: " + submit_time, false);
  if (order.ordering_for !== undefined)
    printLine("Due: " + order.ordering_for + " - " + order.eta, false);
  if (order.items !== undefined)
    order.items.forEach(function (item) {
      printLine(item.quantity + " x " + item.name, false);
      if (item.options !== undefined) {
        if (item.options.length > 0) {
          printLine("  Options: ", false);
          item.options.forEach(function (option) {
            printControl('HT');
            printLine("    " + option.quantity + " x " + option.name, false);
          }, this);
        }
      }
      if (item.notes !== undefined)
        printLine("Notes: " + item.notes, false);
      printFeed();
    }, this);
  //printLine(order.type, false);
  printFeed();
  printLine(order.customer_name, false);
  printEnd();
  console.log("--- print end ---");
}
