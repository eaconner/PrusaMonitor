const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline
const fs = require('fs')
const http = require('http')

const port = new SerialPort('/dev/ttyACM0', {
    baudRate: 115200
})

const httpHost = 'localhost';
const httpPort = 8080;

var status = {
    isPrinting: false,
    printComplete: true,
    fileName: "",
    fileSize: 0,
    percent: 0,
    timeRemaining: 0,
    timeTotal: 0
}

const parser = port.pipe(new Readline())

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json")
    res.writeHead(200)
    var jsonData = JSON.stringify(status)
    res.end(jsonData)
}

const server = http.createServer(requestListener)
server.listen(httpPort, httpHost, () => {
    console.log(`Server is running on http://${httpHost}:${httpPort}`)
})

const regexFileOpened = /File opened: (.*) Size: (.*)/
const regexNormalPrint = /NORMAL MODE: Percent done: (.*); print time remaining in mins: (.*)/

parser.on('data', function (data) {
    var fileOpened = data.match(regexFileOpened)
    var normalPrint = data.match(regexNormalPrint)

    fs.appendFile('PrusaMonitor.log', data, (err) => {
        if (err) throw err
    })

    if (fileOpened) {
        status.fileName = fileOpened[1]
        status.fileSize = fileOpened[2]
        status.isPrinting = true
        status.printComplete = false
        console.log(`Opened file: ${status.fileName}`)
    }

    if (normalPrint) {
        status.percent = normalPrint[1]
        status.timeRemaining = normalPrint[2]

        if (status.percent == 100 && !status.printComplete) {
            status.isPrinting = false
            status.printComplete = true
            console.log(`** Print is complete! **`)
            // @TODO - Notify that print is complete
        }

        if (status.timeTotal == 0) {
            status.timeTotal = normalPrint[2]
        }
        console.log(`Percent complete: ${status.percent}%, Time Remaining: ${status.timeRemaining} of ${status.timeTotal}`)
    }
})

port.on('error', function(err) {
    console.log(err.message)
})
