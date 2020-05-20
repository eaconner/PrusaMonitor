const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline
const port = new SerialPort('/dev/ttyACM0', {
    baudRate: 115200
})

const parser = port.pipe(new Readline())

const regex = /NORMAL MODE: Percent done: (?<percent>.*); print time remaining in mins: (?<time>.*)/

parser.on('data', function (data) {
  var res = data.match(regex)
  if(res) {
      console.log('** Percentage:', res[1])
      console.log('** Remaining:', res[2])
  } else {
      console.log('Data: ', data)
  }
})
