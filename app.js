const SerialPort = require('serialport')
const fs = require('fs')
const Readline = SerialPort.parsers.Readline

const port = new SerialPort('/dev/ttyACM0', {
    baudRate: 115200
})

const parser = port.pipe(new Readline())

const regex = /NORMAL MODE: Percent done: (?<percent>.*); print time remaining in mins: (?<time>.*)/

parser.on('data', function (data) {
    var res = data.match(regex)

    fs.appendFile('PrusaMonitor.log', data, (err) => {
        if (err) throw err;
        console.log(data)
    });

    if(res) {
        console.log('** Percentage:', res[percent])
        console.log('** Remaining:', res[time])
    }
})

port.on('error', function(err) {
    console.log(err.message)
})
