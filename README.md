# PrusaMonitor
Simple print status monitor for Prusa i3 MK3s running on Raspberry Pi Zero W attached to MK3s RAMBo.

## Requirements
@TODO

## Setup
@TODO

## Output
Currently the server returns a simple JSON string with the status of the printer. This will be improved in the future.

```json
{
    "printerReady": true,
    "isPrinting": false,
    "printComplete": true,
    "fileName": "",
    "fileSize": "0",
    "printMode": "normal",
    "normal": {
        "percent": "0",
        "remaining": "0",
        "total": "0"
    },
    "silent": {
        "percent": "0",
        "remaining": "0",
        "total": "0"
    },
    "bedTemp": "0",
    "extruderTemp": "0"
}
```

## Future
- Better web interface with api for app integration.
- Ability to move X,Y,Z,E stepper motors.
- Possible file selection/upload and start/stop print.
- Crash, Error & Print complete email/push notifications.
