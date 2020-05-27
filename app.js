const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline
const http = require('http')
const delay = require('delay')

const versionNumber = '1.0.0'
const httpPort = 8080
const prusaPort = '/dev/ttyAMA0'

var tempData = false
var timeData = false
var fanData = false

const port = new SerialPort(prusaPort, {
    baudRate: 115200
})

const parser = port.pipe(new Readline())

var status = {
    printerReady: false,
    isPrinting: false,
    printComplete: true,
    firmwareVersion: "",
    fileName: "",
    fileSize: "0",
    fileList: [],
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
    extruderTemp: "0",
    extruderFan: "0",
    printFan: "0"
}

const requestListener = async function(req, res) {
    if (req.method == "GET") {
        let urlData = req.url.match(/\/\?(.*)=(.*)/)
        if (urlData) {
            let type = urlData[1]
            let data = urlData[2]

            if (type == "send") {
                data = data.replace(/%20/g, " ")
                port.write(`${data}\n`)
                console.log(`SEND: ${data}`)
            }
        }
    }

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
    port.write('M21\n')  // Init SD card
    port.write(`M117 PrusaMonitor v${versionNumber}\n`)  // Set Display Message
    port.write('M115\n')  // Firmware Info
    port.write('M20\n')  // SD Card File List
})

port.on('error', function(err) {
    console.log(err.message)
})

parser.on('data', parseSerialData)

function parseSerialData(data) {
    //console.log(data)

    // Printer is ready
    if (data.includes("SD card ok") || data.includes("Not SD printing")) {
        status.printerReady = true
        console.log('RECV: Printer is ready...')
        getData()
    }

    // Firmware Version
    const regexFirmwareVersion = /FIRMWARE_NAME:Prusa-Firmware (.*) based(.*)/
    var firmwareVersion = data.match(regexFirmwareVersion)
    if (firmwareVersion) {
        status.firmwareVersion = firmwareVersion[1]
        console.log(`RECV: Firmware Version: ${status.firmwareVersion}`)
    }

    // File List
    const regexFileList = /(.*).GCO (.*)/
    var fileList = data.match(regexFileList)
    if (fileList) {
        status.fileList.push(`${fileList[1]}.GCO`)
        console.log(`RECV: File: ${fileList[1]}.GCO`)
    }

    // File was opened
    const regexFileOpened = /File opened: (.*) Size: (.*)/
    var fileOpened = data.match(regexFileOpened)
    if (fileOpened) {
        status.fileName = fileOpened[1]
        status.fileSize = fileOpened[2]
        status.isPrinting = true
        status.printComplete = false
        console.log(`RECV: Opened file: ${status.fileName}`)
    }

    // Idle Extruder & Bed Temp
    const regexIdleTemperature = /ok T:(.*) \/0.0 B:(.*) \/0.0 T0:(.*) \/0.0 @:0 B@:0 P:(.*) A:(.*)/
    var idleTemperature = data.match(regexIdleTemperature)
    if (idleTemperature) {
		status.extruderTemp = idleTemperature[1]
		status.bedTemp = idleTemperature[2]
        tempData = false
        console.log(`RECV: Bed: ${status.bedTemp}°C, Extruder: ${status.extruderTemp}°C`)
    }

    // Printing Extruder & Bed Temp
    const regexPrintingTemperature = /T:(.*) E:0 B:(.*)/
    var printingTemperature = data.match(regexPrintingTemperature)
    if (printingTemperature) {
		status.extruderTemp = printingTemperature[1]
		status.bedTemp = printingTemperature[2]
        console.log(`RECV: Bed: ${status.bedTemp}°C, Extruder: ${status.extruderTemp}°C`)
    }

    // Extruder Fan Speed
    const regexExtruderFan = /E0:(.*) RPM/
    var extruderFan = data.match(regexExtruderFan)
    if (extruderFan) {
		status.extruderFan = extruderFan[1]
        console.log(`RECV: Extruder Fan: ${status.extruderFan} RPM`)
    }

    // Print Fan Speed
    const regexPrintFan = /PRN0:(.*) RPM/
    var printFan = data.match(regexPrintFan)
    if (printFan) {
		status.printFan = printFan[1]
        console.log(`RECV: Print Fan: ${status.printFan} RPM`)
        fanData = false
    }

    // Normal Percent & Time
    const regexNormalPrint = /NORMAL MODE: Percent done: (.*); print time remaining in mins: (.*)/
    var normalPrint = data.match(regexNormalPrint)
    if (normalPrint) {
        if (normalPrint[1] == 100) {
            status.normal.percent = "100"
            status.isPrinting = false
            status.printComplete = true
            status.fileName = ""
            status.fileSize = "0"
            status.printMode = "normal"
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

        console.log(`RECV: NORMAL: Percent complete: ${status.normal.percent}%, Time Remaining: ${status.normal.remaining}`)
    }

    // Silent Percent & Time
    const regexSilentPrint = /SILENT MODE: Percent done: (.*); print time remaining in mins: (.*)/
    var silentPrint = data.match(regexSilentPrint)
    if (silentPrint) {
        if (silentPrint[1] == 100) {
            status.silent.percent = "100"
            status.isPrinting = false
            status.printComplete = true
            status.fileName = ""
            status.fileSize = "0"
            status.printMode = "normal"
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

        console.log(`RECV: SILENT: Percent complete: ${status.silent.percent}%, Time Remaining: ${status.silent.remaining}`)
    }

    // Print was cancelled
    const regexCancelledPrint = /echo:enqueing \"M104 S0\"/
    var cancelledPrint = data.match(regexCancelledPrint)
    if (cancelledPrint) {
        status.isPrinting = false
        status.printComplete = true
        status.fileName = ""
        status.fileSize = "0"
        status.printMode = "normal"
        console.log(`RECV: Print was cancelled`)
    }
}

async function dataUpdated() {
    if (tempData || timeData || fanData) {
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
        getFan()
    }
}

function getTemperature() {
    port.write('M105\n')
    console.log('SEND: M105')
    tempData = true
}

function getTime() {
    port.write('M73\n')
    console.log('SEND: M73')
    timeData = true
}

function getFan() {
    port.write('PRUSA FAN\n')
    console.log('SEND: PRUSA FAN')
    fanData = true
}
