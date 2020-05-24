const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline
const http = require('http')
const delay = require('delay')

const httpPort = 8181
const prusaPort = '/dev/ttyACM0'

var tempData = false
var timeData = false

const port = new SerialPort(prusaPort, {
    baudRate: 115200
})

const parser = port.pipe(new Readline())

var status = {
    printerReady: false,
    isPrinting: false,
    printComplete: true,
    fileName: "",
    fileSize: "0",
    printMode: "normal",
    normal: {
        percent: "0",
        remaining: "0",
        total: "0"
    },
    silent: {
        percent: "0",
        remaining: "0",
        total: "0"
    },
    bedTemp: "0",
    extruderTemp: "0"
}

const requestListener = async function(req, res) {
    if (status.printerReady) {
        getData()
    }

    await dataUpdated()

    res.setHeader("Content-Type", "application/json")
    res.writeHead(200)
    var jsonData = JSON.stringify(status)
    res.end(jsonData)
}

const server = http.createServer(requestListener)
server.listen(httpPort, () => {
    console.log(`Server is running on http://localhost:${httpPort}`)
})

port.on('open', function() {
    console.log('Waking printer...')
})

port.on('error', function(err) {
    console.log(err.message)
})

parser.on('data', parseSerialData)

function parseSerialData(data) {
    console.log(data)

    // Printer is ready
    if (data.includes("SD card ok")) {
        status.printerReady = true
        console.log('Printer is ready...')
        getData()
    }

    const regexFileOpened = /File opened: (.*) Size: (.*)/
    var fileOpened = data.match(regexFileOpened)
    if (fileOpened) {
        status.fileName = fileOpened[1]
        status.fileSize = fileOpened[2]
        status.isPrinting = true
        status.printComplete = false
        console.log(`Opened file: ${status.fileName}`)
    }

    // Idle Extruder & Bed Temp
    const regexIdleTemperature = /ok T:(.*) \/0.0 B:(.*) \/0.0 T0:(.*) \/0.0 @:0 B@:0 P:(.*) A:(.*)/
    var idleTemperature = data.match(regexIdleTemperature)
    if (idleTemperature) {
		status.extruderTemp = idleTemperature[1]
		status.bedTemp = idleTemperature[2]
        tempData = false
        console.log(`Bed: ${status.bedTemp}°C, Extruder: ${status.extruderTemp}°C`)
    }

    // Printing Extruder & Bed Temp
    const regexPrintingTemperature = /T:(.*) E:0 B:(.*)/
    var printingTemperature = data.match(regexPrintingTemperature)
    if (printingTemperature) {
		status.extruderTemp = printingTemperature[1]
		status.bedTemp = printingTemperature[2]
        console.log(`Bed: ${status.bedTemp}°C, Extruder: ${status.extruderTemp}°C`)
    }

    // Normal Percent & Time
    const regexNormalPrint = /NORMAL MODE: Percent done: (.*); print time remaining in mins: (.*)/
    var normalPrint = data.match(regexNormalPrint)
    if (normalPrint) {
        if (normalPrint[1] == 100) {
            status.normal.percent = "100"
            status.isPrinting = false
            status.printComplete = true
            // @TODO - Notify that the print is complete
        } else if (normalPrint[1] > 100) {
            status.normal.percent = "0"
        } else {
            status.normal.percent = normalPrint[1]
        }

        if (normalPrint[2] < 0) {
            status.normal.remaining = "0"
        } else {
            status.normal.remaining = normalPrint[2]
        }

        console.log(`NORMAL: Percent complete: ${status.normal.percent}%, Time Remaining: ${status.normal.remaining}`)
    }

    // Silent Percent & Time
    const regexSilentPrint = /SILENT MODE: Percent done: (.*); print time remaining in mins: (.*)/
    var silentPrint = data.match(regexSilentPrint)
    if (silentPrint) {
        if (silentPrint[1] == 100) {
            status.silent.percent = "100"
            status.isPrinting = false
            status.printComplete = true
            // @TODO - Notify that the print is complete
        } else if (silentPrint[1] > 100) {
            status.silent.percent = "0"
        } else {
            status.silent.percent = silentPrint[1]
        }

        if (silentPrint[2] < 0) {
            status.silent.remaining = "0"
        } else {
            status.silent.remaining = silentPrint[2]
        }

        timeData = false

        console.log(`SILENT: Percent complete: ${status.silent.percent}%, Time Remaining: ${status.silent.remaining}`)
    }

    // Print was cancelled
    if (data.includes("M104 S0")) {
        status.isPrinting = false
        status.printComplete = true
        status.fileName = "",
        status.fileSize = "0",
        status.printMode = "normal"
    }
}

async function dataUpdated() {
    if (tempData || timeData) {
        await delay(100)
        dataUpdated()
    } else {
        return
    }
}

function getData() {
    if (!status.isPrinting) {
        getTemperature()
        getTime()
    }
}

function getTemperature() {
    port.write('M105\n')
    //console.log('Sent: M105')
    tempData = true
}

function getTime() {
    port.write('M73\n')
    //console.log('Sent: M73')
    timeData = true
}
